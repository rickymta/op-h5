package textnorm

import "testing"

func TestFold(t *testing.T) {
	cases := map[string]string{
		"Kim Cương":     "kim cuong",
		"Thẻ tháng":     "the thang",
		"Đại Hải Trình": "dai hai trinh",
		"Quỹ sa hoa":    "quy sa hoa",
		"EXP anh hùng":  "exp anh hung",
		"ĐẶC QUYỀN":     "dac quyen",
		"10.000":        "10.000",
		"":              "",
		"Ưu đãi 50%":    "uu dai 50%",
		"Tỉ Ấn đúc lại": "ti an duc lai",
	}
	for in, want := range cases {
		if got := Fold(in); got != want {
			t.Errorf("Fold(%q) = %q, muon %q", in, got, want)
		}
	}

	// NFD — dau nam rieng thanh ky tu ket hop (mot so ban go tren macOS cho ra khuon nay).
	// Phai ra ket qua y het ban dung san (NFC), neu khong nguoi go tren may do se khong bao
	// gio tim thay goi nao. "Kim Cu" + U+031B U+0303 + "ong" = "Kim Cương" (dang NFD).
	nfd := "Kim Cu\u031bo\u031bng"
	if got := Fold(nfd); got != "kim cuong" {
		t.Errorf("Fold(NFD) = %q, muon %q", got, "kim cuong")
	}
	// U+031B (horn) cua "ơ"/"ư" cung phai bi bo: "Tu" + U+031B + " nhan" = "Tư nhân".
	if got := Fold("Tu\u031b nha\u0301n"); got != "tu nhan" {
		t.Errorf("Fold(NFD horn) = %q, muon %q", got, "tu nhan")
	}
}

func TestMatches(t *testing.T) {
	ok := []struct{ text, q string }{
		{"Kim Cương", "kim cuong"},
		{"10.000 Kim Cương", "KIM"},
		{"Thẻ tháng vinh diệu", "the thang"},
		{"Thẻ tháng vinh diệu", "thang the"}, // khong phu thuoc thu tu tu
		{"Quỹ đặc biệt", "dac biet"},
		{"Gói bất kỳ", ""},    // tu khoa rong khop tat ca
		{"Gói bất kỳ", "   "}, // chi khoang trang cung vay
		{"Thẻ tuần Đồ Đằng Thánh Điện", "do dang"},
	}
	for _, c := range ok {
		if !Matches(c.text, c.q) {
			t.Errorf("Matches(%q, %q) phai la true", c.text, c.q)
		}
	}
	no := []struct{ text, q string }{
		{"Kim Cương", "kim te"},
		{"Thẻ tháng", "the thang vinh"},
		{"Quỹ sa hoa", "quy sa hoaa"},
	}
	for _, c := range no {
		if Matches(c.text, c.q) {
			t.Errorf("Matches(%q, %q) phai la false", c.text, c.q)
		}
	}
}
