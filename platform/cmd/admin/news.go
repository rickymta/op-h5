package main

// Tin tuc & su kien (bang news, migration 0010): tin chung cua nen tang (game_code NULL) va tin
// cua tung game. Trang chinh (id) va trang game (adapter) chi doc tin 'published' da toi gio;
// o day thay ca ban nhap. Vai tro operator tro len (hop dong 4.5); moi lan ghi vao admin_audit.

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/rickymta/op-h5/platform/internal/catalog"
	"github.com/rickymta/op-h5/platform/internal/httpx"
)

type newsRow struct {
	ID            int64  `json:"id"`
	GameCode      string `json:"game_code"` // rong = tin chung
	GameName      string `json:"game_name"`
	Kind          string `json:"kind"`
	Title         string `json:"title"`
	Summary       string `json:"summary"`
	Body          string `json:"body"`
	ImageURL      string `json:"image_url"`
	LinkURL       string `json:"link_url"`
	Pinned        bool   `json:"pinned"`
	Status        string `json:"status"`
	PublishedAt   string `json:"published_at"` // RFC 3339, rong khi chua dat
	CreatedBy     int64  `json:"created_by"`
	CreatedByName string `json:"created_by_name"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

// newsListParams: ?game=<code>|all|common&status=all|draft|published&page=&page_size=20.
type newsListParams struct {
	Game     string // "" = moi tin; "common" = chi tin chung; "<code>" = chi tin cua game do
	Status   string // "" = moi trang thai
	Page     int
	PageSize int
}

func parseNewsListQuery(q url.Values) newsListParams {
	p := newsListParams{
		Game:   strings.TrimSpace(q.Get("game")),
		Status: strings.TrimSpace(q.Get("status")),
	}
	if p.Game == "all" {
		p.Game = ""
	}
	if p.Status != "draft" && p.Status != "published" {
		p.Status = ""
	}
	p.Page, _ = strconv.Atoi(q.Get("page"))
	if p.Page < 1 {
		p.Page = 1
	}
	p.PageSize = catalog.ParseLimit(q.Get("page_size"), 20, 100)
	return p
}

func fmtTime(t sql.NullTime) string {
	if !t.Valid {
		return ""
	}
	return t.Time.Format(time.RFC3339)
}

func (s *server) apiNewsList(w http.ResponseWriter, r *http.Request, _ *admin) {
	p := parseNewsListQuery(r.URL.Query())
	where, args := `WHERE 1=1`, []any{}
	switch p.Game {
	case "":
	case "common":
		where += ` AND n.game_code IS NULL`
	default:
		where += ` AND n.game_code = ?`
		args = append(args, p.Game)
	}
	if p.Status != "" {
		where += ` AND n.status = ?`
		args = append(args, p.Status)
	}
	args = append(args, p.PageSize+1, (p.Page-1)*p.PageSize)
	rows, err := s.db.QueryContext(r.Context(), `
		SELECT n.id, COALESCE(n.game_code,''), COALESCE(g.name,''), n.kind, n.title, n.summary, COALESCE(n.body,''),
		       n.image_url, n.link_url, n.pinned, n.status, n.published_at,
		       COALESCE(n.created_by,0), COALESCE(u.username,''), n.created_at, n.updated_at
		  FROM news n
		  LEFT JOIN games g ON g.code = n.game_code
		  LEFT JOIN admin_users u ON u.id = n.created_by `+where+`
		 ORDER BY n.id DESC LIMIT ? OFFSET ?`, args...)
	if err != nil {
		s.log.Error("doc tin tuc", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được tin tức.")
		return
	}
	defer func() { _ = rows.Close() }()
	out := []newsRow{}
	for rows.Next() {
		var n newsRow
		var pub, created, updated sql.NullTime
		if err := rows.Scan(&n.ID, &n.GameCode, &n.GameName, &n.Kind, &n.Title, &n.Summary, &n.Body,
			&n.ImageURL, &n.LinkURL, &n.Pinned, &n.Status, &pub, &n.CreatedBy, &n.CreatedByName, &created, &updated); err != nil {
			s.log.Error("doc tin", "err", err)
			continue
		}
		n.PublishedAt, n.CreatedAt, n.UpdatedAt = fmtTime(pub), fmtTime(created), fmtTime(updated)
		out = append(out, n)
	}
	hasMore := false
	if len(out) > p.PageSize {
		out, hasMore = out[:p.PageSize], true
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"news": out, "has_more": hasMore, "page": p.Page, "page_size": p.PageSize})
}

// newsInput la khuon POST /api/news va POST /api/news/{id} (cap nhat thay ca dong).
type newsInput struct {
	GameCode    *string `json:"game_code"` // null hoac "" = tin chung
	Kind        string  `json:"kind"`
	Title       string  `json:"title"`
	Summary     string  `json:"summary"`
	Body        string  `json:"body"`
	ImageURL    string  `json:"image_url"`
	LinkURL     string  `json:"link_url"`
	Pinned      bool    `json:"pinned"`
	Status      string  `json:"status"`
	PublishedAt string  `json:"published_at"`
}

// newsValues la dau vao da chuan hoa, san sang ghi.
type newsValues struct {
	GameCode    string // rong = tin chung (ghi NULL)
	Kind        string
	Title       string
	Summary     string
	Body        string
	ImageURL    string
	LinkURL     string
	Pinned      bool
	Status      string
	PublishedAt sql.NullTime
}

// parsePublishedAt nhan RFC 3339 (khuon cua API) va vai khuon ma <input type=datetime-local>
// hay nguoi go tay hay dua len; gio khong co mui gio hieu theo gio may chu (Asia/Ho_Chi_Minh).
func parsePublishedAt(s string) (sql.NullTime, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return sql.NullTime{}, nil
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02T15:04:05", "2006-01-02T15:04",
		"2006-01-02 15:04:05", "2006-01-02 15:04", "2006-01-02"} {
		if t, err := time.ParseInLocation(layout, s, time.Local); err == nil {
			return sql.NullTime{Time: t, Valid: true}, nil
		}
	}
	return sql.NullTime{}, errors.New("published_at phải theo RFC 3339 (vd 2026-09-05T14:00:00+07:00) hoặc YYYY-MM-DD HH:MM")
}

func runes(s string) int { return len([]rune(s)) }

// validate chuan hoa va kiem tra; loi tra ve la thong bao doc duoc cho nguoi truc.
func (in newsInput) validate() (newsValues, error) {
	v := newsValues{
		Kind: strings.TrimSpace(in.Kind), Title: strings.TrimSpace(in.Title), Summary: strings.TrimSpace(in.Summary),
		Body: strings.TrimSpace(in.Body), ImageURL: strings.TrimSpace(in.ImageURL), LinkURL: strings.TrimSpace(in.LinkURL),
		Pinned: in.Pinned, Status: strings.TrimSpace(in.Status),
	}
	if in.GameCode != nil {
		v.GameCode = strings.TrimSpace(*in.GameCode)
	}
	if v.Kind == "" {
		v.Kind = "news"
	}
	if v.Status == "" {
		v.Status = "draft"
	}
	switch {
	case !catalog.ValidKind(v.Kind):
		return v, errors.New("Loại tin phải là news, event hoặc notice.")
	case v.Status != "draft" && v.Status != "published":
		return v, errors.New("Trạng thái phải là draft hoặc published.")
	case v.Title == "" || runes(v.Title) > 160:
		return v, errors.New("Tiêu đề 1–160 ký tự.")
	case runes(v.Summary) > 300:
		return v, errors.New("Tóm tắt tối đa 300 ký tự.")
	case runes(v.Body) > 20000:
		return v, errors.New("Nội dung tối đa 20.000 ký tự.")
	case !catalog.ValidAssetURL(v.ImageURL):
		return v, errors.New("Ảnh phải để trống, bắt đầu bằng / hoặc http(s)://, tối đa 255 ký tự.")
	case !catalog.ValidAssetURL(v.LinkURL):
		return v, errors.New("Liên kết phải để trống, bắt đầu bằng / hoặc http(s)://, tối đa 255 ký tự.")
	case v.GameCode != "" && !codeRe.MatchString(v.GameCode):
		return v, errors.New("Mã game không hợp lệ.")
	}
	pub, err := parsePublishedAt(in.PublishedAt)
	if err != nil {
		return v, err
	}
	v.PublishedAt = pub
	return v, nil
}

func nullStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// readNews doc va kiem tra than request; kiem luon game co ton tai (tin cua game da xoa se
// khong bao gio hien o dau ca).
func (s *server) readNews(w http.ResponseWriter, r *http.Request) (newsValues, bool) {
	var in newsInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được.")
		return newsValues{}, false
	}
	v, err := in.validate()
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", err.Error())
		return v, false
	}
	if v.GameCode != "" {
		var one int
		if err := s.db.QueryRowContext(r.Context(), `SELECT 1 FROM games WHERE code = ?`, v.GameCode).Scan(&one); err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "Game "+v.GameCode+" không tồn tại.")
			return v, false
		}
	}
	return v, true
}

func (s *server) apiNewsCreate(w http.ResponseWriter, r *http.Request, a *admin) {
	v, ok := s.readNews(w, r)
	if !ok {
		return
	}
	// Dang ngay ma khong dat gio -> gio hien tai (hop dong 4.5).
	if v.Status == "published" && !v.PublishedAt.Valid {
		v.PublishedAt = sql.NullTime{Time: time.Now(), Valid: true}
	}
	ctx := r.Context()
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO news (game_code, kind, title, summary, body, image_url, link_url, pinned, status, published_at, created_by)
		VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		nullStr(v.GameCode), v.Kind, v.Title, v.Summary, nullStr(v.Body), v.ImageURL, v.LinkURL,
		v.Pinned, v.Status, v.PublishedAt, a.ID)
	if err != nil {
		s.log.Error("tao tin", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		return
	}
	id, _ := res.LastInsertId()
	detail, _ := json.Marshal(map[string]any{"game": v.GameCode, "kind": v.Kind, "title": v.Title, "status": v.Status, "pinned": v.Pinned})
	s.audit(ctx, a.ID, "news_create", strconv.FormatInt(id, 10), string(detail))
	httpx.JSON(w, http.StatusOK, map[string]any{"id": id})
}

func newsID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	return id, err == nil && id > 0
}

func (s *server) apiNewsUpdate(w http.ResponseWriter, r *http.Request, a *admin) {
	id, ok := newsID(r)
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "id không hợp lệ.")
		return
	}
	v, ok := s.readNews(w, r)
	if !ok {
		return
	}
	ctx := r.Context()
	// published_at: dat thi ghi; khong dat ma dang -> giu gio cu, chua co thi lay gio hien tai
	// (sua mot tin da dang khong duoc lam no "moi dang lai"); ban nhap thi giu nguyen.
	pubExpr, args := "?", []any{nullStr(v.GameCode), v.Kind, v.Title, v.Summary, nullStr(v.Body), v.ImageURL, v.LinkURL, v.Pinned, v.Status}
	switch {
	case v.PublishedAt.Valid:
		args = append(args, v.PublishedAt)
	case v.Status == "published":
		pubExpr = "COALESCE(published_at, NOW())"
	default:
		pubExpr = "published_at"
	}
	args = append(args, id)
	res, err := s.db.ExecContext(ctx, `
		UPDATE news SET game_code = ?, kind = ?, title = ?, summary = ?, body = ?, image_url = ?, link_url = ?,
		       pinned = ?, status = ?, published_at = `+pubExpr+`
		 WHERE id = ?`, args...)
	if err != nil {
		s.log.Error("sua tin", "err", err, "id", id)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		var one int
		if s.db.QueryRowContext(ctx, `SELECT 1 FROM news WHERE id = ?`, id).Scan(&one) != nil {
			httpx.Error(w, http.StatusNotFound, "not_found", "Không có tin này.")
			return
		}
	}
	detail, _ := json.Marshal(map[string]any{"game": v.GameCode, "kind": v.Kind, "title": v.Title, "status": v.Status, "pinned": v.Pinned})
	s.audit(ctx, a.ID, "news_update", strconv.FormatInt(id, 10), string(detail))
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true, "id": id})
}

func (s *server) apiNewsDelete(w http.ResponseWriter, r *http.Request, a *admin) {
	id, ok := newsID(r)
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "id không hợp lệ.")
		return
	}
	ctx := r.Context()
	var title string
	if err := s.db.QueryRowContext(ctx, `SELECT title FROM news WHERE id = ?`, id).Scan(&title); err != nil {
		httpx.Error(w, http.StatusNotFound, "not_found", "Không có tin này.")
		return
	}
	if _, err := s.db.ExecContext(ctx, `DELETE FROM news WHERE id = ?`, id); err != nil {
		s.log.Error("xoa tin", "err", err, "id", id)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không xoá được.")
		return
	}
	detail, _ := json.Marshal(map[string]any{"title": title})
	s.audit(ctx, a.ID, "news_delete", strconv.FormatInt(id, 10), string(detail))
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}
