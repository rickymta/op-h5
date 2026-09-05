package catalog

// Trang noi dung tinh (bang `pages`, migration 0011): gioi thieu, huong dan, dieu khoan,
// chinh sach, FAQ, ho tro. Doc chung cho `id` (/api/pages/{slug}) va `adapter`
// (/api/game/pages/{slug}); ghi nam o cmd/admin vi gan voi nhat ky admin_audit.

import (
	"context"
	"database/sql"
	"errors"
	"regexp"
	"time"
)

// Page la mot trang noi dung. Body la VAN BAN THUAN: doan cach nhau bang dong trong,
// tieu de phu bat dau bang "## ", gach dau dong bang "- ". Tang hien thi tach doan va
// khong bao gio dat vao innerHTML.
type Page struct {
	Slug      string `json:"slug"`
	GameCode  string `json:"game_code"`
	Title     string `json:"title"`
	Body      string `json:"body"`
	UpdatedAt string `json:"updated_at"` // RFC 3339
}

// slugRe: slug di thang vao URL nen chi nhan chu thuong, so va gach ngang.
var slugRe = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,63}$`)

// ValidSlug kiem tra slug truoc khi tra cuu hay ghi.
func ValidSlug(s string) bool { return slugRe.MatchString(s) }

const pageColumns = `slug, game_code, title, COALESCE(body,''), updated_at`

func scanPage(row scanner) (Page, error) {
	var p Page
	var at sql.NullTime
	if err := row.Scan(&p.Slug, &p.GameCode, &p.Title, &p.Body, &at); err != nil {
		return p, err
	}
	if at.Valid {
		p.UpdatedAt = at.Time.Format(time.RFC3339)
	}
	return p, nil
}

// PageBySlug doc mot trang.
//
// game != "" thi UU TIEN ban rieng cua game do va chi lui ve ban chung (game_code rong) khi
// game chua co ban rieng — nho vay mot game chi phai viet lai nhung trang no muon khac, con
// "dieu khoan" hay "chinh sach" thi dung chung mot ban cua nen tang.
func PageBySlug(ctx context.Context, q Querier, slug, game string) (Page, error) {
	if !ValidSlug(slug) {
		return Page{}, ErrNotFound
	}
	// ORDER BY (game_code = '') tang dan: ban rieng (0) truoc, ban chung (1) sau.
	p, err := scanPage(q.QueryRowContext(ctx,
		`SELECT `+pageColumns+` FROM pages WHERE slug = ? AND game_code IN (?, '')
		  ORDER BY (game_code = '') LIMIT 1`, slug, game))
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}
