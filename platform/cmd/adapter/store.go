package main

// Cua hang: mua goi va doi Xu -> Nguyen Bao tu vi he thong ID. Thiet ke: docs/design-cua-hang.md.
//
// Ba cua vao:
//   /cua-hang, /api/game/packages, /api/game/convert, /api/game/orders, /api/game/roles — trang web.
//   /api/game/legacy/check  <- nginx: /api/api.php?payid=        client game hoi "du Xu khong".
//   /api/game/legacy/charge <- nginx: /api/apisv.php?payid=&user= tcg-game.jar goi (domain
//                              hakihuyenthoai.net hardcode, ghim ve loopback) va PHAT HANG khi
//                              body dung bang "true". Chi loopback moi duoc goi.

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/wallet"
)

// ---------------------------------------------------------------- danh muc

type storeCategory struct{ Key, Title, Hint string }

// storeCategories la thu tu tab tren trang. Goi thuoc nhom khong co o day (vd 'ingame') khong hien.
var storeCategories = []storeCategory{
	{"diamond", "Nguyên Bảo", "Đổi Xu lấy Nguyên Bảo. Game tính như nạp thật: mỗi mốc lần đầu mua được x2 và cộng điểm VIP."},
	{"card", "Thẻ tuần", "Kích hoạt trong game, nhận thưởng mỗi ngày trong 7 ngày."},
	{"fund", "Quỹ", "Mua một lần, nhận thưởng theo mốc khi chơi."},
	{"privilege", "Đặc quyền", "Mở tính năng hoặc quyền lợi lâu dài."},
	{"daily", "Gói ngày", "Giới hạn số lần mỗi ngày và theo ngày mở máy chủ."},
	{"limited", "Gói giới hạn", "Số suất có hạn, mỗi người mua một lần."},
	{"event", "Gói sự kiện", "Chỉ mua được khi sự kiện đang mở trong game. Game từ chối thì Xu được hoàn ngay."},
	{"item", "Vật phẩm", "Gửi qua thư trong game, nhận ở hòm thư."},
}

type pkgView struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	GrantMode   string `json:"grant_mode"`
	Description string `json:"description"`
	Badge       string `json:"badge"`
	Cond        string `json:"cond"`
	ItemName    string `json:"item_name"`
	ItemCount   int    `json:"item_count"`
	PriceXu     int64  `json:"price_xu"`
	PriceFmt    string `json:"price_fmt"`
	VipPoints   int64  `json:"vip_points"`
}

type catView struct {
	Key      string    `json:"key"`
	Title    string    `json:"title"`
	Hint     string    `json:"hint"`
	Packages []pkgView `json:"packages"`
}

// condText dien giai dieu kien mua thanh mot dong ngan. Game van la noi quyet dinh.
func condText(p wallet.Package) string {
	var parts []string
	switch {
	case p.ServerDayMin > 0 && p.ServerDayMax > 0 && p.ServerDayMax < 999:
		parts = append(parts, fmt.Sprintf("ngày %d–%d sau mở máy chủ", p.ServerDayMin, p.ServerDayMax))
	case p.ServerDayMin > 1:
		parts = append(parts, fmt.Sprintf("từ ngày %d sau mở máy chủ", p.ServerDayMin))
	}
	if p.DailyLimit > 0 {
		parts = append(parts, fmt.Sprintf("%d lần/ngày", p.DailyLimit))
	}
	if p.VipRequired > 0 {
		parts = append(parts, fmt.Sprintf("VIP ≥ %d", p.VipRequired))
	}
	return strings.Join(parts, " · ")
}

func toPkgView(p wallet.Package) pkgView {
	return pkgView{
		ID: p.ID, Name: p.Name, Category: p.Category, GrantMode: p.GrantMode,
		Description: p.Description, Badge: p.Badge, Cond: condText(p),
		ItemName: p.ItemName, ItemCount: p.ItemCount,
		PriceXu: p.PriceXu, PriceFmt: formatInt(p.PriceXu), VipPoints: p.VipPoints,
	}
}

// groupedPackages xep goi dang mo theo tab; tab khong co goi thi bo.
func (s *adapterServer) groupedPackages(r *http.Request, only string) ([]catView, error) {
	pkgs, err := s.wallet.Packages(r.Context(), s.cfg.GameCode)
	if err != nil {
		return nil, err
	}
	byCat := map[string][]pkgView{}
	for _, p := range pkgs {
		byCat[p.Category] = append(byCat[p.Category], toPkgView(p))
	}
	var out []catView
	for _, c := range storeCategories {
		if only != "" && c.Key != only {
			continue
		}
		if len(byCat[c.Key]) == 0 {
			continue
		}
		out = append(out, catView{Key: c.Key, Title: c.Title, Hint: c.Hint, Packages: byCat[c.Key]})
	}
	return out, nil
}

// ---------------------------------------------------------------- trang va API web

type orderView struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	SrvCode   string `json:"srv_code"`
	AmountFmt string `json:"amount_fmt"`
	Status    string `json:"status"`
	StatusVi  string `json:"status_vi"`
	GrantMode string `json:"grant_mode"`
	CreatedAt string `json:"created_at"`
}

func statusVi(o wallet.Order) string {
	switch o.Status {
	case "granted":
		if o.GrantMode == "mail" {
			return "Đã gửi thư"
		}
		return "Đã phát"
	case "pending":
		return "Đang phát…"
	case "failed":
		return "Không phát được"
	case "refunded":
		return "Đã hoàn Xu"
	}
	return o.Status
}

func toOrderViews(orders []wallet.Order) []orderView {
	out := make([]orderView, 0, len(orders))
	for _, o := range orders {
		out = append(out, orderView{
			ID: o.ID, Name: o.Name, SrvCode: o.SrvCode, AmountFmt: formatInt(o.AmountXu),
			Status: o.Status, StatusVi: statusVi(o), GrantMode: o.GrantMode, CreatedAt: o.CreatedAt,
		})
	}
	return out
}

// storePage la trang cua hang.
func (s *adapterServer) storePage(w http.ResponseWriter, r *http.Request) {
	data := map[string]any{
		"User": s.username(r), "Servers": s.visibleServers(),
		"IDBase": strings.TrimRight(s.cfg.Issuer, "/"),
	}
	uid, ok := s.currentUser(r)
	if !ok {
		s.render(w, "store.html", data)
		return
	}
	ctx := r.Context()
	bal, err := s.wallet.Balance(ctx, uid)
	if err != nil {
		s.log.Error("doc so du", "err", err, "user", uid)
	}
	data["Balance"] = bal
	data["BalanceFmt"] = formatInt(bal)

	cats, err := s.groupedPackages(r, "")
	if err != nil {
		s.log.Error("doc danh muc", "err", err)
	}
	data["Categories"] = cats

	orders, err := s.wallet.Orders(ctx, uid, s.cfg.GameCode, 10)
	if err != nil {
		s.log.Error("doc don mua", "err", err, "user", uid)
	}
	data["Orders"] = toOrderViews(orders)
	s.render(w, "store.html", data)
}

// quyDoiRedirect giu duong cu /quy-doi.
func (s *adapterServer) quyDoiRedirect(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/cua-hang", http.StatusMovedPermanently)
}

// listPackages tra ve danh muc theo tab; ?category= de loc mot tab.
func (s *adapterServer) listPackages(w http.ResponseWriter, r *http.Request) {
	cats, err := s.groupedPackages(r, r.URL.Query().Get("category"))
	if err != nil {
		s.log.Error("doc bang gia", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được bảng giá.")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"categories": cats})
}

// listOrders tra ve cac don mua gan day cua nguoi choi (trang tu hoi de cap nhat trang thai).
func (s *adapterServer) listOrders(w http.ResponseWriter, r *http.Request) {
	uid, ok := s.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	orders, err := s.wallet.Orders(r.Context(), uid, s.cfg.GameCode, 20)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được đơn mua.")
		return
	}
	// Kem so du: hoan Xu tu dong (console tu choi) doi so du ma nguoi choi khong bam gi.
	bal, _ := s.wallet.Balance(r.Context(), uid)
	httpx.JSON(w, http.StatusOK, map[string]any{"orders": toOrderViews(orders), "balance": bal})
}

type roleView struct {
	SrvCode     string `json:"srv_code"`
	MasterIDHex string `json:"master_id_hex"`
	Name        string `json:"name"`
	Level       int    `json:"level"`
}

// listRoles tra ve nhan vat cua nguoi choi (masterList tu login server) de trang chon may
// chu / nhan vat nhan hang. Moi luot goi la mot lan dang nhap login server, nen di qua
// cung bo han muc voi /api/game/session.
func (s *adapterServer) listRoles(w http.ResponseWriter, r *http.Request) {
	uid, ok := s.currentUser(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "Chưa đăng nhập.")
		return
	}
	if !s.sessionLimit.Allow(fmt.Sprintf("roles-%d", uid)) {
		httpx.Error(w, http.StatusTooManyRequests, "rate_limited", "Thao tác quá nhanh, thử lại sau ít giây.")
		return
	}
	sess, err := s.mapper.Session(r.Context(), uid, 0)
	if err != nil {
		s.log.Warn("doc danh sach nhan vat", "err", err, "user", uid)
		httpx.JSON(w, http.StatusOK, map[string]any{"roles": []roleView{}})
		return
	}
	var probe struct {
		MasterList []map[string]json.RawMessage `json:"masterList"`
	}
	_ = json.Unmarshal(sess.Raw, &probe)
	roles := make([]roleView, 0, len(probe.MasterList))
	for _, m := range probe.MasterList {
		var rv roleView
		_ = json.Unmarshal(m["srvCode"], &rv.SrvCode)
		_ = json.Unmarshal(m["masterIdHex"], &rv.MasterIDHex)
		_ = json.Unmarshal(m["masterName"], &rv.Name)
		var lv json.Number
		if json.Unmarshal(m["masterLevel"], &lv) == nil {
			if n, err := lv.Int64(); err == nil {
				rv.Level = int(n)
			}
		}
		if rv.SrvCode != "" && rv.MasterIDHex != "" {
			roles = append(roles, rv)
		}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"roles": roles})
}

// ---------------------------------------------------------------- nut mua trong game

func plain(w http.ResponseWriter, body string) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	_, _ = io.WriteString(w, body)
}

// legacyCheck thay cho api/api.php?payid=: client hoi "du Xu mua muc nay khong".
// Tra ve dung chu "true"/"false" — client so sanh chuoi, khong doc JSON.
func (s *adapterServer) legacyCheck(w http.ResponseWriter, r *http.Request) {
	uid, ok := s.currentUser(r)
	if !ok {
		plain(w, "false")
		return
	}
	payid := strings.TrimSpace(r.URL.Query().Get("payid"))
	pkg, err := s.wallet.PackageByID(r.Context(), s.cfg.GameCode, payid, true)
	if err != nil {
		plain(w, "false")
		return
	}
	bal, err := s.wallet.Balance(r.Context(), uid)
	if err != nil || bal < pkg.PriceXu {
		plain(w, "false")
		return
	}
	plain(w, "true")
}

// legacyCharge thay cho api/apisv.php?payid=&user=: tcg-game.jar goi khi nguoi choi bam mua
// trong game, va PHAT HANG ngay khi body la "true". Vi vay:
//   - chi nhan tu loopback (nginx da chan, o day chan lan nua);
//   - moi loi deu tra "false" (khong bao gio HTML/500 — game so sanh chuoi);
//   - tru Xu roi ghi game_grants status='granted', grant_mode='ingame' (khong goi console);
//   - idempotency 10 giay: game goi mot lan moi lan bam, bam doi trong 10 s tinh mot.
// Rui ro con lai: game tru Xu xong moi kiem PayAvailable/removeItem; buoc sau hong thi Xu da
// mat — thay o Don mua (grant_mode=ingame) de doi soat. Xem docs/design-cua-hang.md muc 4.2.
func (s *adapterServer) legacyCharge(w http.ResponseWriter, r *http.Request) {
	ip := net.ParseIP(httpx.ClientIP(r))
	if ip == nil || !ip.IsLoopback() {
		s.log.Warn("apisv: tu choi nguon khong phai loopback", "ip", httpx.ClientIP(r))
		plain(w, "false")
		return
	}
	payid := strings.TrimSpace(r.URL.Query().Get("payid"))
	user := strings.TrimSpace(r.URL.Query().Get("user"))
	if payid == "" || user == "" {
		plain(w, "false")
		return
	}
	ctx := r.Context()
	var uid int64
	if err := s.db.QueryRowContext(ctx,
		`SELECT user_id FROM game_identities WHERE game_code = ? AND game_username = ?`,
		s.cfg.GameCode, user).Scan(&uid); err != nil {
		s.log.Info("apisv: tai khoan game chua gan he thong ID", "user", user, "payid", payid)
		plain(w, "false")
		return
	}
	pkg, err := s.wallet.PackageByID(ctx, s.cfg.GameCode, payid, true)
	if err != nil {
		s.log.Info("apisv: khong co goi", "payid", payid, "user", user)
		plain(w, "false")
		return
	}
	idem := fmt.Sprintf("ingame-%d-%s-%d", uid, payid, time.Now().Unix()/10)
	txn, err := s.wallet.Convert(ctx, wallet.ConvertInput{
		UserID: uid, GameCode: s.cfg.GameCode, PackageID: payid, IdemKey: idem, Mode: "ingame",
	})
	if err != nil {
		if errors.Is(err, wallet.ErrInsufficient) {
			s.log.Info("apisv: khong du Xu", "user", user, "payid", payid, "gia", pkg.PriceXu)
		} else {
			s.log.Error("apisv: tru Xu that bai", "err", err, "user", user, "payid", payid)
		}
		plain(w, "false")
		return
	}
	s.log.Info("apisv: mua trong game", "user", user, "uid", uid, "payid", payid, "goi", pkg.Name, "xu", pkg.PriceXu, "txn", txn)
	plain(w, "true")
}
