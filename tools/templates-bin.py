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
    python3 tools/templates-bin.py tuong  <goc> <ra>            # 英雄基础/英雄高阶升星 theo server (excel-src/hero)
    python3 tools/templates-bin.py bang   <goc> <ra> [bang...]  # thay ca bang theo server (mac dinh: BANG_THEO_SERVER)
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


# ---------- dong bo bang tuong theo SERVER ----------
# Server (tcg-game.jar, HeroBaseRow) doc hero.xlsx cua NO de kiem tra thang tinh: phe, sao,
# 消耗指定英雄 / 消耗狗粮 / 升星分段 ... Client mang mot ban 英雄基础 khac (4346 dong so voi
# 2428; 11 nguyen mau bi doi sang phe 6 "Hon don"; 1566 dong lech 消耗指定英雄, 964 dong lech
# 消耗狗粮). Nguoi choi chon vat lieu theo bang client -> server tra 80026 "请选择指定的英雄哟".
# Server khong doi duoc (JAR), nen client phai theo server o cac cot LUAT; cot trinh bay
# (ten, anh, model, tieng, tranh) giu cua client.
CAY_HERO = os.path.join(ROOT, "server", "excel-src", "hero")
COT_LUAT = ["原型ID", "下一星英雄ID", "升星分段", "阵营", "职业", "星级", "品质", "阶数上限", "等级上限",
            "消耗指定英雄", "消耗狗粮", "消耗进阶石", "消耗灌魔之瓶", "上阵优先级", "初始属性",
            "属性等级成长", "升星固定属性", "技能", "上一星英雄ID", "是否进融合神殿", "羁绊ID", "突破等级上限"]
COT_LUAT_CAO = ["英雄ID", "阶段", "属性等级成长", "升星固定属性", "消耗指定英雄", "消耗狗粮",
                "消耗进阶石", "消耗灌魔之瓶", "下一星英雄ID"]
COT_THAM_CHIEU = ("下一星英雄ID", "上一星英雄ID")   # tro sang dong khac: chi nhan khi dich co that


def _o_server(v):
    if v is None or isinstance(v, dict): return ""
    if isinstance(v, bool): return "1" if v else "0"
    if isinstance(v, float) and v.is_integer(): v = int(v)
    return str(v).strip()


def _sheet_server_wb(wb, ten):
    """Sheet `ten` trong server/excel-src/<wb>/ -> dict id -> {cot: gia tri} (giu thu tu dong)."""
    cay = os.path.join(ROOT, "server", "excel-src", wb)
    idx = json.load(open(os.path.join(cay, "_index.json"), encoding="utf-8"))
    for s in idx["sheets"]:
        if s["name"] != ten: continue
        rows = json.load(open(os.path.join(cay, s["file"]), encoding="utf-8"))["rows"]
        col = {_o_server(h): i for i, h in enumerate(rows[0]) if _o_server(h)}
        byid = {}
        for r in rows[1:]:
            k = _o_server(r[0]) if r else ""
            if k.isdigit():
                byid[k] = {h: (_o_server(r[i]) if i < len(r) else "") for h, i in col.items()}
        return byid
    sys.exit(f"!! server/excel-src/{wb} khong co sheet {ten}")


def _sheet_server(ten):
    return _sheet_server_wb("hero", ten)


# ---------- thay ca bang theo server ----------
# Cho cac bang ma SERVER quyet dinh toan bo (cua hang VIP, moc VIP...): client chi dung de ve
# va sap xep, ma may chu gui id nao client khong co thi sap (vip商城商品: client 870 dong,
# server 2646 -> "Cannot read properties of undefined (reading 'sort')" o VIP SHOP).
# Dong = dong server, o = cot cua client (thieu -> ""), giu tieu de client.
BANG_THEO_SERVER = {
    "vip商城商品": ("vip-shop", "vip商城商品"),
    "vip等级": ("main-character", "vip等级"),
}


def thay_bang(d, ten_bang):
    tabs, ra, tk = doc(d), [], {}
    for ten, rows in tabs:
        if ten in ten_bang:
            wb, sh = BANG_THEO_SERVER[ten]
            keys = [c.decode("utf-8") for c in o_cua(rows[0])]
            sv = _sheet_server_wb(wb, sh)
            moi = [rows[0]]
            for id_, r in sv.items():
                cells = [r.get(k, "") for k in keys]; cells[0] = id_
                moi.append(dong_tu_o([x.encode("utf-8") for x in cells]))
            thieu = [k for k in keys if k not in next(iter(sv.values()), {})]
            tk[ten] = (len(rows) - 1, len(moi) - 1, thieu)
            rows = moi
        ra.append((ten, rows))
    for t in ten_bang:
        if t not in tk: sys.exit(f"!! templates.bin khong co bang {t}")
    return ghi(ra), tk


def _dong_bo_bang(rows, sv, cot_luat, them_dong, tham_chieu=None):
    keys = [c.decode("utf-8") for c in o_cua(rows[0])]
    cl = []   # [id, cells(str)] giu thu tu
    for pl in rows[1:]:
        c = o_cua(pl)
        cl.append([c[0].decode("utf-8", "replace") if c else "", [x.decode("utf-8", "replace") for x in (c or [])]])
    co = {i for i, _ in cl}
    se_them = [k for k in sorted(sv, key=int) if k not in co and int(k) < 900000] if them_dong else []
    dich_hop_le = (co | set(se_them)) if tham_chieu is None else tham_chieu
    doi, giu_tc = {}, []
    for id_, cells in cl:
        if id_ not in sv: continue
        for k in cot_luat:
            if k not in keys or k not in sv[id_]: continue
            i = keys.index(k); moi = sv[id_][k]
            if i >= len(cells): continue
            if k in COT_THAM_CHIEU and moi not in ("", "0") and moi not in dich_hop_le:
                giu_tc.append((id_, k, moi)); continue
            if cells[i] != moi:
                doi[k] = doi.get(k, 0) + 1; cells[i] = moi
    them = []
    for id_ in se_them:
        proto = sv[id_].get("原型ID", "")
        # lay dong trinh bay tu cung nguyen mau, sao cao nhat nho hon dong moi
        ung = [(int(c[keys.index("星级")] or 0), c) for i, c in cl
               if i in sv and sv[i].get("原型ID") == proto and c[keys.index("星级")].isdigit()]
        if not ung: giu_tc.append((id_, "them", "khong co nguyen mau tren client")); continue
        sao_moi = int(sv[id_].get("星级") or 0)
        thap = [u for u in ung if u[0] <= sao_moi] or ung
        cells = list(max(thap, key=lambda u: u[0])[1])
        cells[0] = id_
        for k in cot_luat:
            if k in keys and k in sv[id_] and keys.index(k) < len(cells):
                moi = sv[id_][k]
                if k in COT_THAM_CHIEU and moi not in ("", "0") and moi not in dich_hop_le: continue
                cells[keys.index(k)] = moi
        cl.append([id_, cells]); them.append(id_)
    ra = [rows[0]] + [dong_tu_o([x.encode("utf-8") for x in cells]) for _, cells in cl]
    return ra, {"doi": doi, "them": them, "giu_tham_chieu": giu_tc, "chi_client": len(co - set(sv))}


def dong_bo_tuong(d):
    sv, sv_cao = _sheet_server("英雄基础"), _sheet_server("英雄高阶升星")
    tabs, ra, tk = doc(d), [], {}
    for ten, rows in tabs:
        if ten == "英雄基础":
            rows, tk[ten] = _dong_bo_bang(rows, sv, COT_LUAT, True)
            id_tuong = {o_cua(pl)[0].decode("utf-8", "replace") for pl in rows[1:] if o_cua(pl)}
        elif ten == "英雄高阶升星":   # 下一星英雄ID o day tro sang 英雄基础
            rows, tk[ten] = _dong_bo_bang(rows, sv_cao, COT_LUAT_CAO, False, id_tuong)
        ra.append((ten, rows))
    if len(tk) != 2: sys.exit("!! templates.bin thieu 英雄基础 / 英雄高阶升星")
    return ghi(ra), tk


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lenh", choices=["kiem", "chu", "chen", "xuat", "tuong", "bang"])
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
    elif a.lenh == "bang":
        ten_bang = a.them or list(BANG_THEO_SERVER)
        moi, tk = thay_bang(d, ten_bang)
        for ten, (cu, m, thieu) in tk.items():
            print(f"  {ten}: {cu} dong -> {m} dong theo server{'; cot client khong co o server: ' + str(thieu) if thieu else ''}")
    elif a.lenh == "tuong":
        moi, tk = dong_bo_tuong(d)
        for ten, t in tk.items():
            print(f"  {ten}: o doi theo cot {t['doi']}; them {len(t['them'])} dong {t['them'][:3]}...;"
                  f" chi client {t['chi_client']} dong (giu nguyen); giu tham chieu {len(t['giu_tham_chieu'])} {t['giu_tham_chieu'][:3]}")
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
