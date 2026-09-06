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


def gia_cua_hang():
    """{充值项ID: {cac gia cua hang dat cho no}} — quet 52 bang co cot 价格 + 充值项ID."""
    import glob
    ra = collections.defaultdict(set)
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
        for r in rows[1:]:
            if not r or len(r) <= max(gi, ri):
                continue
            k = str(r[ri]).strip() if r[ri] is not None else ""
            if k in ("", "None"):
                continue
            try:
                ra[k].add(int(float(r[gi])))
            except (TypeError, ValueError):
                pass
    return ra


def theo_cua_hang(apply_, chi_cu, chi_moi):
    """Ha 额度 va id.txt xuong bang gia CUA HANG TRONG GAME dang hien.

    Chi dung cho truong hop da xac dinh: cua hang hien 300.000 nhung he thong ghi 500.000,
    tuc nguoi choi bi tru nhieu hon gia nhin thay. Phai sua CA HAI cho — `额度` de game ghi
    dung moc nap, va `id.txt` vi web thu theo do (id.txt -> game_packages.price_xu ->
    payAmount). Chi sua mot ben thi nguoi choi van bi tru 500.000.

    Bo qua muc nao duoc nhieu cua hang dat gia khac nhau ma khong quy ve mot gia xu duy
    nhat — luc do khong biet lay gia nao.
    """
    doc = json.load(open(ITEM, encoding="utf-8"))
    rows = doc["rows"]
    h = rows[0]
    iA, iN = h.index("额度"), h.index("*名称")
    shop = gia_cua_hang()
    web = doc_gia_web()

    sua, bo = [], []
    for r in rows[1:]:
        if not r or r[0] in (None, ""):
            continue
        pid = str(r[0]).strip()
        gs = shop.get(pid)
        if not gs:
            continue
        try:
            cu = int(float(r[iA]))
        except (TypeError, ValueError):
            continue
        # Gia cua hang tinh bang xu: bo cac dong ghi bang 元 (nho hon nhieu bac).
        xu = {g for g in gs if g >= 500 and cu / g < 100}
        if len(xu) != 1:
            if gs and cu not in gs:
                bo.append((pid, sorted(gs), cu))
            continue
        moi = xu.pop()
        if moi == cu:
            continue
        # Chi dung toi dung cap gia da duoc duyet.
        if cu != chi_cu or moi != chi_moi:
            continue
        sua.append((pid, cu, moi, str(r[iN])))
        r[iA] = moi

    print(f"ha 额度 xuong bang gia cua hang, chi cap {chi_cu:,} -> {chi_moi:,}: {len(sua)} muc")
    for (c, m), n in collections.Counter((x[1], x[2]) for x in sua).most_common():
        print(f"   {c:>9,} -> {m:>9,}   x{n}")
    if bo:
        print(f"bo qua {len(bo)} muc khong quy ve mot gia xu duy nhat: "
              + ", ".join(f"{p}{g}" for p, g, _ in bo[:5]))

    can = {p for p, _, _, _ in sua}
    n_id = sum(1 for p in can if web.get(p) is not None and web[p] != dict((x[0], x[2]) for x in sua)[p])
    print(f"id.txt can sua theo: {n_id} muc (web thu theo day, khong sua thi van tru gia cu)")

    if apply_ and sua:
        with open(ITEM, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, separators=(",", ":"), indent=None)
        moi_map = {p: m for p, _, m, _ in sua}
        out = []
        for ln in open(ID_TXT, encoding="utf-8", errors="replace"):
            if ";" in ln:
                pid = ln.split(";", 1)[0].strip()
                if pid in moi_map:
                    out.append(f"{pid};{moi_map[pid]}\n")
                    continue
            out.append(ln)
        with open(ID_TXT, "w", encoding="utf-8") as f:
            f.writelines(out)
        print(f"da ghi {os.path.relpath(ITEM, ROOT)} va {os.path.relpath(ID_TXT, ROOT)}")
    else:
        print("chua ghi (--apply de ghi)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--theo-gia-cua-hang", metavar="CU:MOI",
                    help="ha 额度 VA id.txt xuong bang gia cua hang, CHI cho cap gia neu ro "
                         "(vd 500000:300000). Bat buoc neu ro de khong lo tay sua ca cac cap "
                         "khac — 60.000->100.000 va 150.000->200.000 la QUY VE BAC NAP co chu "
                         "y, khong phai loi (xem tools/soat-gia.py).")
    ap.add_argument("--don-id-txt", action="store_true",
                    help="xoa cac dong payId lap lai trong id.txt, giu lan dau")
    a = ap.parse_args()

    if a.theo_gia_cua_hang:
        try:
            cu, moi = (int(x) for x in a.theo_gia_cua_hang.split(":"))
        except ValueError:
            raise SystemExit("--theo-gia-cua-hang can dang CU:MOI, vd 500000:300000")
        theo_cua_hang(a.apply, cu, moi)
        return

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
