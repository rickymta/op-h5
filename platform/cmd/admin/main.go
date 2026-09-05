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
	"html/template"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/rickymta/op-h5/platform/internal/config"
	"github.com/rickymta/op-h5/platform/internal/console"
	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/spa"
	"github.com/rickymta/op-h5/platform/internal/store"
)

//go:embed all:templates
var templatesFS embed.FS

// Giao dien React da build (web/apps/ops -> dist/). Thu muc luon ton tai nho dist/.gitkeep,
// nen `go build` chay duoc ca khi chua `npm run build`; luc do spa.Handler tra trang huong dan.
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

	tpl, err := template.New("").Funcs(tplFuncs()).ParseFS(templatesFS, "templates/*.html")
	if err != nil {
		log.Error("doc template", "err", err)
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

	s := &server{
		db: db, log: log, tpl: tpl,
		secure:  os.Getenv("ADMIN_COOKIE_SECURE") != "false",
		fetcher: newFleetFetcher(),
		console: consoleClient,
	}

	mux := http.NewServeMux()

	// ADMIN_SPA=1: giao dien React phuc vu tu goc, trang Go cu lui ve tien to /cu/.
	// Hai ban dung chung API va chung phien dang nhap, nen bat/tat khong mat gi —
	// day la cach chuyen dan tung trang ma van lui duoc trong mot lan restart.
	useSPA := os.Getenv("ADMIN_SPA") == "1"
	goPage := func(path string, h http.HandlerFunc) {
		if useSPA {
			mux.HandleFunc("GET /cu"+path, h)
			return
		}
		mux.HandleFunc("GET "+path, h)
	}
	if useSPA {
		spaHandler := spa.Handler(distFS, "dist")
		mux.Handle("GET /", spaHandler)
		log.Info("giao dien React bat (ADMIN_SPA=1); trang cu o /cu/")
	}

	goPage("/{$}", s.requireAdmin(s.dashboard))
	mux.HandleFunc("GET /dang-nhap", s.loginPage)
	mux.HandleFunc("POST /dang-nhap", s.doLogin)
	mux.HandleFunc("POST /dang-xuat", s.doLogout)
	goPage("/nhat-ky", s.requireAdmin(s.auditPage))
	goPage("/nap-tay", s.requireAdmin(s.walletPage))
	// API: trang dung fetch, va cong cu ngoai cung goi duoc.
	mux.HandleFunc("GET /api/fleet", s.requireAdminAPI(s.apiFleet))
	mux.HandleFunc("GET /api/orders", s.requireAdminAPI(s.apiOrders))
	mux.HandleFunc("POST /api/servers/{game}/{srv}", s.requireWrite(s.apiUpdateServer))
	mux.HandleFunc("POST /api/devices/{game}/{device}", s.requireWrite(s.apiUpdateDevice))
	mux.HandleFunc("POST /api/wallet/topup", s.requireWrite(s.apiTopup))
	// Cua hang: danh muc goi va don mua (catalog.go)
	goPage("/goi", s.requireAdmin(s.packagesPage))
	goPage("/don-mua", s.requireAdmin(s.ordersPage))
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
	// Nguoi choi (players.go): xem thi can vai tro gm, khoa/mo thi can operator.
	mux.HandleFunc("GET /api/players", s.requireGM(s.apiPlayerList))
	mux.HandleFunc("GET /api/players/{id}", s.requireGM(s.apiPlayerDetail))
	mux.HandleFunc("POST /api/players/{id}", s.requireWrite(s.apiPlayerUpdate))
	// Cong cu GM (gm.go): thao tac tren nhan vat qua console.
	mux.HandleFunc("GET /api/gm/meta", s.requireAdminAPI(s.apiGMMeta))
	mux.HandleFunc("GET /api/gm/roles", s.requireGM(s.apiGMRoles))
	mux.HandleFunc("GET /api/gm/bag", s.requireGM(s.apiGMBag))
	mux.HandleFunc("POST /api/gm/bag/clear", s.requireGM(s.apiGMBagClear))
	mux.HandleFunc("POST /api/gm/pay", s.requireGM(s.apiGMPay))
	mux.HandleFunc("POST /api/gm/mail", s.requireGM(s.apiGMMail))
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
		log.Info("admin khoi dong", "addr", addr)
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

func tplFuncs() template.FuncMap {
	return template.FuncMap{
		"pct": func(a, b int) int {
			if b <= 0 {
				return 0
			}
			return a * 100 / b
		},
		"bandClass": func(b string) string {
			switch b {
			case "smooth":
				return "ok"
			case "busy":
				return "warn"
			default:
				return "crit"
			}
		},
	}
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
