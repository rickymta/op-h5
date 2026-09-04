// Package httpx gom cac tien ich HTTP dung chung cho ca hai dich vu.
package httpx

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"
)

// JSON ghi mot phan hoi JSON kem ma trang thai.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

// Error tra ve loi dang JSON theo khuon cua OAuth2: {"error":..., "error_description":...}
func Error(w http.ResponseWriter, status int, code, desc string) {
	JSON(w, status, map[string]string{"error": code, "error_description": desc})
}

// ClientIP lay dia chi that cua nguoi goi.
// Chi tin X-Forwarded-For khi request den tu proxy noi bo (loopback hoac mang rieng),
// vi header nay nguoi goi tu dat duoc.
func ClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	ip := net.ParseIP(host)
	if ip != nil && (ip.IsLoopback() || ip.IsPrivate()) {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			if first := strings.TrimSpace(strings.Split(xff, ",")[0]); first != "" {
				if net.ParseIP(first) != nil {
					return first
				}
			}
		}
	}
	return host
}

type statusWriter struct {
	http.ResponseWriter
	status int
	wrote  bool
}

func (w *statusWriter) WriteHeader(code int) {
	if !w.wrote {
		w.status, w.wrote = code, true
		w.ResponseWriter.WriteHeader(code)
	}
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if !w.wrote {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(b)
}

// Logging ghi mot dong cho moi request. KHONG ghi query string: cac duong dan OAuth
// mang theo ma uy quyen va state trong URL.
func Logging(log *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(sw, r)
		log.Info("request",
			"method", r.Method,
			"path", r.URL.Path, // co y bo r.URL.RawQuery
			"status", sw.status,
			"ms", time.Since(start).Milliseconds(),
			"ip", ClientIP(r),
		)
	})
}

// Recover bat panic de mot request hong khong lam chet ca tien trinh.
func Recover(log *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				log.Error("panic", "path", r.URL.Path, "value", v)
				Error(w, http.StatusInternalServerError, "server_error", "loi noi bo")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// SecurityHeaders dat cac header co ban cho trang HTML cua he thong ID.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		// Trang dang ky va tai khoan co script inline nho de goi API, nen phai cho phep
		// 'unsafe-inline' cho script. Van KHONG cho nap script tu bat ky nguon ngoai nao
		// (khong co host nao trong script-src), va connect-src gioi han o chinh minh.
		h.Set("Content-Security-Policy",
			"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "+
				"connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
		next.ServeHTTP(w, r)
	})
}
