// Package gameacct noi chuyen voi login server cua game (JAR khong co ma nguon)
// va anh xa nguoi dung cua he thong ID sang tai khoan trong game.
package gameacct

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// ecResult la khuon phan hoi chung cua moi endpoint: {errorcode, errormsg, data}.
// errorcode == 0 la thanh cong (xac minh trong bytecode: EcResult.ok()).
type ecResult struct {
	ErrorCode *int            `json:"errorcode"`
	ErrorMsg  string          `json:"errormsg"`
	Data      json.RawMessage `json:"data"`
}

func (e ecResult) ok() bool { return e.ErrorCode != nil && *e.ErrorCode == 0 }

// Host la bo ba dia chi ma login server tra ve.
type Host struct {
	LAN    string `json:"LAN"`
	WAN    string `json:"WAN"`
	Domain string `json:"domain"`
}

// NetProcess la dia chi mot tien tri game.
type NetProcess struct {
	Scheme string `json:"scheme"`
	Host   Host   `json:"host"`
	Port   *int   `json:"port"`
	SSL    *bool  `json:"ssl"`
}

// WebSocketURL dung URL WebSocket ma client se ket noi toi.
// publicHost ghi de phan host vi client chay o trinh duyet nguoi choi, khong phai
// trong mang noi bo — LAN tra ve tu login server la 127.0.0.1.
func (n NetProcess) WebSocketURL(publicHost string, tls bool) string {
	scheme := "ws"
	if tls || (n.SSL != nil && *n.SSL) {
		scheme = "wss"
	}
	host := publicHost
	if host == "" {
		host = n.Host.WAN
		if host == "" {
			host = n.Host.LAN
		}
	}
	if n.Port != nil {
		return fmt.Sprintf("%s://%s:%d", scheme, host, *n.Port)
	}
	return fmt.Sprintf("%s://%s", scheme, host)
}

// SrvGameVO la mot dong trong danh sach server ma login server cong bo.
// Cac truong khop chinh xac voi tcg/login/bo/SrvGameVO trong bytecode.
type SrvGameVO struct {
	Code       string `json:"code"`
	Name       string `json:"name"`
	Status     int    `json:"status"`
	Recommend  bool   `json:"recommend"`
	Index      int    `json:"index"`
	OnlineNum  int    `json:"onlineNum"`
	RoleNum    int    `json:"roleNum"`
	RoleNumMax int    `json:"roleNumMax"`
}

// AccountEntity la ban ghi tai khoan trong tcg.account.
type AccountEntity struct {
	UID          string `json:"uid"`
	Username     string `json:"username"`
	Nickname     string `json:"nickname"`
	OpenID       string `json:"openId"`
	PlatformCode string `json:"platformCode"`
}

// AccountSession la ket qua dang nhap: token de client dua cho tien trinh game.
type AccountSession struct {
	Account    AccountEntity `json:"account"`
	GameID     string        `json:"gameId"`
	ClientType int           `json:"clientType"`
	Token      string        `json:"token"`
}

// LoginClient goi login server qua HTTP.
type LoginClient struct {
	BaseURL string
	Secret  string // tcg.secret, dung chung moi service Java
	HTTP    *http.Client
}

func NewLoginClient(baseURL, secret string) *LoginClient {
	return &LoginClient{
		BaseURL: strings.TrimRight(baseURL, "/"),
		Secret:  secret,
		HTTP:    &http.Client{Timeout: 10 * time.Second},
	}
}

// postForm gui form va giai ma khuon EcResult.
func (c *LoginClient) postForm(ctx context.Context, path string, form url.Values, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+path,
		strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return c.do(req, out)
}

func (c *LoginClient) get(ctx context.Context, path string, q url.Values, out any) error {
	u := c.BaseURL + path
	if len(q) > 0 {
		u += "?" + q.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	return c.do(req, out)
}

func (c *LoginClient) do(req *http.Request, out any) error {
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return fmt.Errorf("goi login server: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("login server tra HTTP %d: %.200s", resp.StatusCode, body)
	}
	var res ecResult
	if err := json.Unmarshal(body, &res); err != nil {
		return fmt.Errorf("phan hoi khong phai JSON EcResult: %.200s", body)
	}
	if !res.ok() {
		code := -1
		if res.ErrorCode != nil {
			code = *res.ErrorCode
		}
		return fmt.Errorf("login server tu choi (errorcode=%d): %s", code, res.ErrorMsg)
	}
	if out != nil && len(res.Data) > 0 && string(res.Data) != "null" {
		if err := json.Unmarshal(res.Data, out); err != nil {
			return fmt.Errorf("giai ma data: %w", err)
		}
	}
	return nil
}

// Exist kiem tra mot username da ton tai trong tcg.account chua.
func (c *LoginClient) Exist(ctx context.Context, username string) (bool, error) {
	var exists bool
	err := c.get(ctx, "/account/exist", url.Values{"username": {username}}, &exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

// RegisterInput la tham so dang ky, khop AccountRegisterVO trong bytecode.
type RegisterInput struct {
	Username     string
	Password     string
	Nickname     string
	PlatformCode string
	ChannelCode  string
}

// Register tao tai khoan trong tcg.account.
//
// Mat khau o day KHONG phai mat khau cua nguoi choi: no la khoa ngau nhien do Adapter
// sinh va giu. Nguoi choi khong bao gio biet no, va no khong bao gio roi khoi Adapter.
func (c *LoginClient) Register(ctx context.Context, in RegisterInput) error {
	return c.postForm(ctx, "/account/register", url.Values{
		"username":     {in.Username},
		"password":     {in.Password},
		"nickname":     {in.Nickname},
		"platformCode": {in.PlatformCode},
		"channelCode":  {in.ChannelCode},
		"secret":       {c.Secret},
	}, nil)
}

// LoginInput la tham so dang nhap, khop AccountLoginVO.
type LoginInput struct {
	Username     string
	Password     string
	OpenID       string
	GameID       string
	ClientType   int
	PlatformCode string
	ChannelCode  string
}

// Login doi khoa cua Adapter lay AccountSession.token cho client.
func (c *LoginClient) Login(ctx context.Context, in LoginInput) (*AccountSession, error) {
	var sess AccountSession
	err := c.postForm(ctx, "/account/login", url.Values{
		"username":     {in.Username},
		"password":     {in.Password},
		"openId":       {in.OpenID},
		"gameId":       {in.GameID},
		"clientType":   {fmt.Sprint(in.ClientType)},
		"platformCode": {in.PlatformCode},
		"channelCode":  {in.ChannelCode},
		"timestamp":    {fmt.Sprint(time.Now().UnixMilli())},
	}, &sess)
	if err != nil {
		return nil, err
	}
	return &sess, nil
}

// SrvGameList doc danh sach server kem onlineNum. Day la nguon so lieu tai cua cong
// gioi han — no den tu heartbeat cua tung game server nen luon tre mot nhip.
func (c *LoginClient) SrvGameList(ctx context.Context) ([]SrvGameVO, error) {
	var list []SrvGameVO
	if err := c.get(ctx, "/srv/game/list", nil, &list); err != nil {
		return nil, err
	}
	return list, nil
}

// ConnectTarget hoi login server dia chi tien trinh game cua mot server.
//
// Day chinh la endpoint ma cong gioi han dat truoc: login server tra ve dia chi ma
// khong he kiem tra tai (da xac minh trong bytecode), nen Adapter phai quyet dinh
// TRUOC khi goi den day.
func (c *LoginClient) ConnectTarget(ctx context.Context, srvCode string) (*NetProcess, error) {
	var np NetProcess
	if err := c.get(ctx, "/srv/game/connect/target", url.Values{"srvCode": {srvCode}}, &np); err != nil {
		return nil, err
	}
	return &np, nil
}

// Ping kiem tra login server con song (dung cho healthcheck).
func (c *LoginClient) Ping(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"/", nil)
	if err != nil {
		return err
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
	if resp.StatusCode >= 500 {
		return fmt.Errorf("login server HTTP %d", resp.StatusCode)
	}
	return nil
}
