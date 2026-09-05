package main

import (
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/rickymta/op-h5/platform/internal/capacity"
)

// Cac trang huong nguoi choi cua rieng game nay (haitac.domain.com).
//
// Chung do Adapter phuc vu chu khong phai nginx, vi so lieu tren do la SONG: dai trang
// thai may chu den tu chinh bo dem tai ma cong gioi han dang dung. Dung nginx dung file
// tinh thi trang se hien mot con so, con cong lai quyet dinh theo mot con so khac.

// formatInt chen dau cham phan cach hang nghin: 1234567 -> "1.234.567".
func formatInt(n int64) string {
	neg := n < 0
	if neg {
		n = -n
	}
	s := strconv.FormatInt(n, 10)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte('.')
		}
		b.WriteRune(c)
	}
	if neg {
		return "-" + b.String()
	}
	return b.String()
}

type srvView struct {
	Code      string
	Name      string
	Band      string
	Label     string
	Recommend bool
	OnlineFmt string
}

// visibleServers lay danh sach may chu de hien cho nguoi choi.
// Bo may chu da dong: nguoi choi khong can thay thu ho khong vao duoc.
func (s *adapterServer) visibleServers() []srvView {
	f := s.tracker.Fleet()
	out := make([]srvView, 0, len(f.Servers))
	for _, sv := range f.Servers {
		if sv.Status == capacity.StatusClosed {
			continue
		}
		b := sv.Band()
		out = append(out, srvView{
			Code: sv.SrvCode, Name: sv.Name, Band: b.String(), Label: b.Label(),
			Recommend: sv.AcceptsNew(), OnlineFmt: formatInt(int64(sv.Effective())),
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Code < out[j].Code })
	return out
}

// username tra ve ten dang nhap cua nguoi choi hien tai (rong neu chua dang nhap).
func (s *adapterServer) username(r *http.Request) string {
	uid, ok := s.currentUser(r)
	if !ok {
		return ""
	}
	var name string
	if err := s.db.QueryRowContext(r.Context(),
		`SELECT username FROM users WHERE id = ?`, uid).Scan(&name); err != nil {
		return ""
	}
	return name
}

func (s *adapterServer) render(w http.ResponseWriter, name string, data map[string]any) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := s.tpl.ExecuteTemplate(w, name, data); err != nil {
		s.log.Error("render", "tpl", name, "err", err)
	}
}

// home la trang chu cua game.
func (s *adapterServer) home(w http.ResponseWriter, r *http.Request) {
	servers := s.visibleServers()
	online, _ := s.tracker.Fleet().Utilization()

	// Goi y mot may chu con nhieu cho cho nguoi moi.
	var recommended string
	if d := s.tracker.Fleet().AdmitNew(); d.Allowed {
		for _, sv := range servers {
			if sv.Code == d.SrvCode {
				recommended = sv.Name
				break
			}
		}
	}
	s.render(w, "home.html", map[string]any{
		"User": s.username(r), "Servers": servers, "OpenCount": len(servers),
		"OnlineFmt": formatInt(int64(online)), "Recommended": recommended,
		"IDBase": strings.TrimRight(s.cfg.Issuer, "/"),
	})
}

func (s *adapterServer) serversPage(w http.ResponseWriter, r *http.Request) {
	s.render(w, "servers.html", map[string]any{
		"User": s.username(r), "Servers": s.visibleServers(),
		"IDBase": strings.TrimRight(s.cfg.Issuer, "/"),
	})
}

// Trang cua hang (/cua-hang) nam o store.go.
