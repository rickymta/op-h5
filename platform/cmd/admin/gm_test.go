package main

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/rickymta/op-h5/platform/internal/console"
)

// Chi cho phep cac loai kho do co trong danh sach: `bagType` di thang sang console, nen mot
// so la lot qua day la mot lenh xoa tren loai khong ai kiem tra.
func TestValidBagOnlyAcceptsKnownTypes(t *testing.T) {
	for _, k := range bagKinds {
		if !validBag(int(k.Type)) {
			t.Errorf("loai %d (%s) phai hop le", k.Type, k.Label)
		}
	}
	for _, bad := range []int{0, 9, 10, 11, 12, 14, 99, -1} {
		if validBag(bad) {
			t.Errorf("loai %d khong duoc chap nhan", bad)
		}
	}
}

// Console TU CHOI (loi nghiep vu) va console CHET phai ra hai ma khac nhau: cai dau nguoi
// truc sua duoc bang cach doi tham so, cai sau thi khong.
func TestGMErrorSeparatesRejectionFromOutage(t *testing.T) {
	rec := httptest.NewRecorder()
	gmError(rec, &console.RejectedError{Code: 1, Msg: "khong tim thay nhan vat"})
	if rec.Code != http.StatusConflict {
		t.Errorf("console tu choi -> muon 409, duoc %d", rec.Code)
	}

	rec = httptest.NewRecorder()
	gmError(rec, errors.New("dial tcp 127.0.0.1:9999: connect: connection refused"))
	if rec.Code != http.StatusBadGateway {
		t.Errorf("console chet -> muon 502, duoc %d", rec.Code)
	}
}

// Chua cau hinh console thi bao ro chu khong panic vi con tro nil.
func TestGMConsoleUnconfiguredIsExplained(t *testing.T) {
	s := &server{}
	rec := httptest.NewRecorder()
	if _, ok := s.gmConsole(rec); ok {
		t.Fatal("khong duoc bao la co console khi chua cau hinh")
	}
	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("muon 503, duoc %d", rec.Code)
	}
}

// Chuoi qua phai dung khuon type:id:count — cung khuon ma trang Goi dung.
func TestRewardPattern(t *testing.T) {
	ok := []string{"0:1:5000", "0:1:5000#3:100022:10", "3:100001:1"}
	bad := []string{"", "0:1", "0:1:5000#", "abc", "0:1:5000 #3:1:1", "0:1:-5"}
	for _, s := range ok {
		if !rewardRe.MatchString(s) {
			t.Errorf("%q phai hop le", s)
		}
	}
	for _, s := range bad {
		if rewardRe.MatchString(s) {
			t.Errorf("%q khong duoc hop le", s)
		}
	}
}
