// Package store mo ket noi MySQL va chay migration.
package store

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"github.com/rickymta/op-h5/platform/internal/config"
)

// Open mo ket noi va doi DB san sang. Tra ve loi neu khong ket noi duoc trong wait.
func Open(cfg config.DB, wait time.Duration) (*sql.DB, error) {
	db, err := sql.Open("mysql", cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("mo ket noi: %w", err)
	}
	// May nho, nhieu dich vu dung chung mot MySQL (max_connections=250) nen giu pool nho.
	db.SetMaxOpenConns(16)
	db.SetMaxIdleConns(4)
	db.SetConnMaxLifetime(30 * time.Minute)

	deadline := time.Now().Add(wait)
	for {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		err = db.PingContext(ctx)
		cancel()
		if err == nil {
			return db, nil
		}
		if time.Now().After(deadline) {
			_ = db.Close()
			return nil, fmt.Errorf("khong ket noi duoc MySQL sau %s: %w", wait, err)
		}
		time.Sleep(time.Second)
	}
}

//go:embed all:migrations
var migrationsFS embed.FS

// Migrate chay cac file .sql trong migrations/ theo thu tu ten, mot lan moi file.
//
// Khong dung thu vien ngoai: schema nay nho va chi tien len, nen mot bang ghi nhan
// va vong lap la du. Moi file chay trong mot giao dich rieng.
func Migrate(ctx context.Context, db *sql.DB, log *slog.Logger) error {
	if _, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
		  name       VARCHAR(190) NOT NULL,
		  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		  PRIMARY KEY (name)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`); err != nil {
		return fmt.Errorf("tao bang schema_migrations: %w", err)
	}

	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("doc thu muc migrations: %w", err)
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)

	for _, name := range names {
		var seen int
		if err := db.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM schema_migrations WHERE name = ?`, name).Scan(&seen); err != nil {
			return err
		}
		if seen > 0 {
			continue
		}
		body, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return err
		}
		log.Info("chay migration", "file", name)
		for _, stmt := range splitStatements(string(body)) {
			if _, err := db.ExecContext(ctx, stmt); err != nil {
				return fmt.Errorf("migration %s: %w\ncau lenh: %.200s", name, err, stmt)
			}
		}
		if _, err := db.ExecContext(ctx,
			`INSERT INTO schema_migrations (name) VALUES (?)`, name); err != nil {
			return err
		}
	}
	return nil
}

// splitStatements tach file SQL theo dau ';' o cuoi dong, bo dong trong va dong chu thich.
// Du cho schema nay vi khong co trigger hay stored procedure.
func splitStatements(body string) []string {
	var (
		out []string
		cur strings.Builder
	)
	for _, line := range strings.Split(body, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "--") {
			continue
		}
		cur.WriteString(line)
		cur.WriteString("\n")
		if strings.HasSuffix(trimmed, ";") {
			if s := strings.TrimSpace(cur.String()); s != "" {
				out = append(out, strings.TrimSuffix(s, ";"))
			}
			cur.Reset()
		}
	}
	if s := strings.TrimSpace(cur.String()); s != "" {
		out = append(out, s)
	}
	return out
}
