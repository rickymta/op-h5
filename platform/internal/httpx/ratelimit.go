package httpx

import (
	"sync"
	"time"
)

// Bo dem thung ro ri (token bucket) don gian, dung chung cho cac endpoint ton kem.
//
// Vi sao can: /api/game/session moi lan goi deu dang nhap login server VA giu mot cho
// trong cong chan tai. Mot nguoi bam lai lien tuc — hay mot client thu lai vong lap —
// vua lam phinh so lieu tai vua dap vao cum Java. Ve da khoa theo nguoi nen khong con
// dem trung, nhung so luot goi thi van khong gioi han.
//
// Khong dung thu vien ngoai: so khoa o day nho (theo nguoi dung dang nhap), va them mot
// phu thuoc cho mot cau truc 40 dong la khong dang.
type Limiter struct {
	// Rate la so luot cho phep moi Window.
	Rate int
	// Window la do dai cua so.
	Window time.Duration

	mu      sync.Mutex
	buckets map[string]*bucket
	lastGC  time.Time
}

type bucket struct {
	count int
	reset time.Time
}

func NewLimiter(rate int, window time.Duration) *Limiter {
	return &Limiter{Rate: rate, Window: window, buckets: map[string]*bucket{}}
}

// Allow bao co cho phep luot goi tiep theo cua `key` khong.
//
// Cua so co dinh chu khong truot: don gian hon va o day la du. Sai so xau nhat la cho
// qua 2*Rate luot trong mot khoang bang Window (ngay hai ben ranh gioi cua so) — voi
// muc dich chan bam lien tuc thi khong dang ke.
func (l *Limiter) Allow(key string) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()

	// Don dinh ky: khong don thi map phinh theo so nguoi dung da tung goi.
	if now.Sub(l.lastGC) > 10*l.Window {
		for k, b := range l.buckets {
			if now.After(b.reset) {
				delete(l.buckets, k)
			}
		}
		l.lastGC = now
	}

	b := l.buckets[key]
	if b == nil || now.After(b.reset) {
		l.buckets[key] = &bucket{count: 1, reset: now.Add(l.Window)}
		return true
	}
	if b.count >= l.Rate {
		return false
	}
	b.count++
	return true
}
