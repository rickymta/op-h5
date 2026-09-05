package capacity

import (
	"sync"
	"testing"
	"time"
)

// Cong gioi han phai dung ngay ca khi nhieu nguoi bam vao CUNG LUC.
//
// Doc tai roi moi giu cho la hai buoc rieng; neu khong lam nguyen tu thi giua hai buoc
// mot goroutine khac cung doc duoc con so cu, va ca hai deu duoc cho vao. O bien tran
// dieu do nghia la vuot tran.
func TestConcurrentAdmitDoesNotOvershoot(t *testing.T) {
	servers := []ServerState{{
		SrvCode: "s1", Name: "S1", DeviceCode: "host-01", Status: StatusRunning,
		Recommend: true, SoftLimit: 100, OverflowPct: 15, // tran cung = 115
	}}
	tr := newTestTracker(&fakeSource{}, servers, nil, time.Minute)
	tr.refreshWith(servers, nil, map[string]int{"s1": 110}) // con dung 5 cho

	const goroutines = 50
	var (
		wg      sync.WaitGroup
		mu      sync.Mutex
		allowed int
		start   = make(chan struct{})
	)
	for range goroutines {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start // tha ra cung luc de dung vao dung khe cua so
			if tr.AdmitReturning("s1").Allowed {
				mu.Lock()
				allowed++
				mu.Unlock()
			}
		}()
	}
	close(start)
	wg.Wait()

	if allowed != 5 {
		t.Errorf("cho vao %d nguoi trong khi chi con 5 cho (110 + 5 = tran cung 115)", allowed)
	}
	if got := tr.Fleet().Servers["s1"].Effective(); got > 115 {
		t.Errorf("tai hieu dung = %d, vuot tran cung 115", got)
	}
}

// Nguoi choi moi cung phai chiu dung rang buoc do khi vao dong thoi.
func TestConcurrentAdmitNewRespectsDeviceCap(t *testing.T) {
	servers := []ServerState{
		{SrvCode: "s1", Name: "S1", DeviceCode: "h1", Status: StatusRunning, Recommend: true, SoftLimit: 500, OverflowPct: 15},
		{SrvCode: "s2", Name: "S2", DeviceCode: "h1", Status: StatusRunning, Recommend: true, SoftLimit: 500, OverflowPct: 15},
	}
	devices := []DeviceState{{DeviceCode: "h1", Name: "host-01", MaxOnline: 100}}
	tr := newTestTracker(&fakeSource{}, servers, devices, time.Minute)
	tr.refreshWith(servers, devices, map[string]int{"s1": 45, "s2": 45}) // tong 90, tran may 100

	var (
		wg      sync.WaitGroup
		mu      sync.Mutex
		allowed int
		start   = make(chan struct{})
	)
	for range 40 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			if tr.AdmitNew().Allowed {
				mu.Lock()
				allowed++
				mu.Unlock()
			}
		}()
	}
	close(start)
	wg.Wait()

	if allowed != 10 {
		t.Errorf("cho vao %d nguoi trong khi may chi con 10 cho (90/100)", allowed)
	}
}
