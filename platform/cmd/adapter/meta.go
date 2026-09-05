package main

// Trang cua game (web/apps/game) doc "bo mat" cua game tu day: /api/game/meta, /api/game/news,
// /api/game/news/{id}, /api/game/me. Ten, tagline, anh, mau nhan, lien ket nam trong bang games
// (migration 0010, sua o trang quan tri) — khong con gan cung trong template, nen MOT bundle
// chay cho moi game. Hop dong giai doan 3 muc 4.4.

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/rickymta/op-h5/platform/internal/capacity"
	"github.com/rickymta/op-h5/platform/internal/catalog"
	"github.com/rickymta/op-h5/platform/internal/httpx"
)

// lookupGameName doc ten game tu bang games (dat tieu de thu mac dinh "Cửa hàng <tên>" luc khoi
// dong). Khong co dong, hoac migration 0010 chua chay (image id cu), thi dung ten du phong tu
// ADAPTER_GAME_NAME / ma game — adapter khong duoc chet vi thieu mot dong cau hinh.
func lookupGameName(db *sql.DB, code, fallback string) string {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var name string
	if err := db.QueryRowContext(ctx, `SELECT name FROM games WHERE code = ?`, code).Scan(&name); err != nil || strings.TrimSpace(name) == "" {
		return fallback
	}
	return name
}

// gameMeta: ten, tagline, anh, mau nhan, lien ket, goi y may chu cho nguoi moi va so lieu song.
// Khong co dong games (hoac DB loi) thi van tra duoc ten du phong — trang chu khong duoc trang.
func (s *adapterServer) gameMeta(w http.ResponseWriter, r *http.Request) {
	g, err := catalog.GameByCode(r.Context(), s.db, s.cfg.GameCode)
	if err != nil {
		if !errors.Is(err, catalog.ErrNotFound) {
			s.log.Warn("doc dong games", "err", err, "game", s.cfg.GameCode)
		}
		g = catalog.Game{Code: s.cfg.GameCode, Name: s.gameName}
	}

	var recommended any
	open, online := 0, 0
	if f := s.tracker.Fleet(); f != nil {
		for _, sv := range f.Servers {
			if sv.Status == capacity.StatusRunning {
				open++
			}
		}
		online, _ = f.Utilization()
		// Goi y may chu cho nguoi moi: cung AdmitNew ma cong gioi han dung, nen "Máy chủ X · Mượt"
		// tren trang chu la dung cai nguoi choi se duoc dua vao khi bam Choi ngay.
		if d := f.AdmitNew(); d.Allowed {
			if sv, ok := f.Servers[d.SrvCode]; ok {
				recommended = map[string]any{
					"srv_code": sv.SrvCode, "name": sv.Name, "band": d.Band.String(), "label": d.Band.Label(),
				}
			}
		}
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"code": g.Code, "name": g.Name, "tagline": g.Tagline, "genre": g.Genre, "description": g.Description,
		"cover_url": g.CoverURL, "banner_url": g.BannerURL, "logo_url": g.LogoURL,
		"accent": g.Accent, "badge": g.Badge,
		"site_url": strings.TrimRight(g.SiteURL, "/"),
		"id_base":  strings.TrimRight(s.cfg.Issuer, "/"),
		"brand":    s.brand,
		"links": map[string]string{
			"fanpage_url": g.FanpageURL, "group_url": g.GroupURL, "support_url": g.SupportURL,
		},
		"recommended":  recommended,
		"servers_open": open,
		"online":       online,
	})
}

// gameNews: tin cua game nay + tin chung, da xuat ban. URL tra nguyen (cung host voi trang).
func (s *adapterServer) gameNews(w http.ResponseWriter, r *http.Request) {
	items, err := catalog.PublishedNews(r.Context(), s.db, catalog.NewsFilter{
		Game: s.cfg.GameCode, Limit: catalog.ParseLimit(r.URL.Query().Get("limit"), 10, 50),
	})
	if err != nil {
		s.log.Error("doc tin tuc", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được tin tức.")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"news": items})
}

func (s *adapterServer) gameNewsDetail(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		httpx.Error(w, http.StatusNotFound, "not_found", "Không có tin này.")
		return
	}
	// Tin rieng cua game khac khong hien o day: chi tin cua game nay hoac tin chung.
	d, err := catalog.PublishedNewsByID(r.Context(), s.db, id, s.cfg.GameCode)
	if err != nil {
		if errors.Is(err, catalog.ErrNotFound) {
			httpx.Error(w, http.StatusNotFound, "not_found", "Không có tin này.")
			return
		}
		s.log.Error("doc tin", "err", err, "id", id)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được tin.")
		return
	}
	httpx.JSON(w, http.StatusOK, d)
}

// gameMe: trang thai dang nhap cho TopBar cua trang game. Chua dang nhap cung tra 200 —
// day la cau hoi, khong phai loi.
func (s *adapterServer) gameMe(w http.ResponseWriter, r *http.Request) {
	uid, ok := s.currentUser(r)
	if !ok {
		httpx.JSON(w, http.StatusOK, map[string]any{"logged_in": false})
		return
	}
	out := map[string]any{"logged_in": true, "username": s.username(r)}
	if bal, err := s.wallet.Balance(r.Context(), uid); err == nil {
		out["balance"] = bal
	} else {
		s.log.Warn("doc so du", "err", err, "user", uid)
	}
	httpx.JSON(w, http.StatusOK, out)
}
