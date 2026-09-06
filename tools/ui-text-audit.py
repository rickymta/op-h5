#!/usr/bin/env python3
"""Soi nhan chu trong giao dien game: tim cho chu TRAN KHOI O.

    python3 tools/ui-text-audit.py                      # toan bo, chi in cho nghi tran
    python3 tools/ui-text-audit.py --loc shop,welfare   # loc theo ten man hinh
    python3 tools/ui-text-audit.py --tat-ca             # in ca nhan khong tran

NGUON: website/game/res/d6519-958fd-b2f8f = `ui/ui.json` trong bang anh xa
(libs/2af72-f100c-2af72.json). Day la file dinh nghia giao dien LayaAir — 865 man hinh,
kem toa do, KICH THUOC O va CO CHU cua tung nhan. Moi loi "chu bi khuat / bi cat" deu
sua o day, khong phai trong bundle da obfuscate.

CACH UOC LUONG BE RONG
Khong co font that nen dung uoc luong: chu Han ~1.0 em, chu Latin ~0.5 em, dau cach
~0.28 em. Uoc luong nay chi de XEP HANG cho nao dang ngo, khong phai so do chinh xac —
cho nao bi danh dau thi mo giao dien xem lai.

LUU Y: `props.text` trong file nay la VAN BAN MAU luc thiet ke (thu hien trong LayaAir
IDE). Luc chay client thay bang gia tri that, thuong DAI HON van ban mau — nen mot o
vua khit voi van ban mau van co the tran luc chay. Vi the nguong mac dinh de 0.9.
"""
import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(HERE, '..', 'website', 'game', 'res', 'd6519-958fd-b2f8f')


def be_rong(s: str, co_chu: float) -> float:
    """Uoc luong be rong pixel cua chuoi."""
    w = 0.0
    for ch in s:
        o = ord(ch)
        if 0x4E00 <= o <= 0x9FFF or 0x3000 <= o <= 0x303F:
            w += 1.0            # chu Han: o vuong
        elif ch == ' ':
            w += 0.28
        elif ch.isupper():
            w += 0.62
        else:
            w += 0.52
    return w * co_chu


def thu_thap(node, man, duong, ra):
    if isinstance(node, dict):
        p = node.get('props') or {}
        if isinstance(p, dict) and isinstance(p.get('text'), str) and p['text'].strip():
            ra.append({
                'man': man, 'duong': duong, 'loai': node.get('type', '?'),
                'text': p['text'],
                'w': p.get('width'), 'co_chu': p.get('fontSize') or p.get('size') or 20,
                'overflow': p.get('overflow'), 'wordWrap': p.get('wordWrap'),
                'align': p.get('align'),
            })
        for k, v in node.items():
            if k != 'props':
                thu_thap(v, man, duong + '/' + str(k), ra)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            thu_thap(v, man, duong + '[%d]' % i, ra)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ui', default=UI)
    ap.add_argument('--loc', default='', help='loc ten man hinh, ngan cach bang dau phay')
    ap.add_argument('--tat-ca', action='store_true', help='in ca nhan khong tran')
    ap.add_argument('--nguong', type=float, default=0.9,
                    help='ty le rong/o vuot qua thi bao (mac dinh 0.9)')
    a = ap.parse_args()

    with open(a.ui, encoding='utf-8') as f:
        ui = json.load(f)

    ten = list(ui)
    if a.loc:
        pat = re.compile('|'.join(x.strip() for x in a.loc.split(',') if x.strip()), re.I)
        ten = [k for k in ten if pat.search(k)]

    ra = []
    for k in ten:
        thu_thap(ui[k], k, k, ra)

    ngo = []
    for r in ra:
        if not isinstance(r['w'], (int, float)) or r['w'] <= 0:
            continue
        if r['wordWrap']:            # co xuong dong thi khong tinh la tran
            continue
        ty = be_rong(r['text'], float(r['co_chu'])) / float(r['w'])
        r['ty'] = ty
        if a.tat_ca or ty > a.nguong:
            ngo.append(r)

    ngo.sort(key=lambda r: -r['ty'])
    print('  man hinh xet : %d' % len(ten))
    print('  nhan co chu  : %d' % len(ra))
    print('  nhan dang ngo: %d  (rong uoc luong / be rong o > %.2f)' % (len(ngo), a.nguong))
    print()
    print('  %-24s %-34s %5s %4s %5s' % ('man hinh', 'text mau', 'o', 'chu', 'ty le'))
    for r in ngo[:60]:
        print('  %-24s %-34s %5s %4s %5.2f' % (
            r['man'][:24], r['text'].replace('\n', ' ')[:34], r['w'], r['co_chu'], r['ty']))
    if len(ngo) > 60:
        print('  ... con %d nhan nua' % (len(ngo) - 60))
    return 0


if __name__ == '__main__':
    sys.exit(main())
