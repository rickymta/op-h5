package wallet

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"time"
)

// Xac thuc cho API nap tien noi bo.
//
// Vi sao khong dung OIDC token o day: ben goi la cac callback PHP cua cong thanh toan,
// chay server-to-server va khong co nguoi dung dang nhap. Chung chi can chung minh
// "toi biet khoa chung", nen HMAC tren than request la du va don gian hon nhieu so voi
// cap phat token cho tung tien trinh PHP.
//
// Ky theo cong thuc:  hex(HMAC_SHA256(secret, timestamp + "." + body))
// Dat vao header X-Timestamp va X-Signature.

var (
	ErrSignatureInvalid = errors.New("chữ ký không hợp lệ")
	ErrTimestampSkew    = errors.New("timestamp lệch quá xa")
	ErrNotConfigured    = errors.New("API nạp tiền nội bộ chưa được cấu hình")
)

// MaxSkew la cua so chap nhan lech thoi gian. Cua so nay vua chan phat lai request cu,
// vua chiu duoc chenh lech dong ho giua hai may.
const MaxSkew = 5 * time.Minute

// Sign tao chu ky cho mot than request.
func Sign(secret string, timestamp int64, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	fmt.Fprintf(mac, "%d.", timestamp)
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

// VerifySignature kiem tra chu ky va do lech thoi gian.
//
// So sanh bang hmac.Equal (khong phu thuoc thoi gian) chu khong bang ==: so sanh chuoi
// thong thuong thoat ra o byte dau tien khac nhau, do duoc bang thoi gian phan hoi.
func VerifySignature(secret, tsHeader, sigHeader string, body []byte) error {
	if secret == "" {
		return ErrNotConfigured
	}
	ts, err := strconv.ParseInt(tsHeader, 10, 64)
	if err != nil {
		return fmt.Errorf("X-Timestamp không đọc được: %w", err)
	}
	skew := time.Since(time.Unix(ts, 0))
	if skew < 0 {
		skew = -skew
	}
	if skew > MaxSkew {
		return ErrTimestampSkew
	}
	want := Sign(secret, ts, body)
	if !hmac.Equal([]byte(want), []byte(sigHeader)) {
		return ErrSignatureInvalid
	}
	return nil
}
