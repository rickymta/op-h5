#!/usr/bin/env python3
"""Ap bang viet lai nhan (tools/ui-text-fix.json) vao file giao dien cua game.

    python3 tools/apply-ui-text.py website/game/res/d6519-958fd-b2f8f
    python3 tools/apply-ui-text.py <duong-dan> --thu       # chi xem truoc, khong ghi

VI SAO CAN CONG CU RIENG
File giao dien (`ui/ui.json`, 15,9 MB) nam trong `res/` — 1,6 GB assets KHONG nam trong
git (CLAUDE.md muc 16). Sua thang vao do thi mat sau moi lan tai lai `assets-v1`. Nen
ban sua duoc luu duoi dang BANG ANH XA trong git, va chay lai duoc bat cu luc nao.

An toan: chi thay khi chuoi KHOP TUYET DOI toan bo `props.text`. Khong thay chuoi con,
nen khong the lam hong mot nhan chi vi no chua doan giong nhau.

Chay lai duoc nhieu lan: chuoi da doi thi khong con khop khoa nao nua.
"""
import argparse
import json
import os
import shutil
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))


def chuan(s):
    """Chuan hoa de so sanh.

    File giao dien tron hai dang Unicode: 3041/3213 chuoi o dang NFC, 172 chuoi con lai
    o dang NFD (dau tach roi). Hai dang do TRONG GIONG HET nhau nhung khac byte, nen so
    sanh thang se truot dung nhung chuoi do. Chuan hoa ve NFC truoc khi so.
    """
    return unicodedata.normalize('NFC', s)


def di(node, doi, dem):
    if isinstance(node, dict):
        p = node.get('props')
        if isinstance(p, dict):
            t = p.get('text')
            if isinstance(t, str):
                k = chuan(t)
                if k in doi:
                    p['text'] = doi[k]
                    dem[k] = dem.get(k, 0) + 1
        for k, v in node.items():
            di(v, doi, dem)
    elif isinstance(node, list):
        for v in node:
            di(v, doi, dem)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ui', help='duong dan toi ui.json (res/d6519-958fd-b2f8f)')
    ap.add_argument('--bang', default=os.path.join(HERE, 'ui-text-fix.json'))
    ap.add_argument('--thu', action='store_true', help='chi xem truoc, khong ghi')
    a = ap.parse_args()

    with open(a.bang, encoding='utf-8') as f:
        doi = {chuan(k): v for k, v in json.load(f)['doi'].items()}
    with open(a.ui, encoding='utf-8') as f:
        ui = json.load(f)

    dem = {}
    di(ui, doi, dem)

    thay = sum(dem.values())
    print('  muc trong bang        : %d' % len(doi))
    print('  khoa co khop          : %d' % len(dem))
    print('  so lan thay           : %d' % thay)
    khong = [k for k in doi if k not in dem]
    if khong:
        print('  khoa KHONG khop (%d)  — chuoi da doi roi, hoac sai chinh ta:' % len(khong))
        for k in khong[:10]:
            print('     %r' % k[:60])

    if a.thu:
        print('  (--thu: khong ghi gi)')
        return 0
    if not thay:
        print('  khong co gi de ghi.')
        return 0

    bak = a.ui + '.truoc-khi-sua'
    if not os.path.exists(bak):
        shutil.copy2(a.ui, bak)
        print('  da sao luu -> %s' % os.path.basename(bak))
    # separators de khong chen dau cach thua; ensure_ascii=False de giu tieng Viet
    with open(a.ui, 'w', encoding='utf-8') as f:
        json.dump(ui, f, ensure_ascii=False, separators=(',', ':'))
    print('  da ghi %s' % a.ui)
    return 0


if __name__ == '__main__':
    sys.exit(main())
