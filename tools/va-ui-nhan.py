#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Đặt font/cỡ chữ cho từng nhãn trong ui.bin theo BẢNG (view → nhãn → props), chạy lại được.

ui.bin (JSON nén zlib, 865 màn hình) nằm trong res/ — không ở trong git, mất khi tải lại
assets — nên bản sửa nằm ở bảng NHAN dưới đây và chạy lại được. Cùng lý do với
tools/apply-ui-text.py (chữ) và tools/va-nhan-canh-gioi.py (bản đầu của màn Tu luyện).

Vì sao đụng tới font: play.php gán "Arial" sang msyh.ttf (= UTM Cafeta, font Việt hẹp);
canvas iPhone không nghe alias đó, vẽ Helvetica đậm rộng gấp rưỡi. Từ 2026-09-07 bundle
đặt font mặc định 'UTM Cafeta' (tools/va-tu-danh-ai.py) nên phần lớn nhãn tự đúng; bảng này
chỉ hạ cỡ chữ ở chỗ ô hẹp mà tên dài (đo bằng canvas thật, xem chú thích từng dòng).

    python3 tools/va-ui-nhan.py --ui res/<ui.bin hiện tại> --ra <ui.bin mới>   # rồi phat-hanh-res.py ui/ui.bin
    python3 tools/va-ui-nhan.py --ui ... --thu                                  # chỉ xem
"""
import argparse, json, sys, zlib

FONT = "UTM Cafeta"
# view -> [ (khóa nhận diện nhãn, props ghi đè) ]
NHAN = {
    # Tu luyện: hai nhãn cảnh giới rộng 260px quanh mũi tên; 30px đè nhau, 22px Cafeta = 162px.
    "LVUP": [({"var": "labCurName"}, {"fontSize": 22, "font": FONT}),
             ({"var": "labNextName"}, {"fontSize": 22, "font": FONT})],
    # Kết quả trận: tên vật phẩm dưới ô 150px (bước 140px vì spaceX -10); mặc định 24px Cafeta
    # "Nhân vật chính kinh nghiệm" = 202px, 18px = 151px.
    "BattleVictory": [({"name": "labName"}, {"fontSize": 18, "font": FONT})],
    # Guild kỹ năng (2026-09-10): "Trí tuệ29Trọng thi(28/40)" — labLevelName 128px căn trái ở x=231 và
    # labLevelMax "(28/40)" cố định ở x=353 đè nhau. Hai hoa văn ở 103–201 và 477–575 nên khoảng trống
    # là 201..477. Nay tên ("Lực lượng tầng 16" = 116px @22, bundle ghép ' tầng ' — tools/va-nhan-ghep.py)
    # căn PHẢI kết thúc ở 361, "(28/40)" căn trái từ 365.
    "GuildSkill": [({"var": "labLevelName"}, {"x": 201, "width": 160, "align": "right", "fontSize": 22, "font": FONT}),
                   ({"var": "labLevelMax"}, {"x": 365, "width": 100, "align": "left", "fontSize": 22, "font": FONT})],
}


def khop(p, khoa):
    return all(p.get(k) == v for k, v in khoa.items())


def di(node, khoa, props, dem):
    if isinstance(node, dict):
        p = node.get("props")
        if isinstance(p, dict) and khop(p, khoa):
            if any(p.get(k) != v for k, v in props.items()):
                p.update(props); dem[0] += 1
            else:
                dem[1] += 1
        for v in node.values(): di(v, khoa, props, dem)
    elif isinstance(node, list):
        for v in node: di(v, khoa, props, dem)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ui", required=True); ap.add_argument("--ra"); ap.add_argument("--thu", action="store_true")
    a = ap.parse_args()
    raw = open(a.ui, "rb").read(); nen = raw[:1] == b"\x78"
    ui = json.loads(zlib.decompress(raw) if nen else raw)
    tong = 0
    for view, ds in NHAN.items():
        if view not in ui: sys.exit("!! không có view %s" % view)
        for khoa, props in ds:
            dem = [0, 0]; di(ui[view], khoa, props, dem)
            if dem[0] + dem[1] == 0: sys.exit("!! %s: không thấy nhãn %s" % (view, khoa))
            print("  %-14s %-24s đổi %d, đã đúng %d -> %s" % (view, json.dumps(khoa, ensure_ascii=False), dem[0], dem[1], props))
            tong += dem[0]
    if a.thu or not a.ra:
        print("(chỉ xem) tổng đổi %d" % tong); return
    out = json.dumps(ui, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    open(a.ra, "wb").write(zlib.compress(out, 9) if nen else out)
    print("đã ghi %s (tổng đổi %d)" % (a.ra, tong))


if __name__ == "__main__":
    main()
