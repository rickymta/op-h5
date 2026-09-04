package oidc

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var ErrPKCEMismatch = errors.New("code_verifier khong khop code_challenge")

// VerifyPKCE kiem tra code_verifier theo RFC 7636.
//
// Chi chap nhan S256. Phuong thuc "plain" bi tu choi co y: no khong bao ve duoc gi
// khi ke tan cong doc duoc request dau tien.
func VerifyPKCE(method, challenge, verifier string) error {
	if method != "S256" {
		return fmt.Errorf("code_challenge_method %q khong duoc ho tro, chi chap nhan S256", method)
	}
	// RFC 7636: verifier dai 43-128 ky tu.
	if n := len(verifier); n < 43 || n > 128 {
		return fmt.Errorf("code_verifier dai %d ky tu, phai trong khoang 43-128", n)
	}
	sum := sha256.Sum256([]byte(verifier))
	got := base64.RawURLEncoding.EncodeToString(sum[:])
	if subtle.ConstantTimeCompare([]byte(got), []byte(challenge)) != 1 {
		return ErrPKCEMismatch
	}
	return nil
}

// Claims dung chung cho ID token va access token.
type Claims struct {
	Issuer   string
	Subject  int64
	Audience string
	Scope    string
	Nonce    string
	TTL      time.Duration
	// Kind phan biet hai loai token de mot cai khong dung thay cai kia.
	Kind string // "id" | "access"
}

// Mint ky mot JWT RS256.
func (s *Signer) Mint(c Claims) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"iss": c.Issuer,
		"sub": strconv.FormatInt(c.Subject, 10),
		"aud": c.Audience,
		"iat": now.Unix(),
		"exp": now.Add(c.TTL).Unix(),
		"typ": c.Kind,
	}
	if c.Scope != "" {
		claims["scope"] = c.Scope
	}
	if c.Nonce != "" {
		claims["nonce"] = c.Nonce
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tok.Header["kid"] = s.Kid
	return tok.SignedString(s.Key)
}

// Verify kiem tra chu ky va cac claim bat buoc. Dung o phia game (Adapter) va o
// endpoint /userinfo.
func (s *Signer) Verify(tokenStr, issuer, audience, kind string) (int64, string, error) {
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("thuat toan ky khong duoc chap nhan: %v", t.Header["alg"])
		}
		return &s.Key.PublicKey, nil
	}, jwt.WithValidMethods([]string{"RS256"}), jwt.WithIssuer(issuer), jwt.WithAudience(audience))
	if err != nil {
		return 0, "", err
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return 0, "", errors.New("claim khong doc duoc")
	}
	if t, _ := claims["typ"].(string); t != kind {
		return 0, "", fmt.Errorf("token loai %q, can loai %q", t, kind)
	}
	sub, _ := claims["sub"].(string)
	uid, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		return 0, "", errors.New("sub khong phai so")
	}
	scope, _ := claims["scope"].(string)
	return uid, scope, nil
}

// verifyNoAudience xac minh chu ky, issuer, han dung va loai token nhung KHONG rang
// buoc audience. Dung o /userinfo, noi ta chap nhan access token cua bat ky game nao
// do chinh he thong ID cap. Cac cho khac phai dung Verify de token cua game nay
// khong dung duoc cho game kia.
func (s *Signer) verifyNoAudience(tokenStr, issuer, kind string) (int64, string, error) {
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("thuat toan ky khong duoc chap nhan: %v", t.Header["alg"])
		}
		return &s.Key.PublicKey, nil
	}, jwt.WithValidMethods([]string{"RS256"}), jwt.WithIssuer(issuer))
	if err != nil {
		return 0, "", err
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return 0, "", errors.New("claim khong doc duoc")
	}
	if t, _ := claims["typ"].(string); t != kind {
		return 0, "", fmt.Errorf("token loai %q, can loai %q", t, kind)
	}
	sub, _ := claims["sub"].(string)
	uid, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		return 0, "", errors.New("sub khong phai so")
	}
	scope, _ := claims["scope"].(string)
	return uid, scope, nil
}
