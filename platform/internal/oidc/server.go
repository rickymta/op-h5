package oidc

import (
	"context"
	"database/sql"
	"errors"
	"html/template"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/identity"
)

// Server phuc vu cac endpoint OIDC cua he thong ID.
type Server struct {
	Issuer   string
	Signer   *Signer
	Store    *Store
	Users    *identity.Repo
	Sessions *identity.Sessions
	Log      *slog.Logger

	AccessTTL   time.Duration
	RefreshTTL  time.Duration
	CodeTTL     time.Duration
	SessionTTL  time.Duration
	CookieSecur bool

	Tpl *template.Template
}

// Discovery tra ve tai lieu cau hinh de client tu tim cac endpoint.
func (s *Server) Discovery(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{
		"issuer":                                s.Issuer,
		"authorization_endpoint":                s.Issuer + "/oauth/authorize",
		"token_endpoint":                        s.Issuer + "/oauth/token",
		"userinfo_endpoint":                     s.Issuer + "/oauth/userinfo",
		"jwks_uri":                              s.Issuer + "/.well-known/jwks.json",
		"end_session_endpoint":                  s.Issuer + "/oauth/logout",
		"response_types_supported":              []string{"code"},
		"grant_types_supported":                 []string{"authorization_code", "refresh_token"},
		"subject_types_supported":               []string{"public"},
		"id_token_signing_alg_values_supported": []string{"RS256"},
		"scopes_supported":                      []string{"openid", "profile", "wallet"},
		"code_challenge_methods_supported":      []string{"S256"},
		"token_endpoint_auth_methods_supported": []string{"client_secret_post", "none"},
	})
}

// JWKS cong bo khoa cong khai.
func (s *Server) JWKS(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, s.Signer.JWKS())
}

// authzParams la cac tham so cua yeu cau uy quyen.
type authzParams struct {
	ClientID     string
	RedirectURI  string
	Scope        string
	State        string
	Nonce        string
	Challenge    string
	Method       string
	ResponseType string
}

func readAuthzParams(r *http.Request) authzParams {
	q := r.URL.Query()
	m := q.Get("code_challenge_method")
	if m == "" {
		m = "S256"
	}
	scope := q.Get("scope")
	if scope == "" {
		scope = "openid"
	}
	return authzParams{
		ClientID:     q.Get("client_id"),
		RedirectURI:  q.Get("redirect_uri"),
		Scope:        scope,
		State:        q.Get("state"),
		Nonce:        q.Get("nonce"),
		Challenge:    q.Get("code_challenge"),
		Method:       m,
		ResponseType: q.Get("response_type"),
	}
}

// redirectErr tra loi ve client qua redirect_uri (chi khi redirect_uri da duoc xac thuc).
func redirectErr(w http.ResponseWriter, r *http.Request, redirectURI, state, code, desc string) {
	u, err := url.Parse(redirectURI)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, code, desc)
		return
	}
	q := u.Query()
	q.Set("error", code)
	q.Set("error_description", desc)
	if state != "" {
		q.Set("state", state)
	}
	u.RawQuery = q.Encode()
	http.Redirect(w, r, u.String(), http.StatusFound)
}

// Authorize la endpoint uy quyen.
//
// Thu tu kiem tra co chu y: client_id va redirect_uri phai duoc xac thuc TRUOC khi
// bat ky loi nao duoc tra ve qua redirect. Neu khong, mot redirect_uri bia dat se
// tro thanh cong chuyen huong mo.
func (s *Server) Authorize(w http.ResponseWriter, r *http.Request) {
	p := readAuthzParams(r)
	ctx := r.Context()

	client, err := s.Store.Client(ctx, p.ClientID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_client", "client_id không hợp lệ")
		return
	}
	if !client.AllowsRedirect(p.RedirectURI) {
		// KHONG redirect ve URI chua duoc dang ky.
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "redirect_uri không khớp đăng ký")
		return
	}
	if p.ResponseType != "code" {
		redirectErr(w, r, p.RedirectURI, p.State, "unsupported_response_type", "chỉ hỗ trợ response_type=code")
		return
	}
	if client.RequirePKCE {
		if p.Challenge == "" {
			redirectErr(w, r, p.RedirectURI, p.State, "invalid_request", "thiếu code_challenge")
			return
		}
		if p.Method != "S256" {
			redirectErr(w, r, p.RedirectURI, p.State, "invalid_request", "chỉ hỗ trợ code_challenge_method=S256")
			return
		}
	}

	// Chua dang nhap -> hien form, giu nguyen tham so de quay lai sau khi dang nhap.
	sess, err := s.Sessions.Get(ctx, identity.CookieValue(r, s.CookieSecur))
	if err != nil {
		s.renderLogin(w, r, p, "")
		return
	}

	code, err := s.Store.IssueCode(ctx, AuthCodeRequest{
		ClientID: client.ID, UserID: sess.UserID, RedirectURI: p.RedirectURI,
		Scope: p.Scope, Nonce: p.Nonce, CodeChallenge: p.Challenge, Method: p.Method,
	}, s.CodeTTL)
	if err != nil {
		s.Log.Error("cap ma uy quyen", "err", err)
		redirectErr(w, r, p.RedirectURI, p.State, "server_error", "không cấp được mã ủy quyền")
		return
	}

	u, _ := url.Parse(p.RedirectURI)
	q := u.Query()
	q.Set("code", code)
	if p.State != "" {
		q.Set("state", p.State)
	}
	u.RawQuery = q.Encode()
	http.Redirect(w, r, u.String(), http.StatusFound)
}

type loginView struct {
	Params authzParams
	Error  string
	Action string
}

// formActionCSP noi long `form-action` vua du cho dung client dang dang nhap.
//
// CSP mac dinh (httpx.SecurityHeaders) dat `form-action 'self'`. Chrome ap rang buoc nay
// cho CA CHUOI CHUYEN HUONG sau khi POST, khong chi cho dia chi `action`. Ma dang nhap
// thanh cong thi `/oauth/authorize/login` chuyen huong sang redirect_uri cua game — mot
// origin KHAC — nen Chrome chan, va bao loi kem URL cua `action` nen rat de chan doan nham:
//
//	Sending form data to 'https://id.<domain>/oauth/authorize/login' violates the
//	following Content Security Policy directive: "form-action 'self'".
//
// Firefox khong ap cho chuyen huong nen loi chi hien tren Chrome.
//
// Chi them ORIGIN cua redirect_uri da duoc kiem (`p.RedirectURI` da qua AllowsRedirect),
// khong dung 'self' https: — noi long het thi mat luon tac dung chong chuyen huong form
// sang trang la.
func (s *Server) formActionCSP(w http.ResponseWriter, redirectURI string) {
	extra := ""
	if u, err := url.Parse(redirectURI); err == nil && u.Scheme != "" && u.Host != "" {
		extra = " " + u.Scheme + "://" + u.Host
	}
	w.Header().Set("Content-Security-Policy",
		"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "+
			"connect-src 'self'; form-action 'self'"+extra+"; base-uri 'none'; frame-ancestors 'none'")
}

func (s *Server) renderLogin(w http.ResponseWriter, r *http.Request, p authzParams, errMsg string) {
	s.formActionCSP(w, p.RedirectURI)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	status := http.StatusOK
	if errMsg != "" {
		status = http.StatusUnauthorized
	}
	w.WriteHeader(status)
	if err := s.Tpl.ExecuteTemplate(w, "login.html", loginView{
		Params: p, Error: errMsg, Action: "/oauth/authorize/login",
	}); err != nil {
		s.Log.Error("render login", "err", err)
	}
}

// AuthorizeLogin nhan form dang nhap roi quay lai buoc uy quyen.
func (s *Server) AuthorizeLogin(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "form không đọc được")
		return
	}
	p := authzParams{
		ClientID:     r.FormValue("client_id"),
		RedirectURI:  r.FormValue("redirect_uri"),
		Scope:        r.FormValue("scope"),
		State:        r.FormValue("state"),
		Nonce:        r.FormValue("nonce"),
		Challenge:    r.FormValue("code_challenge"),
		Method:       r.FormValue("code_challenge_method"),
		ResponseType: "code",
	}
	ctx := r.Context()
	ip := httpx.ClientIP(r)

	user, err := s.Users.Authenticate(ctx, r.FormValue("username"), r.FormValue("password"), ip)
	if err != nil {
		msg := "Tài khoản hoặc mật khẩu không đúng."
		switch {
		case errors.Is(err, identity.ErrTooManyAttempts):
			msg = "Sai quá nhiều lần. Vui lòng thử lại sau ít phút."
		case errors.Is(err, identity.ErrLocked):
			msg = "Tài khoản đang bị khoá."
		case errors.Is(err, identity.ErrWrongPassword), errors.Is(err, identity.ErrNotFound):
			// giu nguyen thong bao chung: khong tiet lo tai khoan co ton tai hay khong
		default:
			s.Log.Error("dang nhap", "err", err)
			msg = "Có lỗi xảy ra, vui lòng thử lại."
		}
		s.renderLogin(w, r, p, msg)
		return
	}

	sid, err := s.Sessions.Create(ctx, user.ID, ip, r.UserAgent())
	if err != nil {
		s.Log.Error("tao phien", "err", err)
		s.renderLogin(w, r, p, "Có lỗi xảy ra, vui lòng thử lại.")
		return
	}
	identity.SetCookie(w, sid, s.CookieSecur, s.SessionTTL)

	// Quay lai /oauth/authorize de di tiep dung mot duong duy nhat.
	q := url.Values{}
	q.Set("client_id", p.ClientID)
	q.Set("redirect_uri", p.RedirectURI)
	q.Set("response_type", "code")
	q.Set("scope", p.Scope)
	if p.State != "" {
		q.Set("state", p.State)
	}
	if p.Nonce != "" {
		q.Set("nonce", p.Nonce)
	}
	if p.Challenge != "" {
		q.Set("code_challenge", p.Challenge)
		q.Set("code_challenge_method", "S256")
	}
	http.Redirect(w, r, "/oauth/authorize?"+q.Encode(), http.StatusFound)
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token,omitempty"`
	IDToken      string `json:"id_token,omitempty"`
	Scope        string `json:"scope,omitempty"`
}

// authenticateClient xac thuc client o token endpoint.
func (s *Server) authenticateClient(ctx context.Context, r *http.Request) (*Client, error) {
	id := r.FormValue("client_id")
	secret := r.FormValue("client_secret")
	if u, p, ok := r.BasicAuth(); ok {
		id, secret = u, p
	}
	c, err := s.Store.Client(ctx, id)
	if err != nil {
		return nil, err
	}
	if c.IsConfidential() {
		ok, err := identity.VerifyPassword(secret, c.SecretHash.String)
		if err != nil || !ok {
			return nil, ErrClientUnknown
		}
	}
	return c, nil
}

// Token la endpoint doi ma uy quyen / refresh token lay access token.
func (s *Server) Token(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "form không đọc được")
		return
	}
	ctx := r.Context()
	client, err := s.authenticateClient(ctx, r)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid_client", "xác thực client thất bại")
		return
	}

	switch r.FormValue("grant_type") {
	case "authorization_code":
		s.grantAuthorizationCode(w, r, client)
	case "refresh_token":
		s.grantRefreshToken(w, r, client)
	default:
		httpx.Error(w, http.StatusBadRequest, "unsupported_grant_type", "grant_type không hỗ trợ")
	}
}

func (s *Server) grantAuthorizationCode(w http.ResponseWriter, r *http.Request, client *Client) {
	ctx := r.Context()
	code := r.FormValue("code")

	consumed, err := s.Store.ConsumeCode(ctx, code)
	if err != nil {
		if errors.Is(err, ErrCodeReplayed) {
			// Ma bi dung lai: nghi da bi danh cap. Thu hoi moi token cua nguoi dung do.
			s.Log.Warn("ma uy quyen bi dung lai", "client", client.ID)
		}
		httpx.Error(w, http.StatusBadRequest, "invalid_grant", "mã ủy quyền không hợp lệ")
		return
	}
	if consumed.ClientID != client.ID {
		httpx.Error(w, http.StatusBadRequest, "invalid_grant", "mã ủy quyền không thuộc client này")
		return
	}
	// redirect_uri phai khop y het luc xin ma (RFC 6749 muc 4.1.3).
	if consumed.RedirectURI != r.FormValue("redirect_uri") {
		httpx.Error(w, http.StatusBadRequest, "invalid_grant", "redirect_uri không khớp")
		return
	}
	if client.RequirePKCE || consumed.CodeChallenge != "" {
		if err := VerifyPKCE(consumed.Method, consumed.CodeChallenge, r.FormValue("code_verifier")); err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid_grant", "code_verifier không hợp lệ")
			return
		}
	}
	s.issueTokens(w, client.ID, consumed.UserID, consumed.Scope, consumed.Nonce, true)
}

func (s *Server) grantRefreshToken(w http.ResponseWriter, r *http.Request, client *Client) {
	ctx := r.Context()
	grant, next, err := s.Store.RotateRefreshToken(ctx, r.FormValue("refresh_token"), s.RefreshTTL)
	if err != nil {
		if errors.Is(err, ErrRefreshReused) {
			s.Log.Warn("refresh token bi dung lai, da thu hoi toan bo", "client", client.ID)
		}
		httpx.Error(w, http.StatusBadRequest, "invalid_grant", "refresh token không hợp lệ")
		return
	}
	if grant.ClientID != client.ID {
		httpx.Error(w, http.StatusBadRequest, "invalid_grant", "refresh token không thuộc client này")
		return
	}
	access, err := s.Signer.Mint(Claims{
		Issuer: s.Issuer, Subject: grant.UserID, Audience: client.ID,
		Scope: grant.Scope, TTL: s.AccessTTL, Kind: "access",
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "không ký được token")
		return
	}
	httpx.JSON(w, http.StatusOK, tokenResponse{
		AccessToken: access, TokenType: "Bearer",
		ExpiresIn: int(s.AccessTTL.Seconds()), RefreshToken: next, Scope: grant.Scope,
	})
}

func (s *Server) issueTokens(w http.ResponseWriter, clientID string, userID int64, scope, nonce string, withRefresh bool) {
	access, err := s.Signer.Mint(Claims{
		Issuer: s.Issuer, Subject: userID, Audience: clientID,
		Scope: scope, TTL: s.AccessTTL, Kind: "access",
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "không ký được token")
		return
	}
	resp := tokenResponse{
		AccessToken: access, TokenType: "Bearer",
		ExpiresIn: int(s.AccessTTL.Seconds()), Scope: scope,
	}
	if strings.Contains(scope, "openid") {
		idTok, err := s.Signer.Mint(Claims{
			Issuer: s.Issuer, Subject: userID, Audience: clientID,
			Nonce: nonce, TTL: s.AccessTTL, Kind: "id",
		})
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "server_error", "không ký được id_token")
			return
		}
		resp.IDToken = idTok
	}
	if withRefresh {
		rt, err := s.Store.IssueRefreshToken(context.Background(), clientID, userID, scope, s.RefreshTTL)
		if err != nil {
			s.Log.Error("cap refresh token", "err", err)
		} else {
			resp.RefreshToken = rt
		}
	}
	httpx.JSON(w, http.StatusOK, resp)
}

// bearerToken doc access token tu header Authorization.
func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if len(h) > 7 && strings.EqualFold(h[:7], "bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return ""
}

// UserInfo tra ve thong tin nguoi dung theo access token.
func (s *Server) UserInfo(w http.ResponseWriter, r *http.Request) {
	tok := bearerToken(r)
	if tok == "" {
		w.Header().Set("WWW-Authenticate", `Bearer realm="id"`)
		httpx.Error(w, http.StatusUnauthorized, "invalid_token", "thiếu access token")
		return
	}
	// Audience khong biet truoc o day, nen giai ma khong rang buoc aud roi kiem tra
	// bang cach doc lai client tu claim. Don gian hon: chap nhan moi aud da ky boi ta.
	uid, scope, err := s.verifyAnyAudience(tok)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid_token", "access token không hợp lệ")
		return
	}
	u, err := s.Users.ByID(r.Context(), uid)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid_token", "người dùng không tồn tại")
		return
	}
	out := map[string]any{"sub": u.Username, "uid": u.ID, "preferred_username": u.Username}
	if strings.Contains(scope, "profile") && u.Email.Valid {
		out["email"] = u.Email.String
	}
	httpx.JSON(w, http.StatusOK, out)
}

// verifyAnyAudience xac minh token ma khong rang buoc audience cu the.
func (s *Server) verifyAnyAudience(tok string) (int64, string, error) {
	parts := strings.Split(tok, ".")
	if len(parts) != 3 {
		return 0, "", errors.New("token khong dung dinh dang")
	}
	// Thu voi tung client dang hoat dong se ton truy van; thay vao do dung Verify
	// voi audience rong bang cach bo qua kiem tra aud o day va dua no ve cho goi.
	return s.Signer.verifyNoAudience(tok, s.Issuer, "access")
}

// Logout huy phien va dua nguoi dung ve mot trang, khong tra JSON.
//
// Huy MOI phien cua nguoi dung chu khong chi phien tren domain nay. Ly do: Adapter
// (haitac.<domain>) giu phien rieng cua no trong CHINH bang `sessions` nay va chi kiem
// `revoked_at IS NULL`. Neu chi huy phien cua he thong ID thi:
//
//   - Bam "Thoat" xong, vao lai game van vao thang duoc bang cookie cu (da gap that).
//   - Nang hon: nguoi khac dang nhap tren cung may van tiep tuc CHOI BANG TAI KHOAN TRUOC
//     do — vi `/choi-game` chi nhin cookie cua chinh no, khong bao gio hoi lai he thong ID.
//     Da gap that: hai tai khoan ID nhung chi mot danh tinh game, va phien duoc phuc vu la
//     cua nguoi dang nhap TRUOC.
//
// Tra ve JSON nhu truoc day cung la mot loi: `shell.html` tro thang vao day nen nguoi dung
// bam "Thoat" thi nhan duoc `{"status":"logged_out"}` giua man hinh.
func (s *Server) Logout(w http.ResponseWriter, r *http.Request) {
	if sid := identity.CookieValue(r, s.CookieSecur); sid != "" {
		if sess, err := s.Sessions.Get(r.Context(), sid); err == nil {
			_ = s.Sessions.RevokeAllForUser(r.Context(), sess.UserID)
		} else {
			// Phien da het han/thu hoi: van huy dung no cho chac.
			_ = s.Sessions.Revoke(r.Context(), sid)
		}
	}
	identity.ClearCookie(w, s.CookieSecur)
	http.Redirect(w, r, s.postLogoutTarget(r), http.StatusFound)
}

// postLogoutTarget chon dia chi tra nguoi dung ve sau khi dang xuat.
//
// Thu tu: khong co tham so -> trang chu cua chinh he thong ID; duong dan tuong doi cung
// site -> cho qua; dia chi tuyet doi -> CHI cho qua khi khop tuyet doi voi mot dia chi da
// dang ky cua client (`oauth_clients.post_logout_uris`). Moi truong hop khac deu ve "/"
// kem mot dong canh bao — khong bao gio chuyen tiep den noi chua dang ky.
func (s *Server) postLogoutTarget(r *http.Request) string {
	raw := r.URL.Query().Get("post_logout_redirect_uri")
	if raw == "" {
		return "/"
	}
	// Duong dan tuong doi cung site. Chan "//host" va "/\host" vi trinh duyet hieu chung
	// la dia chi tuyet doi (protocol-relative) — do la loi open redirect kinh dien.
	if strings.HasPrefix(raw, "/") && !strings.HasPrefix(raw, "//") && !strings.HasPrefix(raw, "/\\") {
		return raw
	}
	if cid := r.URL.Query().Get("client_id"); cid != "" && s.Store != nil {
		if c, err := s.Store.Client(r.Context(), cid); err == nil && c.AllowsPostLogout(raw) {
			return raw
		}
	}
	if s.Log != nil {
		s.Log.Warn("post_logout_redirect_uri khong nam trong danh sach dang ky; ve trang chu",
			"uri", raw, "client_id", r.URL.Query().Get("client_id"))
	}
	return "/"
}

// Health cho healthcheck cua Docker.
func (s *Server) Health(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := db.PingContext(ctx); err != nil {
			httpx.JSON(w, http.StatusServiceUnavailable, map[string]string{"status": "db_down"})
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}
