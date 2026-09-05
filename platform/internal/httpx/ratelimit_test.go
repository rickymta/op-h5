package httpx

import (
	"strconv"
	"sync"
	"testing"
	"time"
)

func TestLimiterAllowsRateThenBlocks(t *testing.T) {
	l := NewLimiter(3, time.Minute)
	for i := range 3 {
		if !l.Allow("u1") {
			t.Fatalf("luot %d phai duoc cho qua", i+1)
		}
	}
	if l.Allow("u1") {
		t.Fatal("luot thu 4 phai bi chan")
	}
	// Khoa khac khong bi anh huong.
	if !l.Allow("u2") {
		t.Fatal("nguoi khac khong duoc dinh gioi han cua u1")
	}
}

func TestLimiterResetsAfterWindow(t *testing.T) {
	l := NewLimiter(1, 40*time.Millisecond)
	if !l.Allow("u1") || l.Allow("u1") {
		t.Fatal("cua so dau phai cho 1 va chan 1")
	}
	time.Sleep(60 * time.Millisecond)
	if !l.Allow("u1") {
		t.Fatal("qua cua so thi phai cho lai")
	}
}

// Chay song song khong duoc vuot han muc — day la bo dem dung chung giua cac request.
func TestLimiterIsSafeUnderConcurrency(t *testing.T) {
	l := NewLimiter(10, time.Minute)
	var (
		wg      sync.WaitGroup
		mu      sync.Mutex
		allowed int
	)
	for range 100 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if l.Allow("u1") {
				mu.Lock()
				allowed++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if allowed != 10 {
		t.Fatalf("cho qua %d luot, han muc la 10", allowed)
	}
}

func TestLimiterCleansUpOldKeys(t *testing.T) {
	l := NewLimiter(1, 10*time.Millisecond)
	for i := range 50 {
		l.Allow(strconv.Itoa(i))
	}
	time.Sleep(150 * time.Millisecond)
	l.Allow("moi") // lan goi nay kich hoat don dep
	l.mu.Lock()
	n := len(l.buckets)
	l.mu.Unlock()
	if n > 1 {
		t.Fatalf("con %d khoa cu trong bo dem, phai duoc don", n)
	}
}
