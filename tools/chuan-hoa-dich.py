#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Chuan hoa ban dich hien thi trong game — mot bang thuat ngu duy nhat cho CA HAI nguon text.

VI SAO CAN

Van ban trong game den tu hai noi khac nhau, truoc gio duoc sua roi rac nen lech nhau:

  website/game/res/d6519-958fd-b2f8f   = `ui/ui.json` — nhan tren giao dien (3209 chuoi)
  server/excel-src/<bang>/NN.json      = van ban cau hinh (mo ta nhiem vu, vat pham, hoat dong)

Ban goc la DICH MAY tu tieng Trung, nen cung mot tu nguon ra nhieu tu Viet khac nhau:
`nhan lay` va `nhan`, `ban thuong` va `phan thuong`, `anh hung` va `tuong`. Nguoi choc doc
thay ba ten cho mot thu. File nay la NGUON SU THAT ve cach dich; chay lai bat cu luc nao.

CACH DUNG

    python3 tools/chuan-hoa-dich.py --check          # chi bao se doi gi, khong ghi
    python3 tools/chuan-hoa-dich.py --apply          # ghi ca hai nguon
    python3 tools/chuan-hoa-dich.py --apply --ui <duong-dan>   # chi ui.json (dung tren server)

BON PHEP, THEO THU TU

  1. NFC      — file tron hai dang Unicode (3052 NFC / 157 NFD). Hai dang NHIN GIONG HET
                nhau nhung khac byte, nen moi phep tim/thay deu truot o 157 chuoi do.
                Chuan hoa truoc, moi phep sau moi an toan.
  2. Thuat ngu— bang GLOSSARY ben duoi, thay theo RANH GIOI TU, giu hoa/thuong.
  3. Don vi   — `<so> Van/Uc` -> K/M/B. 1 Van = 10.000, 1 Uc = 100.000.000; quy doi dung
                so hoc, khong phai doi chu.
  4. Tien te  — VND -> xu (he thong chi nap qua vi Xu; 1 xu = 1 VND).

DIEU PHAI BIET TRUOC KHI SUA BANG

  * Chi thay khi CHAC CHAN mot nghia. `nhung` la ban dich sai cua 可 (co the) o vai cho va
    dung nghia "nhung" o cho khac — nen chi xu ly cum co dinh, khong thay tu don.
  * Doi don vi CHI ap dung cho van ban Excel. Trong ui.json moi nhan `<so> Van` deu co
    `var`/`name`, tuc la CHO TRONG do game ghi so that de len luc chay — sua vao do khong
    doi duoc gi tren man hinh, chi lam lech ban mau cua nguoi thiet ke.
"""
import argparse, glob, json, os, re, shutil, sys, unicodedata, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# CLIENT NAP ui.bin, KHONG NAP ui.json.
#
# Bang anh xa libs/2af72-f100c-2af72.json co ca hai: 'ui/ui.json' -> res/d6519-958fd-b2f8f
# va 'ui/ui.bin' -> res/aace3-5ee03-baa8e. Nhung trong bundle游戏 chuoi 'ui/ui.bin' xuat hien
# 1 lan lam DUONG DAN, con 'ui/ui.json' xuat hien 0 lan (cac cho co 'ui.json' deu la chuoi
# GHI LOG "ui.json Tang them thoi gian..."). Sua ui.json khong doi duoc gi tren man hinh.
#
# ui.bin la JSON nen zlib (magic 78da), cung 865 man hinh va cung tap khoa voi ui.json.
UI   = os.path.join(ROOT, "website", "game", "res", "aace3-5ee03-baa8e")
UI_JSON = os.path.join(ROOT, "website", "game", "res", "d6519-958fd-b2f8f")
XLS  = os.path.join(ROOT, "server", "excel-src")

# --- Bang thuat ngu -------------------------------------------------------------------
# (tu nguon Trung)  cach dich cu  ->  cach dich chuan
GLOSSARY = [
    # 元宝 — game hai tac goi tien nap la "kim cuong" (client: vat pham 200004 "Kim cương");
    # "nguyen bao" la am Han-Viet cua ban goc, nguoi choi khong hieu. Ap cho ca UI, Excel may chu,
    # templates.bin, cong GM, web (2026-09-07).
    (r"nguyên bảo",            "kim cương"),
    # Man thang tinh (HeroDetail box1Lv/box1Desc1): nhan rong 130px, chu 24px, gia tri dung o
    # x=152 — nhan dich may dai 21-22 ky tu de len so ("Cap han muc 255 >> 280"). Rut cho vua.
    (r"cấp hạn mức cao nhất",   "cấp tối đa"),
    (r"công máu trưởng thành",  "công/máu"),
    # CHI dang nhan (co dau hai cham): "toc do tang len 10%" trong mo ta ky nang phai giu nguyen.
    (r"tốc độ tăng lên:",       "tốc độ:"),
    # 领取 — "nhan lay" la dich thua, dong tu tieng Viet chi can "nhan"
    (r"nhận lấy",              "nhận"),
    # 奖励 — "ban thuong" la tu Han-Viet co, van dung la "thuong" / "phan thuong"
    (r"ban thưởng",            "thưởng"),
    # 获得 — "thu hoach duoc" la dich tu chu, dai va sai giong van
    (r"thu hoạch được",        "nhận được"),
    # 累计充值 — "tinh gop lai nap tien" la dich may nguyen cum
    (r"tính gộp lại nạp tiền", "tích nạp"),
    (r"tính gộp lại",          "tích luỹ"),
    # 点击 — "diem kich" la am Han-Viet, khong ai noi vay
    (r"điểm kích",             "nhấn"),
    # 查看详情
    (r"xem xét tường tình",    "xem chi tiết"),
    # 碎片 — "manh vo" la manh do vo; manh ghep tuong goi la "manh"
    (r"mảnh vỡ",               "mảnh"),
    # 礼包
    (r"lễ bao",                "gói quà"),
    # 英雄 — game nay goi don vi chien dau la "tuong" (nhu moi game dau tuong khac)
    (r"anh hùng anh hùng",     "tướng"),
    (r"anh hùng",              "tướng"),
    # 可领取 / 可 — chi cum co dinh, KHONG thay tu "nhung" don le
    (r"nhưng nhận\b",          "có thể nhận"),
    (r"nhưng hợp thành",       "có thể hợp thành"),
    (r"nhưng sử dụng",         "có thể sử dụng"),
    # 次数
    (r"số lần",                "lượt"),
    # 等级 — giu "cap", bo "dang cap" (dang cap = giai tang xa hoi)
    (r"đẳng cấp",              "cấp"),
]
# Bo qua cac chuoi la TEN RIENG — thay trong ten ky nang/tuong se lam hong ten.
BO_QUA = re.compile(r"Vạn (Pháp|Độc|Diệp|Hoa|Vật|Lý)|Ức Chế|Triệu (Lệ|Vân)")

TIEN = [(r"\bVN[ĐD]\b", "xu")]

def chuan(s):
    return unicodedata.normalize("NFC", s)

def hoa_theo(goc, moi):
    """Giu kieu viet hoa cua cum goc: HOA HET / Hoa dau / thuong."""
    if goc.isupper():          return moi.upper()
    if goc[:1].isupper():      return moi[:1].upper() + moi[1:]
    return moi

def thay_thuat_ngu(s):
    for pat, moi in GLOSSARY:
        s = re.sub(pat, lambda m: hoa_theo(m.group(0), moi), s, flags=re.IGNORECASE)
    for pat, moi in TIEN:
        s = re.sub(pat, moi, s)
    return s

def so_dep(v):
    """1500000 -> '1,5M'; 100000 -> '100K'. Dung dau phay thap phan kieu Viet."""
    for nguong, hau in ((1_000_000_000, "B"), (1_000_000, "M"), (1_000, "K")):
        if v >= nguong:
            x = v / nguong
            t = f"{x:.2f}".rstrip("0").rstrip(".")
            return t.replace(".", ",") + hau
    t = f"{v:.2f}".rstrip("0").rstrip(".")
    return t.replace(".", ",")

CO_HAN = re.compile(r"[\u4e00-\u9fff]")

DON_VI = re.compile(r"(\d[\d.,]*)\s*(Vạn|vạn|Ức|ức)\b")

def doi_don_vi(s):
    if BO_QUA.search(s):
        return s
    def f(m):
        raw, dv = m.group(1), m.group(2).lower()
        try:
            v = float(raw.replace(",", "."))
        except ValueError:
            return m.group(0)
        return so_dep(v * (10**4 if dv == "vạn" else 10**8))
    return DON_VI.sub(f, s)

def xu_ly(s, don_vi):
    s2 = thay_thuat_ngu(chuan(s))
    if don_vi:
        s2 = doi_don_vi(s2)
    return s2

# --- ui.json ---------------------------------------------------------------------------
def doc_ui(path):
    """Doc ui.bin (zlib) hoac ui.json (JSON thuong). Tra (du_lieu, co_nen)."""
    b = open(path, "rb").read()
    if b[:1] == b"\x78":                      # zlib
        return json.loads(zlib.decompress(b)), True
    return json.loads(b.decode("utf-8")), False


def ghi_ui(path, d, nen):
    raw = json.dumps(d, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if nen:
        # Cung muc nen mac dinh -> header 78da giong ban goc.
        raw = zlib.compress(raw, 9)
    open(path, "wb").write(raw)


def chay_ui(path, apply_):
    d, nen = doc_ui(path)
    doi = []
    def walk(n):
        if isinstance(n, dict):
            p = n.get("props")
            if isinstance(p, dict) and isinstance(p.get("text"), str) and p["text"].strip():
                cu = p["text"]
                # don vi: KHONG doi trong ui.json — moi nhan do la cho trong runtime ghi de
                moi = xu_ly(cu, don_vi=False)
                if moi != cu:
                    doi.append((cu, moi)); p["text"] = moi
            for v in n.values(): walk(v)
        elif isinstance(n, list):
            for v in n: walk(v)
    walk(d)
    if apply_ and doi:
        sao = path + ".truoc-chuan-hoa"
        if not os.path.exists(sao):
            shutil.copy2(path, sao)
        ghi_ui(path, d, nen)
    return doi

# --- excel-src -------------------------------------------------------------------------
def chay_excel(apply_):
    doi = []
    for f in sorted(glob.glob(os.path.join(XLS, "*", "*.json"))):
        if f.endswith("_index.json"): continue
        try: j = json.load(open(f, encoding="utf-8"))
        except Exception: continue
        rows = j.get("rows") or []
        sua = False
        for ri, row in enumerate(rows):
            # Dong 1 la HEADER: server tra cot theo ten (XSSFRowWrap.getInteger("开启天数")).
            # Doi mot ky tu o day la bang cau hinh im lang tra ve gia tri mac dinh.
            if not row or ri == 0: continue
            for i, c in enumerate(row):
                # O chu Han = cot van ban NGUON (`*原始文本`) hoac khoa tra cuu. Dich no
                # la lam hong anh xa: game tim ban dich BANG chuoi nguon.
                if isinstance(c, str) and c.strip() and not CO_HAN.search(c):
                    moi = xu_ly(c, don_vi=True)
                    if moi != c:
                        doi.append((os.path.relpath(f, ROOT), c, moi)); row[i] = moi; sua = True
        if sua and apply_:
            # Dung DUNG dinh dang cua excel-to-json.py (compact, mot dong) — khac di la
            # ca file thanh mot thay doi khong the ra soat.
            with open(f, "w", encoding="utf-8") as fh:
                json.dump(j, fh, ensure_ascii=False, separators=(",", ":"), indent=None)
    return doi

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--ui", default=UI, help="duong dan ui.json (tren server: /opt/tcg/assets/res/d6519-958fd-b2f8f)")
    ap.add_argument("--chi-ui", action="store_true")
    a = ap.parse_args()
    if not a.apply and not a.check: a.check = True

    ui = chay_ui(a.ui, a.apply) if os.path.exists(a.ui) else []
    xl = [] if a.chi_ui else chay_excel(a.apply)

    print(f"ui.json  : {len(ui)} nhan doi")
    for cu, moi in ui[:12]: print(f"    {cu!r}\n      -> {moi!r}")
    print(f"excel    : {len(xl)} o doi")
    for f, cu, moi in xl[:12]: print(f"    [{f}] {cu[:70]!r}\n      -> {moi[:70]!r}")
    print("da ghi" if a.apply else "chua ghi (--apply de ghi)")

if __name__ == "__main__":
    main()
