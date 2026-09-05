#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sinh SQL seed cho bang platform.game_packages — danh muc cua hang (docs/design-cua-hang.md).

Nguon (tat ca nam trong git, chay duoc o bat ky may nao):
  website/game/api/id.txt                              payId;giaXu — NGUON SU THAT ve gia (ban PHP cu doi chieu).
  server/excel-src/recharge-item/01.json               充值项: ID, *名称, 额度, *功能ID, *商品ID, *vip积分.
  server/excel-src/recharge-benefit/*.json             充值福利: ten tieng Viet + noi dung + dieu kien cua cac goi
                                                       hien thi (付费充值, 月基金, 特权商城, 超级特权, 每日礼包,
                                                       全服限购商品, 成长基金, 爬塔基金, 种族塔基金).
  website/game/gmhanglong/gm/pay.txt                   payId,tenViet(may dich),giaNguyen — ten du phong.
  website/game/gmhanglong/gm/item.txt                  type:id|tenViet — de dung mo ta tu chuoi qua.
  docker/initdb/mysql/seed/web.sql                     bang web.webshop cu -> goi vat pham web (grant_mode=mail).

Quy tac:
  * item_tid = payId (game phat qua console /gm/pay/manual). Goi mail thi item_tid=0, reward la chuoi qua.
  * category theo *功能ID (bang FUNC_CATEGORY); phan con lai la 'event' (van hien tren web, theo
    quyet dinh 2026-09-05), tru muc khong co gia trong id.txt.
  * ON DUPLICATE KEY UPDATE: gia, nhom, cach phat, noi dung, dieu kien, thu tu duoc ghi de (tool so huu);
    `name` va `status` KHONG ghi de (quan tri sua tay tren trang admin).

  python tools/gen-game-packages.py                 # ghi docker/platform-seed/game_packages.haitac.sql
  python tools/gen-game-packages.py --check         # chi doi chieu va thong ke, khong ghi
"""
import argparse
import io
import json
import os
import re
import sys
from collections import Counter, OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ID_TXT = os.path.join(ROOT, "website", "game", "api", "id.txt")
PAY_TXT = os.path.join(ROOT, "website", "game", "gmhanglong", "gm", "pay.txt")
ITEM_TXT = os.path.join(ROOT, "website", "game", "gmhanglong", "gm", "item.txt")
XLS_ITEM = os.path.join(ROOT, "server", "excel-src", "recharge-item")
XLS_BENEFIT = os.path.join(ROOT, "server", "excel-src", "recharge-benefit")
WEB_SQL = os.path.join(ROOT, "docker", "initdb", "mysql", "seed", "web.sql")
OUT_DIR = os.path.join(ROOT, "docker", "platform-seed")

# 功能ID -> nhom hien thi. Khong co trong bang -> 'event'.
FUNC_CATEGORY = {
    710: "diamond",                       # 付费充值: 8 moc Nguyen Bao
    730: "fund", 732: "fund", 734: "fund", 750: "fund",
    721: "privilege", 722: "privilege", 723: "privilege",
    13600: "card", 13800: "card", 14000: "card", 14500: "card", 17100: "card",
    720: "daily",
    13700: "limited", 820: "limited",   # 820 = 全服限购商品 (27001-27003)
}
CATEGORY_ORDER = ["diamond", "card", "fund", "privilege", "daily", "limited", "event", "item"]

# Ten hien thi chuan cho cac goi ban tren web (ban may dich trong pay.txt khong dung duoc).
NAMES = {
    12001: "Quỹ trưởng thành", 13001: "Quỹ leo tháp", 13002: "Quỹ tháp chủng tộc",
    17001: "Quỹ đặc biệt", 17101: "Quỹ đặc biệt (giá ưu đãi)",
    17002: "Quỹ sa hoa", 17202: "Quỹ sa hoa (giá ưu đãi)",
    20001: "Gói quà Mệnh Ký", 20002: "Đặc quyền Tác chiến nhanh", 20003: "Đặc quyền Đồ Đằng Thánh Điện",
    20004: "Đặc quyền Thần Long", 20005: "Đặc quyền Quyển Trục", 31001: "Đặc quyền Hắc Kim",
    31002: "Thẻ tuần Phù Văn đúc lại", 31003: "Thẻ tuần Thú Hồn bạc", 31004: "Thẻ tuần Đồ Đằng Thánh Điện",
    31005: "Thẻ tuần Tỉ Ấn đúc lại bạc", 31006: "Thẻ tuần Thú Hồn vàng", 31007: "Thẻ tuần Tỉ Ấn đúc lại vàng",
    31008: "Thẻ tuần Trang bị bạc", 31009: "Thẻ tuần Trang bị vàng",
    19001: "Gói quà hàng ngày", 19002: "Gói quà Quý 1", 19003: "Gói quà Quý 2",
    19004: "Gói quà hàng ngày", 19005: "Gói quà Quý 1", 19006: "Gói quà Quý 2",
    19007: "Gói quà hàng ngày", 19008: "Gói quà Quý 1", 19009: "Gói quà Quý 2",
    19101: "Mua một lượt (ngày 1–14)",
    27001: "Quà rút tướng", 27002: "Quà rút tướng sa hoa", 27003: "Quà lực chiến",
}
CURRENCY = {"0:0": "Kim tệ", "0:1": "Nguyên Bảo", "0:2": "Ngân lượng", "0:3": "EXP nhân vật", "0:4": "EXP anh hùng"}


def fmt(n):
    try:
        n = int(n)
    except (TypeError, ValueError):
        return str(n)
    return f"{n:,}".replace(",", ".")


def q(s):
    return str(s).replace("\\", "\\\\").replace("'", "''")


def sql_val(v):
    if v is None or v == "":
        return "NULL"
    if isinstance(v, (int, float)):
        return str(int(v))
    return "'" + q(v) + "'"


# ---------------------------------------------------------------- doc nguon
def read_id_txt():
    prices, order = {}, []
    with io.open(ID_TXT, encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split(";")
            if len(parts) < 2 or not parts[0].strip().isdigit() or not parts[1].strip().isdigit():
                continue
            pid = int(parts[0])
            if pid in prices:
                continue
            prices[pid] = int(parts[1])
            order.append(pid)
    return prices, order


def read_sheet(wb_dir, sheet_name):
    idx = json.load(io.open(os.path.join(wb_dir, "_index.json"), encoding="utf-8"))
    for s in idx["sheets"]:
        if s["name"] == sheet_name:
            rows = json.load(io.open(os.path.join(wb_dir, s["file"]), encoding="utf-8"))["rows"]
            hdr = [str(h).strip() if h is not None else "" for h in rows[0]]
            out = []
            for r in rows[1:]:
                if not r or r[0] in (None, ""):
                    continue
                d = {hdr[i]: r[i] for i in range(min(len(hdr), len(r))) if hdr[i]}
                out.append(d)
            return out
    raise SystemExit(f"khong thay sheet {sheet_name} trong {wb_dir}")


def as_int(v, default=None):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default


def read_pay_txt():
    names = {}
    with io.open(PAY_TXT, encoding="utf-8") as f:
        for line in f:
            head = line.strip().split("|")[0]
            parts = head.split(",")
            if len(parts) >= 2 and parts[0].strip().isdigit():
                names[int(parts[0])] = parts[1].strip()
    return names


def read_item_txt():
    names = {}
    with io.open(ITEM_TXT, encoding="utf-8") as f:
        for line in f:
            if "|" not in line:
                continue
            k, v = line.rstrip("\n").split("|", 1)
            names[k.strip()] = v.strip()
    return names


def read_webshop():
    """Bang web.webshop cu: (id, name, item, price, icon) -> goi vat pham web."""
    if not os.path.exists(WEB_SQL):
        return []
    s = io.open(WEB_SQL, encoding="utf-8").read()
    m = re.search(r"^INSERT INTO `webshop` VALUES (.*?);$", s, re.M | re.S)
    if not m:
        return []
    rows = re.findall(r"\((\d+),'((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)',(\d+),'((?:[^'\\]|\\.)*)'\)", m.group(1))
    out = []
    for wid, name, item, price, _icon in rows:
        name = re.sub(r"\s+", " ", name.replace("\\n", " ")).strip()
        out.append((int(wid), name, item.strip(), int(price)))
    return out


# ---------------------------------------------------------------- mo ta qua
def describe_reward(reward, items):
    """'0:1:500#3:100001:1000' -> 'Nguyên Bảo ×500 · Tiến giai thạch ×1.000'."""
    if not reward:
        return ""
    parts = []
    for piece in str(reward).split("#"):
        seg = piece.strip().split(":")
        if len(seg) < 2:
            continue
        key = f"{seg[0]}:{seg[1]}"
        count = seg[2] if len(seg) > 2 else "1"
        name = CURRENCY.get(key) or items.get(key) or items.get(seg[1]) or f"vật phẩm {seg[1]}"
        parts.append(f"{name} ×{fmt(count)}")
    return " · ".join(parts)


def reward_diamonds(reward):
    """Tong Nguyen Bao (0:1:N) trong mot chuoi qua."""
    total = 0
    for piece in str(reward or "").split("#"):
        seg = piece.split(":")
        if len(seg) == 3 and seg[0] == "0" and seg[1] == "1":
            total += as_int(seg[2], 0)
    return total


def clip(s, n=500):
    s = re.sub(r"\s+", " ", s or "").strip()
    return s if len(s) <= n else s[: n - 1] + "…"


# ---------------------------------------------------------------- dung danh muc
def build(game):
    prices, order = read_id_txt()
    pay_names = read_pay_txt()
    items = read_item_txt()

    excel = {}
    for d in read_sheet(XLS_ITEM, "充值项"):
        pid = as_int(d.get("ID"))
        if pid is None:
            continue
        excel[pid] = {
            "name": str(d.get("*名称") or "").strip(),
            "amount": as_int(d.get("额度")),
            "func": as_int(d.get("*功能ID")),
            "shop": as_int(d.get("*商品ID")),
            "vip": as_int(d.get("*vip积分")),
        }

    # Chi tiet tu 充值福利 theo payId: (description, badge, reward, extra)
    detail = {}

    for d in read_sheet(XLS_BENEFIT, "付费充值"):
        pid = as_int(d.get("充值项ID"))
        base, first = as_int(d.get("基础元宝"), 0), as_int(d.get("首冲赠送元宝"), 0)
        if pid:
            detail[pid] = dict(
                name=f"{fmt(base)} Nguyên Bảo",
                description=f"Nhận {fmt(base)} Nguyên Bảo. Lần đầu mua mốc này được thêm {fmt(first)} (tổng {fmt(base + first)}). Cộng điểm VIP.",
                badge="x2 lần đầu", reward=f"0:1:{base}")

    for d in read_sheet(XLS_BENEFIT, "月基金"):
        full, disc = as_int(d.get("人民币价格")), as_int(d.get("打折价格"))
        gift, total = as_int(d.get("购买送元宝"), 0), as_int(d.get("总价值"), 0)
        d_open, d_renew = as_int(d.get("开服打折天数")), as_int(d.get("续费打折天数"))
        base_desc = f"Tặng ngay {fmt(gift)} Nguyên Bảo, nhận thêm thưởng mỗi ngày đăng nhập. Tổng giá trị {fmt(total)}."
        if pid := as_int(d.get("充值项ID")):
            detail[pid] = dict(description=base_desc, reward=f"0:1:{gift}")
        if (pid2 := as_int(d.get("优惠价格充值项ID"))) and full and disc:
            detail[pid2] = dict(
                description=base_desc + f" Giá ưu đãi chỉ trong {d_open} ngày đầu sau mở máy chủ hoặc {d_renew} ngày gia hạn — ngoài thời gian đó game sẽ từ chối và hoàn Xu.",
                badge=f"Giảm {round((1 - disc / full) * 100)}%", reward=f"0:1:{gift}")

    for sheet, pid in (("成长基金", 12001), ("爬塔基金", 13001), ("种族塔基金", 13002)):
        rows = read_sheet(XLS_BENEFIT, sheet)
        extra = sum(reward_diamonds(r.get("额外奖励")) for r in rows)
        detail[pid] = dict(
            description=f"Kích hoạt quỹ, nhận thưởng theo {len(rows)} mốc trong game" + (f" — tổng {fmt(extra)} Nguyên Bảo phần thưởng thêm." if extra else "."))

    for d in read_sheet(XLS_BENEFIT, "特权商城"):
        pid = as_int(d.get("充值项ID"))
        if not pid:
            continue  # mua bang Nguyen Bao trong game, khong ban bang tien
        goods = "#".join(x for x in (str(d.get("特权商品") or ""), str(d.get("额外商品") or "")) if x)
        period = as_int(d.get("限购周期"))
        per = f" Mỗi {period // 86400} ngày mua được một lần." if period and period > 0 else ""
        detail[pid] = dict(name=str(d.get("特权名称") or "").strip(),
                           description=clip(f"{d.get('描述') or ''}. Quà: {describe_reward(goods, items)}.{per}"), reward=goods)

    for d in read_sheet(XLS_BENEFIT, "超级特权"):
        if pid := as_int(d.get("充值项ID")):
            detail[pid] = dict(
                description=clip(f"Nhận ngay: {describe_reward(d.get('基础奖励'), items)}. Mỗi ngày: {describe_reward(d.get('每日奖励'), items)}."),
                reward=str(d.get("基础奖励") or ""))

    for d in read_sheet(XLS_BENEFIT, "每日礼包"):
        pid = as_int(d.get("充值项ID"))
        if not pid:
            continue
        dbl = reward_diamonds(d.get("翻倍奖励"))
        mult = as_int(d.get("翻倍系数"), 2)
        desc = f"Nguyên Bảo ×{fmt(dbl)} (đã x{mult}) · {describe_reward(d.get('一般奖励'), items)}"
        detail[pid] = dict(
            description=clip(desc), reward=f"0:1:{dbl}#{d.get('一般奖励') or ''}",
            server_day_min=as_int(d.get("开服天数下限")), server_day_max=as_int(d.get("开服天数上限")),
            daily_limit=as_int(d.get("每日限购")), vip_required=as_int(d.get("VIP要求")))

    for d in read_sheet(XLS_BENEFIT, "全服限购商品"):
        pid = as_int(d.get("充值项ID"))
        if not pid:
            continue
        price, orig = as_int(d.get("价格")), as_int(d.get("原价"))
        detail[pid] = dict(
            name=str(d.get("商品名称") or "").strip(),
            description=clip(f"{describe_reward(d.get('商品'), items)}. Mỗi người mua {as_int(d.get('个人限购'), 1)} lần, toàn máy chủ {as_int(d.get('全服限购'), 0)} suất."),
            badge=(f"Giảm {round((1 - price / orig) * 100)}%" if price and orig and orig > price else None),
            reward=str(d.get("商品") or ""))

    # ---- danh muc
    rows, stats = [], Counter()
    mismatch = [(p, prices[p], excel[p]["amount"]) for p in order
                if p in excel and excel[p]["amount"] not in (None, prices[p])]
    if mismatch:
        # id.txt la gia nguoi choi da tra tren web cu; 额度 la gia game tu tinh (VIP, moc nap).
        # Giu id.txt, nhung in ra de nguoi van hanh biet — 31004 la mot ca dang ngo (100k vs 1tr).
        print(f"lech gia id.txt / 额度: {len(mismatch)} muc, giu id.txt — vd " +
              ", ".join(f"{p}: {a} vs {b}" for p, a, b in mismatch[:6]), file=sys.stderr)
    for pid in order:
        ex = excel.get(pid)
        if not ex:
            # Khong co dong 充值项 -> game khong biet phat gi (PayItemSheet.get tra null) -> bo han.
            stats["bo: khong co trong excel"] += 1
            continue
        func = ex["func"]
        cat = FUNC_CATEGORY.get(func, "event")
        det = detail.get(pid, {})
        name = NAMES.get(pid) or det.get("name") or pay_names.get(pid) or (ex["name"] if ex else "") or f"Gói {pid}"
        if cat == "card" and not det:
            det = dict(description="Thẻ tuần: nhận thưởng mỗi ngày trong 7 ngày.")
        rows.append(OrderedDict(
            game_code=game, package_id=str(pid), name=name, category=cat, grant_mode="pay",
            price_xu=prices[pid], item_tid=pid, item_count=1, item_name=name,
            reward=det.get("reward") or None, description=det.get("description") or None,
            badge=det.get("badge") or None,
            func_id=func, shop_item_id=(ex["shop"] if ex else None), vip_points=(ex["vip"] if ex else None),
            server_day_min=det.get("server_day_min"), server_day_max=det.get("server_day_max"),
            daily_limit=det.get("daily_limit"), vip_required=det.get("vip_required"),
            status="active"))
        stats[cat] += 1

    for wid, name, item, price in read_webshop():
        reward = item if item.count(":") == 2 else item + ":1"
        rows.append(OrderedDict(
            game_code=game, package_id=f"web-{wid}", name=name, category="item", grant_mode="mail",
            price_xu=price, item_tid=0, item_count=1, item_name=name,
            reward=reward, description=clip(f"Gửi qua thư trong game: {describe_reward(reward, items)}."),
            badge=None, func_id=None, shop_item_id=None, vip_points=None,
            server_day_min=None, server_day_max=None, daily_limit=None, vip_required=None,
            status="active"))
        stats["item"] += 1

    rows.sort(key=lambda r: (CATEGORY_ORDER.index(r["category"]), r["price_xu"], r["package_id"]))
    for i, r in enumerate(rows):
        r["sort_order"] = i
    return rows, stats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", default="haitac")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()

    rows, stats = build(a.game)
    print(f"{len(rows)} goi: " + ", ".join(f"{k}={v}" for k, v in sorted(stats.items())))
    for r in rows:
        if r["category"] != "event" and r["category"] != "ingame":
            print(f"  {r['category']:9s} {r['package_id']:>8} {r['price_xu']:>9,} {r['name']}" + (f" [{r['badge']}]" if r["badge"] else ""))
    if a.check:
        return

    cols = list(rows[0].keys())
    owned = ["price_xu", "item_tid", "item_count", "item_name", "category", "grant_mode", "reward",
             "description", "badge", "func_id", "shop_item_id", "vip_points",
             "server_day_min", "server_day_max", "daily_limit", "vip_required", "sort_order"]
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f"game_packages.{a.game}.sql")
    lines = [
        "-- SINH TU DONG boi tools/gen-game-packages.py — dung sua tay, sua nguon (id.txt, Excel JSON, NAMES trong tool) roi chay lai.",
        f"-- {len(rows)} goi cho game '{a.game}': " + ", ".join(f"{k}={v}" for k, v in sorted(stats.items())) + ".",
        "-- Gia tu website/game/api/id.txt; nhom/noi dung/dieu kien tu recharge-item + recharge-benefit; ten Viet tu",
        "-- recharge-benefit / NAMES / gm/pay.txt. Goi 'item' (grant_mode=mail) tu bang web.webshop cu.",
        "-- Chay lai: ghi de gia/nhom/noi dung/dieu kien; KHONG ghi de `name` va `status` (sua tay tren trang quan tri).",
        "SET NAMES utf8mb4;",
        f"INSERT INTO game_packages ({', '.join(cols)}) VALUES",
    ]
    vals = ["(" + ",".join(sql_val(r[c]) for c in cols) + ")" for r in rows]
    lines.append(",\n".join(vals))
    lines.append("ON DUPLICATE KEY UPDATE " + ", ".join(f"{c}=VALUES({c})" for c in owned) + ";")
    with io.open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    print(f"da ghi {os.path.relpath(out, ROOT)}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
