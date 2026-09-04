#!/usr/bin/env python3
"""
Chuyen moi o chuoi dang inlineStr trong file .xlsx thanh shared string (t="s").

TAI SAO CAN
-----------
openpyxl (va mot so tool khac) ghi chuoi dang:
    <c r="C2" t="inlineStr"><is><t>3:100022:1</t></is></c>
Excel va file goc cua game ghi dang:
    <c r="C2" t="s"><v>19</v></c>        (19 = index trong xl/sharedStrings.xml)

POI doc ca hai. Nhung XSSFRowWrap.getString() cua server goi
cell.setCellType(CellType.STRING) truoc khi doc; voi o inlineStr, POI chuyen
kieu sang shared-string trong khi <v> rong -> gia tri MAT -> server nhan "".
Hau qua: moi cot chuoi (phan thuong, thoi gian, cost...) tro thanh rong ma
khong bao loi. Chay script nay cho bat ky file cau hinh nao sinh bang code.

CACH DUNG
    python tools/xlsx-inline-to-shared.py file1.xlsx [file2.xlsx ...]
    (ghi de tai cho; in so o da chuyen)
"""
import io
import re
import sys
import zipfile
from xml.sax.saxutils import escape

INLINE = re.compile(r'<c ([^>]*?)t="inlineStr"([^>]*)><is>(.*?)</is></c>', re.S)
# Chuoi RONG: openpyxl ghi <c r="I22" t="inlineStr"></c> (khong co <is>). Doi thanh o BLANK co mat
# (<c r="I22"/>), dung nhu Excel ghi o co dinh dang nhung trong. Voi XSSFRowWrap cua server, o BLANK
# co mat va o chuoi rong deu tra "" (khac voi o THIEU tra gia tri mac dinh) -> giu duoc hanh vi goc.
INLINE_EMPTY = re.compile(r'<c ([^>]*?)t="inlineStr"([^>]*?)(?:></c>|/>)', re.S)
TEXT = re.compile(r'<t[^>]*>(.*?)</t>', re.S)
UNESC = [('&lt;', '<'), ('&gt;', '>'), ('&quot;', '"'), ('&apos;', "'"), ('&amp;', '&')]


def unescape(s):
    s = re.sub(r'&#(\d+);', lambda m: chr(int(m.group(1))), s)
    s = re.sub(r'&#x([0-9a-fA-F]+);', lambda m: chr(int(m.group(1), 16)), s)
    for a, b in UNESC:
        s = s.replace(a, b)
    return s


def convert(path):
    zin = zipfile.ZipFile(path)
    names = zin.namelist()
    sst = []
    index = {}
    try:
        existing = zin.read('xl/sharedStrings.xml').decode('utf-8')
        for si in re.findall(r'<si>(.*?)</si>', existing, re.S):
            t = unescape(''.join(TEXT.findall(si)))
            index.setdefault(t, len(sst))
            sst.append(t)
    except KeyError:
        pass

    def sidx(t):
        if t not in index:
            index[t] = len(sst)
            sst.append(t)
        return index[t]

    changed = 0
    out = {}
    for n in names:
        data = zin.read(n)
        if n.startswith('xl/worksheets/sheet') and n.endswith('.xml'):
            x = data.decode('utf-8')

            def rep(m):
                nonlocal changed
                t = unescape(''.join(TEXT.findall(m.group(3))))
                changed += 1
                return '<c %st="s"%s><v>%d</v></c>' % (m.group(1), m.group(2), sidx(t))
            x = INLINE.sub(rep, x)

            def rep_empty(m):
                nonlocal changed
                changed += 1
                attrs = (m.group(1) + m.group(2)).strip()
                return '<c %s/>' % attrs if attrs else '<c/>'
            x = INLINE_EMPTY.sub(rep_empty, x)
            data = x.encode('utf-8')
        out[n] = data

    if changed == 0 and 'xl/sharedStrings.xml' in names:
        zin.close()
        return 0

    body = ''.join('<si><t xml:space="preserve">%s</t></si>' % escape(t) for t in sst)
    out['xl/sharedStrings.xml'] = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="%d" uniqueCount="%d">%s</sst>'
        % (len(sst), len(sst), body)).encode('utf-8')

    ct = out['[Content_Types].xml'].decode('utf-8')
    if 'sharedStrings' not in ct:
        ct = ct.replace('</Types>',
                        '<Override PartName="/xl/sharedStrings.xml" '
                        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>')
        out['[Content_Types].xml'] = ct.encode('utf-8')

    rels_name = 'xl/_rels/workbook.xml.rels'
    rels = out[rels_name].decode('utf-8')
    if 'sharedStrings' not in rels:
        ids = [int(i) for i in re.findall(r'Id="rId(\d+)"', rels)]
        rid = max(ids + [0]) + 1
        rels = rels.replace('</Relationships>',
                            '<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>' % rid)
        out[rels_name] = rels.encode('utf-8')

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            zout.writestr(info, out[info.filename])
        if 'xl/sharedStrings.xml' not in names:
            zout.writestr('xl/sharedStrings.xml', out['xl/sharedStrings.xml'])
    zin.close()
    with open(path, 'wb') as fh:
        fh.write(buf.getvalue())
    return changed


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    for p in sys.argv[1:]:
        n = convert(p)
        print('%-40s %d o inlineStr -> shared string' % (p, n))
