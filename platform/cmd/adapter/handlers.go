package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/rickymta/op-h5/platform/internal/capacity"
	"github.com/rickymta/op-h5/platform/internal/config"
	"github.com/rickymta/op-h5/platform/internal/console"
	"github.com/rickymta/op-h5/platform/internal/gameacct"
	"github.com/rickymta/op-h5/platform/internal/grants"
	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/wallet"
)

type adapterServer struct {
	cfg        config.Adapter
	rp         *rp
	mapper     *gameacct.Mapper
	tracker    *capacity.Tracker
	login      *gameacct.LoginClient
	wallet     *wallet.Service
	console    *console.Client
	worker     *grants.Worker
	db         *sql.DB
	log        *slog.Logger
	publicHost string
	useTLS     bool
}

const (
	sessionCookie = "haitac_sess"
	flowCookie    = "haitac_flow"
)

// flowState giu state/verifier/nonce giua luc chuyen sang ID va luc quay ve.
// Dat trong cookie ky ngan han thay vi trong bo nho, de adapter khoi dong lai giua
// chung khong lam hong phien dang nhap dang do.
type flowState struct {
	State    string `json:"s"`
	Verifier string `json:"v"`
	Nonce    string `json:"n"`
}

func (s *adapterServer) setCookie(w http.ResponseWriter, name, value string, ttl time.Duration) {
	http.SetCookie(w, &http.Cookie{
		Name: name, Value: value, Path: "/", HttpOnly: true,
		Secure: s.useTLS, SameSite: http.SameSiteLaxMode, MaxAge: int(ttl.Seconds()),
	})
}

func (s *adapterServer) clearCookie(w http.ResponseWriter, name string) {
	http.SetCookie(w, &http.Cookie{
		Name: name, Value: "", Path: "/", HttpOnly: true,
		Secure: s.useTLS, SameSite: http.SameSiteLaxMode, MaxAge: -1,
	})
}

// currentUser doc id nguoi dung tu cookie phien cua trang game.
func (s *adapterServer) currentUser(r *http.Request) (int64, bool) {
	c, err := r.Cookie(sessionCookie)
	if err != nil {
		return 0, false
	}
	var uid int64
	err = s.db.QueryRowContext(r.Context(), `
		SELECT user_id FROM sessions
		 WHERE id = ? AND revoked_at IS NULL AND expires_at > NOW()`, c.Value).Scan(&uid)
	if err != nil {
		return 0, false
	}
	return uid, true
}

// playGame la cua vao: chua dang nhap thi chuyen sang he thong ID.
func (s *adapterServer) playGame(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.currentUser(r); ok {
		http.Redirect(w, r, "/play.php", http.StatusFound)
		return
	}
	ctx := r.Context()
	p, err := newPKCE()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "không tạo được PKCE")
		return
	}
	state, err := randomState()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "không tạo được state")
		return
	}
	nonce, err := randomState()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "không tạo được nonce")
		return
	}
	blob, _ := json.Marshal(flowState{State: state, Verifier: p.Verifier, Nonce: nonce})
	s.setCookie(w, flowCookie, base64.RawURLEncoding.EncodeToString(blob), 10*time.Minute)

	u, err := s.rp.AuthURL(ctx, state, p.Challenge, nonce)
	if err != nil {
		s.log.Error("dung URL uy quyen", "err", err)
		httpx.Error(w, http.StatusBadGateway, "id_unavailable", "Hệ thống tài khoản đang bận, thử lại sau.")
		return
	}
	http.Redirect(w, r, u, http.StatusFound)
}

// authCallback nhan ma uy quyen tu he thong ID.
func (s *adapterServer) authCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	q := r.URL.Query()
	if e := q.Get("error"); e != "" {
		httpx.Error(w, http.StatusBadRequest, e, q.Get("error_description"))
		return
	}

	c, err := r.Cookie(flowCookie)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_state", "Phiên đăng nhập đã hết hạn, vui lòng thử lại.")
		return
	}
	blob, err := base64.RawURLEncoding.DecodeString(c.Value)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_state", "Phiên đăng nhập không hợp lệ.")
		return
	}
	var fs flowState
	if err := json.Unmarshal(blob, &fs); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_state", "Phiên đăng nhập không hợp lệ.")
		return
	}
	// state chong CSRF: khong so khop thi dung lai.
	if q.Get("state") == "" || q.Get("state") != fs.State {
		httpx.Error(w, http.StatusBadRequest, "invalid_state", "state không khớp.")
		return
	}
	s.clearCookie(w, flowCookie)

	ts, err := s.rp.Exchange(ctx, q.Get("code"), fs.Verifier)
	if err != nil {
		s.log.Error("doi token", "err", err)
		httpx.Error(w, http.StatusBadGateway, "exchange_failed", "Không đổi được mã đăng nhập.")
		return
	}
	uid, err := s.rp.VerifyIDToken(ctx, ts.IDToken, fs.Nonce)
	if err != nil {
		s.log.Error("xac minh id_token", "err", err)
		httpx.Error(w, http.StatusUnauthorized, "invalid_token", "Token không hợp lệ.")
		return
	}

	// Dung chung bang sessions voi he thong ID: cung mot DB, va nhu vay thu hoi phien
	// o mot cho la co tac dung o ca hai.
	sid, err := randomState()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không tạo được phiên.")
		return
	}
	if _, err := s.db.ExecContext(ctx, `
		INSERT INTO sessions (id, user_id, ip, user_agent, expires_at)
		VALUES (?,?,NULL,?,DATE_ADD(NOW(), INTERVAL 14 DAY))`,
		sid, uid, truncate(r.UserAgent(), 255)); err != nil {
		s.log.Error("tao phien", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không tạo được phiên.")
		return
	}
	s.setCookie(w, sessionCookie, sid, 14*24*time.Hour)
	http.Redirect(w, r, "/play.php", http.StatusFound)
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

func (s *adapterServer) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(sessionCookie); err == nil {
		_, _ = s.db.ExecContext(r.Context(),
			`UPDATE sessions SET revoked_at = NOW() WHERE id = ?`, c.Value)
	}
	s.clearCookie(w, sessionCookie)
	http.Redirect(w, r, "/", http.StatusFound)
}

type serverView struct {
	Code      string `json:"code"`
	Name      string `json:"name"`
	Band      string `json:"band"`
	Label     string `json:"label"`
	Status    string `json:"status"`
	Recommend bool   `json:"recommend"`
	Online    int    `json:"online"`
	SoftLimit int    `json:"soft_limit"`
}

// listServers tra ve danh sach server kem dai trang thai de client hien "Mượt/Đông/Đầy".
func (s *adapterServer) listServers(w http.ResponseWriter, r *http.Request) {
	f := s.tracker.Fleet()
	out := make([]serverView, 0, len(f.Servers))
	for _, sv := range f.Servers {
		if sv.Status == capacity.StatusClosed {
			continue
		}
		b := sv.Band()
		out = append(out, serverView{
			Code: sv.SrvCode, Name: sv.Name,
			Band: b.String(), Label: b.Label(), Status: string(sv.Status),
			Recommend: sv.AcceptsNew(), Online: sv.Effective(), SoftLimit: sv.SoftLimit,
		})
	}
	online, soft := f.Utilization()
	httpx.JSON(w, http.StatusOK, map[string]any{
		"servers":     out,
		"online":      online,
		"soft_total":  soft,
		"utilization": pct(online, soft),
	})
}

func pct(a, b int) int {
	if b <= 0 {
		return 0
	}
	return a * 100 / b
}

type sessionRequest struct {
	SrvCode    string `json:"srv_code"` // rong = nguoi choi moi, de he thong chon
	ClientType int    `json:"client_type"`
}

// createSession la CONG GIOI HAN TAI.
//
// Moi phien choi moi deu di qua day. Login server tra ve dia chi tien trinh game ma
// khong kiem tra tai, nen quyet dinh phai duoc dua o day, TRUOC khi goi sang no.
func (s *adapterServer) createSession(w http.ResponseWriter, r *http.Request) {
	uid, ok := s.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	var in sessionRequest
	_ = json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in)

	var d capacity.Decision
	if in.SrvCode == "" {
		d = s.tracker.AdmitNew()
	} else {
		d = s.tracker.AdmitReturning(in.SrvCode)
	}
	if !d.Allowed {
		httpx.JSON(w, http.StatusServiceUnavailable, map[string]any{
			"error":        string(d.Reason),
			"message":      reasonMessage(d.Reason),
			"srv_code":     d.SrvCode,
			"band":         d.Band.String(),
			"alternatives": d.Alternatives,
		})
		return
	}
	if d.Warn {
		s.log.Warn("server vuot nguong mem", "srv", d.SrvCode, "band", d.Band.String())
	}

	ctx := r.Context()
	sess, err := s.mapper.Session(ctx, uid, in.ClientType)
	if err != nil {
		s.log.Error("cap phien game", "err", err, "user", uid)
		httpx.Error(w, http.StatusBadGateway, "game_unavailable", "Máy chủ game đang bận, thử lại sau.")
		return
	}
	np, err := s.login.ConnectTarget(ctx, d.SrvCode)
	if err != nil {
		s.log.Error("hoi dia chi tien trinh game", "err", err, "srv", d.SrvCode)
		httpx.Error(w, http.StatusBadGateway, "game_unavailable", "Máy chủ game đang bận, thử lại sau.")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"token":        sess.Token,
		"account_uid":  sess.Account.UID,
		"srv_code":     d.SrvCode,
		"ws_url":       np.WebSocketURL(s.publicHost, s.useTLS),
		"band":         d.Band.String(),
		"warn":         d.Warn,
		"alternatives": d.Alternatives,
	})
}

func reasonMessage(r capacity.Reason) string {
	switch r {
	case capacity.ReasonServerFull:
		return "Máy chủ đang đầy. Vui lòng chọn máy chủ khác hoặc quay lại sau."
	case capacity.ReasonDeviceFull:
		return "Cụm máy chủ này đang đầy. Vui lòng chọn máy chủ khác."
	case capacity.ReasonServerMaintain:
		return "Máy chủ đang bảo trì."
	case capacity.ReasonServerClosed:
		return "Máy chủ đã đóng."
	case capacity.ReasonNoServerForNew:
		return "Hiện chưa có máy chủ nào nhận người chơi mới. Vui lòng quay lại sau."
	default:
		return "Không vào được máy chủ."
	}
}

func (s *adapterServer) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	if err := s.db.PingContext(ctx); err != nil {
		httpx.JSON(w, http.StatusServiceUnavailable, map[string]string{"status": "db_down"})
		return
	}
	if err := s.login.Ping(ctx); err != nil {
		httpx.JSON(w, http.StatusServiceUnavailable, map[string]string{"status": "login_down"})
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// ---------------------------------------------------------------- quy doi Xu -> vat pham

type packageView struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	PriceXu   int64  `json:"price_xu"`
	ItemName  string `json:"item_name"`
	ItemCount int    `json:"item_count"`
}

// listPackages tra ve bang gia cua game nay.
func (s *adapterServer) listPackages(w http.ResponseWriter, r *http.Request) {
	pkgs, err := s.wallet.Packages(r.Context(), s.cfg.GameCode)
	if err != nil {
		s.log.Error("doc bang gia", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được bảng giá.")
		return
	}
	out := make([]packageView, 0, len(pkgs))
	for _, p := range pkgs {
		out = append(out, packageView{
			ID: p.ID, Name: p.Name, PriceXu: p.PriceXu,
			ItemName: p.ItemName, ItemCount: p.ItemCount,
		})
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"packages": out})
}

type convertRequest struct {
	PackageID string `json:"package_id"`
	SrvCode   string `json:"srv_code"`
	RoleID    string `json:"role_id"`
	// IdemKey cho phep client thu lai an toan sau khi mat mang: goi lai voi cung
	// khoa se tra ve dung giao dich cu chu khong tru them lan nua.
	IdemKey string `json:"idempotency_key"`
}

// convert tru Xu trong vi ID va xep mot lenh phat hang.
//
// KHONG nhan so tien tu client: gia lay tu bang game_packages. Ham nay chi ghi lenh,
// viec goi console do tien trinh nen lam — mat ket noi giua chung chi lam cham chu
// khong lam mat tien.
func (s *adapterServer) convert(w http.ResponseWriter, r *http.Request) {
	uid, ok := s.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	var in convertRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được.")
		return
	}
	if in.PackageID == "" || in.SrvCode == "" {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Thiếu gói hoặc máy chủ.")
		return
	}
	if len(in.IdemKey) > 100 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "idempotency_key quá dài.")
		return
	}

	ctx := r.Context()
	// Can accountUid de console biet phat cho tai khoan nao trong game.
	id, _, err := s.mapper.Ensure(ctx, uid)
	if err != nil {
		s.log.Error("tra cuu tai khoan game", "err", err, "user", uid)
		httpx.Error(w, http.StatusBadGateway, "game_unavailable", "Máy chủ game đang bận, thử lại sau.")
		return
	}
	if !id.AccountUID.Valid || id.AccountUID.String == "" {
		httpx.Error(w, http.StatusConflict, "no_game_account",
			"Hãy vào game một lần trước khi quy đổi.")
		return
	}

	// Khoa mac dinh gan voi (user, goi, server, role) trong cung mot phut, de nguoi
	// choi bam hai lan vi sot ruot khong bi tru hai lan.
	idem := in.IdemKey
	if idem == "" {
		idem = fmt.Sprintf("conv-%d-%s-%s-%s-%d", uid, s.cfg.GameCode, in.SrvCode,
			in.PackageID, time.Now().Unix()/60)
	} else {
		idem = fmt.Sprintf("conv-%d-%s", uid, idem)
	}

	txn, err := s.wallet.Convert(ctx, wallet.ConvertInput{
		UserID: uid, GameCode: s.cfg.GameCode, SrvCode: in.SrvCode,
		RoleID: in.RoleID, AccountUID: id.AccountUID.String,
		PackageID: in.PackageID, IdemKey: idem,
	})
	if err != nil {
		switch {
		case errors.Is(err, wallet.ErrInsufficient):
			httpx.Error(w, http.StatusPaymentRequired, "insufficient", "Số dư không đủ.")
		case errors.Is(err, wallet.ErrPackageUnknown):
			httpx.Error(w, http.StatusNotFound, "unknown_package", "Gói quy đổi không tồn tại.")
		default:
			s.log.Error("quy doi", "err", err, "user", uid)
			httpx.Error(w, http.StatusInternalServerError, "server_error", "Không thực hiện được.")
		}
		return
	}

	// Chay ngay mot vong phat hang de nguoi choi khong phai doi het chu ky. That bai
	// o day khong sao: lenh van nam trong bang va se duoc thu lai.
	go func() {
		bg, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if _, err := s.worker.Tick(bg); err != nil {
			s.log.Warn("phat hang ngay sau quy doi that bai", "err", err)
		}
	}()

	bal, _ := s.wallet.Balance(ctx, uid)
	httpx.JSON(w, http.StatusOK, map[string]any{
		"txn": txn, "balance": bal,
		"message": "Đã trừ Xu. Vật phẩm sẽ vào hòm thư trong ít phút.",
	})
}
