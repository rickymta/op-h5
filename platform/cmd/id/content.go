package main

// Vi (tong hop), don mua o moi game, va trang noi dung tinh cua cong.
// Hop dong dot 3 muc 3.2 va 3.3.

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/rickymta/op-h5/platform/internal/catalog"
	"github.com/rickymta/op-h5/platform/internal/httpx"
)

// walletSummary: so lieu cho bon o thong ke va dong "Thanh vien tu ..." o trang Vi.
//
// Nguoi chua co giao dich nao van phai xem duoc trang: moi so la 0 va `since` la ngay tao
// tai khoan. Doc `since` truoc, va neu doc so cai hong thi bao loi — hien "0 Xu" cho mot
// nguoi that su co tien la sai nghiem trong hon la bao "khong doc duoc".
func (a *apiServer) walletSummary(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	ctx := r.Context()
	var created sql.NullTime
	if err := a.db.QueryRowContext(ctx, `SELECT created_at FROM users WHERE id = ?`, uid).Scan(&created); err != nil {
		a.log.Error("doc ngay tao tai khoan", "err", err, "user", uid)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được ví.")
		return
	}
	sum, err := a.wallet.Summary(ctx, uid)
	if err != nil {
		a.log.Error("tong hop vi", "err", err, "user", uid)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được ví.")
		return
	}
	since := ""
	if created.Valid {
		since = created.Time.Format(time.RFC3339)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"balance":        sum.Balance,
		"topup_total":    sum.TopupTotal,
		"convert_total":  sum.ConvertTotal,
		"orders_total":   sum.OrdersTotal,
		"orders_pending": sum.OrdersPending,
		"orders_granted": sum.OrdersGranted,
		"refunded_total": sum.RefundedTotal,
		"since":          since,
	})
}

// myOrders: don mua goi cua nguoi nay o MOI game (trang Tong quan cua tai khoan).
//
// `last_error` cua tung don la thong bao cua console game — van ky thuat, doi khi kem ca ten
// ham — nen tra ve rong. Van giu truong de khuon JSON khong doi voi cai trang quan tri dung.
func (a *apiServer) myOrders(w http.ResponseWriter, r *http.Request) {
	uid, ok := a.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	orders, err := a.wallet.AllOrders(r.Context(), uid, catalog.ParseLimit(r.URL.Query().Get("limit"), 20, 100))
	if err != nil {
		a.log.Error("doc don mua", "err", err, "user", uid)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được đơn mua.")
		return
	}
	for i := range orders {
		orders[i].LastError = ""
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"orders": orders})
}

// apiPage: mot trang noi dung tinh CHUNG cua cong (dieu khoan, chinh sach, ho tro, gioi thieu).
// Ban rieng theo game do adapter phuc vu (/api/game/pages/{slug}).
func (a *apiServer) apiPage(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(r.PathValue("slug"))
	p, err := catalog.PageBySlug(r.Context(), a.db, slug, "")
	if err != nil {
		if errors.Is(err, catalog.ErrNotFound) {
			httpx.Error(w, http.StatusNotFound, "not_found", "Không có trang này.")
			return
		}
		a.log.Error("doc trang noi dung", "err", err, "slug", slug)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được trang.")
		return
	}
	httpx.JSON(w, http.StatusOK, p)
}
