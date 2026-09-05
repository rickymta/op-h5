package main

// Quan tri nen tang: game va nhan vien (docs/plan-go-react.md muc 14).
//
// Hai nhom nay truoc day khong co giao dien nao: game chi `platform-seed.sh` ghi duoc, va
// tai khoan nhan vien chi tao duoc mot lan tu bien moi truong khi bang con trong. Ca hai
// deu buoc phai vao server moi doi duoc.

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/identity"
)

var (
	codeRe  = regexp.MustCompile(`^[a-z][a-z0-9_-]{1,31}$`)
	staffRe = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{2,63}$`)
	roles   = []string{"viewer", "gm", "operator", "owner"}
)

func validRole(r string) bool {
	for _, x := range roles {
		if x == r {
			return true
		}
	}
	return false
}

// requireOwner: chi chu he thong duoc dung. Quan ly nhan vien la quyen tu nhan quyen,
// nen khong the de operator lam.
func (s *server) requireOwner(h func(http.ResponseWriter, *http.Request, *admin)) http.HandlerFunc {
	return s.requireAdminAPI(func(w http.ResponseWriter, r *http.Request, a *admin) {
		if a.Role != "owner" {
			httpx.Error(w, http.StatusForbidden, "forbidden", "Chỉ chủ hệ thống mới quản lý được nhân viên.")
			return
		}
		h(w, r, a)
	})
}

// ---------------------------------------------------------------- game

type gameRow struct {
	Code       string `json:"code"`
	Name       string `json:"name"`
	AdapterURL string `json:"adapter_url"`
	SiteURL    string `json:"site_url"`
	Status     string `json:"status"`
	SortOrder  int    `json:"sort_order"`
	Servers    int    `json:"servers"`
	Packages   int    `json:"packages"`
	HasClient  bool   `json:"has_client"`
}

func (s *server) apiGameList(w http.ResponseWriter, r *http.Request, _ *admin) {
	rows, err := s.db.QueryContext(r.Context(), `
		SELECT g.code, g.name, g.adapter_url, COALESCE(g.site_url,''), g.status, g.sort_order,
		       (SELECT COUNT(*) FROM game_servers  s WHERE s.game_code = g.code),
		       (SELECT COUNT(*) FROM game_packages p WHERE p.game_code = g.code AND p.status='active'),
		       EXISTS(SELECT 1 FROM oauth_clients c WHERE c.client_id = g.code)
		  FROM games g ORDER BY g.sort_order, g.code`)
	if err != nil {
		s.log.Error("doc danh sach game", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được danh sách game.")
		return
	}
	defer func() { _ = rows.Close() }()
	out := []gameRow{}
	for rows.Next() {
		var g gameRow
		if err := rows.Scan(&g.Code, &g.Name, &g.AdapterURL, &g.SiteURL, &g.Status, &g.SortOrder,
			&g.Servers, &g.Packages, &g.HasClient); err == nil {
			out = append(out, g)
		}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"games": out})
}

type gameInput struct {
	Code       string `json:"code"`
	Name       string `json:"name"`
	AdapterURL string `json:"adapter_url"`
	SiteURL    string `json:"site_url"`
	SortOrder  int    `json:"sort_order"`
	Status     string `json:"status"`
	// Máy chủ đầu tiên. Để trống thì chỉ tạo game, thêm máy chủ sau ở trang Đội máy chủ.
	DeviceCode string `json:"device_code"`
	DeviceName string `json:"device_name"`
	MaxOnline  int    `json:"max_online"`
	SrvCode    string `json:"srv_code"`
	SrvName    string `json:"srv_name"`
	WSPort     int    `json:"ws_port"`
	SoftLimit  int    `json:"soft_limit"`
}

func checkURL(raw, field string) error {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || u.Scheme == "" || u.Host == "" {
		return fmt.Errorf("%s phải là URL đầy đủ, ví dụ https://haitac.example.com", field)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("%s chỉ nhận http hoặc https", field)
	}
	return nil
}

// apiGameCreate them mot game: ghi ca bon bang trong MOT giao dich.
//
// Ghi roi rac de lai mot game "nua voi" ma khong ai nhin thay: co dong trong `games` nhung
// khong co client OIDC thi nguoi choi bam Dang nhap se nhan mot loi khong giai thich duoc.
func (s *server) apiGameCreate(w http.ResponseWriter, r *http.Request, a *admin) {
	var in gameInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được.")
		return
	}
	in.Code = strings.ToLower(strings.TrimSpace(in.Code))
	in.Name = strings.TrimSpace(in.Name)
	in.AdapterURL = strings.TrimSpace(in.AdapterURL)
	in.SiteURL = strings.TrimSpace(in.SiteURL)
	switch {
	case !codeRe.MatchString(in.Code):
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Mã game: chữ thường, số, gạch; 2–32 ký tự.")
		return
	case in.Name == "" || len(in.Name) > 64:
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Tên game 1–64 ký tự.")
		return
	}
	if err := checkURL(in.AdapterURL, "Địa chỉ Adapter"); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if err := checkURL(in.SiteURL, "Địa chỉ trang game"); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	wantServer := in.SrvCode != "" || in.DeviceCode != ""
	if wantServer {
		if !codeRe.MatchString(in.DeviceCode) || !codeRe.MatchString(in.SrvCode) {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "Mã thiết bị và mã máy chủ: chữ thường, số, gạch.")
			return
		}
		if in.WSPort < 1 || in.WSPort > 65535 {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "Cổng WebSocket phải trong khoảng 1–65535.")
			return
		}
	}
	ctx := r.Context()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không mở được giao dịch.")
		return
	}
	defer func() { _ = tx.Rollback() }()

	status := in.Status
	if status != "hidden" {
		status = "active"
	}
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO games (code, name, adapter_url, site_url, status, sort_order) VALUES (?,?,?,?,?,?)`,
		in.Code, in.Name, in.AdapterURL, in.SiteURL, status, in.SortOrder); err != nil {
		if strings.Contains(err.Error(), "Duplicate") {
			httpx.Error(w, http.StatusConflict, "exists", "Mã game này đã có.")
			return
		}
		s.log.Error("tao game", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		return
	}
	// Client OIDC cong khai (chi PKCE): trang game chay trong trinh duyet nen khong giu
	// duoc secret. redirect_uris phai KHOP TUYET DOI voi duong Adapter nhan ma uy quyen.
	redirect := strings.TrimRight(in.SiteURL, "/") + "/auth/callback"
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO oauth_clients (client_id, name, secret_hash, redirect_uris, scopes, require_pkce, status)
		VALUES (?,?,NULL,?, 'openid profile wallet', 1, 'active')
		ON DUPLICATE KEY UPDATE name=VALUES(name), redirect_uris=VALUES(redirect_uris)`,
		in.Code, in.Name, redirect); err != nil {
		s.log.Error("tao oauth client", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được client đăng nhập.")
		return
	}
	if wantServer {
		devName := in.DeviceName
		if devName == "" {
			devName = in.DeviceCode
		}
		maxOnline := in.MaxOnline
		if maxOnline <= 0 {
			maxOnline = 1600
		}
		srvName := in.SrvName
		if srvName == "" {
			srvName = in.SrvCode
		}
		soft := in.SoftLimit
		if soft <= 0 {
			soft = 800
		}
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO game_devices (game_code, device_code, name, max_online) VALUES (?,?,?,?)`,
			in.Code, in.DeviceCode, devName, maxOnline); err != nil {
			s.log.Error("tao thiet bi", "err", err)
			httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được thiết bị.")
			return
		}
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO game_servers (game_code, srv_code, name, device_code, ws_port, soft_limit) VALUES (?,?,?,?,?,?)`,
			in.Code, in.SrvCode, srvName, in.DeviceCode, in.WSPort, soft); err != nil {
			s.log.Error("tao may chu", "err", err)
			httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được máy chủ.")
			return
		}
	}
	if err := tx.Commit(); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không lưu được.")
		return
	}
	blob, _ := json.Marshal(in)
	s.audit(ctx, a.ID, "game_create", in.Code, string(blob))
	httpx.JSON(w, http.StatusOK, map[string]any{
		"ok": true,
		// Ghi ro gioi han: trang nay ghi DB, khong khoi dong duoc tien trinh nao.
		"message": fmt.Sprintf(
			"Đã thêm game %s. Còn phải chạy một Adapter riêng cho nó: đặt ADAPTER_GAME_CODE=%s, ADAPTER_CLIENT_ID=%s, ADAPTER_REDIRECT_URI=%s rồi khởi động container.",
			in.Code, in.Code, in.Code, redirect),
	})
}

func (s *server) apiGameUpdate(w http.ResponseWriter, r *http.Request, a *admin) {
	code := r.PathValue("code")
	var in struct {
		Name       *string `json:"name"`
		AdapterURL *string `json:"adapter_url"`
		SiteURL    *string `json:"site_url"`
		Status     *string `json:"status"`
		SortOrder  *int    `json:"sort_order"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được.")
		return
	}
	var sets []string
	var args []any
	set := func(col string, v any) { sets = append(sets, col+" = ?"); args = append(args, v) }
	if in.Name != nil {
		n := strings.TrimSpace(*in.Name)
		if n == "" || len(n) > 64 {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "Tên game 1–64 ký tự.")
			return
		}
		set("name", n)
	}
	for _, f := range []struct {
		v     *string
		col   string
		label string
	}{{in.AdapterURL, "adapter_url", "Địa chỉ Adapter"}, {in.SiteURL, "site_url", "Địa chỉ trang game"}} {
		if f.v == nil {
			continue
		}
		if err := checkURL(*f.v, f.label); err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", err.Error())
			return
		}
		set(f.col, strings.TrimSpace(*f.v))
	}
	if in.Status != nil {
		if *in.Status != "active" && *in.Status != "hidden" {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "Trạng thái phải là active hoặc hidden.")
			return
		}
		set("status", *in.Status)
	}
	if in.SortOrder != nil {
		set("sort_order", *in.SortOrder)
	}
	if len(sets) == 0 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Không có gì để sửa.")
		return
	}
	ctx := r.Context()
	args = append(args, code)
	if _, err := s.db.ExecContext(ctx, `UPDATE games SET `+strings.Join(sets, ", ")+` WHERE code = ?`, args...); err != nil {
		s.log.Error("sua game", "err", err, "code", code)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		return
	}
	// site_url doi thi redirect cua client OIDC phai doi theo, neu khong dang nhap se hong.
	if in.SiteURL != nil {
		redirect := strings.TrimRight(strings.TrimSpace(*in.SiteURL), "/") + "/auth/callback"
		if _, err := s.db.ExecContext(ctx,
			`UPDATE oauth_clients SET redirect_uris = ? WHERE client_id = ?`, redirect, code); err != nil {
			s.log.Error("sua redirect oauth", "err", err, "code", code)
		}
	}
	blob, _ := json.Marshal(in)
	s.audit(ctx, a.ID, "game_update", code, string(blob))
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

// ---------------------------------------------------------------- nhan vien

type staffRow struct {
	ID          int64  `json:"id"`
	Username    string `json:"username"`
	Email       string `json:"email"`
	MustChange  bool   `json:"must_change_password"`
	Role        string `json:"role"`
	Status      string `json:"status"`
	LastLoginAt string `json:"last_login_at"`
	CreatedAt   string `json:"created_at"`
}

func (s *server) apiStaffList(w http.ResponseWriter, r *http.Request, _ *admin) {
	rows, err := s.db.QueryContext(r.Context(), `
		SELECT id, username, COALESCE(email,''), role, status, must_change_password,
		       COALESCE(DATE_FORMAT(last_login_at, '%Y-%m-%d %H:%i'), ''),
		       DATE_FORMAT(created_at, '%Y-%m-%d')
		  FROM admin_users ORDER BY id`)
	if err != nil {
		s.log.Error("doc danh sach nhan vien", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được danh sách.")
		return
	}
	defer func() { _ = rows.Close() }()
	out := []staffRow{}
	for rows.Next() {
		var x staffRow
		if err := rows.Scan(&x.ID, &x.Username, &x.Email, &x.Role, &x.Status, &x.MustChange,
			&x.LastLoginAt, &x.CreatedAt); err == nil {
			out = append(out, x)
		}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"staff": out, "roles": roles})
}

// newPassword sinh mat khau ngau nhien 16 ky tu base64url.
//
// Nguoi tao khong tu dat mat khau ho nguoi khac: mat khau nguoi khac chon ho thuong bi
// dung lai o cho khac, va o day no la khoa vao cong cu phat vat pham.
func newPassword() (string, error) {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func (s *server) apiStaffCreate(w http.ResponseWriter, r *http.Request, a *admin) {
	var in struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Role     string `json:"role"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được.")
		return
	}
	in.Username = strings.ToLower(strings.TrimSpace(in.Username))
	if !staffRe.MatchString(in.Username) {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Tên đăng nhập: chữ thường, số, dấu chấm/gạch; 3–64 ký tự.")
		return
	}
	if !validRole(in.Role) {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Vai trò không hợp lệ.")
		return
	}
	pass, err := newPassword()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không sinh được mật khẩu.")
		return
	}
	hash, err := identity.HashPassword(pass)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không băm được mật khẩu.")
		return
	}
	ctx := r.Context()
	if _, err := s.db.ExecContext(ctx,
		`INSERT INTO admin_users (username, email, password_hash, role) VALUES (?,?,?,?)`,
		in.Username, nullIfBlank(strings.TrimSpace(in.Email), 190), hash, in.Role); err != nil {
		if strings.Contains(err.Error(), "Duplicate") {
			httpx.Error(w, http.StatusConflict, "exists", "Tên đăng nhập này đã có.")
			return
		}
		s.log.Error("tao nhan vien", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		return
	}
	s.audit(ctx, a.ID, "staff_create", in.Username, fmt.Sprintf(`{"role":%q}`, in.Role))
	// Mat khau tra ve MOT lan; khong luu cho nao doc lai duoc.
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true, "password": pass})
}

// ownerCount dem so chu he thong dang hoat dong, khong ke `exclude`.
func (s *server) ownerCount(ctx context.Context, exclude int64) (int, error) {
	var n int
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM admin_users WHERE role='owner' AND status='active' AND id <> ?`, exclude).Scan(&n)
	return n, err
}

func (s *server) apiStaffUpdate(w http.ResponseWriter, r *http.Request, a *admin) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "id không hợp lệ.")
		return
	}
	var in struct {
		Role   *string `json:"role"`
		Status *string `json:"status"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được.")
		return
	}
	// Mat quyen vao trang quan tri la su co khong tu sua duoc: chan ngay tu day.
	if id == a.ID {
		httpx.Error(w, http.StatusConflict, "self", "Không tự đổi vai trò hoặc tự khoá chính mình được.")
		return
	}
	ctx := r.Context()
	var curRole, curStatus, username string
	if err := s.db.QueryRowContext(ctx,
		`SELECT username, role, status FROM admin_users WHERE id = ?`, id).Scan(&username, &curRole, &curStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			httpx.Error(w, http.StatusNotFound, "not_found", "Không có tài khoản này.")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được tài khoản.")
		return
	}
	losesOwner := curRole == "owner" && curStatus == "active" &&
		((in.Role != nil && *in.Role != "owner") || (in.Status != nil && *in.Status != "active"))
	if losesOwner {
		n, err := s.ownerCount(ctx, id)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đếm được số chủ hệ thống.")
			return
		}
		if n == 0 {
			httpx.Error(w, http.StatusConflict, "last_owner",
				"Đây là chủ hệ thống hoạt động cuối cùng. Hãy đặt một người khác làm chủ trước.")
			return
		}
	}
	var sets []string
	var args []any
	if in.Role != nil {
		if !validRole(*in.Role) {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "Vai trò không hợp lệ.")
			return
		}
		sets = append(sets, "role = ?")
		args = append(args, *in.Role)
	}
	if in.Status != nil {
		if *in.Status != "active" && *in.Status != "disabled" {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "Trạng thái phải là active hoặc disabled.")
			return
		}
		sets = append(sets, "status = ?")
		args = append(args, *in.Status)
	}
	if len(sets) == 0 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Không có gì để sửa.")
		return
	}
	args = append(args, id)
	if _, err := s.db.ExecContext(ctx, `UPDATE admin_users SET `+strings.Join(sets, ", ")+` WHERE id = ?`, args...); err != nil {
		s.log.Error("sua nhan vien", "err", err, "id", id)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		return
	}
	// Khoa tai khoan phai cat luon phien dang mo, neu khong ho van dung tiep den khi het han.
	if in.Status != nil && *in.Status == "disabled" {
		if _, err := s.db.ExecContext(ctx,
			`UPDATE admin_sessions SET revoked_at = NOW() WHERE admin_id = ? AND revoked_at IS NULL`, id); err != nil {
			s.log.Error("thu hoi phien", "err", err, "id", id)
		}
	}
	blob, _ := json.Marshal(in)
	s.audit(ctx, a.ID, "staff_update", username, string(blob))
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *server) apiStaffPassword(w http.ResponseWriter, r *http.Request, a *admin) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "id không hợp lệ.")
		return
	}
	ctx := r.Context()
	var username string
	if err := s.db.QueryRowContext(ctx, `SELECT username FROM admin_users WHERE id = ?`, id).Scan(&username); err != nil {
		httpx.Error(w, http.StatusNotFound, "not_found", "Không có tài khoản này.")
		return
	}
	pass, err := newPassword()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không sinh được mật khẩu.")
		return
	}
	hash, err := identity.HashPassword(pass)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không băm được mật khẩu.")
		return
	}
	if _, err := s.db.ExecContext(ctx,
		`UPDATE admin_users SET password_hash = ?, must_change_password = 1 WHERE id = ?`, hash, id); err != nil {
		s.log.Error("dat lai mat khau", "err", err, "id", id)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		return
	}
	// Doi mat khau thi cat moi phien cu: neu tai khoan bi chiem, doi mat khau phai duoi
	// duoc ke dang dung no ra.
	if _, err := s.db.ExecContext(ctx,
		`UPDATE admin_sessions SET revoked_at = NOW() WHERE admin_id = ? AND revoked_at IS NULL`, id); err != nil {
		s.log.Error("thu hoi phien", "err", err, "id", id)
	}
	s.audit(ctx, a.ID, "staff_password_reset", username, "")
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true, "password": pass})
}

// ---------------------------------------------------------------- tai khoan cua chinh minh

// apiMe tra ve nguoi dang dang nhap. Giao dien dung de biet hien menu nao va co phai canh
// bao mat khau mac dinh khong.
func (s *server) apiMe(w http.ResponseWriter, r *http.Request, a *admin) {
	httpx.JSON(w, http.StatusOK, map[string]any{
		"id": a.ID, "username": a.Username, "email": a.Email, "role": a.Role,
		"must_change_password": a.MustChange,
	})
}

// apiMePassword doi mat khau cua CHINH nguoi dang dang nhap.
//
// Truoc day khong co duong nao: chi `owner` dat lai mat khau cho nguoi khac duoc, nen mot
// nhan vien muon doi mat khau cua minh phai nho nguoi khac lam ho — va nguoi do se biet
// mat khau moi.
func (s *server) apiMePassword(w http.ResponseWriter, r *http.Request, a *admin) {
	var in struct {
		Current string `json:"current"`
		New     string `json:"new"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được.")
		return
	}
	if len([]rune(in.New)) < 10 {
		httpx.Error(w, http.StatusBadRequest, "weak", "Mật khẩu mới phải từ 10 ký tự.")
		return
	}
	if in.New == in.Current {
		httpx.Error(w, http.StatusBadRequest, "same", "Mật khẩu mới phải khác mật khẩu cũ.")
		return
	}
	if in.New == defaultAdminPass {
		httpx.Error(w, http.StatusBadRequest, "default", "Đây là mật khẩu mặc định công khai, hãy chọn mật khẩu khác.")
		return
	}
	ctx := r.Context()
	var hash string
	if err := s.db.QueryRowContext(ctx, `SELECT password_hash FROM admin_users WHERE id = ?`, a.ID).Scan(&hash); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được tài khoản.")
		return
	}
	ok, err := identity.VerifyPassword(in.Current, hash)
	if err != nil || !ok {
		httpx.Error(w, http.StatusForbidden, "wrong_password", "Mật khẩu hiện tại không đúng.")
		return
	}
	newHash, err := identity.HashPassword(in.New)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không băm được mật khẩu.")
		return
	}
	if _, err := s.db.ExecContext(ctx,
		`UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ?`, newHash, a.ID); err != nil {
		s.log.Error("doi mat khau", "err", err, "id", a.ID)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		return
	}
	// Cat cac phien KHAC, giu phien hien tai: doi mat khau vi nghi bi lo thi phai duoi
	// duoc nguoi kia ra, nhung khong co ly do gi bat chinh minh dang nhap lai.
	if _, err := s.db.ExecContext(ctx, `
		UPDATE admin_sessions SET revoked_at = NOW()
		 WHERE admin_id = ? AND revoked_at IS NULL AND id <> ?`, a.ID, currentSessionID(r)); err != nil {
		s.log.Error("thu hoi phien khac", "err", err, "id", a.ID)
	}
	s.audit(ctx, a.ID, "self_password_change", a.Username, "")
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

// currentSessionID doc id phien tu cookie; rong neu khong co.
func currentSessionID(r *http.Request) string {
	if c, err := r.Cookie(adminCookie); err == nil {
		return c.Value
	}
	return ""
}
