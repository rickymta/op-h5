#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Chan sap giao dien khi vat pham khong co mau (template).

TRIEU CHUNG (nguoi van hanh bao 2026-09-06)

  Tui do:      Uncaught TypeError: Cannot read properties of undefined (reading 'canUse')
                   at propSort -> freshPropList -> freshType -> switchType -> typeSelect
  Man nhan vat: Uncaught TypeError: Cannot read properties of undefined (reading 'type')
                   at getCanSelectProp -> refreshBox1UpStar -> freshUpStar -> freshHeroInfo

NGUYEN NHAN

Ca hai deu la `getTplInfo(tid)` tra ve `undefined` roi ma goi doc thuoc tinh tren do.
Doc tui do that trong MongoDB (game-s1.master.props.list) thay 60 vat pham, trong do BON
ma khong co dong dinh nghia trong bang vat pham cua client (`templates.bin`):

    501124   590004   580001   500198

Bon ma nay duoc cau hinh phat o 233 cho (equipment-week-card, hero-week-card,
cross-ingot-ranking, shop, cyclic-shop...), nen chung la vat pham CO THAT trong thiet ke —
cai thieu la DINH NGHIA. Bang dinh nghia vat pham khong co trong `server/excel-src/` (thuoc
nhom file Excel thieu, CLAUDE.md muc 11.4), nen KHONG the bu du lieu that. Bia ten/icon cho
vat pham la doan mo, va icon sai co the lam sap cho khac.

VA GI

Chi them chot null vao dung hai cho doc thuoc tinh cua mau. Vat pham khong co mau se khong
hien (dung — client that su khong biet no la gi) thay vi lam sap ca man hinh.

  propSort          so sanh coi mau thieu la 0 thay vi nem loi
  getCanSelectProp  mau thieu -> tra ve danh sach rong, dung nhu khi mau bao "khong dung duoc"

Hai loi `List.getItem ... reading 'length'` khi bam nang sao la HAU QUA cua
getCanSelectProp nem giua chung (danh sach khong bao gio duoc gan du lieu), nen vao theo.

    python3 tools/va-tui-do-crash.py            # xem truoc
    python3 tools/va-tui-do-crash.py --apply
    python3 tools/va-tui-do-crash.py --revert
"""
import argparse, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, "website", "game", "libs", "e228b-0b904-ac44c.js")

# (ten, khuon tim, ham dung ban thay) — moi khuon PHAI khop dung 1 lan.
VA = [
    (
        "propSort",
        re.compile(
            r"\['propSort'\]\((?P<a>_0x[0-9a-f]+),(?P<b>_0x[0-9a-f]+)\)\{"
            r"const (?P<c>_0x[0-9a-f]+)=(?P<g>_0x[0-9a-f]+);"
            r"return (?P=b)\['baseTpl'\]\[(?P=c)\((?P<k>0x[0-9a-f]+)\)\]"
            r"-(?P=a)\[(?P=c)\((?P<t>0x[0-9a-f]+)\)\]\[(?P=c)\((?P=k)\)\];\}"
        ),
        lambda m: (
            f"['propSort']({m.group('a')},{m.group('b')}){{"
            f"const {m.group('c')}={m.group('g')};"
            f"var _opX={m.group('b')}['baseTpl'],_opY={m.group('a')}[{m.group('c')}({m.group('t')})];"
            f"return ((_opX&&_opX[{m.group('c')}({m.group('k')})])||0)"
            f"-((_opY&&_opY[{m.group('c')}({m.group('k')})])||0);}}"
        ),
    ),
    (
        "getCanSelectProp",
        re.compile(
            r"(?P<head>\['getCanSelectProp'\]\(_0x[0-9a-f]+,_0x[0-9a-f]+\)\{"
            r"const (?P<c>_0x[0-9a-f]+)=_0x[0-9a-f]+;"
            r"let (?P<out>_0x[0-9a-f]+)=\[\],(?P<tpl>_0x[0-9a-f]+)="
            r"_0x[0-9a-f]+\[(?P=c)\(0x[0-9a-f]+\)\]\(_0x[0-9a-f]+\[(?P=c)\(0x[0-9a-f]+\)\],_0x[0-9a-f]+\);)"
            r"if\((?P=tpl)\[(?P=c)\((?P<k>0x[0-9a-f]+)\)\]\)return (?P=out);"
        ),
        lambda m: (
            f"{m.group('head')}"
            f"if(!{m.group('tpl')}||{m.group('tpl')}[{m.group('c')}({m.group('k')})])"
            f"return {m.group('out')};"
        ),
    ),
]


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
    goc = src
    for ten, khuon, dung in VA:
        ms = list(khuon.finditer(src))
        if len(ms) != 1:
            sys.exit(f"{ten}: khop {len(ms)} cho, phai dung 1 — dung va")
        m = ms[0]
        moi = dung(m)
        print(f"=== {ten} ===\n  CU : {m.group(0)[:200]}\n  MOI: {moi[:200]}\n")
        src = src[: m.start()] + moi + src[m.end():]

    if a.apply:
        if not os.path.exists(sao):
            shutil.copy2(a.js, sao)
        open(a.js, "w", encoding="utf-8", errors="surrogateescape").write(src)
        print(f"da va ({len(goc)} -> {len(src)} byte)")
    else:
        print("chua ghi (--apply de ghi)")


if __name__ == "__main__":
    main()
