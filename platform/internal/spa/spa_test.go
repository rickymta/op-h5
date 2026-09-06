package spa

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

func built() fstest.MapFS {
	return fstest.MapFS{
		"dist/index.html":              {Data: []byte("<!doctype html>trang")},
		"dist/assets/index-abc123.js":  {Data: []byte("console.log(1)")},
		"dist/assets/index-abc123.css": {Data: []byte("body{}")},
	}
}

// twoApps: hai ban build trong cung mot FS, nhu `admin` (dist + dist-gm) va `id`
// (dist + dist-market).
func twoApps() fstest.MapFS {
	fsys := built()
	fsys["dist-gm/index.html"] = &fstest.MapFile{Data: []byte("<!doctype html>gm")}
	fsys["dist-gm/assets/gm-def456.js"] = &fstest.MapFile{Data: []byte("console.log('gm')")}
	return fsys
}

func get(h http.Handler, path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

// Duong khong phai file that phai tra index.html: SPA dinh tuyen o trinh duyet, nen bam F5
// o /don-mua ma tra 404 la trang trang.
func TestUnknownPathServesIndex(t *testing.T) {
	h := Handler(built(), "dist")
	for _, p := range []string{"/", "/don-mua", "/goi/khong-co", "/index.html"} {
		rec := get(h, p)
		if rec.Code != http.StatusOK {
			t.Errorf("%s: muon 200, duoc %d", p, rec.Code)
		}
		if body := rec.Body.String(); body != "<!doctype html>trang" {
			t.Errorf("%s: muon index.html, duoc %q", p, body)
		}
		if cc := rec.Header().Get("Cache-Control"); cc != "no-store" {
			t.Errorf("%s: index.html phai no-store, duoc %q", p, cc)
		}
	}
}

// Tai san co bam noi dung trong ten -> cache vinh vien duoc; doi noi dung la doi ten.
func TestHashedAssetIsImmutable(t *testing.T) {
	rec := get(Handler(built(), "dist"), "/assets/index-abc123.js")
	if rec.Code != http.StatusOK || rec.Body.String() != "console.log(1)" {
		t.Fatalf("muon noi dung file that, duoc %d %q", rec.Code, rec.Body.String())
	}
	if cc := rec.Header().Get("Cache-Control"); cc != "public, max-age=31536000, immutable" {
		t.Errorf("asset phai immutable, duoc %q", cc)
	}
}

// site/apps/haitac build voi assetsDir "app" (tren host game, /assets/ da thuoc client
// LayaAir): app/ cung phai duoc coi la bat bien, con duong khong phai file van ve index.html.
func TestAppDirIsImmutableToo(t *testing.T) {
	fsys := built()
	fsys["dist/app/index-def456.js"] = &fstest.MapFile{Data: []byte("console.log(2)")}
	h := Handler(fsys, "dist")
	rec := get(h, "/app/index-def456.js")
	if rec.Code != http.StatusOK || rec.Body.String() != "console.log(2)" {
		t.Fatalf("muon noi dung file that, duoc %d %q", rec.Code, rec.Body.String())
	}
	if cc := rec.Header().Get("Cache-Control"); cc != "public, max-age=31536000, immutable" {
		t.Errorf("app/ phai immutable, duoc %q", cc)
	}
	// /tin-tuc/5 khong phai file -> index.html, khong cache.
	rec = get(h, "/tin-tuc/5")
	if rec.Body.String() != "<!doctype html>trang" || rec.Header().Get("Cache-Control") != "no-store" {
		t.Errorf("/tin-tuc/5 phai tra index.html no-store, duoc %q %q", rec.Body.String(), rec.Header().Get("Cache-Control"))
	}
}

// Chua chay `npm run build` (chi co .gitkeep) thi khong duoc chet luc khoi dong: dich vu
// van phai phuc vu API, chi trang giao dien la bao chua build.
func TestMissingBuildExplainsInsteadOfCrashing(t *testing.T) {
	h := Handler(fstest.MapFS{"dist/.gitkeep": {Data: nil}}, "dist")
	rec := get(h, "/")
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("muon 503, duoc %d", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "npm run build") {
		t.Errorf("trang bao loi phai chi cach sua, duoc %q", body)
	}
	// Ten thu muc phai co trong trang: mot tien trinh mang hai SPA, phai biet cai nao thieu.
	if !strings.Contains(body, "dist/") {
		t.Errorf("trang bao loi phai noi ro thu muc nao trong, duoc %q", body)
	}
}

// SPA con chua build cung khong duoc lam chet tien trinh — va khong duoc keo theo SPA o goc.
func TestMissingSubAppDoesNotBreakRootApp(t *testing.T) {
	fsys := built()
	fsys["dist-gm/.gitkeep"] = &fstest.MapFile{Data: nil}
	mux := http.NewServeMux()
	Mount(mux, "/", fsys, "dist")
	Mount(mux, "/gm", fsys, "dist-gm")

	if rec := get(mux, "/gm/"); rec.Code != http.StatusServiceUnavailable {
		t.Errorf("/gm/ chua build: muon 503, duoc %d", rec.Code)
	}
	if rec := get(mux, "/don-mua"); rec.Code != http.StatusOK || rec.Body.String() != "<!doctype html>trang" {
		t.Errorf("SPA o goc van phai chay, duoc %d %q", rec.Code, rec.Body.String())
	}
}

// Hai SPA trong mot tien trinh (admin: / va /gm; id: / va /cho).
//
// Yeu cau chinh: duong cua SPA nay khong duoc roi vao SPA kia — /gm/nguoi-choi phai ra
// index.html cua GM, khong phai cua trang goc; /nguoi-choi thi nguoc lai.
func TestTwoAppsInOneMux(t *testing.T) {
	mux := http.NewServeMux()
	fsys := twoApps()
	Mount(mux, "/", fsys, "dist")
	Mount(mux, "/gm", fsys, "dist-gm")

	cases := []struct{ path, want string }{
		{"/", "<!doctype html>trang"},
		{"/don-mua", "<!doctype html>trang"},
		{"/gm/", "<!doctype html>gm"},
		{"/gm/nguoi-choi", "<!doctype html>gm"},          // duong con cua tien to
		{"/gm/thu/gui/toan-server", "<!doctype html>gm"}, // duong con nhieu cap
		{"/gmail", "<!doctype html>trang"},               // trung tien to nhung khong phai
		{"/nguoi-choi", "<!doctype html>trang"},          // khong thuoc tien to nao
	}
	for _, c := range cases {
		rec := get(mux, c.path)
		if rec.Code != http.StatusOK {
			t.Errorf("%s: muon 200, duoc %d", c.path, rec.Code)
			continue
		}
		if body := rec.Body.String(); body != c.want {
			t.Errorf("%s: muon %q, duoc %q", c.path, c.want, body)
		}
	}

	// Tai san cua SPA con phuc vu duoi tien to cua no, va van bat bien.
	rec := get(mux, "/gm/assets/gm-def456.js")
	if rec.Code != http.StatusOK || rec.Body.String() != "console.log('gm')" {
		t.Fatalf("tai san cua /gm: muon noi dung that, duoc %d %q", rec.Code, rec.Body.String())
	}
	if cc := rec.Header().Get("Cache-Control"); cc != "public, max-age=31536000, immutable" {
		t.Errorf("tai san cua /gm phai immutable, duoc %q", cc)
	}
	// Tai san cua SPA con KHONG duoc lo o goc: /assets/gm-def456.js la cua ban build khac.
	if rec := get(mux, "/assets/gm-def456.js"); rec.Body.String() == "console.log('gm')" {
		t.Errorf("tai san cua /gm lo ra goc")
	}

	// /gm (thieu gach cheo) -> chuyen huong, khong 404.
	rec = get(mux, "/gm")
	if rec.Code != http.StatusMovedPermanently || rec.Header().Get("Location") != "/gm/" {
		t.Errorf("/gm phai chuyen huong ve /gm/, duoc %d %q", rec.Code, rec.Header().Get("Location"))
	}
}

// Handler cua SPA con tu tu choi duong ngoai tien to, khong dua vao mux.
func TestSubAppRefusesForeignPath(t *testing.T) {
	h := HandlerAt(twoApps(), "dist-gm", "/gm")
	if rec := get(h, "/nguoi-choi"); rec.Code != http.StatusNotFound {
		t.Errorf("duong ngoai tien to: muon 404, duoc %d %q", rec.Code, rec.Body.String())
	}
	if rec := get(h, "/gm/nguoi-choi"); rec.Body.String() != "<!doctype html>gm" {
		t.Errorf("duong trong tien to: muon index.html cua GM, duoc %q", rec.Body.String())
	}
}

// Khong duoc thoat khoi thu muc build bang ../
func TestDoesNotEscapeRoot(t *testing.T) {
	fsys := twoApps()
	fsys["bimat.txt"] = &fstest.MapFile{Data: []byte("khong duoc lo")}
	fsys["dist-gm/bimat-gm.txt"] = &fstest.MapFile{Data: []byte("cung khong duoc lo")}

	h := Handler(fsys, "dist")
	for _, p := range []string{"/../bimat.txt", "/assets/../../bimat.txt", "/..%2fbimat.txt"} {
		if body := get(h, p).Body.String(); strings.Contains(body, "khong duoc lo") {
			t.Errorf("%s: lo file ngoai thu muc build", p)
		}
	}
	// Tu SPA con: khong duoc doc nguoc len tren, cung khong duoc dung ../ de nhay sang
	// ban build cua SPA kia.
	sub := HandlerAt(fsys, "dist-gm", "/gm")
	for _, p := range []string{"/gm/../bimat.txt", "/gm/assets/../../../bimat.txt", "/gm/../dist/index.html"} {
		rec := get(sub, p)
		if strings.Contains(rec.Body.String(), "khong duoc lo") || strings.Contains(rec.Body.String(), "trang") {
			t.Errorf("%s: thoat khoi ban build cua /gm (%d %q)", p, rec.Code, rec.Body.String())
		}
	}
}

// Thu muc khong duoc phuc vu: http.FileServer se in danh sach file, tuc la mot ban ke
// chi tiet ban build cho nguoi la doc.
func TestDirectoryListingIsNotServed(t *testing.T) {
	rec := get(Handler(built(), "dist"), "/assets/")
	if body := rec.Body.String(); body != "<!doctype html>trang" {
		t.Errorf("/assets/ phai tra index.html, duoc %q", body)
	}
}
