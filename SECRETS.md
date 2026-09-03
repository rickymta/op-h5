# Secrets đã được che để push repo public

Các file dưới đây chứa placeholder thay cho giá trị thật. **Server và website không chạy được cho tới khi điền lại.**

Cách điền: tạo `secrets.env` (đã nằm trong `.gitignore`) dạng `KEY=VALUE`, rồi:

```bash
python tools/mask-secrets.py --fill secrets.env
```

Bản gốc trước khi che nằm ở `_backup-secrets-original/` (không push). `python tools/mask-secrets.py --restore` để lấy lại.

| Placeholder | Ý nghĩa |
|---|---|
| `__TCG_SECRET__` | tcg.secret dung chung MOI service Java (env.yml + login/application.yml) — phai giong nhau |
| `__MYSQL_ROOT_PASSWORD__` | MySQL root (server env.yml/global.conf.json + moi file PHP ket noi DB web/tcg/cdks) |
| `__MONGO_PASSWORD__` | MongoDB user abc123 (console/statistic env.yml, global.conf.json) |
| `__RABBITMQ_PASSWORD__` | RabbitMQ user admin (global.conf.json) |
| `__CONSOLE_ADMIN_PASSWORD__` | Tai khoan admin cua console :9999 (gmhanglong/config/config.php) |
| `__WEB_DB_PASSWORD_REV__` | Mat khau PDO rieng trong adminphp@2024/rev.php (khac cac file khac — kiem tra lai cai nao dung) |
| `__THESIEUTOC_API_KEY__` | APIkey nap the cao thesieutoc.net (api/card.php) |
| `__MOMO_CALLBACK_SIGNATURE__` | Chu ky callback MoMo (api/momoCallback.php) |
| `__REV_QUERY_KEY__` | Query key cua adminphp@2024/rev.php (check.php goi rev.php?key=...) |
| `__GM_CODE__` | Ma GM cua website/game/gm (gm/config.php $gmcode) |
| `__GMHANGLONG_CODE__` | Ma uy quyen GM cua gmhanglong (config/config.php $gm_code) |
| `__GM_LOGIN_TOKEN__` | JWT Login-Token hardcode trong gm/user/function/common.php (da het han; lay token moi qua staff/login) |
| `__MOMO_PHONE__` | So dien thoai nhan MoMo trong link QR (user/indexapk.php) |

## File bị che

- `server/console/config/env.yml`
- `server/statistic/config/env.yml`
- `server/cross/config/env.yml`
- `server/game/config/env.yml`
- `server/group/config/env.yml`
- `server/meta/config/env.yml`
- `server/pay/config/env.yml`
- `server/world/config/env.yml`
- `server/login/application.yml`
- `server/console/store/global.conf.json`
- `website/game/api/config.php`
- `website/game/api/api2.php`
- `website/game/api/apisv.php`
- `website/game/api/apiapk.php`
- `website/game/new/config.php`
- `website/game/adminphp@2024/db.php`
- `website/game/adminphp@2024/thongbao.php`
- `website/game/adminphp@2024/rev.php`
- `website/game/adminphp@2024/check.php`
- `website/game/api/card.php`
- `website/game/api/momoCallback.php`
- `website/game/gm/config.php`
- `website/game/gmhanglong/config/config.php`
- `website/game/gm/user/function/common.php`
- `website/game/user/indexapk.php`
- `website/game/user/naptien.php`
- `website/game/user/naptien2.php`

## Không nằm trong git (theo `.gitignore`)

- `server/login/fs-huawei.yezixigame.com.keystore`
- `server/*/.logs/` — log in ra toàn bộ cấu hình kể cả mật khẩu lúc khởi động
- `docker/.env`, `docker/initdb/mysql/*.sql`, `docker/initdb/mongo/dump/`, `secrets.env`

## Mẫu `secrets.env`

```
__TCG_SECRET__=
__MYSQL_ROOT_PASSWORD__=
__MONGO_PASSWORD__=
__RABBITMQ_PASSWORD__=
__CONSOLE_ADMIN_PASSWORD__=
__WEB_DB_PASSWORD_REV__=
__THESIEUTOC_API_KEY__=
__MOMO_CALLBACK_SIGNATURE__=
__REV_QUERY_KEY__=
__GM_CODE__=
__GMHANGLONG_CODE__=
__GM_LOGIN_TOKEN__=
__MOMO_PHONE__=
```
