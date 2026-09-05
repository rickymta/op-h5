// Package grants phat vat pham cho cac lenh quy doi dang cho.
//
// Vi sao tach thanh tien trinh nen thay vi goi thang trong request quy doi:
// tien da bi tru o he thong ID truoc khi goi sang game. Neu goi dong bo va mat ket noi
// giua chung, nguoi choi mat tien ma khong nhan duoc gi, va ta khong co cach nao biet
// da giao hang hay chua. Tach ra thi lenh nam lai trong bang o trang thai `pending`
// va se duoc thu lai — mat ket noi chi lam cham, khong lam mat tien.
package grants

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/rickymta/op-h5/platform/internal/console"
)

// MaxAttempts la so lan thu truoc khi bo cuoc va danh dau `failed`.
// Bo cuoc khong phai la mat tien: lenh van nam trong bang, nguoi truc thay o trang
// quan tri va xu ly tay.
const MaxAttempts = 8

// backoff gian cach thu lai theo cap so nhan, tran o 30 phut.
// Console chet 10 phut thi khong nen quay 600 vong trong luc do.
func backoff(attempt int) time.Duration {
	d := time.Duration(1<<uint(attempt)) * 15 * time.Second
	if d > 30*time.Minute {
		return 30 * time.Minute
	}
	return d
}

// Delivery la mot lenh phat hang doc tu bang.
type Delivery struct {
	ID         int64
	TxnID      int64
	GameCode   string
	SrvCode    string
	UserID     int64
	AccountUID sql.NullString
	RoleID     sql.NullString
	PackageID  string
	ItemTid    int
	ItemCount  int
	ItemName   sql.NullString
	AmountXu   int64
	Attempts   int
}

// Worker lay lenh dang cho roi goi console.
type Worker struct {
	DB       *sql.DB
	Console  *console.Client
	GameCode string
	Log      *slog.Logger

	// PlatformCode / ChannelCode danh dau don den tu he thong ID.
	PlatformCode string
	ChannelCode  string
	CurrencyCode string
	// Mode chon duong goi console: "manual" (mot buoc) hoac "approval" (hai buoc).
	Mode string
}

// Run chay vong lap cho den khi ctx bi huy.
func (w *Worker) Run(ctx context.Context, every time.Duration) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			n, err := w.Tick(ctx)
			if err != nil {
				w.Log.Error("phat vat pham that bai", "err", err)
			}
			if n > 0 {
				w.Log.Info("da xu ly lenh phat hang", "so_luong", n)
			}
		}
	}
}

// Tick xu ly toi da `limit` lenh dang cho. Tra ve so lenh da xu ly.
func (w *Worker) Tick(ctx context.Context) (int, error) {
	items, err := w.due(ctx, 20)
	if err != nil {
		return 0, err
	}
	done := 0
	for _, d := range items {
		if err := ctx.Err(); err != nil {
			return done, err
		}
		// Gianh lenh truoc khi goi console. Tick() chay tu HAI noi — vong lap nen va
		// mot lan chay ngay sau khi nguoi choi quy doi — nen khong gianh thi ca hai
		// cung lay mot dong va phat hai lan. Khong duoc trong cay vao console tu chong
		// trung: phat hang la viec khong duoc phep phu thuoc vao ben kia lam dung.
		ok, err := w.claim(ctx, d)
		if err != nil {
			w.Log.Error("gianh lenh phat hang", "grant", d.ID, "err", err)
			continue
		}
		if !ok {
			continue // tien trinh khac dang lo
		}
		if err := w.deliver(ctx, d); err != nil {
			w.fail(ctx, d, err)
			continue
		}
		w.succeed(ctx, d)
		done++
	}
	return done, nil
}

// leaseTTL la thoi gian mot lenh bi "giu" sau khi gianh. Neu tien trinh giu no chet
// giua chung, het thoi gian nay lenh se duoc lay lai.
const leaseTTL = 2 * time.Minute

// claim danh dau mot lenh la dang duoc xu ly, bang cach day next_retry_at ve tuong lai.
// RowsAffected == 1 nghia la ta gianh duoc; 0 nghia la tien trinh khac vua gianh truoc.
func (w *Worker) claim(ctx context.Context, d Delivery) (bool, error) {
	res, err := w.DB.ExecContext(ctx, `
		UPDATE game_grants
		   SET next_retry_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
		 WHERE id = ? AND status = 'pending'
		   AND (next_retry_at IS NULL OR next_retry_at <= NOW())`,
		int(leaseTTL.Seconds()), d.ID)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	return n == 1, err
}

// due lay cac lenh dang cho va da toi luc thu lai.
func (w *Worker) due(ctx context.Context, limit int) ([]Delivery, error) {
	rows, err := w.DB.QueryContext(ctx, `
		SELECT id, txn_id, game_code, srv_code, user_id, account_uid, role_id,
		       package_id, item_tid, item_count, item_name, amount_xu, attempts
		  FROM game_grants
		 WHERE game_code = ? AND status = 'pending'
		   AND (next_retry_at IS NULL OR next_retry_at <= NOW())
		 ORDER BY id LIMIT ?`, w.GameCode, limit)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var out []Delivery
	for rows.Next() {
		var d Delivery
		if err := rows.Scan(&d.ID, &d.TxnID, &d.GameCode, &d.SrvCode, &d.UserID,
			&d.AccountUID, &d.RoleID, &d.PackageID, &d.ItemTid, &d.ItemCount,
			&d.ItemName, &d.AmountXu, &d.Attempts); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// deliver goi console de phat hang.
//
// platformOrderId dat bang txn_id cua so cai: no la khoa duy nhat cua giao dich ben
// he thong ID, nen neu console co chong trung theo ma don thi hai lan thu lai cung
// mot lenh se khong phat hai lan.
func (w *Worker) deliver(ctx context.Context, d Delivery) error {
	if d.ItemTid <= 0 {
		return fmt.Errorf("goi %q chua khai bao item_tid", d.PackageID)
	}
	if !d.AccountUID.Valid || d.AccountUID.String == "" {
		return errors.New("chua biet accountUid cua nguoi choi trong game")
	}
	rec := console.PayRecord{
		OrderType:       0,
		PlatformOrderID: fmt.Sprintf("id-%d", d.TxnID),
		ItemTid:         d.ItemTid,
		ItemCount:       d.ItemCount,
		ItemName:        d.ItemName.String,
		PayAmount:       float64(d.AmountXu),
		SrvCode:         d.SrvCode,
		PlatformCode:    w.PlatformCode,
		ChannelCode:     w.ChannelCode,
		AccountUID:      d.AccountUID.String,
		MasterIDHex:     d.RoleID.String,
		CurrencyCode:    w.CurrencyCode,
		Note:            fmt.Sprintf("quy doi tu vi ID, goi %s", d.PackageID),
	}
	if w.Mode == "approval" {
		if err := w.Console.PayCreateApproval(ctx, rec); err != nil {
			return err
		}
		return w.Console.PayCompleteApproval(ctx, console.PayApproval{
			Status:          console.ApprovalAccept,
			OrderType:       rec.OrderType,
			PlatformOrderID: rec.PlatformOrderID,
			ItemTid:         rec.ItemTid,
			ItemCount:       rec.ItemCount,
			ItemName:        rec.ItemName,
			PayAmount:       rec.PayAmount,
			SrvCode:         rec.SrvCode,
			PlatformCode:    rec.PlatformCode,
			ChannelCode:     rec.ChannelCode,
			AccountUID:      rec.AccountUID,
			MasterIDHex:     rec.MasterIDHex,
		})
	}
	return w.Console.PayManual(ctx, rec)
}

func (w *Worker) succeed(ctx context.Context, d Delivery) {
	if _, err := w.DB.ExecContext(ctx, `
		UPDATE game_grants
		   SET status = 'granted', granted_at = NOW(), attempts = attempts + 1,
		       last_error = NULL, next_retry_at = NULL
		 WHERE id = ? AND status = 'pending'`, d.ID); err != nil {
		w.Log.Error("ghi ket qua phat hang", "grant", d.ID, "err", err)
	}
}

func (w *Worker) fail(ctx context.Context, d Delivery, cause error) {
	attempts := d.Attempts + 1
	msg := cause.Error()
	if len(msg) > 500 {
		msg = msg[:500]
	}
	if attempts >= MaxAttempts {
		w.Log.Error("bo cuoc phat hang sau nhieu lan thu",
			"grant", d.ID, "txn", d.TxnID, "so_lan", attempts, "err", msg)
		if _, err := w.DB.ExecContext(ctx, `
			UPDATE game_grants SET status='failed', attempts = ?, last_error = ?, next_retry_at = NULL
			 WHERE id = ? AND status = 'pending'`, attempts, msg, d.ID); err != nil {
			w.Log.Error("ghi trang thai that bai", "grant", d.ID, "err", err)
		}
		return
	}
	wait := backoff(attempts)
	w.Log.Warn("phat hang that bai, se thu lai",
		"grant", d.ID, "lan", attempts, "cho", wait.String(), "err", msg)
	if _, err := w.DB.ExecContext(ctx, `
		UPDATE game_grants
		   SET attempts = ?, last_error = ?, next_retry_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
		 WHERE id = ? AND status = 'pending'`, attempts, msg, int(wait.Seconds()), d.ID); err != nil {
		w.Log.Error("ghi lan thu that bai", "grant", d.ID, "err", err)
	}
}
