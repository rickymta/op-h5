// Lenh fakelogin la ban gia lap login server cua game, DUNG CHO PHAT TRIEN.
//
// No noi dung giao thuc that: khuon {errorcode, errormsg, data} voi errorcode == 0 la
// thanh cong, va cac endpoint /account/exist, /account/register, /account/login,
// /srv/game/list, /srv/game/connect/target. Cac khuon nay trich tu bytecode cua
// tcg-login-server (EcResult, AccountRegisterVO, AccountLoginVO, AccountSession,
// SrvGameVO, NetProcess), khong phai doan.
//
// Muc dich: chay va thu Adapter ma khong can dung ca cum Java + MongoDB + dump DB.
// KHONG dung o moi truong that.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
)

type ecResult struct {
	ErrorCode int    `json:"errorcode"`
	ErrorMsg  string `json:"errormsg"`
	Data      any    `json:"data"`
}

func ok(w http.ResponseWriter, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(ecResult{ErrorCode: 0, ErrorMsg: "success", Data: data})
}

func fail(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(ecResult{ErrorCode: code, ErrorMsg: msg})
}

type account struct {
	UID      string
	Username string
	Password string
	// Masters: nhan vat cua tai khoan, moi may chu mot dong. Them qua
	// /_test/master/add de thu nhanh "nguoi choi cu" cua Adapter.
	Masters []master `json:",omitempty"`
}

// master la mot dong trong masterList.
//
// Bon ten truong nay DO TREN CLIENT THAT: boc moi dong trong mot Proxy roi xem client
// cham vao khoa nao. Dat sai ten thi client van chay nhung hien "undefined(undefinedCap)"
// o cho ten nhan vat — hong am tham, dung kieu ma ban gia lap sinh ra de tranh.
type master struct {
	SrvCode     string `json:"srvCode"`
	MasterIDHex string `json:"masterIdHex"`
	MasterName  string `json:"masterName"`
	MasterLevel int    `json:"masterLevel"`
}

type srv struct {
	Code      string `json:"code"`
	Name      string `json:"name"`
	Status    int    `json:"status"`
	Recommend bool   `json:"recommend"`
	Index     int    `json:"index"`
	OnlineNum int    `json:"onlineNum"`
	RoleNum   int    `json:"roleNum"`
	Max       int    `json:"roleNumMax"`
	WsPort    int    `json:"-"`
}

type state struct {
	mu       sync.Mutex
	accounts map[string]*account
	servers  map[string]*srv
	nextUID  int
	// storePath: noi luu tai khoan giua cac lan chay. Rong = chi giu trong bo nho.
	storePath string
}

// Luu tai khoan ra dia, va nap lai luc khoi dong.
//
// Login server that luu tai khoan o MySQL `tcg.account` nen chung ton tai qua moi lan
// restart. Ban gia lap giu trong bo nho, va hau qua khong hien nhien: restart xong,
// Adapter van con `game_identities.game_secret` da luu nhung tai khoan tuong ung da bien
// mat, nen login tra ve `K_PASSWORD_ERROR` — thong bao tro vao mat khau chu khong phai
// vao nguyen nhan that. Da lam mat thoi gian nhieu lan truoc khi co cho nay.
type persisted struct {
	NextUID  int                 `json:"nextUID"`
	Accounts map[string]*account `json:"accounts"`
}

func (s *state) load() {
	if s.storePath == "" {
		return
	}
	b, err := os.ReadFile(s.storePath)
	if err != nil {
		if !os.IsNotExist(err) {
			log.Printf("khong doc duoc %s: %v (bat dau voi kho rong)", s.storePath, err)
		}
		return
	}
	var p persisted
	if err := json.Unmarshal(b, &p); err != nil {
		log.Printf("%s hong: %v (bat dau voi kho rong)", s.storePath, err)
		return
	}
	if p.Accounts != nil {
		s.accounts = p.Accounts
	}
	if p.NextUID > s.nextUID {
		s.nextUID = p.NextUID
	}
	log.Printf("da nap %d tai khoan tu %s", len(s.accounts), s.storePath)
}

// saveLocked ghi kho tai khoan. Ben goi PHAI dang giu khoa.
func (s *state) saveLocked() {
	if s.storePath == "" {
		return
	}
	b, err := json.Marshal(persisted{NextUID: s.nextUID, Accounts: s.accounts})
	if err != nil {
		log.Printf("khong dong goi duoc kho tai khoan: %v", err)
		return
	}
	// Ghi ra file tam roi doi ten: tat giua chung khong de lai file JSON cut doi.
	tmp := s.storePath + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		log.Printf("khong ghi duoc %s: %v", tmp, err)
		return
	}
	if err := os.Rename(tmp, s.storePath); err != nil {
		log.Printf("khong doi ten duoc %s: %v", tmp, err)
	}
}

func main() {
	addr := flag.String("addr", ":9000", "dia chi lang nghe (login server)")
	consoleAddr := flag.String("console-addr", "", "neu dat, mo them mot console gia o dia chi nay")
	consoleUser := flag.String("console-user", "gm", "tai khoan console gia")
	consolePass := flag.String("console-pass", "gm", "mat khau console gia")
	failFirst := flag.Int("fail-first", 0, "so lan dau tien /gm/pay/manual co y tra loi (de thu co che thu lai)")
	secret := flag.String("secret", "", "tcg.secret bat buoc khi dang ky")
	srvSpec := flag.String("servers", "s1:8001:0,s2:8002:0", "danh sach code:wsPort:online")
	store := flag.String("store", "", "file luu tai khoan giua cac lan chay (rong = chi trong bo nho)")
	flag.Parse()

	st := &state{accounts: map[string]*account{}, servers: map[string]*srv{}, nextUID: 1000, storePath: *store}
	st.load()
	for i, spec := range strings.Split(*srvSpec, ",") {
		p := strings.Split(spec, ":")
		if len(p) != 3 {
			log.Fatalf("dinh dang server sai: %q (can code:wsPort:online)", spec)
		}
		port, _ := strconv.Atoi(p[1])
		online, _ := strconv.Atoi(p[2])
		st.servers[p[0]] = &srv{
			Code: p[0], Name: strings.ToUpper(p[0]), Status: 1, Recommend: true,
			Index: i + 1, OnlineNum: online, RoleNum: online, Max: 5000, WsPort: port,
		}
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprint(w, "<html><body>fake login server</body></html>")
	})

	mux.HandleFunc("/account/exist", func(w http.ResponseWriter, r *http.Request) {
		st.mu.Lock()
		defer st.mu.Unlock()
		_, exists := st.accounts[r.URL.Query().Get("username")]
		ok(w, exists)
	})

	mux.HandleFunc("/account/register", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		if *secret != "" && r.FormValue("secret") != *secret {
			fail(w, 403, "secret khong dung")
			return
		}
		u := r.FormValue("username")
		st.mu.Lock()
		defer st.mu.Unlock()
		if _, dup := st.accounts[u]; dup {
			fail(w, 1, "tai khoan da ton tai")
			return
		}
		st.nextUID++
		st.accounts[u] = &account{
			UID: fmt.Sprintf("uid%d", st.nextUID), Username: u, Password: r.FormValue("password"),
		}
		st.saveLocked()
		ok(w, nil)
	})

	mux.HandleFunc("/account/login", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		u, p := r.FormValue("username"), r.FormValue("password")
		st.mu.Lock()
		defer st.mu.Unlock()
		acc, exists := st.accounts[u]
		if !exists || acc.Password != p {
			fail(w, 2, "K_PASSWORD_ERROR")
			return
		}
		ok(w, map[string]any{
			"account": map[string]any{
				"uid": acc.UID, "username": acc.Username,
				"openId": r.FormValue("openId"), "platformCode": r.FormValue("platformCode"),
			},
			"gameId":     r.FormValue("gameId"),
			"clientType": 0,
			"token":      "tok-" + acc.UID,
			// masterList = nhan vat cua tai khoan (tcg.account_master), moi server mot dong.
			// BAT BUOC co, ke ca khi rong: client doc dung ba truong token/account/masterList
			// tu phan hoi nay (do bang Proxy tren client that). Thieu no thi client dang nhap
			// xong nhung dung o man hinh trang — khong bao loi, vi no chi khong biet nen hien
			// danh sach server hay vao thang nhan vat cu.
			"masterList": mastersOf(acc),
		})
	})

	mux.HandleFunc("/srv/game/list", func(w http.ResponseWriter, r *http.Request) {
		st.mu.Lock()
		defer st.mu.Unlock()
		out := make([]*srv, 0, len(st.servers))
		for _, s := range st.servers {
			out = append(out, s)
		}
		ok(w, out)
	})

	mux.HandleFunc("/srv/game/connect/target", func(w http.ResponseWriter, r *http.Request) {
		st.mu.Lock()
		defer st.mu.Unlock()
		s, exists := st.servers[r.URL.Query().Get("srvCode")]
		if !exists {
			fail(w, 3, "khong tim thay server")
			return
		}
		port := s.WsPort
		ok(w, map[string]any{
			"scheme": "ws",
			"host":   map[string]string{"LAN": "127.0.0.1", "WAN": "127.0.0.1", "domain": ""},
			"port":   port, "ssl": false, "enabled": true,
		})
	})

	// Cong cu chi co o ban gia: dat onlineNum de thu cong gioi han tai.
	mux.HandleFunc("/_test/online", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("srv")
		n, _ := strconv.Atoi(r.URL.Query().Get("n"))
		st.mu.Lock()
		defer st.mu.Unlock()
		s, exists := st.servers[code]
		if !exists {
			fail(w, 3, "khong tim thay server")
			return
		}
		s.OnlineNum = n
		ok(w, n)
	})

	// Cong cu thu: gan nhan vat cho mot tai khoan, de dien lai canh "nguoi choi cu"
	// (Adapter phai xet dai nguoi CU cho dung may chu do thay vi dai nguoi MOI).
	//   curl -X POST ':9000/_test/master/add?username=id000000001&srvCode=s1&masterName=Ten&level=30'
	mux.HandleFunc("/_test/master/add", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		st.mu.Lock()
		defer st.mu.Unlock()
		acc, exists := st.accounts[q.Get("username")]
		if !exists {
			fail(w, 3, "khong co tai khoan nay")
			return
		}
		lv := 1
		if n, err := strconv.Atoi(q.Get("level")); err == nil && n > 0 {
			lv = n
		}
		acc.Masters = append(acc.Masters, master{
			SrvCode: q.Get("srvCode"), MasterIDHex: q.Get("masterIdHex"),
			MasterName: q.Get("masterName"), MasterLevel: lv,
		})
		st.saveLocked()
		ok(w, acc.Masters)
	})

	if *consoleAddr != "" {
		go serveFakeConsole(*consoleAddr, *consoleUser, *consolePass, *failFirst)
	}

	log.Printf("fake login server tren %s, %d server", *addr, len(st.servers))
	if err := http.ListenAndServe(*addr, allowCORS(mux)); err != nil {
		log.Print(err)
		os.Exit(1)
	}
}

// consoleState ghi lai nhung gi da duoc phat, de test doi chieu.
type consoleState struct {
	mu        sync.Mutex
	token     string
	delivered []map[string]any
	failLeft  int
	// seen chong phat trung theo platformOrderId, giong mot console that nen lam.
	seen map[string]bool
}

// serveFakeConsole mo mot console gia noi dung giao thuc that:
// POST /staff/login -> token, roi POST /gm/pay/manual voi header Login-Token.
func serveFakeConsole(addr, user, pass string, failFirst int) {
	cs := &consoleState{token: "console-token-abc", failLeft: failFirst, seen: map[string]bool{}}
	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		_, _ = fmt.Fprint(w, "<html><body>fake console</body></html>")
	})

	mux.HandleFunc("/staff/login", func(w http.ResponseWriter, r *http.Request) {
		var in struct{ Username, Password, Secret string }
		_ = json.NewDecoder(r.Body).Decode(&in)
		if in.Username != user || in.Password != pass {
			fail(w, 1, "tai khoan hoac mat khau khong dung")
			return
		}
		ok(w, cs.token)
	})

	mux.HandleFunc("/gm/pay/manual", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Login-Token") != cs.token {
			fail(w, 1, "请先登录")
			return
		}
		var rec map[string]any
		if err := json.NewDecoder(r.Body).Decode(&rec); err != nil {
			fail(w, 1, "body khong doc duoc")
			return
		}
		cs.mu.Lock()
		defer cs.mu.Unlock()
		if cs.failLeft > 0 {
			cs.failLeft--
			fail(w, 500, "console gia co y that bai de thu co che thu lai")
			return
		}
		orderID, _ := rec["platformOrderId"].(string)
		if cs.seen[orderID] {
			// Console that chong trung theo ma don; ta mo phong dung nhu vay.
			ok(w, nil)
			return
		}
		cs.seen[orderID] = true
		cs.delivered = append(cs.delivered, rec)
		ok(w, nil)
	})

	// Chi co o ban gia: doc lai nhung gi da phat de test doi chieu.
	mux.HandleFunc("/_test/delivered", func(w http.ResponseWriter, r *http.Request) {
		cs.mu.Lock()
		defer cs.mu.Unlock()
		ok(w, cs.delivered)
	})

	log.Printf("fake console tren %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Print(err)
	}
}

// allowCORS mo CORS cho moi origin.
//
// Client H5 chay o http://<host>:80 nhung goi thang login server o :9000, tuc la
// cross-origin. Login server that co header nay (khong thi ban production da khong
// chay duoc); ban gia lap nay phai co theo, neu khong trinh duyet chan
// /srv/game/list va client dung o "Nhan danh sach may chu that bai".
//
// `*` chi chap nhan duoc vi day la cong cu dev cuc bo — xem ghi chu dau file.
func allowCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// mastersOf luon tra ve mot mang (khong bao gio nil).
//
// nil se thanh `null` trong JSON, ma client doc `masterList` roi lay `.length` — mot
// truong null lam client dung o man hinh trang thay vi hien danh sach may chu.
func mastersOf(a *account) []master {
	if a == nil || a.Masters == nil {
		return []master{}
	}
	return a.Masters
}
