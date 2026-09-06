#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Chan sap giao dien khi vat pham khong co mau (template).

TRIEU CHUNG (nguoi van hanh bao 2026-09-06)

  Tui do:       TypeError: Cannot read properties of undefined (reading 'canUse')
                    propSort -> freshPropList -> freshType -> switchType -> typeSelect
  Nang sao:     TypeError: Cannot read properties of undefined (reading 'type')
                    getCanSelectProp -> refreshBox1UpStar -> freshUpStar -> freshHeroInfo
                    getCanSelectProp -> upStarCostClick

NGUYEN NHAN

`getTplInfo(tid)` tra ve `undefined` roi ma goi doc thuoc tinh tren do. Doc tui do that
trong MongoDB (game-s1.master.props.list): 60 vat pham, HAI ma khong co dong dinh nghia
trong bang vat pham cua client (`templates.bin`):

    501124   la BAC SAO CUA TUONG (501123->501124->501125, tuong goc 501100), bi cau hinh
             `equipment-week-card` / `hero-week-card` phat duoi dang `3:` (dao cu).
    500198   la dong trong bang ky nang/cap cua tuong 500101, va la DONG TIEN cua shop 150
             (`shop/商城商品` dung `3:500198:*` o cot 资源消耗 = chi phi). Nguoi choi dang
             giu 75 cai — TUYET DOI KHONG duoc xoa khoi tui.

Bang dinh nghia vat pham KHONG co trong `server/excel-src/` (nhom file Excel thieu,
CLAUDE.md muc 11.4) nen khong co nguon that de bu. Bia ten/icon la doan mo, va icon sai co
the lam sap cho khac. Vi vay chi chan sap.

VA GI

`propSort`          — so sanh coi mau thieu la 0.
`getCanSelectProp`  — BA cho doc mau, va CA BA DINH NGHIA cua ham nay (3 man nang cap dung
                      chung khuon). Ban dau toi chi chan cho thu nhat va nguoi van hanh
                      bao van sap y nguyen — vet moi chi ro cho sap that la cho thu hai.

Vi sao phai cat dung than ham roi moi thay: hai trong ba cho dung idiom
`x.baseTpl.type != 0xb`, idiom nay co 3 lan trong ca bundle nen thay bang regex toan cuc se
sua nham hai cho khong lien quan.

    python3 tools/va-tui-do-crash.py            # xem truoc
    python3 tools/va-tui-do-crash.py --apply
    python3 tools/va-tui-do-crash.py --revert
"""
import argparse, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, "website", "game", "libs", "e228b-0b904-ac44c.js")


def cac_dinh_nghia(src, ten):
    """Vi tri MOI dinh nghia cua phuong thuc `ten` (bo qua cac cho GOI cung ten)."""
    dn = re.compile(r"\['" + re.escape(ten) + r"'\]\((?:_0x[0-9a-f]+(?:,_0x[0-9a-f]+)*)?\)\{")
    return [(m.start(), src.index("{", m.end() - 1)) for m in dn.finditer(src)]


def het_ngoac(src, j):
    sau, k = 0, j
    while k < len(src):
        if src[k] == "{":
            sau += 1
        elif src[k] == "}":
            sau -= 1
            if sau == 0:
                return k + 1
        k += 1
    sys.exit("khong dong duoc ngoac nhon")


def va_propSort(src):
    khuon = re.compile(
        r"\['propSort'\]\((?P<a>_0x[0-9a-f]+),(?P<b>_0x[0-9a-f]+)\)\{"
        r"const (?P<c>_0x[0-9a-f]+)=(?P<g>_0x[0-9a-f]+);"
        r"return (?P=b)\['baseTpl'\]\[(?P=c)\((?P<k>0x[0-9a-f]+)\)\]"
        r"-(?P=a)\[(?P=c)\((?P<t>0x[0-9a-f]+)\)\]\[(?P=c)\((?P=k)\)\];\}"
    )
    ms = list(khuon.finditer(src))
    if len(ms) != 1:
        sys.exit(f"propSort: khop {len(ms)} cho, phai dung 1")
    m = ms[0]
    moi = (
        f"['propSort']({m.group('a')},{m.group('b')}){{"
        f"const {m.group('c')}={m.group('g')};"
        f"var _opX={m.group('b')}['baseTpl'],_opY={m.group('a')}[{m.group('c')}({m.group('t')})];"
        f"return ((_opX&&_opX[{m.group('c')}({m.group('k')})])||0)"
        f"-((_opY&&_opY[{m.group('c')}({m.group('k')})])||0);}}"
    )
    return src[: m.start()] + moi + src[m.end():], 1


def va_mot_than(than):
    """Them chot null vao ba cho doc mau trong mot than `getCanSelectProp`."""
    goc, n = than, 0

    # (1) mau cua chinh doi tuong dang xet, ngay dau ham
    m = re.search(r"if\((_0x[0-9a-f]+)\[(_0x[0-9a-f]+)\((0x[0-9a-f]+)\)\]\)return (_0x[0-9a-f]+);", than)
    if m:
        than = than.replace(
            m.group(0),
            f"if(!{m.group(1)}||{m.group(1)}[{m.group(2)}({m.group(3)})])return {m.group(4)};", 1)
        n += 1

    # (2) `ds[i].baseTpl.type != 0xb` — DAY moi la cho sap that
    m = re.search(
        r"if\((_0x[0-9a-f]+)\[(_0x[0-9a-f]+)\]\[(_0x[0-9a-f]+)\((0x2093)\)\]"
        r"\[\3\((0x[0-9a-f]+)\)\]!=0xb\)continue;", than)
    if m:
        ds, i2, c, bt, ty = m.groups()
        than = than.replace(
            m.group(0),
            f"if(!{ds}[{i2}][{c}({bt})]||{ds}[{i2}][{c}({bt})][{c}({ty})]!=0xb)continue;", 1)
        n += 1

    # (3) `otherTpl` gan tu getTplInfo roi doc ngay sau
    m = re.search(r"(_0x[0-9a-f]+)\[(_0x[0-9a-f]+)\]\[(_0x[0-9a-f]+)\((0x5a04)\)\]=[^;]+;", than)
    if m:
        than = than.replace(
            m.group(0),
            m.group(0) + f"if(!{m.group(1)}[{m.group(2)}][{m.group(3)}({m.group(4)})])continue;", 1)
        n += 1

    return than, n, than != goc


def va_getCanSelectProp(src):
    vt = cac_dinh_nghia(src, "getCanSelectProp")
    if not vt:
        sys.exit("getCanSelectProp: khong tim thay dinh nghia nao")
    tong_ham = tong_chot = 0
    # Va TU DUOI LEN de vi tri cac ham phia truoc khong bi xe dich.
    for a, j in sorted(vt, reverse=True):
        b = het_ngoac(src, j)
        moi, n, doi = va_mot_than(src[a:b])
        if doi:
            src = src[:a] + moi + src[b:]
            tong_ham += 1
            tong_chot += n
    if tong_ham == 0:
        sys.exit("getCanSelectProp: khong va duoc cho nao")
    return src, tong_ham, tong_chot


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--revert", action="store_true")
    ap.add_argument("--js", default=JS)
    a = ap.parse_args()
    sao = a.js + ".truoc-va-crash"

    if a.revert:
        if not os.path.exists(sao):
            sys.exit("khong co ban sao luu " + sao)
        shutil.copy2(sao, a.js)
        print("da tra lai ban goc")
        return

    src = open(a.js, encoding="utf-8", errors="surrogateescape").read()
    truoc = len(src)

    src, n1 = va_propSort(src)
    print(f"propSort         : {n1} cho")
    src, nh, nc = va_getCanSelectProp(src)
    print(f"getCanSelectProp : {nh} dinh nghia, {nc} chot")

    if a.apply:
        if not os.path.exists(sao):
            shutil.copy2(a.js, sao)
        open(a.js, "w", encoding="utf-8", errors="surrogateescape").write(src)
        print(f"da va ({truoc} -> {len(src)} byte)")
    else:
        print("chua ghi (--apply de ghi)")


if __name__ == "__main__":
    main()
