package grants

import "testing"

// backoff phai tang dan va co tran: console chet 10 phut thi khong duoc quay lien tuc,
// nhung cung khong duoc cho qua lau khien nguoi choi doi vat pham.
func TestBackoffGrowsAndCaps(t *testing.T) {
	prev := backoff(0)
	for i := 1; i < 12; i++ {
		d := backoff(i)
		if d < prev {
			t.Errorf("backoff(%d)=%v nho hon backoff(%d)=%v — phai tang dan", i, d, i-1, prev)
		}
		if d > 30*60*1e9 {
			t.Errorf("backoff(%d)=%v vuot tran 30 phut", i, d)
		}
		prev = d
	}
	if backoff(1) < 30*1e9 {
		t.Errorf("lan thu dau nen cho it nhat 30 giay, duoc %v", backoff(1))
	}
}

// MaxAttempts phai du lon de chiu duoc mot dot console chet, nhung huu han de lenh hong
// khong quay mai.
func TestMaxAttemptsIsBounded(t *testing.T) {
	if MaxAttempts < 3 || MaxAttempts > 20 {
		t.Errorf("MaxAttempts=%d nam ngoai khoang hop ly 3..20", MaxAttempts)
	}
}
