#!/usr/bin/env python3
"""
Che / dien lai secrets trong cay server/ va website/ de push len repo PUBLIC.

  python tools/mask-secrets.py --mask              # thay gia tri that bang __PLACEHOLDER__, backup vao _backup-secrets-original/
  python tools/mask-secrets.py --check             # con gia tri that nao trong cay khong (0 = an toan de push)
  python tools/mask-secrets.py --fill secrets.env  # dien lai tu file secrets.env (KHONG push file nay) truoc khi deploy
  python tools/mask-secrets.py --restore           # copy nguyen ban tu backup ve

secrets.env dang KEY=VALUE, moi placeholder mot dong (xem SECRETS.md). File nay da nam trong .gitignore.

Cach lam: thay literal -> placeholder theo tung file, co ngu canh (cung mot gia tri "passtudat"
duoc dung cho MySQL, Mongo va RabbitMQ -> tach thanh 3 placeholder theo khoa dang doc).
"""
import argparse
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP = os.path.join(ROOT, '_backup-secrets-original')

# Gia tri that hien co trong snapshot (chi de --mask; sau khi mask, file nay van chua chung
# => tools/ KHONG duoc coi la secret-free: xem .gitignore "tools/mask-secrets.py"? KHONG —
# thay vao do, gia tri that duoc doc tu backup luc --mask, khong hardcode o day.)
PLACEHOLDERS = [
    # placeholder, mo ta, cac cho xuat hien (de SECRETS.md)
    ('__TCG_SECRET__',            'tcg.secret dung chung MOI service Java (env.yml + login/application.yml) — phai giong nhau'),
    ('__MYSQL_ROOT_PASSWORD__',   'MySQL root (server env.yml/global.conf.json + moi file PHP ket noi DB web/tcg/cdks)'),
    ('__MONGO_PASSWORD__',        'MongoDB user abc123 (console/statistic env.yml, global.conf.json)'),
    ('__RABBITMQ_PASSWORD__',     'RabbitMQ user admin (global.conf.json)'),
    ('__CONSOLE_ADMIN_PASSWORD__','Tai khoan admin cua console :9999 (gmhanglong/config/config.php)'),
    ('__WEB_DB_PASSWORD_REV__',   'Mat khau PDO rieng trong adminphp@2024/rev.php (khac cac file khac — kiem tra lai cai nao dung)'),
    ('__THESIEUTOC_API_KEY__',    'APIkey nap the cao thesieutoc.net (api/card.php)'),
    ('__MOMO_CALLBACK_SIGNATURE__','Chu ky callback MoMo (api/momoCallback.php)'),
    ('__REV_QUERY_KEY__',         'Query key cua adminphp@2024/rev.php (check.php goi rev.php?key=...)'),
    ('__GM_CODE__',               'Ma GM cua website/game/gm (gm/config.php $gmcode)'),
    ('__GMHANGLONG_CODE__',       'Ma uy quyen GM cua gmhanglong (config/config.php $gm_code)'),
    ('__GM_LOGIN_TOKEN__',        'JWT Login-Token hardcode trong gm/user/function/common.php (da het han; lay token moi qua staff/login)'),
    ('__MOMO_PHONE__',            'So dien thoai nhan MoMo trong link QR (user/indexapk.php)'),
    ('__BANK_CALLBACK_CHECKSUM__','Checksum tinh cua callback ngan hang (api/bankCallback.php) — truoc day nam trong comment va KHONG duoc kiem tra'),
]

# Quy tac che: (file, [(regex, thay the)]) -- regex dung nhom de giu phan khong phai secret.
RULES = [
    # ---------------- server (YAML) : secret + password theo block
    ('server/console/config/env.yml', 'yaml'),
    ('server/statistic/config/env.yml', 'yaml'),
    ('server/cross/config/env.yml', 'yaml'),
    ('server/game/config/env.yml', 'yaml'),
    ('server/group/config/env.yml', 'yaml'),
    ('server/meta/config/env.yml', 'yaml'),
    ('server/pay/config/env.yml', 'yaml'),
    ('server/world/config/env.yml', 'yaml'),
    ('server/login/application.yml', 'yaml'),
    ('server/console/store/global.conf.json', 'json'),
    # ---------------- website (PHP)
    ('website/game/api/config.php', [(r'(new PDO\([^,]+,\s*"root"\s*,\s*)"[^"]*"', r'\1"__MYSQL_ROOT_PASSWORD__"')]),
    ('website/game/api/api2.php',   [(r'(new PDO\([^,]+,\s*"root"\s*,\s*)"[^"]*"', r'\1"__MYSQL_ROOT_PASSWORD__"')]),
    ('website/game/api/apisv.php',  [(r'(new PDO\([^,]+,\s*"root"\s*,\s*)"[^"]*"', r'\1"__MYSQL_ROOT_PASSWORD__"')]),
    ('website/game/api/apiapk.php', [(r'(new PDO\([^,]+,\s*"root"\s*,\s*)"[^"]*"', r'\1"__MYSQL_ROOT_PASSWORD__"')]),
    ('website/game/new/config.php', [(r'(new PDO\([^,]+,\s*"root"\s*,\s*)"[^"]*"', r'\1"__MYSQL_ROOT_PASSWORD__"')]),
    ('website/game/adminphp@2024/db.php', [(r'(new PDO\([^,]+,\s*"root"\s*,\s*)"[^"]*"', r'\1"__MYSQL_ROOT_PASSWORD__"')]),
    ('website/game/adminphp@2024/thongbao.php', [(r'(new PDO\([^,]+,\s*"root"\s*,\s*)"[^"]*"', r'\1"__MYSQL_ROOT_PASSWORD__"')]),
    ('website/game/adminphp@2024/rev.php', [
        (r"(\$_GET\['key'\] !== )'[0-9a-f]{32}'", r"\1'__REV_QUERY_KEY__'"),
        (r'(new PDO\([^,]+,\s*"root"\s*,\s*)"[^"]*"', r'\1"__WEB_DB_PASSWORD_REV__"')]),
    ('website/game/adminphp@2024/check.php', [(r'rev\.php\?key=[0-9a-f]{32}', 'rev.php?key=__REV_QUERY_KEY__')]),
    ('website/game/api/card.php', [(r"('APIkey'\s*=>\s*)'[0-9A-Fa-f]{32}'", r"\1'__THESIEUTOC_API_KEY__'")]),
    ('website/game/api/momoCallback.php', [(r'(\$signature\s*=\s*)"[0-9a-f]{64}"', r'\1"__MOMO_CALLBACK_SIGNATURE__"')]),
    ('website/game/api/bankCallback.php', [
        (r'(checksum=)[0-9a-f]{32}', r'\1__BANK_CALLBACK_CHECKSUM__'),
        (r"(\$expected\s*=\s*)'[0-9a-f]{32}'", r"\1'__BANK_CALLBACK_CHECKSUM__'")]),
    ('website/game/gm/config.php', [(r"(\$gmcode\s*=\s*)'[^']*'", r"\1'__GM_CODE__'")]),
    ('website/game/gmhanglong/config/config.php', [
        (r"(\$gm_code\s*=\s*)\"[^\"]*\"", r'\1"__GMHANGLONG_CODE__"'),
        (r"('DB_PWD'\s*=>\s*)'[^']*'", r"\1'__MYSQL_ROOT_PASSWORD__'"),
        (r"('password'\s*=>\s*)'[^']*'", r"\1'__CONSOLE_ADMIN_PASSWORD__'")]),
    ('website/game/gm/user/function/common.php', [
        (r"('Login-Token:)eyJ[A-Za-z0-9._-]+'", r"\1__GM_LOGIN_TOKEN__'"),
        (r"(mysqli_connect\('127\.0\.0\.1',\s*'root',\s*)'[^']*'", r"\1'__MYSQL_ROOT_PASSWORD__'"),
        (r'("pwd"\s*=>\s*)"[^"]*"', r'\1"__MYSQL_ROOT_PASSWORD__"')]),
    ('website/game/user/indexapk.php', [(r'(new PDO\([^,]+,\s*"root"\s*,\s*)"(?!__)[^"]*"', r'\1"__WEB_DB_PASSWORD_REV__"')]),
    ('website/game/user/naptien.php',  [(r'(QRCode\?phone=)\d{9,11}', r'\1__MOMO_PHONE__')]),
    ('website/game/user/naptien2.php', [(r'(QRCode\?phone=)\d{9,11}', r'\1__MOMO_PHONE__')]),
]

YAML_BLOCK_PLACEHOLDER = {'mongo': '__MONGO_PASSWORD__', 'mysql': '__MYSQL_ROOT_PASSWORD__', 'mq': '__RABBITMQ_PASSWORD__'}


def read(p):
    with open(p, 'rb') as fh:
        return fh.read().decode('utf-8')


def write(p, s):
    with open(p, 'wb') as fh:
        fh.write(s.encode('utf-8'))


def mask_yaml(s):
    out, block, n = [], '', 0
    for line in s.splitlines(keepends=True):
        m = re.match(r'^([A-Za-z_][\w-]*):', line)
        if m:
            block = m.group(1).lower()
        m2 = re.match(r'^(\s*secret:\s*)(\S+)(\s*)$', line)
        if m2 and not m2.group(2).startswith('__'):
            line = m2.group(1) + '__TCG_SECRET__' + m2.group(3) + ('\n' if line.endswith('\n') else ''); n += 1
        m3 = re.match(r'^(\s+password:\s*)(\S+)(\s*)$', line)
        if m3 and not m3.group(2).startswith('__'):
            ph = next((v for k, v in YAML_BLOCK_PLACEHOLDER.items() if k in block), '__MYSQL_ROOT_PASSWORD__')
            line = m3.group(1) + ph + m3.group(3) + ('\n' if line.endswith('\n') else ''); n += 1
        out.append(line)
    return ''.join(out), n


def mask_json(s):
    # global.conf.json: "password" nam trong "mq", "tcg_mysql_conf", "tcg_mongo_conf", "helperMongo"
    n = 0
    def sub(block_key, ph):
        nonlocal s, n
        pat = re.compile(r'("%s"\s*:\s*\{[^{}]*?"password"\s*:\s*)"([^"]*)"' % re.escape(block_key), re.S)
        def r(m):
            nonlocal n
            if m.group(2).startswith('__') or m.group(2) == '':
                return m.group(0)
            n += 1
            return m.group(1) + '"' + ph + '"'
        s = pat.sub(r, s)
    sub('mq', '__RABBITMQ_PASSWORD__'); sub('mqShare', '__RABBITMQ_PASSWORD__')
    sub('tcg_mysql_conf', '__MYSQL_ROOT_PASSWORD__'); sub('tcg_mongo_conf', '__MONGO_PASSWORD__')
    return s, n


def backup(rel):
    dst = os.path.join(BACKUP, rel)
    if not os.path.exists(dst):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(ROOT, rel), dst)


def do_mask():
    total = 0
    for rel, rule in RULES:
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            print('   (khong co) %s' % rel); continue
        s = read(p)
        if rule == 'yaml':
            new, n = mask_yaml(s)
        elif rule == 'json':
            new, n = mask_json(s)
        else:
            new, n = s, 0
            for pat, rep in rule:
                new, c = re.subn(pat, rep, new); n += c
        print('   %-52s %s' % (rel, 'da che truoc do' if n == 0 else '%d cho' % n))
        if n:
            backup(rel); write(p, new); total += n
    return total


def do_fill(envfile):
    kv = {}
    for line in read(os.path.join(ROOT, envfile)).splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1); kv[k.strip()] = v.strip()
    missing = [ph for ph, _ in PLACEHOLDERS if ph not in kv]
    if missing:
        print('secrets.env thieu:', ', '.join(missing))
    total = 0
    for rel, _ in RULES:
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            continue
        s = read(p); n = 0
        for ph, v in kv.items():
            c = s.count(ph); n += c; s = s.replace(ph, v)
        if n:
            write(p, s); total += n; print('   %-52s %d cho' % (rel, n))
    return total


def do_check():
    # tim gia tri that bang cach so voi backup: moi gia tri da bi thay o backup ma van con trong cay
    vals = set()
    for rel, rule in RULES:
        b = os.path.join(BACKUP, rel); p = os.path.join(ROOT, rel)
        if not (os.path.exists(b) and os.path.exists(p)):
            continue
        old, new = read(b), read(p)
        # cac token trong old khong con trong new va co ve la secret
        for tok in set(re.findall(r"[A-Za-z0-9._-]{6,}", old)):
            if tok not in new and re.search(r'\d', tok) and not tok.startswith(('http', 'www.')):
                vals.add(tok)
    found = 0
    skip = ('.logs', '_backup', 'excel-staging', 'build', 'res', '.git')
    for base in ('server', 'website', 'docker', 'tools', 'docs'):
        for dp, dns, fns in os.walk(os.path.join(ROOT, base)):
            dns[:] = [d for d in dns if not d.startswith(skip)]
            for f in fns:
                if not f.lower().endswith(('.php', '.yml', '.yaml', '.json', '.js', '.md', '.txt', '.ini', '.conf', '.properties', '.sh', '.py', '.html')):
                    continue
                p = os.path.join(dp, f)
                try: s = read(p)
                except Exception: continue
                for v in vals:
                    if v in s:
                        found += 1; print('   CON SOT %s : %s' % (os.path.relpath(p, ROOT), v[:8] + '…'))
    for md in ('CLAUDE.md', 'MISSING-FILES.md', 'SECRETS.md', 'README.md'):
        p = os.path.join(ROOT, md)
        if os.path.exists(p):
            s = read(p)
            for v in vals:
                if v in s:
                    found += 1; print('   CON SOT %s : %s' % (md, v[:8] + '…'))
    print('   -> %s' % ('sach, %d gia tri that da duoc che' % len(vals) if not found else '%d cho con sot' % found))
    return found


def do_restore():
    n = 0
    for dp, _, fns in os.walk(BACKUP):
        for f in fns:
            src = os.path.join(dp, f); rel = os.path.relpath(src, BACKUP)
            shutil.copy2(src, os.path.join(ROOT, rel)); n += 1
    print('   da khoi phuc %d file tu %s' % (n, os.path.relpath(BACKUP, ROOT)))


def write_secrets_md():
    lines = ['# Secrets đã được che để push repo public', '',
             'Các file dưới đây chứa placeholder thay cho giá trị thật. **Server và website không chạy được cho tới khi điền lại.**', '',
             'Cách điền: tạo `secrets.env` (đã nằm trong `.gitignore`) dạng `KEY=VALUE`, rồi:', '',
             '```bash', 'python tools/mask-secrets.py --fill secrets.env', '```', '',
             'Bản gốc trước khi che nằm ở `_backup-secrets-original/` (không push). `python tools/mask-secrets.py --restore` để lấy lại.', '',
             '| Placeholder | Ý nghĩa |', '|---|---|']
    for ph, desc in PLACEHOLDERS:
        lines.append('| `%s` | %s |' % (ph, desc))
    lines += ['', '## File bị che', '']
    for rel, _ in RULES:
        lines.append('- `%s`' % rel)
    lines += ['', '## Không nằm trong git (theo `.gitignore`)', '',
              '- `server/login/fs-huawei.yezixigame.com.keystore`',
              '- `server/*/.logs/` — log in ra toàn bộ cấu hình kể cả mật khẩu lúc khởi động',
              '- `docker/.env`, `docker/initdb/mysql/*.sql`, `docker/initdb/mongo/dump/`, `secrets.env`', '',
              '## Mẫu `secrets.env`', '', '```']
    for ph, _ in PLACEHOLDERS:
        lines.append('%s=' % ph)
    lines += ['```', '']
    write(os.path.join(ROOT, 'SECRETS.md'), '\n'.join(lines))


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--mask', action='store_true'); g.add_argument('--check', action='store_true')
    g.add_argument('--fill', metavar='ENV'); g.add_argument('--restore', action='store_true')
    a = ap.parse_args()
    if a.mask:
        n = do_mask(); write_secrets_md()
        print('\nDa che %d cho. Backup: %s. Da tao SECRETS.md.' % (n, os.path.relpath(BACKUP, ROOT))); do_check()
    elif a.check:
        return 1 if do_check() else 0
    elif a.fill:
        print('Da dien %d cho.' % do_fill(a.fill))
    elif a.restore:
        do_restore()
    return 0


if __name__ == '__main__':
    sys.exit(main())
