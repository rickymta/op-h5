package gmops

// Danh muc vat pham/tuong de nguoi truc TIM thay vi phai nho ma.
//
// VI SAO PHAI CO
// --------------
// Cong GM gui qua bang chuoi `type:id:count`. Truoc day nguoi truc phai mo mot bang tra
// khac (ban PHP cu: gmhanglong/gm/item.txt) roi chep ma sang — vua cham vua sai, vi bang
// do la cua MOT BAN KHAC cua game. Doi chieu voi may chu dang chay: `3:100001` bang cu goi
// la "Tien giai thach", game that goi la "Dan tien giai"; `5:5` bang cu ghi "Bach Trach an",
// game that la "Cuu Duong Cong"; con ten tuong thi lech han mot he — bang cu liet ke tuong
// than thoai (Hinh Thien, Chuc Dung) trong khi game dang chay dung tuong Kim Dung (Truong
// Vo Ky, Hoang Dung). Cho nguoi truc mot danh muc SAI con nguy hiem hon khong cho gi.
//
// NGUON: sinh boi tools/gen-danh-muc-game.py tu Excel may chu nap. Tu 2026-09-06 ten trong
// Excel may chu (tuong, vat pham, trang bi, bi kip, hon ngoc, than khi, suu tap) da duoc
// dong bo theo templates.bin cua client bang tools/dong-bo-ten-server.py (client la dung,
// e41d043), nen ten o day = ten nguoi choi nhin thay = ten console tra trong kho do.
// Doi Excel hay client thi chay lai hai tool do, dung sua tay file JSON.

import (
	_ "embed"
	"encoding/json"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/rickymta/op-h5/platform/internal/textnorm"
)

//go:embed danh-muc-haitac.json
var danhMucJSON []byte

// MucDanhMuc la mot thu co the phat: mot loai kho do + ma + ten trong game.
type MucDanhMuc struct {
	Loai int    `json:"loai"`
	Ma   int64  `json:"ma"`
	Ten  string `json:"ten"`
	Phu  string `json:"phu,omitempty"` // pham chat / sao / nhom — chi de phan biet cac mon trung ten
}

// NhomDanhMuc la nhan cua mot loai kho do.
type NhomDanhMuc struct {
	Loai int    `json:"loai"`
	Nhan string `json:"nhan"`
}

type danhMuc struct {
	Nhom []NhomDanhMuc     `json:"nhom"`
	Vi   map[string]string `json:"vi"`
	Muc  [][]any           `json:"muc"`
}

type khoDanhMuc struct {
	nhom []NhomDanhMuc
	vi   map[int64]string
	muc  []MucDanhMuc
	tim  []string            // ten da bo dau, cung chi so voi muc
	tra  map[[2]int64]string // (loai, ma) -> ten
}

var (
	napMot sync.Once
	kho    *khoDanhMuc
)

func nap() *khoDanhMuc {
	napMot.Do(func() {
		var d danhMuc
		k := &khoDanhMuc{vi: map[int64]string{}, tra: map[[2]int64]string{}}
		if err := json.Unmarshal(danhMucJSON, &d); err != nil {
			// Danh muc hong thi cong GM van chay, chi la khong tra duoc ten.
			kho = k
			return
		}
		k.nhom = d.Nhom
		for s, v := range d.Vi {
			if n, err := strconv.ParseInt(s, 10, 64); err == nil {
				k.vi[n] = v
			}
		}
		k.muc = make([]MucDanhMuc, 0, len(d.Muc))
		for _, r := range d.Muc {
			if len(r) < 3 {
				continue
			}
			loai, ok1 := soNguyen(r[0])
			ma, ok2 := soNguyen(r[1])
			ten, ok3 := r[2].(string)
			if !ok1 || !ok2 || !ok3 || ten == "" {
				continue
			}
			m := MucDanhMuc{Loai: int(loai), Ma: ma, Ten: ten}
			if len(r) > 3 {
				if p, ok := r[3].(string); ok {
					m.Phu = p
				}
			}
			k.muc = append(k.muc, m)
			k.tra[[2]int64{loai, ma}] = ten
		}
		// Chuoi tim = ten + cot phu: than khi doc quyen mang ten mon do ("Trái Yami") con
		// nguoi truc chi biet ten tuong ("Black Beard") — cot phu ghi tuong, nen phai tim
		// duoc qua do. Ten dung truoc de "bat dau bang" van uu tien ten mon.
		k.tim = make([]string, len(k.muc))
		for i, m := range k.muc {
			k.tim[i] = textnorm.Fold(m.Ten)
			if m.Phu != "" {
				k.tim[i] += " " + textnorm.Fold(m.Phu)
			}
		}
		kho = k
	})
	return kho
}

func soNguyen(v any) (int64, bool) {
	switch x := v.(type) {
	case float64:
		return int64(x), true
	case json.Number:
		n, err := x.Int64()
		return n, err == nil
	}
	return 0, false
}

// NhomKhoDo tra ve nhan cua tung loai kho do trong danh muc.
func NhomKhoDo() []NhomDanhMuc { return nap().nhom }

// TenVi tra ve ten loai tien trong vi, va false khi chua doi chieu duoc.
//
// CO Y chi co ba dong (Kim te, Kim cuong, Kinh nghiem tuong): chi ba cai do doc duoc tu
// chinh bang cau hinh phat thuong cua game. Cac id vi khac de trong de giao dien hien
// "Vi · loai N" — noi khong biet van hon dat mot cai ten sai vao mot thao tac phat tien.
func TenVi(id int64) (string, bool) {
	v, ok := nap().vi[id]
	return v, ok
}

// TenMuc tra ve ten trong game cua mot muc, hoac "" neu khong co trong danh muc.
func TenMuc(loai int, ma int64) string {
	if loai == 0 {
		if v, ok := TenVi(ma); ok {
			return v
		}
		return ""
	}
	return nap().tra[[2]int64{int64(loai), ma}]
}

// TimDanhMuc tim theo ten (bo dau) hoac theo ma. `loai` <= 0 nghia la moi loai.
//
// Thu tu: ma trung khop truoc, roi ten bat dau bang tu khoa, roi ten co chua tu khoa. Nguoi
// truc thuong da biet mot phan ten ("nguyen bao", "manh 5"), va thinh thoang biet dung ma —
// ca hai duong deu phai ra ket qua o dong dau.
func TimDanhMuc(q string, loai, gioiHan int) []MucDanhMuc {
	out, _ := timDanhMuc(q, loai, gioiHan)
	return out
}

// timDanhMuc nhu TimDanhMuc, kem TONG so dong khop truoc khi cat theo gioi han — giao dien
// duyet theo nhom can biet "60/1440 mon" de nguoi truc hieu con phai go them. Tong chi dung
// toi 4.000 (tran quet ben duoi); moi nhom rieng le deu duoi muc do nen tong la chinh xac.
func timDanhMuc(q string, loai, gioiHan int) ([]MucDanhMuc, int) {
	k := nap()
	if gioiHan <= 0 || gioiHan > 200 {
		gioiHan = 30
	}
	tk := textnorm.Fold(strings.TrimSpace(q))
	soTK := strings.TrimSpace(q)
	if _, err := strconv.ParseInt(soTK, 10, 64); err != nil {
		soTK = ""
	}

	type diem struct {
		i int
		d int
	}
	var ra []diem
	for i, m := range k.muc {
		if loai > 0 && m.Loai != loai {
			continue
		}
		if tk == "" && soTK == "" {
			ra = append(ra, diem{i, 3})
			continue
		}
		ma := strconv.FormatInt(m.Ma, 10)
		switch {
		case soTK != "" && ma == soTK:
			ra = append(ra, diem{i, 0})
		case soTK != "" && strings.HasPrefix(ma, soTK):
			ra = append(ra, diem{i, 1})
		case tk != "" && strings.HasPrefix(k.tim[i], tk):
			ra = append(ra, diem{i, 2})
		case tk != "" && strings.Contains(k.tim[i], tk):
			ra = append(ra, diem{i, 3})
		}
		if len(ra) > 4000 { // du de xep hang; khong quet het 6.500 dong cho moi phim go
			break
		}
	}
	sort.SliceStable(ra, func(a, b int) bool {
		if ra[a].d != ra[b].d {
			return ra[a].d < ra[b].d
		}
		if k.muc[ra[a].i].Loai != k.muc[ra[b].i].Loai {
			return k.muc[ra[a].i].Loai < k.muc[ra[b].i].Loai
		}
		return k.muc[ra[a].i].Ma < k.muc[ra[b].i].Ma
	})
	tong := len(ra)
	if len(ra) > gioiHan {
		ra = ra[:gioiHan]
	}
	out := make([]MucDanhMuc, 0, len(ra))
	for _, x := range ra {
		out = append(out, k.muc[x.i])
	}
	return out, tong
}
