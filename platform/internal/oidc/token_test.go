package oidc

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"strings"
	"testing"
	"time"
)

func testSigner(t *testing.T) *Signer {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("sinh khoa: %v", err)
	}
	der := x509.MarshalPKCS1PrivateKey(key)
	p := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: der})
	s, err := NewSigner(string(p))
	if err != nil {
		t.Fatalf("NewSigner: %v", err)
	}
	return s
}

func TestNewSignerRejectsBadInput(t *testing.T) {
	if _, err := NewSigner("khong phai pem"); err == nil {
		t.Error("chuoi khong phai PEM phai bi tu choi")
	}
	// Khoa 1024 bit qua ngan.
	key, _ := rsa.GenerateKey(rand.Reader, 1024)
	p := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)})
	if _, err := NewSigner(string(p)); err == nil {
		t.Error("khoa 1024 bit phai bi tu choi")
	}
}

func TestJWKSMatchesKid(t *testing.T) {
	s := testSigner(t)
	set := s.JWKS()
	keys := set["keys"]
	if len(keys) != 1 {
		t.Fatalf("muon 1 khoa trong JWKS, co %d", len(keys))
	}
	if keys[0].Kid != s.Kid {
		t.Errorf("kid trong JWKS (%s) khac kid cua signer (%s)", keys[0].Kid, s.Kid)
	}
	if keys[0].Alg != "RS256" || keys[0].Use != "sig" {
		t.Errorf("JWKS phai khai bao alg=RS256 use=sig, duoc alg=%s use=%s", keys[0].Alg, keys[0].Use)
	}
}

func TestMintVerifyRoundTrip(t *testing.T) {
	s := testSigner(t)
	tok, err := s.Mint(Claims{
		Issuer: "https://id.example.com", Subject: 42, Audience: "haitac",
		Scope: "openid wallet", TTL: time.Minute, Kind: "access",
	})
	if err != nil {
		t.Fatalf("Mint: %v", err)
	}
	uid, scope, err := s.Verify(tok, "https://id.example.com", "haitac", "access")
	if err != nil {
		t.Fatalf("Verify: %v", err)
	}
	if uid != 42 || scope != "openid wallet" {
		t.Errorf("uid=%d scope=%q, muon 42 / \"openid wallet\"", uid, scope)
	}
}

// ID token khong duoc dung thay access token va nguoc lai.
func TestVerifyRejectsWrongKind(t *testing.T) {
	s := testSigner(t)
	tok, _ := s.Mint(Claims{Issuer: "https://id.example.com", Subject: 1, Audience: "haitac", TTL: time.Minute, Kind: "id"})
	if _, _, err := s.Verify(tok, "https://id.example.com", "haitac", "access"); err == nil {
		t.Error("ID token dung lam access token phai bi tu choi")
	}
}

func TestVerifyRejectsWrongAudienceAndIssuer(t *testing.T) {
	s := testSigner(t)
	tok, _ := s.Mint(Claims{Issuer: "https://id.example.com", Subject: 1, Audience: "haitac", TTL: time.Minute, Kind: "access"})
	if _, _, err := s.Verify(tok, "https://id.example.com", "tamquoc", "access"); err == nil {
		t.Error("token cua game khac phai bi tu choi (sai audience)")
	}
	if _, _, err := s.Verify(tok, "https://ke-gia-mao.com", "haitac", "access"); err == nil {
		t.Error("sai issuer phai bi tu choi")
	}
}

func TestVerifyRejectsExpired(t *testing.T) {
	s := testSigner(t)
	tok, _ := s.Mint(Claims{Issuer: "https://id.example.com", Subject: 1, Audience: "haitac", TTL: -time.Minute, Kind: "access"})
	if _, _, err := s.Verify(tok, "https://id.example.com", "haitac", "access"); err == nil {
		t.Error("token het han phai bi tu choi")
	}
}

// Token ky bang khoa khac phai bi tu choi — day la diem mau chot cua JWKS.
func TestVerifyRejectsForeignKey(t *testing.T) {
	a, b := testSigner(t), testSigner(t)
	tok, _ := a.Mint(Claims{Issuer: "https://id.example.com", Subject: 1, Audience: "haitac", TTL: time.Minute, Kind: "access"})
	if _, _, err := b.Verify(tok, "https://id.example.com", "haitac", "access"); err == nil {
		t.Error("token ky bang khoa la phai bi tu choi")
	}
}

// alg=none la lo hong JWT kinh dien; thu vien phai chan, va ta chan them mot lop.
func TestVerifyRejectsAlgNone(t *testing.T) {
	s := testSigner(t)
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"none","typ":"JWT"}`))
	payload := base64.RawURLEncoding.EncodeToString([]byte(`{"iss":"https://id.example.com","sub":"1","aud":"haitac","typ":"access","exp":9999999999}`))
	if _, _, err := s.Verify(header+"."+payload+".", "https://id.example.com", "haitac", "access"); err == nil {
		t.Error("alg=none phai bi tu choi")
	}
}

func TestVerifyPKCE(t *testing.T) {
	verifier := strings.Repeat("a", 43)
	sum := sha256.Sum256([]byte(verifier))
	challenge := base64.RawURLEncoding.EncodeToString(sum[:])

	if err := VerifyPKCE("S256", challenge, verifier); err != nil {
		t.Errorf("verifier dung phai duoc chap nhan: %v", err)
	}
	if err := VerifyPKCE("S256", challenge, strings.Repeat("b", 43)); err == nil {
		t.Error("verifier sai phai bi tu choi")
	}
	// plain bi tu choi co y.
	if err := VerifyPKCE("plain", verifier, verifier); err == nil {
		t.Error("phuong thuc plain phai bi tu choi")
	}
	// Do dai ngoai khoang 43-128.
	if err := VerifyPKCE("S256", challenge, "qua-ngan"); err == nil {
		t.Error("verifier qua ngan phai bi tu choi")
	}
	if err := VerifyPKCE("S256", challenge, strings.Repeat("a", 129)); err == nil {
		t.Error("verifier qua dai phai bi tu choi")
	}
}
