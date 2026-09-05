#!/usr/bin/env python3
"""Doc log cua cum game va in ra ban tieng Anh.

    docker exec docker-game-1 tail -f .logs/game-s1/info.log | python3 tools/log-en.py
    python3 tools/log-en.py duong/dan/toi/info.log
    ./docker/logs-en.sh game -f            # tien hon, xem file do

VI SAO DICH LUC DOC chu khong va vao JAR
----------------------------------------
Do tren cum dang chay: 18.911 chuoi tieng Trung nam trong constant pool cua 106 JAR,
nhung chi 219 trong so do thuc su xuat hien trong log. Va trong 219 do co ca ten LOP
Java lan ten SHEET/COT Excel — server tra cuu cau hinh THEO TEN nen doi mot chuoi la
hong nap cau hinh, kieu hong im lang rat kho lan (CLAUDE.md muc 13).

Neu chi va nhung chuoi chac chan an toan thi log sach duoc 35-37%% so dong; phan con
lai la cac tu hai chu (完成, 请求, 成功...) vua la log vua la ten cot. Dich luc doc thi
che phu 100%%, khong rui ro, giu nguyen file goc de con doi chieu khi tra su co, va
khong mat khi nha phat hanh giao JAR moi (bo va bytecode thi mat sach — muc 14.1).

FILE GOC KHONG BI SUA. Cong cu nay chi doi luong ra.
"""
import json
import os
import re
import sys

CJK = re.compile(r'[一-鿿]')
HERE = os.path.dirname(os.path.abspath(__file__))


def nap_tu_dien(duong=None):
    """Tra ve danh sach (trung, anh) da sap xep DAI TRUOC.

    Dai truoc la bat buoc: '国战5分钟奖励结算begin' phai duoc thay tron ven, neu de
    '国战' thay truoc thi phan con lai thanh mot cau nua Trung nua Anh khong doc noi.
    """
    duong = duong or os.path.join(HERE, 'cn-en.json')
    with open(duong, encoding='utf-8') as f:
        d = json.load(f)
    cum = d['cum']
    return sorted(cum.items(), key=lambda kv: -len(kv[0]))


# Che bi mat truoc khi in ra. Console in thang mat khau MySQL/Mongo vao info.log
# (`password='...'`), ma log thi hay duoc copy vao bao cao hoac dan cho nguoi khac xem.
BIMAT = re.compile(r"""(?ix)
    \b (password | pwd | passwd | secret | token | api[_-]?key)
    \s* (['"]?) \s* [=:] \s* (['"]?)
    ([^\s'",)&]+)
    (['"]?)
""")


def che_bi_mat(dong):
    return BIMAT.sub(lambda m: '%s%s=%s***%s' % (m.group(1), m.group(2), m.group(3), m.group(5) or m.group(3)), dong)


def dich(dong, bang):
    """Thay tung cum, DAI TRUOC.

    Tu dong them dau cach khi hai ben la chu/so: tieng Trung khong co dau cach nen
    ghep thang se ra "querytook10ms" thay vi "query took 10ms".
    """
    for tr, en in bang:
        if tr not in dong:
            continue
        ra = []
        i = 0
        while True:
            j = dong.find(tr, i)
            if j < 0:
                ra.append(dong[i:])
                break
            truoc = dong[j - 1] if j > 0 else ''
            k = j + len(tr)
            sau = dong[k] if k < len(dong) else ''
            dau = ' ' if (truoc.isalnum() and en[:1].isalnum()) else ''
            cuoi = ' ' if (sau.isalnum() and en[-1:].isalnum()) else ''
            ra.append(dong[i:j])
            ra.append(dau + en + cuoi)
            i = k
        dong = ''.join(ra)
    return dong


def main():
    tham_so = [a for a in sys.argv[1:] if not a.startswith('-')]
    chi_con_lai = '--con-lai' in sys.argv     # in cac cum CHUA co trong tu dien
    bang = nap_tu_dien()

    if chi_con_lai:
        con = {}
        nguon = open(tham_so[0], encoding='utf-8', errors='replace') if tham_so else sys.stdin
        for dong in nguon:
            for m in CJK.findall(dich(dong, bang)):
                con[m] = con.get(m, 0) + 1
        if not con:
            print('Khong con cum tieng Trung nao ngoai tu dien.')
            return 0
        print('Cac ky tu tieng Trung CHUA dich duoc (them vao tools/cn-en.json):')
        for t, c in sorted(con.items(), key=lambda kv: -kv[1]):
            print('  %5d  %s' % (c, t))
        return 0

    nguon = open(tham_so[0], encoding='utf-8', errors='replace') if tham_so else sys.stdin
    try:
        for dong in nguon:
            sys.stdout.write(che_bi_mat(dich(dong, bang)))
            sys.stdout.flush()          # de `tail -f` hien ra ngay
    except BrokenPipeError:
        pass                            # bi `head`/`less` dong som — binh thuong
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main())
