// Package wallet giu vi Xu cua nguoi choi duoi dang so cai ghi kep.
//
// Vi sao khong dung mot cot `xu` cong tru truc tiep nhu he cu:
//   - Mot cot khong tra loi duoc "tien nay tu dau ra"; khi lech thi khong lan duoc.
//   - UPDATE xu = xu + ? de bi cong hai lan khi client goi lai hoac callback ban ve.
//
// O day so du la TONG cua cac dong so cai, moi giao dich co idempotency_key duy nhat,
// va moi giao dich co tong dai so bang 0 (tien phai di tu mot tai khoan sang tai khoan khac).
package wallet

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

var (
	ErrInsufficient  = errors.New("số dư không đủ")
	ErrNoWallet      = errors.New("người dùng chưa có ví")
	ErrBadAmount     = errors.New("số tiền phải lớn hơn 0")
	ErrRoleRequired  = errors.New("gói này gửi qua thư, cần chọn nhân vật nhận")
	ErrCannotRefund  = errors.New("lệnh đã phát hàng, không hoàn được")
	ErrGrantNotFound = errors.New("không có lệnh phát hàng này")
)

type Service struct{ DB *sql.DB }

type querier interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

// Balance tra ve so du hien tai cua nguoi dung.
func (s *Service) Balance(ctx context.Context, userID int64) (int64, error) {
	var bal sql.NullInt64
	err := s.DB.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(e.amount), 0)
		  FROM ledger_entries e
		  JOIN wallet_accounts a ON a.id = e.account_id
		 WHERE a.kind = 'user' AND a.user_id = ? AND a.currency = 'XU'`, userID).Scan(&bal)
	if err != nil {
		return 0, err
	}
	return bal.Int64, nil
}

func userAccount(ctx context.Context, q querier, userID int64) (int64, error) {
	var id int64
	err := q.QueryRowContext(ctx,
		`SELECT id FROM wallet_accounts WHERE kind='user' AND user_id = ? AND currency='XU'`, userID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrNoWallet
	}
	return id, err
}

func systemAccount(ctx context.Context, q querier, code string) (int64, error) {
	var id int64
	err := q.QueryRowContext(ctx,
		`SELECT id FROM wallet_accounts WHERE kind='system' AND code = ? AND currency='XU'`, code).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, fmt.Errorf("thieu tai khoan he thong %q (migration 0002 chua chay?)", code)
	}
	return id, err
}

// isDuplicateKey nhan ra loi trung idempotency_key.
func isDuplicateKey(err error) bool {
	return err != nil && strings.Contains(err.Error(), "uq_txn_idem")
}

// existingTxn tra ve id cua giao dich da ghi voi cung idempotency_key.
func (s *Service) existingTxn(ctx context.Context, key string) (int64, bool, error) {
	var id int64
	err := s.DB.QueryRowContext(ctx, `SELECT id FROM ledger_txns WHERE idempotency_key = ?`, key).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return id, true, nil
}

// Topup cong tien vao vi sau khi cong thanh toan da xac nhan.
//
// Goi lai voi cung idempotency_key khong cong them lan nua — no tra ve dung giao dich
// da ghi. Day la diem then chot khi cong thanh toan ban callback nhieu lan.
func (s *Service) Topup(ctx context.Context, userID, amount int64, idemKey, reference, memo string) (txnID int64, err error) {
	if amount <= 0 {
		return 0, ErrBadAmount
	}
	if id, ok, err := s.existingTxn(ctx, idemKey); err != nil {
		return 0, err
	} else if ok {
		return id, nil
	}

	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()

	userAcc, err := userAccount(ctx, tx, userID)
	if err != nil {
		return 0, err
	}
	clearing, err := systemAccount(ctx, tx, "gateway_clearing")
	if err != nil {
		return 0, err
	}

	res, err := tx.ExecContext(ctx,
		`INSERT INTO ledger_txns (kind, idempotency_key, reference, memo) VALUES ('topup',?,?,?)`,
		idemKey, nullIfEmpty(reference), nullIfEmpty(memo))
	if err != nil {
		if isDuplicateKey(err) {
			// Mot request song song vua ghi truoc; lay lai giao dich do.
			if id, ok, e := s.existingTxn(ctx, idemKey); e == nil && ok {
				return id, nil
			}
		}
		return 0, err
	}
	if txnID, err = res.LastInsertId(); err != nil {
		return 0, err
	}
	if err = insertEntries(ctx, tx, txnID, [][2]int64{{clearing, -amount}, {userAcc, amount}}); err != nil {
		return 0, err
	}
	if err = tx.Commit(); err != nil {
		return 0, err
	}
	return txnID, nil
}

// ---------------------------------------------------------------- danh muc goi

// Package mo ta mot goi trong cua hang, doc tu bang game_packages (migration 0007).
//
// GrantMode quyet dinh duong phat hang: "pay" = console /gm/pay/manual voi ItemTid la ID
// muc nap (game xu ly nhu mot lan nap that); "mail" = thu kem qua theo chuoi Reward.
type Package struct {
	ID           string
	Name         string
	Category     string
	GrantMode    string
	PriceXu      int64
	ItemTid      int
	ItemCount    int
	ItemName     string
	Reward       string
	Description  string
	Badge        string
	VipPoints    int64
	ServerDayMin int
	ServerDayMax int
	DailyLimit   int
	VipRequired  int
	Status       string
}

// ErrPackageUnknown bao goi khong ton tai hoac da bi an.
var ErrPackageUnknown = errors.New("gói quy đổi không tồn tại")

const packageColumns = `package_id, name, category, grant_mode, price_xu, item_tid, item_count, item_name,
		COALESCE(reward,''), COALESCE(description,''), COALESCE(badge,''), COALESCE(vip_points,0),
		COALESCE(server_day_min,0), COALESCE(server_day_max,0), COALESCE(daily_limit,0), COALESCE(vip_required,0), status`

func scanPackage(row interface{ Scan(...any) error }) (Package, error) {
	var p Package
	err := row.Scan(&p.ID, &p.Name, &p.Category, &p.GrantMode, &p.PriceXu, &p.ItemTid, &p.ItemCount, &p.ItemName,
		&p.Reward, &p.Description, &p.Badge, &p.VipPoints,
		&p.ServerDayMin, &p.ServerDayMax, &p.DailyLimit, &p.VipRequired, &p.Status)
	return p, err
}

// lookupPackage doc mot goi. includeHidden=true dung cho duong mua TRONG GAME: client
// game co the mua bat ky muc nap nao, ke ca muc khong hien tren web.
func lookupPackage(ctx context.Context, q querier, gameCode, packageID string, includeHidden bool) (Package, error) {
	cond := " AND status = 'active'"
	if includeHidden {
		cond = ""
	}
	p, err := scanPackage(q.QueryRowContext(ctx,
		`SELECT `+packageColumns+` FROM game_packages WHERE game_code = ? AND package_id = ?`+cond,
		gameCode, packageID))
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrPackageUnknown
	}
	return p, err
}

// PackageByID tra ve mot goi (ke ca goi an neu includeHidden).
func (s *Service) PackageByID(ctx context.Context, gameCode, packageID string, includeHidden bool) (Package, error) {
	return lookupPackage(ctx, s.DB, gameCode, packageID, includeHidden)
}

// Packages liet ke cac goi dang mo cua mot game, theo thu tu hien thi.
func (s *Service) Packages(ctx context.Context, gameCode string) ([]Package, error) {
	rows, err := s.DB.QueryContext(ctx,
		`SELECT `+packageColumns+` FROM game_packages WHERE game_code = ? AND status = 'active'
		 ORDER BY sort_order, price_xu, package_id`, gameCode)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var out []Package
	for rows.Next() {
		p, err := scanPackage(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// ---------------------------------------------------------------- quy doi

// ConvertInput la tham so cua mot lenh quy doi.
type ConvertInput struct {
	UserID     int64
	GameCode   string
	SrvCode    string
	RoleID     string
	AccountUID string
	PackageID  string
	IdemKey    string
	// Mode: "" (mua tren web: tao lenh phat hang cho worker) hoac "ingame" (game tu phat
	// sau khi Adapter tra `true` cho apisv.php — chi tru Xu va ghi nhan, khong goi console).
	Mode string
}

// Convert tru vi de doi sang vat pham trong game va tao mot lenh phat hang o trang
// thai 'pending'. Viec goi sang console do tien trinh khac lam (package grants), nen
// mat ket noi giua chung khong lam mat tien: lenh van con do va se duoc thu lai.
//
// SO TIEN LAY TU BANG game_packages, khong nhan tu ben goi. Nhan so tien tu client
// nghia la ai cung mua duoc goi dat nhat voi gia mot dong.
func (s *Service) Convert(ctx context.Context, in ConvertInput) (txnID int64, err error) {
	if id, ok, err := s.existingTxn(ctx, in.IdemKey); err != nil {
		return 0, err
	} else if ok {
		return id, nil
	}
	ingame := in.Mode == "ingame"
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()
	pkg, err := lookupPackage(ctx, tx, in.GameCode, in.PackageID, ingame)
	if err != nil {
		return 0, err
	}
	if pkg.PriceXu <= 0 {
		return 0, ErrBadAmount
	}
	grantMode := pkg.GrantMode
	if ingame {
		grantMode = "ingame"
	} else if grantMode == "mail" && strings.TrimSpace(in.RoleID) == "" {
		// Thu can masterIdHex; console khong tim nhan vat theo ten cho ta.
		return 0, ErrRoleRequired
	}
	userAcc, err := userAccount(ctx, tx, in.UserID)
	if err != nil {
		return 0, err
	}
	// Khoa cac dong so cai cua nguoi nay roi moi tinh so du, de hai request song song
	// khong cung thay "du tien" roi cung tru.
	var bal sql.NullInt64
	if err = tx.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(amount),0) FROM ledger_entries WHERE account_id = ? FOR UPDATE`, userAcc).
		Scan(&bal); err != nil {
		return 0, err
	}
	if bal.Int64 < pkg.PriceXu {
		return 0, ErrInsufficient
	}
	revenue, err := systemAccount(ctx, tx, "game_revenue")
	if err != nil {
		return 0, err
	}
	memo := fmt.Sprintf("%s/%s %s", in.GameCode, in.SrvCode, pkg.Name)
	if ingame {
		memo = fmt.Sprintf("%s/%s %s (mua trong game)", in.GameCode, in.SrvCode, pkg.Name)
	}
	res, err := tx.ExecContext(ctx,
		`INSERT INTO ledger_txns (kind, idempotency_key, memo) VALUES ('convert',?,?)`, in.IdemKey, memo)
	if err != nil {
		if isDuplicateKey(err) {
			if id, ok, e := s.existingTxn(ctx, in.IdemKey); e == nil && ok {
				return id, nil
			}
		}
		return 0, err
	}
	if txnID, err = res.LastInsertId(); err != nil {
		return 0, err
	}
	if err = insertEntries(ctx, tx, txnID, [][2]int64{{userAcc, -pkg.PriceXu}, {revenue, pkg.PriceXu}}); err != nil {
		return 0, err
	}
	status, grantedAt := "pending", "NULL"
	if ingame {
		status, grantedAt = "granted", "NOW()"
	}
	if _, err = tx.ExecContext(ctx, `
		INSERT INTO game_grants
		  (txn_id, game_code, srv_code, user_id, account_uid, role_id, package_id, grant_mode,
		   item_tid, item_count, item_name, reward, amount_xu, status, granted_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,`+grantedAt+`)`,
		txnID, in.GameCode, in.SrvCode, in.UserID, nullIfEmpty(in.AccountUID),
		nullIfEmpty(strings.TrimSpace(in.RoleID)), in.PackageID, grantMode,
		pkg.ItemTid, pkg.ItemCount, pkg.ItemName, nullIfEmpty(pkg.Reward), pkg.PriceXu, status); err != nil {
		return 0, err
	}
	if err = tx.Commit(); err != nil {
		return 0, err
	}
	return txnID, nil
}

// RefundGrant hoan Xu cho mot lenh phat hang khong thanh cong (console tu choi, het lan
// thu, hoac quan tri quyet dinh). Idempotent theo txn_id: goi lai khong hoan hai lan.
// Lenh da 'granted' khong hoan duoc — vat pham da vao game.
func (s *Service) RefundGrant(ctx context.Context, grantID int64, memo string) (refundTxn int64, err error) {
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()

	var (
		txnID, userID, amount int64
		status                string
		existing              sql.NullInt64
	)
	err = tx.QueryRowContext(ctx, `
		SELECT txn_id, user_id, amount_xu, status, refund_txn_id
		  FROM game_grants WHERE id = ? FOR UPDATE`, grantID).
		Scan(&txnID, &userID, &amount, &status, &existing)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrGrantNotFound
	}
	if err != nil {
		return 0, err
	}
	if status == "refunded" && existing.Valid {
		return existing.Int64, nil
	}
	if status == "granted" {
		return 0, ErrCannotRefund
	}
	idem := fmt.Sprintf("refund-%d", txnID)
	if id, ok, e := s.existingTxn(ctx, idem); e != nil {
		return 0, e
	} else if ok {
		// Da ghi so cai nhung chua kip danh dau lenh (crash giua chung): chi cap nhat lenh.
		refundTxn = id
	} else {
		userAcc, err := userAccount(ctx, tx, userID)
		if err != nil {
			return 0, err
		}
		revenue, err := systemAccount(ctx, tx, "game_revenue")
		if err != nil {
			return 0, err
		}
		res, err := tx.ExecContext(ctx,
			`INSERT INTO ledger_txns (kind, idempotency_key, memo) VALUES ('refund',?,?)`, idem, nullIfEmpty(memo))
		if err != nil {
			return 0, err
		}
		if refundTxn, err = res.LastInsertId(); err != nil {
			return 0, err
		}
		if err = insertEntries(ctx, tx, refundTxn, [][2]int64{{revenue, -amount}, {userAcc, amount}}); err != nil {
			return 0, err
		}
	}
	if _, err = tx.ExecContext(ctx, `
		UPDATE game_grants SET status = 'refunded', refund_txn_id = ?, next_retry_at = NULL
		 WHERE id = ?`, refundTxn, grantID); err != nil {
		return 0, err
	}
	if err = tx.Commit(); err != nil {
		return 0, err
	}
	return refundTxn, nil
}

// Order la mot lenh mua hien cho nguoi choi (va cho trang quan tri).
type Order struct {
	ID        int64
	UserID    int64
	Username  string
	PackageID string
	Name      string
	SrvCode   string
	AmountXu  int64
	Status    string
	GrantMode string
	LastError string
	Attempts  int
	CreatedAt string
	GrantedAt string
}

const orderSelect = `
	SELECT g.id, g.user_id, COALESCE(u.username,''), g.package_id, COALESCE(p.name, g.item_name, g.package_id),
	       g.srv_code, g.amount_xu, g.status, g.grant_mode, COALESCE(g.last_error,''), g.attempts,
	       DATE_FORMAT(g.created_at, '%Y-%m-%d %H:%i'), COALESCE(DATE_FORMAT(g.granted_at, '%Y-%m-%d %H:%i'), '')
	  FROM game_grants g
	  LEFT JOIN game_packages p ON p.game_code = g.game_code AND p.package_id = g.package_id
	  LEFT JOIN users u ON u.id = g.user_id`

func scanOrders(rows *sql.Rows) ([]Order, error) {
	defer func() { _ = rows.Close() }()
	var out []Order
	for rows.Next() {
		var o Order
		if err := rows.Scan(&o.ID, &o.UserID, &o.Username, &o.PackageID, &o.Name, &o.SrvCode, &o.AmountXu, &o.Status, &o.GrantMode,
			&o.LastError, &o.Attempts, &o.CreatedAt, &o.GrantedAt); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

// Orders tra ve cac lenh mua cua mot nguoi choi trong mot game, moi nhat truoc.
func (s *Service) Orders(ctx context.Context, userID int64, gameCode string, limit int) ([]Order, error) {
	if limit <= 0 || limit > 200 {
		limit = 30
	}
	rows, err := s.DB.QueryContext(ctx, orderSelect+`
		 WHERE g.user_id = ? AND g.game_code = ? ORDER BY g.id DESC LIMIT ?`, userID, gameCode, limit)
	if err != nil {
		return nil, err
	}
	return scanOrders(rows)
}

// RecentOrders liet ke lenh mua cua moi nguoi (trang quan tri); status rong = tat ca.
func (s *Service) RecentOrders(ctx context.Context, gameCode, status string, limit int) ([]Order, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	q := orderSelect + ` WHERE g.game_code = ?`
	args := []any{gameCode}
	if status != "" {
		q += ` AND g.status = ?`
		args = append(args, status)
	}
	q += ` ORDER BY g.id DESC LIMIT ?`
	args = append(args, limit)
	rows, err := s.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	return scanOrders(rows)
}

// RetryGrant dua mot lenh 'failed' ve 'pending' de worker thu lai (quan tri bam "phat lai").
func (s *Service) RetryGrant(ctx context.Context, grantID int64) error {
	res, err := s.DB.ExecContext(ctx, `
		UPDATE game_grants SET status = 'pending', attempts = 0, next_retry_at = NULL, last_error = NULL
		 WHERE id = ? AND status = 'failed'`, grantID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrGrantNotFound
	}
	return nil
}

func insertEntries(ctx context.Context, tx *sql.Tx, txnID int64, pairs [][2]int64) error {
	var sum int64
	for _, p := range pairs {
		sum += p[1]
	}
	if sum != 0 {
		// Loi lap trinh, khong phai loi nguoi dung: mot giao dich khong can bang
		// se lam hong toan bo so cai neu de lot.
		return fmt.Errorf("giao dich khong can bang: tong = %d, phai bang 0", sum)
	}
	for _, p := range pairs {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO ledger_entries (txn_id, account_id, amount) VALUES (?,?,?)`,
			txnID, p[0], p[1]); err != nil {
			return err
		}
	}
	return nil
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// Entry la mot dong lich su hien cho nguoi choi.
type Entry struct {
	TxnID  int64
	Kind   string
	Amount int64
	Memo   sql.NullString
	At     string
}

// History tra ve lich su giao dich cua mot nguoi dung, moi nhat truoc.
func (s *Service) History(ctx context.Context, userID int64, limit int) ([]Entry, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.DB.QueryContext(ctx, `
		SELECT t.id, t.kind, e.amount, t.memo, DATE_FORMAT(e.created_at, '%Y-%m-%d %H:%i')
		  FROM ledger_entries e
		  JOIN wallet_accounts a ON a.id = e.account_id
		  JOIN ledger_txns t ON t.id = e.txn_id
		 WHERE a.kind = 'user' AND a.user_id = ?
		 ORDER BY e.id DESC LIMIT ?`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var out []Entry
	for rows.Next() {
		var e Entry
		if err := rows.Scan(&e.TxnID, &e.Kind, &e.Amount, &e.Memo, &e.At); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}
