package identity

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"
)

var (
	ErrResetInvalid  = errors.New("liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn")
	ErrResetTooOften = errors.New("đã gửi yêu cầu gần đây, vui lòng kiểm tra email")
)

// ResetTTL ngan de mot email bi doc trom sau do khong con dung duoc.
const ResetTTL = 30 * time.Minute

// resetCooldown chan gui lien tuc toi cung mot tai khoan.
const resetCooldown = 2 * time.Minute

type Resets struct{ DB *sql.DB }

func hashReset(tok string) string {
	sum := sha256.Sum256([]byte(tok))
	return hex.EncodeToString(sum[:])
}

// Create sinh mot ma dat lai va tra ve BAN RO de gui qua email.
// DB chi giu ban bam.
func (r *Resets) Create(ctx context.Context, userID int64, ip string) (string, error) {
	var recent int
	if err := r.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM password_resets
		 WHERE user_id = ? AND used_at IS NULL
		   AND created_at > (NOW() - INTERVAL ? SECOND)`,
		userID, int(resetCooldown.Seconds())).Scan(&recent); err != nil {
		return "", err
	}
	if recent > 0 {
		return "", ErrResetTooOften
	}

	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	tok := base64.RawURLEncoding.EncodeToString(b)
	if _, err := r.DB.ExecContext(ctx, `
		INSERT INTO password_resets (token_hash, user_id, ip, expires_at)
		VALUES (?,?,?,?)`, hashReset(tok), userID, ipBytes(ip), time.Now().Add(ResetTTL)); err != nil {
		return "", err
	}
	return tok, nil
}

// Consume danh dau ma da dung va tra ve user_id.
//
// Dung mot lan duoc bao dam bang UPDATE co dieu kien used_at IS NULL: hai request chay
// song song thi chi mot cai co RowsAffected = 1.
func (r *Resets) Consume(ctx context.Context, tok string) (int64, error) {
	if tok == "" {
		return 0, ErrResetInvalid
	}
	h := hashReset(tok)
	res, err := r.DB.ExecContext(ctx, `
		UPDATE password_resets SET used_at = NOW()
		 WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`, h)
	if err != nil {
		return 0, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return 0, err
	}
	if n == 0 {
		return 0, ErrResetInvalid
	}
	var uid int64
	if err := r.DB.QueryRowContext(ctx,
		`SELECT user_id FROM password_resets WHERE token_hash = ?`, h).Scan(&uid); err != nil {
		return 0, err
	}
	return uid, nil
}

// Valid kiem tra ma con dung duoc khong, KHONG tieu thu.
// Dung de hien form dat mat khau moi ma chua tieu ma.
func (r *Resets) Valid(ctx context.Context, tok string) bool {
	if tok == "" {
		return false
	}
	var n int
	err := r.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM password_resets
		 WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`, hashReset(tok)).Scan(&n)
	return err == nil && n > 0
}

// SetPassword dat mat khau moi (khong can mat khau cu) sau khi ma da duoc tieu thu.
func (r *Repo) SetPassword(ctx context.Context, userID int64, newPass string) error {
	if err := ValidatePassword(newPass); err != nil {
		return err
	}
	hash, err := HashPassword(newPass)
	if err != nil {
		return err
	}
	_, err = r.DB.ExecContext(ctx, `UPDATE users SET password_hash = ? WHERE id = ?`, hash, userID)
	return err
}

// ByEmail tim tai khoan theo email.
func (r *Repo) ByEmail(ctx context.Context, email string) (*User, error) {
	u := &User{}
	err := r.DB.QueryRowContext(ctx, `
		SELECT id, username, email, phone, password_hash, status, created_at
		  FROM users WHERE email = ?`, email).
		Scan(&u.ID, &u.Username, &u.Email, &u.Phone, &u.PasswordHash, &u.Status, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

// Cleanup xoa phieu da het han.
func (r *Resets) Cleanup(ctx context.Context) error {
	_, err := r.DB.ExecContext(ctx,
		`DELETE FROM password_resets WHERE expires_at < NOW() - INTERVAL 1 DAY`)
	return err
}
