package main

// Chong do mat khau cho trang quan tri, va hai rao khi trang nay duoc mo ra Internet
// (hop dong dot 3 muc 5.3, lop 1-3).
//
// Boi canh: `admin` truoc gio chi nghe 127.0.0.1 va vao bang SSH tunnel, nen mot form dang
// nhap khong dem so lan sai la chap nhan duoc. Khi nginx cho `admin.<domain>` di vao thi
// khong con the: bat ky ai tren Internet cung go duoc form do. Ba lop o day:
//
//	1. Dem so lan sai theo TEN DANG NHAP va theo IP, khoa tam khi vuot nguong -> 429.
//	2. Cookie phien bat buoc Secure va rut con 4 gio khi ADMIN_PUBLIC=1.
//	3. Dung han luc khoi dong neu ADMIN_PUBLIC=1 ma tai khoan chu he thong con dung mat
//	   khau mac dinh — mat khau do nam trong ma nguon cua mot repo CONG KHAI.
//
// Cong nghe khong doi: van bind 127.0.0.1:8100. nginx la thu duy nhat noi ra ngoai.

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// attemptStore la bo dem lan dang nhap sai.
//
// Tach thanh giao dien de kiem thu duoc phan QUYET DINH (bao nhieu lan thi khoa, dem theo
// nhung khoa nao) ma khong can dung MySQL that.
type attemptStore interface {
	failures(ctx context.Context, scope, key string, window time.Duration) (int, error)
	record(ctx context.Context, scope, key string, ok bool)
	// prune xoa cac lan thu qua cu; goi thua thot, khong phai moi request.
	prune(ctx context.Context, keep time.Duration)
}

// sqlAttempts ghi vao bang admin_login_attempts (migration 0011).
//
// Bang RIENG, khong dung chung `login_attempts` cua nguoi choi: hai he tai khoan tach biet,
// va dung chung thi mot nguoi choi go sai mat khau se khoa nham tai khoan quan tri trung ten.
type sqlAttempts struct{ db *sql.DB }

func (s sqlAttempts) failures(ctx context.Context, scope, key string, window time.Duration) (int, error) {
	var n int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM admin_login_attempts
		 WHERE scope = ? AND scope_key = ? AND succeeded = 0
		   AND created_at > (NOW() - INTERVAL ? SECOND)`,
		scope, key, int(window.Seconds())).Scan(&n)
	return n, err
}

func (s sqlAttempts) record(ctx context.Context, scope, key string, ok bool) {
	v := 0
	if ok {
		v = 1
	}
	_, _ = s.db.ExecContext(ctx,
		`INSERT INTO admin_login_attempts (scope, scope_key, succeeded) VALUES (?,?,?)`, scope, key, v)
}

func (s sqlAttempts) prune(ctx context.Context, keep time.Duration) {
	_, _ = s.db.ExecContext(ctx,
		`DELETE FROM admin_login_attempts WHERE created_at < (NOW() - INTERVAL ? SECOND)`,
		int(keep.Seconds()))
}

// loginGuard khoa tam mot ten dang nhap hoac mot IP sau qua nhieu lan sai.
type loginGuard struct {
	store  attemptStore
	max    int           // so lan sai toi da trong cua so
	window time.Duration // cua so tinh
}

// truncKey cat khoa cho vua cot VARCHAR(190). User-Agent gia mao co the gui ten dai vo han.
func truncKey(s string) string {
	if len(s) > 190 {
		return s[:190]
	}
	return s
}

// blocked cho biet co phai tu choi ngay khong.
//
// Dem theo CA HAI: theo ten dang nhap chan viec do MOT tai khoan tu nhieu IP; theo IP chan
// viec quet NHIEU tai khoan tu mot may. Thieu ve nao cung de lai mot duong do.
//
// Loi doc bo dem thi CHO QUA: neu MySQL hong thi buoc xac thuc ngay sau cung hong, nen bien
// mot truc trac DB thanh "khong ai dang nhap duoc" ma khong them an toan gi.
func (g *loginGuard) blocked(ctx context.Context, username, ip string) bool {
	if g == nil || g.max <= 0 {
		return false
	}
	for _, k := range g.keys(username, ip) {
		n, err := g.store.failures(ctx, k.scope, k.key, g.window)
		if err != nil {
			return false
		}
		if n >= g.max {
			return true
		}
	}
	return false
}

type attemptKey struct{ scope, key string }

func (g *loginGuard) keys(username, ip string) []attemptKey {
	return []attemptKey{
		{"username", truncKey(strings.ToLower(strings.TrimSpace(username)))},
		{"ip", truncKey(ip)},
	}
}

// record ghi ket qua mot lan dang nhap. Thanh cong thi don luon cac lan thu cu — bang nay
// chi de dem trong 15 phut gan nhat, khong phai nhat ky (nhat ky la admin_audit).
func (g *loginGuard) record(ctx context.Context, username, ip string, ok bool) {
	if g == nil {
		return
	}
	for _, k := range g.keys(username, ip) {
		g.store.record(ctx, k.scope, k.key, ok)
	}
	if ok {
		g.store.prune(ctx, 24*time.Hour)
	}
}

// ---------------------------------------------------------------- rao khi mo ra Internet

// publicGuardError tra ve loi chan khoi dong khi ADMIN_PUBLIC=1 ma con tai khoan chu he
// thong dung mat khau mac dinh.
//
// Mat khau mac dinh nam trong main.go cua mot repo CONG KHAI (xem seedOwner): ai cung doc
// duoc. Chap nhan duoc khi trang chi nghe loopback, nhung mo ra Internet voi no thi trang
// quan tri — noi phat vat pham, gui thu toan server, nap tay — bi chiem trong vai giay.
// Vi vay day la loi DUNG HAN luc khoi dong, khong phai canh bao trong log.
func publicGuardError(public bool, owners []string) error {
	if !public || len(owners) == 0 {
		return nil
	}
	return fmt.Errorf(
		"ADMIN_PUBLIC=1 nhung tai khoan chu he thong (%s) van dung mat khau mac dinh ghi trong ma nguon cua repo cong khai. "+
			"Cach sua: dat ADMIN_PUBLIC=0 va khoi dong lai, vao http://127.0.0.1:8100 qua SSH tunnel "+
			"(ssh -L 8100:127.0.0.1:8100 <server>), doi mat khau o trang Tai khoan, roi bat lai ADMIN_PUBLIC=1. "+
			"Hoac dat ADMIN_BOOTSTRAP_PASSWORD truoc lan khoi dong dau tien tren mot DB con trong",
		strings.Join(owners, ", "))
}

// ownersWithDefaultPassword liet ke tai khoan 'owner' dang hoat dong ma co
// must_change_password (tuc la duoc gieo bang mat khau mac dinh va chua ai doi).
func ownersWithDefaultPassword(ctx context.Context, db *sql.DB) ([]string, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT username FROM admin_users
		 WHERE role = 'owner' AND status = 'active' AND must_change_password = 1
		 ORDER BY username`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []string
	for rows.Next() {
		var u string
		if err := rows.Scan(&u); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}
