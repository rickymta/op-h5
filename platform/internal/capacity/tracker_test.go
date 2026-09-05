package capacity

import (
	"context"
	"testing"
	"time"
)

// fakeSource thay cho login server trong test.
type fakeSource struct{ m map[string]int }

func (f *fakeSource) Online(context.Context) (map[string]int, error) { return f.m, nil }

// newTestTracker dung Tracker khong can DB: nap thang cau hinh vao fleet.
func newTestTracker(src LoadSource, servers []ServerState, devices []DeviceState, ttl time.Duration) *Tracker {
	t := &Tracker{
		Source: src, GameCode: "haitac", TicketTTL: ttl,
		fleet: NewFleet("haitac", servers, devices), tickets: map[string]map[int64]time.Time{}, prevOnline: map[string]int{},
	}
	return t
}

// refreshWith mo phong mot nhip doc so lieu ma khong can DB.
func (t *Tracker) refreshWith(servers []ServerState, devices []DeviceState, online map[string]int) {
	now := time.Now()
	t.mu.Lock()
	defer t.mu.Unlock()
	for i := range servers {
		servers[i].OnlineNum = online[servers[i].SrvCode]
	}
	for i := range servers {
		code := servers[i].SrvCode
		if delta := servers[i].OnlineNum - t.prevOnline[code]; delta > 0 {
			releaseOldest(t.tickets[code], delta)
		}
		t.prevOnline[code] = servers[i].OnlineNum
	}
	for code, byUser := range t.tickets {
		for user, at := range byUser {
			if now.Sub(at) >= t.TicketTTL {
				delete(byUser, user)
			}
		}
		if len(byUser) == 0 {
			delete(t.tickets, code)
		}
	}
	for i := range servers {
		servers[i].Reservations = len(t.tickets[servers[i].SrvCode])
	}
	t.fleet = NewFleet(t.GameCode, servers, devices)
}

// Day la ly do Tracker ton tai: giua hai nhip heartbeat, ve giu cho phai chan duoc
// dot vao o at. Khong co no, ca 200 nguoi deu thay onlineNum cu va lot het.
func TestTicketsStopBurstBetweenHeartbeats(t *testing.T) {
	servers := []ServerState{{
		SrvCode: "s1", Name: "S1", DeviceCode: "host-01", Status: StatusRunning,
		Recommend: true, SoftLimit: 100, OverflowPct: 15, // tran cung = 115
	}}
	tr := newTestTracker(&fakeSource{m: map[string]int{"s1": 110}}, servers, nil, time.Minute)
	tr.refreshWith(servers, nil, map[string]int{"s1": 110})

	admitted := 0
	for i := range 20 { // hai muoi nguoi KHAC NHAU vao trong cung mot nhip
		if tr.AdmitReturning(int64(i), "s1").Allowed {
			admitted++
		}
	}
	// 110 + 5 ve = 115 = tran cung -> tu ve thu 6 tro di phai bi chan.
	if admitted != 5 {
		t.Errorf("cho vao %d nguoi, chi duoc phep 5 (110 + 5 = tran cung 115)", admitted)
	}
}

// Sau khi heartbeat cap nhat, nhung nguoi da vao nam trong onlineNum nen ve cu phai
// duoc bo di — neu khong se bi tinh hai lan va chan oan.
func TestTicketsClearedAfterHeartbeatCatchesUp(t *testing.T) {
	servers := []ServerState{{
		SrvCode: "s1", Name: "S1", DeviceCode: "host-01", Status: StatusRunning,
		Recommend: true, SoftLimit: 100, OverflowPct: 15,
	}}
	tr := newTestTracker(&fakeSource{}, servers, nil, time.Minute)
	tr.refreshWith(servers, nil, map[string]int{"s1": 100})

	for i := range 5 { // nam nguoi khac nhau
		tr.AdmitReturning(int64(i), "s1")
	}
	if got := tr.Fleet().Servers["s1"].Effective(); got != 105 {
		t.Fatalf("tai hieu dung = %d, muon 105 (100 + 5 ve)", got)
	}

	// Nhip moi: heartbeat da thay 105 nguoi. Ve cu phai bien mat.
	tr.refreshWith(servers, nil, map[string]int{"s1": 105})
	if got := tr.Fleet().Servers["s1"].Effective(); got != 105 {
		t.Errorf("tai hieu dung = %d sau heartbeat, muon 105 — ve cu bi tinh hai lan", got)
	}
}

// Ve phai het han: nguoi bam vao roi bo di khong duoc chiem cho mai mai.
func TestTicketsExpire(t *testing.T) {
	servers := []ServerState{{
		SrvCode: "s1", Name: "S1", DeviceCode: "host-01", Status: StatusRunning,
		Recommend: true, SoftLimit: 100, OverflowPct: 15,
	}}
	tr := newTestTracker(&fakeSource{}, servers, nil, 50*time.Millisecond)
	tr.refreshWith(servers, nil, map[string]int{"s1": 100})

	for i := range 3 { // ba nguoi khac nhau
		tr.AdmitReturning(int64(i), "s1")
	}
	if got := tr.Fleet().Servers["s1"].Effective(); got != 103 {
		t.Fatalf("tai = %d, muon 103", got)
	}
	time.Sleep(80 * time.Millisecond)
	if got := tr.Fleet().Servers["s1"].Effective(); got != 100 {
		t.Errorf("sau khi ve het han, tai = %d, muon 100", got)
	}
}

// Nguoi choi moi duoc chia deu: khong don het vao mot server chi vi no dang it nguoi
// nhat tai thoi diem doc so lieu.
func TestNewPlayersSpreadAcrossServers(t *testing.T) {
	servers := []ServerState{
		{SrvCode: "s1", Name: "S1", DeviceCode: "h1", Status: StatusRunning, Recommend: true, SoftLimit: 100, OverflowPct: 15},
		{SrvCode: "s2", Name: "S2", DeviceCode: "h1", Status: StatusRunning, Recommend: true, SoftLimit: 100, OverflowPct: 15},
	}
	tr := newTestTracker(&fakeSource{}, servers, nil, time.Minute)
	tr.refreshWith(servers, nil, map[string]int{"s1": 10, "s2": 10})

	counts := map[string]int{}
	for i := range 10 { // muoi nguoi KHAC NHAU
		if d := tr.AdmitNew(int64(i)); d.Allowed {
			counts[d.SrvCode]++
		}
	}
	if counts["s1"] == 0 || counts["s2"] == 0 {
		t.Errorf("nguoi moi phai duoc chia cho ca hai server, duoc %v", counts)
	}
	if diff := counts["s1"] - counts["s2"]; diff > 1 || diff < -1 {
		t.Errorf("chia khong deu: %v", counts)
	}
}

func TestDeviceCapAppliesAcrossServers(t *testing.T) {
	servers := []ServerState{
		{SrvCode: "s1", Name: "S1", DeviceCode: "h1", Status: StatusRunning, Recommend: true, SoftLimit: 100, OverflowPct: 15},
		{SrvCode: "s2", Name: "S2", DeviceCode: "h1", Status: StatusRunning, Recommend: true, SoftLimit: 100, OverflowPct: 15},
	}
	devices := []DeviceState{{DeviceCode: "h1", Name: "host-01", MaxOnline: 100}}
	tr := newTestTracker(&fakeSource{}, servers, devices, time.Minute)
	tr.refreshWith(servers, devices, map[string]int{"s1": 48, "s2": 48}) // tong 96, tran may 100

	admitted := 0
	for i := range 10 { // muoi nguoi KHAC NHAU
		if tr.AdmitNew(int64(i)).Allowed {
			admitted++
		}
	}
	if admitted != 4 {
		t.Errorf("cho vao %d, chi duoc 4 (96 + 4 = tran may 100)", admitted)
	}
}

// Fleet() phai la anh chup CHI DOC: goi bao nhieu lan cung khong duoc giu cho.
//
// Vi sao can khoa dieu nay bang test: `/choi-game` goi Fleet().AdmitNew() de chan som
// va hien trang "may chu qua tai", roi `/api/game/session` moi giu ve that. Neu Fleet()
// lo giu cho thi moi nguoi choi bi dem hai lan — cong tu that chat gap doi nguong da
// cau hinh, va trieu chung ("server day trong khi bang dieu khien bao con nua cho")
// rat kho lan ra nguyen nhan.
func TestFleetSnapshotDoesNotReserve(t *testing.T) {
	servers := []ServerState{{
		SrvCode: "s1", Name: "S1", DeviceCode: "host-01", Status: StatusRunning,
		Recommend: true, SoftLimit: 100, OverflowPct: 15,
	}}
	tr := newTestTracker(&fakeSource{}, servers, nil, time.Minute)
	tr.refreshWith(servers, nil, map[string]int{"s1": 10})

	for range 20 {
		if d := tr.Fleet().AdmitNew(); !d.Allowed {
			t.Fatalf("anh chup phai cho vao, nhan duoc %q", d.Reason)
		}
	}

	tr.mu.RLock()
	held := len(tr.tickets["s1"])
	tr.mu.RUnlock()
	if held != 0 {
		t.Fatalf("Fleet() da giu %d cho, phai la 0", held)
	}
	if got := tr.Fleet().Servers["s1"].Effective(); got != 10 {
		t.Fatalf("tai hieu dung = %d, phai van la 10", got)
	}

	// Con AdmitNew() that thi van phai giu cho nhu cu.
	if d := tr.AdmitNew(1); !d.Allowed {
		t.Fatalf("AdmitNew that bai: %q", d.Reason)
	}
	tr.mu.RLock()
	held = len(tr.tickets["s1"])
	tr.mu.RUnlock()
	if held != 1 {
		t.Fatalf("AdmitNew phai giu dung 1 cho, dang giu %d", held)
	}
}

// Mot nguoi goi nhieu lan chi duoc dem la MOT.
//
// Do bang tay truoc khi doi khoa ve sang theo nguoi: tai /play.php 15 lan lam tai hieu
// dung cua mot may chu nhay tu 20 len 35 — 15 nguoi choi ma. Tu khoi sau mot nhip doc,
// nhung sat nguong thi du de tu choi oan nguoi khac trong ca nhip do.
func TestRepeatedAdmitCountsOnePlayer(t *testing.T) {
	servers := []ServerState{{
		SrvCode: "s1", Name: "S1", DeviceCode: "host-01", Status: StatusRunning,
		Recommend: true, SoftLimit: 500, OverflowPct: 15,
	}}
	tr := newTestTracker(&fakeSource{}, servers, nil, time.Minute)
	tr.refreshWith(servers, nil, map[string]int{"s1": 20})

	for range 15 {
		if d := tr.AdmitReturning(7, "s1"); !d.Allowed {
			t.Fatalf("phai cho vao, nhan duoc %q", d.Reason)
		}
	}
	if got := tr.Fleet().Servers["s1"].Effective(); got != 21 {
		t.Fatalf("tai hieu dung = %d, phai la 21 (20 dang choi + 1 nguoi giu cho)", got)
	}

	// Nguoi khac thi van cong them.
	tr.AdmitReturning(8, "s1")
	if got := tr.Fleet().Servers["s1"].Effective(); got != 22 {
		t.Fatalf("tai hieu dung = %d, phai la 22 sau khi nguoi thu hai vao", got)
	}
}

// Doi may chu thi khong duoc de lai cho o may cu.
func TestSwitchingServerMovesTheTicket(t *testing.T) {
	servers := []ServerState{
		{SrvCode: "s1", Name: "S1", DeviceCode: "h1", Status: StatusRunning, Recommend: true, SoftLimit: 500, OverflowPct: 15},
		{SrvCode: "s2", Name: "S2", DeviceCode: "h1", Status: StatusRunning, Recommend: true, SoftLimit: 500, OverflowPct: 15},
	}
	tr := newTestTracker(&fakeSource{}, servers, nil, time.Minute)
	tr.refreshWith(servers, nil, map[string]int{"s1": 10, "s2": 10})

	tr.AdmitReturning(7, "s1")
	tr.AdmitReturning(7, "s2")
	f := tr.Fleet()
	if got := f.Servers["s1"].Effective(); got != 10 {
		t.Fatalf("s1 = %d, phai tro ve 10 sau khi nguoi do chuyen di", got)
	}
	if got := f.Servers["s2"].Effective(); got != 11 {
		t.Fatalf("s2 = %d, phai la 11", got)
	}
}

// Release tra lai cho khi cap phien that bai.
func TestReleaseGivesTheSlotBack(t *testing.T) {
	servers := []ServerState{{
		SrvCode: "s1", Name: "S1", DeviceCode: "host-01", Status: StatusRunning,
		Recommend: true, SoftLimit: 500, OverflowPct: 15,
	}}
	tr := newTestTracker(&fakeSource{}, servers, nil, time.Minute)
	tr.refreshWith(servers, nil, map[string]int{"s1": 10})

	tr.AdmitReturning(7, "s1")
	if got := tr.Fleet().Servers["s1"].Effective(); got != 11 {
		t.Fatalf("truoc khi tra: %d, phai la 11", got)
	}
	tr.Release(7)
	if got := tr.Fleet().Servers["s1"].Effective(); got != 10 {
		t.Fatalf("sau khi tra: %d, phai tro ve 10", got)
	}
}

// Ve chi duoc nha khi heartbeat THAT SU tang, khong phai khi den nhip doc ke tiep.
//
// Ban dau ve ngung duoc dem ngay o nhip sau, voi gia dinh "den luc nay nguoi do da nam
// trong onlineNum". Gia dinh do sai: client phai tai ~9,4 MB roi con chon may chu moi
// noi WebSocket. Trong khoang do nguoi da duoc cho vao khong nam trong onlineNum ma cung
// khong con ve — vo hinh, va cong dem thieu dung luc dong nguoi nhat.
func TestTicketHeldUntilHeartbeatActuallyRises(t *testing.T) {
	servers := []ServerState{{
		SrvCode: "s1", Name: "S1", DeviceCode: "host-01", Status: StatusRunning,
		Recommend: true, SoftLimit: 500, OverflowPct: 15,
	}}
	tr := newTestTracker(&fakeSource{}, servers, nil, time.Hour)
	tr.refreshWith(servers, nil, map[string]int{"s1": 10})

	tr.AdmitReturning(7, "s1")
	if got := tr.Fleet().Servers["s1"].Effective(); got != 11 {
		t.Fatalf("ngay sau khi giu cho: %d, muon 11", got)
	}

	// Ba nhip troi qua ma nguoi do van dang tai client: ve PHAI con.
	for i := range 3 {
		tr.refreshWith(servers, nil, map[string]int{"s1": 10})
		if got := tr.Fleet().Servers["s1"].Effective(); got != 11 {
			t.Fatalf("sau nhip %d: %d, muon 11 — nguoi choi chua vao thi khong duoc nha ve", i+1, got)
		}
	}

	// Heartbeat thay ho: nha ve, khong duoc dem hai lan.
	tr.refreshWith(servers, nil, map[string]int{"s1": 11})
	if got := tr.Fleet().Servers["s1"].Effective(); got != 11 {
		t.Fatalf("sau khi heartbeat bat kip: %d, muon 11 (khong duoc tinh hai lan)", got)
	}
}

// Ai bam vao roi bo di phai duoc thu hoi cho, du heartbeat khong bao gio tang.
func TestAbandonedTicketExpires(t *testing.T) {
	servers := []ServerState{{
		SrvCode: "s1", Name: "S1", DeviceCode: "host-01", Status: StatusRunning,
		Recommend: true, SoftLimit: 500, OverflowPct: 15,
	}}
	tr := newTestTracker(&fakeSource{}, servers, nil, 50*time.Millisecond)
	tr.refreshWith(servers, nil, map[string]int{"s1": 10})

	tr.AdmitReturning(7, "s1")
	time.Sleep(80 * time.Millisecond)
	if got := tr.Fleet().Servers["s1"].Effective(); got != 10 {
		t.Fatalf("sau khi ve het han: %d, muon 10", got)
	}
}
