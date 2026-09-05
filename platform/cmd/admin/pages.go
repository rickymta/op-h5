package main

// Trang noi dung tinh (bang `pages`, migration 0011): gioi thieu, huong dan, dieu khoan,
// chinh sach, FAQ, ho tro. `game_code = ''` la ban CHUNG cua nen tang, `game_code = '<ma>'`
// la ban rieng cua mot game; trang game tra cuu ban rieng truoc roi lui ve ban chung.
//
// Vai tro operator tro len (hop dong dot 3 muc 3.3), moi lan ghi vao admin_audit.
// Than request toi da 256 KB: `body` la van ban dai (MEDIUMTEXT), nhung 256 KB da la
// khoang 100 trang chu — du xa cho moi trang that va van chan duoc viec don bo nho.

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/rickymta/op-h5/platform/internal/catalog"
	"github.com/rickymta/op-h5/platform/internal/httpx"
)

// pageBodyLimit la tran than request cho hai endpoint ghi cua nhom nay.
const pageBodyLimit = 256 << 10

type pageRow struct {
	ID            int64  `json:"id"`
	Slug          string `json:"slug"`
	GameCode      string `json:"game_code"` // rong = trang chung
	GameName      string `json:"game_name"`
	Title         string `json:"title"`
	Body          string `json:"body"`
	UpdatedBy     int64  `json:"updated_by"`
	UpdatedByName string `json:"updated_by_name"`
	UpdatedAt     string `json:"updated_at"` // RFC 3339
}

// apiPageList: ?game=<code> chi ban rieng cua game do, ?game=common chi ban chung, con lai
// (rong hoac "all") la tat ca.
func (s *server) apiPageList(w http.ResponseWriter, r *http.Request, _ *admin) {
	where, args := `WHERE 1=1`, []any{}
	switch g := strings.TrimSpace(r.URL.Query().Get("game")); g {
	case "", "all":
	case "common":
		where += ` AND p.game_code = ''`
	default:
		where += ` AND p.game_code = ?`
		args = append(args, g)
	}
	rows, err := s.db.QueryContext(r.Context(), `
		SELECT p.id, p.slug, p.game_code, COALESCE(g.name,''), p.title, COALESCE(p.body,''),
		       COALESCE(p.updated_by,0), COALESCE(u.username,''), p.updated_at
		  FROM pages p
		  LEFT JOIN games g ON g.code = p.game_code
		  LEFT JOIN admin_users u ON u.id = p.updated_by `+where+`
		 ORDER BY p.game_code, p.slug`, args...)
	if err != nil {
		s.log.Error("doc trang noi dung", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được danh sách trang.")
		return
	}
	defer func() { _ = rows.Close() }()
	out := []pageRow{}
	for rows.Next() {
		var p pageRow
		var at sql.NullTime
		if err := rows.Scan(&p.ID, &p.Slug, &p.GameCode, &p.GameName, &p.Title, &p.Body,
			&p.UpdatedBy, &p.UpdatedByName, &at); err != nil {
			s.log.Error("doc dong trang", "err", err)
			continue
		}
		p.UpdatedAt = fmtTime(at)
		out = append(out, p)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"pages": out})
}

// pageInput la khuon POST /api/pages (upsert theo slug + game).
type pageInput struct {
	Slug     string  `json:"slug"`
	GameCode *string `json:"game_code"` // null hoac "" = trang chung
	Title    string  `json:"title"`
	Body     string  `json:"body"`
}

type pageValues struct {
	Slug     string
	GameCode string
	Title    string
	Body     string
}

// validate chuan hoa va kiem tra; loi tra ve la thong bao doc duoc cho nguoi truc.
func (in pageInput) validate() (pageValues, error) {
	v := pageValues{
		Slug:  strings.ToLower(strings.TrimSpace(in.Slug)),
		Title: strings.TrimSpace(in.Title),
		Body:  strings.TrimSpace(in.Body),
	}
	if in.GameCode != nil {
		v.GameCode = strings.TrimSpace(*in.GameCode)
	}
	switch {
	case !catalog.ValidSlug(v.Slug):
		return v, errors.New("Đường dẫn chỉ gồm chữ thường, số và gạch ngang, tối đa 64 ký tự.")
	case v.Title == "" || runes(v.Title) > 160:
		return v, errors.New("Tiêu đề 1–160 ký tự.")
	case runes(v.Body) > 100000:
		return v, errors.New("Nội dung tối đa 100.000 ký tự.")
	case v.GameCode != "" && !codeRe.MatchString(v.GameCode):
		return v, errors.New("Mã game không hợp lệ.")
	// Noi dung la VAN BAN THUAN. Tang hien thi dat bang text nen the HTML chi hien ra nhu
	// chu, khong chay — nhung chan <script> o cua vao la lop thu hai re tien, phong khi mot
	// tang hien thi ve sau lo dung innerHTML.
	case strings.Contains(strings.ToLower(v.Body), "<script"):
		return v, errors.New("Nội dung là văn bản thuần, không nhận mã HTML. Dùng dòng trống để ngắt đoạn, \"## \" cho tiêu đề phụ, \"- \" cho gạch đầu dòng.")
	}
	return v, nil
}

// readPage doc va kiem tra than request; kiem luon game co ton tai.
func (s *server) readPage(w http.ResponseWriter, r *http.Request) (pageValues, bool) {
	var in pageInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, pageBodyLimit)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được (tối đa 256 KB).")
		return pageValues{}, false
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

// apiPageSave tao moi hoac ghi de trang theo (slug, game_code).
//
// Mot cau INSERT ... ON DUPLICATE KEY UPDATE thay vi doc-roi-ghi: hai nguoi cung luu mot
// trang thi nguoi sau ghi de, khong ai nhan loi kho hieu. `id = LAST_INSERT_ID(id)` de
// LastInsertId tra ve id cua dong CU khi la cap nhat.
func (s *server) apiPageSave(w http.ResponseWriter, r *http.Request, a *admin) {
	v, ok := s.readPage(w, r)
	if !ok {
		return
	}
	ctx := r.Context()
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO pages (slug, game_code, title, body, updated_by) VALUES (?,?,?,?,?)
		ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), title = VALUES(title),
		                        body = VALUES(body), updated_by = VALUES(updated_by)`,
		v.Slug, v.GameCode, v.Title, nullStr(v.Body), a.ID)
	if err != nil {
		s.log.Error("ghi trang noi dung", "err", err, "slug", v.Slug, "game", v.GameCode)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không ghi được.")
		return
	}
	id, _ := res.LastInsertId()
	detail, _ := json.Marshal(map[string]any{"slug": v.Slug, "game": v.GameCode, "title": v.Title, "chars": runes(v.Body)})
	s.audit(ctx, a.ID, "page_save", strconv.FormatInt(id, 10), string(detail))
	httpx.JSON(w, http.StatusOK, map[string]any{"id": id, "slug": v.Slug, "game_code": v.GameCode})
}

func (s *server) apiPageDelete(w http.ResponseWriter, r *http.Request, a *admin) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "id không hợp lệ.")
		return
	}
	ctx := r.Context()
	var slug, game string
	if err := s.db.QueryRowContext(ctx, `SELECT slug, game_code FROM pages WHERE id = ?`, id).Scan(&slug, &game); err != nil {
		httpx.Error(w, http.StatusNotFound, "not_found", "Không có trang này.")
		return
	}
	if _, err := s.db.ExecContext(ctx, `DELETE FROM pages WHERE id = ?`, id); err != nil {
		s.log.Error("xoa trang noi dung", "err", err, "id", id)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không xoá được.")
		return
	}
	detail, _ := json.Marshal(map[string]any{"slug": slug, "game": game})
	s.audit(ctx, a.ID, "page_delete", strconv.FormatInt(id, 10), string(detail))
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}
