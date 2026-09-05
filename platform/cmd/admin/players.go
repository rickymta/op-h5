package main

// Quan ly nguoi choi (docs/plan-go-react.md muc 14.3): tim, xem vi va nhan vat, khoa/mo.
//
// Co y KHONG co: xem mat khau (khong doc nguoc duoc, va khong nen), va dang nhap ho —
// mot nut "vao tai khoan nay" bien moi nhat ky thanh vo nghia.

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/wallet"
)

type playerRow struct {
	ID          int64  `json:"id"`
	Username    string `json:"username"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	Status      string `json:"status"`
	Balance     int64  `json:"balance"`
	LastLoginAt string `json:"last_login_at"`
	CreatedAt   string `json:"created_at"`
}

const playerColumns = `
	SELECT u.id, u.username, COALESCE(u.email,''), COALESCE(u.phone,''), u.status,
	       COALESCE((SELECT SUM(e.amount) FROM ledger_entries e
	                   JOIN wallet_accounts a ON a.id = e.account_id
	                  WHERE a.kind='user' AND a.user_id = u.id AND a.currency='XU'), 0),
	       COALESCE(DATE_FORMAT(u.last_login_at, '%Y-%m-%d %H:%i'), ''),
	       DATE_FORMAT(u.created_at, '%Y-%m-%d')
	  FROM users u`

func scanPlayers(rows *sql.Rows) []playerRow {
	defer func() { _ = rows.Close() }()
	out := []playerRow{}
	for rows.Next() {
		var p playerRow
		if err := rows.Scan(&p.ID, &p.Username, &p.Email, &p.Phone, &p.Status,
			&p.Balance, &p.LastLoginAt, &p.CreatedAt); err == nil {
			out = append(out, p)
		}
	}
	return out
}

// apiPlayerList tim nguoi choi theo ten dang nhap, email hoac so dien thoai.
//
// Khong co danh sach "tat ca": bang nay se co hang chuc nghin dong, va mot trang do het
// ra man hinh khong giup gi cho viec ho tro. Rong thi tra ve nguoi moi nhat de co cai nhin.
func (s *server) apiPlayerList(w http.ResponseWriter, r *http.Request, _ *admin) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	ctx := r.Context()
	var (
		rows *sql.Rows
		err  error
	)
	if q == "" {
		rows, err = s.db.QueryContext(ctx, playerColumns+` ORDER BY u.id DESC LIMIT 30`)
	} else {
		like := "%" + q + "%"
		rows, err = s.db.QueryContext(ctx,
			playerColumns+` WHERE u.username LIKE ? OR u.email LIKE ? OR u.phone LIKE ?
			 ORDER BY u.id DESC LIMIT 50`, like, like, like)
	}
	if err != nil {
		s.log.Error("tim nguoi choi", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không tìm được.")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"players": scanPlayers(rows)})
}

type playerIdentity struct {
	GameCode     string `json:"game_code"`
	GameUsername string `json:"game_username"`
	AccountUID   string `json:"account_uid"`
	CreatedAt    string `json:"created_at"`
}

// apiPlayerDetail: mot nguoi choi kem vi, nhan vat trong tung game va lich su gan day.
func (s *server) apiPlayerDetail(w http.ResponseWriter, r *http.Request, _ *admin) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "id không hợp lệ.")
		return
	}
	ctx := r.Context()
	rows, err := s.db.QueryContext(ctx, playerColumns+` WHERE u.id = ?`, id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được.")
		return
	}
	list := scanPlayers(rows)
	if len(list) == 0 {
		httpx.Error(w, http.StatusNotFound, "not_found", "Không có người chơi này.")
		return
	}

	ids := []playerIdentity{}
	if irows, err := s.db.QueryContext(ctx, `
		SELECT game_code, game_username, COALESCE(account_uid,''), DATE_FORMAT(created_at, '%Y-%m-%d')
		  FROM game_identities WHERE user_id = ? ORDER BY game_code`, id); err == nil {
		for irows.Next() {
			var x playerIdentity
			if irows.Scan(&x.GameCode, &x.GameUsername, &x.AccountUID, &x.CreatedAt) == nil {
				ids = append(ids, x)
			}
		}
		_ = irows.Close()
	} else {
		s.log.Error("doc nhan vat cua nguoi choi", "err", err, "user", id)
	}

	wal := &wallet.Service{DB: s.db}
	history, err := wal.History(ctx, id, 20)
	if err != nil {
		s.log.Error("doc lich su vi", "err", err, "user", id)
	}
	type entry struct {
		TxnID  int64  `json:"txn_id"`
		Kind   string `json:"kind"`
		Amount int64  `json:"amount"`
		Memo   string `json:"memo"`
		At     string `json:"at"`
	}
	hist := []entry{}
	for _, e := range history {
		hist = append(hist, entry{TxnID: e.TxnID, Kind: e.Kind, Amount: e.Amount, Memo: e.Memo.String, At: e.At})
	}

	orders, err := wal.Orders(ctx, id, pickGame(r, s.games(ctx)), 20)
	if err != nil {
		s.log.Error("doc don mua cua nguoi choi", "err", err, "user", id)
	}
	if orders == nil {
		orders = []wallet.Order{}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"player": list[0], "identities": ids, "history": hist, "orders": orders,
	})
}

// apiPlayerUpdate khoa hoac mo tai khoan nguoi choi.
//
// Chi doi `status`: moi thu khac (email, mat khau) la cua nguoi choi, sua ho la mo duong
// cho viec chiem tai khoan ma nhin vao nhat ky khong phan biet duoc.
func (s *server) apiPlayerUpdate(w http.ResponseWriter, r *http.Request, a *admin) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "id không hợp lệ.")
		return
	}
	var in struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được.")
		return
	}
	if in.Status != "active" && in.Status != "locked" {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Trạng thái phải là active hoặc locked.")
		return
	}
	if strings.TrimSpace(in.Reason) == "" {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Phải ghi lý do, nó vào nhật ký.")
		return
	}
	ctx := r.Context()
	var username string
	if err := s.db.QueryRowContext(ctx, `SELECT username FROM users WHERE id = ?`, id).Scan(&username); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			httpx.Error(w, http.StatusNotFound, "not_found", "Không có người chơi này.")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được.")
		return
	}
	if _, err := s.db.ExecContext(ctx, `UPDATE users SET status = ? WHERE id = ?`, in.Status, id); err != nil {
		s.log.Error("doi trang thai nguoi choi", "err", err, "user", id)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		return
	}
	// Khoa ma khong cat phien thi ho van choi tiep den khi phien het han.
	if in.Status == "locked" {
		if _, err := s.db.ExecContext(ctx,
			`UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`, id); err != nil {
			s.log.Error("thu hoi phien nguoi choi", "err", err, "user", id)
		}
	}
	blob, _ := json.Marshal(in)
	s.audit(ctx, a.ID, "player_status", username, string(blob))
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}
