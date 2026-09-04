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
		fleet: NewFleet("haitac", servers, devices), tickets: map[string][]time.Time{},
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
	for code, ts := range t.tickets {
		kept := ts[:0]
		for _, at := range ts {
			if at.After(t.lastPoll) && now.Sub(at) < t.TicketTTL {
				kept = append(kept, at)
			}
		}
		if len(kept) == 0 {
			delete(t.tickets, code)
		} else {
			t.tickets[code] = kept
		}
	}
	for i := range servers {
		servers[i].Reservations = len(t.tickets[servers[i].SrvCode])
	}
	t.fleet = NewFleet(t.GameCode, servers, devices)
	t.lastPoll = now
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
	for range 20 {
		if tr.AdmitReturning("s1").Allowed {
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

	for range 5 {
		tr.AdmitReturning("s1")
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

	for range 3 {
		tr.AdmitReturning("s1")
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
	for range 10 {
		if d := tr.AdmitNew(); d.Allowed {
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
	for range 10 {
		if tr.AdmitNew().Allowed {
			admitted++
		}
	}
	if admitted != 4 {
		t.Errorf("cho vao %d, chi duoc 4 (96 + 4 = tran may 100)", admitted)
	}
}
