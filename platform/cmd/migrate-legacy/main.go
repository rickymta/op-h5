// Lenh migrate-legacy dua nguoi choi cu tu he thong PHP sang he thong ID.
//
// VI SAO PHAI CO
// --------------
// Khong chay buoc nay ma bat he thong ID len thi moi nguoi choi cu se lac vao mot tai
// khoan game MOI: Mapper.Ensure() duc username `id%09d` cho bat ky ai chua co anh xa,
// nen ho dang nhap dung mat khau cua minh nhung vao mot nhan vat rong. Do la kieu su co
// khong sua duoc bang cach thu lai, va cang de lau cang kho go.
//
// LAM GI
// ------
//  1. web.user            -> platform.users        (tai khoan cong)
//  2. web.user            -> user_legacy_links     (de doi soat ve sau, va de chay lai
//     khong tao trung)
//  3. tcg.account         -> game_identities       (giu NGUYEN tai khoan game cua ho)
//  4. web.user.xu         -> so cai vi             (so du mo dau, mot but toan)
//
// KHONG doi mat khau game. `tcg.account.password` luu dang tho (login server so sanh
// bang StringUtils.equals nen khong bam duoc), nen buoc 3 doc thang mat khau do va ma
// hoa vao `game_identities.game_secret` bang chinh Vault cua Adapter. Nguoi choi giu
// nguyen duong dang nhap truc tiep cu, va Adapter dang nhap ho duoc — khong ai phai
// dat lai mat khau.
//
// Mat khau CONG thi co hai dang trong `web.user.password`:
//   - da bam bcrypt  -> chep nguyen. identity.VerifyPassword doc duoc, va lan dang nhap
//     dau tien tu nang len Argon2id.
//   - con dang tho   -> bam thang sang Argon2id ngay tai day. Khong bao gio ghi mat khau
//     tho vao he thong moi.
//
// AN TOAN
// -------
//   - Mac dinh la DRY-RUN. Phai truyen --apply moi ghi.
//   - Chay lai duoc: moi buoc deu doi chieu `user_legacy_links` / khoa duy nhat truoc khi
//     ghi, va but toan vi dung idempotency_key co dinh theo tai khoan.
//   - CHI DOC voi hai CSDL cu (`web`, `tcg`). Khong sua gi ben do.
//   - Dung ngay khi gap dieu bat thuong (thieu cot, username trung nhau giua hai he) thay
//     vi doan — mot ban di tru sai im lang te hon nhieu so voi mot lan dung giua chung.
package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/rickymta/op-h5/platform/internal/gameacct"
	"github.com/rickymta/op-h5/platform/internal/identity"
	"github.com/rickymta/op-h5/platform/internal/wallet"
)

type stats struct {
	Doc         int
	TaoUser     int
	BoQuaUser   int
	TaoIdentity int
	BoQuaIdent  int
	KhongCoGame int
	CongXu      int
	TongXu      int64
	Loi         int
}

func main() {
	var (
		dsnPlatform = flag.String("platform-dsn", envOr("ID_DSN", ""), "DSN CSDL platform (bat buoc)")
		dsnWeb      = flag.String("web-dsn", envOr("WEB_DSN", ""), "DSN CSDL `web` cu (bat buoc)")
		dsnTcg      = flag.String("tcg-dsn", envOr("TCG_DSN", ""), "DSN CSDL `tcg` (bat buoc)")
		encKey      = flag.String("enc-key", os.Getenv("ADAPTER_SECRET_ENC_KEY"), "khoa ma hoa game_secret (base64 32 byte)")
		gameCode    = flag.String("game", "haitac", "game_code cho game_identities")
		withXu      = flag.Bool("with-xu", true, "chuyen so du Xu cu thanh so du mo dau")
		limit       = flag.Int("limit", 0, "chi xu ly N tai khoan dau (0 = tat ca)")
		apply       = flag.Bool("apply", false, "ghi that; khong co co nay thi chi in ra se lam gi")
	)
	flag.Parse()

	for name, v := range map[string]string{
		"--platform-dsn": *dsnPlatform, "--web-dsn": *dsnWeb, "--tcg-dsn": *dsnTcg, "--enc-key": *encKey,
	} {
		if v == "" {
			die("thieu %s", name)
		}
	}

	vault, err := gameacct.NewVault(*encKey)
	if err != nil {
		die("khoa ma hoa: %v", err)
	}

	ctx := context.Background()
	pdb := open("platform", *dsnPlatform)
	wdb := open("web", *dsnWeb)
	tdb := open("tcg", *dsnTcg)
	defer closeAll(pdb, wdb, tdb)
	purse := &wallet.Service{DB: pdb}

	// Kiem tra cot truoc khi dong vao du lieu: hai CSDL cu khong co migration nao quan
	// ly, moi ban trien khai mot khac. Thieu cot ma cu chay se hong nua chung.
	mustHaveColumns(ctx, wdb, "user", "id", "username", "password", "xu")
	mustHaveColumns(ctx, tdb, "account", "uid", "username", "password")

	if !*apply {
		fmt.Println("== DRY-RUN — khong ghi gi. Them --apply de thuc hien. ==")
	}
	fmt.Printf("game_code = %q, chuyen Xu = %v\n\n", *gameCode, *withXu)

	st := &stats{}
	q := "SELECT id, username, password, IFNULL(xu,0) FROM `user` ORDER BY id"
	if *limit > 0 {
		q += fmt.Sprintf(" LIMIT %d", *limit)
	}
	rows, err := wdb.QueryContext(ctx, q)
	if err != nil {
		die("doc web.user: %v", err)
	}
	defer func() { _ = rows.Close() }()

	for rows.Next() {
		var (
			legacyID int64
			username string
			pass     sql.NullString
			xu       int64
		)
		if err := rows.Scan(&legacyID, &username, &pass, &xu); err != nil {
			die("doc dong web.user: %v", err)
		}
		st.Doc++
		if err := migrateOne(ctx, pdb, tdb, purse, vault, *gameCode, *withXu, *apply,
			legacyID, strings.TrimSpace(username), pass.String, xu, st); err != nil {
			st.Loi++
			fmt.Printf("  LOI  %-24s %v\n", username, err)
		}
	}
	if err := rows.Err(); err != nil {
		die("duyet web.user: %v", err)
	}

	fmt.Printf(`
== KET QUA ==
  doc tu web.user        %d
  tao tai khoan cong     %d   (bo qua vi da co: %d)
  noi tai khoan game     %d   (bo qua vi da co: %d; khong tim thay trong tcg.account: %d)
  cong so du mo dau      %d   (tong %d Xu)
  loi                    %d
`, st.Doc, st.TaoUser, st.BoQuaUser, st.TaoIdentity, st.BoQuaIdent, st.KhongCoGame,
		st.CongXu, st.TongXu, st.Loi)

	if st.Loi > 0 {
		fmt.Println("\nCon dong loi — xu ly xong roi chay lai (lenh nay chay lai duoc).")
		os.Exit(1)
	}
	if !*apply {
		fmt.Println("\nChua ghi gi. Chay lai voi --apply de thuc hien.")
	}
}

// migrateOne xu ly mot tai khoan. Moi buoc tu kiem tra da lam chua.
func migrateOne(ctx context.Context, pdb, tdb *sql.DB, purse *wallet.Service, vault *gameacct.Vault,
	gameCode string, withXu, apply bool,
	legacyID int64, username, legacyPass string, xu int64, st *stats) error {

	if username == "" {
		return errors.New("username rong")
	}

	userID, existed, err := ensureUser(ctx, pdb, username, legacyPass, apply)
	if err != nil {
		return fmt.Errorf("tao tai khoan cong: %w", err)
	}
	if existed {
		st.BoQuaUser++
	} else {
		st.TaoUser++
	}
	if !apply {
		// Chua ghi thi chua co user_id that; cac buoc sau chi dem cho biet quy mo.
		st.KhongCoGame += boolToInt(!gameAccountExists(ctx, tdb, username))
		return nil
	}

	if _, err := pdb.ExecContext(ctx, `
		INSERT IGNORE INTO user_legacy_links (user_id, legacy_source, legacy_username)
		VALUES (?, 'web.user', ?)`, userID, username); err != nil {
		return fmt.Errorf("ghi user_legacy_links: %w", err)
	}

	switch err := linkGameAccount(ctx, pdb, tdb, vault, gameCode, userID, username); {
	case err == nil:
		st.TaoIdentity++
	case errors.Is(err, errAlreadyLinked):
		st.BoQuaIdent++
	case errors.Is(err, errNoGameAccount):
		st.KhongCoGame++
	default:
		return fmt.Errorf("noi tai khoan game: %w", err)
	}

	if withXu && xu > 0 {
		added, err := openingBalance(ctx, purse, userID, xu, legacyID)
		if err != nil {
			return fmt.Errorf("so du mo dau: %w", err)
		}
		if added {
			st.CongXu++
			st.TongXu += xu
		}
	}
	return nil
}

// ensureUser tao tai khoan cong neu chua co, KEM tai khoan vi. Tra ve (id, da_ton_tai).
//
// Vi phai tao cung luc: moi cho dung den tien deu gia dinh nguoi dung da co vi
// (identity.Repo.Create cung lam vay). Tao user bang INSERT thang ma quen vi thi buoc
// chuyen so du Xu se hong voi "nguoi dung chua co vi" — da dinh dung loi nay.
//
// Ha chu thuong username giong Repo.Create: hai duong tao tai khoan ma chuan hoa khac
// nhau se sinh ra hai ban ghi cho cung mot nguoi.
func ensureUser(ctx context.Context, pdb *sql.DB, username, legacyPass string, apply bool) (int64, bool, error) {
	username = strings.ToLower(strings.TrimSpace(username))

	var id int64
	err := pdb.QueryRowContext(ctx, `SELECT id FROM users WHERE username = ?`, username).Scan(&id)
	if err == nil {
		// Co the la ban ghi do lan chay truoc tao ra khi chua co buoc tao vi.
		if apply {
			if err := ensureWallet(ctx, pdb, id); err != nil {
				return 0, true, err
			}
		}
		return id, true, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return 0, false, err
	}

	hash, err := passwordHashFor(legacyPass)
	if err != nil {
		return 0, false, err
	}
	if !apply {
		return 0, false, nil
	}

	tx, err := pdb.BeginTx(ctx, nil)
	if err != nil {
		return 0, false, err
	}
	defer func() { _ = tx.Rollback() }()

	res, err := tx.ExecContext(ctx,
		`INSERT INTO users (username, password_hash) VALUES (?, ?)`, username, hash)
	if err != nil {
		return 0, false, err
	}
	id, err = res.LastInsertId()
	if err != nil {
		return 0, false, err
	}
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO wallet_accounts (kind, user_id, currency) VALUES ('user', ?, 'XU')`, id); err != nil {
		return 0, false, fmt.Errorf("tao vi: %w", err)
	}
	return id, false, tx.Commit()
}

// ensureWallet bu vi cho tai khoan da co ma thieu.
func ensureWallet(ctx context.Context, pdb *sql.DB, userID int64) error {
	var n int
	if err := pdb.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM wallet_accounts WHERE kind = 'user' AND user_id = ?`, userID).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	_, err := pdb.ExecContext(ctx,
		`INSERT INTO wallet_accounts (kind, user_id, currency) VALUES ('user', ?, 'XU')`, userID)
	return err
}

// passwordHashFor quyet dinh chuoi bam se ghi vao he thong moi.
//
// Bam bcrypt cua PHP thi chep nguyen — VerifyPassword doc duoc, va lan dang nhap dau
// tien tu nang len Argon2id. Con lai (dang tho, hoac rong) thi bam ngay: khong bao gio
// ghi mat khau tho sang he thong moi. Mat khau rong -> mot chuoi ngau nhien khong ai
// biet, buoc chu tai khoan di duong "quen mat khau" — dung hon la de tai khoan mo.
func passwordHashFor(legacy string) (string, error) {
	if strings.HasPrefix(legacy, "$2a$") || strings.HasPrefix(legacy, "$2b$") ||
		strings.HasPrefix(legacy, "$2y$") {
		return legacy, nil
	}
	if legacy == "" {
		legacy = fmt.Sprintf("khong-the-doan-%d", time.Now().UnixNano())
	}
	return identity.HashPassword(legacy)
}

var (
	errAlreadyLinked = errors.New("da noi tu truoc")
	errNoGameAccount = errors.New("khong co trong tcg.account")
)

// linkGameAccount tro anh xa vao tai khoan game SAN CO cua nguoi choi.
//
// Doc thang `tcg.account.password` (dang tho) roi ma hoa vao game_secret. Khong dat lai
// mat khau game: dat lai se lam hong duong dang nhap truc tiep ma nguoi choi van dang
// dung, va khong co gi bao dam moi nguoi deu chuyen sang cong moi ngay lap tuc.
func linkGameAccount(ctx context.Context, pdb, tdb *sql.DB, vault *gameacct.Vault,
	gameCode string, userID int64, username string) error {

	var n int
	if err := pdb.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM game_identities WHERE user_id = ? AND game_code = ?`,
		userID, gameCode).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return errAlreadyLinked
	}

	var uid, gameUser, gamePass sql.NullString
	err := tdb.QueryRowContext(ctx,
		"SELECT uid, username, password FROM `account` WHERE username = ? LIMIT 1", username).
		Scan(&uid, &gameUser, &gamePass)
	if errors.Is(err, sql.ErrNoRows) {
		return errNoGameAccount
	}
	if err != nil {
		return err
	}
	if !gamePass.Valid || gamePass.String == "" {
		return fmt.Errorf("tcg.account.password rong — khong the noi ma khong dat lai mat khau")
	}

	sealed, err := vault.Seal(gamePass.String)
	if err != nil {
		return err
	}
	_, err = pdb.ExecContext(ctx, `
		INSERT INTO game_identities (user_id, game_code, game_username, game_secret, account_uid)
		VALUES (?,?,?,?,?)`, userID, gameCode, gameUser.String, sealed, nullIfEmpty(uid.String))
	return err
}

// openingBalance ghi so du Xu cu thanh mot but toan nap.
//
// Goi thang wallet.Service.Topup thay vi tu viet INSERT: so cai ghi kep co rang buoc
// rieng (moi but toan phai tong bang 0, va entry khoa theo wallet_accounts chu khong
// phai user_id). Tu dung lai o day la mo mot duong ghi thu hai vao so cai, khong duoc
// test nao che, va lech schema thi hong am tham. Topup cung da san idempotent.
//
// Khoa idempotency co dinh theo tai khoan CU, nen chay lai lenh nay khong cong hai lan.
func openingBalance(ctx context.Context, w *wallet.Service, userID, xu, legacyID int64) (bool, error) {
	key := fmt.Sprintf("migrate-web-user-%d", legacyID)
	truoc, err := w.Balance(ctx, userID)
	if err != nil {
		return false, err
	}
	if _, err := w.Topup(ctx, userID, xu,
		key, fmt.Sprintf("web.user#%d", legacyID), "Số dư chuyển từ hệ thống cũ"); err != nil {
		return false, err
	}
	sau, err := w.Balance(ctx, userID)
	if err != nil {
		return false, err
	}
	// Topup tra ve txn cu khi khoa da ton tai; so du khong doi nghia la da chay tu truoc.
	return sau != truoc, nil
}

func gameAccountExists(ctx context.Context, tdb *sql.DB, username string) bool {
	var n int
	err := tdb.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM `account` WHERE username = ?", username).Scan(&n)
	return err == nil && n > 0
}

// mustHaveColumns dung ngay neu bang thieu cot can dung.
func mustHaveColumns(ctx context.Context, db *sql.DB, table string, cols ...string) {
	rows, err := db.QueryContext(ctx, "SHOW COLUMNS FROM `"+table+"`")
	if err != nil {
		die("doc cau truc bang %s: %v", table, err)
	}
	defer func() { _ = rows.Close() }()
	have := map[string]bool{}
	for rows.Next() {
		var field string
		var rest [5]sql.NullString
		if err := rows.Scan(&field, &rest[0], &rest[1], &rest[2], &rest[3], &rest[4]); err != nil {
			die("doc cau truc bang %s: %v", table, err)
		}
		have[strings.ToLower(field)] = true
	}
	var thieu []string
	for _, c := range cols {
		if !have[strings.ToLower(c)] {
			thieu = append(thieu, c)
		}
	}
	if len(thieu) > 0 {
		die("bang %s thieu cot: %s\n(schema cua he cu khong duoc migration nao quan ly — "+
			"doi chieu voi dump truoc khi chay)", table, strings.Join(thieu, ", "))
	}
}

func open(name, dsn string) *sql.DB {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		die("mo CSDL %s: %v", name, err)
	}
	db.SetMaxOpenConns(4)
	if err := db.Ping(); err != nil {
		die("khong ket noi duoc CSDL %s: %v", name, err)
	}
	return db
}

func closeAll(dbs ...*sql.DB) {
	for _, d := range dbs {
		_ = d.Close()
	}
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func die(format string, a ...any) {
	fmt.Fprintf(os.Stderr, "loi: "+format+"\n", a...)
	os.Exit(1)
}
