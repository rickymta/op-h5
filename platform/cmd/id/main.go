// Lenh id chay dich vu danh tinh cua nen tang (id.domain.com):
// dang ky / dang nhap, OIDC provider, vi Xu, va hai giao dien cong khai:
// web/site/apps/portal ("/") va web/site/apps/market ("/cho").
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
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/rickymta/op-h5/platform/internal/config"
	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/identity"
	"github.com/rickymta/op-h5/platform/internal/mail"
	"github.com/rickymta/op-h5/platform/internal/oidc"
	"github.com/rickymta/op-h5/platform/internal/spa"
	"github.com/rickymta/op-h5/platform/internal/store"
	"github.com/rickymta/op-h5/platform/internal/wallet"
)

// Template Go con lai DUY NHAT trang dang nhap OIDC (`login.html`): no la mot form POST
// gui thang toi /oauth/authorize/login, nam trong luong uy quyen giua hai domain, nen
// khong the la mot man hinh cua SPA. Cac trang HTML khac (trang chinh, dang ky, tai khoan,
// quen/dat lai mat khau) da chuyen han sang web/site/apps/portal — chung von chi la form
// goi API JSON, nen giu ban Go chi de lai hai cho phai sua moi lan doi.
//
//go:embed all:templates
var templatesFS embed.FS

// Hai giao dien React da build, phuc vu tu CUNG mot tien trinh:
//
//	dist/         web/site/apps/portal -> "/"     cong chinh + tai khoan
//	dist-market/  web/site/apps/market -> "/cho"  cho
//
// Ca hai thu muc luon ton tai nho .gitkeep, nen `go build` chay duoc ca khi chua
// `npm run build`; luc do spa tra trang huong dan thay vi lam chet tien trinh.
//
//go:embed all:dist
var distFS embed.FS

//go:embed all:dist-market
var distMarketFS embed.FS

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
	resets := &identity.Resets{DB: db}
	mailer := mail.New(mail.Config{
		Host:     os.Getenv("ID_SMTP_HOST"),
		Port:     envInt("ID_SMTP_PORT", 587),
		Username: os.Getenv("ID_SMTP_USER"),
		Password: os.Getenv("ID_SMTP_PASSWORD"),
		From:     os.Getenv("ID_SMTP_FROM"),
		FromName: envOr2("ID_SMTP_FROM_NAME", cfg.BrandName),
	})
	if !mailer.Enabled() {
		log.Warn("chua cau hinh SMTP: chuc nang khoi phuc mat khau se tat (dat ID_SMTP_HOST va ID_SMTP_FROM)")
	}
	sessions := &identity.Sessions{DB: db, TTL: cfg.SessionTTL}
	wal := &wallet.Service{DB: db}

	srv := &oidc.Server{
		Issuer: cfg.Issuer, Signer: signer,
		Store: &oidc.Store{DB: db}, Users: users, Sessions: sessions, Log: log,
		AccessTTL: cfg.AccessTokenTTL, RefreshTTL: cfg.RefreshTokenTTL,
		CodeTTL: cfg.AuthCodeTTL, SessionTTL: cfg.SessionTTL,
		CookieSecur: cfg.CookieSecure, Tpl: tpl,
	}
	api := &apiServer{db: db, users: users, sessions: sessions, wallet: wal, log: log,
		secure: cfg.CookieSecure, internalSecret: os.Getenv("ID_INTERNAL_SECRET"),
		resets: resets, mail: mailer, publicURL: cfg.Issuer,
		site: siteInfo{Brand: cfg.BrandName, SupportURL: cfg.SupportURL, FanpageURL: cfg.FanpageURL,
			TopupURL: cfg.TopupURL, LegalNote: cfg.LegalNote},
		// So lieu song cua tung game: hoi Adapter, cache 30 s, timeout 3 s (hop dong 4.2).
		live: newLiveStats(30*time.Second, 3*time.Second),
	}
	mux := http.NewServeMux()
	// --- OIDC: pattern cu the hon "GET /" nen khong bao gio bi SPA nuot ---
	mux.HandleFunc("GET /.well-known/openid-configuration", srv.Discovery)
	mux.HandleFunc("GET /.well-known/jwks.json", srv.JWKS)
	mux.HandleFunc("GET /oauth/authorize", srv.Authorize)
	mux.HandleFunc("POST /oauth/authorize/login", srv.AuthorizeLogin)
	mux.HandleFunc("POST /oauth/token", srv.Token)
	mux.HandleFunc("GET /oauth/userinfo", srv.UserInfo)
	mux.HandleFunc("GET /oauth/logout", srv.Logout)

	// Hai SPA trong mot tien trinh. Pattern "GET /cho/" cu the hon "GET /" nen ServeMux luon
	// chon dung ban, khong phu thuoc thu tu dang ky. Xem internal/spa.
	spa.Mount(mux, "/", distFS, "dist")
	spa.Mount(mux, "/cho", distMarketFS, "dist-market")

	// Duong API khong ton tai phai tra 404 JSON, khong phai index.html cua SPA hay 404 HTML.
	for _, p := range []string{"GET /api/", "POST /api/", "GET /internal/", "POST /internal/"} {
		mux.HandleFunc(p, apiNotFound)
	}

	// --- cong khai (catalog.go) ---
	mux.HandleFunc("GET /api/site", api.apiSite)
	mux.HandleFunc("GET /api/games", api.apiGames)
	mux.HandleFunc("GET /api/news", api.apiNews)
	mux.HandleFunc("GET /api/news/{key}", api.apiNewsDetail)
	mux.HandleFunc("GET /api/pages/{slug}", api.apiPage)
	// --- tai khoan & vi (api.go, account.go, pages.go) ---
	mux.HandleFunc("POST /api/register", api.register)
	mux.HandleFunc("POST /api/login", api.login)
	mux.HandleFunc("POST /api/logout", api.logout)
	mux.HandleFunc("POST /api/password", api.changePassword)
	mux.HandleFunc("POST /api/password/forgot", api.forgotPassword)
	mux.HandleFunc("POST /api/password/reset", api.resetPassword)
	mux.HandleFunc("GET /api/me", api.me)
	mux.HandleFunc("POST /api/me/email", api.updateEmail)
	mux.HandleFunc("GET /api/me/games", api.myGames)
	mux.HandleFunc("GET /api/me/orders", api.myOrders)
	mux.HandleFunc("GET /api/me/sessions", api.mySessions)
	mux.HandleFunc("POST /api/me/sessions/revoke-others", api.revokeOtherSessions)
	mux.HandleFunc("GET /api/wallet/balance", api.balance)
	mux.HandleFunc("GET /api/wallet/summary", api.walletSummary)
	mux.HandleFunc("GET /api/wallet/history", api.history)
	// --- noi bo: callback cong thanh toan o tang PHP goi vao ---
	mux.HandleFunc("POST /internal/wallet/topup", api.internalTopup)
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

	go cleanupLoop(ctx, log, sessions, &oidc.Store{DB: db}, resets)

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

func apiNotFound(w http.ResponseWriter, _ *http.Request) {
	httpx.Error(w, http.StatusNotFound, "not_found", "Không có API này.")
}

func envInt(key string, def int) int {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func envOr2(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

// cleanupLoop don ma uy quyen, refresh token va phien da het han.
func cleanupLoop(ctx context.Context, log *slog.Logger, sessions *identity.Sessions, st *oidc.Store, resets *identity.Resets) {
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
			if err := resets.Cleanup(ctx); err != nil {
				log.Warn("don phieu dat lai mat khau", "err", err)
			}
		}
	}
}
