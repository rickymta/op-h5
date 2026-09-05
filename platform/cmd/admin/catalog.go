package main

// Cua hang: quan ly danh muc goi (game_packages) va don mua (game_grants).
// Thiet ke: docs/design-cua-hang.md muc 6. Moi thay doi vao admin_audit.

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/wallet"
)

var (
	catalogCategories = []string{"diamond", "card", "fund", "privilege", "daily", "limited", "event", "item", "ingame"}
	pkgIDRe           = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)
	rewardRe          = regexp.MustCompile(`^\d+:\d+:\d+(#\d+:\d+:\d+)*$`)
)

func validCategory(c string) bool {
	for _, x := range catalogCategories {
		if x == c {
			return true
		}
	}
	return false
}

type gameOpt struct{ Code, Name string }

func (s *server) games(ctx context.Context) []gameOpt {
	rows, err := s.db.QueryContext(ctx, `SELECT code, name FROM games ORDER BY sort_order, code`)
	if err != nil {
		return nil
	}
	defer func() { _ = rows.Close() }()
	var out []gameOpt
	for rows.Next() {
		var g gameOpt
		if rows.Scan(&g.Code, &g.Name) == nil {
			out = append(out, g)
		}
	}
	return out
}

func pickGame(r *http.Request, games []gameOpt) string {
	if g := r.URL.Query().Get("game"); g != "" {
		return g
	}
	if len(games) > 0 {
		return games[0].Code
	}
	return "haitac"
}

// ---------------------------------------------------------------- goi

type pkgRow struct {
	ID, Name, Category, GrantMode, Reward, Description, Badge, Status string
	PriceXu                                                            int64
	ItemTid, SortOrder                                                 int
}

type catCount struct {
	Category      string
	Active, Total int
}

func (s *server) packagesPage(w http.ResponseWriter, r *http.Request, a *admin) {
	ctx := r.Context()
	games := s.games(ctx)
	game := pickGame(r, games)
	cat, status, q := r.URL.Query().Get("category"), r.URL.Query().Get("status"), strings.TrimSpace(r.URL.Query().Get("q"))

	where, args := `WHERE game_code = ?`, []any{game}
	if validCategory(cat) {
		where += ` AND category = ?`
		args = append(args, cat)
	}
	if status == "active" || status == "hidden" {
		where += ` AND status = ?`
		args = append(args, status)
	}
	if q != "" {
		where += ` AND (name LIKE ? OR package_id LIKE ?)`
		args = append(args, "%"+q+"%", "%"+q+"%")
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT package_id, name, category, grant_mode, COALESCE(reward,''), COALESCE(description,''),
		       COALESCE(badge,''), status, price_xu, item_tid, sort_order
		  FROM game_packages `+where+` ORDER BY sort_order, price_xu, package_id LIMIT 400`, args...)
	if err != nil {
		s.log.Error("doc danh muc goi", "err", err)
	}
	var list []pkgRow
	if rows != nil {
		for rows.Next() {
			var p pkgRow
			if err := rows.Scan(&p.ID, &p.Name, &p.Category, &p.GrantMode, &p.Reward, &p.Description,
				&p.Badge, &p.Status, &p.PriceXu, &p.ItemTid, &p.SortOrder); err == nil {
				list = append(list, p)
			}
		}
		_ = rows.Close()
	}

	counts := map[string]*catCount{}
	for _, c := range catalogCategories {
		counts[c] = &catCount{Category: c}
	}
	crows, err := s.db.QueryContext(ctx,
		`SELECT category, status, COUNT(*) FROM game_packages WHERE game_code = ? GROUP BY category, status`, game)
	if err == nil {
		for crows.Next() {
			var c, st string
			var n int
			if crows.Scan(&c, &st, &n) == nil {
				cc := counts[c]
				if cc == nil {
					cc = &catCount{Category: c}
					counts[c] = cc
				}
				cc.Total += n
				if st == "active" {
					cc.Active += n
				}
			}
		}
		_ = crows.Close()
	}
	var cats []catCount
	for _, c := range catalogCategories {
		cats = append(cats, *counts[c])
	}

	s.render(w, "packages.html", map[string]any{
		"Admin": a, "Games": games, "Game": game, "Category": cat, "Status": status, "Q": q,
		"Rows": list, "Cats": cats, "Categories": catalogCategories,
	})
}

func (s *server) apiUpdatePackage(w http.ResponseWriter, r *http.Request, a *admin) {
	game, id := r.PathValue("game"), r.PathValue("id")
	var in struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Badge       *string `json:"badge"`
		Reward      *string `json:"reward"`
		PriceXu     *int64  `json:"price_xu"`
		Status      *string `json:"status"`
		Category    *string `json:"category"`
		SortOrder   *int    `json:"sort_order"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "dữ liệu không đọc được")
		return
	}
	var sets []string
	var args []any
	set := func(col string, v any) { sets = append(sets, col+" = ?"); args = append(args, v) }
	if in.Name != nil {
		n := strings.TrimSpace(*in.Name)
		if n == "" || len(n) > 128 {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "tên gói 1–128 ký tự")
			return
		}
		set("name", n)
		set("item_name", n)
	}
	if in.Description != nil {
		set("description", nullIfBlank(*in.Description, 512))
	}
	if in.Badge != nil {
		set("badge", nullIfBlank(*in.Badge, 48))
	}
	if in.Reward != nil {
		rw := strings.TrimSpace(*in.Reward)
		if rw != "" && !rewardRe.MatchString(rw) {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "reward phải dạng type:id:count#type:id:count")
			return
		}
		set("reward", nullIfBlank(rw, 512))
	}
	if in.PriceXu != nil {
		if *in.PriceXu <= 0 {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "giá phải lớn hơn 0")
			return
		}
		set("price_xu", *in.PriceXu)
	}
	if in.Status != nil {
		if *in.Status != "active" && *in.Status != "hidden" {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "status phải là active hoặc hidden")
			return
		}
		set("status", *in.Status)
	}
	if in.Category != nil {
		if !validCategory(*in.Category) {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "nhóm không hợp lệ")
			return
		}
		set("category", *in.Category)
	}
	if in.SortOrder != nil {
		set("sort_order", *in.SortOrder)
	}
	if len(sets) == 0 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "không có gì để sửa")
		return
	}
	args = append(args, game, id)
	res, err := s.db.ExecContext(r.Context(),
		`UPDATE game_packages SET `+strings.Join(sets, ", ")+` WHERE game_code = ? AND package_id = ?`, args...)
	if err != nil {
		s.log.Error("sua goi", "err", err, "game", game, "id", id)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		// 0 dong cung co the la "khong doi gi" — kiem tra ton tai de tra dung loi.
		var one int
		if s.db.QueryRowContext(r.Context(), `SELECT 1 FROM game_packages WHERE game_code=? AND package_id=?`, game, id).Scan(&one) != nil {
			httpx.Error(w, http.StatusNotFound, "not_found", "Không có gói này.")
			return
		}
	}
	detail, _ := json.Marshal(in)
	s.audit(r.Context(), a.ID, "package_update", game+"/"+id, string(detail))
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *server) apiCreatePackage(w http.ResponseWriter, r *http.Request, a *admin) {
	game := r.PathValue("game")
	var in struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		PriceXu     int64  `json:"price_xu"`
		Reward      string `json:"reward"`
		Description string `json:"description"`
		Category    string `json:"category"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "dữ liệu không đọc được")
		return
	}
	in.ID = strings.ToLower(strings.TrimSpace(in.ID))
	in.Name = strings.TrimSpace(in.Name)
	in.Reward = strings.TrimSpace(in.Reward)
	if in.Category == "" {
		in.Category = "item"
	}
	switch {
	case !pkgIDRe.MatchString(in.ID):
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "mã gói: chữ thường, số, gạch; tối đa 64 ký tự")
	case in.Name == "" || len(in.Name) > 128:
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "tên gói 1–128 ký tự")
	case in.PriceXu <= 0:
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "giá phải lớn hơn 0")
	case !rewardRe.MatchString(in.Reward):
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "quà phải dạng type:id:count#… (0:1:5000 = 5.000 Nguyên Bảo)")
	case !validCategory(in.Category):
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "nhóm không hợp lệ")
	default:
		_, err := s.db.ExecContext(r.Context(), `
			INSERT INTO game_packages
			  (game_code, package_id, name, category, grant_mode, price_xu, item_tid, item_count, item_name,
			   reward, description, status, sort_order)
			VALUES (?,?,?,?,'mail',?,0,1,?,?,?,'active',9000)`,
			game, in.ID, in.Name, in.Category, in.PriceXu, in.Name, in.Reward, nullIfBlank(in.Description, 512))
		if err != nil {
			if strings.Contains(err.Error(), "Duplicate") {
				httpx.Error(w, http.StatusConflict, "exists", "Mã gói đã có.")
				return
			}
			s.log.Error("tao goi", "err", err)
			httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
			return
		}
		detail, _ := json.Marshal(in)
		s.audit(r.Context(), a.ID, "package_create", game+"/"+in.ID, string(detail))
		httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
	}
}

func nullIfBlank(s string, max int) any {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	if len(s) > max {
		s = s[:max]
	}
	return s
}

// ---------------------------------------------------------------- don mua

func (s *server) ordersPage(w http.ResponseWriter, r *http.Request, a *admin) {
	ctx := r.Context()
	games := s.games(ctx)
	game := pickGame(r, games)
	status := r.URL.Query().Get("status")
	switch status {
	case "pending", "granted", "failed", "refunded":
	default:
		status = ""
	}
	wal := &wallet.Service{DB: s.db}
	orders, err := wal.RecentOrders(ctx, game, status, 200)
	if err != nil {
		s.log.Error("doc don mua", "err", err)
	}
	counts := map[string]int{}
	crows, err := s.db.QueryContext(ctx, `SELECT status, COUNT(*) FROM game_grants WHERE game_code = ? GROUP BY status`, game)
	if err == nil {
		for crows.Next() {
			var st string
			var n int
			if crows.Scan(&st, &n) == nil {
				counts[st] = n
			}
		}
		_ = crows.Close()
	}
	s.render(w, "orders.html", map[string]any{
		"Admin": a, "Games": games, "Game": game, "Status": status, "Orders": orders, "Counts": counts,
	})
}

func orderID(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		return 0, errors.New("id khong hop le")
	}
	return id, nil
}

func (s *server) apiOrderRetry(w http.ResponseWriter, r *http.Request, a *admin) {
	id, err := orderID(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	wal := &wallet.Service{DB: s.db}
	if err := wal.RetryGrant(r.Context(), id); err != nil {
		if errors.Is(err, wallet.ErrGrantNotFound) {
			httpx.Error(w, http.StatusNotFound, "not_found", "Chỉ phát lại được lệnh đang 'failed'.")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		return
	}
	s.audit(r.Context(), a.ID, "grant_retry", fmt.Sprint(id), "")
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *server) apiOrderRefund(w http.ResponseWriter, r *http.Request, a *admin) {
	id, err := orderID(r)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	var in struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in)
	wal := &wallet.Service{DB: s.db}
	txn, err := wal.RefundGrant(r.Context(), id, "quan tri "+a.Username+": "+strings.TrimSpace(in.Reason))
	if err != nil {
		switch {
		case errors.Is(err, wallet.ErrGrantNotFound):
			httpx.Error(w, http.StatusNotFound, "not_found", "Không có lệnh này.")
		case errors.Is(err, wallet.ErrCannotRefund):
			httpx.Error(w, http.StatusConflict, "granted", "Lệnh đã phát hàng, không hoàn được.")
		default:
			s.log.Error("hoan Xu", "err", err, "grant", id)
			httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		}
		return
	}
	s.audit(r.Context(), a.ID, "grant_refund", fmt.Sprint(id), fmt.Sprintf(`{"refund_txn":%d,"reason":%q}`, txn, in.Reason))
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true, "refund_txn": txn})
}
