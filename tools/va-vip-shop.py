#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Va VIP SHOP khong sap khi may chu gui mat hang client khong co trong bang.

VipShop.sortFun so `getTplInfo(VIP_SHOP_GOODS, a.tid).sort` — tid nao khong co trong
vip商城商品 cua client thi getTplInfo tra undefined -> "Cannot read properties of undefined
(reading 'sort')" ngay trong Array.sort, ca bang trong. Goc: bang client (870 dong) khac bang
server (2646 dong) — da dong bo bang `templates-bin.py bang`; mieng va nay la lop chan thu
hai: thieu mau thi coi sort=0, van ve duoc phan con lai.

    python3 tools/va-vip-shop.py            # xem
    python3 tools/va-vip-shop.py --apply    # ghi (sao luu .truoc-va-vip)
"""
import argparse, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, "website", "game", "libs", "e228b-0b904-ac44c.js")
# `return A['sort']-B[c(0x3456)];` — 0x3456 la ma chuoi 'sort' trong bang chuoi cua bundle.
MAU = re.compile(r"return (_0x[0-9a-f]+)\['sort'\]-(_0x[0-9a-f]+)\[(_0x[0-9a-f]+)\(0x3456\)\];")


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--apply", action="store_true"); ap.add_argument("--js", default=JS)
    a = ap.parse_args()
    src = open(a.js, encoding="utf-8", errors="surrogateescape").read()
    if "&&_0x" in src and "['sort'])||0)-" in src:
        print("da va roi"); return
    # Hai bo so sanh cung khuon (VIP shop va mot cua hang khac); va ca hai — thieu mau thi
    # sort=0 la dung cho moi cua hang.
    hits = list(MAU.finditer(src))
    if not 1 <= len(hits) <= 3:
        sys.exit(f"!! mong 1-3 cho, thay {len(hits)} — bundle doi, xem lai MAU")
    def thay(m):
        A, B, c = m.group(1), m.group(2), m.group(3)
        return f"return (({A}&&{A}['sort'])||0)-(({B}&&{B}[{c}(0x3456)])||0);"
    for m in hits: print("truoc:", m.group(0)); print("sau  :", thay(m))
    if a.apply:
        sao = a.js + ".truoc-va-vip"
        if not os.path.exists(sao): shutil.copy2(a.js, sao)
        open(a.js, "w", encoding="utf-8", errors="surrogateescape").write(MAU.sub(thay, src))
        print(f"da ghi ({len(hits)} cho)")


if __name__ == "__main__":
    main()
