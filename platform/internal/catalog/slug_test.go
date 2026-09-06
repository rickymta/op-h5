package catalog

import (
	"strings"
	"testing"
)

// Slug sinh tu tieu de tieng Viet: bo dau, ha chu thuong, moi cum ky tu la thanh MOT gach.
func TestMakeSlug(t *testing.T) {
	cases := map[string]string{
		"Ví Xu dùng chung cho mọi game":     "vi-xu-dung-chung-cho-moi-game",
		"Đại Hải Trình":                     "dai-hai-trinh",
		"Nạp X2 cuối tuần 6–7/9":            "nap-x2-cuoi-tuan-6-7-9",
		"  Khai mở máy chủ S5 · Đông Hải  ": "khai-mo-may-chu-s5-dong-hai",
		"Hỏi & Đáp — FAQ":                   "hoi-dap-faq",
		"":                                  "",
		"###":                               "",
		"新年快乐":                              "", // khong con ky tu latin nao -> ben goi tu lo
		"2026":                              "tin-2026",
	}
	for in, want := range cases {
		if got := MakeSlug(in); got != want {
			t.Errorf("MakeSlug(%q) = %q, muon %q", in, got, want)
		}
	}
}

// Slug dai bi cat o dau gach gan nhat: khong bao gio qua 96 ky tu (do dai cot news.slug), va
// khong cat cut mot tu o cuoi.
func TestMakeSlugCatNgan(t *testing.T) {
	s := MakeSlug(strings.Repeat("Chương trình khuyến mãi ", 12))
	if len(s) > MaxSlugLen {
		t.Fatalf("dai %d ky tu, toi da %d: %q", len(s), MaxSlugLen, s)
	}
	if strings.HasPrefix(s, "-") || strings.HasSuffix(s, "-") {
		t.Errorf("khong duoc bat dau/ket thuc bang gach: %q", s)
	}
	if !ValidNewsSlug(s) {
		t.Errorf("slug sinh ra phai luon hop le: %q", s)
	}
	// Cat o ranh gioi tu: manh cuoi phai la mot tu tron.
	for _, w := range strings.Split(s, "-") {
		if w != "chuong" && w != "trinh" && w != "khuyen" && w != "mai" {
			t.Errorf("manh %q khong phai tu tron trong %q", w, s)
		}
	}
}

// ValidNewsSlug la kiem tra cho DAU VAO cua trang quan tri: chat hon slugShape mot diem la
// khong nhan slug toan chu so (se bi tra cuu theo id che mat).
func TestValidNewsSlug(t *testing.T) {
	for _, s := range []string{"vi-xu", "a", "bai-12", "tin-2026", "x9"} {
		if !ValidNewsSlug(s) {
			t.Errorf("%q phai hop le", s)
		}
	}
	bad := []string{"", "-dau-gach", "Hoa-Thuong", "co dau cach", "co_gach_duoi", "tiếng-việt",
		"12", "0", strings.Repeat("a", 97)}
	for _, s := range bad {
		if ValidNewsSlug(s) {
			t.Errorf("%q phai bi tu choi", s)
		}
	}
	// 96 ky tu la vua du.
	if !ValidNewsSlug(strings.Repeat("a", 96)) {
		t.Error("96 ky tu phai hop le")
	}
}

// Khoa trong /tin-tuc/{khoa}: toan chu so thi tra id TRUOC (lien ket cu con song) roi moi toi
// slug; con lai chi tra slug. Khoa khong dung hinh slug (co dau cach, chu hoa...) khong sinh
// ra truy van slug nao.
func TestSplitNewsKey(t *testing.T) {
	cases := []struct {
		key  string
		id   int64
		slug string
	}{
		{"12", 12, "12"}, // thu id 12 truoc, khong co thi thu slug "12"
		{"vi-xu-dung-chung", 0, "vi-xu-dung-chung"},
		{"bai-7", 0, "bai-7"},
		{"0", 0, "0"}, // id 0 khong ton tai -> chi con duong slug
		{"-3", 0, ""}, // khong phai id duong, cung khong dung hinh slug
		{"", 0, ""},
		{"  12  ", 12, "12"}, // khoang trang thua tu duong dan
		{"Vi Xu", 0, ""},
		{"9223372036854775808", 0, "9223372036854775808"}, // tran int64 -> chi thu slug
	}
	for _, c := range cases {
		id, slug := splitNewsKey(c.key)
		if id != c.id || slug != c.slug {
			t.Errorf("splitNewsKey(%q) = (%d,%q), muon (%d,%q)", c.key, id, slug, c.id, c.slug)
		}
	}
}
