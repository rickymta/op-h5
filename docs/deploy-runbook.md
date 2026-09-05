# Runbook triển khai lên server mới (4 CPU / 8 GB / 40 GB)

Làm **theo đúng thứ tự**, mỗi bước có điểm kiểm tra. Ký hiệu: `[PC]` chạy trên máy Windows của bạn, `[CŨ]` trên server cũ `pgaming`, `[MỚI]` trên server mới. Tất cả lệnh Linux chạy bằng `root`.

Đầu vào đã có: repo `github.com/rickymta/op-h5` (JAR qua LFS), release `assets-v1` (res/sound/spine 1.33 GB), giá trị secrets thật trong `_backup-secrets-original/` trên PC, server cũ còn chạy với DB thật.

## Trỏ domain thật — `antfarms.xyz`

| Tên | Trỏ về |
|---|---|
| `antfarms.xyz` | Trang chính |
| `www.antfarms.xyz` | Chuyển hướng về tên không www |
| `id.antfarms.xyz` | Quản lý tài khoản, nạp tiền, OIDC |
| `haitac.antfarms.xyz` | Game hải tặc |
| `haitac.antfarms.xyz/adminportal` | Công cụ GM |

Bốn bản ghi `A` trỏ về IP server. Thêm game mới thì thêm một bản ghi và copy khối
`server` của haitac.

### Chỉ mở 80 và 443 — client không còn gọi theo cổng

Bản gốc client gọi thẳng bốn dịch vụ **theo cổng**: meta `:12345`, statistic `:7788`,
login `:9000`, WebSocket `:8001`. Với server chỉ mở 80/443 thì bốn đường đó không tới
nơi, và khi trang chạy HTTPS trình duyệt còn chặn nội dung hỗn hợp — **không có đường
lui**. Nay cả bốn đi qua 443 bằng tiền tố đường dẫn:

| Đường | Tới | Ai quyết định |
|---|---|---|
| `/meta/` | `127.0.0.1:12345` | `a3b31-4c087-1dc2f.js` dùng `location.origin + "/meta/"` |
| `/stat/` | `127.0.0.1:7788` | như trên, `"/stat/"` |
| `/account/`, `/srv/` | `127.0.0.1:9000` | client nối vào base lấy từ `loginNP` |
| `/game` | `127.0.0.1:8001` | WebSocket; `path` do login server trả về |

**Ba việc bắt buộc làm kèm.** Thiếu bất kỳ việc nào thì client vẫn gọi cổng cũ và
triệu chứng (client đứng im) không chỉ vào nguyên nhân:

1. **`PUBLIC_SCHEME=https`** trong `docker/.env` (và `PUBLIC_PORT` nếu khác 443).
   `server-entrypoint.sh` sẽ sửa `loginNP`/`statNP` trong
   `console/store/global.conf.json`. Client lấy địa chỉ login từ **đây**, không phải từ
   `tcg.srv_login` — bảng đó phục vụ việc khác.
2. **`ADAPTER_TLS=true`**. Adapter phục vụ `/srv/game/connect/target` và viết lại địa chỉ
   WebSocket thành `wss://haitac.antfarms.xyz:443/game`. Không thể đổi
   `tcg.srv_game.ws_port` thành 443 vì **cột đó vừa là cổng login công bố vừa là cổng
   tiến trình game bind vào** — đặt 443 thì game tranh cổng với nginx.
3. **MySQL**: `UPDATE tcg.cloud_device SET host_WAN='haitac.antfarms.xyz';`

Kèm theo trong `.env`:

```
PUBLIC_HOST=haitac.antfarms.xyz
PUBLIC_SCHEME=https
ID_ISSUER=https://id.antfarms.xyz
ADAPTER_REDIRECT_URI=https://haitac.antfarms.xyz/auth/callback
ADAPTER_TLS=true
```

### Thứ tự

```bash
# 1. Chứng chỉ TRƯỚC — thiếu file là nginx không khởi động được
mkdir -p /var/www/acme
certbot certonly --webroot -w /var/www/acme \
  -d antfarms.xyz -d www.antfarms.xyz -d id.antfarms.xyz -d haitac.antfarms.xyz

# 2. Điền domain vào hai file mẫu trong image rồi mount đè
docker run --rm ghcr.io/rickymta/op-h5-nginx:latest cat /etc/nginx/domains.conf.mau \
  | sed 's/__PUBLIC_DOMAIN__/antfarms.xyz/g' > /opt/tcg/nginx/domains.conf
docker run --rm ghcr.io/rickymta/op-h5-nginx:latest cat /etc/nginx/tls.conf.mau \
  | sed 's/__PUBLIC_DOMAIN__/antfarms.xyz/g' > /opt/tcg/nginx/tls.conf

# 3. Thêm vào service nginx trong compose:
#   volumes:
#     - /opt/tcg/nginx/domains.conf:/etc/nginx/conf.d/domains.conf:ro
#     - /opt/tcg/nginx/tls.conf:/etc/nginx/tls.conf:ro
#     - /etc/letsencrypt:/etc/letsencrypt:ro
#     - /var/www/acme:/var/www/acme:ro
```

### Công cụ GM

Ở `haitac.antfarms.xyz/adminportal`. **Mặc định chỉ loopback** (`gm_access.conf`) — vào
bằng SSH tunnel: `ssh -L 8080:127.0.0.1:80 root@<server>`. Muốn mở cho một địa chỉ cố
định thì thêm `allow <IP>;` vào `gm_access.conf` rồi mount đè.

Tài khoản GM nằm ở bảng `platform.gm_users` (mật khẩu bcrypt), tài khoản đầu tiên tạo từ
`GM_BOOTSTRAP_USER`/`GM_BOOTSTRAP_PASSWORD`. Mọi thao tác ghi vào `platform.gm_audit`.

**Trang quản trị nền tảng (`:8100`) cố ý không có domain** — nó không có lớp chống dò mật
khẩu như hệ thống ID và mở ra Internet là mở cả đường nạp tay. Vào bằng
`ssh -L 8100:127.0.0.1:8100 root@<server>`.

### Chưa kiểm chứng

Không có domain và chứng chỉ thật trên máy dev nên phần TLS mới chỉ chạy `nginx -t` với
chứng chỉ tự ký. Phần **đường dẫn** thì đã chạy thật qua HTTP ở cổng 8080: client gọi
đúng `/meta/`, `/stat/`, `/srv/…` và Adapter trả về địa chỉ WebSocket đã viết lại.

---

## Di trú người chơi cũ — BẮT BUỘC trước khi mở cổng ID

Bỏ bước này thì mọi người chơi cũ đăng nhập đúng mật khẩu nhưng lạc vào **nhân vật
rỗng**: `Mapper.Ensure()` đúc username `id%09d` mới cho bất kỳ ai chưa có ánh xạ. Loại
sự cố này không sửa được bằng cách thử lại, và càng để lâu càng khó gỡ.

```bash
# 1. Xem sẽ làm gì (mặc định là dry-run, không ghi gì)
go run ./cmd/migrate-legacy   --platform-dsn 'root:PW@tcp(127.0.0.1:3306)/platform?parseTime=true'   --web-dsn      'root:PW@tcp(127.0.0.1:3306)/web'   --tcg-dsn      'root:PW@tcp(127.0.0.1:3306)/tcg'   --enc-key      "$ADAPTER_SECRET_ENC_KEY" --game haitac

# 2. Thực hiện. Chạy lại được — lần hai không tạo trùng, không cộng Xu hai lần.
#    Thêm --apply.
```

Bốn việc nó làm: `web.user` → `platform.users` (kèm ví); ghi `user_legacy_links`;
`tcg.account` → `game_identities`; `web.user.xu` → số dư mở đầu trong sổ cái.

**Không đổi mật khẩu game.** `tcg.account.password` lưu dạng thô, nên công cụ đọc thẳng
rồi mã hoá vào `game_identities.game_secret`. Người chơi giữ nguyên đường đăng nhập trực
tiếp cũ, và Adapter đăng nhập hộ được — không ai phải đặt lại mật khẩu.

**Mật khẩu cổng**: bản bcrypt của PHP được chép nguyên và tự nâng lên Argon2id ở lần đăng
nhập đầu; bản còn dạng thô được băm ngay tại chỗ. Không bao giờ ghi mật khẩu thô sang hệ
thống mới.

`--enc-key` phải là **đúng** `ADAPTER_SECRET_ENC_KEY` mà Adapter đang dùng, nếu không
Adapter giải mã ra chuỗi sai và login server trả `K_PASSWORD_ERROR`.

Đã kiểm chứng đủ đường: người chơi cũ đăng nhập bằng mật khẩu cũ → vào thẳng máy chủ có
nhân vật của họ (S1), đúng tên và cấp nhân vật, không qua màn hình đăng nhập nào.

---

## Tóm tắt lệnh — bản rút gọn để copy (Ubuntu, Docker đã cài, ufw đã mở 22/80/443)

Trạng thái 2026-09-05: repo + release `assets-v1` + image GHCR đã sẵn; MySQL khởi tạo từ **seed sạch trong git** (`docker/initdb/mysql/seed/`), **không cần dump, không cần secrets cũ**. Chưa `up` thật lần nào. Ký hiệu `[MỚI]` Ubuntu, `[CŨ]` pgaming. Lệnh Linux chạy bằng root.

**1 `[MỚI]` Port:**
```bash
ufw allow 9000/tcp && ufw allow 8001/tcp && ufw allow 12345/tcp && ufw allow 7788/tcp && ufw allow 8080/tcp && ufw status numbered   # 8080 = he thong ID
```

**2 `[MỚI]` Bootstrap = tất cả** (swap 4 GB, tải 1.33 GB assets, lấy `docker/`, sinh `.env` với bí mật ngẫu nhiên, pull image, `up -d`, đợi web + login lên; 10–20 phút):
```bash
curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/server-bootstrap.sh | MODE=pull PUBLIC_HOST=<IP-hoặc-domain> bash
```
Cuối script in tài khoản quản trị và console; toàn bộ bí mật ở `/opt/tcg/docker/.env` (chmod 600). `MODE=build` = clone + build tại chỗ (611 MB LFS). `NO_UP=1` để dừng trước khi `up`. Chạy lại script vô hại: `.env` đã có thì giữ nguyên.

**3 `[MỚI]` Kiểm tra:**
```bash
cd /opt/tcg/docker && C="docker compose -f docker-compose.image.yml"
$C ps                                                   # tất cả healthy; platform-seed "Exited (0)"
$C logs mysql | grep tcg-init                           # "xong (seed)" + dòng "s1  ws=8001"
$C logs game | grep -E '找不到excel|找不到sheet|加载错误|OutOfMemory'; echo "(rong = tot)"
curl -s -o /dev/null -w 'console %{http_code}\n' http://127.0.0.1:9999/conf/global/get; curl -sI http://127.0.0.1/play-game | head -1
curl -s http://127.0.0.1:8080/.well-known/openid-configuration | head -c 120; echo
```
Từ máy khác: `http://PUBLIC_HOST/` → đăng ký ở `:8080` → `/choi-game`. Màn đen: F12 xem client gọi `PUBLIC_HOST:9000` hay `192.168.1.69`.

**4 `[CŨ]`→`[MỚI]` Tuỳ chọn — giữ tài khoản/nhân vật cũ:**
```bash
# [CŨ]
curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/prepare-dumps.sh -o /tmp/prepare-dumps.sh
export MYSQL_PW='<root mysql>' MONGO_PW='<mongo abc123>' && bash /tmp/prepare-dumps.sh
# [MỚI]
rsync -avz --progress root@<IP-CŨ>:/tmp/tcg-dumps/mysql/      /opt/tcg/docker/initdb/mysql/
rsync -avz --progress root@<IP-CŨ>:/tmp/tcg-dumps/mongo/dump/ /opt/tcg/docker/initdb/mongo/dump/
cd /opt/tcg/docker && $C down -v && $C up -d            # khởi tạo lại từ dump; zz-init.sh tự điền mật khẩu .env + PUBLIC_HOST vào dump
```
Không cần sửa IP hay mật khẩu trong dump. `game_s1.sql` và `admin/` của Mongo bỏ được. (Dump 2026-09-04 đang nằm ở `docker/initdb/` trên PC, gitignored.)

Ba chỗ dễ vấp: `PUBLIC_HOST` sai (bootstrap đoán IP public khi không truyền — sai thì `rm /opt/tcg/docker/.env`, chạy lại với `PUBLIC_HOST=`); volume cũ chặn khởi tạo (`down -v`); nginx rewrite — vẫn kiểm tra đăng nhập web sau lần `up` đầu.

---

## Thử trước trên máy dev (macOS) — cả cụm Java thật, không cần dump

Trước khi đụng vào server thật, dựng **toàn bộ** hệ thống trên máy dev: 9 service Java thật
(console → world → meta → statistic → pay → group → game s1 → login → cross), hệ thống ID /
Adapter / trang quản trị, PHP + nginx. MySQL nạp bộ seed sạch `docker/initdb/mysql/seed/` qua
`zz-init.sh` — đúng đường mà server thật đi — Mongo trống, service tự tạo collection.

```bash
./docker/dev-macos.sh --build     # lần đầu: dựng image rồi chạy (Docker Desktop cấp >= 8 GB RAM, nên 10)
./docker/dev-macos.sh             # các lần sau; mỗi lần là môi trường MỚI (bí mật sinh mới, DB tạo mới)
./docker/dev-macos.sh --down      # tắt hết
```

Script in bảng truy cập, tài khoản quản trị và mật khẩu console của lần chạy đó; log game:
`docker exec op-game tail -f .logs/game-s1/info.log`. Client vào `http://127.0.0.1:8080/play.php`,
WebSocket máy chủ s1 ở `:8001`. Muốn thử với dữ liệu cũ: đặt dump vào `docker/initdb/mysql/*.sql`
và `docker/initdb/mongo/dump/` (gitignored) — `zz-init.sh` tự nhận ra.

Hai điều khác biệt so với server thật, **chỉ là hạn chế của Docker Desktop trên Mac**:

- `network_mode: host` chỉ vào netns của VM Linux chứ không publish ra macOS, và không
  publish được cổng mà container host-network đang giữ. Script dùng một container giữ
  netns có publish sẵn mọi cổng; các container khác join netns đó. Trên Ubuntu không cần.
- Vì thế trang game ở `:8080` và hệ thống ID ở `:8081`, thay vì `:80` và `:8080`.

⚠️ `web-entrypoint` sed thẳng vào cây nguồn khi bind-mount, **hai loại thay đổi**:
`192.168.1.69` → `PUBLIC_HOST` (3 file — đó là lý do client gọi `127.0.0.1:12345`), và
**điền mật khẩu thật vào ~10 file PHP** thay cho placeholder. Loại thứ hai nguy hiểm với repo
public: `mask-secrets.py --check` bản cũ so với `_backup-secrets-original/` nên **không** thấy
một giá trị mới sinh nằm đúng ô placeholder. Từ 2026-09-05 `--check` kiểm tra thêm sự có mặt
của placeholder, nên khi container đang chạy nó sẽ báo `DA DIEN` — đúng như vậy.

Trước khi commit, **dừng container php trước** rồi mới dọn (không thì nó điền lại ngay):

```bash
docker rm -f op-php && git checkout -- website/game/ && rm -f website/game/.public-host
python tools/mask-secrets.py --check     # phải in "sach"
```

---

## Bước 0 — (Tuỳ chọn) Chuẩn bị trên PC (10 phút)

> **Từ 2026-09-05 không cần secrets cũ**: `gen-env.sh` sinh bí mật mới, `zz-init.sh` ghi vào DB. Mục 0.1 chỉ còn cần khi muốn dùng lại API key nạp thẻ / MoMo / checksum bank của server cũ (điền tay vào `.env` sau bootstrap). Mục 0.2 vẫn đọc.

**0.1 Gom secrets thành `secrets.env`** (file này đã gitignored, chỉ ở PC):

```bash
cd E:/DATA/Games/HacTacHuyenThoaiH5/game
python tools/mask-secrets.py --restore          # lấy lại giá trị thật vào cây
```

Mở các file sau, chép giá trị vào một file tạm theo bảng trong `SECRETS.md` (13 placeholder):

| Placeholder | Lấy ở |
|---|---|
| `__TCG_SECRET__` | `server/console/config/env.yml` → `secret:` |
| `__MYSQL_ROOT_PASSWORD__` | `server/console/config/env.yml` → `mysqlConf.password` |
| `__MONGO_PASSWORD__` | `server/console/config/env.yml` → `mongoConf.password` |
| `__RABBITMQ_PASSWORD__` | `server/console/store/global.conf.json` → `stat.mq.password` |
| `__CONSOLE_ADMIN_PASSWORD__` | `website/game/gmhanglong/config/config.php` → `'password'` |
| `__WEB_DB_PASSWORD_REV__` | `website/game/adminphp@2024/rev.php` → PDO |
| `__THESIEUTOC_API_KEY__`, `__MOMO_CALLBACK_SIGNATURE__`, `__REV_QUERY_KEY__`, `__GM_CODE__`, `__GMHANGLONG_CODE__`, `__GM_LOGIN_TOKEN__`, `__MOMO_PHONE__` | `api/card.php`, `api/momoCallback.php`, `adminphp@2024/rev.php`, `gm/config.php`, `gmhanglong/config/config.php`, `gm/user/function/common.php`, `user/naptien.php` |

Rồi che lại ngay để không lỡ commit:

```bash
python tools/mask-secrets.py --mask && python tools/mask-secrets.py --check     # phải "sach"
```

**0.2 Quyết định `PUBLIC_HOST`**: IP public (hoặc domain đã trỏ) của server mới. Người chơi sẽ mở `http://PUBLIC_HOST/play-game`; client kết nối `PUBLIC_HOST:9000` (login), `:8001` (WebSocket game), `:12345`, `:7788`. **Firewall/security group phải mở 80, 9000, 8001, 12345, 7788 và 8080** (hệ thống ID: trình duyệt người chơi đăng nhập OIDC tại `http://PUBLIC_HOST:8080` khi chưa có domain) ra ngoài; các port còn lại (3306, 27017, 5672, 9999, 10010, 10086, 20001, 30001, 18001, 9001, 8090, 8100) chỉ nội bộ — adapter và admin chỉ bind 127.0.0.1.

---

## Bước 1 — (Tuỳ chọn) Dump dữ liệu trên server cũ (15–30 phút, tuỳ DB)

> **Từ 2026-09-05 bước này chỉ cần khi muốn giữ tài khoản/nhân vật cũ.** Không có dump, `initdb/mysql/zz-init.sh` nạp bộ seed sạch trong git (`initdb/mysql/seed/`) và game chạy được ngay; Mongo trống cũng được (service tự tạo collection). Có dump thì mật khẩu trong dump **không** cần khớp `.env` — `zz-init.sh` ghi mật khẩu `.env` vào `tcg.cloud_*`/`staff` sau khi import, và cũng tự đổi `192.168.1.69` → `PUBLIC_HOST` / `127.0.0.1`, nên **bỏ qua đoạn `sed` IP bên dưới**.

```bash
# [CŨ]
scp  root@<PC-hoac-git>:docker/prepare-dumps.sh /tmp/   # hoặc: curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/prepare-dumps.sh -o /tmp/prepare-dumps.sh
export MYSQL_PW='<mật khẩu root mysql>' MONGO_PW='<mật khẩu mongo abc123>'
bash /tmp/prepare-dumps.sh
```

Điểm kiểm tra: `/tmp/tcg-dumps/mysql/` có `00-tcg.sql`, `stat.sql`, `web.sql`, `cdks.sql`, `game_s1.sql` (+ `game_s2…` nếu có); `/tmp/tcg-dumps/mongo/dump/` có `tcg/`, `cross-yzx1/`, `game-s1/` (DB per-server tên `game-<srvCode>`, không phải `mongoCode`) và `admin/`. `statistic/`, `group-offical/` chỉ xuất hiện nếu service đó từng chạy — trên server cũ không có.

**Server cũ (pgaming) không có `mongodump`** (MongoDB 5.0.6 cài tarball ở `/usr/local/mongodb`, `mongod` không tự bật sau reboot). Cách đã dùng 2026-09-05: tải `mongodb-database-tools-rhel70-x86_64-100.9.5.tgz` (62,6 MB, fastdl.mongodb.org) vào `/tmp`, giải nén, `mongod -f /usr/local/mongodb/mongodb.conf`, `mongodump -u abc123 --authenticationDatabase admin --out /tmp/tcg-dumps/mongo/dump`, rồi `mongod --shutdown --dbpath /usr/local/mongodb/data`. Bỏ `admin/` khi đặt vào `docker/initdb/mongo/dump/` (user `abc123` do image tạo từ `.env`; `system.version` của 5.0 không nên restore vào `mongo:4.4`).

**Sửa IP cũ trong dump** (4 dòng đang là `192.168.1.69`: `cloud_device.host_wan`, `srv_cross.url`, `srv_group_device.url`, `srv_login.host_wan`):

```bash
# [CŨ]
grep -c '192\.168\.1\.69' /tmp/tcg-dumps/mysql/00-tcg.sql          # dump 2026-09-05: đúng 4 dòng
sed -i 's/192\.168\.1\.69/<PUBLIC_HOST>/g' /tmp/tcg-dumps/mysql/00-tcg.sql
```

(Trên cùng máy, `PUBLIC_HOST` cũng được vì host network; cross/group gọi nhau qua IP public của chính máy.)

**Không tắt server cũ lúc này** — bước 3 còn rsync dump từ nó, và nó là đường lùi nếu server mới trục trặc. Nếu muốn dữ liệu "đóng băng" (không ai chơi trong lúc chuyển), tắt game trước khi dump: `/h5/server/stop.sh` (script này **xoá log**).

---

## Bước 2 — Bootstrap server mới (10–20 phút)

**Ubuntu — trước bootstrap:** mở port cho client và kiểm tra compose plugin (`apt install docker.io` không kèm plugin):

```bash
ufw allow 9000/tcp && ufw allow 8001/tcp && ufw allow 12345/tcp && ufw allow 7788/tcp && ufw allow 8080/tcp && ufw status numbered   # 8080 = he thong ID
docker compose version || apt-get install -y docker-compose-plugin
apt-get install -y rsync curl
```

`443` chưa dùng: client bundle hardcode `http://PUBLIC_HOST:9000` nên trang phải là `http://`; bật HTTPS sau sẽ gặp mixed-content, cần sửa bundle. Host network nên `ufw` **có** tác dụng với container (khác bridge network); các port nội bộ vẫn đóng.


```bash
# [MỚI]
curl -fsSL https://raw.githubusercontent.com/rickymta/op-h5/main/docker/server-bootstrap.sh | MODE=pull bash
```

`MODE=pull` (khuyến nghị — image đã build sẵn và public trên GHCR): tạo swap 4 GB, **tải `client-assets.tar.gz` từ release vào `/opt/tcg/assets`**, lấy thư mục `docker/` về `/opt/tcg/docker`, kiểm tra port. Không cần git/LFS trên server. (`MODE=build` = clone + build tại chỗ, tốn 611 MB LFS.)

Điểm kiểm tra khi script kết thúc:

```bash
ls /opt/tcg/assets/res | wc -l                              # 10584
ls /opt/tcg/docker                                          # docker-compose.image.yml, .env, initdb/, ...
```

---

## Bước 3 — (Tuỳ chọn, chỉ khi làm Bước 1) Chuyển dump sang server mới (5 phút)

Đã chạy bootstrap không `NO_UP=1` thì stack đang lên với seed; đặt dump xong phải `docker compose -f docker-compose.image.yml down -v` rồi `up -d` lại để MySQL/Mongo khởi tạo lại từ dump.

```bash
# [MỚI]
rsync -avz --progress root@<IP-CŨ>:/tmp/tcg-dumps/mysql/       /opt/tcg/docker/initdb/mysql/
rsync -avz --progress root@<IP-CŨ>:/tmp/tcg-dumps/mongo/dump/  /opt/tcg/docker/initdb/mongo/dump/
ls /opt/tcg/docker/initdb/mysql/ /opt/tcg/docker/initdb/mongo/dump/
```

(Không rsync `res/` nữa — đã có từ release.)

---

## Bước 4 — `.env` (bootstrap đã tự làm; đọc khi cần sửa tay)

Bootstrap gọi `gen-env.sh <PUBLIC_HOST>` khi chưa có `.env`: sinh `TCG_SECRET`, 3 mật khẩu hạ tầng, `CONSOLE_ADMIN_PASSWORD`, mã GM, khoá ký ID, `ID_INTERNAL_SECRET`, `ADAPTER_SECRET_ENC_KEY`, tài khoản owner trang quản trị, và đặt `ID_ISSUER`/`ADAPTER_REDIRECT_URI` theo `http://<PUBLIC_HOST>`. Mật khẩu **không** cần khớp server cũ (zz-init.sh ghi vào DB). Đoạn dưới chỉ để sửa tay:

```bash
# [MỚI]
cd /opt/tcg/docker && nano .env
```

Bắt buộc có: `PUBLIC_HOST`, `TCG_SECRET`, `MYSQL_ROOT_PASSWORD`, `MONGO_PASSWORD`, `RABBITMQ_PASSWORD`, `CONSOLE_ADMIN_PASSWORD` (zz-init.sh ghi vào `tcg.staff`; adapter + GM tool dùng) và các secret PHP muốn bật (nạp thẻ/MoMo/bank). Đổi mật khẩu hạ tầng sau khi DB đã tạo thì phải `down -v`. `ASSETS_DIR=/opt/tcg/assets` giữ nguyên. Heap giữ mặc định lần đầu.

Nền tảng (`id`/`adapter`/`admin`) — chưa có domain thì dùng IP:

```bash
# [MỚI]
H=$(grep ^PUBLIC_HOST= .env | cut -d= -f2-)
sed -i "s|^ID_ISSUER=.*|ID_ISSUER=http://$H:8080|; s|^ADAPTER_REDIRECT_URI=.*|ADAPTER_REDIRECT_URI=http://$H/auth/callback|" .env
sed -i "s|^ADAPTER_SECRET_ENC_KEY=.*|ADAPTER_SECRET_ENC_KEY=$(head -c 32 /dev/urandom | base64)|; s|^ID_INTERNAL_SECRET=.*|ID_INTERNAL_SECRET=$(head -c 32 /dev/urandom | base64)|" .env
printf 'ID_SIGNING_KEY_PEM="%s"\n' "$(openssl genrsa 2048 2>/dev/null)" >> .env      # gia tri nhieu dong trong ngoac kep, de cuoi file
nano .env      # ADMIN_BOOTSTRAP_USER / ADMIN_BOOTSTRAP_PASSWORD
```

Khi có domain: `ID_ISSUER=https://id.<domain>`, `ADAPTER_REDIRECT_URI=https://<game-domain>/auth/callback`, `ID_COOKIE_SECURE=true`, thêm vhost nginx `id.<domain>` → `127.0.0.1:8080`; `platform-seed` cập nhật `oauth_clients.redirect_uris` ở lần `up` kế.

Kiểm tra không còn ô trống bắt buộc:

```bash
grep -E '^(PUBLIC_HOST|TCG_SECRET|MYSQL_ROOT_PASSWORD|MONGO_PASSWORD|RABBITMQ_PASSWORD|CONSOLE_ADMIN_PASSWORD|ID_ISSUER|ADAPTER_REDIRECT_URI|ADAPTER_SECRET_ENC_KEY|ADMIN_BOOTSTRAP_USER|ADMIN_BOOTSTRAP_PASSWORD)=$' .env && echo "CON TRONG" || echo "OK"
grep -c 'BEGIN.*PRIVATE KEY' .env      # 1
```

---

## Bước 5 — Khởi động (10 phút; bootstrap đã `up -d`, đọc khi cần làm lại)

Bootstrap kết thúc bằng `docker compose -f docker-compose.image.yml up -d` (bỏ qua nếu `NO_UP=1`). Muốn làm tay hoặc khởi tạo lại sau khi đặt dump: lên hạ tầng trước, đợi MySQL khởi tạo xong (seed vài giây; dump thật vài phút) — log phải có dòng `[tcg-init] xong (seed)` hoặc `xong (dump)`:

```bash
# [MỚI]  cd /opt/tcg/docker
docker compose -f docker-compose.image.yml up -d mysql mongo rabbitmq
docker compose -f docker-compose.image.yml logs -f mysql | grep -m1 'ready for connections'     # Ctrl+C khi thấy
docker compose -f docker-compose.image.yml ps                                                    # 3 container "healthy"
```

Kiểm tra dữ liệu đã vào:

```bash
docker compose -f docker-compose.image.yml exec mysql mysql -uroot -p"$(grep ^MYSQL_ROOT_PASSWORD= .env | cut -d= -f2-)" -e "SHOW DATABASES; SELECT code,name,ws_port FROM tcg.srv_game;"
docker compose -f docker-compose.image.yml exec mongo mongo -u abc123 -p "$(grep ^MONGO_PASSWORD= .env | cut -d= -f2-)" --authenticationDatabase admin --quiet --eval 'db.adminCommand("listDatabases").databases.map(d=>d.name)'
```

Phải thấy `tcg stat web cdks` và `SELECT` trả về `s1 … 8001` (với seed: `game_s1` xuất hiện khi `game` khởi động, Mongo trống; với dump: thêm `game_s1` và Mongo có `tcg`, `cross-yzx1`, `game-s1`; DB `platform` xuất hiện khi `platform-seed` chạy ở bước kế; `statistic`, `group-offical` do service tự tạo). Kiểm tra zz-init.sh đã điền `.env` vào DB: `docker compose -f docker-compose.image.yml logs mysql | grep tcg-init` → `xong (seed|dump)`. Nếu thiếu DB → volume đã có từ lần chạy trước (init chỉ chạy khi volume trống) hoặc zz-init.sh báo `LOI` (thiếu biến `.env`): `docker compose -f docker-compose.image.yml down -v` rồi làm lại bước 5.

Lên toàn bộ:

```bash
docker compose -f docker-compose.image.yml up -d
watch -n5 'docker compose -f docker-compose.image.yml ps'      # 5–8 phút, tất cả "healthy"
```

Thứ tự tự động: console → world → meta → statistic → pay → group → game → login → cross → php/nginx; song song: `platform-seed` (tạo DB `platform`, đợi `id` migrate xong rồi seed, thoát 0) và `id` → `admin`; `adapter` chờ cả `id`, `platform-seed`, `login`. Nếu một service **unhealthy** lâu, xem log của nó (bước 6). `platform-seed` ở `Exited (0)` là đúng; `Exited (1)` thì xem `logs platform-seed`.

---

## Bước 6 — Kiểm tra (5 phút)

```bash
C="docker compose -f docker-compose.image.yml"
$C logs console   | grep -E 'Started|ERROR' | tail -3
$C logs game      | grep -E '找不到excel|找不到sheet|加载错误|OutOfMemory' ; echo "(rỗng = Excel đủ, heap đủ)"
$C logs group     | grep -iE 'OutOfMemory|GC overhead' ; echo "(rỗng = OK)"
$C logs game      | grep -m1 '游戏启动配置'              # in toàn bộ cấu hình đã resolve (wsPort, mongo, cross)
curl -s -o /dev/null -w 'console %{http_code}\n' http://127.0.0.1:9999/conf/global/get
curl -sI http://127.0.0.1/play-game | head -1              # HTTP/1.1 200
docker stats --no-stream                                   # RAM thật từng container
```

Từ máy khác: mở `http://PUBLIC_HOST/play-game` — client phải nạp được (loading bar), đăng ký/đăng nhập được, vào game được. Nếu client treo ở màn đen: F12 → Console → xem nó gọi `PUBLIC_HOST:9000` hay vẫn `192.168.1.69` (entrypoint chưa thay → kiểm tra `PUBLIC_HOST` trong `.env`, `$C restart nginx php`).

---

## Bước 7 — Sau khi ổn định

- **Hạ heap theo số đo**: sau 30 phút, `docker stats` → sửa `JAVA_XMX_*`/`mem_limit`, `$C up -d` (chỉ service đổi bị tạo lại).
- **Cron dọn log Java** (SSD 40 GB): `echo '0 4 * * * docker compose -f /opt/tcg/docker/docker-compose.image.yml exec -T game find /h5/server -path "*/.logs/*" -name "*.log" -mtime +7 -delete' | crontab -` (tương tự các service khác, hoặc chấp nhận log mất khi container tạo lại).
- **Backup** hàng ngày: xem `docker/README.md` mục 6.
- **Tắt server cũ** khi đã xác nhận người chơi vào được server mới.

---

## Cập nhật về sau

Sửa Excel/PHP/config trên PC → `python tools/mask-secrets.py --check` → commit/push → trên server:

```bash
cd /opt/tcg/src && git pull && git lfs pull && cd docker && docker compose -f docker-compose.image.yml up -d --build
```

Chỉ sửa Excel thì không cần tạo lại container: copy file vào `/h5/server/excel/release/` trong container game rồi `POST /srv/game/cmd/excel/reload` (CLAUDE.md mục 6) — hoặc đơn giản là `--build` như trên.

## Nếu hỏng — quay lại

Server cũ vẫn nguyên cho tới khi bạn chủ động tắt. Trên server mới: `$C down` (giữ DB) hoặc `$C down -v` (xoá DB, import lại dump).
