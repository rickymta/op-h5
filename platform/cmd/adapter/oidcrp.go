package main

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// rp la ben tin cay (relying party) cua he thong ID.
//
// Tu viet thay vi keo mot thu vien OIDC: ta chi can luong authorization_code + PKCE
// voi mot provider duy nhat do chinh minh van hanh, va tu viet thi kiem soat duoc
// chinh xac nhung gi duoc xac minh.
type rp struct {
	Issuer      string
	ClientID    string
	Secret      string
	RedirectURI string
	HTTP        *http.Client

	mu       sync.RWMutex
	meta     providerMeta
	keys     map[string]*rsa.PublicKey
	fetched  time.Time
	cacheTTL time.Duration
}

type providerMeta struct {
	Issuer        string `json:"issuer"`
	AuthzEndpoint string `json:"authorization_endpoint"`
	TokenEndpoint string `json:"token_endpoint"`
	JWKSURI       string `json:"jwks_uri"`
	UserInfo      string `json:"userinfo_endpoint"`
}

func newRP(issuer, clientID, secret, redirectURI string) *rp {
	return &rp{
		Issuer: strings.TrimRight(issuer, "/"), ClientID: clientID,
		Secret: secret, RedirectURI: redirectURI,
		HTTP:     &http.Client{Timeout: 10 * time.Second},
		keys:     map[string]*rsa.PublicKey{},
		cacheTTL: 10 * time.Minute,
	}
}

// discover doc tai lieu cau hinh va JWKS, co cache.
func (r *rp) discover(ctx context.Context) error {
	r.mu.RLock()
	fresh := time.Since(r.fetched) < r.cacheTTL && r.meta.TokenEndpoint != ""
	r.mu.RUnlock()
	if fresh {
		return nil
	}

	var meta providerMeta
	if err := r.getJSON(ctx, r.Issuer+"/.well-known/openid-configuration", &meta); err != nil {
		return fmt.Errorf("doc discovery: %w", err)
	}
	if meta.Issuer != r.Issuer {
		return fmt.Errorf("issuer trong discovery (%q) khac cau hinh (%q)", meta.Issuer, r.Issuer)
	}

	var jwks struct {
		Keys []struct {
			Kty, Kid, N, E string
		} `json:"keys"`
	}
	if err := r.getJSON(ctx, meta.JWKSURI, &jwks); err != nil {
		return fmt.Errorf("doc JWKS: %w", err)
	}
	keys := map[string]*rsa.PublicKey{}
	for _, k := range jwks.Keys {
		if k.Kty != "RSA" {
			continue
		}
		nb, err := base64.RawURLEncoding.DecodeString(k.N)
		if err != nil {
			continue
		}
		eb, err := base64.RawURLEncoding.DecodeString(k.E)
		if err != nil {
			continue
		}
		// E thuong la 3 byte (65537); dem 0 o dau de doc thanh uint32.
		padded := make([]byte, 4)
		copy(padded[4-len(eb):], eb)
		keys[k.Kid] = &rsa.PublicKey{
			N: new(big.Int).SetBytes(nb),
			E: int(binary.BigEndian.Uint32(padded)),
		}
	}
	if len(keys) == 0 {
		return errors.New("JWKS khong co khoa RSA nao dung duoc")
	}

	r.mu.Lock()
	r.meta, r.keys, r.fetched = meta, keys, time.Now()
	r.mu.Unlock()
	return nil
}

func (r *rp) getJSON(ctx context.Context, u string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	resp, err := r.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d tu %s", resp.StatusCode, u)
	}
	return json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(out)
}

// pkce la cap verifier/challenge cua mot lan dang nhap.
type pkce struct{ Verifier, Challenge string }

func newPKCE() (pkce, error) {
	b := make([]byte, 48) // 48 byte -> 64 ky tu base64url, nam trong khoang 43-128
	if _, err := rand.Read(b); err != nil {
		return pkce{}, err
	}
	v := base64.RawURLEncoding.EncodeToString(b)
	sum := sha256.Sum256([]byte(v))
	return pkce{Verifier: v, Challenge: base64.RawURLEncoding.EncodeToString(sum[:])}, nil
}

func randomState() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// AuthURL dung URL de chuyen nguoi choi sang he thong ID.
func (r *rp) AuthURL(ctx context.Context, state, challenge, nonce string) (string, error) {
	if err := r.discover(ctx); err != nil {
		return "", err
	}
	r.mu.RLock()
	endpoint := r.meta.AuthzEndpoint
	r.mu.RUnlock()

	q := url.Values{
		"client_id":             {r.ClientID},
		"redirect_uri":          {r.RedirectURI},
		"response_type":         {"code"},
		"scope":                 {"openid profile wallet"},
		"state":                 {state},
		"nonce":                 {nonce},
		"code_challenge":        {challenge},
		"code_challenge_method": {"S256"},
	}
	return endpoint + "?" + q.Encode(), nil
}

type tokenSet struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
	ExpiresIn    int    `json:"expires_in"`
}

// Exchange doi ma uy quyen lay token.
func (r *rp) Exchange(ctx context.Context, code, verifier string) (*tokenSet, error) {
	if err := r.discover(ctx); err != nil {
		return nil, err
	}
	r.mu.RLock()
	endpoint := r.meta.TokenEndpoint
	r.mu.RUnlock()

	form := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {r.RedirectURI},
		"client_id":     {r.ClientID},
		"code_verifier": {verifier},
	}
	if r.Secret != "" {
		form.Set("client_secret", r.Secret)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := r.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("doi token that bai (HTTP %d): %.200s", resp.StatusCode, body)
	}
	var ts tokenSet
	if err := json.Unmarshal(body, &ts); err != nil {
		return nil, err
	}
	return &ts, nil
}

// VerifyIDToken xac minh id_token va tra ve id nguoi dung.
//
// Kiem tra day du: chu ky (theo kid trong JWKS), issuer, audience, han dung, va nonce.
// Bo bat ky muc nao trong so do deu mo mot duong gia mao.
func (r *rp) VerifyIDToken(ctx context.Context, raw, wantNonce string) (int64, error) {
	if err := r.discover(ctx); err != nil {
		return 0, err
	}
	tok, err := jwt.Parse(raw, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("thuat toan ky khong chap nhan: %v", t.Header["alg"])
		}
		kid, _ := t.Header["kid"].(string)
		r.mu.RLock()
		key, ok := r.keys[kid]
		r.mu.RUnlock()
		if !ok {
			return nil, fmt.Errorf("khong tim thay khoa kid=%q trong JWKS", kid)
		}
		return key, nil
	},
		jwt.WithValidMethods([]string{"RS256"}),
		jwt.WithIssuer(r.Issuer),
		jwt.WithAudience(r.ClientID),
	)
	if err != nil {
		return 0, err
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return 0, errors.New("claim khong doc duoc")
	}
	if typ, _ := claims["typ"].(string); typ != "id" {
		return 0, fmt.Errorf("token loai %q, can id_token", typ)
	}
	if wantNonce != "" {
		if got, _ := claims["nonce"].(string); got != wantNonce {
			return 0, errors.New("nonce khong khop — nghi bi phat lai")
		}
	}
	sub, _ := claims["sub"].(string)
	var uid int64
	if _, err := fmt.Sscanf(sub, "%d", &uid); err != nil || uid <= 0 {
		return 0, fmt.Errorf("sub khong hop le: %q", sub)
	}
	return uid, nil
}
