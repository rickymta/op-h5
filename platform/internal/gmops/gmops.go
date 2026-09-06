// Package gmops la cong cu GM cua MOT game: tra nhan vat, xem/xoa kho do, nap tay, gui thu.
//
// VI SAO LA PACKAGE RIENG, KHONG NAM TRONG DICH VU QUAN TRI
// ---------------------------------------------------------
// Moi thao tac o day deu di qua CONSOLE cua cum game — thu rieng cua tung game. Game khac
// se co backend khac han, nen GM thuoc ve stack cua game chu khong phai trang quan tri
// chung cua he thong:
//
//	admin.<domain>            quan tri TOAN HE THONG: CMS, nap tien cho he thong ID,
//	                          tai khoan chung, cau hinh cua hang
//	haitac.<domain>/admin-portal   GM cua RIENG game haitac (Adapter phuc vu)
//
// Ngu nghia giu nguyen tu ban PHP cu (gmhanglong/gm/*.php):
//
//	tra nhan vat   -> statistic /role/record/list   (noi duy nhat doi TEN ra roleId)
//	nap tay        -> console  /gm/pay/manual
//	gui thu        -> console  /gm/mail/x/create + /complete
//	xem/xoa kho do -> console  /role/bag/query + /role/bag/reduce
//
// Khac PHP o ba cho, deu co chu y:
//  1. Xac thuc bang tai khoan admin_users vai tro >= gm, khong phai ma tinh.
//  2. Xoa kho do phai gui dung so o da xem (`expect`), nen khong xoa nham thu vua rot vao
//     tui giua luc nguoi truc doc va luc bam.
//  3. Moi thao tac ghi admin_audit KEM ket qua, ke ca khi that bai.
package gmops

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/rickymta/op-h5/platform/internal/console"
	"github.com/rickymta/op-h5/platform/internal/httpx"
)

// Actor la nguoi dang thao tac. Chi can dung ba truong nay; dich vu goi tu quyet dinh
// lay chung tu dau (phien cua trang quan tri, hay phien rieng cua cong game).
type Actor struct {
	ID       int64
	Username string
	Role     string
}

// CanGM cho biet vai tro nay co duoc cham vao nhan vat khong. `viewer` chi duoc xem.
func (a Actor) CanGM() bool {
	switch a.Role {
	case "gm", "operator", "owner":
		return true
	}
	return false
}

// Service gan cong cu GM vao mot game cu the.
type Service struct {
	Console  *console.Client
	DB       *sql.DB
	Log      *slog.Logger
	GameCode string // 'haitac' — dung de doc danh sach may chu

	// Platform/Channel/Currency di kem ban ghi nap va thu; de trong thi dung mac dinh.
	PlatformCode string
	ChannelCode  string
	CurrencyCode string
}

var rewardRe = regexp.MustCompile(`^\d+:\d+:\d+(#\d+:\d+:\d+)*$`)

// BagKinds la cac loai kho do cong cu cho phep dung toi, kem ten tieng Viet.
// Thu tu quyet dinh thu tu hien tren trang.
var BagKinds = []struct {
	Type  console.BagType `json:"type"`
	Label string          `json:"label"`
	Note  string          `json:"note"`
}{
	{console.BagItem, "Đạo cụ", "vật phẩm thường"},
	{console.BagEquipment, "Trang bị", ""},
	{console.BagFragment, "Mảnh tướng", ""},
	{console.BagSeal, "Mặc ấn", ""},
	{console.BagBeastSoul, "Thú hồn", ""},
	{console.BagArtifact, "Tiên khí", ""},
	{console.BagArtifactFrag, "Mảnh tiên khí", ""},
	{console.BagCollection, "Sưu tập", ""},
	{console.BagHero, "Tướng", "xoá tướng là thao tác không lùi được"},
}

func validBag(t int) bool {
	for _, k := range BagKinds {
		if int(k.Type) == t {
			return true
		}
	}
	return false
}

func (s *Service) or(v, def string) string {
	if v == "" {
		return def
	}
	return v
}

// client tra ve console, hoac loi de tra ve cho nguoi dung.
func (s *Service) client(w http.ResponseWriter) (*console.Client, bool) {
	if s.Console == nil {
		httpx.Error(w, http.StatusServiceUnavailable, "console_unconfigured",
			"Chưa cấu hình console: đặt ADAPTER_CONSOLE_BASE_URL, ADAPTER_CONSOLE_USER, "+
				"ADAPTER_CONSOLE_PASSWORD và TCG_SECRET.")
		return nil, false
	}
	return s.Console, true
}

// fail doi loi cua console thanh phan hoi cho nguoi truc.
//
// Console TU CHOI (het luot, khong tim thay nhan vat...) khac han console CHET: cai dau
// nguoi truc sua duoc bang cach doi tham so, cai sau thi khong.
func fail(w http.ResponseWriter, err error) {
	if console.IsRejected(err) {
		httpx.Error(w, http.StatusConflict, "console_rejected", err.Error())
		return
	}
	httpx.Error(w, http.StatusBadGateway, "console_unavailable", "Không gọi được console: "+err.Error())
}

// audit ghi nhat ky kem ket qua. Ghi ca khi that bai: "ai da THU lam gi" cung la thong tin.
func (s *Service) audit(ctx context.Context, a Actor, action, target string, detail map[string]any, err error) {
	if detail == nil {
		detail = map[string]any{}
	}
	if err != nil {
		detail["error"] = err.Error()
	} else {
		detail["ok"] = true
	}
	blob, _ := json.Marshal(detail)
	if s.DB == nil {
		return
	}
	if _, e := s.DB.ExecContext(ctx,
		`INSERT INTO admin_audit (admin_id, action, target, detail) VALUES (?,?,?,?)`,
		a.ID, action, target, string(blob)); e != nil && s.Log != nil {
		s.Log.Error("ghi admin_audit", "err", e, "action", action)
	}
}

// ---------------------------------------------------------------- tra cuu

// Meta tra ve thu muc de trang dung: may chu cua game nay va cac loai kho do.
func (s *Service) Meta(w http.ResponseWriter, r *http.Request, _ Actor) {
	type srvOpt struct {
		Code string `json:"code"`
		Name string `json:"name"`
	}
	servers := []srvOpt{}
	if s.DB != nil {
		rows, err := s.DB.QueryContext(r.Context(),
			`SELECT srv_code, name FROM game_servers WHERE game_code = ? ORDER BY srv_code`, s.GameCode)
		if err == nil {
			for rows.Next() {
				var o srvOpt
				if rows.Scan(&o.Code, &o.Name) == nil {
					servers = append(servers, o)
				}
			}
			_ = rows.Close()
		} else if s.Log != nil {
			s.Log.Error("doc danh sach may chu", "err", err)
		}
	}
	// Danh sach game. Giao dien doc `meta.games` de hien ten game tren thanh tieu de:
	//   meta.data?.games.find((g) => g.code === meta.data?.game)
	// Thieu khoa nay thi `games` la undefined va `.find` nem TypeError ngay khi ve trang —
	// man hinh den, khong vao duoc cong cu GM. Luon tra ve mang (co the rong), khong bao gio
	// nil: slice nil trong Go ra JSON `null`, va `null.find` cung nem dung loi do.
	type gameOpt struct {
		Code string `json:"code"`
		Name string `json:"name"`
	}
	games := []gameOpt{}
	if s.DB != nil {
		rows, err := s.DB.QueryContext(r.Context(),
			`SELECT code, name FROM games ORDER BY sort_order, code`)
		if err == nil {
			for rows.Next() {
				var o gameOpt
				if rows.Scan(&o.Code, &o.Name) == nil {
					games = append(games, o)
				}
			}
			_ = rows.Close()
		} else if s.Log != nil {
			s.Log.Error("doc danh sach game", "err", err)
		}
	}
	if len(games) == 0 {
		// Khong doc duoc bang thi van phai co dong cho game dang mo, de thanh tieu de co ten.
		games = []gameOpt{{Code: s.GameCode, Name: s.GameCode}}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"games": games, "game": s.GameCode, "servers": servers, "bags": BagKinds,
	})
}

// Roles tim nhan vat theo ten.
func (s *Service) Roles(w http.ResponseWriter, r *http.Request, _ Actor) {
	c, ok := s.client(w)
	if !ok {
		return
	}
	srv := strings.TrimSpace(r.URL.Query().Get("srv"))
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	if srv == "" || name == "" {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Cần chọn máy chủ và nhập tên nhân vật.")
		return
	}
	roles, err := c.FindRoles(r.Context(), srv, name, 20)
	if err != nil {
		fail(w, err)
		return
	}
	if roles == nil {
		roles = []console.RoleRecord{}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"roles": roles})
}

// Bag doc mot loai kho do cua nhan vat.
func (s *Service) Bag(w http.ResponseWriter, r *http.Request, _ Actor) {
	c, ok := s.client(w)
	if !ok {
		return
	}
	q := r.URL.Query()
	srv, role := strings.TrimSpace(q.Get("srv")), strings.TrimSpace(q.Get("role"))
	bag, _ := strconv.Atoi(q.Get("type"))
	if srv == "" || role == "" || !validBag(bag) {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Thiếu máy chủ, nhân vật hoặc loại kho đồ.")
		return
	}
	slots, err := c.BagQuery(r.Context(), srv, role, console.BagType(bag))
	if err != nil {
		fail(w, err)
		return
	}
	if slots == nil {
		slots = []console.BagSlot{}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"slots": slots})
}

// ---------------------------------------------------------------- thao tac

type clearRequest struct {
	Srv    string `json:"srv"`
	Role   string `json:"role"`
	Type   int    `json:"type"`
	Expect int    `json:"expect"` // so o nguoi truc nhin thay luc bam
	Note   string `json:"note"`
}

// BagClear xoa toan bo mot loai kho do.
//
// `expect` la so o ma trang vua hien. Doc lai truoc khi xoa va so khop: giua luc nguoi truc
// doc va luc bam, nguoi choi van dang choi va tui co the doi. Lech thi dung lai va bao doc
// lai — khong tu quyet dinh xoa nhieu hon hay it hon nguoi truc dinh xoa.
func (s *Service) BagClear(w http.ResponseWriter, r *http.Request, a Actor) {
	c, ok := s.client(w)
	if !ok {
		return
	}
	var in clearRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được.")
		return
	}
	if in.Srv == "" || in.Role == "" || !validBag(in.Type) {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Thiếu máy chủ, nhân vật hoặc loại kho đồ.")
		return
	}
	ctx := r.Context()
	slots, err := c.BagQuery(ctx, in.Srv, in.Role, console.BagType(in.Type))
	if err != nil {
		fail(w, err)
		return
	}
	if len(slots) != in.Expect {
		httpx.Error(w, http.StatusConflict, "changed",
			fmt.Sprintf("Kho đồ vừa thay đổi: bạn thấy %d ô, hiện có %d. Hãy xem lại rồi bấm lại.",
				in.Expect, len(slots)))
		return
	}
	if len(slots) == 0 {
		httpx.JSON(w, http.StatusOK, map[string]any{"cleared": 0, "failed": 0})
		return
	}
	note := strings.TrimSpace(in.Note)
	if note == "" {
		note = "GM " + a.Username + " don kho do"
	}
	cleared, failed := 0, 0
	var lastErr error
	for _, sl := range slots {
		if err := c.BagReduce(ctx, in.Srv, in.Role, console.BagType(in.Type), sl.ID, sl.Num, note); err != nil {
			failed++
			lastErr = err
			continue
		}
		cleared++
	}
	s.audit(ctx, a, "gm_bag_clear", in.Srv+"/"+in.Role,
		map[string]any{"bag": in.Type, "cleared": cleared, "failed": failed}, lastErr)
	if failed > 0 {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"cleared": cleared, "failed": failed,
			"message": fmt.Sprintf("Xoá được %d ô, %d ô lỗi: %v", cleared, failed, lastErr),
		})
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"cleared": cleared, "failed": 0,
		"message": fmt.Sprintf("Đã xoá %d ô.", cleared),
	})
}

type payRequest struct {
	Srv     string `json:"srv"`
	Role    string `json:"role"`
	Account string `json:"account_uid"`
	Name    string `json:"role_name"`
	PayID   int    `json:"pay_id"`
	Count   int    `json:"count"`
	Note    string `json:"note"`
}

// Pay nap tay mot muc nap cho nhan vat: game xu ly nhu mot lan nap that.
func (s *Service) Pay(w http.ResponseWriter, r *http.Request, a Actor) {
	c, ok := s.client(w)
	if !ok {
		return
	}
	var in payRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được.")
		return
	}
	if in.Srv == "" || in.Account == "" || in.PayID <= 0 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Thiếu máy chủ, tài khoản hoặc mã gói nạp.")
		return
	}
	if in.Count <= 0 {
		in.Count = 1
	}
	if in.Count > 100 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Tối đa 100 lần mỗi lượt.")
		return
	}
	ctx := r.Context()
	// Ten goi va gia lay tu game_packages neu co, de nhat ky va thu trong game doc duoc.
	name, price := fmt.Sprintf("Gói %d", in.PayID), int64(0)
	if s.DB != nil {
		_ = s.DB.QueryRowContext(ctx,
			`SELECT name, price_xu FROM game_packages WHERE package_id = ? LIMIT 1`,
			strconv.Itoa(in.PayID)).Scan(&name, &price)
	}
	rec := console.PayRecord{
		OrderType:       0,
		PlatformOrderID: fmt.Sprintf("gm-%d-%d", a.ID, time.Now().Unix()),
		ItemTid:         in.PayID,
		ItemCount:       in.Count,
		ItemName:        name,
		PayAmount:       float64(price) * float64(in.Count),
		SrvCode:         in.Srv,
		PlatformCode:    s.or(s.PlatformCode, "develop"),
		ChannelCode:     s.or(s.ChannelCode, "0"),
		AccountUID:      in.Account,
		MasterIDHex:     in.Role,
		MasterName:      in.Name,
		CurrencyCode:    s.or(s.CurrencyCode, "VND"),
		Note:            "GM " + a.Username + ": " + strings.TrimSpace(in.Note),
	}
	err := c.PayManual(ctx, rec)
	s.audit(ctx, a, "gm_pay", in.Srv+"/"+in.Role,
		map[string]any{"pay_id": in.PayID, "count": in.Count, "name": name, "note": in.Note}, err)
	if err != nil {
		fail(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"message": fmt.Sprintf("Đã nạp %s ×%d cho %s.", name, in.Count, in.Name),
	})
}

type mailRequest struct {
	Srv     string `json:"srv"`
	Role    string `json:"role"`
	Name    string `json:"role_name"`
	Title   string `json:"title"`
	Content string `json:"content"`
	Reward  string `json:"reward"`
}

// Mail gui mot thu kem qua cho MOT nhan vat.
//
// Co y khong ho tro gui toan may chu o day: gui nham mot nguoi thi thu hoi duoc bang tay,
// gui nham ca may chu thi khong. Khi nao can thi lam mot duong rieng co buoc xac nhan hai lop.
func (s *Service) Mail(w http.ResponseWriter, r *http.Request, a Actor) {
	c, ok := s.client(w)
	if !ok {
		return
	}
	var in mailRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được.")
		return
	}
	in.Reward = strings.TrimSpace(in.Reward)
	in.Title = strings.TrimSpace(in.Title)
	if in.Srv == "" || in.Role == "" {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Thiếu máy chủ hoặc nhân vật.")
		return
	}
	if !rewardRe.MatchString(in.Reward) {
		httpx.Error(w, http.StatusBadRequest, "invalid_request",
			"Quà phải dạng type:id:count, nhiều món nối bằng # (ví dụ 0:1:5000 là 5.000 Nguyên Bảo).")
		return
	}
	if in.Title == "" {
		in.Title = "Thư từ quản trị"
	}
	if len(in.Title) > 120 || len(in.Content) > 1000 {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Tiêu đề tối đa 120 ký tự, nội dung 1.000.")
		return
	}
	ctx := r.Context()
	req := console.NewItemMail(in.Srv, in.Role, in.Name,
		s.or(s.PlatformCode, "develop"), in.Title, in.Content, in.Reward)
	id, err := c.MailCreate(ctx, req)
	if err == nil {
		err = c.MailComplete(ctx, id)
	}
	s.audit(ctx, a, "gm_mail", in.Srv+"/"+in.Role,
		map[string]any{"reward": in.Reward, "title": in.Title, "mail_id": id}, err)
	if err != nil {
		fail(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"message": "Đã gửi thư (phiếu #" + strconv.FormatInt(id, 10) + ").",
	})
}
