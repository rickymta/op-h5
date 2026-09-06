#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Doi don vi hien thi so trong game tu "Van/Uc" sang K/M/B.

VI SAO PHAI VA BUNDLE CHU KHONG SUA DU LIEU

Hau to nam trong bang chuoi cua `templates.bin` (ID 20083 = "{d} Van", 20084 = "{d} Uc"),
nhung UOC SO nam trong ma. Ham dinh dang (duy nhat, 385 byte trong
`libs/e228b-0b904-ac44c.js`) giai ra la:

    v < 100.000            -> in nguyen so
    v < 100.000.000        -> floor(v/10^4) + " Van"      (tpl 20083)
    1e8 <= v < 1e9         -> floor(v/10^7)/10 + " Uc"    (tpl 20084, mot so le)
    v >= 1e9               -> floor(v/10^8) + " Uc"

Doi rieng chuoi hau to se SAI DO LON: 2586 Van = 25.860.000, khong phai 2586K. Va chi 2 ma
template cho 3 bac K/M/B thi cung khong du. Nen phai thay ca uoc so — tuc va ma.

CACH VA

Thay dung mot chuoi (chuoi nay xuat hien 1 lan trong bundle; tool tu kiem va tu choi neu
khac 1). Giu nguyen ten ham va ten tham so da obfuscate, chi doi phan than:

    v < 100.000            -> in nguyen so          (GIU nguyen nguong cu, de khong lam
                                                     mat do chi tiet o cac so nho)
    1e5 <= v < 1e6         -> floor(v/1e3) + "K"
    1e6 <= v < 1e9         -> floor(v/1e5)/10 + "M"
    v >= 1e9               -> floor(v/1e8)/10 + "B"

Doi chieu voi anh nguoi van hanh gui:
    2586 Van = 25.860.000  -> 25.8M
    41 Uc    = 4.100.000.000 -> 4.1B
    6.5 Uc   = 650.000.000 -> 650M

    python3 tools/va-don-vi-kmb.py            # xem truoc
    python3 tools/va-don-vi-kmb.py --apply    # va (tu sao luu .truoc-kmb)
    python3 tools/va-don-vi-kmb.py --revert   # tra lai ban goc
"""
import argparse, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, "website", "game", "libs", "e228b-0b904-ac44c.js")

# Khuon nhan dien: bat ten ham/tham so da obfuscate de khong phu thuoc ban build.
KHUON = re.compile(
    r"static\[(?P<k>_0x[0-9a-f]+)\((?P<kid>0x[0-9a-f]+)\)\]\((?P<v>_0x[0-9a-f]+)\)\{"
    r"const (?P<c>_0x[0-9a-f]+)=(?P=k);"
    r"if\((?P=v)<0x186a0\)return (?P=v)\+'';"
    r"else\{if\((?P=v)<0x5f5e100\)return .{0,120}?0x4e73.{0,120}?0x2710\)\]\);"
    r"else return (?P=v)>=0x5f5e100&&(?P=v)<0x3b9aca00\?.{0,160}?0x4e74.{0,160}?"
    r":.{0,160}?0x4e74.{0,160}?\}\}"
)


def than_moi(k, kid, v):
    return (
        f"static[{k}({kid})]({v}){{"
        f"if({v}<0x186a0)return {v}+'';"
        f"if({v}<0xf4240)return Math.floor({v}/0x3e8)+'K';"
        f"if({v}<0x3b9aca00)return Math.floor({v}/0x186a0)/0xa+'M';"
        f"return Math.floor({v}/0x5f5e100)/0xa+'B';}}"
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--revert", action="store_true")
    ap.add_argument("--js", default=JS)
    a = ap.parse_args()
    sao = a.js + ".truoc-kmb"

    if a.revert:
        if not os.path.exists(sao):
            sys.exit("khong co ban sao luu " + sao)
        shutil.copy2(sao, a.js)
        print("da tra lai ban goc")
        return

    src = open(a.js, encoding="utf-8", errors="surrogateescape").read()
    ms = list(KHUON.finditer(src))
    if len(ms) != 1:
        sys.exit(f"tim thay {len(ms)} cho khop, phai dung 1 — dung va, kiem tra lai bundle")
    m = ms[0]
    moi = than_moi(m.group("k"), m.group("kid"), m.group("v"))
    print("=== than ham CU ===\n" + m.group(0))
    print("\n=== than ham MOI ===\n" + moi)
    if a.apply:
        if not os.path.exists(sao):
            shutil.copy2(a.js, sao)
        out = src[: m.start()] + moi + src[m.end():]
        open(a.js, "w", encoding="utf-8", errors="surrogateescape").write(out)
        print(f"\nda va {a.js}  ({len(src)} -> {len(out)} byte)")
    else:
        print("\nchua ghi (--apply de ghi)")


if __name__ == "__main__":
    main()
