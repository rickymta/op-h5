// Lenh adapter la lop phien dich dat truoc login server cua mot game.
//
// No lam ba viec:
//  1. Doi token cua he thong ID lay tai khoan trong game (nguoi choi khong bao gio
//     dua mat khau that cho cum game).
//  2. Chan phien choi moi khi server hoac may vat ly da qua tai — cho duy nhat lam
//     duoc viec nay, vi login server khong doc srv_game.playerMax.
//  3. Phat vat pham cho cac lenh quy doi dang cho.
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

	"github.com/rickymta/op-h5/platform/internal/capacity"
	"github.com/rickymta/op-h5/platform/internal/config"
	"github.com/rickymta/op-h5/platform/internal/console"
	"github.com/rickymta/op-h5/platform/internal/gameacct"
	"github.com/rickymta/op-h5/platform/internal/grants"
	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/store"
	"github.com/rickymta/op-h5/platform/internal/wallet"
)

// loginSource bien LoginClient thanh nguon so lieu tai cho capacity.Tracker.
type loginSource struct{ c *gameacct.LoginClient }

func (l loginSource) Online(ctx context.Context) (map[string]int, error) {
	list, err := l.c.SrvGameList(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[string]int, len(list))
	for _, s := range list {
		out[s.Code] = s.OnlineNum
	}
	return out, nil
}

//go:embed all:templates
var templatesFS embed.FS

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := config.LoadAdapter()
	if err != nil {
		log.Error("cau hinh khong hop le", "err", err)
		os.Exit(1)
	}

	vault, err := gameacct.NewVault(cfg.SecretEncKey)
	if err != nil {
		log.Error("khoa ma hoa khong dung", "err", err)
		os.Exit(1)
	}

	db, err := store.Open(cfg.DB, 60*time.Second)
	if err != nil {
		log.Error("khong mo duoc DB", "err", err)
		os.Exit(1)
	}
	defer func() { _ = db.Close() }()

	loginClient := gameacct.NewLoginClient(cfg.LoginBaseURL, cfg.TcgSecret)
	mapper := &gameacct.Mapper{
		DB: db, Vault: vault, Login: loginClient,
		Game: cfg.GameCode, GameID: envOr("ADAPTER_GAME_ID", "10091"),
		PlatformCode: envOr("ADAPTER_PLATFORM_CODE", "develop"),
		ChannelCode:  envOr("ADAPTER_CHANNEL_CODE", "0"),
	}
	tracker := capacity.NewTracker(loginSource{loginClient}, db, cfg.GameCode, cfg.TicketTTL, log)

	tpl, err := template.ParseFS(templatesFS, "templates/*.html")
	if err != nil {
		log.Error("doc template", "err", err)
		os.Exit(1)
	}

	consoleClient := console.New(cfg.ConsoleBaseURL, cfg.ConsoleUser, cfg.ConsolePassword, cfg.TcgSecret)
	worker := &grants.Worker{
		DB: db, Console: consoleClient, GameCode: cfg.GameCode, Log: log,
		PlatformCode: envOr("ADAPTER_PLATFORM_CODE", "develop"),
		ChannelCode:  envOr("ADAPTER_CHANNEL_CODE", "0"),
		CurrencyCode: envOr("ADAPTER_CURRENCY_CODE", "VND"),
		Mode:         cfg.ConsolePayMode,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go tracker.Run(ctx, cfg.PollInterval)
	go worker.Run(ctx, cfg.GrantInterval)

	srv := &adapterServer{
		cfg:     cfg,
		rp:      newRP(cfg.Issuer, cfg.ClientID, cfg.ClientSecret, cfg.RedirectURI),
		mapper:  mapper,
		tracker: tracker,
		login:   loginClient,
		wallet:  &wallet.Service{DB: db},
		console: consoleClient,
		worker:  worker,
		db:      db,
		log:     log,
		tpl:     tpl,
		// Host cong khai dien vao URL WebSocket tra cho client: login server chi biet
		// dia chi noi bo (127.0.0.1).
		publicHost: envOr("ADAPTER_PUBLIC_HOST", ""),
		useTLS:     os.Getenv("ADAPTER_TLS") == "true",
		// 10 luot/phut cho mot nguoi: du cho tai lai trang vai lan va cho client thu
		// lai, nhung chan duoc vong lap. Nguoi choi binh thuong dung 1-2 luot moi phien.
		sessionLimit: httpx.NewLimiter(10, time.Minute),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", srv.home)
	mux.HandleFunc("GET /may-chu", srv.serversPage)
	mux.HandleFunc("GET /quy-doi", srv.convertPage)
	mux.HandleFunc("GET /choi-game", srv.playGame)
	mux.HandleFunc("GET /auth/callback", srv.authCallback)
	mux.HandleFunc("GET /auth/logout", srv.logout)
	mux.HandleFunc("GET /api/game/servers", srv.listServers)
	mux.HandleFunc("POST /api/game/session", srv.createSession)
	mux.HandleFunc("GET /api/game/packages", srv.listPackages)
	mux.HandleFunc("POST /api/game/convert", srv.convert)
	// Duong cua LOGIN SERVER ma nginx tro vao Adapter, de che dia chi cong khai
	// (server chi mo 80/443). Xem ghi chu o connectTarget.
	mux.HandleFunc("GET /srv/game/connect/target", srv.connectTarget)
	mux.HandleFunc("GET /healthz", srv.health)

	handler := httpx.Recover(log, httpx.Logging(log, mux))
	httpSrv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       90 * time.Second,
	}

	go func() {
		log.Info("adapter khoi dong",
			"addr", cfg.Addr, "game", cfg.GameCode,
			"issuer", cfg.Issuer, "login", cfg.LoginBaseURL)
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("http server dung", "err", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	log.Info("dang tat...")
	shutCtx, shutCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutCancel()
	_ = httpSrv.Shutdown(shutCtx)
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
