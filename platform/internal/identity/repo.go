package identity

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net"
	"regexp"
	"strings"
	"time"
)

var (
	ErrNotFound        = errors.New("khong tim thay tai khoan")
	ErrWrongPassword   = errors.New("mat khau khong dung")
	ErrLocked          = errors.New("tai khoan da bi khoa")
	ErrTooManyAttempts = errors.New("thu qua nhieu lan, vui long doi")
	ErrUsernameTaken   = errors.New("tai khoan da duoc su dung")
	ErrEmailTaken      = errors.New("email da duoc su dung")
)

// Quy tac dat ten giu giong he cu de tai khoan di tru sang khong bi tu choi:
// 6-15 ky tu, chi chu thuong / so / gach duoi.
var usernameRe = regexp.MustCompile(`^[a-z0-9_]{6,15}$`)

// ValidateUsername kiem tra dinh dang ten dang nhap.
func ValidateUsername(u string) error {
	if !usernameRe.MatchString(u) {
		return errors.New("tài khoản dài 6-15 ký tự, chỉ gồm chữ thường, số và gạch dưới")
	}
	return nil
}

// ValidatePassword: khong ap toi da vi Argon2id khong cat chuoi nhu bcrypt.
func ValidatePassword(p string) error {
	if len([]rune(p)) < 8 {
		return errors.New("mật khẩu phải từ 8 ký tự trở lên")
	}
	if len(p) > 1024 {
		return errors.New("mật khẩu quá dài")
	}
	return nil
}

type User struct {
	ID           int64
	Username     string
	Email        sql.NullString
	Phone        sql.NullString
	PasswordHash string
	Status       string
	CreatedAt    time.Time
}

type Repo struct {
	DB *sql.DB
	// MaxAttempts / Window dieu khien chong do mat khau.
	MaxAttempts int
	Window      time.Duration
}

func ipBytes(ip string) any {
	if parsed := net.ParseIP(ip); parsed != nil {
		if v4 := parsed.To4(); v4 != nil {
			return []byte(v4)
		}
		return []byte(parsed.To16())
	}
	return nil
}

// Create tao tai khoan moi. Tra ve ErrUsernameTaken / ErrEmailTaken khi trung.
func (r *Repo) Create(ctx context.Context, username, email, password, ip string) (int64, error) {
	username = strings.ToLower(strings.TrimSpace(username))
	if err := ValidateUsername(username); err != nil {
		return 0, err
	}
	if err := ValidatePassword(password); err != nil {
		return 0, err
	}
	hash, err := HashPassword(password)
	if err != nil {
		return 0, err
	}
	var emailVal any
	if e := strings.ToLower(strings.TrimSpace(email)); e != "" {
		emailVal = e
	}
	res, err := r.DB.ExecContext(ctx, `
		INSERT INTO users (username, email, password_hash, last_login_ip)
		VALUES (?,?,?,?)`, username, emailVal, hash, ipBytes(ip))
	if err != nil {
		// 1062 = Duplicate entry. Phan biet theo ten chi muc de bao dung cho.
		if strings.Contains(err.Error(), "uq_users_username") {
			return 0, ErrUsernameTaken
		}
		if strings.Contains(err.Error(), "uq_users_email") {
			return 0, ErrEmailTaken
		}
		return 0, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	// Moi nguoi dung co mot tai khoan vi ngay tu dau, de khong phai xu ly truong hop
	// "chua co vi" o moi cho dung den tien.
	if _, err := r.DB.ExecContext(ctx,
		`INSERT INTO wallet_accounts (kind, user_id, currency) VALUES ('user', ?, 'XU')`, id); err != nil {
		return 0, fmt.Errorf("tao vi: %w", err)
	}
	return id, nil
}

func (r *Repo) ByUsername(ctx context.Context, username string) (*User, error) {
	u := &User{}
	err := r.DB.QueryRowContext(ctx, `
		SELECT id, username, email, phone, password_hash, status, created_at
		  FROM users WHERE username = ?`, strings.ToLower(strings.TrimSpace(username))).
		Scan(&u.ID, &u.Username, &u.Email, &u.Phone, &u.PasswordHash, &u.Status, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *Repo) ByID(ctx context.Context, id int64) (*User, error) {
	u := &User{}
	err := r.DB.QueryRowContext(ctx, `
		SELECT id, username, email, phone, password_hash, status, created_at
		  FROM users WHERE id = ?`, id).
		Scan(&u.ID, &u.Username, &u.Email, &u.Phone, &u.PasswordHash, &u.Status, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

// recentFailures dem so lan sai trong cua so thoi gian.
func (r *Repo) recentFailures(ctx context.Context, scope, key string) (int, error) {
	var n int
	err := r.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM login_attempts
		 WHERE scope = ? AND scope_key = ? AND succeeded = 0
		   AND created_at > (NOW() - INTERVAL ? SECOND)`,
		scope, key, int(r.Window.Seconds())).Scan(&n)
	return n, err
}

func (r *Repo) recordAttempt(ctx context.Context, scope, key string, ok bool) {
	s := 0
	if ok {
		s = 1
	}
	_, _ = r.DB.ExecContext(ctx,
		`INSERT INTO login_attempts (scope, scope_key, succeeded) VALUES (?,?,?)`, scope, key, s)
}

// Authenticate kiem tra mat khau va cap nhat dau vet dang nhap.
//
// Dem theo CA tai khoan lan IP: dem theo tai khoan chan viec do mot tai khoan tu
// nhieu IP, dem theo IP chan viec quet nhieu tai khoan tu mot may.
func (r *Repo) Authenticate(ctx context.Context, username, password, ip string) (*User, error) {
	username = strings.ToLower(strings.TrimSpace(username))

	for _, s := range []struct{ scope, key string }{{"username", username}, {"ip", ip}} {
		n, err := r.recentFailures(ctx, s.scope, s.key)
		if err != nil {
			return nil, err
		}
		if n >= r.MaxAttempts {
			return nil, ErrTooManyAttempts
		}
	}

	u, err := r.ByUsername(ctx, username)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			// Van ghi nhan de khong the do xem tai khoan nao ton tai bang so lan bi chan.
			r.recordAttempt(ctx, "username", username, false)
			r.recordAttempt(ctx, "ip", ip, false)
			return nil, ErrWrongPassword
		}
		return nil, err
	}
	if u.Status != "active" {
		return nil, ErrLocked
	}
	ok, err := VerifyPassword(password, u.PasswordHash)
	if err != nil || !ok {
		r.recordAttempt(ctx, "username", username, false)
		r.recordAttempt(ctx, "ip", ip, false)
		return nil, ErrWrongPassword
	}

	r.recordAttempt(ctx, "username", username, true)
	r.recordAttempt(ctx, "ip", ip, true)

	// Tham so Argon2id co the duoc nang theo thoi gian; bam lai ngay khi con biet
	// mat khau ban ro.
	if NeedsRehash(u.PasswordHash) {
		if nh, err := HashPassword(password); err == nil {
			_, _ = r.DB.ExecContext(ctx, `UPDATE users SET password_hash = ? WHERE id = ?`, nh, u.ID)
		}
	}
	_, _ = r.DB.ExecContext(ctx,
		`UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?`, ipBytes(ip), u.ID)
	return u, nil
}

// ChangePassword doi mat khau sau khi da xac minh mat khau cu.
func (r *Repo) ChangePassword(ctx context.Context, userID int64, oldPass, newPass string) error {
	u, err := r.ByID(ctx, userID)
	if err != nil {
		return err
	}
	ok, err := VerifyPassword(oldPass, u.PasswordHash)
	if err != nil || !ok {
		return ErrWrongPassword
	}
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
