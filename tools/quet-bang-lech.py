#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Quet moi bang cung ten giua client (templates.bin) va server (excel-src), in bang lech.

    python3 tools/quet-bang-lech.py                      # templates.bin manifest dang tro toi
    python3 tools/quet-bang-lech.py <templates.bin> --md docs/lech-bang-client-server.md

chi CL / chi SV = so dong chi mot ben co; o lech = so o khac nhau tren dong chung (cot chung).
Bang nao chi SV > 0 la bang co the lam mot man sap khi may chu gui id moi (xem
docs/bang-client-theo-server.md). Sau khi them bang vao BANG_THEO_SERVER cua templates-bin.py
va chay `bang`, chay lai lenh nay de thay so lech ve 0.
"""
import argparse, glob, json, os, sys, zlib
from importlib import util as _u

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _tb():
    sp = _u.spec_from_file_location("_tb", os.path.join(ROOT, "tools", "templates-bin.py"))
    m = _u.module_from_spec(sp); sp.loader.exec_module(m); return m


def nv(v):
    # Cung mot cach doc o voi templates-bin._o_server (bool -> 1/0, so nguyen khong .0),
    # neu khong bang da dong bo van bi bao lech gia.
    if v is None or isinstance(v, dict): return ""
    if isinstance(v, bool): return "1" if v else "0"
    if isinstance(v, float) and v.is_integer(): v = int(v)
    return str(v).strip()


def quet(path):
    tb = _tb()
    tpl, loi = tb.mo_phong(zlib.decompress(open(path, "rb").read()))
    if loi: sys.exit("!! templates.bin hong: " + loi)
    sv = {}
    for p in glob.glob(os.path.join(ROOT, "server", "excel-src", "*", "_index.json")):
        ix = json.load(open(p, encoding="utf-8")); wb = os.path.basename(os.path.dirname(p))
        for s in ix["sheets"]: sv.setdefault(s["name"], []).append((wb, s["file"]))
    rep = []
    for n, rows in tpl.items():
        if n not in sv or len(rows) < 2: continue
        wb, f = sv[n][0]
        r = json.load(open(os.path.join(ROOT, "server", "excel-src", wb, f), encoding="utf-8"))["rows"]
        H = [nv(x) for x in r[0]]; srows = {nv(x[0]): x for x in r[1:] if x and nv(x[0]) != ""}
        c0 = tb.o_cua(rows[0]); ch = [c.decode("utf-8") for c in c0]; crows = {}
        for pl in rows[1:]:
            c = tb.o_cua(pl)
            if c and c[0]: crows[c[0].decode("utf-8", "replace")] = [x.decode("utf-8", "replace") for x in c]
        shared = [h for h in ch[1:] if h in H]
        common = set(crows) & set(srows); lech = tong = 0
        for k in common:
            for h in shared:
                i, j = ch.index(h), H.index(h)
                a = crows[k][i].strip() if i < len(crows[k]) else ""
                b = nv(srows[k][j]) if j < len(srows[k]) else ""
                tong += 1
                if a != b: lech += 1
        rep.append((n, wb, len(crows), len(srows), len(set(crows) - set(srows)), len(set(srows) - set(crows)), lech, tong))
    rep.sort(key=lambda x: -(x[4] + x[5] + x[6]))
    return rep


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("bin", nargs="?"); ap.add_argument("--md")
    a = ap.parse_args()
    path = a.bin
    if not path:
        m = json.loads(zlib.decompress(open(os.path.join(ROOT, "website", "game", "libs", "2af72-f100c-2af72.json"), "rb").read()))
        path = os.path.join(ROOT, "website", "game", m["template/templates.bin"])
    rep = quet(path); lech = [x for x in rep if x[4] or x[5] or x[6]]
    print(f"{'bang':18s} {'workbook':26s} {'cl':>5s} {'sv':>5s} {'chiCL':>5s} {'chiSV':>5s} {'oLech':>6s}/oChung")
    for n, wb, c, s, oc, os_, dc, tot in lech[:40]: print(f"{n:18s} {wb:26s} {c:5d} {s:5d} {oc:5d} {os_:5d} {dc:6d}/{tot}")
    print(f"tong bang cung ten: {len(rep)}; giong het: {len(rep) - len(lech)}; lech: {len(lech)}")
    if a.md:
        L = ["# Bảng cấu hình client (templates.bin) lệch với máy chủ (excel-src)", "",
             f"Sinh bởi `python3 tools/quet-bang-lech.py --md` trên `{os.path.relpath(path, ROOT)}`.",
             f"{len(rep)} bảng cùng tên; **{len(lech)} bảng lệch**, {len(rep) - len(lech)} giống hệt. "
             "`chỉ CL`/`chỉ SV` = số dòng chỉ một bên có; `ô lệch` = số ô khác nhau trên các dòng chung (chỉ cột chung).",
             "Bảng đã nằm trong `BANG_THEO_SERVER` (đồng bộ theo server) thì chỉ còn lệch ở cột trình bày hoặc dòng chỉ client có.", "",
             "| Bảng | Workbook server | Dòng client | Dòng server | chỉ CL | chỉ SV | ô lệch / ô chung |", "|---|---|---:|---:|---:|---:|---:|"]
        for n, wb, c, s, oc, os_, dc, tot in lech: L.append(f"| `{n}` | `{wb}` | {c} | {s} | {oc} | {os_} | {dc} / {tot} |")
        open(a.md, "w", encoding="utf-8").write("\n".join(L) + "\n"); print("da ghi", a.md)


if __name__ == "__main__":
    main()
