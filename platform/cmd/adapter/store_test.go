package main

import (
	"bytes"
	"html/template"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/rickymta/op-h5/platform/internal/wallet"
)

func testLogger() *slog.Logger { return slog.New(slog.NewTextHandler(io.Discard, nil)) }

// Template phai parse duoc va render duoc voi du lieu that; loi template chi lo luc chay
// (ExecuteTemplate) nen phai co test, khong thi trang trang khong bao gi.
func TestStoreTemplateRenders(t *testing.T) {
	tpl, err := template.ParseFS(templatesFS, "templates/*.html")
	if err != nil {
		t.Fatalf("parse templates: %v", err)
	}
	cats := []catView{{Key: "diamond", Title: "Nguyên Bảo", Hint: "x2", Packages: []pkgView{
		{ID: "18001", Name: "10.000 Nguyên Bảo", Category: "diamond", GrantMode: "pay", PriceXu: 10000, PriceFmt: "10.000",
			Badge: "x2 lần đầu", Description: "Nhận 10.000", Cond: "3 lần/ngày"},
	}}}
	orders := []orderView{{ID: 1, Name: "10.000 Nguyên Bảo", SrvCode: "s1", AmountFmt: "10.000", Status: "pending", StatusVi: "Đang phát…"}}
	for _, data := range []map[string]any{
		{"User": "", "Servers": []srvView{}, "IDBase": "http://id"},
		{"User": "an", "Servers": []srvView{{Code: "s1", Name: "S1"}}, "IDBase": "http://id",
			"Balance": int64(12345), "BalanceFmt": "12.345", "Categories": cats, "Orders": orders},
	} {
		var buf bytes.Buffer
		if err := tpl.ExecuteTemplate(&buf, "store.html", data); err != nil {
			t.Fatalf("render store.html (user=%q): %v", data["User"], err)
		}
		if data["User"] != "" && !strings.Contains(buf.String(), "10.000 Nguyên Bảo") {
			t.Errorf("trang dang nhap phai hien goi")
		}
	}
}

func TestCondText(t *testing.T) {
	cases := []struct {
		in   wallet.Package
		want string
	}{
		{wallet.Package{}, ""},
		{wallet.Package{ServerDayMin: 1, ServerDayMax: 14, DailyLimit: 3}, "ngày 1–14 sau mở máy chủ · 3 lần/ngày"},
		{wallet.Package{ServerDayMin: 31, ServerDayMax: 999, VipRequired: 2}, "từ ngày 31 sau mở máy chủ · VIP ≥ 2"},
		{wallet.Package{ServerDayMin: 1, ServerDayMax: 999}, ""},
	}
	for _, c := range cases {
		if got := condText(c.in); got != c.want {
			t.Errorf("condText(%+v) = %q, muon %q", c.in, got, c.want)
		}
	}
}

// Duong apisv.php: khong phai loopback -> "false", KHONG dung DB (s.db nil o day) va khong 500.
func TestLegacyChargeRejectsNonLoopback(t *testing.T) {
	s := &adapterServer{log: testLogger()}
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/game/legacy/charge?payid=18001&user=id000000001", nil)
	req.RemoteAddr = "203.0.113.9:4444"
	s.legacyCharge(rec, req)
	if rec.Code != 200 || rec.Body.String() != "false" {
		t.Fatalf("muon 200 'false', duoc %d %q", rec.Code, rec.Body.String())
	}
	// X-Forwarded-For chi duoc tin khi request den tu loopback: gia mao tu ngoai van bi chan.
	rec = httptest.NewRecorder()
	req.Header.Set("X-Forwarded-For", "127.0.0.1")
	s.legacyCharge(rec, req)
	if rec.Body.String() != "false" {
		t.Fatalf("XFF gia mao tu ngoai phai bi chan, duoc %q", rec.Body.String())
	}
}

// Duong api.php: chua dang nhap -> "false" (client so sanh chuoi, khong doc JSON).
func TestLegacyCheckWithoutSession(t *testing.T) {
	s := &adapterServer{log: testLogger()}
	rec := httptest.NewRecorder()
	s.legacyCheck(rec, httptest.NewRequest(http.MethodGet, "/api/game/legacy/check?payid=18001", nil))
	if rec.Body.String() != "false" || !strings.HasPrefix(rec.Header().Get("Content-Type"), "text/plain") {
		t.Fatalf("muon text/plain 'false', duoc %q %q", rec.Header().Get("Content-Type"), rec.Body.String())
	}
}
