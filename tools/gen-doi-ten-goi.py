#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sinh SQL doi ten goi nap cho DB DANG CHAY.

VI SAO CAN FILE RIENG

`docker/platform-seed/game_packages.haitac.sql` upsert bang `ON DUPLICATE KEY UPDATE` nhung
CO Y khong ghi de cot `name` tru khi ten dang luu con chu Han — de khong dap len ten nguoi
van hanh sua tay tren trang quan tri. Hau qua: doi ten trong `NAMES` cua
gen-game-packages.py chi co tac dung tren DB MOI; DB dang chay giu nguyen ten cu.

File nay sinh cac lenh UPDATE co dieu kien de dua ten moi vao DB dang chay.

AN TOAN

  * Dieu kien `AND (name = <ten cu>...)` liet ke moi ten tung duoc sinh ra o cac ban truoc.
    Nguoi van hanh da tu dat ten khac -> khong khop -> giu nguyen ten ho dat.
  * Chay lai vo hai (lan hai khong con dong nao khop).
  * Tren may moi, seed chinh da ghi ten dung nen file nay khong khop gi.
  * Bo qua cac goi ma `game_packages.haitac.doi-ten.sql` da lo.
  * Bo qua truong hop chi khac dang Unicode (NFC/NFD) — mat thuong khong phan biet duoc,
    khong dang sinh ra hang tram lenh UPDATE.

    python3 tools/gen-doi-ten-goi.py --tu 68a9bf3,e33da1a,a180958
"""
import argparse, io, os, re, subprocess, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHINH = "docker/platform-seed/game_packages.haitac.sql"
DA_LO = "docker/platform-seed/game_packages.haitac.doi-ten.sql"
RA = os.path.join(ROOT, "docker/platform-seed/game_packages.haitac.chuan-hoa-ten.sql")
DONG = re.compile(r"^\('haitac','([^']+)','((?:[^']|'')*)'", re.M)


def ten_trong(text):
    return {m.group(1): m.group(2).replace("''", "'") for m in DONG.finditer(text)}


def q(x):
    return "'" + x.replace("'", "''") + "'"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tu", default="68a9bf3,e33da1a,a180958,181cf35",
                    help="cac commit lay ten CU lam dieu kien bao ve, cach nhau bang dau phay")
    a = ap.parse_args()

    moi = ten_trong(io.open(os.path.join(ROOT, CHINH), encoding="utf-8").read())
    cu = {}
    for rev in a.tu.split(","):
        out = subprocess.run(["git", "-C", ROOT, "show", f"{rev.strip()}:{CHINH}"],
                             capture_output=True, text=True)
        if out.returncode:
            continue
        for k, v in ten_trong(out.stdout).items():
            cu.setdefault(k, set()).add(v)

    da_lo = set(re.findall(r"package_id='(\d+)'",
                           io.open(os.path.join(ROOT, DA_LO), encoding="utf-8").read()))

    lenh, bo_nfc = [], 0
    for pid, ten in sorted(moi.items()):
        if pid in da_lo:
            continue
        truoc = {v for v in cu.get(pid, set()) if v != ten}
        # Chi khac dang Unicode -> khong ai nhin thay, bo qua.
        truoc = {v for v in truoc
                 if unicodedata.normalize("NFC", v) != unicodedata.normalize("NFC", ten)}
        bo_nfc += len(cu.get(pid, set())) - len(truoc) - (1 if ten in cu.get(pid, set()) else 0)
        if not truoc:
            continue
        dk = " OR ".join(f"name={q(v)}" for v in sorted(truoc))
        lenh.append(f"UPDATE game_packages SET name={q(ten)} "
                    f"WHERE game_code='haitac' AND package_id='{pid}' AND ({dk});")

    hdr = f"""-- Chuan hoa ten goi theo bang thuat ngu (tools/chuan-hoa-dich.py).
-- SINH TU DONG boi tools/gen-doi-ten-goi.py — dung sua tay, sua nguon roi chay lai.
--
-- Vi sao phai co file rieng: `game_packages.haitac.sql` chi ghi de cot `name` khi ten dang
-- luu CON CHU HAN. {len(lenh)} goi duoi day da mang ten tieng Viet nen upsert kia khong bao
-- gio cham toi, trong khi ten van sai o hai kieu:
--   * dich chua chuan: con "anh hung" thay vi "tuong", "500 van KNB" thay vi "5M KNB",
--     trat tu kieu Trung "tinh anh goi qua";
--   * goi ten tuong cua BAN GOC: game da bi thay ao (tuong than thoai -> tuong Kim Dung)
--     nhung ten goi dich tu chuoi Han cu, nen dang goi ten tuong khong co trong game
--     ("Hong Quan do cat giu goi qua" trong khi tuong do ten la Ly Mac Sau).
--
-- Dieu kien `AND (name=<ten cu>...)` liet ke cac ten tung duoc sinh ra truoc day. Nguoi van
-- hanh da tu dat ten khac -> khong khop -> giu nguyen. Chay lai vo hai.
SET NAMES utf8mb4;
"""
    io.open(RA, "w", encoding="utf-8").write(hdr + "\n" + "\n".join(lenh) + "\n")
    print(f"da sinh {len(lenh)} lenh doi ten -> {os.path.relpath(RA, ROOT)}")
    print(f"(bo qua {len(da_lo)} goi da co trong doi-ten.sql, va cac truong hop chi khac dang Unicode)")


if __name__ == "__main__":
    main()
