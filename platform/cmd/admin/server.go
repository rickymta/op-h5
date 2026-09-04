package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"html/template"
	"log/slog"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/identity"
)

const adminCookie = "op_admin"

type server struct {
	db      *sql.DB
	log     *slog.Logger
	tpl     *template.Template
	secure  bool
	fetcher *fleetFetcher
}

type admin struct {
	ID       int64
	Username string
	Role     string
}

func hashAdminPassword(p string) (string, error) { return identity.HashPassword(p) }

func (s *server) current(r *http.Request) (*admin, bool) {
	c, err := r.Cookie(adminCookie)
	if err != nil {
		return nil, false
	}
	var a admin
	err = s.db.QueryRowContext(r.Context(), `
		SELECT u.id, u.username, u.role
		  FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_id
		 WHERE s.id = ? AND s.revoked_at IS NULL AND s.expires_at > NOW()
		   AND u.status = 'active'`, c.Value).Scan(&a.ID, &a.Username, &a.Role)
	if err != nil {
		return nil, false
	}
	return &a, true
}

// requireAdmin bao ve trang HTML: chua dang nhap thi chuyen sang form.
func (s *server) requireAdmin(h func(http.ResponseWriter, *http.Request, *admin)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		a, ok := s.current(r)
		if !ok {
			http.Redirect(w, r, "/dang-nhap", http.StatusFound)
			return
		}
		h(w, r, a)
	}
}

// requireAdminAPI bao ve endpoint JSON: tra 401 thay vi chuyen huong.
func (s *server) requireAdminAPI(h func(http.ResponseWriter, *http.Request, *admin)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		a, ok := s.current(r)
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
			return
		}
		h(w, r, a)
	}
}

// requireWrite doi quyen ghi. viewer chi duoc xem — de nguoi truc co the theo doi tai
// ma khong sua duoc nguong.
func (s *server) requireWrite(h func(http.ResponseWriter, *http.Request, *admin)) http.HandlerFunc {
	return s.requireAdminAPI(func(w http.ResponseWriter, r *http.Request, a *admin) {
		if a.Role != "operator" && a.Role != "owner" {
			httpx.Error(w, http.StatusForbidden, "forbidden", "Tài khoản này chỉ có quyền xem.")
			return
		}
		h(w, r, a)
	})
}

func (s *server) audit(ctx context.Context, adminID int64, action, target, detail string) {
	_, _ = s.db.ExecContext(ctx,
		`INSERT INTO admin_audit (admin_id, action, target, detail) VALUES (?,?,?,?)`,
		adminID, action, target, detail)
}

// ---------------------------------------------------------------- dang nhap

func (s *server) loginPage(w http.ResponseWriter, r *http.Request) {
	s.render(w, "login.html", map[string]any{"Error": r.URL.Query().Get("loi")})
}

func (s *server) doLogin(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, "/dang-nhap?loi=1", http.StatusFound)
		return
	}
	ctx := r.Context()
	var (
		id     int64
		hash   string
		status string
	)
	err := s.db.QueryRowContext(ctx,
		`SELECT id, password_hash, status FROM admin_users WHERE username = ?`,
		r.FormValue("username")).Scan(&id, &hash, &status)
	if err != nil || status != "active" {
		// Van bam mot lan de thoi gian phan hoi khong tiet lo tai khoan co ton tai khong.
		_, _ = identity.HashPassword(r.FormValue("password"))
		http.Redirect(w, r, "/dang-nhap?loi=1", http.StatusFound)
		return
	}
	ok, err := identity.VerifyPassword(r.FormValue("password"), hash)
	if err != nil || !ok {
		http.Redirect(w, r, "/dang-nhap?loi=1", http.StatusFound)
		return
	}

	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không tạo được phiên.")
		return
	}
	sid := base64.RawURLEncoding.EncodeToString(b)
	if _, err := s.db.ExecContext(ctx, `
		INSERT INTO admin_sessions (id, admin_id, expires_at)
		VALUES (?,?,DATE_ADD(NOW(), INTERVAL 12 HOUR))`, sid, id); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không tạo được phiên.")
		return
	}
	_, _ = s.db.ExecContext(ctx, `UPDATE admin_users SET last_login_at = NOW() WHERE id = ?`, id)
	http.SetCookie(w, &http.Cookie{
		Name: adminCookie, Value: sid, Path: "/", HttpOnly: true,
		Secure: s.secure, SameSite: http.SameSiteStrictMode, MaxAge: 12 * 3600,
	})
	s.audit(ctx, id, "login", r.FormValue("username"), "")
	http.Redirect(w, r, "/", http.StatusFound)
}

func (s *server) doLogout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(adminCookie); err == nil {
		_, _ = s.db.ExecContext(r.Context(),
			`UPDATE admin_sessions SET revoked_at = NOW() WHERE id = ?`, c.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name: adminCookie, Value: "", Path: "/", HttpOnly: true,
		Secure: s.secure, SameSite: http.SameSiteStrictMode, MaxAge: -1,
	})
	http.Redirect(w, r, "/dang-nhap", http.StatusFound)
}

// ---------------------------------------------------------------- trang

func (s *server) render(w http.ResponseWriter, name string, data any) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := s.tpl.ExecuteTemplate(w, name, data); err != nil {
		s.log.Error("render", "tpl", name, "err", err)
	}
}

func (s *server) dashboard(w http.ResponseWriter, r *http.Request, a *admin) {
	games, err := s.fleetView(r.Context())
	if err != nil {
		s.log.Error("doc doi server", "err", err)
	}
	s.render(w, "dashboard.html", map[string]any{"Admin": a, "Games": games})
}

func (s *server) auditPage(w http.ResponseWriter, r *http.Request, a *admin) {
	rows, err := s.db.QueryContext(r.Context(), `
		SELECT COALESCE(u.username,'-'), t.action, t.target, COALESCE(t.detail,''),
		       DATE_FORMAT(t.created_at,'%Y-%m-%d %H:%i')
		  FROM admin_audit t LEFT JOIN admin_users u ON u.id = t.admin_id
		 ORDER BY t.id DESC LIMIT 200`)
	if err != nil {
		s.log.Error("doc nhat ky", "err", err)
		s.render(w, "audit.html", map[string]any{"Admin": a})
		return
	}
	defer func() { _ = rows.Close() }()

	type entry struct{ Who, Action, Target, Detail, At string }
	var items []entry
	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.Who, &e.Action, &e.Target, &e.Detail, &e.At); err == nil {
			items = append(items, e)
		}
	}
	s.render(w, "audit.html", map[string]any{"Admin": a, "Items": items})
}

// ---------------------------------------------------------------- API

func (s *server) apiFleet(w http.ResponseWriter, r *http.Request, _ *admin) {
	games, err := s.fleetView(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, "fetch_failed", err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"games": games})
}

func (s *server) apiUpdateServer(w http.ResponseWriter, r *http.Request, a *admin) {
	game, srv := r.PathValue("game"), r.PathValue("srv")
	var in struct {
		SoftLimit   *int    `json:"soft_limit"`
		OverflowPct *int    `json:"overflow_pct"`
		Recommend   *bool   `json:"recommend"`
		Status      *string `json:"status"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "dữ liệu không đọc được")
		return
	}
	if in.SoftLimit != nil && (*in.SoftLimit < 0 || *in.SoftLimit > 100000) {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "ngưỡng mềm phải trong khoảng 0–100000")
		return
	}
	// Bien tran am se lam tran cung THAP hon nguong mem — chan luon.
	if in.OverflowPct != nil && (*in.OverflowPct < 0 || *in.OverflowPct > 100) {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "biên tràn phải trong khoảng 0–100%")
		return
	}
	if in.Status != nil {
		switch *in.Status {
		case "running", "maintain", "closed", "merged":
		default:
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "trạng thái không hợp lệ")
			return
		}
	}

	sets, args := []string{}, []any{}
	if in.SoftLimit != nil {
		sets = append(sets, "soft_limit = ?")
		args = append(args, *in.SoftLimit)
	}
	if in.OverflowPct != nil {
		sets = append(sets, "overflow_pct = ?")
		args = append(args, *in.OverflowPct)
	}
	if in.Recommend != nil {
		sets = append(sets, "recommend = ?")
		args = append(args, *in.Recommend)
	}
	if in.Status != nil {
		sets = append(sets, "status = ?")
		args = append(args, *in.Status)
	}
	if len(sets) == 0 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "không có gì để sửa")
		return
	}
	args = append(args, game, srv)
	q := "UPDATE game_servers SET " + joinComma(sets) + " WHERE game_code = ? AND srv_code = ?"
	res, err := s.db.ExecContext(r.Context(), q, args...)
	if err != nil {
		s.log.Error("sua cau hinh server", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "không lưu được")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		httpx.Error(w, http.StatusNotFound, "not_found", "không tìm thấy máy chủ")
		return
	}
	detail, _ := json.Marshal(in)
	s.audit(r.Context(), a.ID, "update_server", game+"/"+srv, string(detail))
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *server) apiUpdateDevice(w http.ResponseWriter, r *http.Request, a *admin) {
	game, device := r.PathValue("game"), r.PathValue("device")
	var in struct {
		MaxOnline *int `json:"max_online"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil || in.MaxOnline == nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "thiếu max_online")
		return
	}
	if *in.MaxOnline < 0 || *in.MaxOnline > 1000000 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "trần máy không hợp lệ")
		return
	}
	res, err := s.db.ExecContext(r.Context(),
		`UPDATE game_devices SET max_online = ? WHERE game_code = ? AND device_code = ?`,
		*in.MaxOnline, game, device)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "không lưu được")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		httpx.Error(w, http.StatusNotFound, "not_found", "không tìm thấy máy")
		return
	}
	s.audit(r.Context(), a.ID, "update_device", game+"/"+device, strconv.Itoa(*in.MaxOnline))
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func joinComma(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += ", "
		}
		out += p
	}
	return out
}

func (s *server) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	if err := s.db.PingContext(ctx); err != nil {
		httpx.JSON(w, http.StatusServiceUnavailable, map[string]string{"status": "db_down"})
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// ---------------------------------------------------------------- doc doi server

// GameView gom cau hinh trong DB voi so lieu tai lay tu Adapter cua game do.
type GameView struct {
	Code        string      `json:"code"`
	Name        string      `json:"name"`
	Reachable   bool        `json:"reachable"`
	Error       string      `json:"error,omitempty"`
	Online      int         `json:"online"`
	SoftTotal   int         `json:"soft_total"`
	Utilization int         `json:"utilization"`
	Servers     []ServerRow `json:"servers"`
	Devices     []DeviceRow `json:"devices"`
}

type ServerRow struct {
	SrvCode     string `json:"srv_code"`
	Name        string `json:"name"`
	DeviceCode  string `json:"device_code"`
	Status      string `json:"status"`
	Recommend   bool   `json:"recommend"`
	SoftLimit   int    `json:"soft_limit"`
	OverflowPct int    `json:"overflow_pct"`
	HardLimit   int    `json:"hard_limit"`
	Online      int    `json:"online"`
	Band        string `json:"band"`
	Label       string `json:"label"`
}

type DeviceRow struct {
	DeviceCode string `json:"device_code"`
	Name       string `json:"name"`
	MaxOnline  int    `json:"max_online"`
	Online     int    `json:"online"`
}

// fleetView doc cau hinh tu DB roi hoi Adapter cua tung game de lay tai thuc te.
//
// Adapter khong voi toi duoc thi van hien cau hinh, chi danh dau Reachable = false —
// mat so lieu tai khong duoc lam mat luon kha nang xem va sua nguong.
func (s *server) fleetView(ctx context.Context) ([]GameView, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT code, name, adapter_url FROM games WHERE status = 'active' ORDER BY sort_order, code`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	type gameCfg struct{ code, name, url string }
	var cfgs []gameCfg
	for rows.Next() {
		var g gameCfg
		if err := rows.Scan(&g.code, &g.name, &g.url); err != nil {
			return nil, err
		}
		cfgs = append(cfgs, g)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	out := make([]GameView, 0, len(cfgs))
	for _, g := range cfgs {
		gv := GameView{Code: g.code, Name: g.name}
		live, err := s.fetcher.fetch(ctx, g.url)
		if err != nil {
			gv.Error = err.Error()
		} else {
			gv.Reachable = true
			gv.Online, gv.SoftTotal, gv.Utilization = live.Online, live.SoftTotal, live.Utilization
		}

		srvRows, err := s.db.QueryContext(ctx, `
			SELECT srv_code, name, device_code, status, recommend, soft_limit, overflow_pct
			  FROM game_servers WHERE game_code = ? ORDER BY srv_code`, g.code)
		if err != nil {
			return nil, err
		}
		deviceLoad := map[string]int{}
		for srvRows.Next() {
			var r ServerRow
			if err := srvRows.Scan(&r.SrvCode, &r.Name, &r.DeviceCode, &r.Status,
				&r.Recommend, &r.SoftLimit, &r.OverflowPct); err != nil {
				_ = srvRows.Close()
				return nil, err
			}
			r.HardLimit = r.SoftLimit * (100 + r.OverflowPct) / 100
			if l, ok := live.byCode[r.SrvCode]; ok {
				r.Online, r.Band, r.Label = l.Online, l.Band, l.Label
			} else {
				r.Band, r.Label = "unknown", "—"
			}
			deviceLoad[r.DeviceCode] += r.Online
			gv.Servers = append(gv.Servers, r)
		}
		_ = srvRows.Close()

		devRows, err := s.db.QueryContext(ctx,
			`SELECT device_code, name, max_online FROM game_devices WHERE game_code = ? ORDER BY device_code`, g.code)
		if err != nil {
			return nil, err
		}
		for devRows.Next() {
			var d DeviceRow
			if err := devRows.Scan(&d.DeviceCode, &d.Name, &d.MaxOnline); err != nil {
				_ = devRows.Close()
				return nil, err
			}
			d.Online = deviceLoad[d.DeviceCode]
			gv.Devices = append(gv.Devices, d)
		}
		_ = devRows.Close()

		sort.Slice(gv.Servers, func(i, j int) bool { return gv.Servers[i].SrvCode < gv.Servers[j].SrvCode })
		out = append(out, gv)
	}
	return out, nil
}
