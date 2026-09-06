#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Doc / sua / kiem `template/templates.bin` cua client — theo DUNG parser cua client.

THAY THE hai tool cu (`chuan-hoa-templates.py`, `chen-vat-pham-client.py`): ca hai sinh
ra file HONG vi dung mo hinh tu suy ra. Chung chua bao gio bi phat hien som vi `/res/` cache
"immutable 30d" — trinh duyet cua nguoi van hanh van dung ban goc cho toi khi mot lan tai
moi keo ve ban hong va game treo o 5-6%.

DINH DANG — GIAI MA TU BUNDLE, KHONG DOAN

`parseData` cua client (libs/e228b-0b904-ac44c.js, giai ma bang bang chuoi obfuscate):

    while (bytes.bytesAvailable) {
      name  = bytes.readUTFString();                       // u16 do dai + UTF-8
      count = bytes.readInt32();                           // GOM CA dong tieu de
      rows  = count x bytes.readArrayBuffer(bytes.readInt16());   // i16 = do dai PHAN SAU no
      tplClassDic[name].init(name, rows)
    }

Lop bang (`_0x1bb47c`): dong 0 = tieu de (cac readUTFString -> ten cot); moi dong sau:
readUTFString dau = id (rong -> bo qua dong), roi doc het cac readUTFString con lai ->
`custom(cells, keys, keysIndex)` lay o THEO CHI SO COT. `Laya.Byte` BIG_ENDIAN.

Hai loi cu dung o day: (1) tool chu rut ngan chuoi ma khong tinh lai i16 cua dong; (2) tool
chen ghi i16 = 2 + do dai (thua 2 byte, vi tinh ca chinh no) -> readArrayBuffer an lem sang
dong ke -> moi dong sau lech -> lop PROP giai ma rac -> treo.

CONG KIEM: `mo_phong()` mo phong Laya.Byte (ke ca readArrayBuffer voi do dai am khong nem
ma LUI con tro, va DataView vuot bien nem RangeError). Moi file ghi ra PHAI qua: het file
sach, du 680 bang, va cac dong moi giai ma dung theo chi so cot. Khong qua -> khong ghi.

    python3 tools/templates-bin.py kiem   <file>
    python3 tools/templates-bin.py chu    <goc> <ra>            # ap bang thuat ngu
    python3 tools/templates-bin.py chen   <goc> <ra> 501124 500198   # chen tu item-table.xlsm
    python3 tools/templates-bin.py xuat   <file> 基础物品        # in bang ra JSON
"""
import argparse, json, os, struct, sys, zlib
from importlib import util as _u

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSM = os.path.join(ROOT, "server", "excel", "release", "item-table.xlsm")


# ---------- doc / ghi theo khung that ----------
def doc(d):
    """-> [(ten_bang, [payload dong...])], payload dong 0 la tieu de."""
    p, n, tabs = 0, len(d), []
    while p < n:
        L = struct.unpack(">H", d[p:p + 2])[0]; ten = d[p + 2:p + 2 + L].decode("utf-8"); p += 2 + L
        cnt = struct.unpack(">i", d[p:p + 4])[0]; p += 4
        rows = []
        for _ in range(cnt):
            rl = struct.unpack(">h", d[p:p + 2])[0]; p += 2
            if rl < 0 or p + rl > n:
                raise ValueError(f"bang {ten!r}: do dai dong {rl} khong hop le @ {p}")
            rows.append(d[p:p + rl]); p += rl
        tabs.append((ten, rows))
    return tabs


def ghi(tabs):
    ra = bytearray()
    for ten, rows in tabs:
        tb = ten.encode("utf-8")
        ra += struct.pack(">H", len(tb)) + tb + struct.pack(">i", len(rows))
        for pl in rows:
            if len(pl) > 32767:
                raise ValueError(f"dong dai {len(pl)} > 32767 trong bang {ten!r}")
            ra += struct.pack(">h", len(pl)) + pl
    return bytes(ra)


def o_cua(pl):
    """Tach payload dong thanh cac o (u16 len + bytes). Tra None neu khong tach sach."""
    q, out = 0, []
    while q < len(pl):
        if q + 2 > len(pl): return None
        L = struct.unpack(">H", pl[q:q + 2])[0]; q += 2
        if q + L > len(pl): return None
        out.append(pl[q:q + L]); q += L
    return out


def dong_tu_o(cells):
    return b"".join(struct.pack(">H", len(c)) + c for c in cells)


# ---------- mo phong Laya.Byte de KIEM ----------
class _LB:
    def __init__(s, d): s.d, s.pos, s.n = d, 0, len(d)
    def _need(s, k):
        if s.pos < 0 or s.pos + k > s.n: raise IndexError(f"RangeError pos={s.pos} need={k}")
    def u16(s): s._need(2); v = struct.unpack(">H", s.d[s.pos:s.pos + 2])[0]; s.pos += 2; return v
    def i16(s): s._need(2); v = struct.unpack(">h", s.d[s.pos:s.pos + 2])[0]; s.pos += 2; return v
    def i32(s): s._need(4); v = struct.unpack(">i", s.d[s.pos:s.pos + 4])[0]; s.pos += 4; return v
    def utf(s): L = s.u16(); s._need(L); v = s.d[s.pos:s.pos + L]; s.pos += L; return v.decode("utf-8", "replace")
    def buf(s, L):   # Laya: slice khong nem; pos += L ke ca am
        a = max(0, min(s.n, s.pos)); b = max(0, min(s.n, s.pos + L))
        v = s.d[a:b] if b > a else b""; s.pos += L; return v


def mo_phong(d, so_bang_mong=None):
    """Chay dung vong lap parseData + parseRow. -> (dict bang->rows, loi|None)."""
    by, tpl, loi = _LB(d), {}, None
    try:
        while by.pos < by.n:
            ten = by.utf(); cnt = by.i32()
            if cnt < 0 or cnt > 5_000_000: raise ValueError(f"count vo ly {cnt} @ {ten!r}")
            tpl[ten] = [by.buf(by.i16()) for _ in range(cnt)]
        if by.pos != by.n: raise ValueError(f"ket thuc lech: {by.pos} != {by.n}")
    except Exception as e:
        loi = f"{type(e).__name__}: {e}"
    if not loi and so_bang_mong is not None and len(tpl) != so_bang_mong:
        loi = f"so bang {len(tpl)} != {so_bang_mong}"
    return tpl, loi


def giai_ma_dong(header_pl, pl):
    """Nhu parseRow + custom: tra dict cot -> gia tri (theo chi so cot)."""
    hb = _LB(header_pl); keys = []
    while hb.pos < hb.n: keys.append(hb.utf())
    rb = _LB(pl); row = []
    while rb.pos < rb.n: row.append(rb.utf())
    return {k: (row[i] if i < len(row) else None) for i, k in enumerate(keys)}, row


def kiem(d, so_bang_mong=680, in_ra=True):
    tpl, loi = mo_phong(d, so_bang_mong)
    if in_ra:
        print(f"  mo phong client: bang={len(tpl)}  loi={loi or 'KHONG'}")
    if loi: return False, tpl
    it = tpl.get("基础物品")
    if it:
        g, _ = giai_ma_dong(it[0], it[1])
        ok = g.get("物品ID") == "20001"
        if in_ra: print(f"  基础物品: {len(it)} dong, dong 1 -> id={g.get('物品ID')} ten={g.get('名称')!r}  {'OK' if ok else 'SAI'}")
        if not ok: return False, tpl
    return True, tpl


# ---------- cac thao tac ----------
def ap_chu(d):
    _sp = _u.spec_from_file_location("_ch", os.path.join(ROOT, "tools", "chuan-hoa-dich.py"))
    _ch = _u.module_from_spec(_sp); _sp.loader.exec_module(_ch)
    import re, unicodedata
    SAO = re.compile(r"(\d+)\s*Tinh\s+anh\s+hùng", re.IGNORECASE)
    def doi(s):
        s = unicodedata.normalize("NFC", s); s = SAO.sub(lambda m: f"Tướng {m.group(1)} sao", s)
        return _ch.thay_thuat_ngu(s)
    tabs = doc(d); n_o = 0; ra = []
    for ten, rows in tabs:
        moi = [rows[0]] if rows else []
        for pl in rows[1:]:
            cs = o_cua(pl)
            if cs is None: moi.append(pl); continue
            new = []
            for c in cs:
                try: t = c.decode("utf-8")
                except UnicodeDecodeError: new.append(c); continue
                m = doi(t) if t else t
                if m != t: n_o += 1
                new.append(m.encode("utf-8"))
            moi.append(dong_tu_o(new))
        ra.append((ten, moi))
    return ghi(ra), n_o


def chen(d, ids):
    import openpyxl
    _sp = _u.spec_from_file_location("_ch", os.path.join(ROOT, "tools", "chuan-hoa-dich.py"))
    _ch = _u.module_from_spec(_sp); _sp.loader.exec_module(_ch)
    wb = openpyxl.load_workbook(XLSM, read_only=True, data_only=True)
    ws = wb["基础物品"]; xr = list(ws.iter_rows(values_only=True)); xh = [str(c) for c in xr[0]]
    src = {str(r[0]).strip(): {xh[i]: ("" if v is None else str(v)) for i, v in enumerate(r) if i < len(xh)}
           for r in xr[1:] if r and r[0] not in (None, "")}
    wb.close()
    tabs = doc(d); ra = []; them = []
    for ten, rows in tabs:
        if ten == "基础物品":
            keys = [c.decode("utf-8") for c in o_cua(rows[0])]
            co = {o_cua(pl)[0].decode("utf-8", "replace") for pl in rows[1:] if o_cua(pl)}
            for tid in ids:
                if tid in co: print(f"  {tid}: da co, bo qua"); continue
                if tid not in src: sys.exit(f"!! {tid} khong co trong item-table.xlsm — khong bia")
                cells = []
                for k in keys:
                    v = src[tid].get(k, "")
                    if k in ("名称", "描述", "类型说明"): v = _ch.thay_thuat_ngu(_ch.chuan(v))
                    cells.append(v.encode("utf-8"))
                pl = dong_tu_o(cells); rows = rows + [pl]; them.append((tid, pl))
        ra.append((ten, rows))
    return ghi(ra), them


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lenh", choices=["kiem", "chu", "chen", "xuat"])
    ap.add_argument("goc"); ap.add_argument("ra", nargs="?"); ap.add_argument("them", nargs="*")
    a = ap.parse_args()
    d = zlib.decompress(open(a.goc, "rb").read())
    if a.lenh == "kiem":
        ok, _ = kiem(d); sys.exit(0 if ok else 1)
    if a.lenh == "xuat":
        tpl, _ = mo_phong(d); rows = tpl[a.ra]
        out = [giai_ma_dong(rows[0], pl)[0] for pl in rows[1:]]
        json.dump(out, sys.stdout, ensure_ascii=False, indent=1); return
    if a.lenh == "chu":
        moi, n = ap_chu(d); print(f"  o doi: {n}")
    else:
        moi, them = chen(d, a.them)
        tpl, _ = mo_phong(moi); it = tpl.get("基础物品")
        for tid, pl in them:
            g, row = giai_ma_dong(it[0], pl)
            print(f"  + {tid}: {len(row)} o -> id={g['物品ID']} ten={g['名称']!r} icon={g['图标']} type={g['类型']}")
    ok, _ = kiem(moi)
    if not ok: sys.exit("!! KHONG QUA CONG KIEM — khong ghi")
    open(a.ra, "wb").write(zlib.compress(moi, 9))
    print(f"  da ghi {a.ra}  (giai nen {len(moi)} byte)")


if __name__ == "__main__":
    main()
