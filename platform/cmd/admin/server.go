package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/rickymta/op-h5/platform/internal/console"
	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/identity"
	"github.com/rickymta/op-h5/platform/internal/wallet"
)

const adminCookie = "op_admin"

type server struct {
	db      *sql.DB
	log     *slog.Logger
	secure  bool
	fetcher *fleetFetcher
	// console la duong toi game (phat vat pham, gui thu, kho do). nil khi chua cau hinh:
	// trang quan tri van chay, chi cac thao tac GM la bao "chua cau hinh console".
	console *console.Client
	// public: ADMIN_PUBLIC=1 — trang duoc nginx cho di vao tu Internet. Van bind loopback;
	// co nay chi siet cac lop o tang ung dung (login.go).
	public bool
	// sessionTTL la tuoi tho phien quan tri (12 gio, con 4 gio khi mo cong khai).
	sessionTTL time.Duration
	// guard dem so lan dang nhap sai theo ten dang nhap va theo IP.
	guard *loginGuard
}

// nowUnix tach ra de test co the co dinh thoi gian sau nay.
func nowUnix() int64 { return time.Now().Unix() }

type admin struct {
	ID         int64
	Username   string
	Email      string
	Role       string
	MustChange bool
}

func hashAdminPassword(p string) (string, error) { return identity.HashPassword(p) }

func (s *server) current(r *http.Request) (*admin, bool) {
	c, err := r.Cookie(adminCookie)
	if err != nil {
		return nil, false
	}
	var a admin
	err = s.db.QueryRowContext(r.Context(), `
		SELECT u.id, u.username, COALESCE(u.email,''), u.role, u.must_change_password
		  FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_id
		 WHERE s.id = ? AND s.revoked_at IS NULL AND s.expires_at > NOW()
		   AND u.status = 'active'`, c.Value).Scan(&a.ID, &a.Username, &a.Email, &a.Role, &a.MustChange)
	if err != nil {
		return nil, false
	}
	return &a, true
}

// requireAdminAPI bao ve endpoint JSON: tra 401 thay vi chuyen huong.
//
// Giao dien la SPA, nen 401 la cau tra loi dung: trang tu chuyen sang /dang-nhap va giu
// lai duong dan dang xem. Chuyen huong 302 o day se lam fetch() nhan ve HTML cua trang
// dang nhap kem ma 200 — loi kho lan ra nhat trong mot SPA.
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

// requireGMRole doi vai tro tu 'gm' tro len. viewer chi duoc xem.
//
// Truoc day ham nay nam trong gm.go; cong cu GM da chuyen sang cong cua tung game, nhung
// trang Nguoi choi cua he thong van can dung nguong vai tro nay.
func (s *server) requireGMRole(h func(http.ResponseWriter, *http.Request, *admin)) http.HandlerFunc {
	return s.requireAdminAPI(func(w http.ResponseWriter, r *http.Request, a *admin) {
		switch a.Role {
		case "gm", "operator", "owner":
			h(w, r, a)
		default:
			httpx.Error(w, http.StatusForbidden, "forbidden", "Tài khoản này chỉ có quyền xem.")
		}
	})
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

// loginErrors doi ma loi trong URL thanh cau hien tren form.
//
// Truoc day trang in thang ?loi= ra man hinh. html/template co escape nen khong thanh XSS,
// nhung mot lien ket kieu /dang-nhap?loi=<cau du> van dat duoc chu cua ke tan cong len
// trang dang nhap that. Bang tra cuu dong nay lai.
var loginErrors = map[string]string{
	"1":     "Tài khoản hoặc mật khẩu không đúng.",
	"nhieu": "Sai quá nhiều lần. Vui lòng thử lại sau ít phút.",
}

// loginFailed tra ve loi JSON. Ma loi giu nguyen ten cu ("1", "nhieu") de cau chu chi nam
// o mot cho — trang dang nhap la SPA nen chinh no hien cau nay.
func (s *server) loginFailed(w http.ResponseWriter, status int, code string) {
	kind := "invalid_credentials"
	if code == "nhieu" {
		kind = "too_many_attempts"
	}
	httpx.Error(w, status, kind, loginErrors[code])
}

// doLogin xu ly dang nhap quan tri (POST /api/login).
//
// Nhan CA JSON lan form-urlencoded: giao dien gui JSON, con `curl -d user=...` khi truc
// tiep tren may chu van dung duoc ma khong phai dung ten mot trang HTML da bi xoa.
//
// Ghi log MOI luot, ca thanh cong lan that bai, kem IP: khi trang mo ra Internet thi day la
// nguon duy nhat de nhin thay mot dot do mat khau dang dien ra.
func (s *server) doLogin(w http.ResponseWriter, r *http.Request) {
	user, pass, err := loginCredentials(r)
	if err != nil {
		s.loginFailed(w, http.StatusBadRequest, "1")
		return
	}
	ctx := r.Context()
	// nginx dat X-Forwarded-For; ClientIP chi tin header do khi request den tu proxy noi bo.
	ip := httpx.ClientIP(r)

	if s.guard.blocked(ctx, user, ip) {
		s.log.Warn("dang nhap quan tri: khoa tam vi qua nhieu lan sai", "user", user, "ip", ip)
		s.loginFailed(w, http.StatusTooManyRequests, "nhieu")
		return
	}

	var (
		id     int64
		hash   string
		status string
	)
	err = s.db.QueryRowContext(ctx,
		`SELECT id, password_hash, status FROM admin_users WHERE username = ?`,
		user).Scan(&id, &hash, &status)
	if err != nil || status != "active" {
		// Van bam mot lan de thoi gian phan hoi khong tiet lo tai khoan co ton tai khong.
		_, _ = identity.HashPassword(pass)
		s.guard.record(ctx, user, ip, false)
		s.log.Warn("dang nhap quan tri that bai", "user", user, "ip", ip, "ly_do", "khong co tai khoan hoac bi khoa")
		s.loginFailed(w, http.StatusUnauthorized, "1")
		return
	}
	ok, err := identity.VerifyPassword(pass, hash)
	if err != nil || !ok {
		s.guard.record(ctx, user, ip, false)
		s.log.Warn("dang nhap quan tri that bai", "user", user, "ip", ip, "ly_do", "sai mat khau")
		s.loginFailed(w, http.StatusUnauthorized, "1")
		return
	}

	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không tạo được phiên.")
		return
	}
	sid := base64.RawURLEncoding.EncodeToString(b)
	ttl := s.sessionTTL
	if ttl <= 0 {
		ttl = 12 * time.Hour
	}
	if _, err := s.db.ExecContext(ctx, `
		INSERT INTO admin_sessions (id, admin_id, expires_at)
		VALUES (?,?,DATE_ADD(NOW(), INTERVAL ? SECOND))`, sid, id, int(ttl.Seconds())); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không tạo được phiên.")
		return
	}
	_, _ = s.db.ExecContext(ctx, `UPDATE admin_users SET last_login_at = NOW() WHERE id = ?`, id)
	http.SetCookie(w, &http.Cookie{
		Name: adminCookie, Value: sid, Path: "/", HttpOnly: true,
		Secure: s.secure, SameSite: http.SameSiteStrictMode, MaxAge: int(ttl.Seconds()),
	})
	s.guard.record(ctx, user, ip, true)
	s.log.Info("dang nhap quan tri", "user", user, "id", id, "ip", ip, "phien_gio", int(ttl.Hours()))
	detail, _ := json.Marshal(map[string]any{"ip": ip, "public": s.public})
	s.audit(ctx, id, "login", user, string(detail))
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// loginCredentials doc ten dang nhap va mat khau tu JSON hoac tu form.
func loginCredentials(r *http.Request) (user, pass string, err error) {
	if ct := r.Header.Get("Content-Type"); strings.HasPrefix(ct, "application/json") {
		var in struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 4<<10)).Decode(&in); err != nil {
			return "", "", err
		}
		return in.Username, in.Password, nil
	}
	if err := r.ParseForm(); err != nil {
		return "", "", err
	}
	return r.FormValue("username"), r.FormValue("password"), nil
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
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// ---------------------------------------------------------------- API

// apiAudit tra mot trang nhat ky. Truoc day day la trang Go /nhat-ky.
//
// Co phan trang that: ban dau ham nay luon tra 200 dong moi nhat va bo qua `page`, nen
// trang quan tri co nut sang trang ma bam vao khong doi gi — nguoi truc khong bao gio doc
// duoc nhat ky cu hon 200 dong.
func (s *server) apiAudit(w http.ResponseWriter, r *http.Request, _ *admin) {
	page, size := pageParams(r, 50, 200)
	// Lay du mot dong de biet con trang sau hay khong, roi bo dong do khi tra ve.
	rows, err := s.db.QueryContext(r.Context(), `
		SELECT COALESCE(u.username,'-'), t.action, t.target, COALESCE(t.detail,''),
		       DATE_FORMAT(t.created_at,'%Y-%m-%d %H:%i')
		  FROM admin_audit t LEFT JOIN admin_users u ON u.id = t.admin_id
		 ORDER BY t.id DESC LIMIT ? OFFSET ?`, size+1, (page-1)*size)
	if err != nil {
		s.log.Error("doc nhat ky", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được nhật ký.")
		return
	}
	defer func() { _ = rows.Close() }()

	type entry struct {
		Who    string `json:"who"`
		Action string `json:"action"`
		Target string `json:"target"`
		Detail string `json:"detail"`
		At     string `json:"at"`
	}
	items := []entry{}
	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.Who, &e.Action, &e.Target, &e.Detail, &e.At); err == nil {
			items = append(items, e)
		}
	}
	hasMore := len(items) > size
	if hasMore {
		items = items[:size]
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"items": items, "page": page, "page_size": size, "has_more": hasMore,
	})
}

// pageParams doc `page` va `page_size` tu query, kep vao khoang hop le.
func pageParams(r *http.Request, def, max int) (page, size int) {
	page, size = 1, def
	if v, err := strconv.Atoi(r.URL.Query().Get("page")); err == nil && v > 1 {
		page = v
	}
	if v, err := strconv.Atoi(r.URL.Query().Get("page_size")); err == nil && v > 0 {
		size = v
		if size > max {
			size = max
		}
	}
	return page, size
}

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

// ---------------------------------------------------------------- nap tay

// apiTopup cong Xu vao vi mot nguoi choi. Dung cho den bu / ho tro.
//
// Moi lan nap deu vao nhat ky kem so tien va ly do: day la duong duy nhat tao tien
// ma khong qua cong thanh toan, nen phai truy nguoc duoc ai lam va vi sao.
func (s *server) apiTopup(w http.ResponseWriter, r *http.Request, a *admin) {
	var in struct {
		Username string `json:"username"`
		Amount   int64  `json:"amount"`
		Reason   string `json:"reason"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "dữ liệu không đọc được")
		return
	}
	if in.Amount <= 0 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "số Xu phải lớn hơn 0")
		return
	}
	if strings.TrimSpace(in.Reason) == "" {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "phải ghi lý do")
		return
	}
	ctx := r.Context()

	var uid int64
	if err := s.db.QueryRowContext(ctx,
		`SELECT id FROM users WHERE username = ?`, strings.ToLower(strings.TrimSpace(in.Username))).
		Scan(&uid); err != nil {
		httpx.Error(w, http.StatusNotFound, "user_not_found", "Không tìm thấy tài khoản.")
		return
	}

	// Khoa gan voi admin + thoi diem: bam hai lan trong cung mot giay khong cong hai lan,
	// nhung nap lai co chu y vao giay sau thi van duoc.
	idem := fmt.Sprintf("admin-%d-%d-%d", a.ID, uid, time.Now().Unix())
	wal := &wallet.Service{DB: s.db}
	txn, err := wal.Topup(ctx, uid, in.Amount, idem, "admin:"+a.Username, in.Reason)
	if err != nil {
		s.log.Error("nap tay", "err", err, "user", uid)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được giao dịch.")
		return
	}
	bal, _ := wal.Balance(ctx, uid)
	s.audit(ctx, a.ID, "wallet_topup", in.Username,
		fmt.Sprintf(`{"amount":%d,"reason":%q,"txn":%d}`, in.Amount, in.Reason, txn))
	httpx.JSON(w, http.StatusOK, map[string]any{"txn": txn, "balance": bal})
}
