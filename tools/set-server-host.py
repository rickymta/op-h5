#!/usr/bin/env python3
"""
Sua toan bo IP/host hardcode (192.168.1.69, 123.253.26.34) trong server/ va website/.

HAI GIAI DOAN
  A. STATIC  - khong can IP: URL cung origin -> duong dan tuong doi; PHP goi PHP tren
               cung may -> 127.0.0.1; GM console React -> env 'local'. Dung cho moi server.
  B. HOST    - can IP/domain that: 4 literal co port trong bundle client, global.conf.json
               (server bao client dia chi login/stat/pay/world), world/env.yml, og:url,
               site home/, va dump MySQL trong docker/initdb/mysql/*.sql.

CACH DUNG (chay tu thu muc goc repo)
  python tools/set-server-host.py --static-only            # dry-run giai doan A
  python tools/set-server-host.py --static-only --apply
  python tools/set-server-host.py 10.0.0.5                 # dry-run A + B voi host moi
  python tools/set-server-host.py game.example.com --apply
  python tools/set-server-host.py --check                  # liet ke cho con sot host cu

Lan --apply dau tien sao luu file goc vao _backup-hosts-original/<duong dan>.
Idempotent: chay lai khong lam hong gi. Host moi co the la IP hoac domain (khong scheme).

LUU Y: bundle client (libs/e228b-*.js) la JS obfuscated; chi thay literal chuoi -> chuoi,
khong dua bieu thuc vao mang chuoi cua obfuscator.
"""
import argparse
import glob
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP = os.path.join(ROOT, '_backup-hosts-original')
OLD_HOSTS = ('192.168.1.69', '123.253.26.34')

# ---------------------------------------------------------------- A. static
STATIC = {
    'website/game/libs/e228b-0b904-ac44c.js': [
        ("'http://192.168.1.69/api/getSession.php?u='", "'/api/getSession.php?u='"),
        ("'http://192.168.1.69/cli/houtai/VIPkefu/touxiang'", "'/cli/houtai/VIPkefu/touxiang'"),
        ("'http://192.168.1.69/cli/houtai/WXYXQ/icon.png'", "'/cli/houtai/WXYXQ/icon.png'"),
    ],
    'website/game/libs/795bf-bff72-0d910.js': [
        ("'http://192.168.1.69/libs/2af72-f100c-2af72.json'", "'/libs/2af72-f100c-2af72.json'"),
    ],
    # bundle khong doc ydwxConfig, nhung giu loader dung cho bat ky doc gia nao khac
    'website/game/a3b31-4c087-1dc2f.js': [
        ('ydwxConfig.basePath = "http://192.168.1.69/";',
         'ydwxConfig.basePath = location.protocol + "//" + location.host + "/";'),
        ('ydwxConfig.metaDataServer = "http://192.168.1.69:12345/";',
         'ydwxConfig.metaDataServer = location.protocol + "//" + location.hostname + ":12345/";'),
        ('ydwxConfig.statisticServer = "http://192.168.1.69:7788/";',
         'ydwxConfig.statisticServer = location.protocol + "//" + location.hostname + ":7788/";'),
    ],
    'website/game/play.php': [("src='http://192.168.1.69/nap-tien'", "src='/nap-tien'")],
    'website/game/new/config.php': [("curl_init('http://192.168.1.69/", "curl_init('http://127.0.0.1/")],
    'website/game/adminphp@2024/check.php': [("'http://192.168.1.69/adminphp@2024/rev.php", "'http://127.0.0.1/adminphp@2024/rev.php")],
    'website/game/new/webshop.php': [('src="http://192.168.1.69/iconshop/', 'src="/iconshop/')],
    'website/game/user/taikhoan.php': [('href="http://192.168.1.69/play-game"', 'href="/play-game"')],
    # GM console React: 'release' tro IP nha cung cap cu; 'local' = http://127.0.0.1:9999/
    'website/game/adminhl@2024/admtool/env.local.js': [
        ("document.env_local_mode = 'release';", "document.env_local_mode = 'local';"),
    ],
}

# ---------------------------------------------------------------- B. host
# (path, [(regex, replacement-with-{host})])  -- ap dung theo thu tu
HOST_RULES = [
    ('server/console/store/global.conf.json', [(r'192\.168\.1\.69', '{host}')]),
    ('server/world/config/env.yml', [(r'http://123\.253\.26\.34:88/cli/app/icon/', 'http://{host}/cli/app/icon/')]),
    ('website/game/libs/e228b-0b904-ac44c.js', [(r"'http://192\.168\.1\.69:(9000|9999/status|12345/announce/one|7788/client/error/log)'", r"'http://{host}:\1'")]),
    ('website/game/user/index.php', [(r'content="http://192\.168\.1\.69"', 'content="http://{host}"')]),
    ('website/game/user/indexapk.php', [(r'content="http://192\.168\.1\.69"', 'content="http://{host}"')]),
    ('website/home/play.php', [(r'header\("location: https?://home\.192\.168\.1\.69"\);', 'header("location: http://{host}/play-game");')]),
    ('website/home/index.php', [(r'https?://home\.192\.168\.1\.69/?', 'http://{host}/'), (r'192\.168\.1\.69', '{host}')]),
]
DUMP_GLOB = 'docker/initdb/mysql/*.sql'

TEXT_EXT = ('.js', '.php', '.json', '.yml', '.yaml', '.html', '.sql', '.txt', '.ini', '.conf', '.properties')


def read(p):
    with open(p, 'rb') as fh:
        return fh.read().decode('utf-8')


def write(p, s):
    with open(p, 'wb') as fh:
        fh.write(s.encode('utf-8'))


def backup(rel):
    dst = os.path.join(BACKUP, rel)
    if not os.path.exists(dst):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(ROOT, rel), dst)


def apply_static(do):
    total = 0
    print('== A. STATIC (khong can IP) ==')
    for rel, pairs in STATIC.items():
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            print('   (khong co) %s' % rel); continue
        s = read(p); n = 0
        for old, new in pairs:
            c = s.count(old); n += c
            s = s.replace(old, new)
        state = 'da sua truoc do' if n == 0 else '%d cho' % n
        print('   %-52s %s' % (rel, state))
        if n and do:
            backup(rel); write(p, s)
        total += n
    return total


def apply_host(host, do):
    total = 0
    print('== B. HOST -> %s ==' % host)
    files = [(rel, rules) for rel, rules in HOST_RULES]
    for d in sorted(glob.glob(os.path.join(ROOT, DUMP_GLOB))):
        files.append((os.path.relpath(d, ROOT).replace(os.sep, '/'), [(r'192\.168\.1\.69', '{host}')]))
    for rel, rules in files:
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            print('   (khong co) %s' % rel); continue
        s = read(p); n = 0
        for pat, rep in rules:
            s, c = re.subn(pat, rep.replace('{host}', host), s)
            n += c
        print('   %-52s %s' % (rel, 'da sua truoc do' if n == 0 else '%d cho' % n))
        if n and do:
            backup(rel); write(p, s)
        total += n
    return total


def check():
    print('== CHECK: cho con chua host cu ==')
    skip = ('.logs', '_backup', 'excel-staging', 'res', 'node_modules', 'build')
    left = 0
    for base in ('server', 'website', 'docker'):
        for dp, dns, fns in os.walk(os.path.join(ROOT, base)):
            dns[:] = [d for d in dns if not d.startswith(skip)]
            for f in fns:
                if not f.lower().endswith(TEXT_EXT):
                    continue
                p = os.path.join(dp, f)
                try:
                    s = read(p)
                except Exception:
                    continue
                for i, line in enumerate(s.splitlines(), 1):
                    if any(h in line for h in OLD_HOSTS):
                        left += 1
                        tag = '(comment)' if line.lstrip().startswith(('#', '//', '--')) else ''
                        print('   %s:%d %s %s' % (os.path.relpath(p, ROOT).replace(os.sep, '/'), i, tag, line.strip()[:90]))
    print('   -> %d dong' % left if left else '   -> sach')
    return left


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('host', nargs='?', help='IP hoac domain moi (khong scheme)')
    ap.add_argument('--static-only', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    if a.check:
        return 1 if check() else 0
    if not a.static_only and not a.host:
        ap.error('can <host> hoac --static-only')
    if a.host and re.search(r'^[a-z]+://|/', a.host):
        ap.error('host chi la IP/domain, khong scheme, khong duong dan')
    print('Che do: %s\n' % ('APPLY' if a.apply else 'DRY-RUN'))
    n = apply_static(a.apply)
    if a.host:
        print(); n += apply_host(a.host, a.apply)
    print()
    if a.apply:
        print('Da sua %d cho. Backup: %s' % (n, os.path.relpath(BACKUP, ROOT)))
        print(); check()
    else:
        print('Se sua %d cho. Them --apply de ghi.' % n)
    return 0


if __name__ == '__main__':
    sys.exit(main())
