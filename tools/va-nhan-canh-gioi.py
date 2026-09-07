#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Nhãn cảnh giới ở màn Tu luyện (view LVUP) khỏi đè lên mũi tên, và đọc được.

HIỆN TƯỢNG (2026-09-07, iPhone): "Haki Bá Vương 29Nặng ➜ Haki Bá Vương 210Nặng" — hai nhãn
đè lên mũi tên ở giữa, và "29" là realm 2 + tầng 9 dính vào nhau.

VÌ SAO
- Hai nhãn `labCurName`/`labNextName` rộng 260px, chữ 30px đậm, cách nhau 80px cho mũi tên.
  Game vẽ chữ bằng "Arial" mà play.php gán sang /assets/fonts/msyh.ttf — thật ra là font
  UTM Cafeta rất hẹp (chuỗi dài nhất 214px @30px, vừa ô). Trên iPhone canvas rơi về Helvetica
  đậm (356px) nên tràn. Hai nhãn nay dùng font riêng 'UTM Cafeta' (khai báo thêm trong
  play.php, nạp trước khi engine vẽ) cỡ 22px: Cafeta 162px, dự phòng Helvetica 261px.
- Bundle ghép `tên cảnh giới + số tầng + 'Nặng'` (重 dịch máy thành "Nặng"): tên "Haki Bá
  Vương 2" + "9" + "Nặng" = "29Nặng". Đảo thứ tự và đổi chữ: "Haki Bá Vương 2 tầng 9";
  tiêu đề `tên + 'Cảnh'` -> `tên + ' Cảnh'`.

    python3 tools/va-nhan-canh-gioi.py                       # xem, không ghi
    python3 tools/va-nhan-canh-gioi.py --apply --ui <ui.bin hiện tại> --ra <ui.bin mới>
      rồi: python3 tools/phat-hanh-res.py ui/ui.bin <ui.bin mới>

Bundle vá tại chỗ (sao lưu .truoc-va-canh-gioi), chạy lại không vá hai lần.
"""
import argparse, json, os, re, shutil, sys, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, "website", "game", "libs", "e228b-0b904-ac44c.js")
FONT, CO = "UTM Cafeta", 22
# Mã trong bảng chuỗi của bundle: 0x4ee4 = 'num2Chinese', 0x4ae0 = 'Nặng', 0x3bf2 = 'Cảnh'.
MAU_TANG = re.compile(r"\+(_0x[0-9a-f]+\[(_0x[0-9a-f]+)\(0x4ee4\)\]\([^()]*\))\+\2\(0x4ae0\)")


def bang_chuoi(src):
    i = src.find("'templates.bin'"); a = src.rfind("=[", 0, i); b = src.find("];", i)
    return a + 2, b


def va_bundle(src):
    """Trả (src mới, số chỗ đổi). 0 chỗ = đã vá."""
    a, b = bang_chuoi(src); bang = src[a:b]; n = 0
    for cu, moi in (("'Nặng'", "' tầng '"), ("'Cảnh'", "' Cảnh'")):
        if bang.count(cu) == 1:
            bang = bang.replace(cu, moi); n += 1
    src = src[:a] + bang + src[b:]
    src, k = MAU_TANG.subn(r"+\2(0x4ae0)+\1", src); n += k
    return src, n


def va_ui(ui):
    def di(node, dem):
        if isinstance(node, dict):
            p = node.get("props")
            if isinstance(p, dict) and p.get("var") in ("labCurName", "labNextName"):
                p["fontSize"] = CO; p["font"] = FONT; dem.append(p["var"])
            for v in node.values(): di(v, dem)
        elif isinstance(node, list):
            for v in node: di(v, dem)
    dem = []; di(ui.get("LVUP"), dem); return dem


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true"); ap.add_argument("--js", default=JS)
    ap.add_argument("--ui", help="ui.bin hiện tại (res/<băm>)"); ap.add_argument("--ra", help="ghi ui.bin mới ra đây")
    a = ap.parse_args()
    src = open(a.js, encoding="utf-8", errors="surrogateescape").read()
    moi, n = va_bundle(src)
    print("bundle: %d chỗ đổi%s" % (n, "" if n else " (đã vá rồi)"))
    if n and n != 3: sys.exit("!! mong 3 chỗ (2 chuỗi + 1 đảo thứ tự), thấy %d — bundle đổi, xem lại" % n)
    if a.ui:
        raw = open(a.ui, "rb").read(); nen = raw[:1] == b"\x78"
        ui = json.loads(zlib.decompress(raw) if nen else raw)
        dem = va_ui(ui); print("ui.bin: đổi %s -> fontSize %d, font %r" % (dem, CO, FONT))
        if len(dem) != 2: sys.exit("!! không thấy đủ 2 nhãn trong LVUP")
    if not a.apply:
        print("(chưa ghi — thêm --apply)"); return
    if n:
        sao = a.js + ".truoc-va-canh-gioi"
        if not os.path.exists(sao): shutil.copy2(a.js, sao)
        open(a.js, "w", encoding="utf-8", errors="surrogateescape").write(moi); print("đã ghi bundle")
    if a.ui and a.ra:
        out = json.dumps(ui, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        open(a.ra, "wb").write(zlib.compress(out, 9) if nen else out); print("đã ghi", a.ra)


if __name__ == "__main__":
    main()
