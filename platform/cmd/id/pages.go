package main

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/identity"
)

// Cac trang huong nguoi choi. Chung dung chung tien trinh voi OIDC provider vi he
// thong con nho; nginx dinh tuyen domain.com va id.domain.com ve cung dich vu nay.
// Tach thanh tien trinh rieng luc nao cung duoc, khong doi gi ben trong.

type gameCard struct {
	Code    string
	Name    string
	SiteURL string
}

type histRow struct {
	At        string
	KindLabel string
	Memo      string
	Amount    int64
	AmountFmt string
}

// formatXu chen dau cham phan cach hang nghin: 1234567 -> "1.234.567".
func formatXu(n int64) string {
	neg := n < 0
	if neg {
		n = -n
	}
	s := strconv.FormatInt(n, 10)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte('.')
		}
		b.WriteRune(c)
	}
	if neg {
		return "-" + b.String()
	}
	return b.String()
}

func kindLabel(k string) string {
	switch k {
	case "topup":
		return "Nạp tiền"
	case "convert":
		return "Quy đổi"
	case "refund":
		return "Hoàn tiền"
	default:
		return "Điều chỉnh"
	}
}

// userForPage tra ve nguoi dung hien tai (nil neu chua dang nhap) de template dung.
func (a *apiServer) userForPage(r *http.Request) *identity.User {
	uid, ok := a.currentUser(r)
	if !ok {
		return nil
	}
	u, err := a.users.ByID(r.Context(), uid)
	if err != nil {
		return nil
	}
	return u
}

// portal la trang chu (ban Go cu): danh sach game dang mo. Dang ky voi pattern "/{$}" (hoac
// "/cu/{$}" khi ID_SPA=1) nen chi khop dung duong dan goc; duong khac do mux tra 404.
func (s *pageServer) portal(w http.ResponseWriter, r *http.Request) {
	var games []gameCard
	rows, err := s.api.db.QueryContext(r.Context(),
		`SELECT code, name, COALESCE(site_url,'') FROM games WHERE status='active' ORDER BY sort_order, code`)
	if err == nil {
		defer func() { _ = rows.Close() }()
		for rows.Next() {
			var g gameCard
			if err := rows.Scan(&g.Code, &g.Name, &g.SiteURL); err == nil {
				games = append(games, g)
			}
		}
	} else {
		s.api.log.Error("doc danh sach game", "err", err)
	}
	s.render(w, "portal.html", map[string]any{
		"User": s.api.userForPage(r), "Games": games,
	})
}

func (s *pageServer) registerPage(w http.ResponseWriter, r *http.Request) {
	if u := s.api.userForPage(r); u != nil {
		http.Redirect(w, r, "/tai-khoan", http.StatusFound)
		return
	}
	s.render(w, "register.html", map[string]any{"User": nil})
}

func (s *pageServer) accountPage(w http.ResponseWriter, r *http.Request) {
	u := s.api.userForPage(r)
	if u == nil {
		http.Redirect(w, r, "/dang-ky", http.StatusFound)
		return
	}
	ctx := r.Context()
	bal, err := s.api.wallet.Balance(ctx, u.ID)
	if err != nil {
		s.api.log.Error("doc so du", "err", err)
	}
	items, err := s.api.wallet.History(ctx, u.ID, 30)
	if err != nil {
		s.api.log.Error("doc lich su", "err", err)
	}
	rows := make([]histRow, 0, len(items))
	for _, e := range items {
		rows = append(rows, histRow{
			At: e.At, KindLabel: kindLabel(e.Kind), Memo: e.Memo.String,
			Amount: e.Amount, AmountFmt: formatXu(e.Amount),
		})
	}
	s.render(w, "account.html", map[string]any{
		"User": u, "BalanceFmt": formatXu(bal), "History": rows,
		"JoinedAt": u.CreatedAt.Format("02/01/2006"),
	})
}

// changePassword doi mat khau roi thu hoi moi phien khac.
//
// Thu hoi la phan quan trong: doi mat khau vi nghi bi chiem tai khoan ma phien cu van
// song thi khong giai quyet duoc gi.
func (a *apiServer) changePassword(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	var in struct {
		Old string `json:"old_password"`
		New string `json:"new_password"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "dữ liệu không đọc được")
		return
	}
	if err := a.users.ChangePassword(r.Context(), uid, in.Old, in.New); err != nil {
		switch {
		case errors.Is(err, identity.ErrWrongPassword):
			httpx.Error(w, http.StatusForbidden, "wrong_password", "Mật khẩu hiện tại không đúng.")
		default:
			httpx.Error(w, http.StatusBadRequest, "invalid_request", err.Error())
		}
		return
	}
	// Giu lai phien hien tai, thu hoi cac phien khac.
	current := identity.CookieValue(r, a.secure)
	if _, err := a.sessions.DB.ExecContext(r.Context(),
		`UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND id <> ? AND revoked_at IS NULL`,
		uid, current); err != nil {
		a.log.Warn("thu hoi phien khac", "err", err)
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// ---------------------------------------------------------------- quen mat khau

func (s *pageServer) forgotPage(w http.ResponseWriter, r *http.Request) {
	s.render(w, "forgot.html", map[string]any{
		"User": nil, "Enabled": s.api.mail.Enabled(),
	})
}

func (s *pageServer) resetPage(w http.ResponseWriter, r *http.Request) {
	tok := r.URL.Query().Get("token")
	s.render(w, "reset.html", map[string]any{
		"User": nil, "Token": tok, "Valid": s.api.resets.Valid(r.Context(), tok),
	})
}

// forgotPassword nhan email va gui lien ket dat lai.
//
// LUON tra ve cung mot phan hoi du email co ton tai hay khong. Tra loi khac nhau bien
// endpoint nay thanh cong cu do xem dia chi nao da dang ky.
func (a *apiServer) forgotPassword(w http.ResponseWriter, r *http.Request) {
	if !a.mail.Enabled() {
		httpx.Error(w, http.StatusServiceUnavailable, "not_configured",
			"Chức năng khôi phục mật khẩu chưa được bật.")
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

	// Phan hoi chung cho MOI truong hop.
	same := func() {
		httpx.JSON(w, http.StatusOK, map[string]string{
			"message": "Nếu địa chỉ này đã đăng ký, chúng tôi vừa gửi liên kết đặt lại mật khẩu.",
		})
	}
	if email == "" {
		same()
		return
	}

	ctx := r.Context()
	u, err := a.users.ByEmail(ctx, email)
	if err != nil {
		// Khong noi la khong tim thay.
		a.log.Info("quen mat khau: email chua dang ky", "ip", httpx.ClientIP(r))
		same()
		return
	}
	tok, err := a.resets.Create(ctx, u.ID, httpx.ClientIP(r))
	if err != nil {
		// Ke ca khi bi chan vi gui qua day, van tra loi giong het.
		if !errors.Is(err, identity.ErrResetTooOften) {
			a.log.Error("tao phieu dat lai", "err", err, "user", u.ID)
		}
		same()
		return
	}

	link := strings.TrimRight(a.publicURL, "/") + "/dat-lai-mat-khau?token=" + url.QueryEscape(tok)
	body := fmt.Sprintf(`Xin chào %s,

Có yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Mở liên kết dưới đây để đặt mật khẩu mới:

%s

Liên kết có hiệu lực trong %d phút và chỉ dùng được một lần.

Nếu bạn không yêu cầu việc này, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.
`, u.Username, link, int(identity.ResetTTL.Minutes()))

	if err := a.mail.Send(email, "Đặt lại mật khẩu", body); err != nil {
		a.log.Error("gui email dat lai mat khau", "err", err, "user", u.ID)
	}
	same()
}

// resetPassword dat mat khau moi bang ma trong email.
func (a *apiServer) resetPassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := decodeJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "dữ liệu không đọc được")
		return
	}
	if err := identity.ValidatePassword(in.NewPassword); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	ctx := r.Context()

	// Tieu ma TRUOC khi doi mat khau: neu doi truoc roi tieu that bai, ma van dung
	// duoc mot lan nua.
	uid, err := a.resets.Consume(ctx, in.Token)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_token", identity.ErrResetInvalid.Error())
		return
	}
	if err := a.users.SetPassword(ctx, uid, in.NewPassword); err != nil {
		a.log.Error("dat mat khau moi", "err", err, "user", uid)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đổi được mật khẩu.")
		return
	}

	// Doi mat khau vi nghi bi chiem tai khoan ma phien cu van song thi khong giai quyet
	// duoc gi: thu hoi MOI phien va MOI refresh token cua nguoi nay.
	if err := a.sessions.RevokeAllForUser(ctx, uid); err != nil {
		a.log.Warn("thu hoi phien sau khi dat lai mat khau", "err", err)
	}
	if _, err := a.db.ExecContext(ctx,
		`UPDATE oauth_refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`,
		uid); err != nil {
		a.log.Warn("thu hoi refresh token sau khi dat lai mat khau", "err", err)
	}
	a.log.Info("da dat lai mat khau", "user", uid, "ip", httpx.ClientIP(r))
	httpx.JSON(w, http.StatusOK, map[string]string{
		"message": "Đã đổi mật khẩu. Vui lòng đăng nhập lại.",
	})
}
