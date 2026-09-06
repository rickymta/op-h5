package catalog

// Slug cua bai viet (news.slug, migration 0012): phan doc duoc trong URL /tin-tuc/<slug>.
//
// Dung chung cho ba dich vu: `admin` sinh slug khi nguoi truc de trong o do, `id` va `adapter`
// tra cuu bai theo slug. Bo dau tieng Viet dung LAI internal/textnorm — viet ham bo dau thu
// hai la cach chac chan nhat de hai cho lech nhau (cho nay ra "tieu-de", cho kia ra "ti-u-d")
// va bai tro thanh khong mo duoc.

import (
	"regexp"
	"strings"

	"github.com/rickymta/op-h5/platform/internal/textnorm"
)

// MaxSlugLen bang do dai cot news.slug. Cat o day chu khong de MySQL cat: MySQL o che do
// nghiem se BAO LOI thay vi cat, con che do long thi cat giua mot tu.
const MaxSlugLen = 96

// newsSlugRe: slug di thang vao duong dan URL nen chi nhan chu thuong, so va gach ngang, va
// phai bat dau bang chu hoac so (khong de '-' dan dau — '/tin-tuc/-abc' trong nhu loi go).
var newsSlugRe = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,95}$`)

// slugShape kiem KY TU thoi. Dung khi TRA CUU: mot slug toan chu so co the da lot vao bang
// tu file seed hay ban dump cu, va bai do van phai mo duoc.
func slugShape(s string) bool { return newsSlugRe.MatchString(s) }

func allDigits(s string) bool {
	if s == "" {
		return false
	}
	return strings.IndexFunc(s, func(r rune) bool { return r < '0' || r > '9' }) < 0
}

// ValidNewsSlug kiem slug NGUOI GO NHAP o trang quan tri.
//
// Chat hon slugShape mot diem: khong nhan slug toan chu so. Duong dan /tin-tuc/{khoa} tra id
// TRUOC roi moi toi slug, nen slug "2026" se bi bai co id 2026 che mat — dat duoc nhung khong
// bao gio mo ra dung bai. Chan ngay luc nhap de nguoi truc biet, thay vi de ho phat hien sau.
func ValidNewsSlug(s string) bool { return slugShape(s) && !allDigits(s) }

// MakeSlug sinh slug tu tieu de: bo dau, ha chu thuong, moi cum ky tu khong phai chu/so thanh
// mot dau '-'. "Ví Xu dùng chung cho mọi game" -> "vi-xu-dung-chung-cho-moi-game".
//
// Tra ve rong khi tieu de khong con ky tu nao dung duoc (tieu de toan chu Han hay emoji chang
// han) — ben goi tu quyet dinh lay gi thay the.
func MakeSlug(title string) string {
	var b strings.Builder
	b.Grow(len(title))
	dash := false // dang cho ghi mot '-' -> gop nhieu ky tu la lien nhau thanh mot gach
	for _, r := range textnorm.Fold(title) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			dash = false
			continue
		}
		if !dash && b.Len() > 0 {
			b.WriteByte('-')
			dash = true
		}
	}
	// Tu day tro di chuoi chi con [a-z0-9-] nen moi byte la mot ky tu: cat theo byte an toan.
	s := strings.Trim(b.String(), "-")
	if len(s) > MaxSlugLen {
		s = s[:MaxSlugLen]
		// Lui ve dau gach gan nhat de khong cat cut mot tu ("...cho-moi-ga").
		if i := strings.LastIndexByte(s, '-'); i > 0 {
			s = s[:i]
		}
		s = strings.Trim(s, "-")
	}
	if s == "" {
		return ""
	}
	// Tieu de toan chu so ("2026") cho ra slug bi id che mat — xem ValidNewsSlug.
	if allDigits(s) {
		s = "tin-" + s
		if len(s) > MaxSlugLen {
			s = s[:MaxSlugLen]
		}
	}
	return s
}
