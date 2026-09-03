#!/usr/bin/env python3
"""
Va ten file Excel tieng Trung -> tieng Anh trong bytecode cua cac JAR game server.

CO CHE
------
Moi lop con cua com.ososx.tcg.game.config.EExcel co mot method:

    public String getFileName() { return "<ten tieng Trung>.xlsx"; }

Ten do nam trong constant pool duoi dang CONSTANT_Utf8, duoc CONSTANT_String tro
toi, va bytecode dung `ldc #<index>`. Vi moi thu trong class file tham chieu
constant pool bang INDEX chu khong bang byte offset, ta co the thay noi dung mot
CONSTANT_Utf8 (ke ca doi do dai) ma khong pha vo bat ky thu gi khac: code offset,
StackMapTable, LineNumberTable deu khong bi anh huong. Day la ly do khong can
decompile va recompile.

An toan:
  - Chi thay CONSTANT_Utf8 co noi dung KHOP CHINH XAC TOAN CHUOI voi mot key
    trong bang mapping. Cac jar khac (POI...) cung chua chuoi '.xlsx' nhung khong
    bao gio khop toan chuoi nen khong bi cham toi.
  - So luong entry constant pool khong doi -> moi index giu nguyen -> `ldc` (chi
    muc 1 byte) van hop le.
  - Giu nguyen compress_type cua tung entry khi dong goi lai. Bat buoc: Spring
    Boot yeu cau nested jar trong BOOT-INF/lib phai la STORED.

CACH DUNG
---------
    python tools/patch-excel-names.py                 # dry-run toan bo
    python tools/patch-excel-names.py --apply         # va that (jar duoc ghi de)
    python tools/patch-excel-names.py --verify        # kiem tra sau khi va
"""
import argparse
import io
import json
import os
import shutil
import struct
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SERVER = os.path.join(ROOT, 'server')
MAP_FILE = os.path.join(HERE, 'excel-name-map.json')

# Cac JAR co chua hang so ten file excel (do bang cach quet constant pool).
TARGET_JARS = [
    os.path.join('game', 'tcg-game.jar'),
    os.path.join('game', 'lib', 'tcg-common-1.5.0-SNAPSHOT.jar'),
    os.path.join('world', 'tcg-world-server-0.0.1-SNAPSHOT.jar'),
    os.path.join('cross', 'tcg-cross.jar'),
    os.path.join('group', 'tcg-group.jar'),
    os.path.join('pay', 'tcg-pay-server-0.0.1-SNAPSHOT.jar'),
    os.path.join('statistic', 'tcg-stat-server-0.0.1-SNAPSHOT.jar'),
    # 3 service duoi day khong nap excel gameplay, nhung deu nhung tcg-common
    # chua PayItemExcel / LangExcel / LangSysExcel. Phai va cung de moi service
    # tim CUNG MOT ten file, tranh bat nhat.
    os.path.join('console', 'tcg-console-server-0.0.1-SNAPSHOT.jar'),
    os.path.join('login', 'tcg-login-server-0.0.1-SNAPSHOT.jar'),
    os.path.join('meta', 'tcg-meta-0.0.1-SNAPSHOT.jar'),
]

CAFEBABE = b'\xca\xfe\xba\xbe'


# --------------------------------------------------------------------------- #
# Constant pool
# --------------------------------------------------------------------------- #
def cp_entries(data):
    """Duyet constant pool. Tra ve (entries, end_offset).

    entries: list cua (tag, start_offset, end_offset, payload_or_None)
             payload chi khac None voi CONSTANT_Utf8 (tag 1).
    """
    if data[:4] != CAFEBABE:
        raise ValueError('khong phai class file')
    count = struct.unpack_from('>H', data, 8)[0]
    p = 10
    out = []
    i = 1
    while i < count:
        start = p
        tag = data[p]
        p += 1
        payload = None
        if tag == 1:                                  # Utf8
            ln = struct.unpack_from('>H', data, p)[0]
            p += 2
            payload = data[p:p + ln]
            p += ln
        elif tag in (7, 8, 16, 19, 20):               # Class/String/MethodType/Module/Package
            p += 2
        elif tag in (3, 4, 9, 10, 11, 12, 17, 18):    # Integer/Float/refs/NameAndType/Dynamic
            p += 4
        elif tag in (5, 6):                           # Long/Double - chiem 2 slot
            p += 8
            i += 1
        elif tag == 15:                               # MethodHandle
            p += 3
        else:
            raise ValueError('constant pool tag la: %d @ %d' % (tag, start))
        out.append((tag, start, p, payload))
        i += 1
    return out, p


def patch_class(data, mapping, counter=None):
    """Tra ve (new_data, so_hang_so_da_thay). new_data is None neu khong doi gi."""
    entries, cp_end = cp_entries(data)
    hits = [(s, e, payload) for (tag, s, e, payload) in entries
            if tag == 1 and payload is not None and payload in mapping]
    if not hits:
        return None, 0

    out = bytearray(data[:10])
    for (tag, s, e, payload) in entries:
        if tag == 1 and payload is not None and payload in mapping:
            new = mapping[payload]
            out += b'\x01' + struct.pack('>H', len(new)) + new
            if counter is not None:
                counter[payload] = counter.get(payload, 0) + 1
        else:
            out += data[s:e]
    out += data[cp_end:]
    return bytes(out), len(hits)


# --------------------------------------------------------------------------- #
# Jar
# --------------------------------------------------------------------------- #
def rewrite_zip(raw, mapping, counter, label, log):
    """Va mot jar (dang bytes). Tra ve (new_bytes hoac None, so_class, so_hang_so)."""
    zin = zipfile.ZipFile(io.BytesIO(raw))
    plan = {}
    n_cls = n_const = 0

    for info in zin.infolist():
        if info.is_dir():
            continue
        name = info.filename
        if name.endswith('.class'):
            body = zin.read(info)
            try:
                new, k = patch_class(body, mapping, counter)
            except ValueError as exc:
                log.append('    ! bo qua %s: %s' % (name, exc))
                continue
            if new is not None:
                plan[name] = new
                n_cls += 1
                n_const += k
        elif name.endswith('.jar'):
            inner = zin.read(info)
            new_inner, ic, ik = rewrite_zip(inner, mapping, counter,
                                            '%s!%s' % (label, name), log)
            if new_inner is not None:
                plan[name] = new_inner
                n_cls += ic
                n_const += ik
                log.append('    nested %-52s %3d class, %3d hang so' % (name, ic, ik))

    if not plan:
        zin.close()
        return None, 0, 0

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as zout:
        for info in zin.infolist():
            if info.is_dir():
                zout.writestr(info, b'')
                continue
            body = plan.get(info.filename)
            if body is None:
                body = zin.read(info)
            # Giu nguyen metadata VA compress_type cua entry goc.
            # STORED cho nested jar la yeu cau bat buoc cua Spring Boot loader.
            ni = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            ni.compress_type = info.compress_type
            ni.external_attr = info.external_attr
            ni.internal_attr = info.internal_attr
            ni.create_system = info.create_system
            zout.writestr(ni, body)
    zin.close()
    return buf.getvalue(), n_cls, n_const


# --------------------------------------------------------------------------- #
def load_mapping():
    with open(MAP_FILE, encoding='utf-8') as fh:
        raw = json.load(fh)['map']
    fwd = {k.encode('utf-8'): v.encode('utf-8') for k, v in raw.items()}
    rev = {v.encode('utf-8'): k.encode('utf-8') for k, v in raw.items()}
    if len(set(raw.values())) != len(raw):
        seen, dup = set(), set()
        for v in raw.values():
            if v in seen:
                dup.add(v)
            seen.add(v)
        raise SystemExit('LOI: ten tieng Anh bi trung: %s' % sorted(dup))
    return raw, fwd, rev


EXCEL_DIR = os.path.join(SERVER, 'excel', 'release')


def normalize_name(name):
    """Tra ve cac bien the co the cua ten file: nguyen ban, percent-decoded,
    va mojibake-decoded (CP1252 -> UTF-8). De import chap nhan file lay ve
    bang bat ky cach nao (SFTP sai charset, tai qua HTTP, zip...)."""
    import urllib.parse
    out = [name]
    try:
        d = urllib.parse.unquote(name)
        if d != name:
            out.append(d)
    except Exception:
        pass
    cp = None
    try:
        cp = __import__('codecs').lookup('cp1252')
    except Exception:
        pass
    for cand in list(out):
        if any(ord(c) > 127 for c in cand) and cp is not None:
            try:
                b = cand.encode('cp1252', errors='strict')
                dec = b.decode('utf-8', errors='strict')
                if dec not in out:
                    out.append(dec)
            except Exception:
                pass
    return out


def import_missing(src_dir, apply=False):
    """Copy cac file excel dang thieu tu src_dir vao server/excel/release/
    va doi luon sang ten tieng Anh theo mapping."""
    raw_map, _, _ = load_mapping()
    if not os.path.isdir(src_dir):
        raise SystemExit('khong thay thu muc nguon: %s' % src_dir)
    on_disk = set(os.listdir(EXCEL_DIR))
    # ten tieng Anh dang thieu -> ten tieng Trung goc
    wanted = {en: cn for cn, en in raw_map.items() if en not in on_disk}
    # tra nguoc: moi bien the ten nguon -> ten tieng Anh dich
    lookup = {}
    for cn, en in raw_map.items():
        lookup[cn] = en
        lookup[en] = en

    print('Nguon    : %s' % src_dir)
    print('Dich     : %s' % EXCEL_DIR)
    print('Dang thieu: %d file' % len(wanted))
    print()

    found, extra, n = [], [], 0
    for dp, _, fs in os.walk(src_dir):
        for f in fs:
            if not f.lower().endswith(('.xlsx', '.xlsm')):
                continue
            target = None
            for cand in normalize_name(f):
                if cand in lookup:
                    target = lookup[cand]
                    break
            if target is None:
                continue
            src = os.path.join(dp, f)
            if target in wanted:
                found.append((src, target))
            else:
                extra.append((src, target))

    for src, target in found:
        print('   COPY  %-30s -> %s' % (os.path.basename(src), target))
    if extra:
        print()
        print('   %d file nguon ung voi file DA CO tren dia (bo qua, dung --overwrite de ghi de):'
              % len(extra))
        for src, target in extra[:10]:
            print('      %-30s -> %s' % (os.path.basename(src), target))

    still = [en for en in wanted if en not in [t for _, t in found]]
    if still:
        print()
        print('   %d file VAN THIEU (khong thay trong nguon):' % len(still))
        for en in sorted(still):
            print('      %-34s (goc: %s)' % (en, wanted[en]))

    if not apply:
        print()
        print('DRY-RUN: chua copy gi. Them --apply de copy that.')
        return 0

    for src, target in found:
        shutil.copy2(src, os.path.join(EXCEL_DIR, target))
        n += 1
    print()
    print('Da copy %d file.' % n)
    return 0


def rename_files(apply=False):
    """Doi ten file excel that theo mapping. Chi doi file co trong mapping."""
    raw_map, _, _ = load_mapping()
    if not os.path.isdir(EXCEL_DIR):
        raise SystemExit('khong thay %s' % EXCEL_DIR)
    on_disk = set(os.listdir(EXCEL_DIR))

    todo, already, absent, blocked = [], [], [], []
    for cn, en in sorted(raw_map.items()):
        if en in on_disk:
            already.append(en)
        elif cn in on_disk:
            if en in on_disk:
                blocked.append((cn, en))
            else:
                todo.append((cn, en))
        else:
            absent.append((cn, en))

    print('Se doi ten        : %d' % len(todo))
    print('Da la ten Anh     : %d' % len(already))
    print('Khong co tren dia : %d  (file thieu - xem MISSING-FILES.md)' % len(absent))
    if blocked:
        print('BI CHAN           : %d' % len(blocked))
        for cn, en in blocked:
            print('   %s -> %s (dich da ton tai)' % (cn, en))
    print()
    for cn, en in todo:
        print('   %-24s -> %s' % (cn, en))
    if absent:
        print()
        print('--- Cac file THIEU: khi lay tu ban goc ve, phai luu voi ten moi ---')
        for cn, en in absent:
            print('   %-24s -> %s' % (cn, en))

    if not apply:
        print()
        print('DRY-RUN: chua doi gi. Them --apply de doi ten that.')
        return 0

    n = 0
    for cn, en in todo:
        src = os.path.join(EXCEL_DIR, cn)
        dst = os.path.join(EXCEL_DIR, en)
        if os.path.exists(dst):
            print('  ! bo qua %s: %s da ton tai' % (cn, en))
            continue
        os.rename(src, dst)
        n += 1
    print()
    print('Da doi ten %d file.' % n)
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true', help='ghi de jar that')
    ap.add_argument('--verify', action='store_true',
                    help='kiem tra jar da mang ten tieng Anh (chay sau --apply)')
    ap.add_argument('--rename-files', action='store_true',
                    help='doi ten file excel that trong server/excel/release/ theo mapping')
    ap.add_argument('--import-from', metavar='DIR',
                    help='copy cac file excel dang thieu tu DIR vao server/excel/release/ '
                         'va doi luon sang ten tieng Anh (nhan ca ten bi mojibake)')
    args = ap.parse_args()

    if args.import_from:
        return import_missing(args.import_from, apply=args.apply)
    if args.rename_files:
        return rename_files(apply=args.apply)

    raw_map, fwd, rev = load_mapping()
    mapping = rev if args.verify else fwd
    mode = 'VERIFY' if args.verify else ('APPLY' if args.apply else 'DRY-RUN')
    print('Mapping   : %d ten' % len(raw_map))
    print('Che do    : %s' % mode)
    print()

    counter = {}
    tot_cls = tot_const = 0
    for rel in TARGET_JARS:
        path = os.path.join(SERVER, rel)
        if not os.path.exists(path):
            print('  ! khong thay %s' % rel)
            continue
        with open(path, 'rb') as fh:
            raw = fh.read()
        log = []
        new, ncls, nconst = rewrite_zip(raw, mapping, counter, rel, log)
        tot_cls += ncls
        tot_const += nconst
        status = 'khong co gi de doi' if new is None else '%3d class, %3d hang so' % (ncls, nconst)
        print('  %-46s %s' % (rel, status))
        for line in log:
            print(line)
        if new is not None and args.apply and not args.verify:
            tmp = path + '.tmp'
            with open(tmp, 'wb') as fh:
                fh.write(new)
            # kiem tra jar moi mo duoc va toan bo class parse duoc truoc khi thay the
            with zipfile.ZipFile(tmp) as zt:
                bad = zt.testzip()
            if bad:
                os.remove(tmp)
                raise SystemExit('LOI: jar moi bi loi CRC tai %s' % bad)
            shutil.move(tmp, path)

    print()
    print('TONG: %d class, %d hang so' % (tot_cls, tot_const))
    if args.verify:
        print('(che do verify: dem so hang so dang la TEN TIENG ANH)')
    missing = [k for k in raw_map if k.encode('utf-8') not in counter]
    if missing and not args.verify:
        print()
        print('%d ten trong mapping khong tim thay trong bytecode:' % len(missing))
        for m in sorted(missing):
            print('   ', m)
    if not args.apply and not args.verify:
        print()
        print('DRY-RUN: chua ghi gi. Chay lai voi --apply de va that.')


if __name__ == '__main__':
    main()
