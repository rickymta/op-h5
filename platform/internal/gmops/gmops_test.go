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

// Danh muc phai nap duoc va tra dung ten nguoi choi NHIN THAY.
//
// Tuong: kiem chinh xac ten — day la chot chan cho loi "doc cot *英雄名" (ten cua ban goc
// truoc khi thay ao): 1:401301 ma ra "Chuc Dung" la doc sai cot. Vat pham: chi kiem CO ten
// va khong con chu Han, khong ghim chuoi — ten vat pham lay theo client (e41d043) va con
// duoc chuan hoa lai theo bang thuat ngu, ghim chuoi la test do moi lan doi loi dich.
func TestDanhMucKhopGameDangChay(t *testing.T) {
	// Ten One Piece cua client (tu 2026-09-06 may chu cung da dong bo theo client): ra
	// "Hoang Dung"/"Truong Vo Ky" la con doc bang cua ban kiem hiep.
	tuong := map[int64]string{401301: "Aokiji", 500801: "Mihawk", 401601: "Sengoku"}
	for ma, muon := range tuong {
		if got := TenMuc(1, ma); got != muon {
			t.Errorf("TenMuc(1, %d) = %q, muon %q", ma, got, muon)
		}
	}
	for _, sai := range []string{"Chúc Dung", "Hình Thiên", "Mụ Tổ", "Hoàng Dung", "Trương Vô Kỵ"} {
		for _, m := range TimDanhMuc(sai, 1, 5) {
			if m.Ten == sai {
				t.Errorf("danh muc con ten ban goc %q (ma %d) — doc nham cot *英雄名", sai, m.Ma)
			}
		}
	}
	co := [][2]int64{{0, 1}, {0, 16}, {2, 19000100}, {3, 100001}, {3, 100022}, {4, 606001}, {5, 5}, {6, 30001}, {7, 55000101},
		{13, 30101}, {14, 300101}, {16, 101101}, {20, 10001}}
	for _, c := range co {
		ten := TenMuc(int(c[0]), c[1])
		if ten == "" {
			t.Errorf("TenMuc(%d, %d) rong", c[0], c[1])
		}
		for _, r := range ten {
			if r >= 0x4E00 && r <= 0x9FFF {
				t.Errorf("TenMuc(%d, %d) = %q con chu Han", c[0], c[1], ten)
				break
			}
		}
	}
}

func TestTimDanhMuc(t *testing.T) {
	// Tim theo ten khong dau — nguoi truc go nhanh thi khong bo dau.
	ra := TimDanhMuc("kim cuong", 0, 10)
	if len(ra) == 0 || ra[0].Ten != "Kim cương" {
		t.Fatalf("tim 'kim cuong' ra %+v", ra)
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
	// Than khi doc quyen tim duoc theo TEN TUONG (qua cot phu): "black beard" -> "Trái Yami"
	// cap 1 dung dau nhom 7, va manh cua no o nhom 8.
	ra = TimDanhMuc("black beard", 7, 5)
	if len(ra) == 0 || ra[0].Ten != "Trái Yami" || ra[0].Ma != 48000101 || ra[0].Phu != "Black Beard · cấp 1" {
		t.Fatalf("tim than khi theo ten tuong ra %+v", ra)
	}
	if ra := TimDanhMuc("black beard", 8, 5); len(ra) == 0 || ra[0].Ma != 48000001 {
		t.Fatalf("tim manh than khi theo ten tuong ra %+v", ra)
	}
	// Ten mon do van la duong chinh: "trai yami" bat dau bang -> xep truoc moi ket qua "chua".
	if ra := TimDanhMuc("trai yami", 0, 5); len(ra) == 0 || ra[0].Ma != 48000101 {
		t.Fatalf("tim 'trai yami' ra %+v", ra)
	}
	// Duyet mot nhom khong tu khoa: tra trang dau + TONG that, de giao dien ghi "60/1440 mon".
	if out, tong := timDanhMuc("", 16, 60); len(out) != 60 || tong != 1440 {
		t.Fatalf("duyet nhom 16: %d dong, tong %d (muon 60, 1440)", len(out), tong)
	}
}

// Hai duong tra cuu phai chay duoc that, khong chi ham ben trong: tra JSON dung khoa ma
// giao dien doc, va tu choi chuoi qua sai dinh dang thay vi tra ve mot danh sach rong.
func TestCatalogVaDocQuaQuaHTTP(t *testing.T) {
	s := &Service{GameCode: "haitac"}

	rec := httptest.NewRecorder()
	s.Catalog(rec, httptest.NewRequest("GET", "/api/catalog?q=kim+cuong&limit=5", nil), Actor{})
	if rec.Code != http.StatusOK {
		t.Fatalf("catalog -> %d", rec.Code)
	}
	var ra struct {
		Muc []MucDanhMuc `json:"muc"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ra); err != nil {
		t.Fatalf("doc JSON catalog: %v", err)
	}
	if len(ra.Muc) == 0 || ra.Muc[0].Ten != "Kim cương" {
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
	if len(rb.Mon) != 2 || rb.Mon[0].Ten != "Kim cương" || rb.Mon[1].Ten == "" || rb.Mon[1].Ten != TenMuc(3, 100022) {
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
