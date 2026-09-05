package main

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"
)

// fakeAttempts thay bang admin_login_attempts de kiem thu phan quyet dinh ma khong can MySQL.
// Giu dung ngu nghia cua ban SQL: dang nhap thanh cong KHONG xoa cac lan sai truoc do
// (ban SQL chi them mot dong succeeded=1, ma cau dem chi dem succeeded=0).
type fakeAttempts struct {
	fails  map[string]int
	pruned bool
	err    error
}

func newFakeAttempts() *fakeAttempts { return &fakeAttempts{fails: map[string]int{}} }

func (f *fakeAttempts) failures(_ context.Context, scope, key string, _ time.Duration) (int, error) {
	if f.err != nil {
		return 0, f.err
	}
	return f.fails[scope+":"+key], nil
}

func (f *fakeAttempts) record(_ context.Context, scope, key string, ok bool) {
	if !ok {
		f.fails[scope+":"+key]++
	}
}

func (f *fakeAttempts) prune(context.Context, time.Duration) { f.pruned = true }

func testGuard() (*loginGuard, *fakeAttempts) {
	f := newFakeAttempts()
	return &loginGuard{store: f, max: 8, window: 15 * time.Minute}, f
}

// Dem theo TEN DANG NHAP: doi IP van bi khoa, con tai khoan khac thi khong lien quan.
func TestLoginGuardBlocksByUsername(t *testing.T) {
	g, _ := testGuard()
	ctx := context.Background()
	for i := 0; i < 7; i++ {
		if g.blocked(ctx, "quantri", "203.0.113.5") {
			t.Fatalf("moi %d lan sai da bi khoa", i)
		}
		g.record(ctx, "quantri", "203.0.113.5", false)
	}
	if g.blocked(ctx, "quantri", "203.0.113.5") {
		t.Fatalf("7 lan sai chua du nguong 8")
	}
	g.record(ctx, "quantri", "203.0.113.5", false)
	if !g.blocked(ctx, "quantri", "203.0.113.5") {
		t.Fatalf("8 lan sai phai bi khoa")
	}
	// Doi may khac van khoa: bo dem gan voi ten dang nhap chu khong chi voi IP.
	if !g.blocked(ctx, "quantri", "198.51.100.9") {
		t.Errorf("doi IP van phai bi khoa theo ten dang nhap")
	}
	// Tai khoan khac tu mot IP sach thi khong bi va lay.
	if g.blocked(ctx, "nhanvien", "198.51.100.9") {
		t.Errorf("tai khoan khac khong duoc bi khoa lay")
	}
	// Chu hoa/thuong va khoang trang thua la cung mot khoa.
	if !g.blocked(ctx, "  QuanTri ", "198.51.100.9") {
		t.Errorf("ten dang nhap phai duoc chuan hoa truoc khi dem")
	}
}

// Dem theo IP: quet nhieu tai khoan tu mot may cung bi chan, ke ca tai khoan chua tung thu.
func TestLoginGuardBlocksByIP(t *testing.T) {
	g, _ := testGuard()
	ctx := context.Background()
	for i := 0; i < 8; i++ {
		g.record(ctx, fmt.Sprintf("nan_nhan_%d", i), "203.0.113.7", false)
	}
	if !g.blocked(ctx, "chua_tung_thu", "203.0.113.7") {
		t.Fatalf("8 lan sai tu mot IP phai chan chinh IP do")
	}
	if g.blocked(ctx, "chua_tung_thu", "203.0.113.8") {
		t.Errorf("IP khac khong duoc bi chan")
	}
}

// Dang nhap thanh cong thi don bang dem cu; loi doc bo dem thi CHO QUA (mot truc trac DB
// khong duoc bien thanh "khong ai dang nhap duoc" — buoc xac thuc ngay sau do cung se hong).
func TestLoginGuardSuccessPrunesAndErrorFailsOpen(t *testing.T) {
	g, f := testGuard()
	ctx := context.Background()
	g.record(ctx, "quantri", "203.0.113.5", true)
	if !f.pruned {
		t.Errorf("dang nhap thanh cong phai don cac lan thu qua cu")
	}
	for i := 0; i < 20; i++ {
		g.record(ctx, "quantri", "203.0.113.5", false)
	}
	f.err = errors.New("mysql chet")
	if g.blocked(ctx, "quantri", "203.0.113.5") {
		t.Errorf("khong doc duoc bo dem thi phai cho qua")
	}
}

// max <= 0 (hoac guard nil) = tat han lop nay, khong bao gio chan.
func TestLoginGuardDisabled(t *testing.T) {
	f := newFakeAttempts()
	f.fails["username:quantri"] = 1000
	g := &loginGuard{store: f, max: 0, window: time.Minute}
	if g.blocked(context.Background(), "quantri", "203.0.113.5") {
		t.Errorf("max=0 phai tat viec chan")
	}
	var nilGuard *loginGuard
	if nilGuard.blocked(context.Background(), "quantri", "1.2.3.4") {
		t.Errorf("guard nil phai cho qua")
	}
	nilGuard.record(context.Background(), "quantri", "1.2.3.4", false) // khong duoc panic
}

// Mo trang quan tri ra Internet voi mat khau mac dinh trong ma nguon cong khai = dung han.
func TestPublicGuardError(t *testing.T) {
	if err := publicGuardError(false, []string{"admin"}); err != nil {
		t.Errorf("ADMIN_PUBLIC=0 thi khong chan: %v", err)
	}
	if err := publicGuardError(true, nil); err != nil {
		t.Errorf("khong con tai khoan dung mat khau mac dinh thi khong chan: %v", err)
	}
	err := publicGuardError(true, []string{"admin", "owner2"})
	if err == nil {
		t.Fatalf("ADMIN_PUBLIC=1 + mat khau mac dinh phai bi chan")
	}
	msg := err.Error()
	for _, want := range []string{"admin", "owner2", "ADMIN_PUBLIC=0", "ADMIN_BOOTSTRAP_PASSWORD"} {
		if !strings.Contains(msg, want) {
			t.Errorf("thong bao loi phai noi ro cach sua, thieu %q: %s", want, msg)
		}
	}
}

// Khoa dai qua cot VARCHAR(190) phai bi cat, khong thi INSERT hong va bo dem im lang chet.
func TestTruncKey(t *testing.T) {
	if got := truncKey(strings.Repeat("a", 300)); len(got) != 190 {
		t.Errorf("truncKey cat sai: %d", len(got))
	}
	if got := truncKey("quantri"); got != "quantri" {
		t.Errorf("khoa ngan phai giu nguyen: %q", got)
	}
}
