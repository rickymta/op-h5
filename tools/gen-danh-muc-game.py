#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sinh danh muc vat pham/tuong cho cong GM — platform/cmd/adapter/danh-muc-haitac.json.

VI SAO PHAI CO TOOL NAY
=======================
Cong GM gui qua bang chuoi `type:id:count`. Nguoi truc phai biet id nao la mon gi. Ban PHP
cu tra bang `website/game/gmhanglong/gm/item.txt` — mot file chep tay tu MOT BAN KHAC cua
game. Doi chieu voi may chu dang chay thi sai gan het:

    3:100001   item.txt "Tien giai thach"   | game that "Dan tien giai"
    1:401301   item.txt (khong co)          | game that "Hoang Dung"
    5:5        item.txt "Bach Trach an"     | game that "Cuu Duong Cong"
    7:100101   item.txt "Phien Thien An"    | game that (khong ton tai)

Game da bi thay ao: ban goc Trung Quoc lay tuong than thoai (封神/山海经 — 刑天, 祝融,
鸿钧), ban dang chay doi sang tuong Kim Dung (Truong Vo Ky, Hoang Dung, Tieu Long Nu).
Cot `*英雄名` trong hero.xlsx VAN GIU ten cu — dau `*` nghia la cot ghi chu thiet ke, may
chu KHONG doc. Ten that di duong khac: `英雄名YID` -> bang `文本库` cua
text-localization.xlsx. Ai doc nham cot `*英雄名` se in ra ten cua game khac.

NGUON — file may chu nap, TRU ten vat pham lay theo client (xem duoi):

    loai 1  Tuong        hero.xlsx 英雄基础        英雄名YID -> 文本库 (KHONG dung *英雄名)
    loai 2  Trang bi     equipment-table.xlsx 装备表
    loai 3  Vat pham     item-table.xlsm 基础物品 (tru 类型=6), TEN ghi de theo templates.bin
    loai 4  Manh         item-table.xlsm 碎片 + 基础物品 类型=6, TEN ghi de theo templates.bin
    loai 5  Bi kip       rune.xlsx 符文基础
    loai 6  Hon ngoc     destiny.xlsx 命格基础
    loai 7  Than khi     immortal-artifact.xlsx 仙器基础
    loai 8  Manh than khi immortal-artifact.xlsx 仙器碎片
    loai 13 Suu tap      collection.xlsx 藏品基础
    loai 14 Than khi nghe class-immortal-artifact.xlsx 职业仙器基础
    loai 16 Than trang   divine-equipment.xlsx 神装
    loai 20 Than long    divine-dragon.xlsx 神龙基础
    loai 0  Vi           theo client (toItemId -> 基础物品), xem VI_VAT_PHAM

Loai 0 la VI, khong co bang cau hinh nao dat ten. Chi liet ke ba dong doc duoc tu chinh
cau hinh phat thuong (recharge-benefit): 0 Kim te, 1 Kim cuong, 4 Kinh nghiem tuong.
Id vi khac de trong — tha hien `Vi · loai N` con hon bia mot cai ten.

    python3 tools/gen-danh-muc-game.py            # ghi JSON
    python3 tools/gen-danh-muc-game.py --check    # chi thong ke
    python3 tools/gen-danh-muc-game.py --doi-chieu ten-file.json   # so voi mau lay tu console

VE `--doi-chieu`: console tra ten theo item-table.xlsm cua MAY CHU, con nguoi choi nhin ten
trong templates.bin cua CLIENT — hai bang lech nhau 678/1066 vat pham (e41d043). Nguoi van
hanh chon ten client. Nen tu do, doi chieu voi console chi con dung cho tuong/trang bi/bi
kip/hon ngoc/than khi; vat pham se bao LECH la dung y, khong phai loi.
"""
import argparse
import hashlib
import json
import os
from importlib import util as _u
import sys

try:
    import openpyxl
except ImportError:
    sys.exit("can openpyxl: pip3 install openpyxl")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLS = os.path.join(ROOT, "server", "excel", "release")
OUT = os.path.join(ROOT, "platform", "internal", "gmops", "danh-muc-haitac.json")
OUT_TEN = os.path.join(ROOT, "tools", "ten-tuong-doi-ao.json")

# Nhan nhom. Moi nhan deu doc duoc tu chinh van ban tieng Viet cua game, khong phai tu dich
# nghia chu Han: 'Hon ngoc' (104 lan trong item-table), 'Than khi' (cum "nghe nghiep Than
# Khi" = 职业仙器), 'Bi kip' (ten mon trong shop.xlsx).
NHOM = [
    (0, "Ví"),
    (1, "Tướng"),
    (2, "Trang bị"),
    (3, "Vật phẩm"),
    (4, "Mảnh"),
    (5, "Bí kíp"),
    (6, "Hồn ngọc"),
    (7, "Thần khí"),
    (8, "Mảnh thần khí"),
    (13, "Sưu tập"),
    (14, "Thần khí nghề"),   # JOBFAIRY  class-immortal-artifact.xlsx 职业仙器基础
    (16, "Thần trang"),      # GOD_OUTFIT divine-equipment.xlsx 神装
    (20, "Thần long"),       # LOONG      divine-dragon.xlsx 神龙基础
]

# Ba dong nay doc tu server/excel-src/recharge-benefit: cot '备注（道具名称）' dat canh
# chuoi thuong tuong ung, nen la ten cua chinh game chu khong phai suy dien.
#   09.json  '0:1:1000'    -> 'Kim cương'
#   09.json  '0:4:5000000' -> 'Tướng kinh nghiệm'
#   21.json  '0:0:1000000' -> 金币, tieng Viet trong item-table la 'Kim tệ'
VI_TIEN = {0: "Kim tệ", 1: "Kim cương", 4: "Kinh nghiệm tướng"}

# Ten VI theo CLIENT: client ve moi loai tien bang mot vat pham ao trong 基础物品 (ham
# toItemId trong bundle: M0->200003 "Beri", M1->200004 "Kim cuong", ...). Ma loai tien (cot
# trai) la GDObj$Num cua may chu; chi liet ke loai ma thu phat duoc (MixResItem.addDirect):
# vi, kinh nghiem, diem hoat dong, diem VIP. 18-20 la diem xep hang, khong phat qua thu.
VI_VAT_PHAM = {0: 200003, 1: 200004, 2: 200011, 3: 200001, 4: 200002, 5: 200007, 6: 200014,
               8: 200017, 10: 200012, 11: 200008, 12: 200006, 13: 200013, 14: 200009,
               15: 200005, 16: 200016, 17: 200021}


def mo(ten):
    p = os.path.join(XLS, ten)
    return openpyxl.load_workbook(p, read_only=True, data_only=True), p


def bam(ten):
    h = hashlib.md5()
    with open(os.path.join(XLS, ten), "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def du(r, n):
    """Bu o trong cho du n cot.

    openpyxl doc read-only tra ve dong NGAN dan neu cac o cuoi bo trong — dong 45 cot co the
    ve chi 6 phan tu. Bo qua dong ngan (nhu ban dau) la lam mat du lieu am tham: bang doi ten
    tuong tung thieu mot nhanh vi the, va thieu thi khong ai thay.
    """
    return list(r) + [None] * (n - len(r)) if len(r) < n else list(r)


def so(v):
    """O so cua Excel ve int, chap nhan ca o CHUOI chi chua chu so ("10", " 12 ").

    hero.xlsx ghi 1703/2428 o 星级 dang chuoi (sao 10 tro len cua hau het tuong), may chu doc
    bang getInteger nen khong phan biet — tool ma chi nhan int/float thi 1703 dong tuong mat
    nhan sao ("White Beard 10★" thanh "White Beard" tron, GM tuong khong co 10 sao, 2026-09-07).
    Tra ve None neu khong phai so.
    """
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return int(v)
    if isinstance(v, str) and v.strip().lstrip("-").isdigit():
        return int(v.strip())
    return None


def cot(hdr, *ten):
    """Chi so cot theo TEN header — thu tu cot doi thi tool van dung, giong cach may chu doc."""
    for t in ten:
        if t in hdr:
            return hdr.index(t)
    return -1


def doc_sheet(wb, sheet, cot_id, cot_ten, them=None, loc=None):
    ws = wb[sheet]
    it = ws.iter_rows(values_only=True)
    hdr = list(next(it))
    i_id, i_ten = cot(hdr, cot_id), cot(hdr, cot_ten)
    if i_id < 0 or i_ten < 0:
        raise SystemExit("thieu cot %s/%s trong %s" % (cot_id, cot_ten, sheet))
    i_them = cot(hdr, *them) if them else -1
    n = max(i_id, i_ten, i_them) + 1
    out = []
    for r in it:
        r = du(r, n)
        rid, ten = so(r[i_id]), r[i_ten]
        if rid is None or not isinstance(ten, str) or not ten.strip():
            continue
        if loc and not loc(hdr, r):
            continue
        phu = ""
        if i_them >= 0 and r[i_them] not in (None, ""):
            phu = str(r[i_them]).strip()
        out.append((rid, ten.strip(), phu))
    return out


def doc_tien_khi(wb, tuong):
    """Than khi (仙器基础) + manh (仙器碎片), cot phu = TEN TUONG doc quyen + cap.

    Ten than khi la ten mon do ("Trai Yami", "Huyet Dao"), khong nhac tuong nao dung — nguoi
    truc go "Black Beard" vao GM thi khong ra gi (2026-09-07). Cot phu mang "<tuong> · cấp N"
    (manh: "<tuong> · S1"), gmops gop ca cot phu vao chuoi tim, nen tim theo ten tuong ra
    dung than khi. Than khi chung (khong 专属英雄) chi ghi cap.
    """
    ten_proto = {}
    for rid, ten, _ in tuong:
        ten_proto.setdefault(rid // 100 * 100, ten)
    ws = wb["仙器基础"]
    it = ws.iter_rows(values_only=True)
    hdr = list(next(it))
    i_id, i_ten, i_cap, i_hero = cot(hdr, "仙器ID"), cot(hdr, "名称"), cot(hdr, "等级"), cot(hdr, "专属英雄")
    n = max(i_id, i_ten, i_cap, i_hero) + 1
    than_khi, hero_cua = [], {}
    for r in it:
        r = du(r, n)
        rid, ten = so(r[i_id]), r[i_ten]
        if rid is None or not isinstance(ten, str) or not ten.strip():
            continue
        hero, h, cap = "", so(r[i_hero]), so(r[i_cap])
        if h:
            hero = ten_proto.get(h // 100 * 100, "")
        phu = hero
        if cap is not None:
            phu = ("%s · cấp %d" % (hero, cap)) if hero else ("cấp %d" % cap)
        than_khi.append((rid, ten.strip(), phu))
        hero_cua[rid] = hero
    ws = wb["仙器碎片"]
    it = ws.iter_rows(values_only=True)
    hdr = list(next(it))
    i_id, i_ten, i_tk = cot(hdr, "碎片ID"), cot(hdr, "名称"), cot(hdr, "仙器ID")
    n = max(i_id, i_ten, i_tk) + 1
    manh = []
    for r in it:
        r = du(r, n)
        rid, ten = so(r[i_id]), r[i_ten]
        if rid is None or not isinstance(ten, str) or not ten.strip():
            continue
        manh.append((rid, ten.strip(), hero_cua.get(so(r[i_tk]), "")))
    return than_khi, manh


def bang_ten_tuong():
    """id tuong -> ten NGUOI CHOI NHIN THAY, qua 英雄名YID -> 文本库."""
    wb, _ = mo("text-localization.xlsx")
    lut = {}
    for r in wb["文本库"].iter_rows(min_row=2, max_col=3, values_only=True):
        if r[0] is None:
            continue
        try:
            k = int(str(r[0]).strip())
        except ValueError:
            continue
        if isinstance(r[2], str) and r[2].strip():
            lut[k] = r[2].strip()
    wb.close()

    wb, _ = mo("hero.xlsx")
    ws = wb["英雄基础"]
    it = ws.iter_rows(values_only=True)
    hdr = list(next(it))
    i_id, i_yid, i_sao = cot(hdr, "英雄ID"), cot(hdr, "英雄名YID"), cot(hdr, "星级")
    n = max(i_id, i_yid, i_sao) + 1
    ra, thieu = [], 0
    for r in it:
        r = du(r, n)
        rid, yid = so(r[i_id]), r[i_yid]
        if rid is None or yid in (None, ""):
            continue
        try:
            ten = lut.get(int(str(yid).strip()))
        except ValueError:
            ten = None
        if not ten:
            thieu += 1
            continue
        sao = so(r[i_sao]) if i_sao >= 0 else None
        ra.append((rid, ten, ("%d★" % sao) if sao is not None else ""))
    wb.close()
    return ra, thieu, len(lut)


def bang_doi_ao():
    """Bang doi ten tuong: ten cua BAN GOC -> ten cua ban dang chay.

    Game da bi thay ao. Ban goc dung tuong than thoai Trung Quoc, ban phat hanh doi sang
    tuong Kim Dung. hero.xlsx con giu ca hai: `*英雄名` la ten goc (cot ghi chu, may chu
    khong doc), `英雄名YID` -> 文本库 la ten that. Bang nay ghep hai cot do lai.

    Dung de sua nhung cho DA TRO LO ten goc — ro nhat la ten goi nap, vi ten goi duoc dich
    may tu chuoi Han `*名称` trong recharge-item ("鸿钧藏品礼包" -> "Hong Quan ...").

    Tra ve (theo_han, theo_viet_cu, bo_qua): 'bo_qua' la cac ten mot-nhieu, KHONG doi tu dong
    vi doi mo se sai; de nguyen roi bao ra.
    """
    # Hai bang RIENG: khong phai dong nao trong 文本库 cung con cot chu Han. Gop chung lai
    # roi doi "co ca hai" se lang le bo mat mot nhanh — va bo dung nhanh lam lo ra cho mot
    # ten cu tro toi HAI tuong khac nhau (vi du 'Viem' -> Dong Phuong Bat Bai / Kieu Phong).
    # Mat nhanh do thi tool tuong minh khong nhap nhang va doi bua mot ben.
    wb2, _ = mo("text-localization.xlsx")
    lut_vi, lut_zh = {}, {}
    for r in wb2["文本库"].iter_rows(min_row=2, max_col=3, values_only=True):
        if r[0] is None:
            continue
        try:
            k = int(str(r[0]).strip())
        except ValueError:
            continue
        zh = r[1].strip() if isinstance(r[1], str) else ""
        vi = r[2].strip() if isinstance(r[2], str) else ""
        if not vi:
            continue
        lut_vi[k] = vi
        if zh:
            lut_zh[k] = zh
    wb2.close()

    wb, _ = mo("hero.xlsx")
    ws = wb["英雄基础"]
    it = ws.iter_rows(values_only=True)
    hdr = list(next(it))
    i_cu, i_yid = cot(hdr, "*英雄名"), cot(hdr, "英雄名YID")
    n = max(i_cu, i_yid) + 1
    theo_han, theo_cu, han_cu = {}, {}, {}
    for r in it:
        r = du(r, n)
        cu, yid = r[i_cu], r[i_yid]
        if yid in (None, ""):
            continue
        try:
            k = int(str(yid).strip())
        except ValueError:
            continue
        moi = lut_vi.get(k)
        if not moi:
            continue
        if k in lut_zh:
            theo_han.setdefault(lut_zh[k], set()).add(moi)
            if isinstance(cu, str) and cu.strip():
                han_cu.setdefault(lut_zh[k], set()).add(cu.strip())
        if isinstance(cu, str) and cu.strip():
            theo_cu.setdefault(cu.strip(), set()).add(moi)
    wb.close()

    bo_qua = sorted(k for k, v in list(theo_han.items()) + list(theo_cu.items()) if len(v) > 1)
    han = {k: next(iter(v)) for k, v in theo_han.items() if len(v) == 1}
    viet = {k: next(iter(v)) for k, v in theo_cu.items() if len(v) == 1 and next(iter(v)) != k}
    # zh -> ten Viet CU: de sua mot chuoi da dich may, phai biet ban dich cu goi tuong do la gi.
    han_viet_cu = {k: sorted(v) for k, v in han_cu.items() if k in han}
    return han, viet, bo_qua, han_viet_cu


def gom():
    muc = {0: [(k, v, "") for k, v in sorted(VI_TIEN.items())]}
    canh = []

    tuong, thieu_yid, n_lut = bang_ten_tuong()
    muc[1] = tuong
    if thieu_yid:
        canh.append("%d tướng không tra được tên qua 文本库 (bỏ qua, không đoán)" % thieu_yid)

    wb, _ = mo("equipment-table.xlsx")
    muc[2] = doc_sheet(wb, "装备表", "装备ID", "名称", them=("品质",))
    wb.close()

    wb, _ = mo("item-table.xlsm")
    hdr_loai = ["类型"]

    def la_manh(hdr, r):
        i = cot(hdr, *hdr_loai)
        return 0 <= i < len(r) and r[i] == 6

    def khong_manh(hdr, r):
        return not la_manh(hdr, r)

    muc[3] = doc_sheet(wb, "基础物品", "物品ID", "名称", them=("类型说明",), loc=khong_manh)
    manh = doc_sheet(wb, "基础物品", "物品ID", "名称", them=("类型说明",), loc=la_manh)
    manh += doc_sheet(wb, "碎片", "碎片ID", "名称", them=("星级",))

    # TEN VAT PHAM: lay theo CLIENT, khong theo item-table.xlsm.
    #
    # Cung cai bay ma phan TUONG o tren da tranh: game bi thay ao (goc Trung Quoc than
    # thoai -> ban dang chay One Piece), va bang cua server van con ten ban goc. Do duoc:
    # 1066 vat pham co ca hai ben thi 678 KHAC TEN (63%) — 601013 server 'Vo Don Nho' /
    # client 'Bege', 1000001 server 'Tien xu tui' / client 'Tui beri'. Nguoi van hanh da
    # xac nhan theo client moi dung: mon trong anh chup cua ho hien 'Chieu mo cao cap',
    # dung ten client, khong phai 'Lenh tuong cao cap' cua item-table.
    #
    # Nguon: bang `基础物品` trong templates.bin — chinh file client nap de ve giao dien.
    ten_client = {}
    try:
        _sp = _u.spec_from_file_location(
            "_dbt", os.path.join(os.path.dirname(os.path.abspath(__file__)), "doc-bang-templates.py"))
        _m = _u.module_from_spec(_sp)
        _sp.loader.exec_module(_m)
        ten_client = _m.ten_vat_pham()
    except Exception as e:
        canh.append("khong doc duoc ten vat pham tu templates.bin (%s) — dang dung ten cua "
                    "item-table.xlsm, co the la ten cua ban game khac" % e)

    if ten_client:
        vi = []
        for k, tid in sorted(VI_VAT_PHAM.items()):
            ten = ten_client.get(str(tid)) or VI_TIEN.get(k)
            if ten:
                vi.append((k, ten, ""))
        muc[0] = vi

        def theo_client(ds):
            doi = thieu = 0
            ra = []
            for t in ds:
                tid, ten = str(t[0]), t[1]
                moi = ten_client.get(tid)
                if moi is None:
                    thieu += 1
                    ra.append(t)
                    continue
                if moi != ten:
                    doi += 1
                ra.append((t[0], moi) + tuple(t[2:]))
            return ra, doi, thieu

        muc[3], d3, t3 = theo_client(muc[3])
        manh, d4, t4 = theo_client(manh)
        canh.append("ten vat pham lay theo client: doi %d, client khong co %d (giu ten server)"
                    % (d3 + d4, t3 + t4))
    muc[4] = manh
    wb.close()

    wb, _ = mo("rune.xlsx")
    muc[5] = doc_sheet(wb, "符文基础", "符文类型ID", "名称", them=("品质",))
    wb.close()

    wb, _ = mo("destiny.xlsx")
    muc[6] = doc_sheet(wb, "命格基础", "ID", "名称", them=("品质",))
    wb.close()

    wb, _ = mo("immortal-artifact.xlsx")
    muc[7], muc[8] = doc_tien_khi(wb, tuong)
    wb.close()

    wb, _ = mo("collection.xlsx")
    muc[13] = doc_sheet(wb, "藏品基础", "藏品ID", "藏品名称", them=("品质",))
    wb.close()

    wb, _ = mo("class-immortal-artifact.xlsx")
    muc[14] = doc_sheet(wb, "职业仙器基础", "仙器ID", "名称", them=("品质",))
    wb.close()

    wb, _ = mo("divine-equipment.xlsx")
    muc[16] = doc_sheet(wb, "神装", "神装ID", "名称", them=("品质",))
    wb.close()

    wb, _ = mo("divine-dragon.xlsx")
    muc[20] = doc_sheet(wb, "神龙基础", "神龙ID", "神龙名称", them=("神龙星级",))
    wb.close()
    return muc, canh


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--doi-chieu", help="JSON [[type,id,ten],...] lay tu console de doi chieu")
    a = ap.parse_args()

    muc, canh = gom()

    # Mot id co the xuat hien nhieu dong (tuong nhieu sao trung id thi giu dong dau).
    dong = []
    for t, _ in NHOM:
        thay = set()
        for rid, ten, phu in muc.get(t, []):
            if rid in thay:
                continue
            thay.add(rid)
            dong.append([t, rid, ten, phu])

    for t, nhan in NHOM:
        print("  loại %-2d %-14s %5d mục" % (t, nhan, sum(1 for d in dong if d[0] == t)))
    print("  tổng %d mục" % len(dong))
    for c in canh:
        print("  cảnh báo: " + c)

    if a.doi_chieu:
        mau = json.load(open(a.doi_chieu, encoding="utf-8"))
        tra = {(d[0], d[1]): d[2] for d in dong}
        khop = lech = vang = 0
        for t, i, ten in mau:
            co = tra.get((int(t), int(i)))
            if co is None:
                vang += 1
                print("    THIẾU  %d:%-10s  console='%s'" % (t, i, ten))
            elif co.strip() != ten.strip():
                lech += 1
                print("    LỆCH   %d:%-10s  console='%s'  danh mục='%s'" % (t, i, ten, co))
            else:
                khop += 1
        print("  đối chiếu console: %d khớp, %d lệch, %d thiếu" % (khop, lech, vang))
        return 1 if (lech or vang) else 0

    if a.check:
        return 0

    data = {
        "_doc": [
            "Danh muc vat pham/tuong cua game haitac, sinh boi tools/gen-danh-muc-game.py.",
            "SUA O DAY LA VO ICH — chay lai tool sau khi doi Excel trong server/excel/release.",
            "Ten tuong lay qua 英雄名YID -> 文本库, KHONG lay cot *英雄名 (ten cua ban goc",
            "truoc khi thay ao — Hinh Thien/Chuc Dung thay vi Truong Vo Ky/Hoang Dung).",
        ],
        "nguon": {t: bam(t) for t in sorted({
            "hero.xlsx", "text-localization.xlsx", "equipment-table.xlsx", "item-table.xlsm",
            "rune.xlsx", "destiny.xlsx", "immortal-artifact.xlsx", "collection.xlsx"})},
        "nhom": [{"loai": t, "nhan": n} for t, n in NHOM],
        "vi": {str(k): ten for k, ten, _ in muc.get(0, [])} or {str(k): v for k, v in sorted(VI_TIEN.items())},
        "muc": dong,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print("  đã ghi %s (%.0f KB)" % (os.path.relpath(OUT, ROOT), os.path.getsize(OUT) / 1024))

    han, viet, bo_qua, han_viet_cu = bang_doi_ao()
    with open(OUT_TEN, "w", encoding="utf-8") as f:
        json.dump({
            "_doc": [
                "Bang doi ten tuong khi game bi thay ao: ten BAN GOC -> ten ban dang chay.",
                "'han' tra theo chu Han trong bang cau hinh goc; 'viet_cu' tra theo ban dich",
                "cu (cot *英雄名 cua hero.xlsx, va cac file chep tay tu ban do nhu pay.txt).",
                "'bo_qua' la ten mot-nhieu — KHONG doi tu dong, phai xu ly tay.",
                "Sinh boi tools/gen-danh-muc-game.py; dung sua tay.",
            ],
            "han": dict(sorted(han.items())),
            "viet_cu": dict(sorted(viet.items())),
            "bo_qua": bo_qua,
            "han_viet_cu": dict(sorted(han_viet_cu.items())),
        }, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("  đã ghi %s (%d tên Hán, %d tên Việt cũ, %d bỏ qua)"
          % (os.path.relpath(OUT_TEN, ROOT), len(han), len(viet), len(bo_qua)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
