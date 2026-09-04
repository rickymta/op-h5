package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"html/template"
	"io"
	"log/slog"
	"net/http"

	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/identity"
	"github.com/rickymta/op-h5/platform/internal/mail"
	"github.com/rickymta/op-h5/platform/internal/wallet"
)

// apiServer phuc vu cac endpoint JSON cho trang tai khoan cua nguoi choi.
type apiServer struct {
	db       *sql.DB
	users    *identity.Repo
	sessions *identity.Sessions
	wallet   *wallet.Service
	log      *slog.Logger
	secure   bool
	// internalSecret ky cac lenh nap tien tu tang PHP. Rong = tat endpoint do.
	internalSecret string
	resets         *identity.Resets
	mail           *mail.Sender
	// publicURL dung de dung lien ket trong email.
	publicURL string
}

// decodeJSON doc than request JSON voi gioi han kich thuoc.
func decodeJSON(w http.ResponseWriter, r *http.Request, out any) error {
	return json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(out)
}

// pageServer phuc vu cac trang HTML huong nguoi choi.
type pageServer struct {
	api *apiServer
	tpl *template.Template
}

func (s *pageServer) render(w http.ResponseWriter, name string, data any) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := s.tpl.ExecuteTemplate(w, name, data); err != nil {
		s.api.log.Error("render", "tpl", name, "err", err)
	}
}

// currentUser lay nguoi dung tu cookie phien.
func (a *apiServer) currentUser(r *http.Request) (int64, bool) {
	sess, err := a.sessions.Get(r.Context(), identity.CookieValue(r, a.secure))
	if err != nil {
		return 0, false
	}
	return sess.UserID, true
}

func (a *apiServer) register(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Email    string `json:"email"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "dữ liệu không đọc được")
		return
	}
	ip := httpx.ClientIP(r)
	id, err := a.users.Create(r.Context(), in.Username, in.Email, in.Password, ip)
	if err != nil {
		switch {
		case errors.Is(err, identity.ErrUsernameTaken):
			httpx.Error(w, http.StatusConflict, "username_taken", "Tài khoản đã được sử dụng.")
		case errors.Is(err, identity.ErrEmailTaken):
			httpx.Error(w, http.StatusConflict, "email_taken", "Email đã được sử dụng.")
		default:
			// Loi kiem tra dau vao co thong bao doc duoc, tra thang cho nguoi dung.
			httpx.Error(w, http.StatusBadRequest, "invalid_request", err.Error())
		}
		return
	}
	sid, err := a.sessions.Create(r.Context(), id, ip, r.UserAgent())
	if err != nil {
		a.log.Error("tao phien sau dang ky", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Có lỗi xảy ra.")
		return
	}
	identity.SetCookie(w, sid, a.secure, a.sessions.TTL)
	httpx.JSON(w, http.StatusCreated, map[string]any{"id": id, "username": in.Username})
}

func (a *apiServer) me(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	u, err := a.users.ByID(r.Context(), uid)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Phiên không hợp lệ.")
		return
	}
	out := map[string]any{"id": u.ID, "username": u.Username, "created_at": u.CreatedAt}
	if u.Email.Valid {
		out["email"] = u.Email.String
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (a *apiServer) balance(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	bal, err := a.wallet.Balance(r.Context(), uid)
	if err != nil {
		a.log.Error("doc so du", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được số dư.")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"currency": "XU", "balance": bal})
}

func (a *apiServer) history(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	items, err := a.wallet.History(r.Context(), uid, 50)
	if err != nil {
		a.log.Error("doc lich su", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được lịch sử.")
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, e := range items {
		row := map[string]any{"txn": e.TxnID, "kind": e.Kind, "amount": e.Amount, "at": e.At}
		if e.Memo.Valid {
			row["memo"] = e.Memo.String
		}
		out = append(out, row)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"items": out})
}

// ---------------------------------------------------------------- nap tien noi bo

// internalTopup nhan lenh nap tien tu cac callback cong thanh toan o tang PHP.
//
// Vi sao khong viet lai tich hop the cao / bank / MoMo o day: chung dang chay o tang
// PHP voi API key va chu ky that cua nha cung cap. Viet lai nghia la chuyen ca phan
// rui ro nhat sang ma moi chua chay ngay nao. Thay vao do PHP giu nguyen phan doi
// thoai voi nha cung cap, va khi nha cung cap da xac nhan thi goi endpoint nay de
// tien vao so cai.
//
// Xac thuc bang HMAC tren than request (xem internal/wallet/internalapi.go), khong
// phai token nguoi dung: ben goi la tien trinh server, khong co ai dang nhap.
func (a *apiServer) internalTopup(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 8<<10))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "không đọc được dữ liệu")
		return
	}
	if err := wallet.VerifySignature(a.internalSecret,
		r.Header.Get("X-Timestamp"), r.Header.Get("X-Signature"), body); err != nil {
		switch {
		case errors.Is(err, wallet.ErrNotConfigured):
			httpx.Error(w, http.StatusServiceUnavailable, "not_configured",
				"API nạp tiền nội bộ chưa được cấu hình (ID_INTERNAL_SECRET).")
		default:
			// Khong noi ro sai o dau: chu ky sai hay timestamp lech deu la "khong hop le".
			a.log.Warn("nap tien noi bo: xac thuc that bai", "err", err, "ip", httpx.ClientIP(r))
			httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chữ ký không hợp lệ.")
		}
		return
	}

	var in struct {
		Username  string `json:"username"`
		UserID    int64  `json:"user_id"`
		Amount    int64  `json:"amount"`
		IdemKey   string `json:"idempotency_key"`
		Reference string `json:"reference"`
		Memo      string `json:"memo"`
	}
	if err := json.Unmarshal(body, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "JSON không hợp lệ")
		return
	}
	if in.Amount <= 0 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "amount phải lớn hơn 0")
		return
	}
	if in.IdemKey == "" {
		// Bat buoc: khong co khoa nay thi callback ban lai se cong tien hai lan.
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "thiếu idempotency_key")
		return
	}

	ctx := r.Context()
	uid := in.UserID
	if uid == 0 {
		u, err := a.users.ByUsername(ctx, in.Username)
		if err != nil {
			httpx.Error(w, http.StatusNotFound, "user_not_found", "Không tìm thấy tài khoản.")
			return
		}
		uid = u.ID
	}

	txn, err := a.wallet.Topup(ctx, uid, in.Amount, in.IdemKey, in.Reference, in.Memo)
	if err != nil {
		a.log.Error("nap tien noi bo", "err", err, "user", uid)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được giao dịch.")
		return
	}
	bal, _ := a.wallet.Balance(ctx, uid)
	a.log.Info("nap tien noi bo", "user", uid, "amount", in.Amount, "txn", txn, "ref", in.Reference)
	httpx.JSON(w, http.StatusOK, map[string]any{"txn": txn, "user_id": uid, "balance": bal})
}
