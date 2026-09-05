package main

import (
	"encoding/json"
	"io"
	"log/slog"
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
