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
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/rickymta/op-h5/platform/internal/catalog"
	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/textnorm"
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

// isStoreCategory: chi cac nhom co trong storeCategories moi hien tren web.
//
// Bang game_packages con nhom 'ingame' (1.870 muc nap chi de tra gia khi nguoi choi bam mua
// TRONG game). Chung khong co ten tieng Viet tu te va khong ban tren web, nen phai loc o
// MOI cua vao — danh sach, tim kiem, va ca trang chi tiet mot goi.
func isStoreCategory(key string) bool {
	for _, c := range storeCategories {
		if c.Key == key {
			return true
		}
	}
	return false
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
	Key   string `json:"key"`
	Title string `json:"title"`
	Hint  string `json:"hint"`
	// Count chi co khi goi voi cats_only=1 (luc do Packages rong): so goi trong nhom.
	Count    int       `json:"count,omitempty"`
	Packages []pkgView `json:"packages,omitempty"`
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

// groupCategories xep goi theo tab; tab khong co goi thi bo. only != "" chi giu mot tab.
func groupCategories(pkgs []wallet.Package, only string) []catView {
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
	return out
}

// groupedPackages xep goi dang mo theo tab (trang Go cu o /cu/cua-hang).
func (s *adapterServer) groupedPackages(r *http.Request, only string) ([]catView, error) {
	pkgs, err := s.wallet.Packages(r.Context(), s.cfg.GameCode)
	if err != nil {
		return nil, err
	}
	return groupCategories(pkgs, only), nil
}

// ---------------------------------------------------------------- tim, loc, phan trang

// storeQuery la bo loc cua bang goi tren trang cua hang (hop dong dot 3 muc 3.1).
type storeQuery struct {
	Q        string // tu khoa, khop khong dau tren ten + noi dung + mo ta
	Cat      string // nhom goi; rong = moi nhom
	Sort     string // "price_asc" | "price_desc" | "popular"
	Page     int
	PageSize int
	// On = client co gui tham so loc nao khong. Khong gui thi giu nguyen khuon cu
	// (chi `categories`) de trang Go cu va ban React truoc do khong doi hanh vi.
	On bool
}

// parseStoreQuery doc ?q=&cat=&sort=&page=&page_size=. Gia tri la (nhom khong ton tai, sort
// khong hieu, trang am) khong bao loi ma lui ve mac dinh: day la trang cong khai, mot lien
// ket cu voi tham so sai van phai ra bang goi.
func parseStoreQuery(q url.Values) storeQuery {
	sq := storeQuery{
		Q:    strings.TrimSpace(q.Get("q")),
		Cat:  strings.TrimSpace(q.Get("cat")),
		Sort: strings.TrimSpace(q.Get("sort")),
	}
	for _, k := range []string{"q", "cat", "sort", "page", "page_size"} {
		if q.Has(k) {
			sq.On = true
		}
	}
	if sq.Cat != "" && !isStoreCategory(sq.Cat) {
		sq.Cat = ""
	}
	if sq.Sort != "price_asc" && sq.Sort != "price_desc" {
		sq.Sort = "popular"
	}
	sq.Page, _ = strconv.Atoi(q.Get("page"))
	if sq.Page < 1 {
		sq.Page = 1
	}
	sq.PageSize = catalog.ParseLimit(q.Get("page_size"), 20, 100)
	return sq
}

// searchText la phan van ban dem so voi tu khoa: ten goi, noi dung, mo ta.
func searchText(p wallet.Package) string {
	return p.Name + " " + p.ItemName + " " + p.Description
}

// listView la khoi `list` tra kem `categories`.
type listView struct {
	Packages []pkgView `json:"packages"`
	Page     int       `json:"page"`
	PageSize int       `json:"page_size"`
	Total    int       `json:"total"`
	Pages    int       `json:"pages"`
}

// buildList loc, sap xep va cat trang.
//
// "popular" giu nguyen thu tu tu DB (`sort_order, price_xu, package_id`) — do chinh la thu tu
// hien thi ma trang quan tri dat, nen khong sap lai. Hai kieu con lai dung sap on dinh de goi
// cung gia van giu thu tu hien thi.
func buildList(pkgs []wallet.Package, sq storeQuery) listView {
	matched := make([]wallet.Package, 0, len(pkgs))
	for _, p := range pkgs {
		if !isStoreCategory(p.Category) {
			continue
		}
		if sq.Cat != "" && p.Category != sq.Cat {
			continue
		}
		if !textnorm.Matches(searchText(p), sq.Q) {
			continue
		}
		matched = append(matched, p)
	}
	switch sq.Sort {
	case "price_asc":
		sort.SliceStable(matched, func(i, j int) bool { return matched[i].PriceXu < matched[j].PriceXu })
	case "price_desc":
		sort.SliceStable(matched, func(i, j int) bool { return matched[i].PriceXu > matched[j].PriceXu })
	}

	size := sq.PageSize
	total := len(matched)
	pages := (total + size - 1) / size
	if pages < 1 {
		pages = 1 // bang rong van la "trang 1/1", de thanh phan phan trang co gi de ve
	}
	page := sq.Page
	if page > pages {
		page = pages
	}
	start := (page - 1) * size
	if start > total {
		start = total
	}
	end := start + size
	if end > total {
		end = total
	}
	out := make([]pkgView, 0, end-start)
	for _, p := range matched[start:end] {
		out = append(out, toPkgView(p))
	}
	return listView{Packages: out, Page: page, PageSize: size, Total: total, Pages: pages}
}

// ---------------------------------------------------------------- noi dung mot goi

// rewardLabels: nhan tieng Viet cho ba ma tien te trong game (docs/design-cua-hang.md muc 1.1).
// Cac ma con lai khong tra cuu duoc o day (bang vat pham nam trong Excel cua game), nen lui ve
// item_name hoac "Vật phẩm #<id>".
var rewardLabels = map[string]string{
	"0:1": "Nguyên Bảo",
	"0:0": "Kim tệ",
	"0:4": "EXP anh hùng",
}

type rewardItem struct {
	Label string `json:"label"`
	Count int64  `json:"count"`
}

// parseReward doc chuoi qua cua game: "type:id:count#type:id:count".
//
// itemName chi dung khi chuoi co DUNG MOT muc — luc do item_name mo ta chinh muc do. Nhieu
// muc thi dan cung mot ten cho ca cum la sai, nen moi muc la khong tra cuu duoc deu hien
// "Vật phẩm #<id>".
func parseReward(reward, itemName string) []rewardItem {
	parts := strings.Split(reward, "#")
	out := make([]rewardItem, 0, len(parts))
	single := len(parts) == 1 && strings.TrimSpace(itemName) != ""
	for _, part := range parts {
		f := strings.Split(strings.TrimSpace(part), ":")
		if len(f) != 3 {
			continue
		}
		n, err := strconv.ParseInt(strings.TrimSpace(f[2]), 10, 64)
		if err != nil || n <= 0 {
			continue
		}
		id := strings.TrimSpace(f[1])
		label, ok := rewardLabels[strings.TrimSpace(f[0])+":"+id]
		switch {
		case ok:
		case single:
			label = strings.TrimSpace(itemName)
		default:
			label = "Vật phẩm #" + id
		}
		out = append(out, rewardItem{Label: label, Count: n})
	}
	return out
}

// rewardItems liet ke nguoi choi se nhan duoc gi.
//
// grant_mode='mail': doc chuoi `reward` — day la chuoi that ma console gui kem thu.
// grant_mode='pay': game xu ly nhu mot lan nap, khong co chuoi qua; noi dung nam o
// item_name/item_count (vd "10.000 Nguyên Bảo" x1).
func rewardItems(p wallet.Package) []rewardItem {
	if p.GrantMode == "mail" && strings.TrimSpace(p.Reward) != "" {
		if items := parseReward(p.Reward, p.ItemName); len(items) > 0 {
			return items
		}
	}
	label := strings.TrimSpace(p.ItemName)
	if label == "" {
		label = p.Name
	}
	count := int64(p.ItemCount)
	if count <= 0 {
		count = 1
	}
	return []rewardItem{{Label: label, Count: count}}
}

// grantNote la mot cau giai thich hang ve bang duong nao.
func grantNote(p wallet.Package) string {
	switch p.GrantMode {
	case "mail":
		return "Vật phẩm được gửi qua thư trong game; mở hòm thư của nhân vật bạn chọn để nhận."
	case "ingame":
		return "Gói này chỉ mua được từ trong game."
	default:
		return "Game xử lý như một lần nạp: phần thưởng vào thẳng nhân vật ở máy chủ bạn chọn."
	}
}

type serverDays struct {
	Min int `json:"min"`
	Max int `json:"max"`
}

// pkgDetail la mot goi tren trang chi tiet: moi truong cua pkgView + noi dung va dieu kien.
type pkgDetail struct {
	pkgView
	RewardItems []rewardItem `json:"reward_items"`
	GrantNote   string       `json:"grant_note"`
	ServerDays  serverDays   `json:"server_days"`
	DailyLimit  int          `json:"daily_limit"`
	VipRequired int          `json:"vip_required"`
}

func toPkgDetail(p wallet.Package) pkgDetail {
	return pkgDetail{
		pkgView:     toPkgView(p),
		RewardItems: rewardItems(p),
		GrantNote:   grantNote(p),
		ServerDays:  serverDays{Min: p.ServerDayMin, Max: p.ServerDayMax},
		DailyLimit:  p.DailyLimit,
		VipRequired: p.VipRequired,
	}
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

// listPackages tra ve danh muc theo tab; ?category= de loc mot tab (khuon cu, giu nguyen).
//
// Co bat ky tham so nao trong nhom ?q= ?cat= ?sort= ?page= ?page_size= thi tra THEM khoi
// `list` da loc/sap/cat trang cho bang goi cua trang cua hang moi. `categories` van tra du
// de trang ve o chon nhom — mot luot goi, mot luot doc DB.
func (s *adapterServer) listPackages(w http.ResponseWriter, r *http.Request) {
	pkgs, err := s.wallet.Packages(r.Context(), s.cfg.GameCode)
	if err != nil {
		s.log.Error("doc bang gia", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được bảng giá.")
		return
	}
	q := r.URL.Query()
	// cats_only=1: chi ten cac nhom, KHONG kem goi. Trang cua hang can danh sach nhom de do
	// vao o chon ngay khi mo; keo ca bang gia ve chi de lam viec do la 512 KB (1.933 goi, rieng
	// nhom 'event' 1.870) — do tren server that 2026-09-06. Voi nguoi choi dung dien thoai
	// day la nua MB moi lan mo cua hang, trong khi bang o duoi da phan trang tu may chu.
	if q.Get("cats_only") == "1" {
		cats := groupCategories(pkgs, "")
		out := make([]catView, 0, len(cats))
		for _, c := range cats {
			out = append(out, catView{Key: c.Key, Title: c.Title, Hint: c.Hint, Count: len(c.Packages)})
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"categories": out})
		return
	}
	out := map[string]any{"categories": groupCategories(pkgs, strings.TrimSpace(q.Get("category")))}
	if sq := parseStoreQuery(q); sq.On {
		out["list"] = buildList(pkgs, sq)
	}
	httpx.JSON(w, http.StatusOK, out)
}

// packageDetail tra ve mot goi cho trang /cua-hang/{id}.
//
// Goi an, goi khong ton tai va goi thuoc nhom 'ingame' deu la 404 `package_unknown`: nhom
// 'ingame' chi de tra gia khi nguoi choi bam mua trong game, khong phai hang ban tren web.
func (s *adapterServer) packageDetail(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("id"))
	notFound := func() {
		httpx.Error(w, http.StatusNotFound, "package_unknown", "Gói này không còn bán.")
	}
	if id == "" {
		notFound()
		return
	}
	p, err := s.wallet.PackageByID(r.Context(), s.cfg.GameCode, id, false)
	if err != nil {
		if !errors.Is(err, wallet.ErrPackageUnknown) {
			s.log.Error("doc goi", "err", err, "goi", id)
			httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được gói.")
			return
		}
		notFound()
		return
	}
	if !isStoreCategory(p.Category) {
		notFound()
		return
	}
	httpx.JSON(w, http.StatusOK, toPkgDetail(p))
}

// storeStats la vai con so cho phan dau trang cua hang. Chi so THAT: so goi dang ban va so
// nhom co hang. Khong bia so luot giao dich hay so nguoi mua.
func (s *adapterServer) storeStats(w http.ResponseWriter, r *http.Request) {
	pkgs, err := s.wallet.Packages(r.Context(), s.cfg.GameCode)
	if err != nil {
		s.log.Error("doc bang gia", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được bảng giá.")
		return
	}
	n, cats, firstBuy := 0, map[string]bool{}, false
	for _, p := range pkgs {
		if !isStoreCategory(p.Category) {
			continue
		}
		n++
		cats[p.Category] = true
		// Thuong lan dau x2 la luat cua cac MOC doi Nguyen Bao (nhom 'diamond'); khong co
		// moc nao dang ban thi khong duoc noi la co.
		if p.Category == "diamond" {
			firstBuy = true
		}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"packages":        n,
		"categories":      len(cats),
		"rate_note":       "1 Xu = 1 Nguyên Bảo",
		"first_buy_bonus": firstBuy,
	})
}

// gamePage tra ve mot trang noi dung tinh: ban rieng cua game truoc, khong co thi ban chung.
func (s *adapterServer) gamePage(w http.ResponseWriter, r *http.Request) {
	p, err := catalog.PageBySlug(r.Context(), s.db, strings.TrimSpace(r.PathValue("slug")), s.cfg.GameCode)
	if err != nil {
		if errors.Is(err, catalog.ErrNotFound) {
			httpx.Error(w, http.StatusNotFound, "not_found", "Không có trang này.")
			return
		}
		s.log.Error("doc trang noi dung", "err", err, "slug", r.PathValue("slug"))
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được trang.")
		return
	}
	httpx.JSON(w, http.StatusOK, p)
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
//
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
