package main

import (
	"strings"
	"testing"
)

// Ma game thanh client_id OIDC va tien to cua moi bang khac, nen chi nhan khuon hep.
func TestCodePattern(t *testing.T) {
	ok := []string{"haitac", "game2", "vo-lam", "a1"}
	bad := []string{"", "a", "Haitac", "1game", "có-dấu", "qua-dai-qua-dai-qua-dai-qua-dai-qua", "a b", "a/b"}
	for _, s := range ok {
		if !codeRe.MatchString(s) {
			t.Errorf("%q phai hop le", s)
		}
	}
	for _, s := range bad {
		if codeRe.MatchString(s) {
			t.Errorf("%q khong duoc hop le", s)
		}
	}
}

func TestStaffUsernamePattern(t *testing.T) {
	ok := []string{"admin", "an.nguyen", "gm_01", "abc"}
	bad := []string{"", "ab", "An", "an nguyen", "an@nguyen", ".an"}
	for _, s := range ok {
		if !staffRe.MatchString(s) {
			t.Errorf("%q phai hop le", s)
		}
	}
	for _, s := range bad {
		if staffRe.MatchString(s) {
			t.Errorf("%q khong duoc hop le", s)
		}
	}
}

// URL cua game di thang vao redirect_uris cua client OIDC, ma OIDC so khop TUYET DOI.
// Mot chuoi khong phai URL lot qua day se lam dang nhap hong ma khong bao gi ro rang.
func TestCheckURL(t *testing.T) {
	for _, s := range []string{"http://127.0.0.1:8090", "https://haitac.example.com", "https://a.b/c"} {
		if err := checkURL(s, "X"); err != nil {
			t.Errorf("%q phai hop le, duoc %v", s, err)
		}
	}
	for _, s := range []string{"", "haitac.example.com", "ftp://a.b", "/auth/callback", "javascript:alert(1)"} {
		if err := checkURL(s, "X"); err == nil {
			t.Errorf("%q khong duoc hop le", s)
		}
	}
}

func TestValidRole(t *testing.T) {
	for _, r := range roles {
		if !validRole(r) {
			t.Errorf("%q phai hop le", r)
		}
	}
	for _, r := range []string{"", "admin", "root", "Owner", "gm "} {
		if validRole(r) {
			t.Errorf("%q khong duoc hop le", r)
		}
	}
}

// Mat khau sinh ra phai du dai va moi lan mot khac; day la khoa vao cong cu phat vat pham.
func TestNewPasswordIsRandomAndLongEnough(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 50; i++ {
		p, err := newPassword()
		if err != nil {
			t.Fatalf("sinh mat khau: %v", err)
		}
		if len(p) < 16 {
			t.Fatalf("mat khau qua ngan: %d ky tu", len(p))
		}
		if strings.ContainsAny(p, "+/= ") {
			t.Errorf("mat khau chua ky tu de sai khi chep tay: %q", p)
		}
		if seen[p] {
			t.Fatalf("mat khau lap lai: %q", p)
		}
		seen[p] = true
	}
}
