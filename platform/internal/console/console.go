// Package console noi chuyen voi console server cua game (cong 9999).
//
// Console la be mat dieu khien duy nhat cua he thong game: phat vat pham, gui thu,
// bat/tat server. Cac khuon du lieu duoi day doc tu bytecode cua tcg-console-server
// (GmPayController, PayRecord, PayApproval, StaffLoginVO), khong phai doan.
package console

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// ecResult la khuon phan hoi chung: errorcode == 0 la thanh cong.
type ecResult struct {
	ErrorCode *int            `json:"errorcode"`
	ErrorMsg  string          `json:"errormsg"`
	Data      json.RawMessage `json:"data"`
}

func (e ecResult) ok() bool { return e.ErrorCode != nil && *e.ErrorCode == 0 }

// ErrUnauthorized bao token het han de ben goi dang nhap lai.
var ErrUnauthorized = errors.New("console tu choi: chua dang nhap hoac token het han")

// PayRecord khop tcg.pay.bo.PayRecord. Chi khai bao cac truong ta thuc su gui;
// cac truong con lai console tu dat mac dinh.
type PayRecord struct {
	UID             string  `json:"uid,omitempty"`
	OrderType       int     `json:"orderType"`
	PlatformOrderID string  `json:"platformOrderId"`
	ItemTid         int     `json:"itemTid"`
	ItemCount       int     `json:"itemCount"`
	ItemName        string  `json:"itemName"`
	PayAmount       float64 `json:"payAmount"`
	SrvCode         string  `json:"srvCode"`
	PlatformCode    string  `json:"platformCode"`
	ChannelCode     string  `json:"channelCode"`
	GameID          string  `json:"gameId,omitempty"`
	PlatformOpenID  string  `json:"platformOpenId,omitempty"`
	AccountUID      string  `json:"accountUid"`
	MasterIDHex     string  `json:"masterIdHex,omitempty"`
	MasterName      string  `json:"masterName,omitempty"`
	CurrencyCode    string  `json:"currencyCode,omitempty"`
	Note            string  `json:"note,omitempty"`
}

// PayApproval khop tcg.game.gm.pay.PayApproval.
type PayApproval struct {
	ID              int     `json:"id"`
	OrderType       int     `json:"orderType"`
	Status          int     `json:"status"`
	PlatformOrderID string  `json:"platformOrderId"`
	ItemTid         int     `json:"itemTid"`
	ItemCount       int     `json:"itemCount"`
	ItemName        string  `json:"itemName"`
	PayAmount       float64 `json:"payAmount"`
	SrvCode         string  `json:"srvCode"`
	PlatformCode    string  `json:"platformCode"`
	ChannelCode     string  `json:"channelCode"`
	AccountUID      string  `json:"accountUid"`
	MasterIDHex     string  `json:"masterIdHex,omitempty"`
	MasterName      string  `json:"masterName,omitempty"`
}

// Trang thai cua PayApproval (hang so trong bytecode).
const (
	ApprovalSubmit = 0
	ApprovalAccept = 1
	ApprovalRefuse = 2
)

// Client goi console, tu quan ly token dang nhap.
type Client struct {
	BaseURL  string
	Username string
	Password string
	Secret   string // tcg.secret
	HTTP     *http.Client

	mu    sync.Mutex
	token string
}

func New(baseURL, username, password, secret string) *Client {
	return &Client{
		BaseURL:  strings.TrimRight(baseURL, "/"),
		Username: username, Password: password, Secret: secret,
		HTTP: &http.Client{Timeout: 15 * time.Second},
	}
}

// login lay token moi va nho lai.
func (c *Client) login(ctx context.Context) (string, error) {
	body, err := json.Marshal(map[string]string{
		"username": c.Username, "password": c.Password, "secret": c.Secret,
	})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/staff/login",
		strings.NewReader(string(body)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	var token string
	if err := c.do(req, &token); err != nil {
		return "", fmt.Errorf("dang nhap console: %w", err)
	}
	if token == "" {
		return "", errors.New("console tra token rong")
	}
	c.mu.Lock()
	c.token = token
	c.mu.Unlock()
	return token, nil
}

func (c *Client) cached() string {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.token
}

// callAuthed goi mot endpoint can dang nhap, tu dang nhap lai dung MOT lan neu token
// het han. Khong lap vo han: token sai hai lan lien la loi cau hinh chu khong phai het han.
func (c *Client) callAuthed(ctx context.Context, path string, payload, out any) error {
	token := c.cached()
	if token == "" {
		var err error
		if token, err = c.login(ctx); err != nil {
			return err
		}
	}
	err := c.post(ctx, path, token, payload, out)
	if errors.Is(err, ErrUnauthorized) {
		c.mu.Lock()
		c.token = ""
		c.mu.Unlock()
		token, lerr := c.login(ctx)
		if lerr != nil {
			return lerr
		}
		return c.post(ctx, path, token, payload, out)
	}
	return err
}

func (c *Client) post(ctx context.Context, path, token string, payload, out any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+path,
		strings.NewReader(string(body)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Login-Token", token)
	return c.do(req, out)
}

func (c *Client) do(req *http.Request, out any) error {
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return fmt.Errorf("goi console: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return ErrUnauthorized
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("console tra HTTP %d: %.200s", resp.StatusCode, raw)
	}
	var res ecResult
	if err := json.Unmarshal(raw, &res); err != nil {
		return fmt.Errorf("phan hoi khong phai JSON EcResult: %.200s", raw)
	}
	if !res.ok() {
		code := -1
		if res.ErrorCode != nil {
			code = *res.ErrorCode
		}
		// Console dung errorcode 1 kem thong bao "請先登錄"/"请先登录" khi chua dang nhap.
		if strings.Contains(res.ErrorMsg, "登录") || strings.Contains(res.ErrorMsg, "登錄") {
			return ErrUnauthorized
		}
		return fmt.Errorf("console tu choi (errorcode=%d): %s", code, res.ErrorMsg)
	}
	if out != nil && len(res.Data) > 0 && string(res.Data) != "null" {
		if err := json.Unmarshal(res.Data, out); err != nil {
			return fmt.Errorf("giai ma data: %w", err)
		}
	}
	return nil
}

// PayManual phat vat pham thang, mot lan goi.
//
// Dung duong nay thay vi createApproval + completeApproval vi tien da duoc tru o he
// thong ID roi: khong con gi de duyet, chi con viec giao hang. Duong hai buoc van giu
// lai duoi day cho truong hop can quy trinh duyet.
func (c *Client) PayManual(ctx context.Context, rec PayRecord) error {
	return c.callAuthed(ctx, "/gm/pay/manual", rec, nil)
}

// PayCreateApproval tao mot phieu cho duyet.
func (c *Client) PayCreateApproval(ctx context.Context, rec PayRecord) error {
	return c.callAuthed(ctx, "/gm/pay/createApproval", rec, nil)
}

// PayCompleteApproval duyet va phat hang.
func (c *Client) PayCompleteApproval(ctx context.Context, ap PayApproval) error {
	return c.callAuthed(ctx, "/gm/pay/completeApproval", ap, nil)
}

// Ping kiem tra console con song.
func (c *Client) Ping(ctx context.Context) error {
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
		return fmt.Errorf("console HTTP %d", resp.StatusCode)
	}
	return nil
}
