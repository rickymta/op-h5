package wallet

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strings"
	"sync"
	"testing"

	_ "github.com/go-sql-driver/mysql"
)

// Cac test nay chay tren MySQL that vi phan tien phu thuoc vao giao dich, khoa dong
// va rang buoc duy nhat — mot ban gia lap trong bo nho se bo qua dung nhung thu can kiem.
//
//	PLATFORM_TEST_DSN='root:pw@tcp(127.0.0.1:3306)/platform_test?parseTime=true' go test ./internal/wallet/
//
// Khong dat bien thi bo qua, de `go test ./...` van chay duoc o may khong co DB.
func testDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("PLATFORM_TEST_DSN")
	if dsn == "" {
		t.Skip("dat PLATFORM_TEST_DSN de chay test vi")
	}
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		t.Fatalf("mo DB: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("ping DB: %v", err)
	}
	return db
}

// newUser tao mot nguoi dung + vi rieng cho moi test.
func newUser(t *testing.T, db *sql.DB) int64 {
	t.Helper()
	name := "t" + strings.ReplaceAll(t.Name(), "/", "")
	if len(name) > 30 {
		name = name[:30]
	}
	_, _ = db.Exec(`DELETE e FROM ledger_entries e
	                JOIN wallet_accounts a ON a.id = e.account_id
	                JOIN users u ON u.id = a.user_id WHERE u.username = ?`, name)
	_, _ = db.Exec(`DELETE FROM users WHERE username = ?`, name)
	res, err := db.Exec(`INSERT INTO users (username, password_hash) VALUES (?, 'x')`, name)
	if err != nil {
		t.Fatalf("tao user: %v", err)
	}
	id, _ := res.LastInsertId()
	if _, err := db.Exec(
		`INSERT INTO wallet_accounts (kind, user_id, currency) VALUES ('user', ?, 'XU')`, id); err != nil {
		t.Fatalf("tao vi: %v", err)
	}
	return id
}

// seedPackage tao mot goi quy doi cho test.
func seedPackage(t *testing.T, db *sql.DB, gameCode, pkgID string, price int64) {
	t.Helper()
	if _, err := db.Exec(`
		INSERT INTO game_packages (game_code, package_id, name, price_xu, item_tid, item_count, item_name)
		VALUES (?,?,?,?,?,?,?)
		ON DUPLICATE KEY UPDATE price_xu = VALUES(price_xu), status = 'active'`,
		gameCode, pkgID, "Goi "+pkgID, price, 1001, 1, "Kim nguyen bao"); err != nil {
		t.Fatalf("tao goi: %v", err)
	}
}

func TestTopupThenBalance(t *testing.T) {
	db := testDB(t)
	s := &Service{DB: db}
	ctx := context.Background()
	uid := newUser(t, db)

	if _, err := s.Topup(ctx, uid, 100_000, "nap-"+t.Name(), "the-cao-123", "nạp thẻ"); err != nil {
		t.Fatalf("Topup: %v", err)
	}
	bal, err := s.Balance(ctx, uid)
	if err != nil {
		t.Fatalf("Balance: %v", err)
	}
	if bal != 100_000 {
		t.Errorf("so du = %d, muon 100000", bal)
	}
}

// Diem then chot: cong thanh toan ban callback nhieu lan thi khong duoc cong nhieu lan.
func TestTopupIsIdempotent(t *testing.T) {
	db := testDB(t)
	s := &Service{DB: db}
	ctx := context.Background()
	uid := newUser(t, db)

	key := "nap-idem-" + t.Name()
	id1, err := s.Topup(ctx, uid, 50_000, key, "ref", "")
	if err != nil {
		t.Fatalf("Topup lan 1: %v", err)
	}
	id2, err := s.Topup(ctx, uid, 50_000, key, "ref", "")
	if err != nil {
		t.Fatalf("Topup lan 2: %v", err)
	}
	if id1 != id2 {
		t.Errorf("cung idempotency_key phai tra ve cung giao dich: %d vs %d", id1, id2)
	}
	bal, _ := s.Balance(ctx, uid)
	if bal != 50_000 {
		t.Errorf("goi hai lan ma so du = %d, phai van la 50000", bal)
	}
}

func TestConvertDebitsAndCreatesGrant(t *testing.T) {
	db := testDB(t)
	s := &Service{DB: db}
	ctx := context.Background()
	uid := newUser(t, db)

	if _, err := s.Topup(ctx, uid, 100_000, "nap-"+t.Name(), "", ""); err != nil {
		t.Fatalf("Topup: %v", err)
	}
	seedPackage(t, db, "haitac", "goi-30k", 30_000)
	txn, err := s.Convert(ctx, ConvertInput{
		UserID: uid, GameCode: "haitac", SrvCode: "s1", RoleID: "role-9",
		AccountUID: "uid-1", PackageID: "goi-30k", IdemKey: "doi-" + t.Name(),
	})
	if err != nil {
		t.Fatalf("Convert: %v", err)
	}
	bal, _ := s.Balance(ctx, uid)
	if bal != 70_000 {
		t.Errorf("so du sau quy doi = %d, muon 70000", bal)
	}
	var status string
	var amount int64
	if err := db.QueryRow(
		`SELECT status, amount_xu FROM game_grants WHERE txn_id = ?`, txn).Scan(&status, &amount); err != nil {
		t.Fatalf("doc game_grants: %v", err)
	}
	if status != "pending" || amount != 30_000 {
		t.Errorf("lenh phat hang = (%s, %d), muon (pending, 30000)", status, amount)
	}
}

func TestConvertRejectsInsufficientBalance(t *testing.T) {
	db := testDB(t)
	s := &Service{DB: db}
	ctx := context.Background()
	uid := newUser(t, db)

	if _, err := s.Topup(ctx, uid, 10_000, "nap-"+t.Name(), "", ""); err != nil {
		t.Fatalf("Topup: %v", err)
	}
	seedPackage(t, db, "haitac", "goi-lon", 99_999)
	if _, err := s.Convert(ctx, ConvertInput{
		UserID: uid, GameCode: "haitac", SrvCode: "s1", AccountUID: "uid-1",
		PackageID: "goi-lon", IdemKey: "doi-" + t.Name(),
	}); err == nil {
		t.Fatal("tieu qua so du ma van cho qua")
	}
	bal, _ := s.Balance(ctx, uid)
	if bal != 10_000 {
		t.Errorf("giao dich hong khong duoc lam doi so du: %d", bal)
	}
}

// Hai request quy doi chay song song tren cung mot vi khong duoc phep cung thay
// "du tien" roi cung tru — khoa dong o Convert phai chan viec do.
func TestConcurrentConvertDoesNotOverdraw(t *testing.T) {
	db := testDB(t)
	s := &Service{DB: db}
	ctx := context.Background()
	uid := newUser(t, db)

	if _, err := s.Topup(ctx, uid, 100_000, "nap-"+t.Name(), "", ""); err != nil {
		t.Fatalf("Topup: %v", err)
	}
	seedPackage(t, db, "haitac", "goi-20k", 20_000)

	const n = 8
	var wg sync.WaitGroup
	okCount := make(chan int, n)
	for i := range n {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			// Moi lan doi 20000; chi 5 lan duoc phep thanh cong.
			if _, err := s.Convert(ctx, ConvertInput{
				UserID: uid, GameCode: "haitac", SrvCode: "s1", AccountUID: "uid-1",
				PackageID: "goi-20k",
				IdemKey:   "song-song-" + t.Name() + "-" + string(rune('a'+i)),
			}); err == nil {
				okCount <- 1
			}
		}(i)
	}
	wg.Wait()
	close(okCount)
	succeeded := 0
	for range okCount {
		succeeded++
	}
	bal, _ := s.Balance(ctx, uid)
	if bal < 0 {
		t.Errorf("so du am (%d) — khoa dong khong chan duoc tieu qua", bal)
	}
	if want := 100_000 - int64(succeeded)*20_000; bal != want {
		t.Errorf("so du = %d, voi %d lan thanh cong thi phai la %d", bal, succeeded, want)
	}
	if succeeded > 5 {
		t.Errorf("%d lan thanh cong, toi da chi duoc 5 (100000/20000)", succeeded)
	}
}

func TestRejectsNonPositiveAmount(t *testing.T) {
	db := testDB(t)
	s := &Service{DB: db}
	ctx := context.Background()
	uid := newUser(t, db)

	if _, err := s.Topup(ctx, uid, 0, "k1-"+t.Name(), "", ""); err == nil {
		t.Error("nap 0 phai bi tu choi")
	}
	if _, err := s.Topup(ctx, uid, -5, "k2-"+t.Name(), "", ""); err == nil {
		t.Error("nap so am phai bi tu choi")
	}
	seedPackage(t, db, "haitac", "goi-am", -5)
	if _, err := s.Convert(ctx, ConvertInput{
		UserID: uid, GameCode: "haitac", SrvCode: "s1", AccountUID: "uid-1",
		PackageID: "goi-am", IdemKey: "k3-" + t.Name(),
	}); err == nil {
		t.Error("goi co gia am phai bi tu choi")
	}
}

// So cai phai luon can bang: tong moi dong cua moi giao dich bang 0.
func TestLedgerStaysBalanced(t *testing.T) {
	db := testDB(t)
	s := &Service{DB: db}
	ctx := context.Background()
	uid := newUser(t, db)

	if _, err := s.Topup(ctx, uid, 80_000, "nap-"+t.Name(), "", ""); err != nil {
		t.Fatalf("Topup: %v", err)
	}
	seedPackage(t, db, "haitac", "goi-25k", 25_000)
	if _, err := s.Convert(ctx, ConvertInput{
		UserID: uid, GameCode: "haitac", SrvCode: "s1", AccountUID: "uid-1",
		PackageID: "goi-25k", IdemKey: "doi-" + t.Name(),
	}); err != nil {
		t.Fatalf("Convert: %v", err)
	}
	var unbalanced int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM (
		  SELECT txn_id FROM ledger_entries GROUP BY txn_id HAVING SUM(amount) <> 0
		) x`).Scan(&unbalanced); err != nil {
		t.Fatalf("kiem tra can bang: %v", err)
	}
	if unbalanced != 0 {
		t.Errorf("%d giao dich khong can bang", unbalanced)
	}
}

func TestConvertRejectsUnknownPackage(t *testing.T) {
	db := testDB(t)
	s := &Service{DB: db}
	ctx := context.Background()
	uid := newUser(t, db)

	if _, err := s.Topup(ctx, uid, 100_000, "nap-"+t.Name(), "", ""); err != nil {
		t.Fatalf("Topup: %v", err)
	}
	_, err := s.Convert(ctx, ConvertInput{
		UserID: uid, GameCode: "haitac", SrvCode: "s1", AccountUID: "uid-1",
		PackageID: "goi-khong-ton-tai", IdemKey: "doi-" + t.Name(),
	})
	if !errors.Is(err, ErrPackageUnknown) {
		t.Errorf("goi la phai bi tu choi voi ErrPackageUnknown, duoc %v", err)
	}
	if bal, _ := s.Balance(ctx, uid); bal != 100_000 {
		t.Errorf("so du khong duoc doi khi goi khong hop le: %d", bal)
	}
}

// Diem then chot ve bao mat: gia LAY TU DB. Ben goi khong the ap gia cua rieng minh.
func TestConvertPriceComesFromDatabase(t *testing.T) {
	db := testDB(t)
	s := &Service{DB: db}
	ctx := context.Background()
	uid := newUser(t, db)

	if _, err := s.Topup(ctx, uid, 100_000, "nap-"+t.Name(), "", ""); err != nil {
		t.Fatalf("Topup: %v", err)
	}
	seedPackage(t, db, "haitac", "goi-dat", 90_000)
	txn, err := s.Convert(ctx, ConvertInput{
		UserID: uid, GameCode: "haitac", SrvCode: "s1", AccountUID: "uid-1",
		PackageID: "goi-dat", IdemKey: "doi-" + t.Name(),
	})
	if err != nil {
		t.Fatalf("Convert: %v", err)
	}
	if bal, _ := s.Balance(ctx, uid); bal != 10_000 {
		t.Errorf("phai tru dung 90000 theo bang gia, so du con %d", bal)
	}
	var amount int64
	var tid, count int
	if err := db.QueryRow(
		`SELECT amount_xu, item_tid, item_count FROM game_grants WHERE txn_id = ?`, txn).
		Scan(&amount, &tid, &count); err != nil {
		t.Fatalf("doc game_grants: %v", err)
	}
	if amount != 90_000 || tid != 1001 || count != 1 {
		t.Errorf("lenh phat hang = (%d, tid=%d, count=%d), muon (90000, 1001, 1)", amount, tid, count)
	}
}
