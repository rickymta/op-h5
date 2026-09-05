// Package identity giu danh tinh nguoi dung: bam mat khau, tao/doc tai khoan,
// va dem so lan dang nhap sai.
package identity

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
)

// Tham so Argon2id. Chon theo khuyen nghi OWASP cho may nho: 64 MiB, 3 vong, 4 luong.
// Doi tham so KHONG lam hong ban ghi cu: chuoi bam mang theo tham so cua chinh no,
// va NeedsRehash() bao cho cho goi biet luc nao nen bam lai.
const (
	argonTime    uint32 = 3
	argonMemory  uint32 = 64 * 1024 // KiB
	argonThreads uint8  = 4
	argonKeyLen  uint32 = 32
	argonSaltLen        = 16
)

var (
	ErrInvalidHash  = errors.New("chuoi bam khong dung dinh dang")
	ErrIncompatible = errors.New("phien ban argon2 khong tuong thich")
)

// HashPassword tra ve chuoi PHC chuan:
//
//	$argon2id$v=19$m=65536,t=3,p=4$<salt b64>$<hash b64>
func HashPassword(password string) (string, error) {
	salt := make([]byte, argonSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("sinh salt: %w", err)
	}
	sum := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argonMemory, argonTime, argonThreads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(sum),
	), nil
}

type params struct {
	memory  uint32
	time    uint32
	threads uint8
	keyLen  uint32
}

func decodeHash(encoded string) (p params, salt, sum []byte, err error) {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return p, nil, nil, ErrInvalidHash
	}
	var version int
	if _, err = fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return p, nil, nil, ErrInvalidHash
	}
	if version != argon2.Version {
		return p, nil, nil, ErrIncompatible
	}
	if _, err = fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &p.memory, &p.time, &p.threads); err != nil {
		return p, nil, nil, ErrInvalidHash
	}
	if salt, err = base64.RawStdEncoding.Strict().DecodeString(parts[4]); err != nil {
		return p, nil, nil, ErrInvalidHash
	}
	if sum, err = base64.RawStdEncoding.Strict().DecodeString(parts[5]); err != nil {
		return p, nil, nil, ErrInvalidHash
	}
	p.keyLen = uint32(len(sum))
	return p, salt, sum, nil
}

// VerifyPassword so sanh khong phu thuoc thoi gian. Chuoi bam hong tra ve false
// kem loi, khong bao gio tra ve true.
func VerifyPassword(password, encoded string) (bool, error) {
	// Ban ghi di tru tu `web.user` mang bam bcrypt ($2a/$2b/$2y) do PHP tao.
	// Chap nhan o day de nguoi choi cu dang nhap duoc bang dung mat khau cu; ngay sau
	// do NeedsRehash() tra ve true (decodeHash khong doc duoc bcrypt) nen ban ghi tu
	// duoc nang len Argon2id o lan dang nhap dau tien.
	//
	// KHONG chap nhan mat khau dang tho o day: cong cu di tru da bam san truoc khi ghi,
	// va mo mot nhanh so sanh ban ro trong ham nay la moi cho ro ri ve sau.
	if strings.HasPrefix(encoded, "$2a$") || strings.HasPrefix(encoded, "$2b$") ||
		strings.HasPrefix(encoded, "$2y$") {
		err := bcrypt.CompareHashAndPassword([]byte(encoded), []byte(password))
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			return false, nil
		}
		return err == nil, err
	}

	p, salt, want, err := decodeHash(encoded)
	if err != nil {
		return false, err
	}
	got := argon2.IDKey([]byte(password), salt, p.time, p.memory, p.threads, p.keyLen)
	return subtle.ConstantTimeCompare(got, want) == 1, nil
}

// NeedsRehash cho biet ban ghi dang dung tham so yeu hon hien tai va nen duoc bam lai
// (goi sau khi VerifyPassword thanh cong).
func NeedsRehash(encoded string) bool {
	p, _, _, err := decodeHash(encoded)
	if err != nil {
		return true
	}
	return p.memory < argonMemory || p.time < argonTime || p.threads < argonThreads
}
