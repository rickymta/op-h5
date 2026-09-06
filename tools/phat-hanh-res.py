#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phat hanh mot tai nguyen client DA SUA duoi TEN BAM MOI + cap nhat manifest.

VI SAO KHONG GHI DE TAI CHO

nginx phuc vu `/res/` va `/libs/` voi `expires 30d` + `Cache-Control: public, immutable`,
va URL tai nguyen KHONG co tham so chong cache (ten file da la bam noi dung). Ghi de tai cho
thi nguoi choi cu giu ban cu toi 30 ngay — dung cai da lam ca nguoi van hanh lan toi tuong
ban sua "dang chay" trong khi trinh duyet van dung ban goc.

Cach dung cua he thong ten-bam-noi-dung: noi dung moi -> TEN MOI, roi manifest
(`libs/2af72-f100c-2af72.json`, JSON nen zlib, `ten logic -> res/<bam>`) tro sang ten moi.
Manifest tu no cung immutable va duoc loader fetch bang URL co dinh, nen di kem ban va
loader/a3b31/play.php them `?v=filemtime(manifest)` (xem commit).

TEN BAM: quy uoc thuc te la md5(ten file)[:5] + '-' + ? + '-' + md5(ten file)[-5:]; doan
giua khong suy duoc tu dau (da thu md5/sha1/sha256/crc32 cua noi dung, cua duong dan) nen
tool dat = md5(noi dung moi)[:5] — duy nhat theo noi dung, giu dung hinh dang.

    python3 tools/phat-hanh-res.py ui/ui.bin  <file-moi>   [--assets /opt/tcg/assets]
    python3 tools/phat-hanh-res.py template/templates.bin <file-moi>

Ghi: website/game/res/<ten-moi> (gitignored, chi de doi chieu), <assets>/res/<ten-moi> neu
co, va cap nhat website/game/libs/2af72-f100c-2af72.json (trong git -> di theo image nginx).
"""
import argparse, hashlib, json, os, shutil, sys, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "website", "game", "libs", "2af72-f100c-2af72.json")


def ten_bam(ten_logic, noi_dung):
    base = os.path.basename(ten_logic).encode("utf-8")
    mn = hashlib.md5(base).hexdigest(); mc = hashlib.md5(noi_dung).hexdigest()
    return f"{mn[:5]}-{mc[:5]}-{mn[-5:]}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ten_logic"); ap.add_argument("file_moi")
    ap.add_argument("--assets", help="thu muc ASSETS_DIR tren may chu (co res/ ben trong)")
    ap.add_argument("--chi-xem", action="store_true")
    a = ap.parse_args()

    nd = open(a.file_moi, "rb").read()
    raw = open(MANIFEST, "rb").read()
    man = json.loads(zlib.decompress(raw).decode("utf-8"))
    if a.ten_logic not in man:
        sys.exit(f"!! {a.ten_logic!r} khong co trong manifest")
    cu = man[a.ten_logic]
    moi = "res/" + ten_bam(a.ten_logic, nd)
    print(f"{a.ten_logic}: {cu} -> {moi}  ({len(nd)} byte)")
    if moi == cu:
        print("  noi dung khong doi so voi ten dang tro, khong lam gi"); return
    if a.chi_xem: return

    for goc in [os.path.join(ROOT, "website", "game")] + ([a.assets] if a.assets else []):
        d = os.path.join(goc, "res"); os.makedirs(d, exist_ok=True)
        dst = os.path.join(d, os.path.basename(moi))
        shutil.copyfile(a.file_moi, dst); print("  da chep", dst)
    man[a.ten_logic] = moi
    ra = zlib.compress(json.dumps(man, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), 9)
    if not os.path.exists(MANIFEST + ".goc"):
        shutil.copy2(MANIFEST, MANIFEST + ".goc")
    open(MANIFEST, "wb").write(ra)
    # kiem lai
    m2 = json.loads(zlib.decompress(open(MANIFEST, "rb").read()))
    assert m2[a.ten_logic] == moi and len(m2) == len(man)
    print(f"  manifest: {len(m2)} khoa, {a.ten_logic} -> {m2[a.ten_logic]}  ({len(ra)} byte)")


if __name__ == "__main__":
    main()
