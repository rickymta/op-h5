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

	mu    sync.RWMutex
	fleet *Fleet
	// tickets: srvCode -> userID -> thoi diem cap ve.
	//
	// Khoa theo NGUOI chu khong phai theo luot goi. Mot nguoi goi lai (bam F5, mang
	// chap chon, client thu lai) chi thay ve cu chu khong cong them mot ve moi — do
	// bao gio cung van la mot nguoi. Da do bang tay truoc khi doi: 15 lan tai
	// /play.php lam tai hieu dung cua mot may chu nhay 20 -> 35.
	tickets map[string]map[int64]time.Time
	// prevOnline: so nguoi online doc duoc o nhip truoc, de biet heartbeat da tang bao
	// nhieu. Moi nguoi heartbeat "bat kip" thi nha mot ve.
	prevOnline map[string]int
}

func NewTracker(src LoadSource, db *sql.DB, gameCode string, ticketTTL time.Duration, log *slog.Logger) *Tracker {
	return &Tracker{
		Source: src, DB: db, GameCode: gameCode, TicketTTL: ticketTTL, Log: log,
		fleet:      NewFleet(gameCode, nil, nil),
		tickets:    map[string]map[int64]time.Time{},
		prevOnline: map[string]int{},
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
	// Nha ve theo muc heartbeat TANG THAT, chu khong theo nhip doc.
	//
	// Truoc day ve ngung duoc dem ngay o nhip ke tiep, voi gia dinh "den luc nay nguoi
	// do da nam trong onlineNum". Gia dinh do sai: client phai tai ~9,4 MB roi con chon
	// may chu moi noi WebSocket, tuc la vai chuc giay. Trong khoang do nguoi da duoc cho
	// vao khong nam trong onlineNum ma cung khong con ve — ho VO HINH, va cong dem thieu
	// dung luc dong nguoi nhat.
	//
	// Nay: heartbeat tang bao nhieu thi nha bay nhieu ve (cu nhat truoc), phan con lai
	// giu den khi het TicketTTL. Ai bam vao roi bo di se duoc thu hoi khi TTL het.
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

// fleetLocked dung Fleet tu trang thai hien tai. Ben goi PHAI dang giu khoa.
func (t *Tracker) fleetLocked() *Fleet {
	now := time.Now()
	servers := make([]ServerState, 0, len(t.fleet.Servers))
	for _, s := range t.fleet.Servers {
		n := 0
		for _, at := range t.tickets[s.SrvCode] {
			if now.Sub(at) < t.TicketTTL {
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
func (t *Tracker) Fleet() *Fleet {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.fleetLocked()
}

// admit ra quyet dinh VA giu cho trong CUNG mot lan giu khoa.
//
// Hai buoc nay bat buoc phai nguyen tu. Neu doc tai roi tha khoa roi moi giu cho, thi
// giua hai buoc cac goroutine khac cung doc duoc con so cu va tat ca deu duoc cho vao —
// do dung la tinh huong cong nay sinh ra de chan. Da do: 50 request dong thoi lot het
// vao mot server chi con 5 cho.
func (t *Tracker) admit(userID int64, decide func(*Fleet) Decision) Decision {
	t.mu.Lock()
	defer t.mu.Unlock()
	d := decide(t.fleetLocked())
	if d.Allowed && d.SrvCode != "" {
		t.reserveLocked(userID, d.SrvCode)
	}
	return d
}

// reserveLocked ghi ve cua mot nguoi, va CHI mot ve.
//
// Xoa ve cu cua chinh nguoi do o moi may chu khac truoc khi ghi ve moi: nguoi doi may
// chu giua chung khong duoc de lai mot cho ma ho khong dung. Ben goi PHAI dang giu khoa.
func (t *Tracker) reserveLocked(userID int64, srvCode string) {
	for code, byUser := range t.tickets {
		if code == srvCode {
			continue
		}
		delete(byUser, userID)
		if len(byUser) == 0 {
			delete(t.tickets, code)
		}
	}
	if t.tickets[srvCode] == nil {
		t.tickets[srvCode] = map[int64]time.Time{}
	}
	t.tickets[srvCode][userID] = time.Now()
}

// Release tra lai cho ma mot nguoi dang giu.
//
// Dung khi da giu ve nhung phien khong cap duoc (login server hong): giu lai mot cho
// ma khong ai vao chi lam cong chan nham nguoi khac cho den luc ve het han.
func (t *Tracker) Release(userID int64) {
	t.mu.Lock()
	defer t.mu.Unlock()
	for code, byUser := range t.tickets {
		delete(byUser, userID)
		if len(byUser) == 0 {
			delete(t.tickets, code)
		}
	}
}

// AdmitReturning quyet dinh cho nguoi choi da co nhan vat, va giu cho neu duoc vao.
func (t *Tracker) AdmitReturning(userID int64, srvCode string) Decision {
	return t.admit(userID, func(f *Fleet) Decision { return f.AdmitReturning(srvCode) })
}

// AdmitNew chon server cho nguoi choi moi va giu cho.
func (t *Tracker) AdmitNew(userID int64) Decision {
	return t.admit(userID, func(f *Fleet) Decision { return f.AdmitNew() })
}

// releaseOldest bo n ve cu nhat trong mot may chu.
//
// Cu nhat truoc vi ho la nhung nguoi co kha nang da vao game nhat — chinh ho lam
// onlineNum tang len.
func releaseOldest(byUser map[int64]time.Time, n int) {
	for ; n > 0 && len(byUser) > 0; n-- {
		var (
			oldestUser int64
			oldestAt   time.Time
			found      bool
		)
		for user, at := range byUser {
			if !found || at.Before(oldestAt) {
				oldestUser, oldestAt, found = user, at, true
			}
		}
		delete(byUser, oldestUser)
	}
}
