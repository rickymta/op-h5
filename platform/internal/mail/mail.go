// Package mail gui email qua SMTP.
//
// Khong co "che do ghi log" thay cho gui that: mot duong dat lai mat khau in ra log la
// mot duong chiem tai khoan cho bat ky ai doc duoc log. Chua cau hinh SMTP thi tinh nang
// khoi phuc mat khau tat han, chu khong chay o che do kem an toan.
package mail

import (
	"errors"
	"fmt"
	"mime"
	"net"
	"net/smtp"
	"strings"
	"time"
)

// ErrNotConfigured bao chua cau hinh SMTP.
var ErrNotConfigured = errors.New("chưa cấu hình SMTP")

type Config struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	FromName string
	// StartTLS bat STARTTLS. Tat khi gui toi mot SMTP noi bo khong ho tro TLS.
	StartTLS bool
}

type Sender struct {
	cfg Config
}

func New(cfg Config) *Sender { return &Sender{cfg: cfg} }

// Enabled cho biet SMTP da du cau hinh chua.
func (s *Sender) Enabled() bool {
	return s != nil && s.cfg.Host != "" && s.cfg.From != ""
}

// encodeHeader ma hoa tieu de co dau theo RFC 2047, neu khong Subject tieng Viet se
// hien thanh ky tu la o phan lon may khach.
func encodeHeader(v string) string { return mime.QEncoding.Encode("UTF-8", v) }

// Send gui mot email dang text thuan.
func (s *Sender) Send(to, subject, body string) error {
	if !s.Enabled() {
		return ErrNotConfigured
	}
	from := s.cfg.From
	fromHeader := from
	if s.cfg.FromName != "" {
		fromHeader = fmt.Sprintf("%s <%s>", encodeHeader(s.cfg.FromName), from)
	}

	var msg strings.Builder
	fmt.Fprintf(&msg, "From: %s\r\n", fromHeader)
	fmt.Fprintf(&msg, "To: %s\r\n", to)
	fmt.Fprintf(&msg, "Subject: %s\r\n", encodeHeader(subject))
	fmt.Fprintf(&msg, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	msg.WriteString("Content-Transfer-Encoding: 8bit\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(body)

	addr := net.JoinHostPort(s.cfg.Host, fmt.Sprint(s.cfg.Port))
	var auth smtp.Auth
	if s.cfg.Username != "" {
		auth = smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
	}
	return smtp.SendMail(addr, auth, from, []string{to}, []byte(msg.String()))
}
