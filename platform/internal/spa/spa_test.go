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

// Chua chay `npm run build` (chi co .gitkeep) thi khong duoc chet luc khoi dong: dich vu
// van phai phuc vu API, chi trang giao dien la bao chua build.
func TestMissingBuildExplainsInsteadOfCrashing(t *testing.T) {
	h := Handler(fstest.MapFS{"dist/.gitkeep": {Data: nil}}, "dist")
	rec := get(h, "/")
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("muon 503, duoc %d", rec.Code)
	}
	if body := rec.Body.String(); !strings.Contains(body, "npm run build") {
		t.Errorf("trang bao loi phai chi cach sua, duoc %q", body)
	}
}

// Khong duoc thoat khoi thu muc build bang ../
func TestDoesNotEscapeRoot(t *testing.T) {
	fsys := built()
	fsys["bimat.txt"] = &fstest.MapFile{Data: []byte("khong duoc lo")}
	h := Handler(fsys, "dist")
	for _, p := range []string{"/../bimat.txt", "/assets/../../bimat.txt"} {
		rec := get(h, p)
		if body := rec.Body.String(); strings.Contains(body, "khong duoc lo") {
			t.Errorf("%s: lo file ngoai thu muc build", p)
		}
	}
}
