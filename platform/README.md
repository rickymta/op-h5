# platform/ — hệ thống ID và lớp phiên dịch cho các game

Mã nguồn mới của nền tảng nhiều game, viết bằng Go. Khác với phần còn lại của repo
(vốn là **snapshot triển khai** của một game, không có mã nguồn), thư mục này là mã
nguồn thật và có test.

> **Repo này là public.** Không có giá trị bí mật nào được phép nằm trong file ở đây.
> Khoá ký, mật khẩu DB, client secret đều đọc từ biến môi trường, và thiếu biến bắt
> buộc thì chương trình **dừng ngay lúc khởi động** thay vì chạy tiếp với mặc định.

## Trạng thái

| Thành phần | Trạng thái |
|---|---|
| `cmd/id` — OIDC provider, danh tính, ví | ✅ chạy được, đã kiểm chứng end-to-end |
| `internal/capacity` — cổng giới hạn tải | ✅ logic xong, 14 test |
| `cmd/adapter` — phiên dịch token ID → tài khoản game | ⬜ chưa làm |
| Trang quản trị | ⬜ chưa làm |
| Giao diện 4 bề mặt | ⬜ chưa làm |

## Vì sao logic giới hạn tải nằm ở đây, không nằm trong game

`tcg.srv_game` có sẵn trường `playerMax`, nhưng quét toàn bộ class của login server cho
thấy **không lớp nào đọc nó** — `getConnectTarget()` trả về địa chỉ tiến trình game mà
không kiểm tra tải. Vì các JAR không có mã nguồn, chỗ chặn khả thi duy nhất là lớp
Adapter đặt trước `/srv/game/connect/target`.

Ba tầng ngưỡng, kiểm tra từ trong ra ngoài:

1. **Server** — ngưỡng mềm `N` riêng cho từng dòng `srv_game`.
2. **Máy vật lý** — tổng của mọi server cùng `device_code`.
3. **Toàn game** — chỉ để cảnh báo dung lượng, không dùng để chặn.

`onlineNum` đến từ heartbeat nên luôn trễ một nhịp; Adapter cộng thêm số vé đã cấp kể
từ nhịp gần nhất, nếu không một đợt vào ồ ạt sẽ lọt qua cổng.

## Chạy thử

```bash
# 1. MySQL (dùng chung instance với game cũng được, khác database)
docker run -d --name pf-mysql --network host -e MYSQL_ROOT_PASSWORD=... mysql:8.0

# 2. Khoá ký RSA — KHÔNG commit file này
openssl genrsa -out id-signing.pem 2048

# 3. Chạy
docker build -f platform/Dockerfile --build-arg CMD=id -t op-h5-id platform/
docker run -d --name pf-id --network host \
  -e ID_ISSUER="https://id.example.com" \
  -e ID_DB_PASSWORD="..." \
  -e ID_SIGNING_KEY_PEM="$(cat id-signing.pem)" \
  op-h5-id
```

Migration tự chạy lúc khởi động (`internal/store/migrations/*.sql`, chạy một lần mỗi file).

### Đăng ký một game làm OIDC client

```sql
INSERT INTO oauth_clients (client_id, name, secret_hash, redirect_uris, scopes, require_pkce)
VALUES ('haitac', 'Đại Hải Trình', NULL, 'https://haitac.example.com/auth/callback',
        'openid profile wallet', 1);
```

`secret_hash = NULL` là client công khai — chỉ dựa vào PKCE. Client bí mật thì đặt
chuỗi băm Argon2id.

## Biến môi trường

| Biến | Bắt buộc | Mặc định |
|---|---|---|
| `ID_ISSUER` | ✅ | — URL công khai, phải khớp `iss` trong token |
| `ID_DB_PASSWORD` | ✅ | — |
| `ID_SIGNING_KEY_PEM` | ✅ | — khoá RSA ≥ 2048 bit, PKCS#1 hoặc PKCS#8 |
| `ID_ADDR` | | `:8080` |
| `ID_DB_HOST` / `ID_DB_PORT` / `ID_DB_USER` / `ID_DB_NAME` | | `127.0.0.1` / `3306` / `root` / `platform` |
| `ID_ACCESS_TTL` / `ID_REFRESH_TTL` / `ID_CODE_TTL` | | `15m` / `720h` / `60s` |
| `ID_SESSION_TTL` | | `336h` |
| `ID_COOKIE_SECURE` | | `true` — đặt `false` khi chạy HTTP thuần lúc dev |
| `ID_LOGIN_MAX_ATTEMPT` / `ID_LOGIN_WINDOW` | | `10` / `15m` |

## Test

```bash
go test ./...                                   # bỏ qua test ví nếu không có DB
PLATFORM_TEST_DSN='root:pw@tcp(127.0.0.1:3306)/platform?parseTime=true' go test ./...
```

Phần ví chạy trên MySQL thật chứ không dùng bản giả lập, vì nó phụ thuộc vào giao dịch,
khoá dòng và ràng buộc duy nhất — một bản giả lập trong bộ nhớ sẽ bỏ qua đúng những
thứ cần kiểm.

## Ghi chú thiết kế

**Mật khẩu** dùng Argon2id (64 MiB, 3 vòng, 4 luồng). Chuỗi băm mang theo tham số của
chính nó nên nâng tham số sau này không làm hỏng bản ghi cũ — `NeedsRehash()` báo lúc
nào nên băm lại, và việc đó xảy ra ngay khi người dùng đăng nhập đúng.

**Ví** là sổ cái ghi kép, không phải một cột cộng trừ. Số dư là tổng của các dòng sổ
cái; mỗi giao dịch có `idempotency_key` duy nhất nên callback bắn lại không cộng hai
lần; và mọi giao dịch có tổng đại số bằng 0 nên tiền không tự sinh ra.

**Mật khẩu thật của người chơi không bao giờ tới cụm game.** Adapter giữ một khoá riêng
cho mỗi cặp (người dùng, game) để nói chuyện với login server, nên `tcg.account` trở
thành bảng ánh xạ nội bộ thay vì một kho tài khoản thứ hai.
