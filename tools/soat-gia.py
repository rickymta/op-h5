#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Soat moi cot gia trong cau hinh va bao cho nao lech.

BA CHO GIU GIA, KHONG PHAI HAI

  website/game/api/id.txt                 payId;giaXu — gia web THU cua nguoi choi
  server/excel-src/recharge-item/01.json  cot 额度    — bac nap game ghi cho goi do
  52 bang cua hang (cot 价格 + 充值项ID)               — gia HIEN trong game

`tools/dong-bo-gia-nap.py` lo hai cho dau. File nay soat cho thu ba, va PHAN LOAI thay vi
sua bua — vi hai trong ba kieu lech duoi day KHONG phai loi.

BA KIEU LECH

  1. KHAC DON VI. Vai bang ghi gia bang 元 chu khong phai xu (回归商城 ghi 128, 藏品上新
     ghi 648). Ty le 额度/价格 ~500-780. Doi sang xu la SAI.

  2. QUY VE BAC NAP. Gia le nam ngoai thang bac chuan duoc ghi len bac ke tiep:
     60.000 -> 100.000 (65 dong) va 150.000 -> 200.000 (91 dong), khong mot ngoai le.
     Nhat quan tuyet doi nen day la thiet ke, khong phai troi du lieu: 额度 o day la BAC
     NAP de tinh diem VIP va moc tich nap, khong phai gia ban.

  3. CAN NGUOI XEM. Phan con lai — dac biet khi CUNG mot 充值项 bi nhieu cua hang dat gia
     khac nhau, luc do khong the vua dung cho nay vua dung cho kia.

TOOL NAY KHONG SUA GI. Doi gia la doi so tien nguoi choi tra; can biet y do san pham chu
khong suy tu du lieu. Chay de theo doi, va chay lai sau moi lan sua cau hinh.

    python3 tools/soat-gia.py            # tom tat
    python3 tools/soat-gia.py --chi-tiet # liet ke tung dong
"""
import argparse, collections, glob, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITEM = os.path.join(ROOT, "server", "excel-src", "recharge-item", "01.json")
ID_TXT = os.path.join(ROOT, "website", "game", "api", "id.txt")


def doc_item():
    j = json.load(open(ITEM, encoding="utf-8"))
    h = j["rows"][0]
    iA, iN = h.index("额度"), h.index("*名称")
    out = {}
    for r in j["rows"][1:]:
        if not r or r[0] in (None, ""):
            continue
        try:
            out[str(r[0]).strip()] = (int(float(r[iA])), str(r[iN]))
        except (TypeError, ValueError):
            pass
    return out


def doc_id_txt():
    g = {}
    for ln in open(ID_TXT, encoding="utf-8", errors="replace"):
        if ";" in ln:
            a, b = ln.split(";", 1)
            if a.strip() in g:      # id.txt co dong lap; tang PHP lay dong DAU
                continue
            try:
                g[a.strip()] = int(float(b.strip()))
            except ValueError:
                pass
    return g


def quet_cua_hang(item):
    """Tra ve [(bang, sheet, dong, refId, gia)] cho moi dong co tro toi 充值项."""
    ra = []
    for f in sorted(glob.glob(os.path.join(ROOT, "server/excel-src/*/*.json"))):
        if f.endswith("_index.json"):
            continue
        try:
            j = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        rows = j.get("rows") or []
        if not rows:
            continue
        h = [str(c) for c in (rows[0] or [])]
        gi = [i for i, c in enumerate(h) if c == "价格"]
        ri = [i for i, c in enumerate(h) if "充值项" in c]
        if not gi or not ri:
            continue
        gi, ri = gi[0], ri[0]
        for n, r in enumerate(rows[1:], 2):
            if not r or len(r) <= max(gi, ri):
                continue
            ref = str(r[ri]).strip() if r[ri] is not None else ""
            if ref in ("", "None") or ref not in item:
                continue
            try:
                ra.append((f.split(os.sep)[-2], j["sheet"], n, ref, int(float(r[gi]))))
            except (TypeError, ValueError):
                pass
    return ra


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chi-tiet", action="store_true")
    a = ap.parse_args()

    item, web = doc_item(), doc_id_txt()
    thang = sorted({v for v, _ in item.values()})

    # (1) id.txt vs 额度
    n1 = [p for p in web if p in item and web[p] != item[p][0]]
    print(f"[1] id.txt  vs 充值项.额度 : {len(n1)} lech" + ("" if n1 else "  — DONG BO"))
    for p in n1[:8]:
        print(f"      {p}  web {web[p]:>9,}  game {item[p][0]:>9,}  {item[p][1][:28]}")

    # (2) cua hang vs 额度
    ds = quet_cua_hang(item)
    donvi, bac, xem = [], [], []
    for bang, sheet, n, ref, gia in ds:
        dd = item[ref][0]
        if gia == dd:
            continue
        if gia and dd / gia >= 100:
            donvi.append((bang, sheet, n, ref, gia, dd))
        elif gia not in thang and min([x for x in thang if x > gia], default=None) == dd:
            bac.append((bang, sheet, n, ref, gia, dd))
        else:
            xem.append((bang, sheet, n, ref, gia, dd))
    print(f"\n[2] cua hang vs 充值项.额度 : {len(ds)} dong doi chieu")
    print(f"      khac don vi (bang ghi 元)        : {len(donvi):4d}  -> khong phai loi")
    print(f"      quy ve bac nap ke tiep           : {len(bac):4d}  -> thiet ke, khong phai loi")
    print(f"      CAN NGUOI XEM                    : {len(xem):4d}")
    for (g, d), k in collections.Counter((x[4], x[5]) for x in xem).most_common(8):
        vd = {x[3] for x in xem if (x[4], x[5]) == (g, d)}
        print(f"         hien {g:>9,} / ghi {d:>9,}  x{k:<4} vd {','.join(sorted(vd)[:4])}")

    # (3) mot 充值项 bi nhieu cua hang dat gia khac nhau
    theo = collections.defaultdict(set)
    for bang, sheet, n, ref, gia in ds:
        theo[ref].add(gia)
    mt = {k: v for k, v in theo.items() if len(v) > 1}
    print(f"\n[3] mot 充值项 bi nhieu cua hang dat GIA KHAC NHAU: {len(mt)}")
    for k, v in sorted(mt.items())[:10]:
        cho = {f"{b}/{s}" for b, s, _, r, _ in ds if r == k}
        print(f"      {k}  gia {sorted(f'{x:,}' for x in v)}  o {sorted(cho)[:3]}  {item[k][1][:22]}")

    if a.chi_tiet:
        print("\n--- chi tiet muc CAN NGUOI XEM ---")
        for bang, sheet, n, ref, gia, dd in xem:
            print(f"   {bang}/{sheet} dong {n}: 充值项 {ref} hien {gia:,} / ghi {dd:,}")


if __name__ == "__main__":
    main()
