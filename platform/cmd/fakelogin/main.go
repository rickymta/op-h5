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
}

func main() {
	addr := flag.String("addr", ":9000", "dia chi lang nghe")
	secret := flag.String("secret", "", "tcg.secret bat buoc khi dang ky")
	srvSpec := flag.String("servers", "s1:8001:0,s2:8002:0", "danh sach code:wsPort:online")
	flag.Parse()

	st := &state{accounts: map[string]*account{}, servers: map[string]*srv{}, nextUID: 1000}
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

	log.Printf("fake login server tren %s, %d server", *addr, len(st.servers))
	if err := http.ListenAndServe(*addr, mux); err != nil {
		log.Print(err)
		os.Exit(1)
	}
}
