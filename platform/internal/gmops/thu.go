package gmops

// Gui thu kem qua: mot hay nhieu nguoi nhan, nguong so luong lon, va lich su thu da gui.
//
// VI SAO TACH RA FILE RIENG VA VI SAO CO BA THU NAY
// -------------------------------------------------
// Doc lai man hinh gui thu voi cau hoi "ca truc lam gi o day" thay vi "API can gi":
//
//  1. Viec hay gap nhat la DEN BU CHO MOT NHOM: mot loi anh huong 10–20 nguoi choi, phieu
//     ho tro dua danh sach ten. Ban cu chi gui duoc mot nguoi moi luot, xong la xoa bieu
//     mau — muoi nguoi la muoi lan go lai tieu de, noi dung, chon lai qua. Nen: mot thu,
//     nhieu nguoi nhan, ket qua tung nguoi. VAN KHONG co "gui toan may chu": danh sach ten
//     la thu nguoi truc doc duoc va chiu trach nhiem tung dong; "ca may chu" thi khong.
//
//  2. Gui trung: khong co cach nao biet nhan vat nay hom qua DA nhan den bu chua, tru khi
//     mo trang nhat ky he thong va doc tung dong. Nhat ky co san du lieu (`gm_mail`), chi
//     thieu mot cua so hien no ngay canh bieu mau.
//
//  3. Thua mot so 0: `0:1:5000` va `0:1:50000` nhin gan nhu nhau, va thu da vao hom thu
//     thi khong rut lai duoc. Ban PHP cu chan cung 100 mon/thu. O day khong chan cung — co
//     luc phai den bu lon that — nhung qua nguong thi bat xac nhan them mot lop, va nguong
//     do kiem o MAY CHU, khong chi o giao dien.

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/rickymta/op-h5/platform/internal/console"
	"github.com/rickymta/op-h5/platform/internal/httpx"
)

const (
	tieuDeToiDa    = 120  // ky tu, khong phai byte — tieng Viet 2 byte/chu
	noiDungToiDa   = 1000 // ky tu
	nguoiNhanToiDa = 50   // mot lan gui; nhieu hon la "toan may chu" tra hinh
	lichSuToiDa    = 50
)

// NguongQua: qua muc nay thi thu phai duoc xac nhan them mot lop (confirm_large).
type NguongQua struct {
	Loai  int    `json:"loai"`
	Ma    int64  `json:"ma"`
	ToiDa int64  `json:"toi_da"`
	Ten   string `json:"ten"`
}

// NguongVi cho tung loai tien. Moc lay tu chinh bang gia cua game: goi 20K xu cho 10.000
// Kim cuong, nen 100.000 Kim cuong ~ 200K xu — mot khoan den bu phai co nguoi thu hai
// nhin qua. Kim te va kinh nghiem re hon nhieu (goi 300K xu cho 20M), nguong dat 50M.
var NguongVi = []NguongQua{
	{Loai: 0, Ma: 1, ToiDa: 100_000, Ten: "Kim cương"}, // ten theo client (danh-muc: vi 1)
	{Loai: 0, Ma: 0, ToiDa: 50_000_000, Ten: "Beri"},   // vi 0
	{Loai: 0, Ma: 4, ToiDa: 50_000_000, Ten: "Kinh nghiệm tướng"},
}

// MonToiDa: so luong mot MON (khong phai vi) trong mot thu ma khong can xac nhan them.
// Ban PHP cu chan cung 100 va am tham cat xuong; o day khong cat, chi hoi lai.
const MonToiDa int64 = 999

// quaLon liet ke cac mon vuot nguong trong chuoi qua, de bao ro cho nguoi truc.
func quaLon(reward string) []string {
	var ra []string
	for _, phan := range strings.Split(reward, "#") {
		p := strings.SplitN(phan, ":", 3)
		if len(p) != 3 {
			continue
		}
		loai, _ := strconv.Atoi(p[0])
		ma, _ := strconv.ParseInt(p[1], 10, 64)
		sl, _ := strconv.ParseInt(p[2], 10, 64)
		if loai == 0 {
			for _, n := range NguongVi {
				if n.Ma == ma && sl > n.ToiDa {
					ra = append(ra, fmt.Sprintf("%s ×%s (ngưỡng %s)", n.Ten, dauCham(sl), dauCham(n.ToiDa)))
				}
			}
			continue
		}
		if sl > MonToiDa {
			ten := TenMuc(loai, ma)
			if ten == "" {
				ten = phan
			}
			ra = append(ra, fmt.Sprintf("%s ×%s (ngưỡng %s)", ten, dauCham(sl), dauCham(MonToiDa)))
		}
	}
	return ra
}

// dauCham: 1234567 -> "1.234.567" — cach nguoi Viet doc so, de khong dem lai so 0.
func dauCham(n int64) string {
	s := strconv.FormatInt(n, 10)
	if len(s) <= 3 {
		return s
	}
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte('.')
		}
		b.WriteRune(c)
	}
	return b.String()
}

// thayTen dien ten nhan vat vao cho `{ten}` — de mot thu gui nhieu nguoi van goi dung ten.
func thayTen(s, ten string) string { return strings.ReplaceAll(s, "{ten}", ten) }

type nguoiNhan struct {
	Srv  string `json:"srv"`
	Role string `json:"role"`
	Name string `json:"role_name"`
}

type mailRequest struct {
	// Mot nguoi (khuon cu, van nhan) ...
	Srv  string `json:"srv"`
	Role string `json:"role"`
	Name string `json:"role_name"`
	// ... hoac nhieu nguoi. Co `recipients` thi bo qua ba truong tren.
	NguoiNhan []nguoiNhan `json:"recipients"`

	Title   string `json:"title"`
	Content string `json:"content"`
	Reward  string `json:"reward"`
	// Phai la true khi qua vuot nguong (xem quaLon). Giao dien hien o tick; may chu kiem lai.
	XacNhanLon bool `json:"confirm_large"`
}

// KetQuaThu la ket qua gui cho MOT nguoi nhan.
type KetQuaThu struct {
	Srv      string `json:"srv"`
	Role     string `json:"role"`
	RoleName string `json:"role_name"`
	OK       bool   `json:"ok"`
	MailID   int64  `json:"mail_id,omitempty"`
	// "console_rejected" (sua tham so la xong) / "console_unavailable" (console chet) /
	// "skipped" (chua gui vi console da chet o nguoi truoc — gui lai duoc).
	Loi       string `json:"error,omitempty"`
	ThongDiep string `json:"message,omitempty"`
}

// Mail gui mot thu kem qua cho mot hoac nhieu nhan vat.
//
// Co y khong ho tro gui toan may chu: gui nham mot danh sach ten thi doc lai duoc tung
// dong va thu hoi bang tay; gui nham ca may chu thi khong.
func (s *Service) Mail(w http.ResponseWriter, r *http.Request, a Actor) {
	c, ok := s.client(w)
	if !ok {
		return
	}
	var in mailRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_request", "Dữ liệu không đọc được.")
		return
	}
	in.Reward = strings.TrimSpace(in.Reward)
	in.Title = strings.TrimSpace(in.Title)

	ds := in.NguoiNhan
	if len(ds) == 0 {
		ds = []nguoiNhan{{Srv: in.Srv, Role: in.Role, Name: in.Name}}
	}
	if len(ds) > nguoiNhanToiDa {
		httpx.Error(w, http.StatusBadRequest, "too_many_recipients",
			fmt.Sprintf("Tối đa %d người nhận một lần. Nhiều hơn thì chia đợt — mỗi đợt là một danh sách đọc được.", nguoiNhanToiDa))
		return
	}
	// Trung nguoi nhan la gui hai thu — loai bo im lang thi nguoi truc khong biet, nen bao.
	thay := map[string]bool{}
	for i, n := range ds {
		n.Srv, n.Role, n.Name = strings.TrimSpace(n.Srv), strings.TrimSpace(n.Role), strings.TrimSpace(n.Name)
		ds[i] = n
		if n.Srv == "" || n.Role == "" {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "Thiếu máy chủ hoặc nhân vật ở một người nhận.")
			return
		}
		k := n.Srv + "/" + n.Role
		if thay[k] {
			httpx.Error(w, http.StatusBadRequest, "duplicate_recipient",
				"Nhân vật "+n.Name+" ("+n.Srv+") có hai lần trong danh sách — bỏ một, không thì họ nhận hai thư.")
			return
		}
		thay[k] = true
	}

	if !rewardRe.MatchString(in.Reward) {
		httpx.Error(w, http.StatusBadRequest, "invalid_request",
			"Quà phải dạng type:id:count, nhiều món nối bằng # (ví dụ 0:1:5000 là 5.000 Kim Cương).")
		return
	}
	if in.Title == "" {
		in.Title = "Thư từ quản trị"
	}
	// Dem KY TU. Ban truoc dem byte (len) trong khi giao dien dem ky tu: noi dung tieng Viet
	// 600 chu (~1.100 byte) bi tu choi "toi da 1.000" du o dem tren trang van xanh.
	if utf8.RuneCountInString(in.Title) > tieuDeToiDa || utf8.RuneCountInString(in.Content) > noiDungToiDa {
		httpx.Error(w, http.StatusBadRequest, "invalid_request",
			fmt.Sprintf("Tiêu đề tối đa %d ký tự, nội dung %d.", tieuDeToiDa, noiDungToiDa))
		return
	}
	if lon := quaLon(in.Reward); len(lon) > 0 && !in.XacNhanLon {
		httpx.Error(w, http.StatusConflict, "needs_confirm",
			"Quà vượt ngưỡng: "+strings.Join(lon, "; ")+". Đối chiếu lại phiếu rồi tick xác nhận.")
		return
	}

	ctx := r.Context()
	ket := make([]KetQuaThu, 0, len(ds))
	var daGui, hong, boQua int
	dung := false
	for _, n := range ds {
		k := KetQuaThu{Srv: n.Srv, Role: n.Role, RoleName: n.Name}
		if dung {
			k.Loi, k.ThongDiep = "skipped", "Chưa gửi: dừng vì console không trả lời ở người trước. Gửi lại được."
			boQua++
			ket = append(ket, k)
			continue
		}
		tieuDe, noiDung := thayTen(in.Title, n.Name), thayTen(in.Content, n.Name)
		req := console.NewItemMail(n.Srv, n.Role, n.Name, s.or(s.PlatformCode, "develop"), tieuDe, noiDung, in.Reward)
		id, err := c.MailCreate(ctx, req)
		if err == nil {
			err = c.MailComplete(ctx, id)
		}
		// Ghi ca role_name va noi dung: lich su thu (MailHistory) doc lai tu day, va "dung lai
		// thu nay" can noi dung goc chu khong chi tieu de.
		s.audit(ctx, a, "gm_mail", n.Srv+"/"+n.Role, map[string]any{
			"reward": in.Reward, "title": tieuDe, "content": noiDung, "mail_id": id,
			"role_name": n.Name, "so_nguoi": len(ds),
		}, err)
		switch {
		case err == nil:
			k.OK, k.MailID = true, id
			daGui++
		case console.IsRejected(err):
			k.Loi, k.ThongDiep = "console_rejected", err.Error()
			hong++
		default:
			k.Loi, k.ThongDiep = "console_unavailable", "Không gọi được console: "+err.Error()
			hong++
			dung = true // nhung nguoi sau se hong y het; dung de ho con gui lai duoc
		}
		ket = append(ket, k)
		// Mot nguoi thi giu nguyen cach bao loi cu (ma loi rieng, giao dien da biet doc).
		if len(ds) == 1 && err != nil {
			fail(w, err)
			return
		}
	}

	var td string
	switch {
	case len(ds) == 1:
		td = "Đã gửi thư (phiếu #" + strconv.FormatInt(ket[0].MailID, 10) + ")."
	case hong == 0 && boQua == 0:
		td = fmt.Sprintf("Đã gửi %d thư.", daGui)
	default:
		td = fmt.Sprintf("Đã gửi %d, hỏng %d, chưa gửi %d.", daGui, hong, boQua)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"message": td, "sent": daGui, "failed": hong, "skipped": boQua, "results": ket,
	})
}

// ThuDaGui la mot dong lich su, doc tu admin_audit.
type ThuDaGui struct {
	ID       int64  `json:"id"`
	Luc      string `json:"luc"`
	Nguoi    string `json:"nguoi"`
	Srv      string `json:"srv"`
	Role     string `json:"role"`
	RoleName string `json:"role_name"`
	Title    string `json:"title"`
	Content  string `json:"content"`
	Reward   string `json:"reward"`
	QuaTen   string `json:"qua_ten"` // "Kim cuong ×5.000 · Lenh tuong cao cap ×10"
	OK       bool   `json:"ok"`
	Loi      string `json:"loi,omitempty"`
	MailID   int64  `json:"mail_id,omitempty"`
}

// MailHistory tra ve cac thu da gui: cho MOT nhan vat (srv+role) hoac gan day cua moi nguoi.
//
// Doc tu admin_audit chu khong tu bang thu cua game: nhat ky ghi ca lan THAT BAI va ghi ai
// bam — dung thu nguoi truc can biet truoc khi gui lai ("hom qua da den bu roi, ai gui?").
func (s *Service) MailHistory(w http.ResponseWriter, r *http.Request, _ Actor) {
	if s.DB == nil {
		httpx.JSON(w, http.StatusOK, map[string]any{"thu": []ThuDaGui{}})
		return
	}
	q := r.URL.Query()
	srv, role := strings.TrimSpace(q.Get("srv")), strings.TrimSpace(q.Get("role"))
	gioiHan, _ := strconv.Atoi(q.Get("limit"))
	if gioiHan <= 0 || gioiHan > lichSuToiDa {
		gioiHan = 10
	}
	target := ""
	if srv != "" && role != "" {
		target = srv + "/" + role
	}
	rows, err := s.DB.QueryContext(r.Context(), `
		SELECT t.id, t.created_at, COALESCE(u.username, ''), t.target, COALESCE(t.detail, '')
		  FROM admin_audit t LEFT JOIN admin_users u ON u.id = t.admin_id
		 WHERE t.action = 'gm_mail' AND (? = '' OR t.target = ?)
		 ORDER BY t.id DESC
		 LIMIT ?`, target, target, gioiHan)
	if err != nil {
		if s.Log != nil {
			s.Log.Error("doc lich su thu", "err", err)
		}
		httpx.Error(w, http.StatusBadGateway, "db_error", "Không đọc được lịch sử thư.")
		return
	}
	defer rows.Close()
	thu := []ThuDaGui{}
	for rows.Next() {
		var t ThuDaGui
		var luc time.Time
		var tgt, detail string
		if rows.Scan(&t.ID, &luc, &t.Nguoi, &tgt, &detail) != nil {
			continue
		}
		t.Luc = luc.Format(time.RFC3339)
		if i := strings.IndexByte(tgt, '/'); i > 0 {
			t.Srv, t.Role = tgt[:i], tgt[i+1:]
		}
		var d struct {
			Reward   string          `json:"reward"`
			Title    string          `json:"title"`
			Content  string          `json:"content"`
			RoleName string          `json:"role_name"`
			MailID   json.RawMessage `json:"mail_id"`
			OK       bool            `json:"ok"`
			Error    string          `json:"error"`
		}
		_ = json.Unmarshal([]byte(detail), &d)
		t.Reward, t.Title, t.Content, t.RoleName, t.OK, t.Loi = d.Reward, d.Title, d.Content, d.RoleName, d.OK, d.Error
		if n, err := strconv.ParseInt(strings.Trim(string(d.MailID), `"`), 10, 64); err == nil {
			t.MailID = n
		}
		t.QuaTen = moTaQua(t.Reward)
		thu = append(thu, t)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"thu": thu})
}

// moTaQua doi chuoi qua thanh mot dong doc duoc, dung danh muc da doi chieu.
func moTaQua(reward string) string {
	if reward == "" {
		return ""
	}
	var phan []string
	for _, p := range strings.Split(reward, "#") {
		x := strings.SplitN(p, ":", 3)
		if len(x) != 3 {
			continue
		}
		loai, _ := strconv.Atoi(x[0])
		ma, _ := strconv.ParseInt(x[1], 10, 64)
		sl, _ := strconv.ParseInt(x[2], 10, 64)
		ten := TenMuc(loai, ma)
		if ten == "" {
			ten = "mã " + x[0] + ":" + x[1]
		}
		phan = append(phan, ten+" ×"+dauCham(sl))
	}
	return strings.Join(phan, " · ")
}
