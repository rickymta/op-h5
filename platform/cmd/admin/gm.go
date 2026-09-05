package main

// Cong cu GM: thao tac tren nhan vat trong game qua console.
//
// Thay gmhanglong/gm/*.php (docs/plan-go-react.md giai đoạn 1). Sau lam duoc bang PHP cu,
// giu nguyen ngu nghia:
//   tra nhan vat  -> statistic /role/record/list   (noi duy nhat doi TEN ra roleId)
//   nap tay       -> console  /gm/pay/manual       (PHP dung pay_approval + completeApproval;
//                                                   mot buoc it hon, cung ket qua, da chay o cua hang)
//   gui thu       -> console  /gm/mail/x/create + /complete
//   xem/xoa kho do-> console  /role/bag/query + /role/bag/reduce (cmdMode=uid)
//
// Khac PHP o ba cho, deu co chu y:
//   1. Xac thuc bang tai khoan admin_users vai tro >= gm, khong phai ma tinh + "mat khau SDK".
//   2. Xoa kho do phai gui dung so o da xem (`expect`), nen khong xoa nham thu vua rot vao tui
//      giua luc nguoi truc doc va luc bam.
//   3. Moi thao tac ghi admin_audit KEM ket qua, ke ca khi that bai.

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/rickymta/op-h5/platform/internal/console"
	"github.com/rickymta/op-h5/platform/internal/httpx"
)

// bagKinds la cac loai kho do cong cu cho phep dung toi, kem ten tieng Viet.
// Thu tu quyet dinh thu tu hien tren trang.
var bagKinds = []struct {
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
	for _, k := range bagKinds {
		if int(k.Type) == t {
			return true
		}
	}
	return false
}

// requireGM doi vai tro tu 'gm' tro len. viewer chi duoc xem, khong duoc cham vao nhan vat.
func (s *server) requireGM(h func(http.ResponseWriter, *http.Request, *admin)) http.HandlerFunc {
	return s.requireAdminAPI(func(w http.ResponseWriter, r *http.Request, a *admin) {
		switch a.Role {
		case "gm", "operator", "owner":
			h(w, r, a)
		default:
			httpx.Error(w, http.StatusForbidden, "forbidden", "Tài khoản này chỉ có quyền xem.")
		}
	})
}

// gmConsole tra ve client console, hoac loi de tra ve cho nguoi dung.
func (s *server) gmConsole(w http.ResponseWriter) (*console.Client, bool) {
	if s.console == nil {
		httpx.Error(w, http.StatusServiceUnavailable, "console_unconfigured",
			"Chưa cấu hình console: đặt CONSOLE_BASE_URL, CONSOLE_USER, CONSOLE_ADMIN_PASSWORD và TCG_SECRET.")
		return nil, false
	}
	return s.console, true
}

// gmError doi loi cua console thanh phan hoi cho nguoi truc.
//
// Console TU CHOI (het luot, khong tim thay nhan vat...) khac han console CHET: cai dau
// nguoi truc sua duoc bang cach doi tham so, cai sau thi khong.
func gmError(w http.ResponseWriter, err error) {
	if console.IsRejected(err) {
		httpx.Error(w, http.StatusConflict, "console_rejected", err.Error())
		return
	}
	httpx.Error(w, http.StatusBadGateway, "console_unavailable",
		"Không gọi được console: "+err.Error())
}

// auditGM ghi nhat ky kem ket qua. Ghi ca khi that bai: "ai da THU lam gi" cung la thong tin.
func (s *server) auditGM(ctx context.Context, a *admin, action, target string, detail map[string]any, err error) {
	if detail == nil {
		detail = map[string]any{}
	}
	if err != nil {
		detail["error"] = err.Error()
	} else {
		detail["ok"] = true
	}
	blob, _ := json.Marshal(detail)
	s.audit(ctx, a.ID, action, target, string(blob))
}

// ---------------------------------------------------------------- tra cuu

// gmMeta tra ve thu muc de trang dung: may chu va cac loai kho do.
func (s *server) apiGMMeta(w http.ResponseWriter, r *http.Request, _ *admin) {
	ctx := r.Context()
	games := s.games(ctx)
	game := pickGame(r, games)
	rows, err := s.db.QueryContext(ctx,
		`SELECT srv_code, name FROM game_servers WHERE game_code = ? ORDER BY srv_code`, game)
	type srvOpt struct {
		Code string `json:"code"`
		Name string `json:"name"`
	}
	servers := []srvOpt{}
	if err == nil {
		for rows.Next() {
			var o srvOpt
			if rows.Scan(&o.Code, &o.Name) == nil {
				servers = append(servers, o)
			}
		}
		_ = rows.Close()
	} else {
		s.log.Error("doc danh sach may chu", "err", err)
	}
	if games == nil {
		games = []gameOpt{}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"games": games, "game": game, "servers": servers, "bags": bagKinds,
	})
}

// apiGMRoles tim nhan vat theo ten.
func (s *server) apiGMRoles(w http.ResponseWriter, r *http.Request, _ *admin) {
	c, ok := s.gmConsole(w)
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
		gmError(w, err)
		return
	}
	if roles == nil {
		roles = []console.RoleRecord{}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"roles": roles})
}

// apiGMBag doc mot loai kho do cua nhan vat.
func (s *server) apiGMBag(w http.ResponseWriter, r *http.Request, _ *admin) {
	c, ok := s.gmConsole(w)
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
		gmError(w, err)
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

// apiGMBagClear xoa toan bo mot loai kho do.
//
// `expect` la so o ma trang vua hien. Doc lai truoc khi xoa va so khop: giua luc nguoi truc
// doc va luc bam, nguoi choi van dang choi va tui co the doi. Lech thi dung lai va bao doc
// lai — khong tu quyet dinh xoa nhieu hon hay it hon nguoi truc dinh xoa.
func (s *server) apiGMBagClear(w http.ResponseWriter, r *http.Request, a *admin) {
	c, ok := s.gmConsole(w)
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
		gmError(w, err)
		return
	}
	if len(slots) != in.Expect {
		httpx.Error(w, http.StatusConflict, "changed",
			fmt.Sprintf("Kho đồ vừa thay đổi: bạn thấy %d ô, hiện có %d. Hãy xem lại rồi bấm lại.", in.Expect, len(slots)))
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
	s.auditGM(ctx, a, "gm_bag_clear", in.Srv+"/"+in.Role,
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

// apiGMPay nap tay mot muc nap cho nhan vat: game xu ly nhu mot lan nap that.
func (s *server) apiGMPay(w http.ResponseWriter, r *http.Request, a *admin) {
	c, ok := s.gmConsole(w)
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
	_ = s.db.QueryRowContext(ctx,
		`SELECT name, price_xu FROM game_packages WHERE package_id = ? LIMIT 1`,
		strconv.Itoa(in.PayID)).Scan(&name, &price)

	rec := console.PayRecord{
		OrderType:       0,
		PlatformOrderID: fmt.Sprintf("gm-%d-%d", a.ID, nowUnix()),
		ItemTid:         in.PayID,
		ItemCount:       in.Count,
		ItemName:        name,
		PayAmount:       float64(price) * float64(in.Count),
		SrvCode:         in.Srv,
		PlatformCode:    envOr("ADAPTER_PLATFORM_CODE", "develop"),
		ChannelCode:     envOr("ADAPTER_CHANNEL_CODE", "0"),
		AccountUID:      in.Account,
		MasterIDHex:     in.Role,
		MasterName:      in.Name,
		CurrencyCode:    envOr("ADAPTER_CURRENCY_CODE", "VND"),
		Note:            "GM " + a.Username + ": " + strings.TrimSpace(in.Note),
	}
	err := c.PayManual(ctx, rec)
	s.auditGM(ctx, a, "gm_pay", in.Srv+"/"+in.Role,
		map[string]any{"pay_id": in.PayID, "count": in.Count, "name": name, "note": in.Note}, err)
	if err != nil {
		gmError(w, err)
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

// apiGMMail gui mot thu kem qua cho MOT nhan vat.
//
// Co y khong ho tro gui toan may chu o day: gui nham mot nguoi thi thu hoi duoc bang tay,
// gui nham ca may chu thi khong. Khi nao can thi lam mot duong rieng co buoc xac nhan hai lop.
func (s *server) apiGMMail(w http.ResponseWriter, r *http.Request, a *admin) {
	c, ok := s.gmConsole(w)
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
		envOr("ADAPTER_PLATFORM_CODE", "develop"), in.Title, in.Content, in.Reward)
	id, err := c.MailCreate(ctx, req)
	if err == nil {
		err = c.MailComplete(ctx, id)
	}
	s.auditGM(ctx, a, "gm_mail", in.Srv+"/"+in.Role,
		map[string]any{"reward": in.Reward, "title": in.Title, "mail_id": id}, err)
	if err != nil {
		gmError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"message": "Đã gửi thư (phiếu #" + strconv.FormatInt(id, 10) + ")."})
}
