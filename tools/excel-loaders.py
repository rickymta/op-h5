#!/usr/bin/env python3
"""Lap bang: file Excel (ten tieng Anh) -> lop loader (EExcel) trong tcg-game.jar.

Quet constant pool cua tung class trong server/game/tcg-game.jar: class nao co
CONSTANT_Utf8 dung bang mot ten file trong tools/excel-name-map.json, va co superclass
la mot lop EExcel (truc tiep hay qua trung gian trong cung jar), thi la loader cua file do.

Ket qua: docs/excel-loaders.json  { "hero.xlsx": ["com.ososx.tcg.game....HeroExcel"], ... }
Dung cho tools/ExcelProbe (kiem chung file cau hinh bang parser that) va tools/json-to-excel.py --probe.

  python tools/excel-loaders.py            # ghi docs/excel-loaders.json, in thong ke
"""
import io
import json
import os
import struct
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JAR = os.path.join(ROOT, 'server', 'game', 'tcg-game.jar')
LIB_JARS = os.path.join(ROOT, 'server', 'game', 'lib', 'tcg-*.jar')   # tcg-common: PayItemExcel, LangExcel...
MAP = os.path.join(ROOT, 'tools', 'excel-name-map.json')
OUT = os.path.join(ROOT, 'docs', 'excel-loaders.json')
EEXCEL = 'com/ososx/tcg/game/config/EExcel'


def parse_class(data):
    """Tra ve (this_name, super_name, set(utf8)) hoac None neu khong phai class file."""
    if data[:4] != b'\xca\xfe\xba\xbe':
        return None
    n = struct.unpack('>H', data[8:10])[0]
    pos = 10
    pool = [None] * n
    i = 1
    while i < n:
        tag = data[pos]
        if tag == 1:
            ln = struct.unpack('>H', data[pos + 1:pos + 3])[0]
            raw = data[pos + 3:pos + 3 + ln]
            try:
                pool[i] = ('u', raw.decode('utf-8'))
            except UnicodeDecodeError:
                pool[i] = ('u', raw.decode('utf-8', 'replace'))
            pos += 3 + ln
        elif tag in (3, 4):
            pos += 5
        elif tag in (5, 6):
            pos += 9
            i += 1
        elif tag in (7, 8, 16, 19, 20):
            pool[i] = (tag, struct.unpack('>H', data[pos + 1:pos + 3])[0])
            pos += 3
        elif tag in (9, 10, 11, 12, 17, 18):
            pos += 5
        elif tag == 15:
            pos += 4
        else:
            return None
        i += 1
    this_i, super_i = struct.unpack('>HH', data[pos + 2:pos + 6])

    def cls(idx):
        e = pool[idx] if idx < n else None
        if e and e[0] == 7:
            u = pool[e[1]]
            return u[1] if u and u[0] == 'u' else None
        return None

    utf8 = {e[1] for e in pool if e and e[0] == 'u'}
    return cls(this_i), cls(super_i), utf8


def main():
    m = json.load(io.open(MAP, encoding='utf-8'))['map']   # {ten Trung: ten Anh}
    names = {v for v in m.values() if isinstance(v, str) and v.endswith('.xlsx')}
    supers = {}
    hits = {}
    import glob
    for jar in [JAR] + sorted(glob.glob(LIB_JARS)):
        with zipfile.ZipFile(jar) as z:
            for info in z.infolist():
                if not info.filename.endswith('.class'):
                    continue
                r = parse_class(z.read(info))
                if not r:
                    continue
                this, sup, utf8 = r
                supers.setdefault(this, sup)
                for nm in utf8 & names:
                    hits.setdefault(nm, set()).add(this)

    def is_eexcel(c, depth=0):
        while c and depth < 12:
            if c == EEXCEL:
                return True
            c = supers.get(c)
            depth += 1
        return False

    out = {}
    for nm in sorted(names):
        loaders = sorted(c.replace('/', '.') for c in hits.get(nm, ()) if is_eexcel(c))
        out[nm] = loaders
    with io.open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write('\n')
    have = sum(1 for v in out.values() if v)
    multi = [k for k, v in out.items() if len(v) > 1]
    none = [k for k, v in out.items() if not v]
    print(f'{len(out)} ten file trong map: {have} co loader EExcel, {len(none)} khong tim thay, {len(multi)} co >1 loader')
    if none:
        print('  khong thay loader:', ', '.join(none[:20]))
    if multi:
        print('  nhieu loader:', ', '.join(f'{k}({len(out[k])})' for k in multi[:20]))
    print('da ghi', os.path.relpath(OUT, ROOT))


if __name__ == '__main__':
    sys.exit(main())
