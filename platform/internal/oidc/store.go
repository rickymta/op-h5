package oidc

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"strings"
	"time"
)

var (
	ErrClientUnknown  = errors.New("client khong ton tai hoac da tat")
	ErrCodeInvalid    = errors.New("ma uy quyen khong hop le hoac da het han")
	ErrCodeReplayed   = errors.New("ma uy quyen da duoc dung roi")
	ErrRefreshInvalid = errors.New("refresh token khong hop le")
	ErrRefreshReused  = errors.New("refresh token da bi xoay vong (nghi bi danh cap)")
)

// Client la mot game dang ky voi he thong ID.
type Client struct {
	ID             string
	Name           string
	SecretHash     sql.NullString
	RedirectURIs   []string
	PostLogoutURIs []string
	Scopes         []string
	RequirePKCE    bool
}

// IsConfidential cho biet client co client_secret hay khong.
func (c *Client) IsConfidential() bool { return c.SecretHash.Valid && c.SecretHash.String != "" }

// AllowsRedirect so khop TUYET DOI. Khong tien to, khong wildcard: mot redirect_uri
// khop long la duong de danh cap ma uy quyen.
func (c *Client) AllowsRedirect(uri string) bool {
	for _, u := range c.RedirectURIs {
		if u == uri {
			return true
		}
	}
	return false
}

type Store struct{ DB *sql.DB }

// AllowsPostLogout cho biet mot dia chi co duoc phep nhan nguoi dung sau khi dang xuat.
//
// Phai khop TUYET DOI voi mot dia chi da dang ky. Truoc day `Logout` lay thang tham so
// `post_logout_redirect_uri` tu URL roi `http.Redirect` — tuc la open redirect ngay tren
// domain dang nhap: ke tan cong gui link `id.<domain>/oauth/logout?post_logout_redirect_uri=
// https://trang-gia` la day duoc nguoi dung sang trang gia mao voi xuat phat diem la domain
// that. Cot `post_logout_uris` von da co trong schema tu dau nhung chua ai dung.
func (c *Client) AllowsPostLogout(uri string) bool {
	for _, u := range c.PostLogoutURIs {
		if u != "" && u == uri {
			return true
		}
	}
	return false
}

func splitLines(s string) []string {
	out := []string{}
	for _, l := range strings.Split(s, "\n") {
		if l = strings.TrimSpace(l); l != "" {
			out = append(out, l)
		}
	}
	return out
}

func (s *Store) Client(ctx context.Context, id string) (*Client, error) {
	var (
		c                     Client
		redirects, postLogout sql.NullString
		scopes                string
		requirePKCE           bool
	)
	err := s.DB.QueryRowContext(ctx, `
		SELECT client_id, name, secret_hash, redirect_uris, post_logout_uris, scopes, require_pkce
		  FROM oauth_clients WHERE client_id = ? AND status = 'active'`, id).
		Scan(&c.ID, &c.Name, &c.SecretHash, &redirects, &postLogout, &scopes, &requirePKCE)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrClientUnknown
	}
	if err != nil {
		return nil, err
	}
	c.RedirectURIs = splitLines(redirects.String)
	c.PostLogoutURIs = splitLines(postLogout.String)
	c.Scopes = strings.Fields(scopes)
	c.RequirePKCE = requirePKCE
	return &c, nil
}

// randomToken sinh chuoi ngau nhien 32 byte dang base64url.
func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// hashToken bam token truoc khi luu. DB chi bao gio giu ban bam, nen lo DB khong
// dong nghia voi lo token con hieu luc.
func hashToken(tok string) string {
	sum := sha256.Sum256([]byte(tok))
	return hex.EncodeToString(sum[:])
}

// AuthCodeRequest la du lieu can luu kem mot ma uy quyen.
type AuthCodeRequest struct {
	ClientID      string
	UserID        int64
	RedirectURI   string
	Scope         string
	Nonce         string
	CodeChallenge string
	Method        string
}

// IssueCode sinh ma uy quyen dung mot lan va tra ve ban ro (chi luu ban bam).
func (s *Store) IssueCode(ctx context.Context, req AuthCodeRequest, ttl time.Duration) (string, error) {
	code, err := randomToken()
	if err != nil {
		return "", err
	}
	_, err = s.DB.ExecContext(ctx, `
		INSERT INTO oauth_auth_codes
		  (code_hash, client_id, user_id, redirect_uri, scope, nonce, code_challenge, code_challenge_method, expires_at)
		VALUES (?,?,?,?,?,?,?,?,?)`,
		hashToken(code), req.ClientID, req.UserID, req.RedirectURI, req.Scope,
		nullIfEmpty(req.Nonce), req.CodeChallenge, req.Method, time.Now().Add(ttl))
	if err != nil {
		return "", err
	}
	return code, nil
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// ConsumedCode la ma uy quyen sau khi doi thanh cong.
type ConsumedCode struct {
	ClientID      string
	UserID        int64
	RedirectURI   string
	Scope         string
	Nonce         string
	CodeChallenge string
	Method        string
}

// ConsumeCode danh dau ma da dung va tra ve noi dung.
//
// Dung mot lan duoc bao dam bang UPDATE co dieu kien consumed_at IS NULL: hai request
// chay song song thi chi mot cai co RowsAffected = 1. Neu ma da bi tieu thu tu truoc,
// tra ve ErrCodeReplayed de ben goi thu hoi toan bo token da cap cho phien do
// (khuyen nghi cua RFC 6819 khi nghi ma bi danh cap).
func (s *Store) ConsumeCode(ctx context.Context, code string) (*ConsumedCode, error) {
	h := hashToken(code)
	res, err := s.DB.ExecContext(ctx, `
		UPDATE oauth_auth_codes SET consumed_at = NOW()
		 WHERE code_hash = ? AND consumed_at IS NULL AND expires_at > NOW()`, h)
	if err != nil {
		return nil, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if n == 0 {
		// Phan biet "da dung roi" voi "khong ton tai / het han".
		var consumed sql.NullTime
		err := s.DB.QueryRowContext(ctx, `SELECT consumed_at FROM oauth_auth_codes WHERE code_hash = ?`, h).Scan(&consumed)
		if err == nil && consumed.Valid {
			return nil, ErrCodeReplayed
		}
		return nil, ErrCodeInvalid
	}
	var (
		c     ConsumedCode
		nonce sql.NullString
	)
	err = s.DB.QueryRowContext(ctx, `
		SELECT client_id, user_id, redirect_uri, scope, nonce, code_challenge, code_challenge_method
		  FROM oauth_auth_codes WHERE code_hash = ?`, h).
		Scan(&c.ClientID, &c.UserID, &c.RedirectURI, &c.Scope, &nonce, &c.CodeChallenge, &c.Method)
	if err != nil {
		return nil, err
	}
	c.Nonce = nonce.String
	return &c, nil
}

// IssueRefreshToken cap refresh token moi.
func (s *Store) IssueRefreshToken(ctx context.Context, clientID string, userID int64, scope string, ttl time.Duration) (string, error) {
	tok, err := randomToken()
	if err != nil {
		return "", err
	}
	_, err = s.DB.ExecContext(ctx, `
		INSERT INTO oauth_refresh_tokens (token_hash, client_id, user_id, scope, expires_at)
		VALUES (?,?,?,?,?)`, hashToken(tok), clientID, userID, scope, time.Now().Add(ttl))
	if err != nil {
		return "", err
	}
	return tok, nil
}

// RefreshGrant la noi dung cua mot refresh token con hieu luc.
type RefreshGrant struct {
	ClientID string
	UserID   int64
	Scope    string
}

// RotateRefreshToken doi refresh token cu lay token moi.
//
// Phat hien dung lai: token da bi xoay vong ma con duoc gui lai nghia la co ban sao
// dang luu hanh. Khi do thu hoi TOAN BO refresh token cua nguoi dung o client do,
// buoc ho dang nhap lai.
func (s *Store) RotateRefreshToken(ctx context.Context, old string, ttl time.Duration) (*RefreshGrant, string, error) {
	h := hashToken(old)
	var (
		g         RefreshGrant
		revokedAt sql.NullTime
		rotatedTo sql.NullString
		expiresAt time.Time
	)
	err := s.DB.QueryRowContext(ctx, `
		SELECT client_id, user_id, scope, revoked_at, rotated_to, expires_at
		  FROM oauth_refresh_tokens WHERE token_hash = ?`, h).
		Scan(&g.ClientID, &g.UserID, &g.Scope, &revokedAt, &rotatedTo, &expiresAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, "", ErrRefreshInvalid
	}
	if err != nil {
		return nil, "", err
	}
	if rotatedTo.Valid || revokedAt.Valid {
		_, _ = s.DB.ExecContext(ctx, `
			UPDATE oauth_refresh_tokens SET revoked_at = NOW()
			 WHERE user_id = ? AND client_id = ? AND revoked_at IS NULL`, g.UserID, g.ClientID)
		return nil, "", ErrRefreshReused
	}
	if time.Now().After(expiresAt) {
		return nil, "", ErrRefreshInvalid
	}

	next, err := randomToken()
	if err != nil {
		return nil, "", err
	}
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, "", err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO oauth_refresh_tokens (token_hash, client_id, user_id, scope, expires_at)
		VALUES (?,?,?,?,?)`, hashToken(next), g.ClientID, g.UserID, g.Scope, time.Now().Add(ttl)); err != nil {
		return nil, "", err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE oauth_refresh_tokens SET revoked_at = NOW(), rotated_to = ?
		 WHERE token_hash = ? AND revoked_at IS NULL`, hashToken(next), h); err != nil {
		return nil, "", err
	}
	if err := tx.Commit(); err != nil {
		return nil, "", err
	}
	return &g, next, nil
}

// RevokeUserTokens thu hoi moi refresh token cua mot nguoi dung (dung khi doi mat khau,
// khoa tai khoan, hoac phat hien ma uy quyen bi dung lai).
func (s *Store) RevokeUserTokens(ctx context.Context, userID int64) error {
	_, err := s.DB.ExecContext(ctx,
		`UPDATE oauth_refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`, userID)
	return err
}

// CleanupExpired xoa ma uy quyen va refresh token da het han. Goi dinh ky.
func (s *Store) CleanupExpired(ctx context.Context) error {
	if _, err := s.DB.ExecContext(ctx, `DELETE FROM oauth_auth_codes WHERE expires_at < NOW() - INTERVAL 1 DAY`); err != nil {
		return err
	}
	_, err := s.DB.ExecContext(ctx, `DELETE FROM oauth_refresh_tokens WHERE expires_at < NOW() - INTERVAL 7 DAY`)
	return err
}
