package main

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// login_data ra ngoai khong duoc mang khoa game.
//
// Login server THAT dat khoa dang tho o data.account.password; play.php nhung login_data
// thang vao trang nen no se nam trong ma nguon HTML neu khong luoc.
func TestRedactLoginDataRemovesPassword(t *testing.T) {
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	in := `{"account":{"uid":"u1","username":"id000000001","password":"BIMAT","nickname":"n"},"token":"t","masterList":[]}`

	out := string(redactLoginData(json.RawMessage(in), log))
	if strings.Contains(out, "BIMAT") {
		t.Fatalf("khoa game van con trong ket qua: %s", out)
	}
	// Cac truong client that su doc phai con nguyen.
	for _, k := range []string{`"token"`, `"masterList"`, `"uid"`, `"username"`} {
		if !strings.Contains(out, k) {
			t.Fatalf("mat truong %s: %s", k, out)
		}
	}
}

// Dau vao la khuon khong doan truoc thi tra nguyen ban, khong duoc lam mat du lieu.
func TestRedactLoginDataPassesThroughUnknownShapes(t *testing.T) {
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	for _, in := range []string{
		``,
		`khong-phai-json`,
		`{"token":"t"}`,
		`{"account":"khong-phai-object","token":"t"}`,
		`{"account":{"uid":"u1"},"token":"t"}`,
	} {
		got := string(redactLoginData(json.RawMessage(in), log))
		if got != in {
			t.Fatalf("dau vao %q bi doi thanh %q", in, got)
		}
	}
}

// Duoi /admin-portal/api/ chi co API: duong la phai 404 JSON, con duong trang cua SPA
// (/admin-portal/gui-thu) van ra index.html. Truoc day ca hai deu ra index.html.
func TestAdminPortalAPIKhongCoTra404JSON(t *testing.T) {
	s := &adapterServer{log: testLogger(), gmDist: distGMFS}
	mux := http.NewServeMux()
	s.mountAdminPortal(mux)

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest("GET", "/admin-portal/api/khong-co", nil))
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Header().Get("Content-Type"), "json") {
		t.Fatalf("API la: muon 404 JSON, duoc %d %s", rec.Code, rec.Header().Get("Content-Type"))
	}
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest("POST", "/admin-portal/api/meta", nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("sai method tren API co that: muon 404, duoc %d", rec.Code)
	}
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest("GET", "/admin-portal/gui-thu", nil))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Header().Get("Content-Type"), "html") {
		t.Fatalf("duong trang SPA: muon 200 html, duoc %d %s", rec.Code, rec.Header().Get("Content-Type"))
	}
}
