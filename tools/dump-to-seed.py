#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
Sinh bo seed MySQL SACH (commit duoc len repo public) tu dump that cua server cu.

  python tools/dump-to-seed.py            # doc  docker/initdb/mysql/{00-tcg,stat,web,cdks}.sql   (gitignored, dump that)
                                          # ghi  docker/initdb/mysql/seed/{00-tcg,stat,web,cdks}.sql (commit)
  python tools/dump-to-seed.py --check    # chi kiem chung seed dang co, khong ghi
  python tools/dump-to-seed.py --dump-dir DIR --out DIR

Nguyen tac (xem CLAUDE.md muc 5 va docs/deploy-runbook.md):
  * Giu NGUYEN schema (DROP/CREATE TABLE) cua MOI bang trong 4 DB. ORM la MyBatis-Plus, khong co
    auto-DDL, nen bang nao thieu thi service do loi khi cham toi. game_sX khong can: tcg-game.jar
    tu tao 4 bang stat_* tu structure.sql.
  * Chi giu DU LIEU cua bang cau hinh (KEEP ben duoi). Tai khoan, lich su thu GM, log thong ke,
    nguoi dung web, the cao, CDK... bo het — server tu ghi khi van hanh.
  * Gia tri nhay cam trong bang giu lai -> placeholder __X__ (docker/initdb/mysql/zz-init.sh dien
    tu bien moi truong luc MySQL khoi tao lan dau) hoac bieu thuc SQL sinh ngau nhien (khoa app).
  * 192.168.1.69 -> __PUBLIC_HOST__ (dia chi client thay). URL noi bo cross/group -> 127.0.0.1:port
    vi moi tien trinh chay tren MOT may voi network host.
  * srv_game_access: tat moi gioi han (platform/channel/gameId/ext) — login chi cho thay may chu
    khi CO dong access khop; Adapter goi /srv/game/list khong kem platformCode nen dong goc
    (platform_limit=1, 'develop') se an sach may chu voi tai khoan cua he thong ID.
  * Sau khi ghi: quet lai output, khong duoc con gia tri nao tu cot da che, tu bang bi bo, hay tu
    _backup-secrets-original/. Co la tool thoat khac 0 va KHONG ghi file.
"""
import argparse, os, re, sys, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUMP_DIR = os.path.join(ROOT, 'docker', 'initdb', 'mysql')
OUT_DIR = os.path.join(DUMP_DIR, 'seed')
FILES = ['00-tcg.sql', 'stat.sql', 'web.sql', 'cdks.sql']      # game_s1.sql: khong can (server tu tao)

OLD_HOST = '192.168.1.69'
RANDKEY = "SUBSTRING(SHA2(CONCAT(RAND(), UUID()), 256), 1, 32)"   # khoa app: moi lan import mot gia tri


def S(v):
    return ('str', v)          # chuoi SQL (noi dung THO, escape kieu mysqldump giu nguyen)


def R(v):
    return ('raw', v)          # bieu thuc SQL / so / NULL, ghi nguyen van


def url_local(row):            # url = http://127.0.0.1:<port>/
    return S('http://127.0.0.1:%s/' % row['port'][1])


def wan_host(row):
    v = row['host_WAN']
    return S('__PUBLIC_HOST__') if v == ('str', OLD_HOST) else v


# db -> bang giu du lieu -> {cot: gia tri moi | callable(row_dict) -> gia tri moi}
KEEP = {
    'tcg': {
        # dinh danh cum server (game/cross/group doc qua console /env/*)
        'srv_game':          {'open_time': R('CURDATE()'), 'create_time': R('NOW()'), 'creator': S('seed'),
                              'editor': R('NULL'), 'edit_time': R('NULL')},
        'srv_group':         {},
        'srv_group_device':  {'url': url_local},
        'srv_cross':         {'url': url_local},
        'cloud_device':      {'host_WAN': wan_host, 'ssh_user': S(''), 'ssh_password': S('')},
        # credential ha tang — game/cross/group KHONG doc env.yml, doc 3 bang nay
        'cloud_mysql':       {'conf_username': S('root'),             'conf_password': S('__MYSQL_ROOT_PASSWORD__')},
        'cloud_mongo':       {'conf_username': S('__MONGO_USER__'),    'conf_password': S('__MONGO_PASSWORD__')},
        'cloud_mq':          {'conf_username': S('__RABBITMQ_USER__'), 'conf_password': S('__RABBITMQ_PASSWORD__')},
        # ung dung / platform
        'app':               {'game_key': R(RANDKEY), 'secret_key': R(RANDKEY)},
        'srv_game_access':   {'mode': R('1'), 'platform_limit': R('0'), 'channel_limit': R('0'),
                              'game_id_limit': R('0'), 'ext_limit': R('0')},
        'dynamic_conf':      {},
        'srv_login':         {'np_host_WAN': S('__PUBLIC_HOST__')},
        # tai khoan console (Adapter phat vat pham, GM tool)
        'staff':             {'password': S('__CONSOLE_ADMIN_PASSWORD__'), 'create_time': R('NOW()')},
        'staff_role': {}, 'staff_role_srv_group': {}, 'staff_role_permission': {}, 'staff_role_game_id': {},
        'staff_app': {}, 'staff_channel': {}, 'staff_platform': {},
    },
    'stat': {},                                                  # statistic tu ghi; srv_game tu dong bo tu tcg
    'web':  {'tichluy': {}, 'timetichluy': {}, 'webshop': {}},   # cau hinh goi/moc cua cong nap
    'cdks': {},
}
# Cot ma gia tri GOC bi coi la bi mat du o bang nao (dung cho kiem chung).
SECRET_COLS = {'password', 'conf_password', 'ssh_password', 'game_key', 'secret_key', 'pin', 'seri', 'cdk', 'uid',
               'open_id', 'open_id_raw', 'token', 'tokenBank', 'email', 'phone', 'ip'}


# ---------------------------------------------------------------- doc dump
def read(p):
    with io.open(p, 'r', encoding='utf-8', newline='') as f:
        return f.read()


def parse_values(s):
    """'(a,b),(c,d);' -> [[('raw','a'),('str','b')], ...]. Chuoi giu NGUYEN escape cua mysqldump."""
    i, n, rows = 0, len(s), []
    while i < n:
        while i < n and s[i] in ' \t\r\n,':
            i += 1
        if i >= n or s[i] == ';':
            break
        if s[i] != '(':
            raise ValueError('mong "(" tai %d: %r' % (i, s[i:i + 30]))
        i += 1
        row = []
        while True:
            while s[i] == ' ':
                i += 1
            if s[i] == "'":
                j = i + 1
                buf = []
                while True:
                    c = s[j]
                    if c == '\\':
                        buf.append(s[j:j + 2])
                        j += 2
                        continue
                    if c == "'":
                        if s[j + 1:j + 2] == "'":
                            buf.append("''")
                            j += 2
                            continue
                        break
                    buf.append(c)
                    j += 1
                row.append(('str', ''.join(buf)))
                i = j + 1
            else:
                j = i
                while s[j] not in ',)':
                    j += 1
                row.append(('raw', s[i:j].strip()))
                i = j
            if s[i] == ',':
                i += 1
                continue
            if s[i] != ')':
                raise ValueError('mong ")" tai %d' % i)
            i += 1
            break
        rows.append(row)
    return rows


def emit_values(rows):
    out = []
    for row in rows:
        out.append('(' + ','.join("'%s'" % v if k == 'str' else v for k, v in row) + ')')
    return ','.join(out)


def table_columns(sql):
    """CREATE TABLE -> {bang: [cot...]}"""
    cols = {}
    for m in re.finditer(r'^CREATE TABLE `([^`]+)` \((.*?)^\) ENGINE', sql, re.S | re.M):
        cols[m.group(1)] = re.findall(r'^\s+`([^`]+)`', m.group(2), re.M)
    return cols


# ---------------------------------------------------------------- bien doi
def note_forbidden(forbidden, db, table, col, raw):
    """Ghi nhan gia tri GOC co the la bi mat: cot trong SECRET_COLS luon bi cam; cot khac chi khi
    trong giong bi mat (dai >= 8, co chu so, khong phai ngay gio / so / json cau hinh)."""
    v = raw
    if len(v) < 5 or v.lower() in ('null', 'none', 'undefined'):
        return
    if col not in SECRET_COLS:
        if len(v) < 8 or not re.search(r'\d', v):
            return
        if re.match(r'^[\d\-: .]+$', v) or v.startswith(('{', '[', '0:', '3:')):
            return
    forbidden.setdefault(v, '%s.%s.%s' % (db, table, col))


def transform(db, sql, stats, forbidden, allowed):
    cols = table_columns(sql)
    keep = KEEP[db]
    lines = sql.split('\n')
    out, i, n = [], 0, len(lines)
    while i < n:
        line = lines[i]
        m = re.match(r'^-- Dumping data for table `([^`]+)`$', line)
        if m and i >= 1 and lines[i - 1] == '--':
            table = m.group(1)
            out.pop()                          # bo dong "--" mo dau khoi da them
            j = i
            while j < n and lines[j] != 'UNLOCK TABLES;':
                j += 1
            block = lines[i - 1:j + 1]        # "--" ... "UNLOCK TABLES;"
            i = j + 1
            if table not in keep:
                for ln in block:               # ghi nhan gia tri nhay cam cua bang bi bo (de kiem chung)
                    if ln.startswith('INSERT INTO'):
                        for row in parse_values(ln[ln.index(' VALUES ') + 8:]):
                            for (k, v), c in zip(row, cols.get(table, [])):
                                if k == 'str':
                                    note_forbidden(forbidden, db, table, c, v)
                stats.setdefault(table, 0)
                continue
            rules = keep[table]
            for ln in block:
                if not ln.startswith('INSERT INTO'):
                    out.append(ln)
                    continue
                head, vals = ln.split(' VALUES ', 1)
                newrows = []
                for row in parse_values(vals):
                    d = dict(zip(cols[table], row))
                    for c, (k, v) in d.items():        # cot KHONG che cua bang giu = gia tri cau hinh hop le
                        if k == 'str' and c not in rules:
                            allowed.add(v)
                    for c, r in rules.items():
                        if c not in d:
                            raise SystemExit('bang %s.%s khong co cot %s' % (db, table, c))
                        if d[c][0] == 'str':
                            note_forbidden(forbidden, db, table, c, d[c][1])
                        d[c] = r(d) if callable(r) else r
                    newrows.append([d[c] for c in cols[table]])
                stats[table] = stats.get(table, 0) + len(newrows)
                out.append(head + ' VALUES ' + emit_values(newrows) + ';')
            continue
        out.append(line)
        i += 1
    return '\n'.join(out), cols


def backup_secrets():
    """Mat khau/secret that trong _backup-secrets-original/ (neu co) — cung khong duoc lot vao seed."""
    vals = {}
    b = os.path.join(ROOT, '_backup-secrets-original', 'server', 'console', 'config', 'env.yml')
    if os.path.exists(b):
        for m in re.finditer(r'^\s*(secret|password):\s*(\S+)', read(b), re.M):
            if len(m.group(2)) >= 4:
                vals[m.group(2)] = 'backup env.yml %s' % m.group(1)
    g = os.path.join(ROOT, '_backup-secrets-original', 'server', 'console', 'store', 'global.conf.json')
    if os.path.exists(g):
        for m in re.finditer(r'"password"\s*:\s*"([^"]+)"', read(g)):
            vals[m.group(1)] = 'backup global.conf.json password'
    return vals


def verify(outputs, forbidden, allowed):
    bad = 0
    for name, text in outputs.items():
        for v, where in forbidden.items():
            if v in allowed:                 # cung gia tri nam o cot cau hinh cua bang giu -> khong phai bi mat
                continue
            if v in text:
                bad += 1
                print('  LOT: %s con "%s..." (%s)' % (name, v[:6], where))
        if OLD_HOST in text:
            bad += 1
            print('  LOT: %s con %s' % (name, OLD_HOST))
    return bad


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dump-dir', default=DUMP_DIR)
    ap.add_argument('--out', default=OUT_DIR)
    ap.add_argument('--check', action='store_true', help='chi kiem chung seed dang co')
    a = ap.parse_args()

    outputs, forbidden, allowed, report = {}, dict(backup_secrets()), set(), []
    for fn in FILES:
        src = os.path.join(a.dump_dir, fn)
        if not os.path.exists(src):
            raise SystemExit('thieu dump %s (chep tu server cu, xem docker/prepare-dumps.sh)' % src)
        db = fn.replace('00-', '').replace('.sql', '')
        stats = {}
        body, cols = transform(db, read(src), stats, forbidden, allowed)
        missing = [t for t in KEEP[db] if t not in cols]
        if missing:
            raise SystemExit('%s: KEEP nhac bang khong co trong dump: %s' % (fn, missing))
        kept = {t: c for t, c in stats.items() if c}
        head = '\n'.join([
            '-- SINH TU DONG boi tools/dump-to-seed.py tu dump %s cua server cu — DUNG SUA TAY, sua tool roi sinh lai.' % fn,
            '-- Schema: %d bang (giu nguyen). Du lieu giu lai: %s.' % (
                len(cols), ', '.join('%s(%d)' % kv for kv in sorted(kept.items())) or 'khong'),
            '-- Placeholder __X__ do docker/initdb/mysql/zz-init.sh dien tu .env khi MySQL khoi tao lan dau.',
            '', ''])
        outputs[fn] = head + body
        report.append((fn, len(cols), kept, sorted(t for t, c in stats.items() if not c)))

    print('== Kiem chung: %d gia tri bi cam' % len(forbidden))
    if verify(outputs, forbidden, allowed):
        raise SystemExit('!! seed con gia tri that — KHONG ghi')
    for fn, ncols, kept, dropped in report:
        print('  %-11s %3d bang; du lieu: %s' % (fn, ncols, ', '.join('%s=%d' % kv for kv in sorted(kept.items())) or '-'))
        if dropped:
            print('  %-11s bo du lieu: %s' % ('', ', '.join(dropped)))
    if a.check:
        for fn in FILES:
            p = os.path.join(a.out, fn)
            if not os.path.exists(p):
                raise SystemExit('thieu %s' % p)
            if read(p) != outputs[fn]:
                raise SystemExit('%s khac voi ban sinh tu dump hien tai — chay lai tool' % p)
        print('OK: seed khop voi dump va sach')
        return
    os.makedirs(a.out, exist_ok=True)
    for fn, text in outputs.items():
        with io.open(os.path.join(a.out, fn), 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        print('  -> %s (%d KB)' % (os.path.relpath(os.path.join(a.out, fn), ROOT), len(text.encode('utf-8')) // 1024))


if __name__ == '__main__':
    main()
