package gameacct

import (
	"encoding/json"
	"testing"
)

func sessWith(raw string) *AccountSession {
	return &AccountSession{Raw: json.RawMessage(raw)}
}

func TestHasCharacters(t *testing.T) {
	cases := []struct {
		ten  string
		raw  string
		muon bool
	}{
		{"khong co truong", `{"token":"t"}`, false},
		{"mang rong", `{"masterList":[]}`, false},
		{"co mot nhan vat", `{"masterList":[{"srvCode":"s1"}]}`, true},
		{"null", `{"masterList":null}`, false},
		{"JSON hong", `khong-phai-json`, false},
	}
	for _, c := range cases {
		if got := sessWith(c.raw).HasCharacters(); got != c.muon {
			t.Errorf("%s: duoc %v, muon %v", c.ten, got, c.muon)
		}
	}
	if (*AccountSession)(nil).HasCharacters() {
		t.Error("nil phai tra ve false chu khong duoc panic")
	}
}

func TestServerCodesReadsKnownKeys(t *testing.T) {
	cases := []struct {
		ten  string
		raw  string
		muon []string
	}{
		{"srvCode", `{"masterList":[{"srvCode":"s1"},{"srvCode":"s3"}]}`, []string{"s1", "s3"}},
		{"code", `{"masterList":[{"code":"s2","roleName":"a"}]}`, []string{"s2"}},
		{"trung nhau chi lay mot", `{"masterList":[{"srvCode":"s1"},{"srvCode":"s1"}]}`, []string{"s1"}},
		{"khuon la khong doan duoc", `{"masterList":[{"zzz":"s1"}]}`, nil},
		{"gia tri rong bi bo", `{"masterList":[{"srvCode":""}]}`, nil},
		{"phan tu khong phai object", `{"masterList":["s1"]}`, nil},
	}
	for _, c := range cases {
		got := sessWith(c.raw).ServerCodes()
		if len(got) != len(c.muon) {
			t.Errorf("%s: duoc %v, muon %v", c.ten, got, c.muon)
			continue
		}
		for i := range got {
			if got[i] != c.muon[i] {
				t.Errorf("%s: duoc %v, muon %v", c.ten, got, c.muon)
				break
			}
		}
	}
}

// WebSocketURL phai giu duong dan ma login server tra ve.
//
// Login server THAT tra ve path="game" (khong co dau /), tuc la client phai noi toi
// ws://host:8001/game. Bo qua truong do thi bat tay WebSocket that bai — va ban gia lap
// truoc day khong tra path nen loi nay bi giau cho den lan chay voi JAR that.
func TestWebSocketURLKeepsPath(t *testing.T) {
	port := 8001
	yes := true
	np := NetProcess{Scheme: "ws", Host: Host{LAN: "127.0.0.1"}, Port: &port, Path: "game"}

	if got := np.WebSocketURL("", false); got != "ws://127.0.0.1:8001/game" {
		t.Fatalf("duoc %q", got)
	}
	if got := np.WebSocketURL("haitac.example.com", false); got != "ws://haitac.example.com:8001/game" {
		t.Fatalf("ghi de host: duoc %q", got)
	}
	np.SSL = &yes
	if got := np.WebSocketURL("haitac.example.com", false); got != "wss://haitac.example.com:8001/game" {
		t.Fatalf("ssl: duoc %q", got)
	}

	// Khong co path thi khong duoc de lai dau / thua.
	np2 := NetProcess{Scheme: "ws", Host: Host{LAN: "127.0.0.1"}, Port: &port}
	if got := np2.WebSocketURL("", false); got != "ws://127.0.0.1:8001" {
		t.Fatalf("khong path: duoc %q", got)
	}
	// Path co dau / o hai dau cung phai ra dung mot dau /.
	np3 := NetProcess{Scheme: "ws", Host: Host{LAN: "h"}, Port: &port, Path: "/game/"}
	if got := np3.WebSocketURL("", false); got != "ws://h:8001/game" {
		t.Fatalf("path co dau /: duoc %q", got)
	}
}
