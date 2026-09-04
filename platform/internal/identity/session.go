package identity

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"net/http"
	"time"
)

// CookieName la ten cookie phien tai id.domain.com. Tien to __Host- buoc trinh duyet
// chi gui kem khi cookie duoc dat voi Secure, Path=/ va khong co Domain — nghia la
// mot sub-domain bi chiem cung khong ghi de duoc cookie nay.
const CookieName = "__Host-idsess"

// CookieNameInsecure dung khi chay HTTP thuan (moi truong dev): tien to __Host- doi
// hoi Secure nen khong dung duoc.
const CookieNameInsecure = "idsess"

type Session struct {
	ID     string
	UserID int64
}

type Sessions struct {
	DB  *sql.DB
	TTL time.Duration
}

func newSessionID() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// Create mo mot phien moi cho nguoi dung.
func (s *Sessions) Create(ctx context.Context, userID int64, ip, ua string) (string, error) {
	id, err := newSessionID()
	if err != nil {
		return "", err
	}
	if len(ua) > 255 {
		ua = ua[:255]
	}
	_, err = s.DB.ExecContext(ctx, `
		INSERT INTO sessions (id, user_id, ip, user_agent, expires_at)
		VALUES (?,?,?,?,?)`, id, userID, ipBytes(ip), ua, time.Now().Add(s.TTL))
	if err != nil {
		return "", err
	}
	return id, nil
}

// Get tra ve phien con hieu luc.
func (s *Sessions) Get(ctx context.Context, id string) (*Session, error) {
	if id == "" {
		return nil, errors.New("phien rong")
	}
	var sess Session
	err := s.DB.QueryRowContext(ctx, `
		SELECT id, user_id FROM sessions
		 WHERE id = ? AND revoked_at IS NULL AND expires_at > NOW()`, id).
		Scan(&sess.ID, &sess.UserID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &sess, err
}

// Revoke huy mot phien (dang xuat).
func (s *Sessions) Revoke(ctx context.Context, id string) error {
	_, err := s.DB.ExecContext(ctx, `UPDATE sessions SET revoked_at = NOW() WHERE id = ?`, id)
	return err
}

// RevokeAllForUser huy moi phien cua mot nguoi dung (doi mat khau, khoa tai khoan).
func (s *Sessions) RevokeAllForUser(ctx context.Context, userID int64) error {
	_, err := s.DB.ExecContext(ctx,
		`UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`, userID)
	return err
}

// Cleanup xoa phien da het han.
func (s *Sessions) Cleanup(ctx context.Context) error {
	_, err := s.DB.ExecContext(ctx, `DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL 7 DAY`)
	return err
}

// SetCookie dat cookie phien len phan hoi.
func SetCookie(w http.ResponseWriter, id string, secure bool, ttl time.Duration) {
	name := CookieName
	if !secure {
		name = CookieNameInsecure
	}
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    id,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode, // Lax de quay ve tu redirect cua OAuth van gui cookie
		MaxAge:   int(ttl.Seconds()),
	})
}

// ClearCookie xoa cookie phien.
func ClearCookie(w http.ResponseWriter, secure bool) {
	name := CookieName
	if !secure {
		name = CookieNameInsecure
	}
	http.SetCookie(w, &http.Cookie{
		Name: name, Value: "", Path: "/", HttpOnly: true,
		Secure: secure, SameSite: http.SameSiteLaxMode, MaxAge: -1,
	})
}

// CookieValue doc cookie phien tu request.
func CookieValue(r *http.Request, secure bool) string {
	name := CookieName
	if !secure {
		name = CookieNameInsecure
	}
	if c, err := r.Cookie(name); err == nil {
		return c.Value
	}
	return ""
}
