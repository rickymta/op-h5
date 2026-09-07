#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Xep 11 nguyen mau tuong "One Piece dac biet" vao phe Hon don (阵营=6) trong hero.xlsx cua MAY CHU.

VI SAO
Client (ban One Piece) von de 11 nguyen mau nay o phe 6 "Hon don"; may chu (ban cu) xep ho
phe 1-5. Chi phi thang tinh kieu `15:x` (vat lieu Hon don) may chu chi nhan phe 4/5/6, nen
20 ban Nika 6* cua nguoi choi khong dung duoc lam vat lieu, con client cu thi cho chon roi bi
80026. Nguoi van hanh chot 2026-09-07: theo thiet ke One Piece — may chu cung phe 6. May chu
co san lop phe 6 (tuong Hon don rieng 6012-6016), khong can va code.

Sau khi chay: json-to-excel hero -> ExcelProbe -> commit -> image server (restart Java);
client: templates-bin.py tuong (cot 阵营 la cot luat, lay theo server).

    python3 tools/phe-hon-don.py --check
    python3 tools/phe-hon-don.py
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = os.path.join(ROOT, "server", "excel-src", "hero", "01.json")
# 原型ID cua 11 nguyen mau (client goc: phe 6). 5017 Black Beard, 6004 Kaido, 6005 Shanks von da
# o phe 4/5 (hop le cho vat lieu Hon don) nhung cung doi cho dong bo voi client.
PROTO = {102200, 102300, 501700, 600100, 600200, 600300, 600400, 600500, 600600, 600700, 600800}


def main():
    check = "--check" in sys.argv
    j = json.load(open(F, encoding="utf-8")); rows = j["rows"]; H = rows[0]
    ip, ic = H.index("原型ID"), H.index("阵营")
    doi = {}
    for r in rows[1:]:
        if not r or len(r) <= ic: continue
        try: p = int(float(r[ip])) if r[ip] not in (None, "") else -1
        except (TypeError, ValueError): continue
        if p in PROTO and int(float(r[ic] or 0)) != 6:
            doi[p] = doi.get(p, 0) + 1
            if not check: r[ic] = 6
    print("dong doi 阵营 -> 6 theo nguyen mau:", dict(sorted(doi.items())), "tong", sum(doi.values()))
    if not check:
        with open(F, "w", encoding="utf-8") as fh: json.dump(j, fh, ensure_ascii=False, separators=(",", ":"))
        print("da ghi", os.path.relpath(F, ROOT))


if __name__ == "__main__":
    main()
