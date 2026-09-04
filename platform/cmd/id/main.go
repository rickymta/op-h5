// Lenh id chay dich vu danh tinh cua nen tang (id.domain.com):
// dang ky / dang nhap, OIDC provider, va vi Xu.
package main

import (
	"context"
	"embed"
	"errors"
	"html/template"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rickymta/op-h5/platform/internal/config"
	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/identity"
	"github.com/rickymta/op-h5/platform/internal/oidc"
	"github.com/rickymta/op-h5/platform/internal/store"
	"github.com/rickymta/op-h5/platform/internal/wallet"
)

//go:embed all:templates
var templatesFS embed.FS

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := config.LoadID()
	if err != nil {
		log.Error("cau hinh khong hop le", "err", err)
		os.Exit(1)
	}

	signer, err := oidc.NewSigner(cfg.SigningKeyPEM)
	if err != nil {
		log.Error("khoa ky khong dung", "err", err)
		os.Exit(1)
	}

	db, err := store.Open(cfg.DB, 60*time.Second)
	if err != nil {
		log.Error("khong mo duoc DB", "err", err)
		os.Exit(1)
	}
	defer func() { _ = db.Close() }()

	ctx := context.Background()
	if err := store.Migrate(ctx, db, log); err != nil {
		log.Error("migration that bai", "err", err)
		os.Exit(1)
	}

	tpl, err := template.ParseFS(templatesFS, "templates/*.html")
	if err != nil {
		log.Error("doc template", "err", err)
		os.Exit(1)
	}

	users := &identity.Repo{DB: db, MaxAttempts: cfg.LoginMaxAttempt, Window: cfg.LoginWindow}
	sessions := &identity.Sessions{DB: db, TTL: cfg.SessionTTL}
	wal := &wallet.Service{DB: db}

	srv := &oidc.Server{
		Issuer: cfg.Issuer, Signer: signer,
		Store: &oidc.Store{DB: db}, Users: users, Sessions: sessions, Log: log,
		AccessTTL: cfg.AccessTokenTTL, RefreshTTL: cfg.RefreshTokenTTL,
		CodeTTL: cfg.AuthCodeTTL, SessionTTL: cfg.SessionTTL,
		CookieSecur: cfg.CookieSecure, Tpl: tpl,
	}
	api := &apiServer{db: db, users: users, sessions: sessions, wallet: wal, log: log, secure: cfg.CookieSecure}
	pages := &pageServer{api: api, tpl: tpl}

	mux := http.NewServeMux()
	// --- OIDC ---
	mux.HandleFunc("GET /.well-known/openid-configuration", srv.Discovery)
	mux.HandleFunc("GET /.well-known/jwks.json", srv.JWKS)
	mux.HandleFunc("GET /oauth/authorize", srv.Authorize)
	mux.HandleFunc("POST /oauth/authorize/login", srv.AuthorizeLogin)
	mux.HandleFunc("POST /oauth/token", srv.Token)
	mux.HandleFunc("GET /oauth/userinfo", srv.UserInfo)
	mux.HandleFunc("GET /oauth/logout", srv.Logout)
	// --- tai khoan & vi ---
	mux.HandleFunc("GET /", pages.portal)
	mux.HandleFunc("GET /dang-ky", pages.registerPage)
	mux.HandleFunc("GET /tai-khoan", pages.accountPage)
	mux.HandleFunc("POST /api/register", api.register)
	mux.HandleFunc("POST /api/password", api.changePassword)
	mux.HandleFunc("GET /api/me", api.me)
	mux.HandleFunc("GET /api/wallet/balance", api.balance)
	mux.HandleFunc("GET /api/wallet/history", api.history)
	// --- van hanh ---
	mux.HandleFunc("GET /healthz", srv.Health(db))

	handler := httpx.Recover(log, httpx.Logging(log, httpx.SecurityHeaders(mux)))
	httpSrv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       90 * time.Second,
	}

	go cleanupLoop(ctx, log, sessions, &oidc.Store{DB: db})

	go func() {
		log.Info("id server khoi dong", "addr", cfg.Addr, "issuer", cfg.Issuer, "kid", signer.Kid)
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("http server dung", "err", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	log.Info("dang tat...")
	shutCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = httpSrv.Shutdown(shutCtx)
}

// cleanupLoop don ma uy quyen, refresh token va phien da het han.
func cleanupLoop(ctx context.Context, log *slog.Logger, sessions *identity.Sessions, st *oidc.Store) {
	t := time.NewTicker(time.Hour)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := sessions.Cleanup(ctx); err != nil {
				log.Warn("don phien het han", "err", err)
			}
			if err := st.CleanupExpired(ctx); err != nil {
				log.Warn("don token het han", "err", err)
			}
		}
	}
}
