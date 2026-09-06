#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Chen dinh nghia vat pham con thieu vao bang `基础物品` cua client (templates.bin).

VAN DE

Bang vat pham cua server (`item-table.xlsm`) va cua client (`templates.bin`) la hai ban
game khac nhau — xem docs/vat-pham-lech-ban.md. Hai ma server phat ma client khong co mau:

    501124  "Goi tu chon Anh hung hiem 14 sao"
    500198  "Coin Thuong"  (dong tien cua shop 150; nguoi choi dang giu 75 cai)

Thieu mau thi `getTplInfo` tra `undefined`, giao dien tung sap (da chan bang chot null) va
vat pham khong hien. Tool nay lay dinh nghia THAT tu item-table.xlsm roi chen vao client.

DINH DANG — DA GIAI XONG, KHONG DOAN

    <ten bang> writeUTF (2 byte do dai big-endian + UTF-8)
    <so dong>  4 byte big-endian          (khai 1070; thuc te 1069 dong — dem ca dong tieu de)
    <do dai khoi ten cot> 2 byte big-endian
    <khoi ten cot>        16 chuoi writeUTF, tong dung bang so da khai
    moi dong: <2 byte> + 16 o, moi o la writeUTF (KE CA so)

Kiem chung: doc 1069 dong tu 6516563 ket thuc **khop chinh xac** 6742216 — dung dau bang
ke tiep (`礼包`), tim duoc bang cach quet header hop le.

Hai byte dau moi dong KHONG phai do dai dong: 1012/1070 dong co gia tri sai lech so voi do
dai that, ma game van hien vat pham dung — nen client doc theo SO O (16), khong dung 2 byte
do de nhay. Dong moi ghi gia tri tu nhat quan (2 + tong do dai cac o), giong dong 0 va 1.

CONG ROUND-TRIP

Truoc khi ghi, tool doc toan bo vung dong roi ghi lai y nguyen va so **tung byte** voi ban
goc. Khong khop tuyet doi thi TU CHOI, khong chen. Day la dieu kien nguoi van hanh dat ra.

    python3 tools/chen-vat-pham-client.py            # chi thu round-trip, khong ghi
    python3 tools/chen-vat-pham-client.py --apply
    python3 tools/chen-vat-pham-client.py --apply --file /opt/tcg/assets/res/97cec-62c2f-5f56f
"""
import argparse, os, re, shutil, struct, sys, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAC_DINH = os.path.join(ROOT, "website", "game", "res", "97cec-62c2f-5f56f")
XLSM = os.path.join(ROOT, "server", "excel", "release", "item-table.xlsm")
CAN_CHEN = ["501124", "500198"]
HAN = re.compile(r"^[一-鿿]{2,12}$")


def _s(d, p):
    n = (d[p] << 8) | d[p + 1]
    return d[p + 2:p + 2 + n], p + 2 + n


def _enc(o):
    b = o if isinstance(o, bytes) else str(o).encode("utf-8")
    return struct.pack(">H", len(b)) + b


def dau_bang_ke_tiep(d, tu):
    """Quet toi header bang hop le dau tien sau `tu` — do la cuoi vung dong."""
    for p in range(tu, min(len(d), tu + 2_000_000)):
        n = (d[p] << 8) | d[p + 1] if p + 2 <= len(d) else 0
        if not (6 <= n <= 36) or p + 2 + n > len(d):
            continue
        try:
            ten = d[p + 2:p + 2 + n].decode("utf-8")
        except UnicodeDecodeError:
            continue
        if not HAN.match(ten):
            continue
        q = p + 2 + n
        rc = int.from_bytes(d[q:q + 4], "big"); q += 4
        if not (0 < rc < 200000):
            continue
        cb = int.from_bytes(d[q:q + 2], "big"); q += 2
        if not (4 <= cb < 4000) or q + cb > len(d):
            continue
        s, cot = q, []
        while s < q + cb:
            m = (d[s] << 8) | d[s + 1]; s += 2
            if s + m > q + cb:
                break
            try:
                cot.append(d[s:s + m].decode("utf-8"))
            except UnicodeDecodeError:
                break
            s += m
        if s == q + cb and len(cot) >= 2:
            return p, ten
    raise RuntimeError("khong tim thay bang ke tiep")


def mo_bang(d, ten_bang="基础物品"):
    o = d.find(ten_bang.encode())
    if o < 0:
        raise KeyError(ten_bang)
    p = o - 2
    ten, q = _s(d, p)
    if ten.decode() != ten_bang:
        raise ValueError("neo sai")
    vt_rc = q
    rc = int.from_bytes(d[q:q + 4], "big"); q += 4
    cb = int.from_bytes(d[q:q + 2], "big"); q += 2
    s, cot = q, []
    while s < q + cb:
        v, s = _s(d, s)
        cot.append(v.decode("utf-8"))
    dau_dong = s
    cuoi_dong, _ = dau_bang_ke_tiep(d, dau_dong)
    return {"vt_rc": vt_rc, "rc": rc, "cot": cot, "dau": dau_dong, "cuoi": cuoi_dong}


def doc_dong(d, b):
    """Doc vung dong thanh [(2 byte, [16 o])]. Bao loi neu khong ket thuc dung ranh gioi."""
    q, ra = b["dau"], []
    while q < b["cuoi"]:
        pre = d[q:q + 2]
        s = q + 2
        o = []
        for _ in range(len(b["cot"])):
            v, s = _s(d, s)
            o.append(v)
        if s > b["cuoi"]:
            raise ValueError("dong vuot ranh gioi bang tai %d" % q)
        ra.append((pre, o))
        q = s
    if q != b["cuoi"]:
        raise ValueError("khong ket thuc dung ranh gioi: %d != %d" % (q, b["cuoi"]))
    return ra


def ghi_dong(dong):
    ra = bytearray()
    for pre, o in dong:
        ra += pre
        for x in o:
            ra += _enc(x)
    return bytes(ra)


def tu_xlsm():
    """Lay dinh nghia that cua cac ma can chen, xep theo dung 16 cot cua client."""
    import openpyxl
    wb = openpyxl.load_workbook(XLSM, read_only=True, data_only=True)
    ws = wb["基础物品"]
    rows = list(ws.iter_rows(values_only=True))
    h = [str(c) for c in rows[0]]
    ra = {}
    for r in rows[1:]:
        if not r or r[0] in (None, ""):
            continue
        k = str(r[0]).strip()
        if k in CAN_CHEN:
            ra[k] = {h[i]: ("" if v is None else str(v)) for i, v in enumerate(r) if i < len(h)}
    wb.close()
    return ra


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--file", default=MAC_DINH)
    a = ap.parse_args()

    raw = open(a.file, "rb").read()
    d = zlib.decompress(raw)
    b = mo_bang(d)
    print(f"bang 基础物品: khai {b['rc']} dong, vung [{b['dau']}, {b['cuoi']})")
    dong = doc_dong(d, b)
    print(f"doc duoc {len(dong)} dong x {len(b['cot'])} cot")

    # --- CONG ROUND-TRIP ---
    goc = d[b["dau"]:b["cuoi"]]
    lai = ghi_dong(dong)
    if lai != goc:
        sys.exit(f"!! ROUND-TRIP KHONG KHOP ({len(lai)} vs {len(goc)} byte) — TU CHOI ghi")
    print(f"round-trip: {len(goc)} byte KHOP TUNG BYTE")

    co = {o[0].decode("utf-8", "replace") for _, o in dong}
    thieu = [k for k in CAN_CHEN if k not in co]
    print("can chen:", thieu or "khong con thieu gi")
    if not thieu:
        return

    nguon = tu_xlsm()
    # Ten/mo ta di qua bang thuat ngu de dong bo voi phan chu da chuan hoa.
    from importlib import util as _u
    _sp = _u.spec_from_file_location("_ch", os.path.join(ROOT, "tools", "chuan-hoa-dich.py"))
    _ch = _u.module_from_spec(_sp); _sp.loader.exec_module(_ch)

    them = []
    for k in thieu:
        if k not in nguon:
            sys.exit(f"!! {k} khong co trong item-table.xlsm — khong bia du lieu")
        r = nguon[k]
        o = []
        for c in b["cot"]:
            v = r.get(c, "")
            if c in ("名称", "描述", "类型说明"):
                v = _ch.thay_thuat_ngu(_ch.chuan(v))
            o.append(v)
        than = b"".join(_enc(x) for x in o)
        pre = struct.pack(">H", 2 + len(than))
        them.append((pre, o))
        print(f"  + {k}: {o[1][:44]!r}  ({len(than)+2} byte)")

    moi = d[:b["dau"]] + goc + ghi_dong(them) + d[b["cuoi"]:]
    # cap nhat so dong khai bao
    moi = moi[:b["vt_rc"]] + struct.pack(">I", b["rc"] + len(them)) + moi[b["vt_rc"] + 4:]

    # --- kiem lai tren ban moi ---
    b2 = mo_bang(moi)
    d2 = doc_dong(moi, b2)
    co2 = {o[0].decode("utf-8", "replace") for _, o in d2}
    if len(d2) != len(dong) + len(them) or any(k not in co2 for k in thieu):
        sys.exit("!! kiem lai that bai — TU CHOI ghi")
    # Ngoai vung dong, DUY NHAT 4 byte so dong duoc phep doi. Kiem bang cach vá lại giá
    # trị cũ rồi so nguyên khối — bắt được cả thay đổi ngoài ý muốn lẫn lệch offset.
    thu = moi[:b["vt_rc"]] + struct.pack(">I", b["rc"]) + moi[b["vt_rc"] + 4:]
    if thu[:b["dau"]] != d[:b["dau"]]:
        sys.exit("!! phan dau file (ngoai 4 byte so dong) bi doi — TU CHOI ghi")
    if moi[len(moi) - (len(d) - b["cuoi"]):] != d[b["cuoi"]:]:
        sys.exit("!! phan sau vung dong bi doi — TU CHOI ghi")
    print(f"kiem lai: {len(d2)} dong, khai {b2['rc']}; phan con lai cua file khong doi")

    if a.apply:
        sao = a.file + ".truoc-chen-vat-pham"
        if not os.path.exists(sao):
            shutil.copy2(a.file, sao)
        open(a.file, "wb").write(zlib.compress(moi, 9))
        print("da ghi", a.file)
    else:
        print("chua ghi (--apply de ghi)")


if __name__ == "__main__":
    main()
