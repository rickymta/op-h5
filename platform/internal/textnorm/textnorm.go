// Package textnorm chuan hoa chu tieng Viet de tim kiem "khong dau".
//
// Vi sao lam o Go chu khong dua vao collation MySQL: bang `game_packages` dung
// utf8mb4_unicode_ci — collation do coi 'ê' KHAC 'e', nen `LIKE '%nguyen%'` khong bao gio
// khop "Nguyên Bảo". Doi collation cua bang la thay doi luoc do dung chung cho ca cum, va
// utf8mb4_general_ci cung khong bo dau tieng Viet cho 'ơ'/'ư'/'đ'. Bo goi hien tai chi vai
// nghin dong va da doc san trong bo nho de dung tab, nen loc o Go vua dung vua re.
package textnorm

import (
	"strings"
	"unicode"
)

// base anh xa mot chu cai co dau ve chu cai goc. Chi liet ke chu THUONG: Fold ha chu truoc.
var base = map[rune]rune{}

func init() {
	groups := map[rune]string{
		'a': "àáâãäåāăạảấầẩẫậắằẳẵặ",
		'e': "èéêëēẹẻẽếềểễệ",
		'i': "ìíîïĩịỉ",
		'o': "òóôõöōơọỏốồổỗộớờởỡợ",
		'u': "ùúûüũưụủứừửữự",
		'y': "ỳýỷỹỵÿ",
		'd': "đ",
	}
	for b, set := range groups {
		for _, r := range set {
			base[r] = b
		}
	}
}

// Fold ha chu thuong va bo dau tieng Viet: "Nguyên Bảo" -> "nguyen bao".
//
// Xu ly ca hai cach ma dau co the duoc ma hoa: mot ky tu dung san (NFC, 'ế') tra ve tu bang
// tren; dau ket hop rieng (NFD, 'e' + U+0301) bi bo qua o nhanh thu hai. Thieu nhanh thu hai
// thi chuoi go tu mot so ban go tieng Viet tren macOS se khong bao gio khop.
func Fold(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		r = unicode.ToLower(r)
		if m, ok := base[r]; ok {
			b.WriteRune(m)
			continue
		}
		if r >= 0x0300 && r <= 0x036F { // dau ket hop
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

// Matches cho biet chuoi tim (khong dau, khong phan biet hoa thuong) co khop van ban khong.
//
// Tach tu khoa thanh tung tu va doi CO DU: "the thang" khop "Thẻ tháng", ma "thang the" cung
// khop — nguoi go thuong khong nho dung thu tu. Tu khoa rong = khop tat ca.
func Matches(text, query string) bool {
	q := strings.Fields(Fold(query))
	if len(q) == 0 {
		return true
	}
	hay := Fold(text)
	for _, w := range q {
		if !strings.Contains(hay, w) {
			return false
		}
	}
	return true
}
