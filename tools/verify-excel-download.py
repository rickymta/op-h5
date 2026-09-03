#!/usr/bin/env python3
"""
Doi chieu bo Excel tai tu server (thu muc staging) voi ban local
server/excel/release/.

Dung sau khi:
  - tren server:  cd /tmp/excel-staging && md5sum *.xlsx *.xlsm > _md5-server.txt
  - WinSCP keo /tmp/excel-staging ve may

Cach dung:
  python tools/verify-excel-download.py <thu-muc-da-tai-ve>

Bao cao 4 nhom:
  KHOP        : MD5 server == MD5 local        -> ban local nguyen ven
  KHAC        : ca hai deu co nhung noi dung khac -> server da sua sau khi snapshot
  CHI-SERVER  : co tren server, local khong co
  CHI-LOCAL   : local co, server khong co (file thieu tren server)

Ngoai ra so sanh MD5 cua file THUC TE trong thu muc tai ve voi _md5-server.txt
de phat hien file bi hong trong luc truyen.
"""
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LOCAL = os.path.join(os.path.dirname(HERE), 'server', 'excel', 'release')


def md5(path):
    h = hashlib.md5()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def read_manifest(path):
    out = {}
    with open(path, encoding='utf-8', errors='replace') as fh:
        for line in fh:
            line = line.rstrip('\n')
            if len(line) < 34:
                continue
            digest = line[:32].lower()
            name = line[32:].lstrip(' *')
            out[name] = digest
    return out


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    dl = sys.argv[1]
    if not os.path.isdir(dl):
        print('Khong thay thu muc: %s' % dl)
        return 1
    if not os.path.isdir(LOCAL):
        print('Khong thay thu muc local: %s' % LOCAL)
        return 1

    man_path = os.path.join(dl, '_md5-server.txt')
    manifest = read_manifest(man_path) if os.path.exists(man_path) else None

    dl_files = {f for f in os.listdir(dl) if f.lower().endswith(('.xlsx', '.xlsm'))}
    local_files = {f for f in os.listdir(LOCAL)
                   if f.lower().endswith(('.xlsx', '.xlsm')) and '%3F' not in f
                   and not any(ord(c) > 127 for c in f)}

    print('Thu muc tai ve : %s  (%d file excel)' % (dl, len(dl_files)))
    print('Local          : %s  (%d file ten tieng Anh)' % (LOCAL, len(local_files)))
    print('Manifest server: %s' % ('%d dong' % len(manifest) if manifest else 'KHONG CO _md5-server.txt'))
    print()

    # 1) file tai ve co bi hong trong luc truyen khong?
    if manifest:
        bad = []
        for f in sorted(dl_files):
            if f in manifest and md5(os.path.join(dl, f)) != manifest[f]:
                bad.append(f)
        if bad:
            print('!! %d FILE HONG TRONG LUC TRUYEN (MD5 khac _md5-server.txt):' % len(bad))
            for f in bad:
                print('     ', f)
            print()
        else:
            print('Truyen tai: %d/%d file khop _md5-server.txt -> khong hong.' % (len(dl_files), len(dl_files)))
            print()

    # 2) so voi local
    khop, khac = [], []
    for f in sorted(dl_files & local_files):
        if md5(os.path.join(dl, f)) == md5(os.path.join(LOCAL, f)):
            khop.append(f)
        else:
            khac.append(f)
    chi_server = sorted(dl_files - local_files)
    chi_local = sorted(local_files - dl_files)

    print('KHOP (server == local)       : %d' % len(khop))
    print('KHAC (noi dung khac nhau)    : %d' % len(khac))
    print('CHI-SERVER (local khong co)  : %d' % len(chi_server))
    print('CHI-LOCAL  (server khong co) : %d' % len(chi_local))

    for title, items in (('KHAC', khac), ('CHI-SERVER', chi_server), ('CHI-LOCAL', chi_local)):
        if items:
            print()
            print('--- %s ---' % title)
            for f in items[:15]:
                print('   ', f)
            if len(items) > 15:
                print('    ... va %d file nua' % (len(items) - 15))

    print()
    if not khac and not chi_server and not (manifest and bad):
        print('KET LUAN: ban local nguyen ven, khop server 100%.')
    elif khac:
        print('KET LUAN: %d file tren server KHAC ban local -> server da duoc sua sau snapshot.'
              ' Xem xet ghi de local bang ban server.' % len(khac))
    return 0


if __name__ == '__main__':
    sys.exit(main())
