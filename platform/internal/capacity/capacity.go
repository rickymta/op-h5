// Package capacity quyet dinh mot phien choi moi co duoc vao hay khong, va vao server nao.
//
// Vi sao logic nay nam o day chu khong nam trong game:
// login server (Java, khong co ma nguon) co truong srv_game.playerMax nhung KHONG lop
// nao doc no — da kiem chung bang cach quet toan bo class. getConnectTarget() tra ve
// dia chi tien trinh game ma khong he kiem tra tai. Nen cho chan duy nhat kha thi la
// Adapter, dat truoc /srv/game/connect/target.
//
// Ba tang nguong, kiem tra tu trong ra ngoai:
//  1. Server      — nguong mem N rieng cho tung dong srv_game.
//  2. May vat ly  — tong cua moi server cung device_code, bao ve RAM/CPU that.
//  3. Toan game   — chi de canh bao dung luong, khong dung de chan.
package capacity

import "sort"

// Band la dai trang thai cua mot server.
type Band uint8

const (
	BandSmooth Band = iota // online < N
	BandBusy               // N <= online < N*(1+r)
	BandFull               // online >= N*(1+r)
)

func (b Band) String() string {
	switch b {
	case BandSmooth:
		return "smooth"
	case BandBusy:
		return "busy"
	default:
		return "full"
	}
}

// Label tra ve nhan hien cho nguoi choi.
func (b Band) Label() string {
	switch b {
	case BandSmooth:
		return "Mượt"
	case BandBusy:
		return "Đông"
	default:
		return "Đầy"
	}
}

type Status string

const (
	StatusRunning  Status = "running"
	StatusMaintain Status = "maintain"
	StatusClosed   Status = "closed"
	StatusMerged   Status = "merged" // da bi gop: khong nhan nguoi moi, van cho nguoi cu vao
)

// ServerState la anh chup tai cua mot game server tai mot thoi diem.
type ServerState struct {
	SrvCode    string
	Name       string
	DeviceCode string
	Status     Status
	Recommend  bool

	SoftLimit   int // N
	OverflowPct int // r, tinh theo phan tram

	// OnlineNum den tu heartbeat cua login server nen LUON TRE mot nhip.
	OnlineNum int
	// Reservations la so ve da cap ke tu nhip heartbeat gan nhat. Khong cong no vao
	// thi mot dot vao o at giua hai nhip se lot qua cong truoc khi he thong kip biet
	// minh da day.
	Reservations int
}

// Effective la tai thuc te dung de ra quyet dinh.
func (s ServerState) Effective() int { return s.OnlineNum + s.Reservations }

// HardLimit la nguong chan cung: N*(1+r/100).
func (s ServerState) HardLimit() int {
	if s.SoftLimit <= 0 {
		return 0
	}
	return s.SoftLimit * (100 + s.OverflowPct) / 100
}

// Band tra ve dai trang thai hien tai.
func (s ServerState) Band() Band {
	if s.SoftLimit <= 0 {
		return BandSmooth // chua cau hinh nguong: khong chan
	}
	switch e := s.Effective(); {
	case e < s.SoftLimit:
		return BandSmooth
	case e < s.HardLimit():
		return BandBusy
	default:
		return BandFull
	}
}

// AcceptsReturning cho biet server co nhan lai nguoi choi da co nhan vat khong.
// Server da gop van nhan nguoi cu; server dong hoac bao tri thi khong.
func (s ServerState) AcceptsReturning() bool {
	return s.Status == StatusRunning || s.Status == StatusMerged
}

// AcceptsNew cho biet server co nam trong tap chon cho nguoi choi moi khong.
func (s ServerState) AcceptsNew() bool {
	return s.Status == StatusRunning && s.Recommend && s.Band() == BandSmooth
}

// DeviceState la tran cua mot may vat ly.
type DeviceState struct {
	DeviceCode string
	Name       string
	MaxOnline  int
}

// Reason giai thich vi sao mot quyet dinh duoc dua ra.
type Reason string

const (
	ReasonOK             Reason = "ok"
	ReasonServerFull     Reason = "server_full"
	ReasonDeviceFull     Reason = "device_full"
	ReasonServerClosed   Reason = "server_closed"
	ReasonServerMaintain Reason = "server_maintain"
	ReasonServerUnknown  Reason = "server_unknown"
	ReasonNoServerForNew Reason = "no_server_for_new"
)

// Decision la ket qua cua cong.
type Decision struct {
	Allowed bool
	Reason  Reason
	SrvCode string
	Band    Band
	// Alternatives la cac server con cho, goi y khi bi tu choi hoac khi server dang Dong.
	Alternatives []string
	// Warn bat khi server da vuot nguong mem nhung van cho vao — trang quan tri
	// dung co nay de canh bao.
	Warn bool
}

// Fleet la toan bo doi server cua mot game tai mot thoi diem.
type Fleet struct {
	GameCode string
	Servers  map[string]ServerState
	Devices  map[string]DeviceState
}

// NewFleet dung Fleet tu danh sach phang.
func NewFleet(gameCode string, servers []ServerState, devices []DeviceState) *Fleet {
	f := &Fleet{
		GameCode: gameCode,
		Servers:  make(map[string]ServerState, len(servers)),
		Devices:  make(map[string]DeviceState, len(devices)),
	}
	for _, s := range servers {
		f.Servers[s.SrvCode] = s
	}
	for _, d := range devices {
		f.Devices[d.DeviceCode] = d
	}
	return f
}

// DeviceLoad tra ve tong tai thuc te cua moi server tren mot may.
func (f *Fleet) DeviceLoad(deviceCode string) int {
	total := 0
	for _, s := range f.Servers {
		if s.DeviceCode == deviceCode {
			total += s.Effective()
		}
	}
	return total
}

// deviceHasRoom cho biet may con cho de nhan them mot phien.
// MaxOnline <= 0 nghia la chua dat tran cho may do.
func (f *Fleet) deviceHasRoom(deviceCode string) bool {
	d, ok := f.Devices[deviceCode]
	if !ok || d.MaxOnline <= 0 {
		return true
	}
	return f.DeviceLoad(deviceCode) < d.MaxOnline
}

// openForNew liet ke cac server con nhan nguoi moi, sap theo tai tang dan roi theo
// ma server de ket qua on dinh giua cac lan goi.
func (f *Fleet) openForNew() []ServerState {
	out := make([]ServerState, 0, len(f.Servers))
	for _, s := range f.Servers {
		if s.AcceptsNew() && f.deviceHasRoom(s.DeviceCode) {
			out = append(out, s)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Effective() != out[j].Effective() {
			return out[i].Effective() < out[j].Effective()
		}
		return out[i].SrvCode < out[j].SrvCode
	})
	return out
}

func codes(list []ServerState, limit int) []string {
	out := make([]string, 0, limit)
	for i, s := range list {
		if i >= limit {
			break
		}
		out = append(out, s.SrvCode)
	}
	return out
}

// AdmitReturning quyet dinh cho mot nguoi choi DA CO nhan vat tren srvCode.
// Ho luon ve dung server cu, ke ca khi server dang Dong — chi chan o dai Day.
func (f *Fleet) AdmitReturning(srvCode string) Decision {
	s, ok := f.Servers[srvCode]
	if !ok {
		return Decision{Reason: ReasonServerUnknown, SrvCode: srvCode}
	}
	if !s.AcceptsReturning() {
		r := ReasonServerClosed
		if s.Status == StatusMaintain {
			r = ReasonServerMaintain
		}
		return Decision{Reason: r, SrvCode: srvCode, Band: s.Band()}
	}
	band := s.Band()
	if band == BandFull {
		return Decision{
			Reason:       ReasonServerFull,
			SrvCode:      srvCode,
			Band:         band,
			Alternatives: codes(f.openForNew(), 3),
		}
	}
	// Tran cua may kiem tra sau tran cua server: nguoi bi chan o day nen duoc goi y
	// sang may khac chu khong phai xep hang.
	if !f.deviceHasRoom(s.DeviceCode) {
		return Decision{
			Reason:       ReasonDeviceFull,
			SrvCode:      srvCode,
			Band:         band,
			Alternatives: codes(f.openForNew(), 3),
		}
	}
	return Decision{
		Allowed: true,
		Reason:  ReasonOK,
		SrvCode: srvCode,
		Band:    band,
		Warn:    band == BandBusy,
		// Dang Dong thi van cho vao nhung goi y them lua chon khac.
		Alternatives: func() []string {
			if band == BandBusy {
				return codes(f.openForNew(), 3)
			}
			return nil
		}(),
	}
}

// AdmitNew chon server cho nguoi choi MOI: uu tien server con it nguoi nhat trong
// tap duoc goi y, dang Muot, va may con cho.
func (f *Fleet) AdmitNew() Decision {
	open := f.openForNew()
	if len(open) == 0 {
		return Decision{Reason: ReasonNoServerForNew}
	}
	s := open[0]
	return Decision{
		Allowed:      true,
		Reason:       ReasonOK,
		SrvCode:      s.SrvCode,
		Band:         s.Band(),
		Alternatives: codes(open[1:], 2),
	}
}

// Utilization tra ve ty le su dung cua ca game, dung cho canh bao dung luong.
// Khong dung de chan.
func (f *Fleet) Utilization() (online, softTotal int) {
	for _, s := range f.Servers {
		if s.Status == StatusRunning {
			online += s.Effective()
			softTotal += s.SoftLimit
		}
	}
	return
}
