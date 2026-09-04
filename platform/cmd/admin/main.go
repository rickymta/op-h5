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
	"github.com/rickymta/op-h5/platform/internal/httpx"
	"github.com/rickymta/op-h5/platform/internal/store"
)

//go:embed all:templates
var templatesFS embed.FS

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

	s := &server{
		db: db, log: log, tpl: tpl,
		secure:  os.Getenv("ADMIN_COOKIE_SECURE") != "false",
		fetcher: newFleetFetcher(),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", s.requireAdmin(s.dashboard))
	mux.HandleFunc("GET /dang-nhap", s.loginPage)
	mux.HandleFunc("POST /dang-nhap", s.doLogin)
	mux.HandleFunc("POST /dang-xuat", s.doLogout)
	mux.HandleFunc("GET /nhat-ky", s.requireAdmin(s.auditPage))
	// API: trang dung fetch, va cong cu ngoai cung goi duoc.
	mux.HandleFunc("GET /api/fleet", s.requireAdminAPI(s.apiFleet))
	mux.HandleFunc("POST /api/servers/{game}/{srv}", s.requireWrite(s.apiUpdateServer))
	mux.HandleFunc("POST /api/devices/{game}/{device}", s.requireWrite(s.apiUpdateDevice))
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

// seedOwner tao tai khoan quan tri dau tien tu ADMIN_BOOTSTRAP_USER / _PASSWORD.
func seedOwner(ctx context.Context, db *sql.DB, log *slog.Logger) error {
	var n int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM admin_users`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	user := os.Getenv("ADMIN_BOOTSTRAP_USER")
	pass := os.Getenv("ADMIN_BOOTSTRAP_PASSWORD")
	if user == "" || pass == "" {
		log.Warn("chua co tai khoan quan tri nao; dat ADMIN_BOOTSTRAP_USER va ADMIN_BOOTSTRAP_PASSWORD roi khoi dong lai")
		return nil
	}
	hash, err := hashAdminPassword(pass)
	if err != nil {
		return err
	}
	if _, err := db.ExecContext(ctx,
		`INSERT INTO admin_users (username, password_hash, role) VALUES (?,?,'owner')`,
		user, hash); err != nil {
		return err
	}
	log.Info("da tao tai khoan quan tri dau tien", "user", user)
	return nil
}
