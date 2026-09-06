package gmops

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/rickymta/op-h5/platform/internal/console"
)

// Chi cho phep cac loai kho do co trong danh sach: `bagType` di thang sang console, nen mot
// so la lot qua day la mot lenh xoa tren loai khong ai kiem tra.
func TestValidBagOnlyAcceptsKnownTypes(t *testing.T) {
	for _, k := range BagKinds {
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
	fail(rec, &console.RejectedError{Code: 1, Msg: "khong tim thay nhan vat"})
	if rec.Code != http.StatusConflict {
		t.Errorf("console tu choi -> muon 409, duoc %d", rec.Code)
	}

	rec = httptest.NewRecorder()
	fail(rec, errors.New("dial tcp 127.0.0.1:9999: connect: connection refused"))
	if rec.Code != http.StatusBadGateway {
		t.Errorf("console chet -> muon 502, duoc %d", rec.Code)
	}
}

// Chua cau hinh console thi bao ro chu khong panic vi con tro nil.
func TestConsoleUnconfiguredIsExplained(t *testing.T) {
	rec := httptest.NewRecorder()
	if _, ok := (&Service{}).client(rec); ok {
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

// Danh muc phai nap duoc va tra dung ten cua game DANG CHAY. Ba mau duoi day lay tu kho do
// that tren may chu (console /role/bag/query, nhan vat s1/Duyen): neu ai do sinh lai danh
// muc tu cot `*英雄名` cua hero.xlsx thi 1:401301 se thanh "Chuc Dung" va test nay do.
func TestDanhMucKhopGameDangChay(t *testing.T) {
	mau := []struct {
		loai int
		ma   int64
		ten  string
	}{
		{0, 1, "Nguyên bảo"},
		{1, 401301, "Hoàng Dung"},
		{1, 500801, "Trương Vô Kỵ"},
		{2, 19000100, "Thô Chế"},
		{3, 100001, "Đan tiến giai"},
		{3, 100022, "Lệnh tướng cao cấp"},
		{4, 606001, "4 sao ngẫu nhiên mảnh vỡ"},
		{5, 5, "Cửu Dương Công"},
		{6, 30001, "Hồn ngọc ( Tiểu )"},
		{7, 55000101, "Cửu Âm Nội Lực"},
	}
	for _, m := range mau {
		if got := TenMuc(m.loai, m.ma); got != m.ten {
			t.Errorf("TenMuc(%d, %d) = %q, muon %q", m.loai, m.ma, got, m.ten)
		}
	}
}

func TestTimDanhMuc(t *testing.T) {
	// Tim theo ten khong dau — nguoi truc go nhanh thi khong bo dau.
	ra := TimDanhMuc("nguyen bao", 0, 10)
	if len(ra) == 0 || ra[0].Ten != "Nguyên bảo" {
		t.Fatalf("tim 'nguyen bao' ra %+v", ra)
	}
	// Tim theo ma: dong dau phai la dung ma do, khong phai mot ma bat dau bang no.
	ra = TimDanhMuc("100022", 0, 10)
	if len(ra) == 0 || ra[0].Ma != 100022 {
		t.Fatalf("tim '100022' ra %+v", ra)
	}
	// Loc theo nhom: chi tra ve dung loai duoc hoi.
	for _, m := range TimDanhMuc("a", 3, 20) {
		if m.Loai != 3 {
			t.Fatalf("loc loai=3 nhung tra ve loai %d", m.Loai)
		}
	}
	// Tu khoa rong khong duoc lam sap: tra ve mot trang dau de nguoi truc duyet.
	if len(TimDanhMuc("", 1, 5)) != 5 {
		t.Errorf("tu khoa rong phai tra du gioi han")
	}
}

// Hai duong tra cuu phai chay duoc that, khong chi ham ben trong: tra JSON dung khoa ma
// giao dien doc, va tu choi chuoi qua sai dinh dang thay vi tra ve mot danh sach rong.
func TestCatalogVaDocQuaQuaHTTP(t *testing.T) {
	s := &Service{GameCode: "haitac"}

	rec := httptest.NewRecorder()
	s.Catalog(rec, httptest.NewRequest("GET", "/api/catalog?q=nguyen+bao&limit=5", nil), Actor{})
	if rec.Code != http.StatusOK {
		t.Fatalf("catalog -> %d", rec.Code)
	}
	var ra struct {
		Muc []MucDanhMuc `json:"muc"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ra); err != nil {
		t.Fatalf("doc JSON catalog: %v", err)
	}
	if len(ra.Muc) == 0 || ra.Muc[0].Ten != "Nguyên bảo" {
		t.Errorf("catalog tra ve %+v", ra.Muc)
	}

	rec = httptest.NewRecorder()
	s.DocQua(rec, httptest.NewRequest("GET", "/api/reward?ma=0:1:5000%233:100022:10", nil), Actor{})
	var rb struct {
		Mon []MonQua `json:"mon"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &rb); err != nil {
		t.Fatalf("doc JSON reward: %v", err)
	}
	if len(rb.Mon) != 2 || rb.Mon[0].Ten != "Nguyên bảo" || rb.Mon[1].Ten != "Lệnh tướng cao cấp" {
		t.Fatalf("reward tra ve %+v", rb.Mon)
	}
	if rb.Mon[1].SoLuo != 10 || rb.Mon[1].Nhan != "Vật phẩm" {
		t.Errorf("mon thu hai: %+v", rb.Mon[1])
	}

	// Chuoi sai dinh dang: phai bao loi. Tra ve mang rong se khien trang hien "khong co mon
	// nao" — nguoi truc tuong minh go dung ma quy khong cho.
	rec = httptest.NewRecorder()
	s.DocQua(rec, httptest.NewRequest("GET", "/api/reward?ma=0-1-5000", nil), Actor{})
	if rec.Code != http.StatusBadRequest {
		t.Errorf("chuoi sai dinh dang -> muon 400, duoc %d", rec.Code)
	}
}
