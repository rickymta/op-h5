package oidc

import (
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"
)

// Signer giu khoa RSA dung de ky ID token va access token.
//
// Khoa den tu bien moi truong (ID_SIGNING_KEY_PEM), khong bao gio nam trong repo.
// kid duoc suy ra tu chinh khoa cong khai nen doi khoa la kid tu doi theo, va client
// dang giu token cu van xac minh duoc chung nao khoa cu con trong JWKS.
type Signer struct {
	Key *rsa.PrivateKey
	Kid string
}

// NewSigner doc khoa rieng RSA tu chuoi PEM (PKCS#1 hoac PKCS#8).
func NewSigner(pemStr string) (*Signer, error) {
	block, _ := pem.Decode([]byte(pemStr))
	if block == nil {
		return nil, errors.New("ID_SIGNING_KEY_PEM khong phai PEM hop le")
	}
	var key *rsa.PrivateKey
	switch block.Type {
	case "RSA PRIVATE KEY":
		k, err := x509.ParsePKCS1PrivateKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("doc khoa PKCS#1: %w", err)
		}
		key = k
	case "PRIVATE KEY":
		k, err := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("doc khoa PKCS#8: %w", err)
		}
		rk, ok := k.(*rsa.PrivateKey)
		if !ok {
			return nil, errors.New("khoa PKCS#8 khong phai RSA")
		}
		key = rk
	default:
		return nil, fmt.Errorf("khoi PEM khong ho tro: %s", block.Type)
	}
	if key.N.BitLen() < 2048 {
		return nil, fmt.Errorf("khoa RSA %d bit qua ngan, toi thieu 2048", key.N.BitLen())
	}
	return &Signer{Key: key, Kid: thumbprint(&key.PublicKey)}, nil
}

// thumbprint tinh kid theo RFC 7638 (JWK thumbprint), rut gon cho khoa RSA.
func thumbprint(pub *rsa.PublicKey) string {
	n := base64.RawURLEncoding.EncodeToString(pub.N.Bytes())
	e := base64.RawURLEncoding.EncodeToString(big.NewInt(int64(pub.E)).Bytes())
	canonical := fmt.Sprintf(`{"e":"%s","kty":"RSA","n":"%s"}`, e, n)
	sum := sha256.Sum256([]byte(canonical))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// JWK la mot khoa trong tap JWKS.
type JWK struct {
	Kty string `json:"kty"`
	Use string `json:"use"`
	Alg string `json:"alg"`
	Kid string `json:"kid"`
	N   string `json:"n"`
	E   string `json:"e"`
}

// JWKS tra ve tap khoa cong khai de game xac minh token ma khong phai goi nguoc ve ID.
func (s *Signer) JWKS() map[string][]JWK {
	pub := &s.Key.PublicKey
	return map[string][]JWK{"keys": {{
		Kty: "RSA",
		Use: "sig",
		Alg: "RS256",
		Kid: s.Kid,
		N:   base64.RawURLEncoding.EncodeToString(pub.N.Bytes()),
		E:   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(pub.E)).Bytes()),
	}}}
}
