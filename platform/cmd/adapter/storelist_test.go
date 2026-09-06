package main

import (
	"net/url"
	"testing"

	"github.com/rickymta/op-h5/platform/internal/wallet"
)

// samplePackages mo phong thu tu ma DB tra ve (`sort_order, price_xu, package_id`).
func samplePackages() []wallet.Package {
	return []wallet.Package{
		{ID: "18001", Name: "10.000 Nguyên Bảo", Category: "diamond", GrantMode: "pay", PriceXu: 10000,
			ItemName: "10.000 Nguyên Bảo", ItemCount: 1, ItemTid: 18001, Reward: "0:1:10000",
			Description: "Nhận 10.000 Nguyên Bảo.", Badge: "x2 lần đầu"},
		{ID: "18002", Name: "20.000 Nguyên Bảo", Category: "diamond", GrantMode: "pay", PriceXu: 20000,
			ItemName: "20.000 Nguyên Bảo", ItemCount: 1, ItemTid: 18002},
		{ID: "31002", Name: "Thẻ tuần Phù Văn đúc lại", Category: "card", GrantMode: "pay", PriceXu: 50000,
			ItemName: "Thẻ tuần Phù Văn đúc lại", ItemCount: 1},
		{ID: "17001", Name: "Quỹ đặc biệt", Category: "fund", GrantMode: "pay", PriceXu: 100000,
			ItemName: "Quỹ đặc biệt", ItemCount: 1, ServerDayMin: 1, ServerDayMax: 7, DailyLimit: 3, VipRequired: 2},
		{ID: "web-92", Name: "500 vạn KNB", Category: "item", GrantMode: "mail", PriceXu: 1500000,
			ItemName: "500 vạn KNB", ItemCount: 1, Reward: "0:1:5000000"},
		// Nhom 'ingame' chi de tra gia khi mua trong game — khong duoc lo ra web.
		{ID: "99001", Name: "礼包", Category: "ingame", GrantMode: "pay", PriceXu: 5000},
	}
}

func TestParseStoreQuery(t *testing.T) {
	cases := []struct {
		raw            string
		q, cat, sort   string
		page, size, on int
	}{
		{"", "", "", "popular", 1, 20, 0},
		{"q=nguyen+bao", "nguyen bao", "", "popular", 1, 20, 1},
		{"cat=card&sort=price_desc&page=3&page_size=5", "", "card", "price_desc", 3, 5, 1},
		// Nhom khong ton tai / sort khong hieu / trang am: lui ve mac dinh, khong bao loi.
		{"cat=khong-co&sort=random&page=-4&page_size=9999", "", "", "popular", 1, 100, 1},
		// 'ingame' khong phai nhom ban tren web nen khong duoc dung lam bo loc.
		{"cat=ingame", "", "", "popular", 1, 20, 1},
		// Tham so rong van tinh la "co loc" (nguoi dung vua xoa o tim).
		{"q=", "", "", "popular", 1, 20, 1},
	}
	for _, c := range cases {
		v, _ := url.ParseQuery(c.raw)
		sq := parseStoreQuery(v)
		on := 0
		if sq.On {
			on = 1
		}
		if sq.Q != c.q || sq.Cat != c.cat || sq.Sort != c.sort || sq.Page != c.page || sq.PageSize != c.size || on != c.on {
			t.Errorf("%q -> %+v, muon (%q,%q,%q,%d,%d,on=%d)", c.raw, sq, c.q, c.cat, c.sort, c.page, c.size, c.on)
		}
	}
}

func ids(l listView) []string {
	out := make([]string, 0, len(l.Packages))
	for _, p := range l.Packages {
		out = append(out, p.ID)
	}
	return out
}

func eq(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestBuildListHidesIngameAndKeepsDBOrder(t *testing.T) {
	l := buildList(samplePackages(), parseStoreQuery(url.Values{"page": {"1"}}))
	if l.Total != 5 {
		t.Fatalf("phai con 5 goi (bo 'ingame'), duoc %d", l.Total)
	}
	if !eq(ids(l), []string{"18001", "18002", "31002", "17001", "web-92"}) {
		t.Errorf("'popular' phai giu nguyen thu tu cua DB, duoc %v", ids(l))
	}
	if l.Pages != 1 || l.Page != 1 || l.PageSize != 20 {
		t.Errorf("phan trang sai: %+v", l)
	}
}

// Tim kiem khong dau: nguoi choi go "nguyen bao" phai ra "Nguyên Bảo".
func TestBuildListSearchIgnoresDiacritics(t *testing.T) {
	for _, q := range []string{"nguyen bao", "NGUYÊN BẢO", "bao nguyen"} {
		l := buildList(samplePackages(), parseStoreQuery(url.Values{"q": {q}}))
		if !eq(ids(l), []string{"18001", "18002"}) {
			t.Errorf("q=%q -> %v, muon [18001 18002]", q, ids(l))
		}
	}
	l := buildList(samplePackages(), parseStoreQuery(url.Values{"q": {"the tuan"}}))
	if !eq(ids(l), []string{"31002"}) {
		t.Errorf("q=the tuan -> %v, muon [31002]", ids(l))
	}
	// Tu khoa khop MO TA chu khong chi ten.
	l = buildList(samplePackages(), parseStoreQuery(url.Values{"q": {"nhan 10.000"}}))
	if !eq(ids(l), []string{"18001"}) {
		t.Errorf("q khop mo ta -> %v, muon [18001]", ids(l))
	}
	l = buildList(samplePackages(), parseStoreQuery(url.Values{"q": {"khong co gi"}}))
	if l.Total != 0 || len(l.Packages) != 0 || l.Pages != 1 {
		t.Errorf("khong khop gi phai la bang rong nhung van 1 trang: %+v", l)
	}
}

func TestBuildListFilterSortPaginate(t *testing.T) {
	pkgs := samplePackages()

	l := buildList(pkgs, parseStoreQuery(url.Values{"cat": {"diamond"}}))
	if !eq(ids(l), []string{"18001", "18002"}) {
		t.Errorf("loc nhom -> %v", ids(l))
	}

	l = buildList(pkgs, parseStoreQuery(url.Values{"sort": {"price_desc"}}))
	if !eq(ids(l), []string{"web-92", "17001", "31002", "18002", "18001"}) {
		t.Errorf("sap gia giam -> %v", ids(l))
	}
	l = buildList(pkgs, parseStoreQuery(url.Values{"sort": {"price_asc"}}))
	if !eq(ids(l), []string{"18001", "18002", "31002", "17001", "web-92"}) {
		t.Errorf("sap gia tang -> %v", ids(l))
	}

	// 5 goi, moi trang 2: trang 2 la hai goi giua, trang 3 la goi cuoi.
	l = buildList(pkgs, parseStoreQuery(url.Values{"page_size": {"2"}, "page": {"2"}}))
	if l.Total != 5 || l.Pages != 3 || l.Page != 2 || !eq(ids(l), []string{"31002", "17001"}) {
		t.Errorf("trang 2 sai: %+v %v", l, ids(l))
	}
	l = buildList(pkgs, parseStoreQuery(url.Values{"page_size": {"2"}, "page": {"3"}}))
	if !eq(ids(l), []string{"web-92"}) {
		t.Errorf("trang cuoi sai: %v", ids(l))
	}
	// Xin trang vuot qua so trang: tra ve trang cuoi va noi ro `page` da bi keo lai, chu
	// khong tra bang rong (nguoi dung se tuong het hang).
	l = buildList(pkgs, parseStoreQuery(url.Values{"page_size": {"2"}, "page": {"99"}}))
	if l.Page != 3 || !eq(ids(l), []string{"web-92"}) {
		t.Errorf("trang vuot phai keo ve trang cuoi: %+v %v", l, ids(l))
	}
}

func TestParseRewardAndItems(t *testing.T) {
	// Nhieu muc: ma tien te co nhan rieng, ma la thi hien "Vật phẩm #<id>".
	got := parseReward("0:1:5000#0:0:1000000#3:100001:10#0:4:250", "Gói tổng hợp")
	want := []rewardItem{
		{"Nguyên Bảo", 5000}, {"Kim tệ", 1000000}, {"Vật phẩm #100001", 10}, {"EXP anh hùng", 250},
	}
	if len(got) != len(want) {
		t.Fatalf("parseReward -> %+v, muon %+v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("muc %d: %+v, muon %+v", i, got[i], want[i])
		}
	}
	// Mot muc duy nhat va co item_name: dung ten do thay vi "Vật phẩm #...".
	if got := parseReward("3:100210:1", "Thời gian đồng hồ cát"); len(got) != 1 ||
		got[0] != (rewardItem{"Thời gian đồng hồ cát", 1}) {
		t.Errorf("mot muc + item_name -> %+v", got)
	}
	// Chuoi rac / so luong 0 bi bo qua, khong lam hong ca danh sach.
	if got := parseReward("hong#0:1:0#0:1:7", ""); len(got) != 1 || got[0].Count != 7 {
		t.Errorf("chuoi rac -> %+v", got)
	}

	// grant_mode='mail' doc chuoi qua.
	mail := wallet.Package{GrantMode: "mail", Reward: "0:1:5000000", ItemName: "500 vạn KNB", ItemCount: 1}
	if got := rewardItems(mail); len(got) != 1 || got[0] != (rewardItem{"Nguyên Bảo", 5000000}) {
		t.Errorf("mail -> %+v", got)
	}
	// grant_mode='pay' khong co chuoi qua: noi dung o item_name/item_count.
	pay := wallet.Package{GrantMode: "pay", ItemName: "Quỹ đặc biệt", ItemCount: 1, Name: "Quỹ đặc biệt"}
	if got := rewardItems(pay); len(got) != 1 || got[0] != (rewardItem{"Quỹ đặc biệt", 1}) {
		t.Errorf("pay -> %+v", got)
	}
	// 'pay' co san chuoi reward van dung item_name (game xu ly nhu mot lan nap, chuoi kia
	// chi la ghi chu cua bo sinh du lieu).
	payWithReward := wallet.Package{GrantMode: "pay", Reward: "0:1:10000",
		ItemName: "10.000 Nguyên Bảo", ItemCount: 1}
	if got := rewardItems(payWithReward); len(got) != 1 || got[0].Label != "10.000 Nguyên Bảo" {
		t.Errorf("pay co reward -> %+v", got)
	}
	// Thieu ca hai: lui ve ten goi, so luong toi thieu 1.
	bare := wallet.Package{GrantMode: "pay", Name: "Gói lạ"}
	if got := rewardItems(bare); len(got) != 1 || got[0] != (rewardItem{"Gói lạ", 1}) {
		t.Errorf("goi thieu du lieu -> %+v", got)
	}
}

func TestToPkgDetail(t *testing.T) {
	p := samplePackages()[3] // Quỹ đặc biệt, co du dieu kien
	d := toPkgDetail(p)
	if d.ID != "17001" || d.PriceFmt != "100.000" {
		t.Errorf("truong cua pkgView phai giu nguyen: %+v", d.pkgView)
	}
	if d.ServerDays.Min != 1 || d.ServerDays.Max != 7 || d.DailyLimit != 3 || d.VipRequired != 2 {
		t.Errorf("dieu kien sai: %+v", d)
	}
	if d.GrantNote == "" {
		t.Errorf("phai co mot cau giai thich cach nhan hang")
	}
	if got := grantNote(wallet.Package{GrantMode: "mail"}); got == grantNote(p) {
		t.Errorf("thu va nap phai co loi giai thich khac nhau")
	}
}

func TestIsStoreCategory(t *testing.T) {
	for _, k := range []string{"diamond", "card", "fund", "privilege", "daily", "limited", "item"} {
		if !isStoreCategory(k) {
			t.Errorf("%q phai la nhom ban tren web", k)
		}
	}
	// 'event' bi an khoi cua hang web tu 2026-09-06 (xem chu thich o storeCategories): ten
	// cua 1.870 goi do la ban dich may va trung nhau theo cum, nguoi mua khong phan biet
	// duoc. Chung van mua duoc trong game. Giu phep kiem nay de khong ai mo lai nham.
	for _, k := range []string{"", "ingame", "event", "khac"} {
		if isStoreCategory(k) {
			t.Errorf("%q khong duoc ban tren web", k)
		}
	}
}
