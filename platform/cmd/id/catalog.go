package main

// Trang chinh cua cong (web/apps/portal): /api/site, /api/games, /api/news, /api/news/{id}.
// Khong can dang nhap. Khuon JSON: hop dong giai doan 3 muc 4.2 (docs/plan-go-react.md muc 15).

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/rickymta/op-h5/platform/internal/catalog"
	"github.com/rickymta/op-h5/platform/internal/httpx"
)

// siteInfo la thuong hieu cua cong, doc tu bien moi truong ID_* luc khoi dong (config.ID).
type siteInfo struct {
	Brand      string
	SupportURL string
	FanpageURL string
	TopupURL   string
	LegalNote  string
}

// apiSite: thuong hieu + thong bao ghim (tin kind='notice', pinned, moi nhat) cho thanh thong
// bao mong tren dau trang. Khong co tin ghim thi notice = null va trang khong hien thanh do.
func (a *apiServer) apiSite(w http.ResponseWriter, r *http.Request) {
	var notice any
	n, err := catalog.LatestNotice(r.Context(), a.db)
	switch {
	case err == nil:
		notice = map[string]any{"id": n.ID, "title": n.Title, "link_url": catalog.AbsURL(n.SiteURL, n.LinkURL)}
	case !errors.Is(err, catalog.ErrNotFound):
		a.log.Error("doc thong bao ghim", "err", err)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"brand":       a.site.Brand,
		"notice":      notice,
		"support_url": a.site.SupportURL,
		"fanpage_url": a.site.FanpageURL,
		"topup_url":   a.site.TopupURL,
		"legal_note":  a.site.LegalNote,
	})
}

// gameOut la mot the game tren trang chinh. Moi URL anh da ghep tuyet doi (games.site_url):
// trang chinh o domain.com con anh nam o host cua game.
type gameOut struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Tagline     string `json:"tagline"`
	Genre       string `json:"genre"`
	Description string `json:"description"`
	CoverURL    string `json:"cover_url"`
	BannerURL   string `json:"banner_url"`
	LogoURL     string `json:"logo_url"`
	Accent      string `json:"accent"`
	Badge       string `json:"badge"`
	Featured    bool   `json:"featured"`
	SiteURL     string `json:"site_url"`
	PlayURL     string `json:"play_url"`
	ServersURL  string `json:"servers_url"`
	Online      int    `json:"online"`
	ServersOpen int    `json:"servers_open"`
	Live        bool   `json:"live"`
}

// apiGames: moi game dang mo kem so lieu song hoi tu Adapter cua tung game (cache 30 s).
// Adapter nao khong tra loi thi game do live=false, online=0 — trang chinh chi hien so THAT.
func (a *apiServer) apiGames(w http.ResponseWriter, r *http.Request) {
	games, err := catalog.ActiveGames(r.Context(), a.db)
	if err != nil {
		a.log.Error("doc danh sach game", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được danh sách game.")
		return
	}
	out := make([]gameOut, len(games))
	var wg sync.WaitGroup
	for i, g := range games {
		site := strings.TrimRight(g.SiteURL, "/")
		out[i] = gameOut{
			Code: g.Code, Name: g.Name, Tagline: g.Tagline, Genre: g.Genre, Description: g.Description,
			CoverURL: catalog.AbsURL(site, g.CoverURL), BannerURL: catalog.AbsURL(site, g.BannerURL),
			LogoURL: catalog.AbsURL(site, g.LogoURL), Accent: g.Accent, Badge: g.Badge, Featured: g.Featured,
			SiteURL: site, PlayURL: site + "/choi-game", ServersURL: site + "/may-chu",
		}
		// Hoi cac Adapter song song: moi cai co the mat toi 3 s khi chet, noi tiep se la 3 s x N.
		wg.Add(1)
		go func(i int, adapterURL string) {
			defer wg.Done()
			res := a.live.get(adapterURL)
			out[i].Online, out[i].ServersOpen, out[i].Live = res.Online, res.ServersOpen, res.OK
		}(i, g.AdapterURL)
	}
	wg.Wait()

	var onlineTotal, openTotal int
	featured := ""
	for _, g := range out {
		onlineTotal += g.Online
		openTotal += g.ServersOpen
		if g.Featured && featured == "" {
			featured = g.Code
		}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"games":              out,
		"online_total":       onlineTotal,
		"servers_open_total": openTotal,
		"featured":           featured,
	})
}

// parseNewsQuery doc ?game=<code>|all&kind=news|event|notice|all&limit=N. Gia tri la ("all",
// rong, loai khong co trong enum) deu thanh "khong loc" thay vi 400: trang cong khai, mot link
// cu voi tham so sai van phai ra tin.
func parseNewsQuery(q url.Values) (game, kind string, limit int) {
	game = strings.TrimSpace(q.Get("game"))
	if game == "all" {
		game = ""
	}
	kind = strings.TrimSpace(q.Get("kind"))
	if !catalog.ValidKind(kind) {
		kind = ""
	}
	return game, kind, catalog.ParseLimit(q.Get("limit"), 10, 50)
}

// absNews ghep URL anh/lien ket tuong doi cua tin thuoc mot game voi site_url cua game do.
// Tin chung (khong co game) giu nguyen: duong tuong doi cua no la so voi chinh host nay.
func absNews(it *catalog.NewsItem) {
	if it.SiteURL == "" {
		return
	}
	it.ImageURL = catalog.AbsURL(it.SiteURL, it.ImageURL)
	it.LinkURL = catalog.AbsURL(it.SiteURL, it.LinkURL)
}

func (a *apiServer) apiNews(w http.ResponseWriter, r *http.Request) {
	game, kind, limit := parseNewsQuery(r.URL.Query())
	items, err := catalog.PublishedNews(r.Context(), a.db, catalog.NewsFilter{Game: game, Kind: kind, Limit: limit})
	if err != nil {
		a.log.Error("doc tin tuc", "err", err)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được tin tức.")
		return
	}
	for i := range items {
		absNews(&items[i])
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"news": items})
}

func (a *apiServer) apiNewsDetail(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		httpx.Error(w, http.StatusNotFound, "not_found", "Không có tin này.")
		return
	}
	d, err := catalog.PublishedNewsByID(r.Context(), a.db, id, "")
	if err != nil {
		if errors.Is(err, catalog.ErrNotFound) {
			httpx.Error(w, http.StatusNotFound, "not_found", "Không có tin này.")
			return
		}
		a.log.Error("doc tin", "err", err, "id", id)
		httpx.Error(w, http.StatusInternalServerError, "server_error", "Không đọc được tin.")
		return
	}
	absNews(&d.NewsItem)
	httpx.JSON(w, http.StatusOK, d)
}

// ---------------------------------------------------------------- so lieu song tu Adapter

// liveResult la so lieu cua mot game doc tu GET <adapter_url>/api/game/servers.
type liveResult struct {
	Online      int
	ServersOpen int // so may chu status='running'
	OK          bool
}

// liveStats hoi Adapter cua tung game va giu ket qua 30 s (hop dong 4.2).
//
// Trang chinh la trang cong khai: moi luot tai deu goi /api/games, va moi game la mot HTTP
// request sang Adapter. Khong cache thi mot dot vao dong bien thanh mot dot goi Adapter — cung
// tien trinh dang giu cong gioi han tai. Cache theo adapter_url; luot hoi cung game trong luc
// dang lay thi DOI luot dau (mutex rieng tung game) chu khong lay them — chong don.
type liveStats struct {
	client  *http.Client
	ttl     time.Duration
	timeout time.Duration
	now     func() time.Time

	mu      sync.Mutex
	entries map[string]*liveEntry
}

type liveEntry struct {
	mu  sync.Mutex // tuan tu hoa cac luot hoi cung mot game
	at  time.Time  // zero = chua co
	res liveResult
}

func newLiveStats(ttl, timeout time.Duration) *liveStats {
	return &liveStats{
		client: &http.Client{Timeout: timeout}, ttl: ttl, timeout: timeout,
		now: time.Now, entries: map[string]*liveEntry{},
	}
}

// get tra ve so lieu cua game o adapterURL: tu cache neu con moi, khong thi hoi Adapter.
// Ket qua hong cung duoc giu trong ttl: mot Adapter chet khong lam moi luot tai trang treo 3 s.
func (l *liveStats) get(adapterURL string) liveResult {
	// Khoa cache la dia chi da chuan hoa: admin ghi "http://127.0.0.1:8090/" hay khong co "/" cuoi
	// deu la mot Adapter.
	adapterURL = strings.TrimRight(strings.TrimSpace(adapterURL), "/")
	l.mu.Lock()
	e := l.entries[adapterURL]
	if e == nil {
		e = &liveEntry{}
		l.entries[adapterURL] = e
	}
	l.mu.Unlock()

	e.mu.Lock()
	defer e.mu.Unlock()
	if !e.at.IsZero() && l.now().Sub(e.at) < l.ttl {
		return e.res
	}
	e.res = l.fetch(adapterURL)
	e.at = l.now()
	return e.res
}

func (l *liveStats) fetch(adapterURL string) liveResult {
	adapterURL = strings.TrimRight(strings.TrimSpace(adapterURL), "/")
	if adapterURL == "" {
		return liveResult{}
	}
	// Khong dung context cua request goi den: nhieu request dang doi cung mot luot lay, huy
	// mot cai khong duoc lam hong ket qua cua nhung cai con lai.
	ctx, cancel := context.WithTimeout(context.Background(), l.timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, adapterURL+"/api/game/servers", nil)
	if err != nil {
		return liveResult{}
	}
	resp, err := l.client.Do(req)
	if err != nil {
		return liveResult{}
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return liveResult{}
	}
	var body struct {
		Servers []struct {
			Status string `json:"status"`
		} `json:"servers"`
		Online int `json:"online"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&body); err != nil {
		return liveResult{}
	}
	open := 0
	for _, s := range body.Servers {
		if s.Status == "running" {
			open++
		}
	}
	return liveResult{Online: body.Online, ServersOpen: open, OK: true}
}
