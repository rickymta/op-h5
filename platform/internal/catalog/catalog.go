// Package catalog doc "bo mat" cua nen tang: bang games (mo rong o migration 0010) va bang news.
//
// Ba dich vu dung chung: id (trang chinh: /api/games, /api/news), adapter (/api/game/meta,
// /api/game/news) va admin (form game, kiem tra dau vao). Chi co DOC va kiem tra o day; ghi
// (admin) nam o cmd/admin vi no gan voi nhat ky admin_audit.
package catalog

import (
	"context"
	"database/sql"
	"errors"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// ErrNotFound: khong co dong nao (game khong ton tai, tin chua xuat ban...).
var ErrNotFound = errors.New("khong tim thay")

// Querier la phan chung cua *sql.DB va *sql.Tx.
type Querier interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

type scanner interface{ Scan(...any) error }

// ---------------------------------------------------------------- games

// Game la mot dong trong bang games, ke ca cac cot thuong hieu cua migration 0010.
type Game struct {
	Code        string
	Name        string
	AdapterURL  string
	SiteURL     string
	Status      string
	SortOrder   int
	Tagline     string
	Genre       string
	Description string
	CoverURL    string // anh bia doc 3:4 (the game)
	BannerURL   string // key visual ngang (hero)
	LogoURL     string
	Accent      string // '#RRGGBB', rong = mau mac dinh
	Badge       string // '', 'new', 'hot', 'soon'
	Featured    bool
	FanpageURL  string
	GroupURL    string
	SupportURL  string
}

const gameColumns = `code, name, adapter_url, COALESCE(site_url,''), status, sort_order,
	tagline, genre, COALESCE(description,''), cover_url, banner_url, logo_url, accent, badge, featured,
	fanpage_url, group_url, support_url`

func scanGame(row scanner) (Game, error) {
	var g Game
	err := row.Scan(&g.Code, &g.Name, &g.AdapterURL, &g.SiteURL, &g.Status, &g.SortOrder,
		&g.Tagline, &g.Genre, &g.Description, &g.CoverURL, &g.BannerURL, &g.LogoURL, &g.Accent, &g.Badge, &g.Featured,
		&g.FanpageURL, &g.GroupURL, &g.SupportURL)
	return g, err
}

func listGames(ctx context.Context, q Querier, tail string) ([]Game, error) {
	rows, err := q.QueryContext(ctx, `SELECT `+gameColumns+` FROM games `+tail)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	out := []Game{}
	for rows.Next() {
		g, err := scanGame(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

// ActiveGames: game dang mo, game noi bat len dau roi theo thu tu hien thi (hop dong 4.2).
func ActiveGames(ctx context.Context, q Querier) ([]Game, error) {
	return listGames(ctx, q, `WHERE status = 'active' ORDER BY featured DESC, sort_order, code`)
}

// AllGames: moi game ke ca dang an (trang quan tri).
func AllGames(ctx context.Context, q Querier) ([]Game, error) {
	return listGames(ctx, q, `ORDER BY sort_order, code`)
}

// GameByCode tra ve mot game; ErrNotFound neu khong co dong.
func GameByCode(ctx context.Context, q Querier, code string) (Game, error) {
	g, err := scanGame(q.QueryRowContext(ctx, `SELECT `+gameColumns+` FROM games WHERE code = ?`, code))
	if errors.Is(err, sql.ErrNoRows) {
		return g, ErrNotFound
	}
	return g, err
}

// ---------------------------------------------------------------- news

// Kinds la cac loai tin; Badges la cac nhan cua game. Ca hai la ENUM trong DB, kiem o day
// de tra loi 400 doc duoc thay vi loi MySQL.
var (
	Kinds  = []string{"news", "event", "notice"}
	Badges = []string{"", "new", "hot", "soon"}
)

func ValidKind(k string) bool {
	for _, x := range Kinds {
		if x == k {
			return true
		}
	}
	return false
}

func ValidBadge(b string) bool {
	for _, x := range Badges {
		if x == b {
			return true
		}
	}
	return false
}

// NewsItem la mot tin da xuat ban theo khuon tra ve cho trang cong khai (hop dong 4.2 / 4.4).
type NewsItem struct {
	ID          int64  `json:"id"`
	GameCode    string `json:"game_code"` // rong = tin chung cua nen tang
	GameName    string `json:"game_name"`
	Kind        string `json:"kind"`
	Title       string `json:"title"`
	Summary     string `json:"summary"`
	ImageURL    string `json:"image_url"`
	LinkURL     string `json:"link_url"`
	Pinned      bool   `json:"pinned"`
	PublishedAt string `json:"published_at"` // RFC 3339
	// SiteURL cua game (rong voi tin chung) de ben goi ghep URL tuong doi; khong tra ra ngoai.
	SiteURL string `json:"-"`
}

// NewsDetail = NewsItem + noi dung (van ban thuan, doan cach nhau bang dong trong).
type NewsDetail struct {
	NewsItem
	Body string `json:"body"`
}

// NewsFilter loc tin cong khai.
type NewsFilter struct {
	Game  string // "" = moi game; "<code>" = tin cua game do VA tin chung
	Kind  string // "" = moi loai
	Limit int    // <= 0 -> 10; toi da 50
}

const newsColumns = `n.id, COALESCE(n.game_code,''), COALESCE(g.name,''), n.kind, n.title, n.summary,
	n.image_url, n.link_url, n.pinned, n.published_at, COALESCE(g.site_url,'')`

// publishedCond: chi tin da xuat ban VA da toi gio — published_at o tuong lai la hen gio dang.
const publishedCond = `n.status = 'published' AND n.published_at IS NOT NULL AND n.published_at <= NOW()`

func scanNewsInto(row scanner, it *NewsItem, extra ...any) error {
	var at sql.NullTime
	dest := []any{&it.ID, &it.GameCode, &it.GameName, &it.Kind, &it.Title, &it.Summary,
		&it.ImageURL, &it.LinkURL, &it.Pinned, &at, &it.SiteURL}
	dest = append(dest, extra...)
	if err := row.Scan(dest...); err != nil {
		return err
	}
	if at.Valid {
		it.PublishedAt = at.Time.Format(time.RFC3339)
	}
	return nil
}

// PublishedNews liet ke tin da xuat ban: ghim truoc, roi moi nhat truoc.
func PublishedNews(ctx context.Context, q Querier, f NewsFilter) ([]NewsItem, error) {
	where := `WHERE ` + publishedCond
	var args []any
	if f.Game != "" {
		where += ` AND (n.game_code = ? OR n.game_code IS NULL)`
		args = append(args, f.Game)
	}
	if f.Kind != "" {
		where += ` AND n.kind = ?`
		args = append(args, f.Kind)
	}
	limit := f.Limit
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	args = append(args, limit)
	rows, err := q.QueryContext(ctx, `SELECT `+newsColumns+` FROM news n LEFT JOIN games g ON g.code = n.game_code `+
		where+` ORDER BY n.pinned DESC, n.published_at DESC, n.id DESC LIMIT ?`, args...)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	out := []NewsItem{}
	for rows.Next() {
		var it NewsItem
		if err := scanNewsInto(rows, &it); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

// PublishedNewsByID tra ve mot tin da xuat ban kem noi dung. game != "" thi tin phai thuoc game
// do hoac la tin chung — trang cua game A khong hien tin rieng cua game B.
func PublishedNewsByID(ctx context.Context, q Querier, id int64, game string) (NewsDetail, error) {
	where := `WHERE n.id = ? AND ` + publishedCond
	args := []any{id}
	if game != "" {
		where += ` AND (n.game_code = ? OR n.game_code IS NULL)`
		args = append(args, game)
	}
	var d NewsDetail
	err := scanNewsInto(q.QueryRowContext(ctx,
		`SELECT `+newsColumns+`, COALESCE(n.body,'') FROM news n LEFT JOIN games g ON g.code = n.game_code `+where,
		args...), &d.NewsItem, &d.Body)
	if errors.Is(err, sql.ErrNoRows) {
		return d, ErrNotFound
	}
	return d, err
}

// LatestNotice: thong bao ghim moi nhat (kind='notice', pinned=1, da xuat ban) cho thanh thong bao
// mong tren dau trang. ErrNotFound khi khong co.
func LatestNotice(ctx context.Context, q Querier) (NewsItem, error) {
	var it NewsItem
	err := scanNewsInto(q.QueryRowContext(ctx,
		`SELECT `+newsColumns+` FROM news n LEFT JOIN games g ON g.code = n.game_code
		  WHERE n.kind = 'notice' AND n.pinned = 1 AND `+publishedCond+`
		  ORDER BY n.published_at DESC, n.id DESC LIMIT 1`), &it)
	if errors.Is(err, sql.ErrNoRows) {
		return it, ErrNotFound
	}
	return it, err
}

// ---------------------------------------------------------------- kiem tra & tien ich

var accentRe = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

// ValidAccent: rong (mau mac dinh) hoac '#RRGGBB'.
func ValidAccent(s string) bool { return s == "" || accentRe.MatchString(s) }

// ValidAssetURL: rong, hoac bat dau bang '/' (tuong doi so voi site_url), hoac http(s)://; toi da
// 255 ky tu; khong co khoang trang hay ky tu dieu khien. Chan 'javascript:' va moi scheme la.
func ValidAssetURL(s string) bool {
	if s == "" {
		return true
	}
	if len(s) > 255 {
		return false
	}
	for _, c := range s {
		if c <= ' ' || c == 0x7f {
			return false
		}
	}
	return strings.HasPrefix(s, "/") || strings.HasPrefix(s, "http://") || strings.HasPrefix(s, "https://")
}

// AbsURL ghep URL tuong doi voi site_url cua game thanh tuyet doi. URL da tuyet doi (co scheme,
// protocol-relative, data:) giu nguyen; base rong thi tra nguyen u.
func AbsURL(base, u string) string {
	u = strings.TrimSpace(u)
	if u == "" {
		return ""
	}
	if strings.HasPrefix(u, "http://") || strings.HasPrefix(u, "https://") ||
		strings.HasPrefix(u, "//") || strings.HasPrefix(u, "data:") {
		return u
	}
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	if base == "" {
		return u
	}
	if strings.HasPrefix(u, "/") {
		return base + u
	}
	return base + "/" + u
}

// ParseLimit doc tham so ?limit=: rong/hong/<=0 -> def, lon hon max -> max.
func ParseLimit(raw string, def, max int) int {
	n, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || n <= 0 {
		return def
	}
	if n > max {
		return max
	}
	return n
}
