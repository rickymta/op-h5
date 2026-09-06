// Package spa phuc vu cac ung dung React da build (Vite) tu embed.FS.
//
// Mot tien trinh mang NHIEU SPA duoi cac tien to khac nhau — `admin` co `/` (quan tri nen
// tang) va `/gm` (cong cu GM), `id` co `/` (cong chinh) va `/cho` (cho). Khong tach them
// tien trinh: hai giao dien dung chung phien dang nhap va chung API, tach ra chi de tach
// mot bo bundle.
//
// Vi sao khong dung thang http.FileServer:
//   - SPA dinh tuyen o phia trinh duyet, nen moi duong khong phai file that phai tra
//     index.html chu khong phai 404 — nguoi choi bam F5 o /don-mua se thay trang trang.
//   - Vite dat bam noi dung vao ten file trong assets/ (hoac app/ — site/apps/haitac dung
//     assetsDir "app" vi tren host game nginx da danh /assets/ va regex \.(js|css)$ cho
//     client LayaAir) nen chung bat bien; con index.html thi KHONG duoc cache, neu khong
//     nguoi dung giu ban cu tro toi asset da bi xoa sau lan trien khai sau (da dinh that
//     mot lan voi bundle client, xem docs/mac-test-brief).
//   - Duong /api/ khong bao gio duoc roi vao day: no phai 404 JSON chu khong tra HTML,
//     neu khong client se bao mot loi khong lien quan. Moi lenh dang ky "GET /api/" va
//     "POST /api/" tra JSON 404 — pattern do cu the hon "GET /" nen thang.
//   - Hai SPA khong duoc lan sang nhau: SPA con la mot pattern RIENG cua ServeMux
//     ("GET /gm/") chu khong phai mot nhanh cua "GET /", va handler cua no tu tu choi
//     moi duong nam ngoai tien to.
package spa

import (
	"io"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

// Handler tra ve http.Handler phuc vu `root` trong fsys tai goc.
//
// Thu muc build chua ton tai (chua chay `npm run build`, chi co .gitkeep): thay vi chet
// luc khoi dong, tra ve mot trang giai thich. Dich vu van chay de phuc vu API.
func Handler(fsys fs.FS, root string) http.Handler { return HandlerAt(fsys, root, "/") }

// HandlerAt nhu Handler nhung SPA duoc gan duoi `prefix` ("/gm", "/cho"...).
//
// Handler tu cat tien to khoi duong dan truoc khi tra file, va tra 404 cho duong khong
// thuoc tien to — de mot lan dang ky nham vao mux khong bien SPA nay thanh cai bay nuot
// het duong cua SPA kia.
func HandlerAt(fsys fs.FS, root, prefix string) http.Handler {
	prefix = normPrefix(prefix)
	sub, err := fs.Sub(fsys, root)
	if err != nil {
		return missing(root, err)
	}
	index, err := fs.ReadFile(sub, "index.html")
	if err != nil {
		return missing(root, err)
	}
	var files http.Handler = http.FileServer(http.FS(sub))
	if prefix != "/" {
		files = http.StripPrefix(prefix, files)
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rel, ok := relative(prefix, r.URL.Path)
		if !ok {
			http.NotFound(w, r)
			return
		}
		if isFile(sub, rel) {
			// Ten file cua Vite co bam noi dung -> doi noi dung la doi ten.
			if immutableDir(rel) {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			}
			files.ServeHTTP(w, r)
			return
		}
		serveIndex(w, index)
	})
}

// Mount gan mot SPA vao mux duoi `prefix` ("/" cho SPA o goc).
//
// SPA con dang ky HAI pattern: "GET /gm/" (bat moi duong con) va "GET /gm" (chuyen huong
// them gach cheo). Pattern co tien to cu the hon "GET /" nen ServeMux luon chon dung SPA,
// khong phu thuoc thu tu goi Mount.
func Mount(mux *http.ServeMux, prefix string, fsys fs.FS, root string) {
	prefix = normPrefix(prefix)
	h := HandlerAt(fsys, root, prefix)
	if prefix == "/" {
		mux.Handle("GET /", h)
		return
	}
	mux.Handle("GET "+prefix+"/", h)
	// Khong de ServeMux tu lo viec nay: no chi tu them gach cheo khi pattern khong gach
	// cheo CHUA duoc dang ky, ma dieu do phu thuoc vao cac lenh dang ky khac.
	mux.HandleFunc("GET "+prefix, func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, prefix+"/", http.StatusMovedPermanently)
	})
}

// normPrefix dua tien to ve dang chuan: "" / "/" -> "/"; "gm", "/gm", "/gm/" -> "/gm".
func normPrefix(p string) string {
	if p = strings.Trim(p, "/"); p == "" {
		return "/"
	}
	return "/" + p
}

// relative cat tien to khoi duong dan da chuan hoa.
//
// path.Clean chay TRUOC khi so tien to, nen "/gm/../bimat" thanh "/bimat" va bi tu choi
// thay vi duoc coi la nam trong /gm.
func relative(prefix, urlPath string) (string, bool) {
	p := path.Clean("/" + urlPath)
	if prefix == "/" {
		return strings.TrimPrefix(p, "/"), true
	}
	if p == prefix {
		return "", true
	}
	if !strings.HasPrefix(p, prefix+"/") {
		return "", false
	}
	return strings.TrimPrefix(p, prefix+"/"), true
}

// isFile cho biet `rel` la mot file that trong ban build.
//
// Thu muc thi KHONG: http.FileServer se in danh sach file cho "/assets", ma do la mot ban
// ke chi tiet ban build cho nguoi la doc.
func isFile(fsys fs.FS, rel string) bool {
	if rel == "" || rel == "index.html" || !fs.ValidPath(rel) {
		return false
	}
	st, err := fs.Stat(fsys, rel)
	return err == nil && !st.IsDir()
}

// immutableDir: file nam trong thu muc tai san co bam cua Vite (assets/ mac dinh, app/ cua
// site/apps/haitac) — cache duoc vinh vien.
func immutableDir(p string) bool {
	return strings.HasPrefix(p, "assets/") || strings.HasPrefix(p, "app/")
}

func serveIndex(w http.ResponseWriter, index []byte) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	// index.html tro toi asset co bam; giu ban cu la tro toi file da bien mat.
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	_, _ = w.Write(index)
}

func missing(root string, cause error) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = io.WriteString(w, `<!doctype html><meta charset="utf-8">
<title>Chưa build giao diện</title>
<body style="font:15px system-ui;padding:40px;max-width:56ch">
<h1 style="font-size:20px">Chưa có bản build của giao diện</h1>
<p>Thư mục <code>`+html(root)+`/</code> trống. Chạy <code>npm ci &amp;&amp; npm run build</code>
trong <code>web/</code> rồi build lại image.</p>
<p style="color:#666">`+html(cause.Error())+`</p>`)
	})
}

// html thoat cac ky tu co the pha khung trang bao loi. Chuoi o day den tu ten thu muc
// build va tu loi cua io/fs, nhung trang loi cung khong duoc phep la mot lo hong.
func html(s string) string {
	return strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&#34;").Replace(s)
}
