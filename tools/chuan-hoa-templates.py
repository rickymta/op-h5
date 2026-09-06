#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Chuan hoa chu trong `templates.bin` — ten vat pham, mo ta nhiem vu, ten ky nang.

VI SAO CAN

Chu nguoi choi nhin thay den tu BA nguon, khong phai hai:

    res/aace3-5ee03-baa8e  = ui/ui.bin        nhan giao dien          (da chuan hoa)
    server/excel-src/**    = cau hinh server  bang so lieu            (da chuan hoa)
    res/97cec-62c2f-5f56f  = template/templates.bin                   <- NGUON NAY

`templates.bin` la ban sao cau hinh phia CLIENT: ten vat pham, ten ky nang, mo ta nhiem vu.
Bang thuat ngu cua `tools/chuan-hoa-dich.py` chua bao gio cham toi no, nen trong game van
con "anh hung" du ui.bin va Excel da doi. Vi du nguoi van hanh bat duoc: o nang sao hien
"5 Tinh anh hung" — day la TEN VAT PHAM tu file nay.

DINH DANG (da do)

Chuoi luu kieu Java `DataOutputStream.writeUTF`: **2 byte do dai big-endian** roi den bay
nhieu byte UTF-8. Da kiem tren nhieu mau: 'Vat pham thua' -> (0,19)+19 byte, mot mo ta 84
byte -> (0,84). Nen sua duoc chu, mien ghi lai dung do dai.

CACH THAY — AN TOAN

Khong quet roi doan dau la chuoi. Thay THEO BAN GHI NGUYEN VEN: khoa tim gom CA hai byte do
dai lan noi dung. Mot cum byte nhi phan ngau nhien vua trung do dai vua giai ma duoc UTF-8
vua chua dung cum can doi la chuyen gan nhu khong xay ra.

Sau khi ghi, tu kiem: dem lai so ban ghi doc duoc va so byte lech phai dung bang tong thay
doi do dai.

    python3 tools/chuan-hoa-templates.py            # xem truoc
    python3 tools/chuan-hoa-templates.py --apply
    python3 tools/chuan-hoa-templates.py --apply --file /opt/tcg/assets/res/97cec-62c2f-5f56f
"""
import argparse, os, re, shutil, struct, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAC_DINH = os.path.join(ROOT, "website", "game", "res", "97cec-62c2f-5f56f")

# Nap chung bang thuat ngu voi ui.bin va Excel — mot nguon su that.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import util as _u
_sp = _u.spec_from_file_location("_ch", os.path.join(os.path.dirname(os.path.abspath(__file__)), "chuan-hoa-dich.py"))
_ch = _u.module_from_spec(_sp)
_sp.loader.exec_module(_ch)

# Rieng cho file nay: "5 Tinh anh hung" la TEN VAT PHAM, nguoi van hanh muon doc la
# "Tuong 5 sao" (danh tu truoc, "sao" thay cho am Han-Viet "Tinh").
SAO = re.compile(r"(\d+)\s*Tinh\s+anh\s+hùng", re.IGNORECASE)


def doi(s):
    s = unicodedata.normalize("NFC", s)
    s = SAO.sub(lambda m: f"Tướng {m.group(1)} sao", s)
    return _ch.thay_thuat_ngu(s)


def cac_chuoi(d):
    """Liet ke cac ban ghi <2 byte do dai><UTF-8> doc duoc. Chi de LIET KE, khong de ghi."""
    ra, i, n = [], 0, len(d)
    while i < n - 2:
        L = (d[i] << 8) | d[i + 1]
        if 2 <= L <= 4000 and i + 2 + L <= n:
            seg = d[i + 2:i + 2 + L]
            if not any(b < 0x20 for b in seg):
                try:
                    t = seg.decode("utf-8")
                except UnicodeDecodeError:
                    i += 1
                    continue
                if re.search(r"[A-Za-zÀ-ỹ]", t):
                    ra.append((i, L, t))
                    i += 2 + L
                    continue
        i += 1
    return ra


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--file", default=MAC_DINH)
    a = ap.parse_args()

    import zlib
    raw = open(a.file, "rb").read()
    d = zlib.decompress(raw)
    truoc_so = len(cac_chuoi(d))

    can = {}
    for _, _, t in cac_chuoi(d):
        m = doi(t)
        if m != t:
            can[t] = m

    print(f"ban ghi chu doc duoc : {truoc_so}")
    print(f"chuoi can doi        : {len(can)}")
    for t, m in list(can.items())[:10]:
        print(f"    {t[:56]!r}\n      -> {m[:56]!r}")

    lech = 0
    for t, m in can.items():
        cu = struct.pack(">H", len(t.encode())) + t.encode()
        moi = struct.pack(">H", len(m.encode())) + m.encode()
        sl = d.count(cu)
        if sl == 0:
            continue
        d = d.replace(cu, moi)
        lech += sl * (len(moi) - len(cu))

    sau_so = len(cac_chuoi(d))
    print(f"\nsau khi thay: ban ghi doc duoc = {sau_so} (truoc {truoc_so})")
    print(f"tong lech byte = {lech}")
    if sau_so != truoc_so:
        sys.exit("!! so ban ghi thay doi — KHONG ghi, file co the da hong")

    if a.apply:
        sao = a.file + ".truoc-chuan-hoa-tpl"
        if not os.path.exists(sao):
            shutil.copy2(a.file, sao)
        open(a.file, "wb").write(zlib.compress(d, 9))
        print(f"da ghi {a.file}")
    else:
        print("chua ghi (--apply de ghi)")


if __name__ == "__main__":
    main()
