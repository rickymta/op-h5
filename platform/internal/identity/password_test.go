package identity

import (
	"fmt"
	"strings"
	"testing"
)

func TestHashVerifyRoundTrip(t *testing.T) {
	h, err := HashPassword("matkhau-cua-thuyen-truong")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if !strings.HasPrefix(h, "$argon2id$v=19$m=65536,t=3,p=4$") {
		t.Errorf("dinh dang PHC sai: %s", h)
	}
	ok, err := VerifyPassword("matkhau-cua-thuyen-truong", h)
	if err != nil || !ok {
		t.Errorf("mat khau dung phai khop: ok=%v err=%v", ok, err)
	}
	ok, err = VerifyPassword("matkhau-sai", h)
	if err != nil {
		t.Errorf("mat khau sai khong duoc tra loi: %v", err)
	}
	if ok {
		t.Error("mat khau sai ma van khop")
	}
}

func TestSaltIsRandom(t *testing.T) {
	a, _ := HashPassword("cung-mot-mat-khau")
	b, _ := HashPassword("cung-mot-mat-khau")
	if a == b {
		t.Error("hai lan bam cung mat khau ra cung ket qua -> salt khong ngau nhien")
	}
}

func TestVerifyRejectsMalformedHash(t *testing.T) {
	bad := []string{
		"",
		"khong-phai-hash",
		"$argon2id$v=19$m=65536,t=3,p=4$chi-co-bon-phan",
		"$bcrypt$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA",            // sai thuat toan
		"$argon2id$v=13$m=65536,t=3,p=4$c2FsdA$aGFzaA",          // sai phien ban
		"$argon2id$v=19$m=65536,t=3,p=4$!!!khong-base64$aGFzaA", // salt hong
	}
	for _, h := range bad {
		ok, err := VerifyPassword("bat-ky", h)
		if ok {
			t.Errorf("chuoi bam hong %q ma van tra ve true", h)
		}
		if err == nil {
			t.Errorf("chuoi bam hong %q phai tra ve loi", h)
		}
	}
}

func TestNeedsRehash(t *testing.T) {
	cur, _ := HashPassword("abc")
	if NeedsRehash(cur) {
		t.Error("ban ghi vua bam bang tham so hien tai khong can bam lai")
	}
	// Tham so yeu hon (bo nho thap hon) -> phai bao can bam lai.
	weak := fmt.Sprintf("$argon2id$v=19$m=%d,t=1,p=1$c2FsdHNhbHRzYWx0c2ExMg$%s",
		16*1024, strings.Repeat("a", 43))
	if !NeedsRehash(weak) {
		t.Error("tham so yeu hon phai duoc bao can bam lai")
	}
	if !NeedsRehash("hong") {
		t.Error("chuoi hong phai duoc coi la can bam lai")
	}
}

// Mat khau rong van phai bam va xac minh duoc dung; viec cam mat khau rong la
// trach nhiem cua tang kiem tra dau vao, khong phai cua tang crypto.
func TestEmptyPassword(t *testing.T) {
	h, err := HashPassword("")
	if err != nil {
		t.Fatalf("HashPassword(\"\"): %v", err)
	}
	if ok, _ := VerifyPassword("", h); !ok {
		t.Error("mat khau rong phai khop voi chinh no")
	}
	if ok, _ := VerifyPassword("x", h); ok {
		t.Error("mat khau khac ma van khop voi hash cua chuoi rong")
	}
}

// Ban ghi di tru tu `web.user` mang bam bcrypt cua PHP: phai dang nhap duoc, va phai
// duoc danh dau can bam lai de lan dang nhap dau tien nang len Argon2id.
func TestVerifyAcceptsLegacyBcrypt(t *testing.T) {
	// bcrypt cost 10 cua mat khau "Mk-thu-nghiem-2026", sinh boi PHP password_hash().
	const hash = "$2y$10$S9wbQFhWWt9dkkIcQuBYvuZh7HQmmRo0EXeb69AvDVH.CTWPi9Ycm"
	const pass = "Mk-thu-nghiem-2026"

	ok, err := VerifyPassword(pass, hash)
	if err != nil || !ok {
		t.Fatalf("bam bcrypt phai xac thuc duoc: ok=%v err=%v", ok, err)
	}
	if bad, _ := VerifyPassword("sai-be-bet", hash); bad {
		t.Fatal("mat khau sai khong duoc cho qua")
	}
	if !NeedsRehash(hash) {
		t.Fatal("bam bcrypt phai duoc danh dau can bam lai sang Argon2id")
	}
}

// Chuoi rac khong duoc lam ham panic, va khong bao gio duoc tra ve true.
func TestVerifyRejectsGarbage(t *testing.T) {
	for _, h := range []string{"", "matkhauthO", "$2y$khong-phai-bcrypt", "$argon2id$hong"} {
		if ok, _ := VerifyPassword("bat-ky", h); ok {
			t.Fatalf("chuoi %q khong duoc cho qua", h)
		}
	}
}
