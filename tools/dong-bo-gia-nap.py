#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dong bo gia goi nap: ghi gia web dang thu vao cot 额度 cua bang 充值项.

VAN DE

Gia mot goi nap nam o HAI cho va da troi khoi nhau:

  website/game/api/id.txt                 payId;giaXu  — gia WEB THUC SU THU cua nguoi choi
  server/excel-src/recharge-item/01.json  cot 额度     — gia GAME ghi nhan cho goi do

Game nhan `payAmount` (so xu da thu, di tu id.txt qua game_packages.price_xu) va `itemTid`
(payId), roi tra bang 充值项 de biet phat gi, cong bao nhieu diem VIP, cong bao nhieu vao
累计充值 (tich nap). Lech nhau thi nguoi choi tra mot dang, game ghi so mot dang — moi moc
tich nap va diem VIP deu tinh sai. Vi du 图腾圣殿周卡: thu 1.000.000 xu, game ghi 100.000.

HUONG: id.txt -> 额度. DONG BO, KHONG DOI GIA BAN.

  1. Khong nguoi choi nao thay gia doi. id.txt la gia he thong DANG thu that; sua no la doi
     gia ban — quyet dinh kinh doanh, khong phai viec dong bo.
  2. Dat 额度 = so xu thuc thu thi `payAmount == 额度` tren toan bo danh muc, diem VIP va
     moc tich nap tinh dung tro lai.
  3. Bang chung o cum lon nhat: day 1200xx co 28 muc HAI NGUON DA DONG Y o 15.000, chi 14
     muc excel troi len 50.000 — da so anh em cung day dung ve phia id.txt.
  4. 62/64 muc lech nam trong nhom `event`; chi 19101 va 31004 la goi de thay. Doi 额度
     khong dung toi gia hien tren web cua ca hai.

TOOL NAY KHONG DOI GIA BAN. Vai gia trong id.txt tu no da kho hieu (高级附魔自选 V8 =
500.000 trong khi V11 = 3.000, cung 30元) — chi IN RA de nguoi van hanh quyet dinh, vi doi
chung la doi so tien nguoi choi phai tra.

    python3 tools/dong-bo-gia-nap.py            # xem truoc
    python3 tools/dong-bo-gia-nap.py --apply    # ghi, roi chay json-to-excel.py
"""
import argparse, collections, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID_TXT = os.path.join(ROOT, "website", "game", "api", "id.txt")
PAY_TXT = os.path.join(ROOT, "website", "game", "gmhanglong", "gm", "pay.txt")
ITEM = os.path.join(ROOT, "server", "excel-src", "recharge-item", "01.json")


def doc_gia_web():
    g = {}
    with open(ID_TXT, encoding="utf-8", errors="replace") as f:
        for ln in f:
            if ";" in ln:
                a, b = ln.split(";", 1)
                pid = a.strip()
                # id.txt co 23 payId ghi HAI LAN, 12 trong so do gia MAU THUAN nhau (vd
                # 222072 dong 56 = 15.000, dong 1941 = 100.000). Tang PHP cu va
                # gen-game-packages.py deu lay lan XUAT HIEN DAU; phai theo dung the, neu
                # khong se day gia khong ai dung vao bang cau hinh cua game.
                if pid in g:
                    continue
                try:
                    g[pid] = int(float(b.strip()))
                except ValueError:
                    pass
    return g


def doc_gia_goc():
    """pay.txt giu gia goc bang 元 — dung de nhan ra gia kho hieu."""
    g = {}
    with open(PAY_TXT, encoding="utf-8", errors="replace") as f:
        for ln in f:
            p = ln.rstrip("\n").split(",")
            if len(p) >= 3 and p[0].strip().isdigit():
                m = re.match(r"\s*([\d.]+)", p[-1])
                if m:
                    try:
                        g[p[0].strip()] = float(m.group(1))
                    except ValueError:
                        pass
    return g


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--don-id-txt", action="store_true",
                    help="xoa cac dong payId lap lai trong id.txt, giu lan dau")
    a = ap.parse_args()

    web, goc = doc_gia_web(), doc_gia_goc()
    doc = json.load(open(ITEM, encoding="utf-8"))
    rows = doc["rows"]
    hdr = rows[0]
    iA, iN = hdr.index("额度"), hdr.index("*名称")

    lech = []
    for r in rows[1:]:
        if not r or r[0] in (None, ""):
            continue
        pid = str(r[0]).strip()
        if pid not in web:
            continue
        try:
            cu = int(float(r[iA]))
        except (TypeError, ValueError):
            continue
        if cu == web[pid]:
            continue
        lech.append((pid, web[pid], cu, str(r[iN])))
        r[iA] = web[pid]

    print(f"muc lech: {len(lech)}")
    for (b, c), n in collections.Counter((x[1], x[2]) for x in lech).most_common():
        vd = [p for p, x, y, _ in lech if (x, y) == (b, c)][:3]
        print(f"   dat 额度 = {b:>9,} (dang la {c:>9,})  x{n:<3} vd {','.join(vd)}")

    ho = collections.defaultdict(list)
    for pid, gw, _, ten in lech:
        ho[re.sub(r"[-\d]+$", "", ten)].append((gw, goc.get(pid)))
    ngo = [(t, sorted({y for _, y in d if y})[0], sorted({g for g, _ in d}))
           for t, d in ho.items()
           if len({y for _, y in d if y}) == 1 and len({g for g, _ in d}) > 1]
    if ngo:
        print("\n!! GIA WEB KHO HIEU — cung gia goc nhung gia xu khac nhau. Tool KHONG dung toi;")
        print("   can nguoi quyet dinh co dat lai gia ban khong:")
        for t, y, xs in ngo:
            print(f"   {t:26s} deu {y:>5,.0f} 元  nhung thu {', '.join(f'{x:,}' for x in xs)} xu")

    if a.don_id_txt:
        # 23 payId ghi hai lan, 12 trong so do gia mau thuan. Nguoi doc file khong the biet
        # dong nao co hieu luc; tang PHP va tool sinh danh muc deu lay dong DAU. Xoa dong sau
        # de file noi dung mot nghia — gia co hieu luc khong doi.
        seen, giu, bo = set(), [], []
        for ln in open(ID_TXT, encoding="utf-8", errors="replace"):
            if ";" in ln:
                pid = ln.split(";", 1)[0].strip()
                if pid in seen:
                    bo.append((pid, ln.strip()))
                    continue
                seen.add(pid)
            giu.append(ln)
        print(f"\nid.txt: xoa {len(bo)} dong lap (giu lan dau)")
        for pid, ln in bo[:6]:
            print(f"   bo: {ln}")
        if a.apply and bo:
            with open(ID_TXT, "w", encoding="utf-8") as f:
                f.writelines(giu)
            print("   da ghi id.txt")

    if a.apply and lech:
        with open(ITEM, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, separators=(",", ":"), indent=None)
        print(f"\nda ghi {len(lech)} o vao {os.path.relpath(ITEM, ROOT)}")
    else:
        print("\nchua ghi (--apply de ghi)")


if __name__ == "__main__":
    main()
