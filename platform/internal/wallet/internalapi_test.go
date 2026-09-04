package wallet

import (
	"errors"
	"strconv"
	"testing"
	"time"
)

func TestSignVerifyRoundTrip(t *testing.T) {
	const secret = "khoa-chung-giua-php-va-id"
	body := []byte(`{"username":"thuyentruong","amount":100000}`)
	ts := time.Now().Unix()
	sig := Sign(secret, ts, body)

	if err := VerifySignature(secret, strconv.FormatInt(ts, 10), sig, body); err != nil {
		t.Errorf("chu ky dung phai duoc chap nhan: %v", err)
	}
}

func TestVerifyRejectsWrongSecret(t *testing.T) {
	body := []byte(`{"amount":1}`)
	ts := time.Now().Unix()
	sig := Sign("khoa-that", ts, body)

	err := VerifySignature("khoa-gia", strconv.FormatInt(ts, 10), sig, body)
	if !errors.Is(err, ErrSignatureInvalid) {
		t.Errorf("khoa sai phai bi tu choi, duoc %v", err)
	}
}

// Diem then chot: doi mot byte trong than request thi chu ky phai hong.
// Khong the sua so tien roi giu nguyen chu ky.
func TestVerifyRejectsTamperedBody(t *testing.T) {
	const secret = "s"
	ts := time.Now().Unix()
	sig := Sign(secret, ts, []byte(`{"amount":100}`))

	err := VerifySignature(secret, strconv.FormatInt(ts, 10), sig, []byte(`{"amount":999999}`))
	if !errors.Is(err, ErrSignatureInvalid) {
		t.Errorf("than request bi sua phai bi tu choi, duoc %v", err)
	}
}

// Chu ky cu bi phat lai phai bi chan boi cua so thoi gian.
func TestVerifyRejectsReplayOutsideWindow(t *testing.T) {
	const secret = "s"
	body := []byte(`{"amount":1}`)
	old := time.Now().Add(-MaxSkew - time.Minute).Unix()
	sig := Sign(secret, old, body)

	err := VerifySignature(secret, strconv.FormatInt(old, 10), sig, body)
	if !errors.Is(err, ErrTimestampSkew) {
		t.Errorf("chu ky qua cu phai bi tu choi, duoc %v", err)
	}
}

// Dong ho lech ve TUONG LAI cung phai bi chan, khong chi qua khu.
func TestVerifyRejectsFutureTimestamp(t *testing.T) {
	const secret = "s"
	body := []byte(`{"amount":1}`)
	future := time.Now().Add(MaxSkew + time.Minute).Unix()
	sig := Sign(secret, future, body)

	err := VerifySignature(secret, strconv.FormatInt(future, 10), sig, body)
	if !errors.Is(err, ErrTimestampSkew) {
		t.Errorf("timestamp o tuong lai phai bi tu choi, duoc %v", err)
	}
}

// Chu ky dung nhung gan voi timestamp khac -> khong khop.
func TestSignatureBoundToTimestamp(t *testing.T) {
	const secret = "s"
	body := []byte(`{"amount":1}`)
	ts := time.Now().Unix()
	sig := Sign(secret, ts, body)

	err := VerifySignature(secret, strconv.FormatInt(ts+1, 10), sig, body)
	if !errors.Is(err, ErrSignatureInvalid) {
		t.Errorf("chu ky phai gan voi timestamp, duoc %v", err)
	}
}

func TestVerifyRefusesWhenNotConfigured(t *testing.T) {
	if err := VerifySignature("", "1", "x", nil); !errors.Is(err, ErrNotConfigured) {
		t.Errorf("chua cau hinh khoa thi phai tu choi, duoc %v", err)
	}
}

func TestVerifyRejectsBadTimestampHeader(t *testing.T) {
	if err := VerifySignature("s", "khong-phai-so", "x", nil); err == nil {
		t.Error("X-Timestamp khong doc duoc phai bi tu choi")
	}
}
