package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// fleetFetcher hoi Adapter cua tung game de lay so lieu tai thuc te.
//
// Trang quan tri KHONG tu doc login server: Adapter da cong ve giu cho vao onlineNum,
// nen con so no bao moi la con so ma cong gioi han thuc su dung. Doc thang login server
// se ra mot con so khac va lam nguoi truc hieu nham.
type fleetFetcher struct{ http *http.Client }

func newFleetFetcher() *fleetFetcher {
	return &fleetFetcher{http: &http.Client{Timeout: 5 * time.Second}}
}

type liveServer struct {
	Online int
	Band   string
	Label  string
}

type liveFleet struct {
	Online      int
	SoftTotal   int
	Utilization int
	byCode      map[string]liveServer
}

func (f *fleetFetcher) fetch(ctx context.Context, adapterURL string) (liveFleet, error) {
	out := liveFleet{byCode: map[string]liveServer{}}
	if adapterURL == "" {
		return out, fmt.Errorf("chua cau hinh adapter_url")
	}
	u := strings.TrimRight(adapterURL, "/") + "/api/game/servers"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return out, err
	}
	resp, err := f.http.Do(req)
	if err != nil {
		return out, fmt.Errorf("khong goi duoc adapter: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return out, fmt.Errorf("adapter tra HTTP %d", resp.StatusCode)
	}

	var body struct {
		Servers []struct {
			Code   string `json:"code"`
			Band   string `json:"band"`
			Label  string `json:"label"`
			Online int    `json:"online"`
		} `json:"servers"`
		Online      int `json:"online"`
		SoftTotal   int `json:"soft_total"`
		Utilization int `json:"utilization"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&body); err != nil {
		return out, fmt.Errorf("phan hoi adapter khong doc duoc: %w", err)
	}
	out.Online, out.SoftTotal, out.Utilization = body.Online, body.SoftTotal, body.Utilization
	for _, s := range body.Servers {
		out.byCode[s.Code] = liveServer{Online: s.Online, Band: s.Band, Label: s.Label}
	}
	return out, nil
}
