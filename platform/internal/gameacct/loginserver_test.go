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
