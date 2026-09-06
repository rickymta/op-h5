// Lenh admin la trang quan tri chung cho moi game.
//
// No thay bon cong cu chong cheo hien co (gm/, gmhanglong/, adminphp@2024/,
// adminhl@2024/admtool) bang mot cho duy nhat, va quan trong nhat: day la noi dieu
// khien nguong tai ma cong gioi han cua Adapter doc.
package main

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/rickymta/op-h5/platform/internal/config"
	"github.com/rickymta/op-h5/platform/internal/console"
	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/spa"
	"github.com/rickymta/op-h5/platform/internal/store"
)

// Hai giao dien React da build, phuc vu tu CUNG mot tien trinh:
//
//	dist/     web/admin/apps/platform -> "/"    quan tri nen tang
//
// Khong tach tien trinh vi ca hai dung chung bang `admin_users`, chung phien dang nhap va
// chung nhat ky thao tac — tach ra chi de tach mot bo bundle, khong tach quyen.
//
// Ca hai thu muc luon ton tai nho .gitkeep, nen `go build` chay duoc ca khi chua
// `npm run build`; luc do spa tra trang huong dan thay vi lam chet tien trinh.
//
//go:embed all:dist
var distFS embed.FS

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	addr := envOr("ADMIN_ADDR", ":8100")
	dbPass := os.Getenv("ID_DB_PASSWORD")
	if dbPass == "" {
		log.Error("thieu bien moi truong bat buoc: ID_DB_PASSWORD")
		os.Exit(1)
	}
	dbCfg := config.DB{
		Host: envOr("ID_DB_HOST", "127.0.0.1"), Port: 3306,
		User: envOr("ID_DB_USER", "root"), Password: dbPass,
		Name: envOr("ID_DB_NAME", "platform"),
	}

	db, err := store.Open(dbCfg, 60*time.Second)
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

	// Tao tai khoan quan tri dau tien tu bien moi truong neu bang con trong.
	// Chi chay khi CHUA co tai khoan nao — khong bao gio ghi de tai khoan san co.
	if err := seedOwner(ctx, db, log); err != nil {
		log.Error("tao tai khoan quan tri dau tien", "err", err)
		os.Exit(1)
	}

	// Console dung chung cau hinh voi adapter: mot tai khoan `admin` cua console cho ca hai.
	// Thieu bien nao thi console = nil va cac thao tac GM bao ro, khong chet luc khoi dong —
	// trang quan tri con nhieu viec khac khong can console.
	var consoleClient *console.Client
	consoleUser := firstNonEmpty(os.Getenv("CONSOLE_USER"), os.Getenv("ADAPTER_CONSOLE_USER"), "admin")
	consolePass := firstNonEmpty(os.Getenv("CONSOLE_ADMIN_PASSWORD"), os.Getenv("ADAPTER_CONSOLE_PASSWORD"))
	tcgSecret := os.Getenv("TCG_SECRET")
	if consolePass != "" && tcgSecret != "" {
		consoleClient = console.New(
			firstNonEmpty(os.Getenv("CONSOLE_BASE_URL"), os.Getenv("ADAPTER_CONSOLE_BASE_URL"), "http://127.0.0.1:9999"),
			consoleUser, consolePass, tcgSecret)
		consoleClient.StatBaseURL = firstNonEmpty(os.Getenv("STAT_BASE_URL"), "http://127.0.0.1:7788")
	} else {
		log.Warn("chua cau hinh console (thieu CONSOLE_ADMIN_PASSWORD hoac TCG_SECRET) — cong cu GM se bao loi khi dung")
	}

	// ADMIN_PUBLIC=1: nginx cho `admin.<domain>` di vao trang nay. Cong nghe KHONG doi —
	// van bind 127.0.0.1:8100, nginx la thu duy nhat noi ra ngoai — nhung ba lop o tang ung
	// dung duoc siet lai (login.go): cookie bat buoc Secure, phien rut con 4 gio, va khong
	// cho khoi dong neu chu he thong con dung mat khau mac dinh.
	public := os.Getenv("ADMIN_PUBLIC") == "1"
	if public {
		owners, err := ownersWithDefaultPassword(ctx, db)
		if err != nil {
			log.Error("kiem tra mat khau tai khoan quan tri", "err", err)
			os.Exit(1)
		}
		if err := publicGuardError(public, owners); err != nil {
			log.Error("tu choi khoi dong o che do cong khai", "err", err)
			os.Exit(1)
		}
	}
	secure := os.Getenv("ADMIN_COOKIE_SECURE") != "false"
	sessionTTL := 12 * time.Hour
	if public {
		// Mo ra Internet: cookie khong duoc phep di qua HTTP, va mot phien bi lay cap
		// (may chung, quan net) chi con song mot buoi thay vi mot ngay lam viec.
		secure, sessionTTL = true, 4*time.Hour
	}

	s := &server{
		db: db, log: log,
		secure:     secure,
		fetcher:    newFleetFetcher(),
		console:    consoleClient,
		public:     public,
		sessionTTL: sessionTTL,
		// 8 lan sai / 15 phut, dem theo ca ten dang nhap lan IP. Nguoi go nham vai lan van
		// vao duoc; may do tu dong thi dung lai sau chua den mot chuc lan.
		guard: &loginGuard{
			store:  sqlAttempts{db},
			max:    envInt("ADMIN_LOGIN_MAX_ATTEMPT", 8),
			window: envDur("ADMIN_LOGIN_WINDOW", 15*time.Minute),
		},
	}

	mux := http.NewServeMux()

	// Hai SPA trong mot tien trinh. Pattern "GET /gm/" cu the hon "GET /" nen ServeMux luon
	// chon dung ban, khong phu thuoc thu tu dang ky. Xem internal/spa.
	spa.Mount(mux, "/", distFS, "dist")

	// Duong API khong ton tai phai tra 404 JSON, khong phai index.html cua SPA: mot API go
	// nham ten se bao "khong doc duoc JSON" o tan trinh duyet, rat kho lan ra.
	for _, p := range []string{"GET /api/", "POST /api/"} {
		mux.HandleFunc(p, apiNotFound)
	}

	// Dang nhap: JSON, vi trang dang nhap la mot man hinh cua SPA (/dang-nhap). Giu them
	// bi danh POST /dang-nhap, /dang-xuat cho dung duong dan giong duong tren thanh dia chi.
	mux.HandleFunc("POST /api/login", s.doLogin)
	mux.HandleFunc("POST /api/logout", s.doLogout)
	mux.HandleFunc("POST /dang-nhap", s.doLogin)
	mux.HandleFunc("POST /dang-xuat", s.doLogout)
	// API: trang dung fetch, va cong cu ngoai cung goi duoc.
	mux.HandleFunc("GET /api/fleet", s.requireAdminAPI(s.apiFleet))
	mux.HandleFunc("GET /api/audit", s.requireAdminAPI(s.apiAudit))
	mux.HandleFunc("GET /api/orders", s.requireAdminAPI(s.apiOrders))
	mux.HandleFunc("POST /api/servers/{game}/{srv}", s.requireWrite(s.apiUpdateServer))
	mux.HandleFunc("POST /api/devices/{game}/{device}", s.requireWrite(s.apiUpdateDevice))
	mux.HandleFunc("POST /api/wallet/topup", s.requireWrite(s.apiTopup))
	// Cua hang: danh muc goi va don mua (catalog.go)
	mux.HandleFunc("GET /api/packages", s.requireAdminAPI(s.apiPackages))
	mux.HandleFunc("POST /api/packages/{game}", s.requireWrite(s.apiCreatePackage))
	mux.HandleFunc("POST /api/packages/{game}/{id}", s.requireWrite(s.apiUpdatePackage))
	mux.HandleFunc("POST /api/orders/{id}/retry", s.requireWrite(s.apiOrderRetry))
	mux.HandleFunc("POST /api/orders/{id}/refund", s.requireWrite(s.apiOrderRefund))
	// Tai khoan cua chinh nguoi dang dang nhap (platform.go).
	mux.HandleFunc("GET /api/me", s.requireAdminAPI(s.apiMe))
	mux.HandleFunc("POST /api/me/password", s.requireAdminAPI(s.apiMePassword))
	// Quan tri nen tang (platform.go): game va nhan vien.
	mux.HandleFunc("GET /api/games", s.requireAdminAPI(s.apiGameList))
	mux.HandleFunc("POST /api/games", s.requireWrite(s.apiGameCreate))
	mux.HandleFunc("POST /api/games/{code}", s.requireWrite(s.apiGameUpdate))
	mux.HandleFunc("GET /api/staff", s.requireOwner(s.apiStaffList))
	mux.HandleFunc("POST /api/staff", s.requireOwner(s.apiStaffCreate))
	mux.HandleFunc("POST /api/staff/{id}", s.requireOwner(s.apiStaffUpdate))
	mux.HandleFunc("POST /api/staff/{id}/password", s.requireOwner(s.apiStaffPassword))
	// Tin tuc & su kien (news.go): operator tro len, ke ca doc — bang co ca ban nhap.
	mux.HandleFunc("GET /api/news", s.requireWrite(s.apiNewsList))
	mux.HandleFunc("POST /api/news", s.requireWrite(s.apiNewsCreate))
	mux.HandleFunc("POST /api/news/{id}", s.requireWrite(s.apiNewsUpdate))
	mux.HandleFunc("POST /api/news/{id}/delete", s.requireWrite(s.apiNewsDelete))
	// Trang noi dung tinh (pages.go): operator tro len, ke ca doc — o day thay ca ban rieng
	// cua tung game lan ban chung, va sua o day la sua thang trang cong khai.
	mux.HandleFunc("GET /api/pages", s.requireWrite(s.apiPageList))
	mux.HandleFunc("POST /api/pages", s.requireWrite(s.apiPageSave))
	mux.HandleFunc("POST /api/pages/{id}/delete", s.requireWrite(s.apiPageDelete))
	// Nguoi choi (players.go): xem thi can vai tro gm, khoa/mo thi can operator.
	mux.HandleFunc("GET /api/players", s.requireGMRole(s.apiPlayerList))
	mux.HandleFunc("GET /api/players/{id}", s.requireGMRole(s.apiPlayerDetail))
	mux.HandleFunc("POST /api/players/{id}", s.requireWrite(s.apiPlayerUpdate))
	// API cua cong cu GM (/gm) VAN nam o Adapter cua tung game:
	// haitac.<domain>/admin-portal/api/* — xem platform/cmd/adapter/adminportal.go va
	// internal/gmops. Ly do: moi thao tac GM di qua CONSOLE cua cum game, thu rieng cua
	// tung game; game them vao sau se co backend khac han. Tien trinh nay chi phuc vu
	// BUNDLE cua giao dien GM, phan CHUNG cua he thong (CMS, nap tien cho he thong ID,
	// tai khoan chung, cau hinh cua hang) va phien dang nhap dung chung.
	mux.HandleFunc("GET /healthz", s.health)

	handler := httpx.Recover(log, httpx.Logging(log, mux))
	httpSrv := &http.Server{
		Addr: addr, Handler: handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       90 * time.Second,
	}

	go func() {
		log.Info("admin khoi dong", "addr", addr, "cong_khai", public,
			"cookie_secure", secure, "phien_gio", int(sessionTTL.Hours()))
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

// firstNonEmpty tra ve gia tri dau tien khong rong — de mot bien co nhieu ten (CONSOLE_*
// cua rieng admin, hoac ADAPTER_CONSOLE_* dung chung voi adapter trong cung .env).
func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v = strings.TrimSpace(v); v != "" {
			return v
		}
	}
	return ""
}

func envOr(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if n, err := strconv.Atoi(strings.TrimSpace(os.Getenv(key))); err == nil && n > 0 {
		return n
	}
	return def
}

func envDur(key string, def time.Duration) time.Duration {
	if d, err := time.ParseDuration(strings.TrimSpace(os.Getenv(key))); err == nil && d > 0 {
		return d
	}
	return def
}

func apiNotFound(w http.ResponseWriter, _ *http.Request) {
	httpx.Error(w, http.StatusNotFound, "not_found", "Không có API này.")
}

// Tai khoan quan tri mac dinh, dung khi .env khong dat ADMIN_BOOTSTRAP_*.
//
// Mat khau nay nam trong ma nguon cua mot repo CONG KHAI, nen phai coi la ai cung biet.
// No chap nhan duoc vi trang quan tri chi nghe loopback (vao bang SSH tunnel), nhung
// tai khoan gieo bang no bi danh dau must_change_password: moi trang trong giao dien deu
// hien canh bao cho toi khi doi.
const (
	defaultAdminUser  = "admin"
	defaultAdminEmail = "admin@antfarms.xyz"
	defaultAdminPass  = "Admin@123"
)

// seedOwner tao tai khoan quan tri dau tien khi bang con trong.
//
// Chi chay khi CHUA co tai khoan nao — khong bao gio ghi de tai khoan san co, ke ca khi
// bien moi truong doi.
func seedOwner(ctx context.Context, db *sql.DB, log *slog.Logger) error {
	var n int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM admin_users`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	user := envOr("ADMIN_BOOTSTRAP_USER", defaultAdminUser)
	email := envOr("ADMIN_BOOTSTRAP_EMAIL", defaultAdminEmail)
	pass := os.Getenv("ADMIN_BOOTSTRAP_PASSWORD")
	usingDefault := pass == ""
	if usingDefault {
		pass = defaultAdminPass
	}
	hash, err := hashAdminPassword(pass)
	if err != nil {
		return err
	}
	mustChange := 0
	if usingDefault {
		mustChange = 1
	}
	if _, err := db.ExecContext(ctx,
		`INSERT INTO admin_users (username, email, password_hash, role, must_change_password)
		 VALUES (?,?,?,'owner',?)`,
		user, email, hash, mustChange); err != nil {
		return err
	}
	if usingDefault {
		log.Warn("da tao tai khoan quan tri dau tien voi MAT KHAU MAC DINH trong ma nguon — doi ngay sau khi dang nhap",
			"user", user, "email", email)
	} else {
		log.Info("da tao tai khoan quan tri dau tien", "user", user, "email", email)
	}
	return nil
}
