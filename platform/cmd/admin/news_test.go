package main

import (
	"net/url"
	"strings"
	"testing"
	"time"
)

// ?game=all / rong = moi tin; "common" = chi tin chung; trang va co trang ke trong 1..100.
func TestParseNewsListQuery(t *testing.T) {
	cases := []struct {
		raw          string
		game, status string
		page, size   int
	}{
		{"", "", "", 1, 20},
		{"game=all&status=all", "", "", 1, 20},
		{"game=haitac&status=draft&page=3&page_size=50", "haitac", "draft", 3, 50},
		{"game=common&status=published", "common", "published", 1, 20},
		{"status=xoa&page=0&page_size=1000", "", "", 1, 100},
		{"page=-2&page_size=abc", "", "", 1, 20},
	}
	for _, c := range cases {
		q, _ := url.ParseQuery(c.raw)
		p := parseNewsListQuery(q)
		if p.Game != c.game || p.Status != c.status || p.Page != c.page || p.PageSize != c.size {
			t.Errorf("%q -> %+v, muon (%q,%q,%d,%d)", c.raw, p, c.game, c.status, c.page, c.size)
		}
	}
}

// Form quan tri gui gio theo <input type=datetime-local> (khong mui gio), API gui RFC 3339;
// ca hai deu phai doc duoc, con chuoi rac thi bao loi chu khong im lang thanh NULL.
func TestParsePublishedAt(t *testing.T) {
	if v, err := parsePublishedAt(""); err != nil || v.Valid {
		t.Errorf("rong phai la NULL khong loi, duoc %+v %v", v, err)
	}
	for _, s := range []string{"2026-09-05T14:00:00+07:00", "2026-09-05T14:00", "2026-09-05 14:00", "2026-09-05"} {
		v, err := parsePublishedAt(s)
		if err != nil || !v.Valid {
			t.Errorf("%q phai doc duoc, duoc %v", s, err)
			continue
		}
		if v.Time.Year() != 2026 || v.Time.Month() != time.September || v.Time.Day() != 5 {
			t.Errorf("%q doc sai ngay: %v", s, v.Time)
		}
	}
	for _, s := range []string{"hom qua", "05/09/2026", "2026-13-01"} {
		if _, err := parsePublishedAt(s); err == nil {
			t.Errorf("%q phai bi tu choi", s)
		}
	}
}

// Kiem tra dau vao cua tin: loai/trang thai trong enum, tieu de bat buoc, URL dung khuon.
func TestNewsInputValidate(t *testing.T) {
	game := "haitac"
	ok := newsInput{GameCode: &game, Kind: "event", Title: "Sự kiện 2/9", Summary: "x", Body: "a\n\nb",
		ImageURL: "/brand/haitac/e.jpg", LinkURL: "https://fb.com/x", Pinned: true, Status: "published", PublishedAt: "2026-09-02T00:00:00+07:00"}
	v, err := ok.validate()
	if err != nil {
		t.Fatalf("tin hop le bi tu choi: %v", err)
	}
	if v.GameCode != "haitac" || v.Kind != "event" || !v.PublishedAt.Valid || !v.Pinned {
		t.Errorf("chuan hoa sai: %+v", v)
	}
	// Mac dinh: kind=news, status=draft, game rong = tin chung.
	v, err = newsInput{Title: "Tin"}.validate()
	if err != nil || v.Kind != "news" || v.Status != "draft" || v.GameCode != "" || v.PublishedAt.Valid {
		t.Errorf("mac dinh sai: %+v %v", v, err)
	}
	bad := []newsInput{
		{Title: ""},
		{Title: strings.Repeat("a", 161)},
		{Title: "x", Kind: "promo"},
		{Title: "x", Status: "archived"},
		{Title: "x", Summary: strings.Repeat("b", 301)},
		{Title: "x", ImageURL: "javascript:alert(1)"},
		{Title: "x", LinkURL: "brand/x.png"},
		{Title: "x", PublishedAt: "mai"},
		{Title: "x", GameCode: func() *string { s := "Hai Tac"; return &s }()},
	}
	for i, in := range bad {
		if _, err := in.validate(); err == nil {
			t.Errorf("truong hop %d phai bi tu choi: %+v", i, in)
		}
	}
}
