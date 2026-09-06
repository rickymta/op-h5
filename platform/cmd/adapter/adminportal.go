package main

// Cong GM cua RIENG game nay, phuc vu tai /admin-portal tren domain cua game.
//
// VI SAO O DAY chu khong phai o trang quan tri he thong
// -----------------------------------------------------
// Phan chia da thong nhat:
//
//   admin.<domain>                 quan tri TOAN HE THONG — CMS, nap tien cho he thong ID,
//                                  tai khoan chung, cau hinh cua hang
//   haitac.<domain>/admin-portal   GM cua RIENG game haitac
//
// Ly do ky thuat: moi thao tac GM deu di qua CONSOLE cua cum tcg — thu chi game nay co.
// Game them vao sau se co backend khac han, nen cong GM phai thuoc stack cua tung game.
// Truoc day /adminportal chuyen huong sang admin.<domain>/gm; nay phuc vu tai cho.
//
// PHIEN DANG NHAP
// ---------------
// Dung chung bang `admin_users` + `admin_sessions` voi trang quan tri he thong: mot danh
// sach nhan vien duy nhat, khong phai tao tai khoan hai noi. Nhung COOKIE thi rieng
// (`haitac_adm`, Path=/admin-portal) va gan voi domain game, nen dang nhap o day khong
// mo khoa trang quan tri he thong va nguoc lai — vao nham cong khong keo theo quyen.

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/rickymta/op-h5/platform/internal/gmops"
	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/identity"
	"github.com/rickymta/op-h5/platform/internal/spa"
)

const (
	admCookie = "haitac_adm"
	admTTL    = 12 * time.Hour
	admBase   = "/admin-portal"
)

// admCurrent doc phien quan tri tu cookie. Tra ve Actor de dua thang cho gmops.
func (s *adapterServer) admCurrent(r *http.Request) (gmops.Actor, bool) {
	c, err := r.Cookie(admCookie)
	if err != nil {
		return gmops.Actor{}, false
	}
	var a gmops.Actor
	err = s.db.QueryRowContext(r.Context(), `
		SELECT u.id, u.username, u.role
		  FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_id
		 WHERE s.id = ? AND s.revoked_at IS NULL AND s.expires_at > NOW()
		   AND u.status = 'active'`, c.Value).Scan(&a.ID, &a.Username, &a.Role)
	if err != nil {
		return gmops.Actor{}, false
	}
	return a, true
}

// admPage bao ve trang HTML: chua dang nhap thi chuyen sang form.
func (s *adapterServer) admPage(h func(http.ResponseWriter, *http.Request, gmops.Actor)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		a, ok := s.admCurrent(r)
		if !ok {
			http.Redirect(w, r, admBase+"/dang-nhap", http.StatusFound)
			return
		}
		h(w, r, a)
	}
}

// admAPI bao ve endpoint JSON: tra 401 thay vi chuyen huong, va doi vai tro >= gm.
// `viewer` chi duoc xem, khong duoc cham vao nhan vat.
func (s *adapterServer) admAPI(h func(http.ResponseWriter, *http.Request, gmops.Actor)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		a, ok := s.admCurrent(r)
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
			return
		}
		if !a.CanGM() {
			httpx.Error(w, http.StatusForbidden, "forbidden", "Tài khoản này chỉ có quyền xem.")
			return
		}
		h(w, r, a)
	}
}

// admWantsJSON: SPA goi bang fetch va dat Accept/Content-Type JSON; trinh duyet gui form
// thi khong. Mot handler phuc vu ca hai de khong phai giu hai duong dang nhap.
func admWantsJSON(r *http.Request) bool {
	return strings.Contains(r.Header.Get("Content-Type"), "application/json") ||
		strings.Contains(r.Header.Get("Accept"), "application/json")
}

func (s *adapterServer) admDoLogin(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var user, pass string
	asJSON := admWantsJSON(r)
	if asJSON {
		var in struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được.")
			return
		}
		user, pass = strings.ToLower(strings.TrimSpace(in.Username)), in.Password
	} else {
		if err := r.ParseForm(); err != nil {
			http.Redirect(w, r, admBase+"/dang-nhap?loi=1", http.StatusFound)
			return
		}
		user, pass = strings.ToLower(strings.TrimSpace(r.FormValue("username"))), r.FormValue("password")
	}
	deny := func(reason string) {
		s.log.Warn("dang nhap cong GM that bai", "user", user, "ip", httpx.ClientIP(r), "ly_do", reason)
		if asJSON {
			httpx.Error(w, http.StatusUnauthorized, "invalid_credentials", "Sai tài khoản hoặc mật khẩu.")
			return
		}
		http.Redirect(w, r, admBase+"/dang-nhap?loi=1", http.StatusFound)
	}

	var (
		id     int64
		hash   string
		status string
	)
	err := s.db.QueryRowContext(ctx,
		`SELECT id, password_hash, status FROM admin_users WHERE username = ?`, user).
		Scan(&id, &hash, &status)
	if err != nil || status != "active" {
		// Van bam mot lan de thoi gian phan hoi khong tiet lo tai khoan co ton tai khong.
		_, _ = identity.HashPassword(pass)
		deny("khong co tai khoan hoac bi khoa")
		return
	}
	ok, err := identity.VerifyPassword(pass, hash)
	if err != nil || !ok {
		deny("sai mat khau")
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
		VALUES (?,?,DATE_ADD(NOW(), INTERVAL ? SECOND))`, sid, id, int(admTTL.Seconds())); err != nil {
		s.log.Error("tao phien cong GM", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không tạo được phiên.")
		return
	}
	_, _ = s.db.ExecContext(ctx, `UPDATE admin_users SET last_login_at = NOW() WHERE id = ?`, id)

	http.SetCookie(w, &http.Cookie{
		Name: admCookie, Value: sid, Path: admBase, HttpOnly: true,
		Secure: s.useTLS, SameSite: http.SameSiteStrictMode, MaxAge: int(admTTL.Seconds()),
	})
	detail, _ := json.Marshal(map[string]any{"ip": httpx.ClientIP(r), "cong": "game:" + s.cfg.GameCode})
	s.admAudit(ctx, id, "login", user, string(detail))
	s.log.Info("dang nhap cong GM", "user", user, "id", id, "ip", httpx.ClientIP(r))
	if asJSON {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
		return
	}
	http.Redirect(w, r, admBase+"/", http.StatusFound)
}

func (s *adapterServer) admDoLogout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(admCookie); err == nil {
		_, _ = s.db.ExecContext(r.Context(),
			`UPDATE admin_sessions SET revoked_at = NOW() WHERE id = ?`, c.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name: admCookie, Value: "", Path: admBase, HttpOnly: true,
		Secure: s.useTLS, SameSite: http.SameSiteStrictMode, MaxAge: -1,
	})
	if admWantsJSON(r) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
		return
	}
	http.Redirect(w, r, admBase+"/dang-nhap", http.StatusFound)
}

func (s *adapterServer) admAudit(ctx context.Context, adminID int64, action, target, detail string) {
	if _, err := s.db.ExecContext(ctx,
		`INSERT INTO admin_audit (admin_id, action, target, detail) VALUES (?,?,?,?)`,
		adminID, action, target, detail); err != nil {
		s.log.Error("ghi admin_audit", "err", err, "action", action)
	}
}

// gm tra ve dich vu GM da gan vao game nay. Tao moi lan goi cho re: chi la mot struct
// tro toi console client va DB dung chung.
func (s *adapterServer) gm() *gmops.Service {
	return &gmops.Service{
		Console:      s.console,
		DB:           s.db,
		Log:          s.log,
		GameCode:     s.cfg.GameCode,
		PlatformCode: envOr("ADAPTER_PLATFORM_CODE", "develop"),
		ChannelCode:  envOr("ADAPTER_CHANNEL_CODE", "0"),
		CurrencyCode: envOr("ADAPTER_CURRENCY_CODE", "VND"),
	}
}

// mountAdminPortal gan cong GM vao mux.
func (s *adapterServer) mountAdminPortal(mux *http.ServeMux) {
	mux.HandleFunc("POST "+admBase+"/dang-nhap", s.admDoLogin)
	mux.HandleFunc("POST "+admBase+"/dang-xuat", s.admDoLogout)

	// Giao dien la SPA rieng (web/admin/apps/gm, base "/admin-portal/"), nhung trong binary
	// nay va phuc vu tu day — cung origin va cung cookie voi cac API ben duoi. spa.Mount lo
	// index.html cho moi duong con, cache cho tai san co bam, va 404 cho duong la duoi
	// /admin-portal/api/ (khong de roi vao SPA cong khai o "GET /": go nham mot duong quan
	// tri ma nhan trang chu cua game la mot bao cao loi kho hieu).
	spa.Mount(mux, admBase, s.gmDist, "dist-gm")

	mux.HandleFunc("GET "+admBase+"/api/me", s.admAPI(func(w http.ResponseWriter, r *http.Request, a gmops.Actor) {
		httpx.JSON(w, http.StatusOK, map[string]any{"username": a.Username, "role": a.Role, "game": s.cfg.GameCode})
	}))
	mux.HandleFunc("GET "+admBase+"/api/meta", s.admAPI(func(w http.ResponseWriter, r *http.Request, a gmops.Actor) {
		s.gm().Meta(w, r, a)
	}))
	mux.HandleFunc("GET "+admBase+"/api/roles", s.admAPI(func(w http.ResponseWriter, r *http.Request, a gmops.Actor) {
		s.gm().Roles(w, r, a)
	}))
	// Ba duong tra cuu duoi day thay cho viec nguoi truc phai mo mot bang khac roi chep ma
	// sang. Chung chi doc, nhung van nam sau admAPI nhu moi duong khac.
	mux.HandleFunc("GET "+admBase+"/api/catalog", s.admAPI(func(w http.ResponseWriter, r *http.Request, a gmops.Actor) {
		s.gm().Catalog(w, r, a)
	}))
	mux.HandleFunc("GET "+admBase+"/api/reward", s.admAPI(func(w http.ResponseWriter, r *http.Request, a gmops.Actor) {
		s.gm().DocQua(w, r, a)
	}))
	mux.HandleFunc("GET "+admBase+"/api/packages", s.admAPI(func(w http.ResponseWriter, r *http.Request, a gmops.Actor) {
		s.gm().Packages(w, r, a)
	}))
	mux.HandleFunc("GET "+admBase+"/api/bag", s.admAPI(func(w http.ResponseWriter, r *http.Request, a gmops.Actor) {
		s.gm().Bag(w, r, a)
	}))
	mux.HandleFunc("POST "+admBase+"/api/bag/clear", s.admAPI(func(w http.ResponseWriter, r *http.Request, a gmops.Actor) {
		s.gm().BagClear(w, r, a)
	}))
	mux.HandleFunc("POST "+admBase+"/api/pay", s.admAPI(func(w http.ResponseWriter, r *http.Request, a gmops.Actor) {
		s.gm().Pay(w, r, a)
	}))
	mux.HandleFunc("POST "+admBase+"/api/mail", s.admAPI(func(w http.ResponseWriter, r *http.Request, a gmops.Actor) {
		s.gm().Mail(w, r, a)
	}))
}
