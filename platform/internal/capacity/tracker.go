package capacity

import (
	"context"
	"database/sql"
	"log/slog"
	"sync"
	"time"
)

// LoadSource cung cap so lieu tai thoi diem hien tai. Trong thuc te la login server;
// trong test la mot ban gia lap.
type LoadSource interface {
	// Online tra ve map srvCode -> onlineNum.
	Online(ctx context.Context) (map[string]int, error)
}

// Tracker giu anh chup doi server va dem ve giu cho.
//
// Vi sao can ve: onlineNum den tu heartbeat cua game server nen luon tre. Giua hai
// nhip, mot dot nguoi vao o at se thay con so cu va lot het qua cong. Moi lan cong
// cho mot phien di qua, Tracker ghi mot ve; ve chi duoc tinh cho den nhip doc so lieu
// ke tiep (luc do nguoi do da nam trong onlineNum roi) hoac cho den khi het han.
type Tracker struct {
	Source    LoadSource
	DB        *sql.DB
	GameCode  string
	TicketTTL time.Duration
	Log       *slog.Logger

	mu       sync.RWMutex
	fleet    *Fleet
	tickets  map[string][]time.Time // srvCode -> thoi diem cap ve
	lastPoll time.Time
}

func NewTracker(src LoadSource, db *sql.DB, gameCode string, ticketTTL time.Duration, log *slog.Logger) *Tracker {
	return &Tracker{
		Source: src, DB: db, GameCode: gameCode, TicketTTL: ticketTTL, Log: log,
		fleet:   NewFleet(gameCode, nil, nil),
		tickets: map[string][]time.Time{},
	}
}

// loadConfig doc cau hinh nguong tu DB (bang do trang quan tri sua).
func (t *Tracker) loadConfig(ctx context.Context) ([]ServerState, []DeviceState, error) {
	rows, err := t.DB.QueryContext(ctx, `
		SELECT srv_code, name, device_code, soft_limit, overflow_pct, recommend, status
		  FROM game_servers WHERE game_code = ?`, t.GameCode)
	if err != nil {
		return nil, nil, err
	}
	defer func() { _ = rows.Close() }()

	var servers []ServerState
	for rows.Next() {
		var s ServerState
		var status string
		if err := rows.Scan(&s.SrvCode, &s.Name, &s.DeviceCode,
			&s.SoftLimit, &s.OverflowPct, &s.Recommend, &status); err != nil {
			return nil, nil, err
		}
		s.Status = Status(status)
		servers = append(servers, s)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	drows, err := t.DB.QueryContext(ctx,
		`SELECT device_code, name, max_online FROM game_devices WHERE game_code = ?`, t.GameCode)
	if err != nil {
		return nil, nil, err
	}
	defer func() { _ = drows.Close() }()

	var devices []DeviceState
	for drows.Next() {
		var d DeviceState
		if err := drows.Scan(&d.DeviceCode, &d.Name, &d.MaxOnline); err != nil {
			return nil, nil, err
		}
		devices = append(devices, d)
	}
	return servers, devices, drows.Err()
}

// Refresh doc lai cau hinh tu DB va so lieu tai tu login server.
func (t *Tracker) Refresh(ctx context.Context) error {
	servers, devices, err := t.loadConfig(ctx)
	if err != nil {
		return err
	}
	online, err := t.Source.Online(ctx)
	if err != nil {
		return err
	}

	now := time.Now()
	t.mu.Lock()
	defer t.mu.Unlock()

	for i := range servers {
		servers[i].OnlineNum = online[servers[i].SrvCode]
	}
	// Ve cap TRUOC nhip nay coi nhu da nam trong onlineNum -> bo di.
	// Ve cap SAU nhip nay van con duoc tinh them.
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
	return nil
}

// Run chay vong lap doc so lieu cho den khi ctx bi huy.
func (t *Tracker) Run(ctx context.Context, every time.Duration) {
	tk := time.NewTicker(every)
	defer tk.Stop()
	if err := t.Refresh(ctx); err != nil && t.Log != nil {
		t.Log.Warn("doc so lieu tai that bai", "err", err)
	}
	for {
		select {
		case <-ctx.Done():
			return
		case <-tk.C:
			if err := t.Refresh(ctx); err != nil && t.Log != nil {
				t.Log.Warn("doc so lieu tai that bai", "err", err)
			}
		}
	}
}

// snapshot tra ve Fleet hien tai da cong ve giu cho.
func (t *Tracker) snapshot() *Fleet {
	t.mu.RLock()
	defer t.mu.RUnlock()
	now := time.Now()
	servers := make([]ServerState, 0, len(t.fleet.Servers))
	for _, s := range t.fleet.Servers {
		n := 0
		for _, at := range t.tickets[s.SrvCode] {
			if at.After(t.lastPoll) && now.Sub(at) < t.TicketTTL {
				n++
			}
		}
		s.Reservations = n
		servers = append(servers, s)
	}
	devices := make([]DeviceState, 0, len(t.fleet.Devices))
	for _, d := range t.fleet.Devices {
		devices = append(devices, d)
	}
	return NewFleet(t.GameCode, servers, devices)
}

// Fleet tra ve anh chup hien tai (chi doc, dung cho danh sach server va trang quan tri).
func (t *Tracker) Fleet() *Fleet { return t.snapshot() }

// reserve ghi mot ve cho server.
func (t *Tracker) reserve(srvCode string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.tickets[srvCode] = append(t.tickets[srvCode], time.Now())
}

// AdmitReturning quyet dinh cho nguoi choi da co nhan vat, va giu cho neu duoc vao.
func (t *Tracker) AdmitReturning(srvCode string) Decision {
	d := t.snapshot().AdmitReturning(srvCode)
	if d.Allowed {
		t.reserve(d.SrvCode)
	}
	return d
}

// AdmitNew chon server cho nguoi choi moi va giu cho.
func (t *Tracker) AdmitNew() Decision {
	d := t.snapshot().AdmitNew()
	if d.Allowed {
		t.reserve(d.SrvCode)
	}
	return d
}
