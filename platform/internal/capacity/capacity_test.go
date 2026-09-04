package capacity

import "testing"

func srv(code, device string, soft, online, resv int) ServerState {
	return ServerState{
		SrvCode: code, Name: code, DeviceCode: device,
		Status: StatusRunning, Recommend: true,
		SoftLimit: soft, OverflowPct: 15,
		OnlineNum: online, Reservations: resv,
	}
}

func TestBandBoundaries(t *testing.T) {
	// N=800, r=15% -> tran cung 920.
	cases := []struct {
		online int
		want   Band
	}{
		{0, BandSmooth},
		{799, BandSmooth},
		{800, BandBusy},  // cham dung nguong mem -> da la Dong
		{919, BandBusy},
		{920, BandFull},  // cham tran cung -> Day
		{2000, BandFull},
	}
	for _, c := range cases {
		s := srv("s1", "host-01", 800, c.online, 0)
		if got := s.Band(); got != c.want {
			t.Errorf("online=%d: band=%v, muon %v", c.online, got, c.want)
		}
	}
}

func TestHardLimitRounding(t *testing.T) {
	s := srv("s1", "host-01", 800, 0, 0)
	if got := s.HardLimit(); got != 920 {
		t.Errorf("HardLimit=%d, muon 920", got)
	}
	s.OverflowPct = 10
	if got := s.HardLimit(); got != 880 {
		t.Errorf("HardLimit(r=10)=%d, muon 880", got)
	}
}

// Diem quan trong: onlineNum den tu heartbeat nen tre. Ve da cap phai duoc cong vao,
// neu khong mot dot vao o at giua hai nhip se lot qua cong.
func TestReservationsCountTowardLoad(t *testing.T) {
	s := srv("s1", "host-01", 800, 910, 0)
	if s.Band() != BandBusy {
		t.Fatalf("chua co ve: muon Busy, duoc %v", s.Band())
	}
	s.Reservations = 10 // 910 + 10 = 920 = tran cung
	if s.Band() != BandFull {
		t.Errorf("co 10 ve: muon Full, duoc %v (effective=%d)", s.Band(), s.Effective())
	}
}

func TestReturningPlayerAllowedWhileBusy(t *testing.T) {
	// Nguoi da co nhan vat van ve dung server cu khi server dang Dong.
	f := NewFleet("haitac", []ServerState{srv("s1", "host-01", 800, 850, 0)}, nil)
	d := f.AdmitReturning("s1")
	if !d.Allowed {
		t.Fatalf("muon cho vao, bi tu choi: %s", d.Reason)
	}
	if !d.Warn {
		t.Error("dai Dong phai bat co Warn de trang quan tri canh bao")
	}
	if d.Band != BandBusy {
		t.Errorf("band=%v, muon Busy", d.Band)
	}
}

func TestReturningPlayerBlockedWhenFull(t *testing.T) {
	f := NewFleet("haitac", []ServerState{
		srv("s1", "host-01", 800, 950, 0), // Day
		srv("s2", "host-01", 800, 100, 0), // con nhieu cho
	}, nil)
	d := f.AdmitReturning("s1")
	if d.Allowed {
		t.Fatal("server da Day ma van cho vao")
	}
	if d.Reason != ReasonServerFull {
		t.Errorf("reason=%s, muon server_full", d.Reason)
	}
	if len(d.Alternatives) == 0 || d.Alternatives[0] != "s2" {
		t.Errorf("phai goi y s2, duoc %v", d.Alternatives)
	}
}

func TestMergedServerTakesReturningButNotNew(t *testing.T) {
	s := srv("s1", "host-01", 800, 10, 0)
	s.Status = StatusMerged
	f := NewFleet("haitac", []ServerState{s, srv("s2", "host-01", 800, 20, 0)}, nil)

	if d := f.AdmitReturning("s1"); !d.Allowed {
		t.Errorf("server da gop phai nhan lai nguoi cu, bi tu choi: %s", d.Reason)
	}
	if d := f.AdmitNew(); d.SrvCode == "s1" {
		t.Error("server da gop khong duoc nhan nguoi moi")
	}
}

func TestMaintenanceBlocksEveryone(t *testing.T) {
	s := srv("s1", "host-01", 800, 10, 0)
	s.Status = StatusMaintain
	f := NewFleet("haitac", []ServerState{s}, nil)
	d := f.AdmitReturning("s1")
	if d.Allowed || d.Reason != ReasonServerMaintain {
		t.Errorf("bao tri phai chan: allowed=%v reason=%s", d.Allowed, d.Reason)
	}
}

// Tang 2: hai server deu con cho nhung cong lai vuot suc may.
func TestDeviceTierBlocksEvenWhenServersHaveRoom(t *testing.T) {
	f := NewFleet("haitac",
		[]ServerState{
			srv("s1", "host-01", 800, 700, 0), // Muot
			srv("s2", "host-01", 800, 700, 0), // Muot
			srv("s3", "host-02", 800, 50, 0),  // may khac
		},
		[]DeviceState{
			{DeviceCode: "host-01", MaxOnline: 1200}, // 700+700 = 1400 > 1200
			{DeviceCode: "host-02", MaxOnline: 1600},
		})

	if got := f.DeviceLoad("host-01"); got != 1400 {
		t.Fatalf("DeviceLoad(host-01)=%d, muon 1400", got)
	}
	d := f.AdmitReturning("s1")
	if d.Allowed {
		t.Fatal("may da vuot tran ma van cho vao")
	}
	if d.Reason != ReasonDeviceFull {
		t.Errorf("reason=%s, muon device_full", d.Reason)
	}
	// Bi chan o tang may thi phai duoc goi y sang may khac, khong phai xep hang.
	if len(d.Alternatives) == 0 || d.Alternatives[0] != "s3" {
		t.Errorf("phai goi y s3 tren may khac, duoc %v", d.Alternatives)
	}
}

func TestNewPlayerPicksLeastLoaded(t *testing.T) {
	f := NewFleet("haitac", []ServerState{
		srv("s1", "host-01", 800, 600, 0),
		srv("s2", "host-01", 800, 120, 0), // it nguoi nhat
		srv("s3", "host-02", 800, 300, 0),
	}, nil)
	d := f.AdmitNew()
	if !d.Allowed || d.SrvCode != "s2" {
		t.Errorf("muon chon s2, duoc %s (allowed=%v)", d.SrvCode, d.Allowed)
	}
}

func TestNewPlayerSkipsNonRecommended(t *testing.T) {
	s2 := srv("s2", "host-01", 800, 10, 0)
	s2.Recommend = false // bi gat khoi danh sach goi y
	f := NewFleet("haitac", []ServerState{srv("s1", "host-01", 800, 600, 0), s2}, nil)
	if d := f.AdmitNew(); d.SrvCode != "s1" {
		t.Errorf("muon s1 (s2 khong duoc goi y), duoc %s", d.SrvCode)
	}
}

func TestNewPlayerNoServerAvailable(t *testing.T) {
	// Moi server deu Dong tro len -> khong con cho cho nguoi moi.
	f := NewFleet("haitac", []ServerState{
		srv("s1", "host-01", 800, 850, 0),
		srv("s2", "host-01", 800, 900, 0),
	}, nil)
	d := f.AdmitNew()
	if d.Allowed || d.Reason != ReasonNoServerForNew {
		t.Errorf("allowed=%v reason=%s, muon no_server_for_new", d.Allowed, d.Reason)
	}
}

func TestUnknownServer(t *testing.T) {
	f := NewFleet("haitac", nil, nil)
	if d := f.AdmitReturning("s9"); d.Allowed || d.Reason != ReasonServerUnknown {
		t.Errorf("server la phai bi tu choi, duoc %+v", d)
	}
}

func TestZeroSoftLimitDoesNotBlock(t *testing.T) {
	// Chua cau hinh nguong thi khong duoc tu nhien chan nguoi choi.
	s := srv("s1", "host-01", 0, 5000, 0)
	if s.Band() != BandSmooth {
		t.Errorf("SoftLimit=0 phai la Smooth, duoc %v", s.Band())
	}
}

func TestUtilization(t *testing.T) {
	closed := srv("s3", "host-02", 800, 400, 0)
	closed.Status = StatusClosed
	f := NewFleet("haitac", []ServerState{
		srv("s1", "host-01", 800, 400, 10),
		srv("s2", "host-01", 700, 200, 0),
		closed, // khong tinh vao dung luong
	}, nil)
	online, soft := f.Utilization()
	if online != 610 || soft != 1500 {
		t.Errorf("Utilization=(%d,%d), muon (610,1500)", online, soft)
	}
}
