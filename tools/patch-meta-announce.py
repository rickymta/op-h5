#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Doi thong bao mac dinh cua meta server tu tieng Trung sang tieng Viet.

VAN DE
------
`tcg/meta/service/AnnounceService` hoi Console lay danh sach thong bao GM. Khi danh
sach RONG — tuc la moi ban trien khai chua tung dang thong bao nao — no dung mot ban
ghi mac dinh voi hai chuoi nam ngay trong bytecode:

    setTitle("默认公告")
    setContent("今日暂无公告，祝大家玩得愉快")

Client hien nguyen van hai chuoi do trong dialog "Thong bao", ngay man hinh dau tien.
Tren mot ban da Viet hoa, nguoi choi Viet Nam nhin thay tieng Trung.

Khong sua duoc bang cau hinh: `meta/store/` chi giu `meta.conf.json` (phien ban client),
va hai chuoi tren la hang so trong class chu khong doc tu file hay DB nao.

CACH LAM
--------
Thay CONSTANT_Utf8 trong constant pool, dung ky thuat da dung cho 969 hang so ten file
Excel (xem CLAUDE.md muc 14): moi tham chieu trong class file deu di qua *chi so* cua
constant pool chu khong phai byte offset, nen doi do dai mot chuoi khong lam hong code
offset, StackMapTable hay LineNumberTable.

Class nam thang trong `BOOT-INF/classes/`, khong phai nested jar, nen khong co rang buoc
STORED nhu ben excel — nhung van giu nguyen compress_type cua moi entry cho chac.

DUNG
----
    python tools/patch-meta-announce.py            # xem se doi gi, khong ghi
    python tools/patch-meta-announce.py --apply    # ghi (tu backup .bak lan dau)
    python tools/patch-meta-announce.py --verify   # kiem tra jar hien tai
    python tools/patch-meta-announce.py --revert   # tra ve tieng Trung tu .bak

Sau khi va: khoi dong lai meta va kiem tra
    curl -s 'http://127.0.0.1:12345/announce/one?platformCode=yezixi&gameId=10091'

LUU Y: day chi la ban du phong khi CHUA co thong bao nao. Duong chinh thuc van la dang
thong bao qua Console `/gm/announce/*`; khi co thong bao that thi mac dinh nay khong
duoc dung toi.
"""

import argparse
import glob
import io
import os
import shutil
import struct
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JAR_GLOB = os.path.join(ROOT, 'server', 'meta', 'tcg-meta-*.jar')
ENTRY = 'BOOT-INF/classes/tcg/meta/service/AnnounceService.class'

# Giu nguyen tinh than ban goc: mot dong tieu de, mot dong noi dung trung tinh.
MAPPING = {
    '默认公告'.encode('utf-8'): 'Thông báo'.encode('utf-8'),
    '今日暂无公告，祝大家玩得愉快'.encode('utf-8'):
        'Hôm nay chưa có thông báo mới. Chúc bạn chơi game vui vẻ!'.encode('utf-8'),
}
REVERSE = {v: k for k, v in MAPPING.items()}

CAFEBABE = b'\xca\xfe\xba\xbe'


def cp_entries(data):
    """Duyet constant pool -> (entries, offset ket thuc).

    entries: (tag, start, end, payload). payload chi khac None voi CONSTANT_Utf8.
    """
    if data[:4] != CAFEBABE:
        raise ValueError('khong phai class file')
    count = struct.unpack_from('>H', data, 8)[0]
    p, out, i = 10, [], 1
    while i < count:
        start = p
        tag = data[p]
        p += 1
        payload = None
        if tag == 1:
            ln = struct.unpack_from('>H', data, p)[0]
            p += 2
            payload = data[p:p + ln]
            p += ln
        elif tag in (7, 8, 16, 19, 20):
            p += 2
        elif tag in (3, 4, 9, 10, 11, 12, 17, 18):
            p += 4
        elif tag in (5, 6):
            p += 8
            i += 1
        elif tag == 15:
            p += 3
        else:
            raise ValueError('constant pool tag la %d @ %d' % (tag, start))
        out.append((tag, start, p, payload))
        i += 1
    return out, p


def patch_class(data, mapping):
    """-> (bytes moi hoac None, so hang so da thay)."""
    entries, cp_end = cp_entries(data)
    hits = [e for e in entries if e[0] == 1 and e[3] in mapping]
    if not hits:
        return None, 0
    out = bytearray(data[:10])
    for (tag, s, e, payload) in entries:
        if tag == 1 and payload in mapping:
            new = mapping[payload]
            out += b'\x01' + struct.pack('>H', len(new)) + new
        else:
            out += data[s:e]
    out += data[cp_end:]
    return bytes(out), len(hits)


def find_jar():
    hits = sorted(glob.glob(JAR_GLOB))
    if not hits:
        sys.exit('khong tim thay %s' % os.path.relpath(JAR_GLOB, ROOT))
    return hits[0]


def read_entry(jar):
    with zipfile.ZipFile(jar) as z:
        if ENTRY not in z.namelist():
            sys.exit('jar khong co %s' % ENTRY)
        return z.read(ENTRY)


def rewrite_jar(jar, new_class):
    """Ghi lai jar voi mot entry da doi, giu nguyen metadata cua moi entry."""
    with zipfile.ZipFile(jar) as zin:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w') as zout:
            for info in zin.infolist():
                data = new_class if info.filename == ENTRY else zin.read(info.filename)
                ni = zipfile.ZipInfo(info.filename, date_time=info.date_time)
                ni.compress_type = info.compress_type
                ni.external_attr = info.external_attr
                ni.internal_attr = info.internal_attr
                ni.create_system = info.create_system
                zout.writestr(ni, data)
    return buf.getvalue()


def show(label, mapping, data):
    entries, _ = cp_entries(data)
    found = [e[3] for e in entries if e[0] == 1 and e[3] in mapping]
    print('  %s: %d/%d hang so khop' % (label, len(found), len(mapping)))
    for k in mapping:
        mark = 'co' if k in found else '  '
        print('   [%s] %s -> %s' % (mark, k.decode('utf-8'), mapping[k].decode('utf-8')))
    return len(found)


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--apply', action='store_true', help='ghi thay doi vao jar')
    g.add_argument('--verify', action='store_true', help='chi kiem tra jar hien tai')
    g.add_argument('--revert', action='store_true', help='tra ve tieng Trung')
    a = ap.parse_args()

    jar = find_jar()
    bak = jar + '.bak'
    print('jar: %s' % os.path.relpath(jar, ROOT))

    if a.revert:
        if not os.path.exists(bak):
            sys.exit('khong co %s de khoi phuc' % os.path.relpath(bak, ROOT))
        shutil.copy2(bak, jar)
        print('  da khoi phuc tu .bak')
        return 0

    data = read_entry(jar)
    mapping = REVERSE if a.verify else MAPPING

    if a.verify:
        n = show('tieng Viet', REVERSE, data)
        print('  -> %s' % ('da va' if n == len(REVERSE) else 'CHUA va (hoac va mot phan)'))
        return 0 if n == len(REVERSE) else 1

    n = show('can thay', MAPPING, data)
    if n == 0:
        print('  -> khong co gi de doi (co the da va roi)')
        return 0
    if not a.apply:
        print('  -> chay lai voi --apply de ghi')
        return 0

    new_class, changed = patch_class(data, MAPPING)
    if new_class is None:
        print('  -> khong doi gi')
        return 0
    # Kiem tra lai truoc khi ghi: constant pool phai van duyet duoc.
    cp_entries(new_class)

    if not os.path.exists(bak):
        shutil.copy2(jar, bak)
        print('  da tao backup: %s' % os.path.relpath(bak, ROOT))
    blob = rewrite_jar(jar, new_class)
    with open(jar, 'wb') as f:
        f.write(blob)
    print('  da thay %d hang so, ghi lai jar (%d byte)' % (changed, len(blob)))

    with zipfile.ZipFile(jar) as z:
        bad = z.testzip()
        if bad:
            sys.exit('jar hong o entry: %s' % bad)
        print('  kiem tra CRC toan bo jar: dat (%d entry)' % len(z.namelist()))
    return 0


if __name__ == '__main__':
    sys.exit(main())
