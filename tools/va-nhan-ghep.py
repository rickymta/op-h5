#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vá bundle game (libs/e228b-0b904-ac44c.js): nhãn ghép chuỗi bị đè + thẻ màu cắt chữ. Chạy lại được.

HIỆN TƯỢNG (ảnh người vận hành, 2026-09-10)
1. Màn Thuyền (view Artifact): "Đẳng cấp pháp bảo:12Cấp" đè lên "Kỹ năng đẳng cấp:5Cấp". Bundle ghép
   `'Đẳng cấp pháp bảo:' + level + 'Cấp'` (3 chuỗi dài, mỗi chuỗi dùng đúng 1 chỗ) vào ba nhãn 24px ở
   x=95 / 286 / 494 — chuỗi 189px tràn sang ô kế. Nay "Thuyền: 12 Cấp" (110px), "Kỹ năng: 5 Cấp",
   "Tinh luyện: 80 Cấp", có dấu cách trước 'Cấp' (chuỗi 'Cấp' dùng chung 23 chỗ nên không đổi nó).
2. Màn Guild kỹ năng: "Trí tuệ29Trọng thi(28/40)". Bundle ghép `tên + level + 'Trọng thiên'` (重天 dịch máy)
   vào labLevelName rộng 128px rồi labLevelMax "(28/40)" đặt cố định ở x=353 đè lên. Nay
   `tên + ' tầng ' + level` = "Trí tuệ tầng 29"; hai nhãn đặt lại trong ui.bin (tools/va-ui-nhan.py).
3. Bí cảnh: "Sử dụngSừngĐạt được thắng lợi" — mô tả gốc "Sử dụng <2214 Sừng hươu trận > Đạt được thắng lợi".
   Bộ phân tích thẻ `<mã-màu chữ>` của client (`str2HtmlUnitNoSize`, và `lan2HtmlUnit` cho 文本库)
   làm `split(' ')` rồi lấy phần tử [1] → chữ nhiều từ chỉ còn từ đầu; 284 ô trong 11 bảng client
   (mô tả thử thách, thư, gợi ý tướng cho sưu tập, mô tả kỹ năng…) cùng bị. Ngoài ra Laya HTMLParse
   cắt khoảng trắng đầu/cuối mọi text node nên chữ hai bên thẻ dính vào thẻ. Nay: nối lại toàn bộ
   phần sau mã màu, và đổi dấu cách ở mép đoạn chữ thường thành `&nbsp;` (HTMLParse đổi thành
   char255 trước khi cắt, rồi trả về dấu cách — đọc từ libs/6c019-63500-58428.js).
4. Vài chuỗi tiếng Trung bundle tự ghép để hiện: "当前战绩：N胜M负" (thành tích đấu), gợi ý tầng và hộp
   thoại đóng giữ ở Tam thập lục trọng thiên. Dịch tại chỗ, không đổi cấu trúc code.

    python3 tools/va-nhan-ghep.py            # xem
    python3 tools/va-nhan-ghep.py --apply    # ghi (sao lưu .truoc-va-nhan-ghep)

Mỗi miếng vá khai báo số chỗ mong đợi; lệch là dừng — bundle mới từ nhà phát hành thì xem lại.
"""
import argparse, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, "website", "game", "libs", "e228b-0b904-ac44c.js")
SAO_LUU = ".truoc-va-nhan-ghep"

# (tên, chuỗi/regex cũ, chuỗi mới, số chỗ mong đợi, là_regex)
VA = [
    # --- 1. Thuyền: 3 chuỗi (bảng chuỗi, mã 0x2e00/0x30c0/0x54de) + dấu cách trước 'Cấp' (0xb33) ---
    ("thuyen.chuoi.1", r"'Đẳng\x20cấp\x20pháp\x20bảo:'", r"'Thuyền:\x20'", 1, False),
    ("thuyen.chuoi.2", r"'Kỹ\x20năng\x20đẳng\x20cấp:'", r"'Kỹ\x20năng:\x20'", 1, False),
    ("thuyen.chuoi.3", r"'Tinh\x20luyện\x20đẳng\x20cấp:'", r"'Tinh\x20luyện:\x20'", 1, False),
    ("thuyen.cach", r"(_0x3cc915\((?:0x2e00|0x30c0|0x54de)\)\+_0x13cfad\[_0x3cc915\(0x[0-9a-f]+\)\])\+_0x3cc915\(0xb33\)",
     r"\1+'\\x20'+_0x3cc915(0xb33)", 3, True),
    # --- 2. Guild kỹ năng: tên + level + 'Trọng thiên' -> tên + ' tầng ' + level (thường và PVP) ---
    ("guild.thuong", r"+_0x9a00c3['level']+'Trọng\x20thiên'", r"+'\x20tầng\x20'+_0x9a00c3['level']", 1, False),
    ("guild.pvp", r"+_0x59bdc7[_0x4ba1d1(0x2515)]+_0x4ba1d1(0x53a2)", r"+'\x20tầng\x20'+_0x59bdc7[_0x4ba1d1(0x2515)]", 1, False),
    # --- 3. Thẻ màu: str2HtmlUnitNoSize (bảng client) và lan2HtmlUnit (文本库) ---
    ("the.link", r"_0x56b6f2=_0x58fd62[0x2]", r"_0x56b6f2=_0x58fd62.slice(0x2).join('\x20').trim()", 1, False),
    ("the.chu", r"_0x56b6f2=_0x58fd62[0x1]", r"_0x56b6f2=_0x58fd62.slice(0x1).join('\x20').trim()", 1, False),
    ("the.mep", r"if(!_0x4c7b88)return _0x5a4119;",
     r"if(!_0x4c7b88)return _0x5a4119.replace(/^\x20+/,'&nbsp;').replace(/\x20+$/,'&nbsp;');", 1, False),
    ("lan.chu", r"_0x43536a=_0x4e0169[0x1];", r"_0x43536a=_0x4e0169.slice(0x1).join('\x20').trim();", 1, False),
    ("lan.mep", r"(_0x5930f7+=_0x2de9d9[_0x4e5127]),",
     r"(_0x5930f7+=_0x2de9d9[_0x4e5127].replace(/^\x20+/,'&nbsp;').replace(/\x20+$/,'&nbsp;')),", 1, False),
    # --- 4. Chuỗi tiếng Trung bundle tự ghép ---
    ("thanhtich.1", r"'当前战绩：'", r"'Thành\x20tích:\x20'", 1, False),
    ("thanhtich.2", r"+'胜'+", r"+'\x20thắng\x20'+", 1, False),
    ("thanhtich.3", r"+'负',", r"+'\x20thua',", 1, False),
    ("36thien.goiy.1", r"'小提示:本层驻守需'", r"'Gợi\x20ý:\x20tầng\x20này\x20cần\x20tướng\x20'", 1, False),
    ("36thien.goiy.2", r"+'星'+(this[_0x317ab7(0x4c0b)][_0x317ab7(0x5ba3)]>0x0?this['floorTpl']['heroRealm']+'Giai':'')+'英雄'",
     r"+'\x20sao'+(this[_0x317ab7(0x4c0b)][_0x317ab7(0x5ba3)]>0x0?'\x20giai\x20'+this['floorTpl']['heroRealm']:'')", 1, False),
    ("36thien.hoi.1", r"'是否重新入驻【'", r"'Đóng\x20giữ\x20lại\x20【'", 1, False),
    ("36thien.hoi.2", r"'】?<br/>入驻奖励加成为<2405\x20'", r"'】?<br/>Thưởng\x20đóng\x20giữ\x20cộng\x20thêm\x20<2405\x20'", 1, False),
    ("36thien.hoi.3", r"'原入驻【'", r"'Đang\x20đóng\x20giữ\x20【'", 2, False),
    ("36thien.hoi.4", r"'】，获得奖励加成为<2409\x20'", r"'】,\x20thưởng\x20cộng\x20thêm\x20<2409\x20'", 2, False),
    ("36thien.hoi.5", r"'重新驻守【'", r"'Đóng\x20giữ\x20lại\x20【'", 1, False),
    ("36thien.hoi.6", r"'】需要<2409\x20'", r"'】\x20cần\x20<2409\x20'", 1, False),
    ("36thien.hoi.7", r"+'>/'+_0x38f1f6+'名'+_0x2c160a[_0x140166(0x2a1c)]+'星级易伤英雄?<br/>因驻守英雄数量不足，当前入驻后奖励为<2409\x200>'",
     r"+'>/'+_0x38f1f6+'\x20tướng\x20từ\x20'+_0x2c160a[_0x140166(0x2a1c)]+'\x20sao?<br/>Chưa\x20đủ\x20tướng\x20đóng\x20giữ,\x20thưởng\x20sau\x20khi\x20vào\x20là\x20<2409\x200>'", 1, False),
    ("36thien.hoi.8", r"'%><br\x20/><2409\x20是否确认入驻？>'", r"'%><br\x20/><2409\x20Xác\x20nhận\x20đóng\x20giữ?>'", 1, False),
]


def va(src):
    """Trả (src mới, [(tên, số chỗ đổi)], lỗi)."""
    ket = []
    for ten, cu, moi, mong, la_re in VA:
        if la_re:
            src2, n = re.subn(cu, moi, src)
            # dấu vết đã vá: phần đuôi cố định của chuỗi thay (sau nhóm \1)
            da = 0 if n else src.count(moi.split(")", 1)[1] if moi.startswith("\\1") else moi)
        else:
            n = src.count(cu); src2 = src.replace(cu, moi); da = 0 if n else src.count(moi)
        if n == 0 and da == 0:
            return src, ket, f"{ten}: không thấy chuỗi cũ lẫn chuỗi mới — bundle đổi, xem lại"
        if n and n != mong:
            return src, ket, f"{ten}: mong {mong} chỗ, thấy {n}"
        ket.append((ten, n)); src = src2
    return src, ket, None


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--apply", action="store_true"); ap.add_argument("--js", default=JS)
    a = ap.parse_args()
    src = open(a.js, encoding="utf-8", errors="surrogateescape").read()
    moi, ket, loi = va(src)
    for ten, n in ket: print("  %-16s %s" % (ten, "đổi %d" % n if n else "đã vá"))
    if loi: sys.exit("!! " + loi)
    tong = sum(n for _, n in ket); print("bundle: %d chỗ đổi%s" % (tong, "" if tong else " (đã vá rồi)"))
    if a.apply and tong:
        sao = a.js + SAO_LUU
        if not os.path.exists(sao): shutil.copy2(a.js, sao)
        open(a.js, "w", encoding="utf-8", errors="surrogateescape").write(moi); print("đã ghi", a.js)


if __name__ == "__main__":
    main()
