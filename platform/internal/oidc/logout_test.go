package oidc

import (
	"net/http/httptest"
	"testing"
)

// Bao ve chong open redirect: truoc day tham so nay duoc dua thang vao http.Redirect.
func TestPostLogoutTarget(t *testing.T) {
	s := &Server{}
	cases := []struct {
		ten, query, muon string
	}{
		{"khong co tham so", "", "/"},
		{"duong dan tuong doi", "?post_logout_redirect_uri=/tai-khoan", "/tai-khoan"},
		{"protocol-relative bi chan", "?post_logout_redirect_uri=//ke-tan-cong.example", "/"},
		{"backslash bi chan", "?post_logout_redirect_uri=/\\ke-tan-cong.example", "/"},
		{"tuyet doi chua dang ky", "?post_logout_redirect_uri=https://ke-tan-cong.example", "/"},
		{"tuyet doi khong co client_id", "?post_logout_redirect_uri=https://haitac.example/", "/"},
	}
	for _, c := range cases {
		t.Run(c.ten, func(t *testing.T) {
			r := httptest.NewRequest("GET", "/oauth/logout"+c.query, nil)
			if got := s.postLogoutTarget(r); got != c.muon {
				t.Fatalf("postLogoutTarget = %q, muon %q", got, c.muon)
			}
		})
	}
}

func TestAllowsPostLogout(t *testing.T) {
	c := &Client{PostLogoutURIs: []string{"https://haitac.example/", ""}}
	if !c.AllowsPostLogout("https://haitac.example/") {
		t.Fatal("dia chi da dang ky phai duoc cho qua")
	}
	if c.AllowsPostLogout("https://haitac.example") {
		t.Fatal("phai khop tuyet doi, khong duoc bo qua dau /")
	}
	if c.AllowsPostLogout("") {
		t.Fatal("chuoi rong khong duoc khop voi phan tu rong")
	}
}
