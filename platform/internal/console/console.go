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
	"net/url"
	"regexp"
	"strconv"
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
	BaseURL string
	// StatBaseURL la dich vu statistic (:7788) — noi duy nhat tra cuu duoc roleId tu ten
	// nhan vat. De trong thi dung 127.0.0.1:7788.
	StatBaseURL string
	Username    string
	Password    string
	Secret      string // tcg.secret
	HTTP        *http.Client

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

	token, err := c.doLogin(req)
	if err != nil {
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

// getAuthed goi mot endpoint GET can dang nhap. Console nhan tham so qua query string o
// nhom /role/* (khac nhom /gm/* nhan JSON) — day la khuon ma gmhanglong/gm/api.php dung
// va da chay nhieu nam, khong phai phong doan.
func (c *Client) getAuthed(ctx context.Context, base, path string, q url.Values, out any) error {
	do := func(token string) error {
		u := strings.TrimRight(base, "/") + path
		if len(q) > 0 {
			u += "?" + q.Encode()
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
		if err != nil {
			return err
		}
		req.Header.Set("Login-Token", token)
		return c.do(req, out)
	}
	token := c.cached()
	if token == "" {
		var err error
		if token, err = c.login(ctx); err != nil {
			return err
		}
	}
	err := do(token)
	if errors.Is(err, ErrUnauthorized) {
		c.mu.Lock()
		c.token = ""
		c.mu.Unlock()
		token, lerr := c.login(ctx)
		if lerr != nil {
			return lerr
		}
		return do(token)
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

// jwtDang nhan dien mot chuoi JWT tran: ba doan base64url ngan cach bang dau cham.
var jwtDang = regexp.MustCompile(`^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$`)

// doLogin goi /staff/login va chap nhan CA HAI dang phan hoi.
//
// Console tra ve token theo hai kieu tuy ban: boc trong EcResult (`{"errorcode":0,
// "data":"<jwt>"}`) hoac TRA THANG chuoi JWT lam toan bo than phan hoi. Ban dang chay tra
// kieu thu hai, nen `do()` — von bat buoc EcResult — bao "phan hoi khong phai JSON
// EcResult" va Adapter khong bao gio dang nhap duoc. Hau qua khong chi la tra nhan vat
// hong (502) ma con la HANG KHONG PHAT DUOC cho don da tru tien.
//
// KHONG dua than phan hoi vao thong bao loi: no chinh la token, va payload cua token co
// ca hash mat khau tai khoan quan tri — thong bao loi se roi vao nhat ky.
func (c *Client) doLogin(req *http.Request) (string, error) {
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return "", fmt.Errorf("goi console: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return "", ErrUnauthorized
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("console tra HTTP %d", resp.StatusCode)
	}

	than := strings.TrimSpace(string(raw))

	// Kieu 1: EcResult.
	var res ecResult
	if json.Unmarshal(raw, &res) == nil && res.ErrorCode != nil {
		if !res.ok() {
			return "", &RejectedError{Code: *res.ErrorCode, Msg: res.ErrorMsg}
		}
		var token string
		if len(res.Data) > 0 && string(res.Data) != "null" {
			if err := json.Unmarshal(res.Data, &token); err != nil {
				return "", fmt.Errorf("giai ma token: %w", err)
			}
		}
		return token, nil
	}

	// Kieu 2: JWT tran, co the co hoac khong co dau nhay bao quanh.
	than = strings.Trim(than, `"`)
	if jwtDang.MatchString(than) {
		return than, nil
	}
	return "", fmt.Errorf("phan hoi /staff/login khong nhan dang duoc (%d byte)", len(raw))
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
		return &RejectedError{Code: code, Msg: res.ErrorMsg}
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

// RejectedError la loi NGHIEP VU tu console (errorcode != 0): het luot mua, chua toi ngay,
// nhan vat khong ton tai... Khac loi mang o cho thu lai vo ich — ben goi nen dung ngay
// va hoan Xu thay vi cho backoff toi 30 phut roi thu tiep.
type RejectedError struct {
	Code int
	Msg  string
}

func (e *RejectedError) Error() string {
	return fmt.Sprintf("console tu choi (errorcode=%d): %s", e.Code, e.Msg)
}

// IsRejected cho biet loi co phai console tu choi (khong phai mat ket noi) khong.
func IsRejected(err error) bool {
	var r *RejectedError
	return errors.As(err, &r)
}

// ---------------------------------------------------------------- thu kem qua

// MailEntity la than thu. Khuon lay tu gmhanglong/gm/api.php (nhanh gui vat pham):
// type=2, operation=12, reward dang "type:id:count#type:id:count".
type MailEntity struct {
	Type      int    `json:"type"`
	Operation int    `json:"operation"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	Reward    string `json:"reward"`
}

// MailTarget la nguoi nhan; masterIdHex/roleId la ID nhan vat trong game.
type MailTarget struct {
	Type         int    `json:"type"`
	SrvCode      string `json:"srvCode"`
	MasterIDHex  string `json:"masterIdHex"`
	Name         string `json:"name"`
	MasterName   string `json:"masterName"`
	RoleID       string `json:"roleId"`
	RoleName     string `json:"roleName"`
	PlatformCode string `json:"platformCode"`
}

// MailCreateReq la payload cua /gm/mail/x/create.
type MailCreateReq struct {
	GmMailEntity MailEntity   `json:"gmMailEntity"`
	GmMailTars   []MailTarget `json:"gmMailTars"`
	Reward       string       `json:"reward"`
}

// NewItemMail dung mot thu kem qua cho mot nhan vat.
func NewItemMail(srvCode, masterIDHex, masterName, platformCode, title, content, reward string) MailCreateReq {
	return MailCreateReq{
		GmMailEntity: MailEntity{Type: 2, Operation: 12, Title: title, Content: content, Reward: reward},
		GmMailTars: []MailTarget{{
			Type: 2, SrvCode: srvCode, MasterIDHex: masterIDHex, Name: masterName, MasterName: masterName,
			RoleID: masterIDHex, RoleName: masterName, PlatformCode: platformCode,
		}},
		Reward: reward,
	}
}

// MailWhole la mot dong cua /gm/mail/x/list (GmMailWhole phia console): phieu + nguoi nhan.
type MailWhole struct {
	GmMailEntity MailEntityRow `json:"gmMailEntity"`
	GmMailTars   []MailTarget  `json:"gmMailTars"`
}

// MailEntityRow la GmMailEntity nhu console tra ve (co id, status). Bo cac moc thoi gian vi
// console tra chung luc la so mili-giay, luc la chuoi — khong can toi.
type MailEntityRow struct {
	ID             int64  `json:"id"`
	Type           int    `json:"type"`
	Title          string `json:"title"`
	Content        string `json:"content"`
	Reward         string `json:"reward"`
	Status         int    `json:"status"`
	SubmitUsername string `json:"submitUsername"`
}

// MailListPending doc mot trang phieu thu dang cho duyet (status=1), ke ca cua nguoi khac.
//
// GET voi tham so tren URL (GmMailFilter bind tu query) — POST bi "Request method 'POST'
// not supported". Console tra PageResult {page, pageSize, total, records, attachment}; moi
// record co gmMailEntity (id, status...) va gmMailTars (srvCode, masterIdHex) — do that
// tren console 2026-09-06.
func (c *Client) MailListPending(ctx context.Context, beginIndex int) ([]MailWhole, int64, error) {
	var out struct {
		Records []MailWhole `json:"records"`
		Total   int64       `json:"total"`
	}
	q := url.Values{"status": {"1"}, "viewAll": {"true"}, "noReward": {"false"},
		"beginIndex": {strconv.Itoa(beginIndex)}}
	if err := c.getAuthed(ctx, c.BaseURL, "/gm/mail/x/list", q, &out); err != nil {
		return nil, 0, err
	}
	return out.Records, out.Total, nil
}

// MailCreate tao phieu thu cho duyet va tra ve id phieu (tcg.gm_mail_approval.id).
//
// Console (GmMailController.x_create) tra `void`: no chen gm_mail_approval + gm_mail_tar
// roi tra data=null, KHONG tra id — doc tu bytecode 2026-09-06 sau khi moi lan gui deu
// bao "khong tra id phieu thu" du phieu da nam trong bang. Ban PHP cu tranh chuyen nay bang
// cach tu INSERT vao MySQL tcg roi goi complete; o day khong co quyen vao tcg nen sau khi
// tao xong doc lai danh sach cho duyet va nhan dung phieu vua tao: cung tieu de, noi dung,
// qua, nguoi nhan — lay id lon nhat (moi nhat). Van doc `data` truoc, phong console doi.
func (c *Client) MailCreate(ctx context.Context, req MailCreateReq) (int64, error) {
	var raw json.RawMessage
	if err := c.callAuthed(ctx, "/gm/mail/x/create", req, &raw); err != nil {
		return 0, err
	}
	if id, ok := mailID(raw); ok {
		return id, nil
	}
	id, err := c.timPhieuVuaTao(ctx, req)
	if err != nil {
		return 0, fmt.Errorf("console da nhan phieu nhung khong tim lai duoc trong danh sach cho duyet: %w", err)
	}
	return id, nil
}

// timPhieuVuaTao quet toi da 5 trang phieu cho duyet, tra ve id lon nhat khop voi req.
func (c *Client) timPhieuVuaTao(ctx context.Context, req MailCreateReq) (int64, error) {
	muon := map[string]bool{}
	for _, t := range req.GmMailTars {
		muon[t.SrvCode+"/"+t.MasterIDHex] = true
	}
	var best int64
	begin := 0
	for trang := 0; trang < 5; trang++ {
		recs, total, err := c.MailListPending(ctx, begin)
		if err != nil {
			return 0, err
		}
		for _, r := range recs {
			e := r.GmMailEntity
			if e.Status != 1 || e.Type != req.GmMailEntity.Type || e.Title != req.GmMailEntity.Title ||
				e.Content != req.GmMailEntity.Content || e.Reward != req.GmMailEntity.Reward {
				continue
			}
			// Console co the khong kem nguoi nhan trong danh sach; khi co thi phai khop het.
			if len(r.GmMailTars) > 0 {
				if len(r.GmMailTars) != len(muon) {
					continue
				}
				khop := true
				for _, t := range r.GmMailTars {
					if !muon[t.SrvCode+"/"+t.MasterIDHex] {
						khop = false
						break
					}
				}
				if !khop {
					continue
				}
			}
			if e.ID > best {
				best = e.ID
			}
		}
		begin += len(recs)
		if len(recs) == 0 || int64(begin) >= total {
			break
		}
	}
	if best == 0 {
		return 0, errors.New("khong co phieu nao khop tieu de/noi dung/qua/nguoi nhan")
	}
	return best, nil
}

func mailID(raw json.RawMessage) (int64, bool) {
	var n int64
	if err := json.Unmarshal(raw, &n); err == nil && n > 0 {
		return n, true
	}
	var obj struct {
		ID int64 `json:"id"`
	}
	if err := json.Unmarshal(raw, &obj); err == nil && obj.ID > 0 {
		return obj.ID, true
	}
	return 0, false
}

// MailComplete duyet phieu thu (status=2) de thu duoc gui di — cung cach gm/api.php lam.
func (c *Client) MailComplete(ctx context.Context, id int64) error {
	return c.callAuthed(ctx, "/gm/mail/x/complete", map[string]any{"status": "2", "id": id}, nil)
}

// ---------------------------------------------------------------- tra cuu nhan vat va kho do

// StatBaseURL la dia chi cua dich vu statistic (:7788). Chi mot endpoint duoc dung:
// /role/record/list — cach duy nhat tra ra roleId tu TEN nhan vat. Console (:9999) khong co.
func (c *Client) statBase() string {
	if c.StatBaseURL != "" {
		return strings.TrimRight(c.StatBaseURL, "/")
	}
	return "http://127.0.0.1:7788"
}

// RoleRecord la mot dong ket qua tra cuu nhan vat.
type RoleRecord struct {
	RoleID       string `json:"roleId"`
	RoleName     string `json:"roleName"`
	SrvCode      string `json:"srvCode"`
	AccountUID   string `json:"accountUid"`
	PlatformCode string `json:"platformCode"`
	Level        int    `json:"level"`
	VipLevel     int    `json:"vipLevel"`
	Power        int64  `json:"power"`
	// Hai truong duoi do gmops dien them tu platform.game_identities/users: tai khoan ID
	// (username o id.<domain>) va username trong tcg.account. Nguoi truc nham ten nhan vat
	// voi ten tai khoan (ID `quandh` choi nhan vat `Duyen`, con nhan vat `QuanDH` la cua
	// nguoi khac) — phai hien ca hai canh nhau.
	IDUsername   string `json:"idUsername,omitempty"`
	GameUsername string `json:"gameUsername,omitempty"`
}

// FindRoles tim nhan vat theo ten trong mot may chu.
//
// Ten nhan vat co dau va co the co khoang trang; url.Values lo phan ma hoa.
func (c *Client) FindRoles(ctx context.Context, srvCode, roleName string, limit int) ([]RoleRecord, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	var out struct {
		Records []RoleRecord `json:"records"`
	}
	q := url.Values{
		"srvCode":  {srvCode},
		"roleName": {roleName},
		"page":     {"1"},
		"pageSize": {strconv.Itoa(limit)},
	}
	if err := c.getAuthed(ctx, c.statBase(), "/role/record/list", q, &out); err != nil {
		return nil, err
	}
	return out.Records, nil
}

// FindRolesByAccount tim nhan vat theo ma tai khoan game (tcg.account.uid) trong mot may chu.
// RoleRecordFilter cua statistic co accountUid (doc tu bytecode 2026-09-07).
func (c *Client) FindRolesByAccount(ctx context.Context, srvCode, accountUID string, limit int) ([]RoleRecord, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	var out struct {
		Records []RoleRecord `json:"records"`
	}
	q := url.Values{
		"srvCode":    {srvCode},
		"accountUid": {accountUID},
		"page":       {"1"},
		"pageSize":   {strconv.Itoa(limit)},
	}
	if err := c.getAuthed(ctx, c.statBase(), "/role/record/list", q, &out); err != nil {
		return nil, err
	}
	return out.Records, nil
}

// BagType la loai kho do. Gia tri lay tu CLAUDE.md muc 7 va tu gmhanglong/gm/api.php.
//
// Ten tieng Anh o day theo BANG CAU HINH may chu doc, khong theo ten hien thi: ban dang chay
// da bi thay ao (tuong than thoai -> tuong Kim Dung) nen chu hien thi lech han. Doi chieu tu
// kho do that tren may chu:
//
//	5  符文 rune.xlsx 符文基础            'Cuu Duong Cong'  — KHONG phai "mac an"
//	6  命格 destiny.xlsx 命格基础          'Hon ngoc ( Tieu )' — KHONG phai "thu hon"
//	7  仙器 immortal-artifact.xlsx 仙器基础 'Cuu Am Noi Luc'
//
// Nhan tieng Viet nam o gmops.BagKinds; sua nhan thi sua o day cho khop.
type BagType int

const (
	BagHero         BagType = 1
	BagEquipment    BagType = 2
	BagItem         BagType = 3
	BagFragment     BagType = 4
	BagRune         BagType = 5
	BagDestiny      BagType = 6
	BagArtifact     BagType = 7
	BagArtifactFrag BagType = 8
	BagCollection   BagType = 13
)

// BagSlot la mot o trong kho do.
type BagSlot struct {
	ID   string `json:"id"`
	Tid  int    `json:"tid"`
	Num  int64  `json:"num"`
	Name string `json:"name"`
}

// BagQuery doc mot loai kho do cua nhan vat.
func (c *Client) BagQuery(ctx context.Context, srvCode, roleID string, bag BagType) ([]BagSlot, error) {
	var out struct {
		List []BagSlot `json:"list"`
	}
	q := url.Values{"srvCode": {srvCode}, "roleId": {roleID}, "bagType": {strconv.Itoa(int(bag))}}
	if err := c.getAuthed(ctx, c.BaseURL, "/role/bag/query", q, &out); err != nil {
		return nil, err
	}
	return out.List, nil
}

// BagReduce tru mot o trong kho do.
//
// cmdMode=uid: xoa theo ma o (itemUid) chu khong theo tid. Xoa theo tid se cham vao moi o
// cung loai, ke ca o ma nguoi truc khong nhin thay luc bam.
func (c *Client) BagReduce(ctx context.Context, srvCode, roleID string, bag BagType, itemUID string, num int64, note string) error {
	q := url.Values{
		"cmdMode": {"uid"}, "srvCode": {srvCode}, "roleId": {roleID},
		"bagType": {strconv.Itoa(int(bag))}, "num": {strconv.FormatInt(num, 10)},
		"itemUid": {itemUID}, "note": {note},
	}
	return c.getAuthed(ctx, c.BaseURL, "/role/bag/reduce", q, nil)
}
