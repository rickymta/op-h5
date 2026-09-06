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
	"github.com/rickymta/op-h5/platform/internal/spa"
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

// Template Go con lai:
//
//	full.html   man hinh "may chu dang day", hien TRONG luong /choi-game — truoc khi trinh
//	            duyet kip tai bundle nao, nen khong the la mot man hinh cua SPA
//	shell.html  cac khoi head/nav/foot ma full.html dung
//	gm*.html    cong GM cua rieng game (/admin-portal, xem adminportal.go)
//
// Cac trang huong nguoi choi (trang chu, may chu, cua hang) da chuyen han sang
// web/site/apps/haitac.
//
//go:embed all:templates
var templatesFS embed.FS

// Giao dien React da build (web/site/apps/haitac -> dist/, assetsDir "app" vi tren host game
// nginx da danh /assets/ cho client LayaAir). Thu muc luon ton tai nho dist/.gitkeep, nen
// `go build` chay duoc ca khi chua `npm run build`; luc do spa tra trang huong dan.
//
//go:embed all:dist
var distFS embed.FS

// Giao dien cong cu GM cua RIENG game nay (web/admin/apps/gm -> dist-gm/, base "/admin-portal/").
// Vi sao nam o day chu khong o tien trinh admin: moi thao tac GM di qua console cua cum game
// nay, API tuong ung o adminportal.go, va phien dung cookie rieng `haitac_adm`. Dat bundle o
// admin:8100 thi trinh duyet phai goi API khac origin va khac cookie.
//
//go:embed all:dist-gm
var distGMFS embed.FS

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

	// Ten game lay tu bang games (migration 0010); ADAPTER_GAME_NAME chi la du phong (meta.go).
	gameName := lookupGameName(db, cfg.GameCode, cfg.GameName)

	consoleClient := console.New(cfg.ConsoleBaseURL, cfg.ConsoleUser, cfg.ConsolePassword, cfg.TcgSecret)
	wal := &wallet.Service{DB: db}
	worker := &grants.Worker{
		DB: db, Console: consoleClient, GameCode: cfg.GameCode, Log: log,
		PlatformCode: envOr("ADAPTER_PLATFORM_CODE", "develop"),
		ChannelCode:  envOr("ADAPTER_CHANNEL_CODE", "0"),
		CurrencyCode: envOr("ADAPTER_CURRENCY_CODE", "VND"),
		Mode:         cfg.ConsolePayMode,
		MailTitle:    envOr("ADAPTER_MAIL_TITLE", "Cửa hàng "+gameName),
		MailContent:  os.Getenv("ADAPTER_MAIL_CONTENT"),
		// Console tu choi hoac het lan thu -> hoan Xu ngay (quyet dinh 2026-09-05).
		Refund: wal.RefundGrant,
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
		wallet:  wal,
		console: consoleClient,
		worker:  worker,
		db:      db,
		log:     log,
		tpl:     tpl,
		gmDist:  distGMFS,
		// Host cong khai dien vao URL WebSocket tra cho client: login server chi biet
		// dia chi noi bo (127.0.0.1).
		publicHost: envOr("ADAPTER_PUBLIC_HOST", ""),
		useTLS:     os.Getenv("ADAPTER_TLS") == "true",
		gameName:   gameName,
		brand:      cfg.BrandName,
		// 10 luot/phut cho mot nguoi: du cho tai lai trang vai lan va cho client thu
		// lai, nhung chan duoc vong lap. Nguoi choi binh thuong dung 1-2 luot moi phien.
		sessionLimit: httpx.NewLimiter(10, time.Minute),
	}

	mux := http.NewServeMux()
	// Giao dien React (web/site/apps/haitac) phuc vu MOI duong GET khong khop pattern cu the
	// hon: /, /may-chu, /cua-hang, /cua-hang/{id}, /tin-tuc, /tin-tuc/{id}, /gioi-thieu,
	// /huong-dan, /faq va tai san /app/*. /choi-game, /auth/*, /api/*, /srv/*, /quy-doi,
	// /admin-portal*, /healthz la pattern cu the hon nen khong bi nuot.
	//
	// nginx VAN phai co mot `location` cho tung duong cua trang (docker/nginx/game_site.conf):
	// host game dung chung voi tang PHP cu, `location /` o do di ve play.php.
	spa.Mount(mux, "/", distFS, "dist")
	// Duong API khong ton tai phai tra 404 JSON, khong phai index.html cua SPA.
	for _, p := range []string{"GET /api/", "POST /api/"} {
		mux.HandleFunc(p, apiNotFound)
	}
	mux.HandleFunc("GET /quy-doi", srv.quyDoiRedirect) // duong cu, chuyen ve /cua-hang
	mux.HandleFunc("GET /choi-game", srv.playGame)
	mux.HandleFunc("GET /auth/callback", srv.authCallback)
	mux.HandleFunc("GET /auth/logout", srv.logout)
	// Bo mat cua game cho trang React (meta.go).
	mux.HandleFunc("GET /api/game/meta", srv.gameMeta)
	mux.HandleFunc("GET /api/game/news", srv.gameNews)
	mux.HandleFunc("GET /api/game/news/{key}", srv.gameNewsDetail)
	mux.HandleFunc("GET /api/game/me", srv.gameMe)
	mux.HandleFunc("GET /api/game/servers", srv.listServers)
	mux.HandleFunc("POST /api/game/session", srv.createSession)
	mux.HandleFunc("GET /api/game/packages", srv.listPackages)
	mux.HandleFunc("GET /api/game/packages/{id}", srv.packageDetail)
	mux.HandleFunc("GET /api/game/store/stats", srv.storeStats)
	// Trang noi dung tinh (gioi thieu, huong dan, faq): ban rieng cua game, lui ve ban chung.
	mux.HandleFunc("GET /api/game/pages/{slug}", srv.gamePage)
	mux.HandleFunc("POST /api/game/convert", srv.convert)
	mux.HandleFunc("GET /api/game/orders", srv.listOrders)
	mux.HandleFunc("GET /api/game/roles", srv.listRoles)
	// Nut mua TRONG GAME: nginx tro /api/api.php va /api/apisv.php (duong PHP cu ma client
	// va tcg-game.jar hardcode) vao hai duong nay. Xem store.go.
	mux.HandleFunc("GET /api/game/legacy/check", srv.legacyCheck)
	mux.HandleFunc("GET /api/game/legacy/charge", srv.legacyCharge)
	// Duong cua LOGIN SERVER ma nginx tro vao Adapter, de che dia chi cong khai
	// (server chi mo 80/443). Xem ghi chu o connectTarget.
	mux.HandleFunc("GET /srv/game/connect/target", srv.connectTarget)
	// Cong GM cua rieng game nay (xem adminportal.go). Dat truoc /healthz cho de doc.
	srv.mountAdminPortal(mux)

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
			"addr", cfg.Addr, "game", cfg.GameCode, "name", gameName,
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

func apiNotFound(w http.ResponseWriter, _ *http.Request) {
	httpx.Error(w, http.StatusNotFound, "not_found", "Không có API này.")
}
