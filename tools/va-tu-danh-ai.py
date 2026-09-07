#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Hai miếng vá bundle game (libs/e228b-0b904-ac44c.js), chạy lại được, không vá hai lần.

1. FONT MẶC ĐỊNH = 'UTM Cafeta' trên mọi nền tảng.
   Bundle chỉ đặt `Laya.Text.defaultFont='Arial'` khi onPC/QGMiniGame, còn lại để engine mặc
   định (cũng 'Arial'). play.php gán "Arial" sang msyh.ttf (= UTM Cafeta, font Việt hẹp) —
   Chrome trên PC nghe theo, còn canvas iPhone vẽ bằng Arial/Helvetica hệ thống (rộng gấp
   rưỡi) nên tên vật phẩm, nhãn dài đè lên nhau (màn kết quả trận 2026-09-07). Gọi đích danh
   'UTM Cafeta' (play.php khai báo thêm family này) thì mọi nền tảng vẽ như PC.

2. MÓC "TỰ ĐÁNH ẢI TIẾP": `afterOpen()` của màn thắng trận (BattleVictory) gọi
   `window.opKetQuaTran(this, [nhãn "Khiêu chiến tầng tiếp", nhãn tháp Ma])` nếu có; phần
   quyết định (bật/tắt, chờ bao lâu, bấm nút nào) nằm ở op-tu-danh.js, sửa không cần vá lại.
   Nút "Khiêu chiến tầng tiếp" chỉ đặt isReturn=true rồi closeUI(); afterClose gọi callback
   của phó bản với isReturn → game tự mở trận kế. Shim bấm đúng nút đó.

    python3 tools/va-tu-danh-ai.py            # xem
    python3 tools/va-tu-danh-ai.py --apply    # ghi (sao lưu .truoc-va-tu-danh)
"""
import argparse, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, "website", "game", "libs", "e228b-0b904-ac44c.js")
FONT = "UTM Cafeta"
# Mã bảng chuỗi: 0x1f15 Text, 0x1287 Browser, 0x3b3c onPC, 0x396e onQGMiniGame, 0x5813 defaultFont.
MAU_FONT = re.compile(
    r"\['defaultFontSize'\]=0x18;if\(Laya\[(\w+)\(0x1287\)\]\[\1\(0x3b3c\)\]\)Laya\[\1\(0x1f15\)\]\[\1\(0x5813\)\]='Arial';"
    r"else Laya\[\1\(0x1287\)\]\[\1\(0x396e\)\]&&\(Laya\[\1\(0x1f15\)\]\[\1\(0x5813\)\]='Arial'\);")
# afterOpen của BattleVictory: 0x2005 timerListener, 0x4e99 getLanCodeTip; 0x2788/0x2789 = nhãn "ải tiếp".
MAU_HOOK = re.compile(r"(const (_0x44e3af)=_0x645b1d;_0x381dbe\['start'\]\(0x2710,this,this\[\2\(0x2005\)\],0x1\);)\}")
HOOK = ("try{window.opKetQuaTran&&window.opKetQuaTran(this,[_0x29dd8b[%s(0x4e99)](0x2788),"
        "_0x29dd8b[%s(0x4e99)](0x2789)])}catch(e){}}")


def va(src):
    n = 0
    src, k = MAU_FONT.subn(r"['defaultFontSize']=0x18;Laya[\1(0x1f15)][\1(0x5813)]='%s';" % FONT, src); n += k
    if "opKetQuaTran" not in src:
        if "_0x29dd8b[_0xb971b0(0x4e99)](0x2788)" not in src:
            sys.exit("!! không thấy _0x29dd8b.getLanCodeTip(0x2788) trong show() — bundle đổi, xem lại")
        src, k = MAU_HOOK.subn(lambda m: m.group(1) + HOOK % (m.group(2), m.group(2)), src)
        if k != 1: sys.exit("!! afterOpen của BattleVictory: mong 1 chỗ, thấy %d" % k)
        n += k
    return src, n


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--apply", action="store_true"); ap.add_argument("--js", default=JS)
    a = ap.parse_args()
    src = open(a.js, encoding="utf-8", errors="surrogateescape").read()
    moi, n = va(src)
    print("bundle: %d chỗ đổi%s" % (n, "" if n else " (đã vá rồi)"))
    print("  font mặc định:", "'%s'" % FONT if "=0x18;Laya[" in moi else "?", "| móc opKetQuaTran:", "opKetQuaTran" in moi)
    if a.apply and n:
        sao = a.js + ".truoc-va-tu-danh"
        if not os.path.exists(sao): shutil.copy2(a.js, sao)
        open(a.js, "w", encoding="utf-8", errors="surrogateescape").write(moi); print("đã ghi")


if __name__ == "__main__":
    main()
