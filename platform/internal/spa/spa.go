// Package spa phuc vu mot ung dung React da build (Vite) tu embed.FS.
//
// Vi sao khong dung thang http.FileServer:
//   - SPA dinh tuyen o phia trinh duyet, nen moi duong khong phai file that phai tra
//     index.html chu khong phai 404 — nguoi choi bam F5 o /don-mua se thay trang trang.
//   - Vite dat bam noi dung vao ten file trong assets/ (hoac app/ — apps/game dung
//     assetsDir "app" vi tren host game nginx da danh /assets/ va regex \.(js|css)$ cho
//     client LayaAir) nen chung bat bien; con index.html thi KHONG duoc cache, neu khong
//     nguoi dung giu ban cu tro toi asset da bi xoa sau lan trien khai sau (da dinh that
//     mot lan voi bundle client, xem docs/mac-test-brief).
//   - Duong /api/ khong bao gio duoc roi vao day: no phai 404 JSON chu khong tra HTML,
//     neu khong client se bao mot loi khong lien quan.
package spa

import (
	"errors"
	"io"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

// Handler tra ve http.Handler phuc vu `root` trong fsys.
//
// `dev` = true khi thu muc build chua ton tai (chua chay `npm run build`): thay vi chet
// luc khoi dong, tra ve mot trang giai thich. Adapter/admin van chay duoc de phuc vu API.
func Handler(fsys fs.FS, root string) http.Handler {
	sub, err := fs.Sub(fsys, root)
	if err != nil {
		return missing(err)
	}
	index, err := fs.ReadFile(sub, "index.html")
	if err != nil {
		return missing(err)
	}
	files := http.FileServer(http.FS(sub))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		if p != "" && p != "index.html" {
			if f, err := sub.Open(p); err == nil {
				_ = f.Close()
				// Ten file cua Vite co bam noi dung -> doi noi dung la doi ten.
				if immutableDir(p) {
					w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
				}
				files.ServeHTTP(w, r)
				return
			}
		}
		serveIndex(w, index)
	})
}

// immutableDir: file nam trong thu muc tai san co bam cua Vite (assets/ mac dinh, app/ cua
// apps/game) — cache duoc vinh vien.
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

func missing(cause error) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = io.WriteString(w, `<!doctype html><meta charset="utf-8">
<title>Chưa build giao diện</title>
<body style="font:15px system-ui;padding:40px;max-width:56ch">
<h1 style="font-size:20px">Chưa có bản build của giao diện</h1>
<p>Thư mục <code>dist/</code> trống. Chạy <code>npm ci &amp;&amp; npm run build</code> trong
<code>web/</code> rồi build lại image, hoặc tắt cờ SPA để dùng trang cũ.</p>
<p style="color:#666">`+cause.Error()+`</p>`)
	})
}

// IsMissing cho biet loi den tu viec chua build (de ben goi ghi log mot lan luc khoi dong).
func IsMissing(err error) bool { return errors.Is(err, fs.ErrNotExist) }
