package main

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// /api/games hoi Adapter cua tung game; khong cache thi moi luot tai trang chinh la mot request
// vao tien trinh dang giu cong gioi han tai. Cache 30 s, va nhieu luot cung luc chi lay MOT lan.
func TestLiveStatsCachesFor30sAndCoalesces(t *testing.T) {
	var hits int64
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt64(&hits, 1)
		if r.URL.Path != "/api/game/servers" {
			t.Errorf("duong sai: %s", r.URL.Path)
		}
		time.Sleep(20 * time.Millisecond) // de cac luot song song thuc su chong len nhau
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"servers":[{"code":"s1","status":"running","online":120},
			{"code":"s2","status":"maintain","online":0},{"code":"s3","status":"running","online":30}],
			"online":150,"soft_total":1600,"utilization":9}`))
	}))
	defer srv.Close()

	now := time.Date(2026, 9, 5, 12, 0, 0, 0, time.Local)
	ls := newLiveStats(30*time.Second, 3*time.Second)
	ls.now = func() time.Time { return now }

	// 20 luot cung luc: mot luot lay, so con lai doi roi dung ket qua do.
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			res := ls.get(srv.URL)
			if !res.OK || res.Online != 150 || res.ServersOpen != 2 {
				t.Errorf("ket qua sai: %+v", res)
			}
		}()
	}
	wg.Wait()
	if n := atomic.LoadInt64(&hits); n != 1 {
		t.Fatalf("20 luot song song phai chi goi Adapter 1 lan, duoc %d", n)
	}

	// 29 s sau: van cache.
	now = now.Add(29 * time.Second)
	ls.get(srv.URL)
	if n := atomic.LoadInt64(&hits); n != 1 {
		t.Fatalf("trong 30 s khong duoc goi lai, duoc %d", n)
	}
	// 31 s sau: het han, goi lai.
	now = now.Add(2 * time.Second)
	ls.get(srv.URL)
	if n := atomic.LoadInt64(&hits); n != 2 {
		t.Fatalf("qua 30 s phai goi lai, duoc %d", n)
	}
	// Dia chi khac la cache khac.
	ls.get(srv.URL + "/")
	if n := atomic.LoadInt64(&hits); n != 2 {
		t.Fatalf("cung dia chi (khac dau / cuoi) phai dung chung cache, duoc %d", n)
	}
}

// Adapter chet hoac tra rac -> live=false, online=0, va cung duoc cache de khong treo moi luot.
func TestLiveStatsFailureIsNotLive(t *testing.T) {
	var hits int64
	bad := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		atomic.AddInt64(&hits, 1)
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer bad.Close()
	ls := newLiveStats(30*time.Second, 200*time.Millisecond)
	for i := 0; i < 3; i++ {
		if res := ls.get(bad.URL); res.OK || res.Online != 0 {
			t.Fatalf("Adapter tra 502 ma van live: %+v", res)
		}
	}
	if n := atomic.LoadInt64(&hits); n != 1 {
		t.Errorf("ket qua hong cung phai duoc cache, goi %d lan", n)
	}
	// Khong co dia chi (adapter_url rong) va dia chi khong ai nghe.
	if res := ls.get(""); res.OK {
		t.Error("adapter_url rong khong the live")
	}
	if res := ls.get("http://127.0.0.1:1"); res.OK {
		t.Error("cong dong khong the live")
	}
}

// ?game=all / ?kind=all / gia tri la deu la "khong loc"; limit ke giua 1 va 50.
func TestParseNewsQuery(t *testing.T) {
	cases := []struct {
		raw        string
		game, kind string
		limit      int
	}{
		{"", "", "", 10},
		{"game=all&kind=all", "", "", 10},
		{"game=haitac&kind=event&limit=5", "haitac", "event", 5},
		{"game=haitac&kind=khac&limit=500", "haitac", "", 50},
		{"kind=notice&limit=0", "", "notice", 10},
		{"limit=abc", "", "", 10},
		{"game=%20tamquoc%20", "tamquoc", "", 10},
	}
	for _, c := range cases {
		q, _ := url.ParseQuery(c.raw)
		game, kind, limit := parseNewsQuery(q)
		if game != c.game || kind != c.kind || limit != c.limit {
			t.Errorf("%q -> (%q,%q,%d), muon (%q,%q,%d)", c.raw, game, kind, limit, c.game, c.kind, c.limit)
		}
	}
}
