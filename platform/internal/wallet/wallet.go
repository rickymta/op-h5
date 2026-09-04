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
	ErrInsufficient = errors.New("số dư không đủ")
	ErrNoWallet     = errors.New("người dùng chưa có ví")
	ErrBadAmount    = errors.New("số tiền phải lớn hơn 0")
)

type Service struct{ DB *sql.DB }

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

func userAccount(ctx context.Context, q interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}, userID int64) (int64, error) {
	var id int64
	err := q.QueryRowContext(ctx,
		`SELECT id FROM wallet_accounts WHERE kind='user' AND user_id = ? AND currency='XU'`, userID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrNoWallet
	}
	return id, err
}

func systemAccount(ctx context.Context, q interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}, code string) (int64, error) {
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

// Convert tru vi de doi sang tien trong game va tao mot lenh phat hang o trang thai
// 'pending'. Viec goi sang game do tien trinh khac lam, nen mat ket noi giua chung
// khong lam mat tien: lenh van con do va se duoc thu lai.
func (s *Service) Convert(ctx context.Context, userID, amount int64, gameCode, srvCode, roleID, packageID, idemKey string) (txnID int64, err error) {
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
	// Khoa cac dong so cai cua nguoi nay roi moi tinh so du, de hai request song song
	// khong cung thay "du tien" roi cung tru.
	var bal sql.NullInt64
	if err = tx.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(amount),0) FROM ledger_entries WHERE account_id = ? FOR UPDATE`, userAcc).
		Scan(&bal); err != nil {
		return 0, err
	}
	if bal.Int64 < amount {
		return 0, ErrInsufficient
	}
	revenue, err := systemAccount(ctx, tx, "game_revenue")
	if err != nil {
		return 0, err
	}

	res, err := tx.ExecContext(ctx,
		`INSERT INTO ledger_txns (kind, idempotency_key, memo) VALUES ('convert',?,?)`,
		idemKey, fmt.Sprintf("%s/%s %s", gameCode, srvCode, packageID))
	if err != nil {
		if isDuplicateKey(err) {
			if id, ok, e := s.existingTxn(ctx, idemKey); e == nil && ok {
				return id, nil
			}
		}
		return 0, err
	}
	if txnID, err = res.LastInsertId(); err != nil {
		return 0, err
	}
	if err = insertEntries(ctx, tx, txnID, [][2]int64{{userAcc, -amount}, {revenue, amount}}); err != nil {
		return 0, err
	}
	if _, err = tx.ExecContext(ctx, `
		INSERT INTO game_grants (txn_id, game_code, srv_code, user_id, role_id, package_id, amount_xu)
		VALUES (?,?,?,?,?,?,?)`,
		txnID, gameCode, srvCode, userID, nullIfEmpty(roleID), packageID, amount); err != nil {
		return 0, err
	}
	if err = tx.Commit(); err != nil {
		return 0, err
	}
	return txnID, nil
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
