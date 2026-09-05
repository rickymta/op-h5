package main

// Trang tai khoan cua cong (web/apps/portal, /tai-khoan/*): dang nhap/dang xuat bang JSON,
// ho so, email khoi phuc, game da choi, phien dang mo, lich su vi co loc. Hop dong 4.3.
//
// Dang nhap o day dung DUNG duong cua /oauth/authorize/login (Repo.Authenticate + Sessions.Create
// + SetCookie): cung bang sessions, cung cookie, nen dang nhap o trang chinh xong bam "Choi ngay"
// la Adapter nhan ra ngay qua OIDC.

import (
	"database/sql"
	"errors"
	"net"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/rickymta/op-h5/platform/internal/catalog"
	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/identity"
	"github.com/rickymta/op-h5/platform/internal/wallet"
)

var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

// login: POST {username, password} -> 200 + cookie phien. Sai -> 401 invalid_credentials (khong
// noi tai khoan co ton tai khong); bi khoa / thu qua nhieu -> 429 too_many_attempts.
func (a *apiServer) login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "dữ liệu không đọc được")
		return
	}
	ctx := r.Context()
	ip := httpx.ClientIP(r)
	u, err := a.users.Authenticate(ctx, in.Username, in.Password, ip)
	if err != nil {
		switch {
		case errors.Is(err, identity.ErrTooManyAttempts):
			httpx.Error(w, http.StatusTooManyRequests, "too_many_attempts", "Sai quá nhiều lần. Vui lòng thử lại sau ít phút.")
		case errors.Is(err, identity.ErrLocked):
			httpx.Error(w, http.StatusTooManyRequests, "too_many_attempts", "Tài khoản đang bị khoá.")
		case errors.Is(err, identity.ErrWrongPassword), errors.Is(err, identity.ErrNotFound):
			httpx.Error(w, http.StatusUnauthorized, "invalid_credentials", "Tài khoản hoặc mật khẩu không đúng.")
		default:
			a.log.Error("dang nhap", "err", err)
			httpx.Error(w, http.StatusInternalServerError, "server_error", "Có lỗi xảy ra, vui lòng thử lại.")
		}
		return
	}
	sid, err := a.sessions.Create(ctx, u.ID, ip, r.UserAgent())
	if err != nil {
		a.log.Error("tao phien", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Có lỗi xảy ra, vui lòng thử lại.")
		return
	}
	identity.SetCookie(w, sid, a.secure, a.sessions.TTL)
	httpx.JSON(w, http.StatusOK, map[string]any{"status": "ok", "id": u.ID, "username": u.Username})
}

// logout huy phien hien tai va xoa cookie. Khong co phien cung tra ok: bam Dang xuat hai lan
// khong phai la loi.
func (a *apiServer) logout(w http.ResponseWriter, r *http.Request) {
	if sid := identity.CookieValue(r, a.secure); sid != "" {
		if err := a.sessions.Revoke(r.Context(), sid); err != nil {
			a.log.Warn("huy phien", "err", err)
		}
	}
	identity.ClearCookie(w, a.secure)
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// me: ho so cua nguoi dang dang nhap.
func (a *apiServer) me(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	ctx := r.Context()
	u, err := a.users.ByID(ctx, uid)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Phiên không hợp lệ.")
		return
	}
	var verifiedAt, lastLogin sql.NullTime
	if err := a.db.QueryRowContext(ctx,
		`SELECT email_verified_at, last_login_at FROM users WHERE id = ?`, uid).Scan(&verifiedAt, &lastLogin); err != nil {
		a.log.Warn("doc dau vet dang nhap", "err", err, "user", uid)
	}
	out := map[string]any{
		"id": u.ID, "username": u.Username,
		"email_verified": verifiedAt.Valid,
		"created_at":     u.CreatedAt.Format(time.RFC3339),
	}
	if u.Email.Valid && u.Email.String != "" {
		out["email"] = u.Email.String
	}
	if u.Phone.Valid && u.Phone.String != "" {
		out["phone"] = u.Phone.String
	}
	if lastLogin.Valid {
		out["last_login_at"] = lastLogin.Time.Format(time.RFC3339)
	}
	httpx.JSON(w, http.StatusOK, out)
}

// updateEmail doi email khoi phuc. Email rong = bo email. Doi email thi co xac minh (neu co)
// mat hieu luc — email moi chua ai chung minh la cua minh.
func (a *apiServer) updateEmail(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	var in struct {
		Email string `json:"email"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "dữ liệu không đọc được")
		return
	}
	email := strings.ToLower(strings.TrimSpace(in.Email))
	if email != "" && (len(email) > 190 || !emailRe.MatchString(email)) {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Email không hợp lệ.")
		return
	}
	var v any
	if email != "" {
		v = email
	}
	if _, err := a.db.ExecContext(r.Context(),
		`UPDATE users SET email = ?, email_verified_at = NULL WHERE id = ?`, v, uid); err != nil {
		if strings.Contains(err.Error(), "uq_users_email") {
			httpx.Error(w, http.StatusConflict, "email_taken", "Email đã được sử dụng.")
			return
		}
		a.log.Error("doi email", "err", err, "user", uid)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"status": "ok", "email": email})
}

// myGames: game nguoi nay da tung vao (game_identities) noi voi bang games, kem don mua gan nhat.
func (a *apiServer) myGames(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT g.code, g.name, g.logo_url, COALESCE(g.site_url,''), gi.game_username, gi.created_at,
		       (SELECT MAX(x.created_at) FROM game_grants x WHERE x.user_id = gi.user_id AND x.game_code = gi.game_code)
		  FROM game_identities gi
		  JOIN games g ON g.code = gi.game_code AND g.status = 'active'
		 WHERE gi.user_id = ?
		 ORDER BY g.sort_order, g.code`, uid)
	if err != nil {
		a.log.Error("doc game cua nguoi choi", "err", err, "user", uid)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được danh sách game.")
		return
	}
	defer func() { _ = rows.Close() }()
	out := []map[string]any{}
	for rows.Next() {
		var code, name, logo, site, gameUser string
		var created time.Time
		var lastOrder sql.NullTime
		if err := rows.Scan(&code, &name, &logo, &site, &gameUser, &created, &lastOrder); err != nil {
			a.log.Error("doc game cua nguoi choi", "err", err)
			continue
		}
		site = strings.TrimRight(site, "/")
		row := map[string]any{
			"code": code, "name": name, "logo_url": catalog.AbsURL(site, logo),
			"site_url": site, "play_url": site + "/choi-game",
			"game_username": gameUser, "created_at": created.Format(time.RFC3339),
		}
		if lastOrder.Valid {
			row["last_order_at"] = lastOrder.Time.Format(time.RFC3339)
		}
		out = append(out, row)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"games": out})
}

// mySessions: cac phien con song cua nguoi nay. Chi lo 6 ky tu cuoi cua id phien — du de phan
// biet tren man hinh, khong du de mao danh.
func (a *apiServer) mySessions(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	current := identity.CookieValue(r, a.secure)
	rows, err := a.db.QueryContext(r.Context(), `
		SELECT id, ip, COALESCE(user_agent,''), created_at, expires_at
		  FROM sessions
		 WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()
		 ORDER BY created_at DESC`, uid)
	if err != nil {
		a.log.Error("doc phien", "err", err, "user", uid)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được danh sách phiên.")
		return
	}
	defer func() { _ = rows.Close() }()
	out := []map[string]any{}
	for rows.Next() {
		var id, ua string
		var ipRaw []byte
		var created, expires time.Time
		if err := rows.Scan(&id, &ipRaw, &ua, &created, &expires); err != nil {
			continue
		}
		ip := ""
		if len(ipRaw) == net.IPv4len || len(ipRaw) == net.IPv6len {
			ip = net.IP(ipRaw).String()
		}
		tail := id
		if len(tail) > 6 {
			tail = tail[len(tail)-6:]
		}
		out = append(out, map[string]any{
			"id_tail": tail, "ip": ip, "user_agent": ua,
			"created_at": created.Format(time.RFC3339), "expires_at": expires.Format(time.RFC3339),
			"current": id == current,
		})
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"sessions": out})
}

// revokeOtherSessions: "dang xuat moi noi khac" — giu phien hien tai.
func (a *apiServer) revokeOtherSessions(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	res, err := a.db.ExecContext(r.Context(),
		`UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND id <> ? AND revoked_at IS NULL`,
		uid, identity.CookieValue(r, a.secure))
	if err != nil {
		a.log.Error("thu hoi phien khac", "err", err, "user", uid)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không thu hồi được.")
		return
	}
	n, _ := res.RowsAffected()
	a.log.Info("dang xuat moi noi khac", "user", uid, "revoked", n, "ip", httpx.ClientIP(r))
	httpx.JSON(w, http.StatusOK, map[string]any{"revoked": n})
}

// parseHistoryQuery doc ?kind=all|topup|convert|refund|adjust&page=1&page_size=20.
func parseHistoryQuery(get func(string) string) (kind string, page, size int) {
	kind = strings.TrimSpace(get("kind"))
	valid := false
	for _, k := range wallet.HistoryKinds {
		if k == kind {
			valid = true
		}
	}
	if !valid {
		kind = ""
	}
	page, _ = strconv.Atoi(get("page"))
	if page < 1 {
		page = 1
	}
	size = catalog.ParseLimit(get("page_size"), 20, 100)
	return kind, page, size
}

// history: lich su vi co loc va phan trang. Khong tham so = trang 1, 20 dong, moi loai.
func (a *apiServer) history(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	kind, page, size := parseHistoryQuery(r.URL.Query().Get)
	items, hasMore, err := a.wallet.HistoryPage(r.Context(), uid, kind, (page-1)*size, size)
	if err != nil {
		a.log.Error("doc lich su", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được lịch sử.")
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, e := range items {
		row := map[string]any{"txn": e.TxnID, "kind": e.Kind, "amount": e.Amount, "at": e.At.Format(time.RFC3339)}
		if e.Memo.Valid {
			row["memo"] = e.Memo.String
		}
		out = append(out, row)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"items": out, "page": page, "page_size": size, "has_more": hasMore,
	})
}
