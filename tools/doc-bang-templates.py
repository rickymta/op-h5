#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Doc mot bang trong `templates.bin` cua client — nguon SU THAT ve ten hien cho nguoi choi.

VI SAO CAN

Game da bi THAY AO: ban goc Trung Quoc lay boi canh than thoai, ban dang chay la One Piece.
Bang vat pham cua server (`server/excel/release/item-table.xlsm`) van con ten cua ban goc,
con `templates.bin` cua client mang ten nguoi choi that su nhin thay. Do duoc do lech:

    1066 vat pham co ca hai ben  ->  678 KHAC TEN (63%)
    vi du  601013  server 'Vo Don Nho'      client 'Bege'
           605003  server 'Bo Dai Hoa Thuong' client 'Moria'
           1000001 server 'Tien xu tui'     client 'Tui beri (24 Gio )'
           100022  server 'Lenh tuong cao cap' client 'Chieu mo cao cap'

Nguoi van hanh xac nhan: **theo client moi dung**. Ai doc ten tu item-table.xlsm se in ra
ten cua mot game khac — dung cai bay ma `gen-danh-muc-game.py` da canh bao cho TUONG, nhung
phan VAT PHAM thi van con dinh.

DINH DANG (do duoc, khong doan)

`templates.bin` = res/97cec-62c2f-5f56f, JSON... khong, la bang nhi phan nen zlib. Trong do
moi bang xep lien tiep:

    <ten bang>            chuoi writeUTF (2 byte do dai big-endian + UTF-8)
    <so dong>             4 byte big-endian
    <2 byte>              chua ro nghia, bo qua
    <ten cot> x N         chuoi writeUTF, ket thuc khi gap chuoi toan chu so (= o dau tien
                          cua dong dau)
    moi dong:  <2 byte>   tien to, chua ro nghia
               <o> x N    chuoi writeUTF — KE CA so, deu luu dang chuoi

Da kiem: bang `基础物品` khai 1070 dong x 16 cot, doc ra 1069 dong, va ten khop dung thu
nguoi choi thay tren man hinh (100022 = 'Chieu mo cao cap', dung nhu anh chup cua nguoi
van hanh).

    python3 tools/doc-bang-templates.py 基础物品 --dem
    python3 tools/doc-bang-templates.py 基础物品 --ra /tmp/vat-pham.json
"""
import argparse, json, os, sys, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAC_DINH = os.path.join(ROOT, "website", "game", "res", "97cec-62c2f-5f56f")


def _chuoi(d, p):
    """Doc mot chuoi writeUTF tai p. Tra (text, p_moi); (None, None) neu khong doc duoc."""
    if p + 2 > len(d):
        return None, None
    L = (d[p] << 8) | d[p + 1]
    if L == 0:
        return "", p + 2
    if p + 2 + L > len(d):
        return None, None
    try:
        return d[p + 2:p + 2 + L].decode("utf-8"), p + 2 + L
    except UnicodeDecodeError:
        return None, None


def doc_bang(ten_bang, duong_dan=MAC_DINH):
    """Tra ve (cot, dong) — dong la list cac list o dang chuoi."""
    d = zlib.decompress(open(duong_dan, "rb").read())
    moc = d.find(ten_bang.encode())
    if moc < 0:
        raise KeyError("khong tim thay bang " + ten_bang)
    p = moc - 2
    ten, p = _chuoi(d, p)
    if ten != ten_bang:
        raise ValueError("neo khong dung dau bang: %r" % ten)
    so_dong = int.from_bytes(d[p:p + 4], "big")
    p += 4 + 2

    cot = []
    while True:
        t, q = _chuoi(d, p)
        if t is None or t.isdigit():
            break
        cot.append(t)
        p = q

    dong = []
    for _ in range(so_dong):
        p += 2                       # tien to moi dong
        o = []
        for _ in range(len(cot)):
            t, q = _chuoi(d, p)
            if t is None:
                break
            o.append(t)
            p = q
        if len(o) != len(cot):
            break                    # het bang; khai bao so dong co the du mot
        dong.append(o)
    return cot, dong


def ten_vat_pham(duong_dan=MAC_DINH):
    """{id: ten} cho bang vat pham co ban. Dung cho moi cho can HIEN ten cho nguoi."""
    cot, dong = doc_bang("基础物品", duong_dan)
    i_id, i_ten = cot.index("物品ID"), cot.index("名称")
    return {r[i_id]: r[i_ten] for r in dong if r[i_id].isdigit()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("bang")
    ap.add_argument("--file", default=MAC_DINH)
    ap.add_argument("--dem", action="store_true")
    ap.add_argument("--ra")
    a = ap.parse_args()
    cot, dong = doc_bang(a.bang, a.file)
    print(f"bang {a.bang}: {len(dong)} dong x {len(cot)} cot")
    print("cot:", cot)
    for r in dong[:5]:
        print("   ", [x[:24] for x in r[:8]])
    if a.ra:
        json.dump({"cot": cot, "dong": dong}, open(a.ra, "w"), ensure_ascii=False)
        print("da ghi", a.ra)


if __name__ == "__main__":
    main()
