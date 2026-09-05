package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
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
	tpl        *template.Template
	publicHost string
	useTLS     bool
	// sessionLimit chan bam lien tuc vao /api/game/session, khoa theo nguoi dung.
	sessionLimit *httpx.Limiter
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
	if uid, ok := s.currentUser(r); ok {
		if d, blocked := s.tooFullForNewSession(r.Context(), uid); blocked {
			s.renderFull(w, r, d)
			return
		}
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
	// Moi luot goi deu dang nhap login server va giu mot cho. Ve da khoa theo nguoi nen
	// khong con dem trung, nhung so luot goi thi van can chan: mot client thu lai vong
	// lap se dap thang vao cum Java.
	if !s.sessionLimit.Allow(strconv.FormatInt(uid, 10)) {
		s.log.Warn("cap phien: qua tan suat", "user", uid)
		httpx.JSON(w, http.StatusTooManyRequests, map[string]any{
			"error":   "rate_limited",
			"message": "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít giây.",
		})
		return
	}

	var in sessionRequest
	_ = json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in)

	ctx := r.Context()
	d, sess, err := s.admit(ctx, uid, in)
	if err != nil {
		s.log.Error("cap phien game", "err", err, "user", uid)
		httpx.Error(w, http.StatusBadGateway, "game_unavailable", "Máy chủ game đang bận, thử lại sau.")
		return
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

	// Khong co srv_code (nguoi cu tu chon may chu cua nhan vat) thi khong hoi dia chi
	// tien trinh game — ta chua biet ho se vao may nao.
	var wsURL string
	if d.SrvCode != "" {
		np, npErr := s.login.ConnectTarget(ctx, d.SrvCode)
		if npErr != nil {
			s.log.Error("hoi dia chi tien trinh game", "err", npErr, "srv", d.SrvCode)
			httpx.Error(w, http.StatusBadGateway, "game_unavailable", "Máy chủ game đang bận, thử lại sau.")
			return
		}
		wsURL = np.WebSocketURL(s.publicHost, s.useTLS)
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"token":         sess.Token,
		"account_uid":   sess.Account.UID,
		"game_username": sess.Account.Username,
		"srv_code":      d.SrvCode,
		"ws_url":        wsURL,
		"band":          d.Band.String(),
		"warn":          d.Warn,
		"alternatives":  d.Alternatives,
		// `data` cua login server, da luoc `account.password` (xem redactLoginData).
		"login_data": redactLoginData(sess.Raw, s.log),
	})
}

// admit quyet dinh cho vao hay khong, va duc phien khi duoc cho vao.
//
// Ba nhanh, khac nhau o CHO nao duc phien so voi cho nao xet dai:
//
//  1. Client noi ro may chu: dai nguoi CU cho dung may chu do.
//  2. Chua tung co tai khoan game: chac chan la nguoi MOI, xet dai TRUOC khi duc phien.
//     Duc truoc roi moi tu choi se de lai mot tai khoan game cho nguoi khong vao duoc,
//     va lan sau chinh tai khoan do lam ho trong nhu nguoi cu — cong bien thanh loai
//     dung mot lan.
//  3. Da tung dang nhap game: phai duc phien truoc, vi chi phan hoi cua login server
//     moi cho biet ho da co nhan vat chua, ma dieu do quyet dinh ap dai nao.
//
// Phai tach dai nguoi MOI khoi dai nguoi CU: "con cho cho nguoi moi" chi tinh dai Muot,
// con nguoi cu vao duoc ca khi may chu dang Dong. Gop lam mot se chan nguoi cu khoi
// chinh may chu co nhan vat cua ho.
//
// Nhanh 1 va 2 giu ve truoc khi duc phien, nen neu login server hong thi mot ve bi phi.
// Ve tu het han sau TicketTTL; danh doi nay re hon nhieu so voi de lai tai khoan game
// mo coi o nhanh 2.
func (s *adapterServer) admit(ctx context.Context, uid int64, in sessionRequest) (capacity.Decision, *gameacct.AccountSession, error) {
	mint := func(d capacity.Decision) (capacity.Decision, *gameacct.AccountSession, error) {
		if !d.Allowed {
			return d, nil, nil
		}
		sess, err := s.mapper.Session(ctx, uid, in.ClientType)
		if err != nil {
			// Da giu cho o tren nhung khong vao duoc: tra lai ngay. Giu mot cho khong ai
			// dung se chan nham nguoi khac cho den khi ve het han.
			s.tracker.Release(uid)
			return d, nil, err
		}
		return d, sess, nil
	}

	if in.SrvCode != "" {
		return mint(s.tracker.AdmitReturning(uid, in.SrvCode))
	}
	// Loi tra cuu thi di tiep bang nhanh 3 (duc phien roi doc masterList): chinh xac hon,
	// chi ton them mot lan goi login server.
	if _, found, err := s.mapper.Lookup(ctx, uid); err == nil && !found {
		return mint(s.tracker.AdmitNew(uid))
	}

	sess, err := s.mapper.Session(ctx, uid, in.ClientType)
	if err != nil {
		return capacity.Decision{}, nil, err
	}
	if codes := sess.ServerCodes(); len(codes) > 0 {
		// Biet ho choi o dau: xet dai nguoi CU cho chinh may chu do va giu ve o do.
		// Nhieu nhan vat thi lay may chu dau tien cho vao duoc — client van co quyen
		// chon khac, nhung phan lon nguoi choi di theo goi y.
		var last capacity.Decision
		for _, code := range codes {
			last = s.tracker.AdmitReturning(uid, code)
			if last.Allowed {
				return last, sess, nil
			}
		}
		// May chu cua ho dang day/bao tri: bao dung ly do do, khong doi thanh
		// "het cho cho nguoi moi" — hai chuyen khac nhau va cach xu ly cung khac.
		return last, sess, nil
	}
	if sess.HasCharacters() {
		// Co nhan vat nhung khong doc duoc may chu (khuon masterList khac du doan).
		// Cho vao, khong giu ve, khong tra srv_code — de client tu chon nhu truoc khi
		// co lop nay. Dan nguoi choi sang may chu khac voi nhan vat cua ho te hon nhieu
		// so voi viec dem thieu mot nguoi.
		s.log.Warn("khong doc duoc may chu tu masterList; de client tu chon", "user", uid)
		return capacity.Decision{Allowed: true, Reason: capacity.ReasonOK}, sess, nil
	}
	return s.tracker.AdmitNew(uid), sess, nil
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
// (danh muc, trang cua hang va duong mua trong game nam o store.go)

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
		case errors.Is(err, wallet.ErrRoleRequired):
			httpx.Error(w, http.StatusBadRequest, "role_required", "Gói này gửi qua thư, hãy chọn nhân vật nhận.")
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

// tooFullForNewSession xem co con cho khong, KHONG giu cho.
//
// Bat buoc chi doc: `/api/game/session` moi la noi giu ve. Neu o day cung giu thi moi
// nguoi choi bi dem hai lan va cong tu that chat gap doi so voi nguong da cau hinh.
//
// Khi chua doc duoc so lieu (danh sach server rong — login server chet, hoac vua khoi
// dong) thi CHO QUA. Chan o trang thai khong biet gi se lam ca game sap chi vi mot truc
// trac giam sat; con neu that su khong vao duoc thi `/api/game/session` van chan o sau.
func (s *adapterServer) tooFullForNewSession(ctx context.Context, uid int64) (capacity.Decision, bool) {
	f := s.tracker.Fleet()
	if f == nil || len(f.Servers) == 0 {
		return capacity.Decision{}, false
	}
	d := f.AdmitNew()
	if d.Allowed {
		return d, false
	}

	// Het cho cho nguoi MOI khong co nghia la het cho cho tat ca: dai "Dong" tu choi
	// nguoi moi nhung van nhan nguoi cu ve dung may chu co nhan vat cua ho. Chan ho o
	// day la chan khoi chinh nhan vat cua ho.
	//
	// Chua co anh xa tai khoan game = chua tung dang nhap game = chac chan la nguoi moi.
	// Da co thi de qua; /api/game/session doc masterList tu login server roi quyet dinh
	// chinh xac, va neu ho that su la nguoi moi thi bi tu choi o do.
	//
	// Loi khi tra cuu cung CHO QUA: mot truc trac DB khong duoc bien thanh "khong ai
	// vao duoc game".
	id, found, err := s.mapper.Lookup(ctx, uid)
	if err != nil {
		s.log.Warn("tra cuu anh xa tai khoan game that bai", "err", err, "user", uid)
		return capacity.Decision{}, false
	}
	if found && id.AccountUID.Valid {
		return capacity.Decision{}, false
	}
	return d, true
}

// renderFull hien trang "dang qua tai" thay vi day nguoi choi vao client, noi ho chi
// gap lai man hinh dang nhap cu ma khong hieu tai sao.
func (s *adapterServer) renderFull(w http.ResponseWriter, r *http.Request, d capacity.Decision) {
	// Hien trang thai THAT cua ca doi may chu, khong phai Decision.Alternatives:
	// AdmitNew chi dien Alternatives khi CHO VAO, con luc tu choi thi truong do luon
	// rong (khong con may chu nao nhan nguoi moi — do dung la ly do bi tu choi).
	// Nguoi choi nhin bang trang thai con doan duoc bao gio nen quay lai.
	servers := s.visibleServers()
	s.log.Info("chan o /choi-game", "reason", string(d.Reason), "servers", len(servers))
	// Dat Content-Type TRUOC WriteHeader: sau WriteHeader thi Header().Set khong con
	// tac dung, va render() se khong kip dat -> trinh duyet phai tu doan kieu noi dung.
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusServiceUnavailable)
	s.render(w, "full.html", map[string]any{
		"User": s.username(r), "Message": reasonMessage(d.Reason),
		"Servers": servers, "IDBase": strings.TrimRight(s.cfg.Issuer, "/"),
	})
}

// redactLoginData bo `account.password` truoc khi tra phan hoi cua login server ra ngoai.
//
// Login server THAT tra ve khoa game DANG THO trong `data.account.password`. Truong do
// khong co trong ban gia lap nen den lan chay voi JAR that moi lo ra — va play.php nhung
// thang login_data vao trang, tuc la khoa se nam trong ma nguon HTML.
//
// PHAI NOI RO: viec nay KHONG lam cho khoa game "khong bao gio xuong trinh duyet". Chinh
// JWT trong `data.token` cung mang khoa do (claim `a4`, da giai ma va doi chieu), ma client
// bat buoc phai co token de noi WebSocket. Voi login server nay, khoa game cua mot nguoi
// choi nhat dinh se den duoc trinh duyet cua chinh ho — khong sua duoc o phia ta.
//
// Cai lop Adapter VAN giu duoc: mat khau he thong ID khong bao gio den cum game, va moi
// nguoi chi thay khoa cua chinh minh. Bo truong nay la de khoa khong nam o hai cho.
//
// Hong thi tra ve nguyen ban: tha de thua mot truong con hon lam client mat du lieu no can.
func redactLoginData(raw json.RawMessage, log *slog.Logger) json.RawMessage {
	if len(raw) == 0 {
		return raw
	}
	var m map[string]json.RawMessage
	if err := json.Unmarshal(raw, &m); err != nil {
		return raw
	}
	accRaw, ok := m["account"]
	if !ok {
		return raw
	}
	var acc map[string]json.RawMessage
	if err := json.Unmarshal(accRaw, &acc); err != nil {
		return raw
	}
	if _, had := acc["password"]; !had {
		return raw
	}
	delete(acc, "password")
	newAcc, err := json.Marshal(acc)
	if err != nil {
		log.Warn("khong luoc duoc account.password", "err", err)
		return raw
	}
	m["account"] = newAcc
	out, err := json.Marshal(m)
	if err != nil {
		log.Warn("khong dung lai duoc login_data", "err", err)
		return raw
	}
	return out
}

// connectTarget tra lai dia chi WebSocket cua tien trinh game, DA VIET LAI cho phu hop
// voi mot server chi mo 80/443.
//
// VAN DE: client hoi thang login server `/srv/game/connect/target` va nhan ve
// ws://<host>:8001/game. Cong 8001 khong mo ra Internet duoc, ma cung khong the doi
// `tcg.srv_game.ws_port` thanh 443: cot do vua la cong login CONG BO vua la cong tien
// trinh game BIND vao — dat 443 thi game se tranh cong voi nginx.
//
// CACH GO: nginx tro duong nay vao Adapter thay vi login server. Adapter van hoi login
// server nhu cu (giu nguyen path va cac truong khac), roi chi thay host/port/scheme
// bang dia chi cong khai. nginx nhan wss tren 443 o duong /game roi chuyen tiep vao
// 127.0.0.1:8001. Tien trinh game khong phai doi gi.
func (s *adapterServer) connectTarget(w http.ResponseWriter, r *http.Request) {
	srvCode := r.URL.Query().Get("srvCode")
	if srvCode == "" {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"errorcode": 1, "errormsg": "thiếu srvCode", "data": nil,
		})
		return
	}
	np, err := s.login.ConnectTarget(r.Context(), srvCode)
	if err != nil {
		s.log.Error("hoi dia chi tien trinh game", "err", err, "srv", srvCode)
		// Giu khuon EcResult: client doc `errorcode`, tra HTTP 502 se lam no bao mot loi khac.
		httpx.JSON(w, http.StatusOK, map[string]any{
			"errorcode": 1, "errormsg": "không lấy được địa chỉ máy chủ", "data": nil,
		})
		return
	}

	scheme, port, ssl := "ws", 80, false
	if s.useTLS {
		scheme, port, ssl = "wss", 443, true
	}
	// ADAPTER_PUBLIC_PORT cho moi truong khong dung cong chuan (vi du may dev phuc vu o
	// 8080). Khong doan tu dau khac duoc: Adapter khong nhin thay cong ma trinh duyet da
	// goi vao, va publicHost thi con dung o cho khac nen khong nhet cong vao do duoc.
	if v := os.Getenv("ADAPTER_PUBLIC_PORT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n < 65536 {
			port = n
		} else {
			s.log.Warn("ADAPTER_PUBLIC_PORT khong hop le, bo qua", "gia_tri", v)
		}
	}
	host := s.publicHost
	if host == "" {
		host = np.Host.WAN
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"errorcode": 0,
		"errormsg":  "success",
		"data": map[string]any{
			"scheme": scheme,
			// Ca ba deu la host cong khai: client chon truong nao cung ra dung dia chi.
			"host":    map[string]any{"LAN": host, "WAN": host, "domain": host},
			"port":    port,
			"path":    np.Path,
			"ssl":     ssl,
			"enabled": true,
		},
	})
}
