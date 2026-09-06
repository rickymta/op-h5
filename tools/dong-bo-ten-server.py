#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dong bo TEN (tuong, vat pham, trang bi, bi kip, hon ngoc, than khi, suu tap) cua MAY CHU theo CLIENT.

VI SAO
======
Client (templates.bin) la ban One Piece: Kaido, Law, "Haki cap 1", "Da tang sao". May chu lai
mang bang ten cua mot ban khac (kiem hiep: "Truong Tam Phong", "Tuu Tuy Quyen", "Dan tien
giai"). Moi thu may chu tu dat ten — thu he thong, thong bao "X da bi khoa", kho do tren cong GM
(console tra ten may chu) — deu goi sai ten so voi thu nguoi choi nhin thay. Da quyet: CLIENT
la dung (e41d043), nen may chu phai theo client.

NGUON -> DICH (chi id co o CA HAI ben, chi ghi khi khac, khong dong header/cot chu Han)

    templates.bin 文本库.目标文本      -> server/excel-src/text-localization  文本库.目标文本
    templates.bin 装备表.名称          -> server/excel-src/equipment-table    装备表.名称
    templates.bin 符文基础.名称        -> server/excel-src/rune               符文基础.名称
    templates.bin 命格基础.名称        -> server/excel-src/destiny            命格基础.名称
    templates.bin 仙器基础.名称        -> server/excel-src/immortal-artifact  仙器基础.名称
    templates.bin 仙器碎片.名称        -> server/excel-src/immortal-artifact  仙器碎片.名称
    templates.bin 藏品基础.藏品名称    -> server/excel-src/collection         藏品基础.藏品名称
    templates.bin 基础物品.名称        -> server/excel/release/item-table.xlsm 基础物品.名称  (va XML, khong qua openpyxl)
    templates.bin 碎片.名称            -> server/excel/release/item-table.xlsm 碎片.名称

item-table.xlsm khong nam trong excel-src (.xlsm) va co macro/cong thuc, nen va thang trong XML
cua sheet: chi doi <v> cua dung o ten (shared string moi), moi thu khac giu nguyen tung byte.
O co cong thuc thi bo qua va bao.

SAU KHI CHAY
    python3 tools/json-to-excel.py text-localization equipment-table rune destiny immortal-artifact collection --out server/excel/release
    (kiem bang ExcelProbe)  ->  commit  ->  image server. Hieu luc ngay: docker cp vao container game
    roi RESTART container — DUNG goi excel/reload: heap game da cat, reload lam JVM chet OOM (2026-09-06).
    python3 tools/gen-danh-muc-game.py      # danh muc cong GM doc tu xlsx da dong bo

    python3 tools/dong-bo-ten-server.py --check            # chi thong ke
    python3 tools/dong-bo-ten-server.py                    # ghi
    python3 tools/dong-bo-ten-server.py --client <templates.bin>   # mac dinh: file manifest tro toi
"""
import argparse, json, os, re, shutil, sys, zipfile, zlib
from importlib import util as _u

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "server", "excel-src")
XLSM = os.path.join(ROOT, "server", "excel", "release", "item-table.xlsm")
MANIFEST = os.path.join(ROOT, "website", "game", "libs", "2af72-f100c-2af72.json")

# (bang client, cot client, workbook server, sheet server, cot server)
JSON_MAP = [
    ("文本库", "目标文本", "text-localization", "文本库", "目标文本"),
    ("装备表", "名称", "equipment-table", "装备表", "名称"),
    ("符文基础", "名称", "rune", "符文基础", "名称"),
    ("命格基础", "名称", "destiny", "命格基础", "名称"),
    ("仙器基础", "名称", "immortal-artifact", "仙器基础", "名称"),
    ("仙器碎片", "名称", "immortal-artifact", "仙器碎片", "名称"),
    ("藏品基础", "藏品名称", "collection", "藏品基础", "藏品名称"),
]
XLSM_MAP = [("基础物品", "名称", "基础物品", "名称"), ("碎片", "名称", "碎片", "名称")]


def _tb():
    sp = _u.spec_from_file_location("_tb", os.path.join(ROOT, "tools", "templates-bin.py"))
    m = _u.module_from_spec(sp); sp.loader.exec_module(m); return m


def doc_client(path):
    tb = _tb()
    tpl, loi = tb.mo_phong(zlib.decompress(open(path, "rb").read()))
    if loi: sys.exit(f"!! templates.bin hong: {loi}")
    out = {}
    for ten, rows in tpl.items():
        c0 = tb.o_cua(rows[0]) if rows else None
        if not c0: continue
        keys = [c.decode("utf-8") for c in c0]; byid = {}
        for pl in rows[1:]:
            c = tb.o_cua(pl)
            if c and c[0]: byid[c[0].decode("utf-8", "replace").strip()] = [x.decode("utf-8", "replace") for x in c]
        out[ten] = (keys, byid)
    return out


def client_mac_dinh():
    m = json.loads(zlib.decompress(open(MANIFEST, "rb").read()))
    return os.path.join(ROOT, "website", "game", m["template/templates.bin"])


def o_id(v):
    if v is None: return ""
    if isinstance(v, float) and v.is_integer(): v = int(v)
    return str(v).strip()


def dong_bo_json(client, ghi):
    tk = []
    for cb, cc, wb, sh, cs in JSON_MAP:
        keys, byid = client.get(cb, ([], {}))
        if cc not in keys: tk.append((wb, sh, "client thieu cot " + cc)); continue
        ci = keys.index(cc)
        idx = json.load(open(os.path.join(SRC, wb, "_index.json"), encoding="utf-8"))
        f = next((s["file"] for s in idx["sheets"] if s["name"] == sh), None)
        if not f: tk.append((wb, sh, "server thieu sheet")); continue
        p = os.path.join(SRC, wb, f); j = json.load(open(p, encoding="utf-8")); rows = j["rows"]
        H = [o_id(h) for h in rows[0]]
        if cs not in H: tk.append((wb, sh, "server thieu cot " + cs)); continue
        si = H.index(cs); doi = chung = 0
        for r in rows[1:]:
            if not r: continue
            k = o_id(r[0])
            if k not in byid: continue
            chung += 1
            moi = byid[k][ci] if ci < len(byid[k]) else ""
            while len(r) <= si: r.append(None)
            cu = "" if r[si] is None else str(r[si])
            if cu.strip() != moi.strip() and moi.strip() != "":
                r[si] = moi; doi += 1
        if ghi and doi:
            with open(p, "w", encoding="utf-8") as fh:
                json.dump(j, fh, ensure_ascii=False, indent=1)
        tk.append((wb, sh, f"chung {chung}, doi {doi}"))
    return tk


# ---------- item-table.xlsm: va XML ----------
_NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'


def _sst_doc(xml):
    out = []
    for si in re.findall(r"<si>(.*?)</si>", xml, re.S):
        out.append("".join(_unesc(t) for t in re.findall(r"<t[^>]*>(.*?)</t>", si, re.S)))
    return out


def _unesc(s):
    return s.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'").replace("&amp;", "&")


def _esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _cot_chu(n):  # 0 -> A
    s = ""
    n += 1
    while n: n, r = divmod(n - 1, 26); s = chr(65 + r) + s
    return s


def _chu_cot(s):
    n = 0
    for ch in s: n = n * 26 + ord(ch) - 64
    return n - 1


def dong_bo_xlsm(client, ghi):
    z = zipfile.ZipFile(XLSM)
    wbx = z.read("xl/workbook.xml").decode("utf-8")
    rels = z.read("xl/_rels/workbook.xml.rels").decode("utf-8")
    rid2t = {}
    for tag in re.findall(r"<Relationship\b[^>]*/>", rels):
        i = re.search(r'\bId="([^"]+)"', tag); t = re.search(r'\bTarget="([^"]+)"', tag)
        if i and t: rid2t[i.group(1)] = t.group(1)
    ten2path = {}
    for tag in re.findall(r"<sheet\b[^>]*/>", wbx):
        n = re.search(r'\bname="([^"]+)"', tag); r = re.search(r'\br:id="([^"]+)"', tag)
        if n and r: ten2path[_unesc(n.group(1))] = "xl/" + rid2t[r.group(1)].lstrip("/").replace("xl/", "", 1) if not rid2t[r.group(1)].startswith("/") else rid2t[r.group(1)].lstrip("/")
    sst_xml = z.read("xl/sharedStrings.xml").decode("utf-8")
    sst = _sst_doc(sst_xml); sst_idx = {s: i for i, s in enumerate(sst)}
    them = []  # shared string moi
    sheets_moi, tk, ct_bo = {}, [], {}
    for cb, cc, sh, cs in XLSM_MAP:
        keys, byid = client.get(cb, ([], {}))
        ci = keys.index(cc)
        path = ten2path[sh]; xml = z.read(path).decode("utf-8")
        cells = {}  # (r) -> list of (ref, tag)
        # header
        def cell_val(tag):
            t = re.search(r'\bt="([^"]+)"', tag); v = re.search(r"<v>(.*?)</v>", tag, re.S)
            if t and t.group(1) == "s" and v: return sst[int(v.group(1))]
            if t and t.group(1) == "inlineStr": return "".join(_unesc(x) for x in re.findall(r"<t[^>]*>(.*?)</t>", tag, re.S))
            return _unesc(v.group(1)) if v else ""
        hang = {}
        for m in re.finditer(r"<row\b[^>]*\br=\"(\d+)\"[^>]*>(.*?)</row>", xml, re.S):
            hang[int(m.group(1))] = m.group(2)
        H = {}
        for m in re.finditer(r'<c\b[^>]*\br="([A-Z]+)1"[^>]*?(?:/>|>.*?</c>)', hang.get(1, ""), re.S):
            H[cell_val(m.group(0))] = m.group(1)
        if cs not in H: tk.append((sh, "thieu cot " + cs)); continue
        col = H[cs]; doi = chung = bo = 0; bo_ct = []
        def thay(m):
            nonlocal doi, chung, bo
            rnum = int(m.group(1)); body = m.group(2)
            mid = re.search(r'<c\b[^>]*\br="A%d"[^>]*?(?:/>|>.*?</c>)' % rnum, body, re.S)
            if not mid: return m.group(0)
            k = cell_val(mid.group(0))
            if k.endswith(".0"): k = k[:-2]
            if k not in byid: return m.group(0)
            chung += 1
            moi = byid[k][ci] if ci < len(byid[k]) else ""
            mc = re.search(r'<c\b[^>]*\br="%s%d"[^>]*?(?:/>|>.*?</c>)' % (col, rnum), body, re.S)
            if not mc or moi.strip() == "": return m.group(0)
            tag = mc.group(0)
            if cell_val(tag).strip() == moi.strip(): return m.group(0)
            if "<f" in tag: bo += 1; bo_ct.append("%s%d" % (col, rnum))   # bo cong thuc, ghi hang so
            if moi not in sst_idx:
                sst_idx[moi] = len(sst) + len(them); them.append(moi)
            idx = sst_idx[moi]
            attrs = re.match(r"<c\b([^>]*?)/?>", tag).group(1)
            attrs = re.sub(r'\s+t="[^"]*"', "", attrs) + ' t="s"'
            tag_moi = "<c%s><v>%d</v></c>" % (attrs, idx)
            doi += 1
            return m.group(0).replace(tag, tag_moi, 1)
        xml_moi = re.sub(r"<row\b[^>]*\br=\"(\d+)\"[^>]*>(.*?)</row>", thay, xml, flags=re.S)
        sheets_moi[path] = xml_moi
        if bo_ct: ct_bo[path] = bo_ct
        tk.append((sh, f"chung {chung}, doi {doi}, trong do bo cong thuc ghi hang so {bo}"))
    if ghi and them:
        sst_moi = re.sub(r'\bcount="(\d+)"', lambda m: 'count="%d"' % (int(m.group(1)) + len(them)), sst_xml, 1)
        sst_moi = re.sub(r'\buniqueCount="(\d+)"', lambda m: 'uniqueCount="%d"' % (int(m.group(1)) + len(them)), sst_moi, 1)
        sst_moi = sst_moi.replace("</sst>", "".join('<si><t xml:space="preserve">%s</t></si>' % _esc(s) for s in them) + "</sst>")
        # calcChain liet ke o co cong thuc; o da thanh hang so thi phai rut ra, khong Excel doi "sua chua".
        cc_moi = None
        if ct_bo and "xl/calcChain.xml" in z.namelist():
            cc_moi = z.read("xl/calcChain.xml").decode("utf-8")
            thu_tu = [ten2path[_unesc(re.search(r'\bname="([^"]+)"', t).group(1))] for t in re.findall(r"<sheet\b[^>]*/>", wbx)]
            for path, refs in ct_bo.items():
                i = thu_tu.index(path) + 1
                for ref in refs:
                    cc_moi = re.sub(r'<c r="%s" i="%d"(?: [^>]*)?/>' % (ref, i), "", cc_moi)
        tmp = XLSM + ".tmp"
        with zipfile.ZipFile(tmp, "w") as zo:
            for it in z.infolist():
                data = z.read(it.filename)
                if it.filename == "xl/sharedStrings.xml": data = sst_moi.encode("utf-8")
                elif it.filename in sheets_moi: data = sheets_moi[it.filename].encode("utf-8")
                elif it.filename == "xl/calcChain.xml" and cc_moi is not None: data = cc_moi.encode("utf-8")
                zo.writestr(it, data, compress_type=it.compress_type)
        z.close(); shutil.move(tmp, XLSM)
    return tk


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true"); ap.add_argument("--client")
    a = ap.parse_args()
    cl = a.client or client_mac_dinh()
    print("client:", os.path.relpath(cl, ROOT))
    client = doc_client(cl)
    for wb, sh, s in dong_bo_json(client, not a.check): print(f"  {wb}/{sh}: {s}")
    for sh, s in dong_bo_xlsm(client, not a.check): print(f"  item-table.xlsm/{sh}: {s}")
    print("  (chi thong ke)" if a.check else "  da ghi")


if __name__ == "__main__":
    main()
