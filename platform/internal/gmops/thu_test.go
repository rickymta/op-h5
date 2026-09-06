package gmops

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/rickymta/op-h5/platform/internal/console"
)

// consoleGia dung mot console gia: dang nhap, tao thu, duyet thu. `tuChoi` la cac roleId
// ma console se tu choi (errorcode=1) — de thu duong "mot nguoi hong, nguoi khac van di".
//
// Giong console that: x/create KHONG tra id (data=null), chi chen phieu; adapter phai doc
// lai x/list (status=1) de tim phieu vua tao roi moi complete duoc.
func consoleGia(t *testing.T, tuChoi map[string]bool) (*console.Client, *int) {
	t.Helper()
	var soThu int
	var choDuyet []console.MailWhole
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/staff/login":
			_, _ = w.Write([]byte(`{"errorcode":0,"errormsg":"","data":"aaa.bbb.ccc"}`))
		case "/gm/mail/x/create":
			var req console.MailCreateReq
			_ = json.NewDecoder(r.Body).Decode(&req)
			if len(req.GmMailTars) == 1 && tuChoi[req.GmMailTars[0].RoleID] {
				_, _ = w.Write([]byte(`{"errorcode":1,"errormsg":"找不到角色"}`))
				return
			}
			soThu++
			choDuyet = append(choDuyet, console.MailWhole{
				GmMailEntity: console.MailEntityRow{
					ID: int64(100 + soThu), Type: req.GmMailEntity.Type, Title: req.GmMailEntity.Title,
					Content: req.GmMailEntity.Content, Reward: req.GmMailEntity.Reward, Status: 1,
					SubmitUsername: "admin",
				},
				GmMailTars: req.GmMailTars,
			})
			_, _ = w.Write([]byte(`{"errorcode":0,"errormsg":"成功","data":null}`))
		case "/gm/mail/x/list":
			// Console that chi nhan GET (POST -> "Request method 'POST' not supported").
			if r.Method != http.MethodGet || r.URL.Query().Get("status") != "1" {
				_, _ = w.Write([]byte(`{"errorcode":1,"errormsg":"Request method 'POST' not supported"}`))
				return
			}
			var out struct {
				Records []console.MailWhole `json:"records"`
				Total   int                 `json:"total"`
			}
			for _, m := range choDuyet {
				if m.GmMailEntity.Status == 1 {
					out.Records = append(out.Records, m)
				}
			}
			out.Total = len(out.Records)
			b, _ := json.Marshal(out)
			_, _ = w.Write([]byte(`{"errorcode":0,"data":` + string(b) + `}`))
		case "/gm/mail/x/complete":
			var req struct {
				ID int64 `json:"id"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)
			for i := range choDuyet {
				if choDuyet[i].GmMailEntity.ID == req.ID {
					choDuyet[i].GmMailEntity.Status = 2
				}
			}
			_, _ = w.Write([]byte(`{"errorcode":0}`))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return console.New(srv.URL, "admin", "x", "y"), &soThu
}

func jsonInt(n int) string { b, _ := json.Marshal(n); return string(b) }

func guiThu(t *testing.T, s *Service, body string) (int, map[string]any) {
	t.Helper()
	rec := httptest.NewRecorder()
	s.Mail(rec, httptest.NewRequest("POST", "/api/mail", strings.NewReader(body)), Actor{ID: 1})
	var out map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return rec.Code, out
}

func TestDauChamVaThayTen(t *testing.T) {
	for n, muon := range map[int64]string{5: "5", 999: "999", 1000: "1.000", 1234567: "1.234.567"} {
		if got := dauCham(n); got != muon {
			t.Errorf("dauCham(%d) = %q, muon %q", n, got, muon)
		}
	}
	if got := thayTen("Chào {ten}, {ten} ơi", "Duyen"); got != "Chào Duyen, Duyen ơi" {
		t.Errorf("thayTen: %q", got)
	}
}

// Nguong: vi theo tung loai tien, mon theo mot moc chung. Duoi nguong thi im lang.
func TestQuaLon(t *testing.T) {
	if lon := quaLon("0:1:100000#3:100022:999"); len(lon) != 0 {
		t.Errorf("dung nguong khong duoc bao: %v", lon)
	}
	lon := quaLon("0:1:100001#3:100022:1000#0:0:1")
	if len(lon) != 2 || !strings.Contains(lon[0], "Kim cương") || !strings.Contains(lon[1], TenMuc(3, 100022)) {
		t.Errorf("quaLon = %v", lon)
	}
}

// Vuot nguong ma chua xac nhan -> 409 needs_confirm, KHONG gui gi. Xac nhan roi thi gui.
func TestMailQuaLonPhaiXacNhan(t *testing.T) {
	c, soThu := consoleGia(t, nil)
	s := &Service{Console: c, GameCode: "haitac"}
	code, out := guiThu(t, s, `{"srv":"s1","role":"r1","role_name":"Duyen","reward":"0:1:500000"}`)
	if code != http.StatusConflict || out["error"] != "needs_confirm" || *soThu != 0 {
		t.Fatalf("vuot nguong: code=%d out=%v thu=%d", code, out, *soThu)
	}
	code, _ = guiThu(t, s, `{"srv":"s1","role":"r1","role_name":"Duyen","reward":"0:1:500000","confirm_large":true}`)
	if code != http.StatusOK || *soThu != 1 {
		t.Fatalf("da xac nhan: code=%d thu=%d", code, *soThu)
	}
}

// Do dai dem theo KY TU: 700 chu tieng Viet (~1.300 byte) phai duoc nhan.
func TestMailDemKyTuKhongDemByte(t *testing.T) {
	c, _ := consoleGia(t, nil)
	s := &Service{Console: c}
	noiDung := strings.Repeat("ấ", 700)
	body, _ := json.Marshal(map[string]any{"srv": "s1", "role": "r1", "role_name": "D", "reward": "0:1:1", "content": noiDung})
	if code, out := guiThu(t, s, string(body)); code != http.StatusOK {
		t.Fatalf("700 ky tu bi tu choi: %d %v", code, out)
	}
	body, _ = json.Marshal(map[string]any{"srv": "s1", "role": "r1", "reward": "0:1:1", "content": strings.Repeat("a", 1001)})
	if code, _ := guiThu(t, s, string(body)); code != http.StatusBadRequest {
		t.Fatalf("1001 ky tu phai bi tu choi, duoc %d", code)
	}
}

// Nhieu nguoi: moi nguoi mot ket qua, {ten} dien theo tung nguoi, trung nguoi thi chan.
func TestMailNhieuNguoi(t *testing.T) {
	c, soThu := consoleGia(t, map[string]bool{"r2": true})
	s := &Service{Console: c}
	code, out := guiThu(t, s, `{"recipients":[{"srv":"s1","role":"r1","role_name":"A"},{"srv":"s1","role":"r2","role_name":"B"},{"srv":"s1","role":"r3","role_name":"C"}],"title":"Chào {ten}","reward":"0:1:10"}`)
	if code != http.StatusOK {
		t.Fatalf("code=%d out=%v", code, out)
	}
	if out["sent"] != float64(2) || out["failed"] != float64(1) || *soThu != 2 {
		t.Fatalf("sent/failed sai: %v (thu=%d)", out, *soThu)
	}
	ket := out["results"].([]any)
	if len(ket) != 3 || ket[1].(map[string]any)["error"] != "console_rejected" || ket[2].(map[string]any)["ok"] != true {
		t.Fatalf("results: %v", ket)
	}

	code, out = guiThu(t, s, `{"recipients":[{"srv":"s1","role":"r1"},{"srv":"s1","role":"r1"}],"reward":"0:1:10"}`)
	if code != http.StatusBadRequest || out["error"] != "duplicate_recipient" {
		t.Fatalf("trung nguoi nhan phai bi chan: %d %v", code, out)
	}
}

// Console CHET giua chung: nguoi con lai danh dau "skipped" de gui lai, khong goi tiep.
func TestMailConsoleChetThiDung(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/staff/login" {
			_, _ = w.Write([]byte(`{"errorcode":0,"data":"aaa.bbb.ccc"}`))
			return
		}
		http.Error(w, "boom", http.StatusBadGateway)
	}))
	defer srv.Close()
	s := &Service{Console: console.New(srv.URL, "a", "b", "c")}
	code, out := guiThu(t, s, `{"recipients":[{"srv":"s1","role":"r1"},{"srv":"s1","role":"r2"}],"reward":"0:1:10"}`)
	if code != http.StatusOK || out["failed"] != float64(1) || out["skipped"] != float64(1) {
		t.Fatalf("console chet: %d %v", code, out)
	}
	// Mot nguoi thi giu cach bao loi cu: 502 console_unavailable.
	code, out = guiThu(t, s, `{"srv":"s1","role":"r1","reward":"0:1:10"}`)
	if code != http.StatusBadGateway || out["error"] != "console_unavailable" {
		t.Fatalf("mot nguoi + console chet: %d %v", code, out)
	}
}
