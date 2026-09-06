package main

import (
	"strings"
	"testing"
)

func ptr(s string) *string { return &s }

// Kiem tra dau vao cua trang noi dung: slug di thang vao URL, tieu de bat buoc, van ban thuan.
func TestPageInputValidate(t *testing.T) {
	v, err := pageInput{Slug: " Dieu-Khoan ", Title: " Điều khoản sử dụng ",
		Body: "## Chung\n\n- Một\n- Hai"}.validate()
	if err != nil {
		t.Fatalf("trang hop le bi tu choi: %v", err)
	}
	if v.Slug != "dieu-khoan" || v.Title != "Điều khoản sử dụng" || v.GameCode != "" {
		t.Errorf("chuan hoa sai: %+v", v)
	}

	v, err = pageInput{Slug: "faq", GameCode: ptr("haitac"), Title: "Câu hỏi", Body: ""}.validate()
	if err != nil || v.GameCode != "haitac" {
		t.Errorf("trang rieng cua game phai nhan duoc: %+v %v", v, err)
	}

	bad := []pageInput{
		{Slug: "", Title: "x"},
		{Slug: "Dieu Khoan", Title: "x"},              // co khoang trang
		{Slug: "-dau-gach", Title: "x"},               // bat dau bang gach
		{Slug: strings.Repeat("a", 65), Title: "x"},   // qua dai
		{Slug: "ok", Title: ""},                       // thieu tieu de
		{Slug: "ok", Title: strings.Repeat("t", 161)}, // tieu de qua dai
		{Slug: "ok", Title: "x", Body: strings.Repeat("b", 100001)},
		{Slug: "ok", Title: "x", GameCode: ptr("Hai Tac")}, // ma game sai khuon
		{Slug: "ok", Title: "x", Body: "<SCRIPT>alert(1)</script>"},
	}
	for i, in := range bad {
		if _, err := in.validate(); err == nil {
			t.Errorf("truong hop %d phai bi tu choi: %+v", i, in)
		}
	}
}

// Thong bao loi tren form dang nhap phai lay tu bang tra cuu, khong lay thang tu URL —
// nguoc lai thi mot lien ket /dang-nhap?loi=<cau du> dat duoc chu la len trang that.
func TestLoginErrorsAreLookedUp(t *testing.T) {
	if loginErrors["1"] == "" || loginErrors["nhieu"] == "" {
		t.Fatalf("thieu thong bao cho ma loi da dung")
	}
	if loginErrors["Tài khoản của bạn bị khoá, gọi 0900..."] != "" {
		t.Errorf("ma loi la khong biet phai ra chuoi rong")
	}
}
