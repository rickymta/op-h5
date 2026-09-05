package catalog

import "testing"

// URL anh trong bang games co the tuong doi so voi site_url; `id` phai ghep thanh tuyet doi vi
// trang chinh nam o host khac trang game. URL da tuyet doi thi khong duoc dung vao.
func TestAbsURL(t *testing.T) {
	cases := []struct{ base, in, want string }{
		{"https://haitac.example.com", "/assets/images/logo.png", "https://haitac.example.com/assets/images/logo.png"},
		{"https://haitac.example.com/", "/brand/haitac/cover.jpg", "https://haitac.example.com/brand/haitac/cover.jpg"},
		{"https://haitac.example.com", "brand/x.png", "https://haitac.example.com/brand/x.png"},
		{"https://haitac.example.com", "https://cdn.example.com/a.png", "https://cdn.example.com/a.png"},
		{"https://haitac.example.com", "http://cdn.example.com/a.png", "http://cdn.example.com/a.png"},
		{"https://haitac.example.com", "//cdn.example.com/a.png", "//cdn.example.com/a.png"},
		{"https://haitac.example.com", "data:image/png;base64,AAAA", "data:image/png;base64,AAAA"},
		{"https://haitac.example.com", "", ""},
		{"", "/assets/a.png", "/assets/a.png"},
		{"http://127.0.0.1:8080", "  /a.png ", "http://127.0.0.1:8080/a.png"},
	}
	for _, c := range cases {
		if got := AbsURL(c.base, c.in); got != c.want {
			t.Errorf("AbsURL(%q, %q) = %q, muon %q", c.base, c.in, got, c.want)
		}
	}
}

func TestValidAccent(t *testing.T) {
	for _, s := range []string{"", "#EE4623", "#ee4623", "#000000"} {
		if !ValidAccent(s) {
			t.Errorf("%q phai hop le", s)
		}
	}
	for _, s := range []string{"EE4623", "#EE46", "#EE46233", "#GGGGGG", "red", "# EE4623", "#EE4623;"} {
		if ValidAccent(s) {
			t.Errorf("%q khong duoc hop le", s)
		}
	}
}

func TestValidBadge(t *testing.T) {
	for _, s := range Badges {
		if !ValidBadge(s) {
			t.Errorf("%q phai hop le", s)
		}
	}
	for _, s := range []string{"NEW", "moi", "hot ", "sale"} {
		if ValidBadge(s) {
			t.Errorf("%q khong duoc hop le", s)
		}
	}
	for _, k := range Kinds {
		if !ValidKind(k) {
			t.Errorf("loai tin %q phai hop le", k)
		}
	}
	if ValidKind("") || ValidKind("all") || ValidKind("News") {
		t.Error("loai tin ngoai enum khong duoc hop le")
	}
}

// URL di thang vao <img src> va <a href> cua trang cong khai: chi nhan duong tuong doi tu goc
// hoac http(s), khong nhan scheme khac va khong nhan ky tu la.
func TestValidAssetURL(t *testing.T) {
	long := "/" + string(make([]byte, 300))
	for _, s := range []string{"", "/assets/images/logo.png", "/brand/haitac/cover.jpg", "https://cdn.example.com/a.png", "http://127.0.0.1:8080/x"} {
		if !ValidAssetURL(s) {
			t.Errorf("%q phai hop le", s)
		}
	}
	for _, s := range []string{"assets/logo.png", "javascript:alert(1)", "data:text/html,x", "ftp://a/b", "/a b.png", "/a\n.png", long} {
		if ValidAssetURL(s) {
			t.Errorf("%q khong duoc hop le", s)
		}
	}
}

func TestParseLimit(t *testing.T) {
	cases := []struct {
		raw      string
		def, max int
		want     int
	}{
		{"", 10, 50, 10}, {"abc", 10, 50, 10}, {"0", 10, 50, 10}, {"-3", 10, 50, 10},
		{"5", 10, 50, 5}, {"50", 10, 50, 50}, {"51", 10, 50, 50}, {"999", 10, 50, 50}, {" 7 ", 10, 50, 7},
	}
	for _, c := range cases {
		if got := ParseLimit(c.raw, c.def, c.max); got != c.want {
			t.Errorf("ParseLimit(%q) = %d, muon %d", c.raw, got, c.want)
		}
	}
}
