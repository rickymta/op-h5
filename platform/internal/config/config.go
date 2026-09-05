// Package config doc cau hinh tu bien moi truong.
//
// Repo nay la public, nen KHONG co gia tri bi mat nao duoc phep nam trong file
// nguon hay file cau hinh commit len. Moi thu nhay cam den tu bien moi truong,
// va thieu bien bat buoc thi chuong trinh dung ngay luc khoi dong chu khong chay
// tiep voi gia tri mac dinh.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Missing gom cac bien bat buoc con thieu de bao mot the thay vi bao tung cai.
type Missing []string

func (m Missing) Err() error {
	if len(m) == 0 {
		return nil
	}
	return fmt.Errorf("thieu bien moi truong bat buoc: %s", strings.Join(m, ", "))
}

type loader struct{ missing Missing }

func (l *loader) req(key string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		l.missing = append(l.missing, key)
	}
	return v
}

func (l *loader) opt(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func (l *loader) optInt(key string, def int) int {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func (l *loader) optDur(key string, def time.Duration) time.Duration {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return def
}

// DB la cau hinh ket noi MySQL.
type DB struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
}

// DSN tra ve chuoi ket noi cho go-sql-driver.
// parseTime=true de quet DATETIME thang vao time.Time.
func (d DB) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci&loc=Local",
		d.User, d.Password, d.Host, d.Port, d.Name)
}

// ID la cau hinh cua dich vu danh tinh (id.domain.com).
type ID struct {
	Addr            string
	Issuer          string // URL cong khai, vd https://id.example.com
	DB              DB
	SigningKeyPEM   string // khoa rieng RSA dang PEM, tu bien moi truong
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
	AuthCodeTTL     time.Duration
	SessionTTL      time.Duration
	CookieSecure    bool
	LoginMaxAttempt int // so lan sai toi da trong cua so
	LoginWindow     time.Duration

	// SPA (ID_SPA=1): giao dien React web/apps/portal phuc vu tu goc, trang Go cu lui ve /cu/.
	SPA bool
	// Thuong hieu cua cong, tra qua GET /api/site cho trang chinh va chan trang cac trang game.
	BrandName  string
	SupportURL string
	FanpageURL string
	TopupURL   string // rong = chua co cong nap tren web (trang Vi hien huong dan "nap qua trang game")
	LegalNote  string // dong phap ly o chan trang, vd "Công ty … · Giấy phép số …"
}

func LoadID() (ID, error) {
	l := &loader{}
	c := ID{
		Addr:   l.opt("ID_ADDR", ":8080"),
		Issuer: l.req("ID_ISSUER"),
		DB: DB{
			Host:     l.opt("ID_DB_HOST", "127.0.0.1"),
			Port:     l.optInt("ID_DB_PORT", 3306),
			User:     l.opt("ID_DB_USER", "root"),
			Password: l.req("ID_DB_PASSWORD"),
			Name:     l.opt("ID_DB_NAME", "platform"),
		},
		SigningKeyPEM:   l.req("ID_SIGNING_KEY_PEM"),
		AccessTokenTTL:  l.optDur("ID_ACCESS_TTL", 15*time.Minute),
		RefreshTokenTTL: l.optDur("ID_REFRESH_TTL", 30*24*time.Hour),
		AuthCodeTTL:     l.optDur("ID_CODE_TTL", 60*time.Second),
		SessionTTL:      l.optDur("ID_SESSION_TTL", 14*24*time.Hour),
		CookieSecure:    l.opt("ID_COOKIE_SECURE", "true") == "true",
		LoginMaxAttempt: l.optInt("ID_LOGIN_MAX_ATTEMPT", 10),
		LoginWindow:     l.optDur("ID_LOGIN_WINDOW", 15*time.Minute),
		SPA:             l.opt("ID_SPA", "0") == "1",
		BrandName:       l.opt("ID_BRAND_NAME", "Cổng game"),
		SupportURL:      l.opt("ID_SUPPORT_URL", ""),
		FanpageURL:      l.opt("ID_FANPAGE_URL", ""),
		TopupURL:        l.opt("ID_TOPUP_URL", ""),
		LegalNote:       l.opt("ID_LEGAL_NOTE", ""),
	}
	return c, l.missing.Err()
}

// Adapter la cau hinh cua lop phien dich dat truoc login server cua mot game.
type Adapter struct {
	Addr     string
	GameCode string // 'haitac'
	DB       DB

	// OIDC client dang ky tai he thong ID
	Issuer       string
	ClientID     string
	ClientSecret string
	RedirectURI  string

	// Login server cua game (JAR khong sua duoc)
	LoginBaseURL string
	TcgSecret    string

	// Ma hoa game_secret truoc khi luu (32 byte, base64)
	SecretEncKey string

	// Console cua game — dung de phat vat pham cho cac lenh quy doi
	ConsoleBaseURL  string
	ConsoleUser     string
	ConsolePassword string
	ConsolePayMode  string // "manual" (mot buoc) hoac "approval" (hai buoc)
	GrantInterval   time.Duration

	// Cong giu cho: ve cap cho phien moi song bao lau truoc khi het han
	TicketTTL time.Duration
	// Chu ky doc lai onlineNum tu login server
	PollInterval time.Duration

	// GameName la ten hien thi DU PHONG (ADAPTER_GAME_NAME) khi bang games chua co dong cua game
	// nay; binh thuong ten, tagline, anh... doc tu bang games (migration 0010). Mac dinh = ma game.
	GameName string
	// BrandName la thuong hieu cua nen tang (ID_BRAND_NAME), hien o chan trang cua game.
	BrandName string
	// SPA (ADAPTER_SPA=1): giao dien React web/apps/game phuc vu /, /may-chu, /cua-hang, /tin-tuc;
	// trang Go cu lui ve /cu/.
	SPA bool
}

func LoadAdapter() (Adapter, error) {
	l := &loader{}
	c := Adapter{
		Addr:     l.opt("ADAPTER_ADDR", ":8090"),
		GameCode: l.opt("ADAPTER_GAME_CODE", "haitac"),
		DB: DB{
			Host:     l.opt("ID_DB_HOST", "127.0.0.1"),
			Port:     l.optInt("ID_DB_PORT", 3306),
			User:     l.opt("ID_DB_USER", "root"),
			Password: l.req("ID_DB_PASSWORD"),
			Name:     l.opt("ID_DB_NAME", "platform"),
		},
		Issuer:   l.req("ADAPTER_ISSUER"),
		ClientID: l.req("ADAPTER_CLIENT_ID"),
		// Client cong khai (chi PKCE, secret_hash = NULL trong oauth_clients) khong co
		// secret — de trong la hop le, khong phai thieu cau hinh.
		ClientSecret:    l.opt("ADAPTER_CLIENT_SECRET", ""),
		RedirectURI:     l.req("ADAPTER_REDIRECT_URI"),
		LoginBaseURL:    l.opt("ADAPTER_LOGIN_BASE_URL", "http://127.0.0.1:9000"),
		TcgSecret:       l.req("TCG_SECRET"),
		SecretEncKey:    l.req("ADAPTER_SECRET_ENC_KEY"),
		ConsoleBaseURL:  l.opt("ADAPTER_CONSOLE_BASE_URL", "http://127.0.0.1:9999"),
		ConsoleUser:     l.req("ADAPTER_CONSOLE_USER"),
		ConsolePassword: l.req("ADAPTER_CONSOLE_PASSWORD"),
		ConsolePayMode:  l.opt("ADAPTER_CONSOLE_PAY_MODE", "manual"),
		GrantInterval:   l.optDur("ADAPTER_GRANT_INTERVAL", 15*time.Second),
		TicketTTL:       l.optDur("ADAPTER_TICKET_TTL", 60*time.Second),
		PollInterval:    l.optDur("ADAPTER_POLL_INTERVAL", 10*time.Second),
		BrandName:       l.opt("ID_BRAND_NAME", "Cổng game"),
		SPA:             l.opt("ADAPTER_SPA", "0") == "1",
	}
	c.GameName = l.opt("ADAPTER_GAME_NAME", c.GameCode)
	return c, l.missing.Err()
}
