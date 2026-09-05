# Thiết kế: Cửa hàng — mua gói và đổi Xu → Nguyên Bảo từ ví hệ thống ID

Bản điều tra + thiết kế, 2026-09-05. Mục 8 là quyết định của người vận hành, mục 9 là những gì đã làm (build/test xanh trên PC, chưa chạy thật) và còn lại. Mục 7 là kế hoạch gốc.

## 1. Những gì đã có, những gì vừa phát hiện

### 1.1 Tiền và vật phẩm trong game

| Khái niệm | Trong game | Chuỗi vật phẩm | Ghi chú |
|---|---|---|---|
| Nguyên Bảo (元宝) — "kim cương" | tiền cao cấp | `0:1:N` | `gm/item.txt`: `0:1` = "Nguyên bảo" |
| Kim tệ (金币) | tiền thường | `0:0:N` | |
| EXP anh hùng | | `0:4:N` | |
| Vật phẩm / mảnh / trang bị… | | `3:tid:N`, `4:tid:N`, `2:tid:N`… | tên Việt trong `gm/item.txt` (1.072 dòng) |

Chuỗi quà nhiều món nối bằng `#`: `0:1:500#3:100001:1000#0:0:5000000`.

### 1.2 Hai cách đưa thứ gì đó vào tài khoản người chơi

| Cách | API console | Game làm gì | Dùng khi |
|---|---|---|---|
| **A. Nạp một "mục nạp"** (充值项, `recharge-item.xlsx`) | `POST /gm/pay/manual` với `PayRecord{itemTid=ID mục nạp, itemCount, payAmount, srvCode, accountUid…}` → pay server → game `pay/deliver` → `PayDeliverExe.exeFunc` | Xử lý **như một lần nạp thật**: cộng Nguyên Bảo theo mốc, x2 lần đầu, cộng điểm VIP (`vip积分`), tích nạp, nạp đầu, kích hoạt thẻ tháng/quỹ/đặc quyền… Mỗi mục nạp có `功能ID` → module tương ứng kiểm tra điều kiện mua (`PayAvailable.check`: giới hạn ngày, VIP, ngày mở server) | Đổi Xu → Nguyên Bảo, mua thẻ tháng, quỹ, đặc quyền, gói ngày… |
| **B. Gửi thư kèm quà** | `POST /gm/mail/x/create` `{gmMailEntity:{type:2, operation:12, title, content, reward:"0:1:N#…"}, gmMailTars:[{srvCode, masterIdHex, roleId, …}]}` rồi `gm/mail/x/complete` | Thư vào hòm, người chơi nhận | Gói vật phẩm web tự định nghĩa (như `web.webshop` cũ), đền bù |

Adapter hiện tại chỉ có đường A (`platform/internal/grants/worker.go` → `PayManual`). GM tool `gmhanglong/gm/api.php` dùng cả hai (nạp = INSERT `tcg.pay_approval` + `completeApproval`; gửi đồ = mail).

### 1.3 Dữ liệu nguồn của "gói"

- **`recharge-item.xlsx` sheet 充值项** — 1.934 mục nạp: `ID, 名称, 额度 (= giá, đơn vị VND), 功能ID, 商品ID, vip积分`. 86 `功能ID` khác nhau; phần lớn là gói theo sự kiện/giới hạn (每日限购, 周限购, 迎新大促, 战令…).
- **`recharge-benefit.xlsx`** (充值福利) — mô tả nội dung, **có tên tiếng Việt**:
  - `付费充值`: **8 mốc đổi Nguyên Bảo** — `18001…18008`, giá 10k → 2.000k VND, `基础元宝 = giá` (1 VND = 1 Nguyên Bảo), `首冲赠送元宝 = giá` (lần đầu x2).
  - `月卡`: Thẻ tháng vinh diệu (100k → 20.000/ngày × 30), Thẻ tháng chí tôn (200k → 40.000/ngày).
  - `月基金`: Quỹ đặc biệt 100k (`17001`, giá ưu đãi `17101` 50k), Quỹ sa hoa 200k (`17002`/`17202`); `成长基金 12001`, `爬塔基金 13001`, `种族塔基金 13002` (50k).
  - `特权商城`: 5 đặc quyền (`20001…20005`, 15k–100k), `超级特权 31001` (300k), 8 thẻ tuần (`31002…31009`).
  - `每日礼包`: 9 gói ngày `19001…19009` theo **ngày mở server** (1–14, 15–30, 31+), giới hạn 3/ngày, có yêu cầu VIP; `一键购买 19101`.
  - `全服限购商品`: Quà rút tướng `27001` (3k, giá gốc 30k), `27002`, `27003`.
  - `钜惠礼包`, 周/月限购, sự kiện lễ…: gói theo điều kiện/thời điểm, game tự bật tắt.
- **`gmhanglong/gm/pay.txt`** — 1.918 dòng `payId,tên Việt,giá Nguyên` cho **toàn bộ** mục nạp (tên máy dịch, cần sửa cho ~30 mục hiển thị).
- **`web.webshop`** (bảng seed, 9 dòng) — gói vật phẩm web cũ, ví dụ `500 vạn KNB` = `0:1:5000000` giá 1.500.000 xu (tỷ giá 1 xu = 3,3 Nguyên Bảo — hào phóng hơn mốc nạp 1:1; phải quyết định giữ hay bỏ).

### 1.4 Trang `/quy-doi` hiện tại không dùng được cho người chơi

`docker/platform-seed/game_packages.haitac.sql` nạp **1.962 gói = toàn bộ 充值项** từ `api/id.txt`, tên tiếng Trung, không phân loại, không điều kiện, không mô tả. Người chơi thấy 1.962 nút. Phần lõi (ví, sổ cái, `game_grants`, worker, idempotency) thì tốt và giữ nguyên.

### 1.5 Mua từ **trong game** — phát hiện quan trọng

Client có nút mua ở mọi shop trong game. Đường đi (đọc từ bytecode `tcg-game.jar`, lớp `PayWithTokenMoneyReq`, mã message `pay_with_token_money_req = 1`):

1. Client gọi `GET /api/api.php?payid=<ID>` → PHP cũ trả `true`/`false` theo số dư `web.user.xu` (chỉ để hiện/ẩn nút).
2. Client gửi `PAY_REQ` lên game server.
3. **Game server tự gọi `GET http://hakihuyenthoai.net/api/apisv.php?payid=<ID>&user=<tcg.account.username>`** — domain **hardcode trong bytecode**. Nếu body đúng bằng `true`: `PayAvailable.check` → `BagPropPO.removeItem(999999, giá)` → `PayDeliverExe.exeFunc` (phát ngay, không qua pay server). PHP `apisv.php` cũ trừ `web.user.xu` rồi trả `true`.

Hệ quả:
- Trên server mới, `hakihuyenthoai.net` không trỏ về ta → mọi nút mua trong game **chết**. Tệ hơn: ai chiếm được domain đó và trả `true` là **mua miễn phí toàn bộ shop**. Bắt buộc ghim hostname về loopback (`extra_hosts: hakihuyenthoai.net:127.0.0.1` cho các container Java) và chỉ nhận request từ loopback.
- `removeItem(999999, giá)`: mã 999999 **không có** trong bảng vật phẩm nào (chỉ có một nhiệm vụ id 999999). Chưa rõ hàm này trả về thành công hay thất bại khi túi không có món đó → **phải test thật** (mục 8). Nếu thất bại thì đường mua trong game không dùng được, chuyển sang phương án `payRedirect` (mục 4.3).
- Pay server còn đường **mock SDK** (`/yzx/pay/mock`, ký bằng hằng số `8c2c…` trong JAR) và `app.secret_key` trong dump **đúng bằng** hằng số đó — tức server cũ chấp nhận callback giả. Seed mới sinh khoá ngẫu nhiên nên đường này đã đóng; **giữ nguyên**, không bao giờ đặt lại khoá cũ.
- `GiftCodeUseReq` gọi `http://auth.huiwansdk.redekuai.com/api/giftCode.php` (hardcode) khi `srv_game_ext.z10GiftCode` bật — CDK của `gmhanglong/cdk` không đi qua đó; ngoài phạm vi, chỉ ghi nhận.

## 2. Mục tiêu

Một trang **Cửa hàng** (thay `/quy-doi`) cho người chơi đã đăng nhập hệ thống ID, ba việc:

1. **Đổi Xu → Nguyên Bảo**: 8 mốc `18001…18008`, đúng luật game (1 Xu = 1 Nguyên Bảo, lần đầu x2, cộng VIP) — đường A.
2. **Mua gói**: thẻ tháng, quỹ, đặc quyền, gói ngày, gói giới hạn — đường A, có mô tả tiếng Việt và điều kiện; cộng gói vật phẩm web tự định nghĩa — đường B.
3. **Nút mua trong game trừ cùng một ví**: thay `apisv.php`/`api.php` bằng endpoint của Adapter.

Không làm: nạp Xu (đã có ở `id.<domain>/tai-khoan`), đổi ngược Nguyên Bảo → Xu, bán coin giữa người chơi (`sellcoin` cũ).

## 3. Dữ liệu

### 3.1 Mở rộng `platform.game_packages` (migration `0007`)

| Cột mới | Kiểu | Ý nghĩa |
|---|---|---|
| `category` | ENUM `diamond, card, fund, privilege, daily, limited, event, item, ingame` | nhóm hiển thị; `ingame` = không hiện trên web, chỉ để tra giá khi mua trong game |
| `grant_mode` | ENUM `pay, mail` | A hay B |
| `reward` | VARCHAR(512) | chuỗi `type:id:count#…` (chỉ `mail`) |
| `description` | VARCHAR(512) | nội dung quà tiếng Việt, sinh từ `reward`/`recharge-benefit` + `item.txt` |
| `func_id`, `shop_item_id`, `vip_points` | INT, INT, BIGINT | từ 充值项 |
| `server_day_min`, `server_day_max` | INT NULL | từ `每日礼包` |
| `daily_limit`, `vip_required` | INT NULL | từ `每日礼包` |
| `badge` | VARCHAR(32) NULL | ví dụ `x2 lần đầu`, `Giảm 50%` |
| `icon` | VARCHAR(64) NULL | |

Giữ `price_xu`, `item_tid` (= ID mục nạp với `pay`), `status`, `sort_order`. **Giữ cả 1.962 dòng** nhưng `status='hidden'`/`category='ingame'` cho những mục không bán trên web: mua trong game cần tra giá theo `payid`.

`game_grants`: thêm `grant_mode`, `reward` (copy lúc tạo lệnh để worker không phụ thuộc bảng gói về sau).

### 3.2 Sinh dữ liệu — `tools/gen-game-packages.py` v2 (chạy trên PC, có Excel JSON)

Nguồn: `server/excel-src/recharge-item` (ID, 额度, 功能ID, 商品ID, vip积分) + `server/excel-src/recharge-benefit` (tên Việt, nội dung, điều kiện) + `gm/pay.txt` (tên Việt dự phòng) + `gm/item.txt` (tên vật phẩm để dựng `description`). Danh mục theo `功能ID`:

| `功能ID` | category | Nguồn tên/nội dung |
|---|---|---|
| 710 | diamond | `付费充值` |
| 730, 732, 734, 750 | fund | `成长基金`, `爬塔基金`, `种族塔基金`, `月基金` |
| 13600, 13800, 14000, 14500, 17100 + `月卡` | card | `月卡`, `pay.txt` |
| 721, 722, 723 | privilege | `特权商城`, `超级特权` |
| 720 | daily | `每日礼包` |
| 13700 | limited | `全服限购商品` |
| còn lại | ingame (ẩn) | `pay.txt` |

Tên hiển thị ~35 mục lấy từ `recharge-benefit` (đã tiếng Việt chuẩn), còn lại từ `pay.txt` (máy dịch, không hiện). File sinh ra vẫn `ON DUPLICATE KEY UPDATE` nhưng **không ghi đè** `name`, `description`, `status`, `badge` đã sửa tay trong DB.

Gói `item` (đường B) không sinh từ Excel: quản trị thêm tay (bảng cũ `web.webshop` làm mẫu, 9 dòng).

## 4. Luồng

### 4.1 Mua trên web (giữ lõi hiện có)

`POST /api/game/convert {package_id, srv_code, role_id, idempotency_key}` → `wallet.Convert` (khoá số dư `FOR UPDATE`, ghi `ledger_txns kind=convert`, 2 dòng sổ cái, `game_grants pending`) → worker `Tick` ngay → console. Thêm: worker rẽ nhánh theo `grant_mode`: `pay` như hiện nay; `mail` gọi `MailCreate` + `MailComplete` (cần thêm 2 hàm vào `platform/internal/console`). Trả về cho client: `txn`, `balance`, trạng thái `pending`; trang tự hỏi `GET /api/game/orders` mỗi 3 s tới `granted`/`failed`.

Thất bại phát hàng (console trả lỗi, ví dụ `PayAvailable.check` từ chối vì hết lượt ngày): worker đánh `failed` sau N lần; **hoàn Xu tự động** bằng `ledger_txns kind=refund` (idempotency `refund-<txn>`) và báo "Gói này hiện không mua được trong game, đã hoàn Xu". Hiện chưa có hoàn tự động — phải thêm.

### 4.2 Mua trong game — Adapter đóng vai `apisv.php`

nginx (`game_site.conf`):

```
location = /api/api.php   { proxy_pass http://127.0.0.1:8090/api/game/legacy/check; ... }   # client gọi, cần cookie phiên
location = /api/apisv.php { allow 127.0.0.1; allow ::1; deny all;
                            proxy_pass http://127.0.0.1:8090/api/game/legacy/charge; ... }  # chỉ game server gọi
```

Compose: `extra_hosts: ["hakihuyenthoai.net:127.0.0.1"]` cho `x-java` (host network vẫn ghi được `/etc/hosts` container). Trên Mac `dev-macos.sh` thêm `--add-host`.

Adapter:
- `GET /api/game/legacy/check?payid=` — từ cookie phiên ID → số dư ≥ giá gói → `true`/`false` (text/plain, đúng chuỗi client so sánh).
- `GET /api/game/legacy/charge?payid=&user=` — `user` là `tcg.account.username` (dạng `id000000001` với tài khoản do Adapter tạo, hoặc tên cũ với người chơi di trú) → tra `game_identities` → `user_id`; tra `game_packages` theo `package_id = payid` (mọi `status`); `wallet.Convert` với `grant_mode='ingame'` (**không** tạo lệnh phát hàng — game tự phát sau `true`); trả `true`; mọi lỗi trả `false` (không bao giờ trả HTML/500, game so sánh chuỗi). Idempotency `ingame-<user>-<payid>-<epoch/10s>`: game gọi đúng một lần mỗi lần bấm; hai lần bấm trong 10 s coi là một.
- Ghi `game_grants` với `status='granted', grant_mode='ingame'` để lịch sử đủ.

Rủi ro chấp nhận: game trừ Xu xong mới chạy `PayAvailable.check`/`removeItem`; nếu bước sau thất bại thì Xu đã mất. Giảm thiểu: `legacy/check` đã lọc số dư; điều kiện mua thì client chỉ hiện nút khi game cho phép. Cần log rõ để đối soát.

### 4.3 Phương án dự phòng nếu 4.2 không chạy (kết quả test 999999)

`YzxOrderBuildReq` đọc `GameLoading.payRedirect` (hiện `0`) và `app.client_path` (`H5`). Khả năng: `payRedirect=1` làm client mở trang web thay vì mua tại chỗ. Nếu vậy: đặt `payRedirect=1` (cấu hình console) và `client_path` = `https://haitac.<domain>/cua-hang?payid=` → trang web nhận `payid`, hiện đúng gói, mua bằng 4.1. Chỉ dùng khi 4.2 thất bại; cũng phải test.

## 5. Giao diện `/cua-hang` (thay `/quy-doi`, giữ đường cũ chuyển hướng)

Mobile-first 375 px như phần còn lại của Adapter (`shell.html`), desktop là lưới.

```
┌──────────────────────────────────────────────┐
│ Số dư: 1.250.000 Xu        [Nạp thêm Xu →]   │  ← link id.<domain>/tai-khoan
│ Máy chủ: S1 · Nhân vật: Hằng Nga (tự chọn)   │  ← từ masterList; chỉ hỏi khi >1
├──────────────────────────────────────────────┤
│ [Nguyên Bảo] [Thẻ & Quỹ] [Đặc quyền] [Gói]   │  ← tab = category
├──────────────────────────────────────────────┤
│ ┌ 10.000 Xu ────────┐ ┌ 20.000 Xu ────────┐  │
│ │ 10.000 Nguyên Bảo  │ │ 20.000 Nguyên Bảo  │  │
│ │ x2 lần đầu · VIP+10k│ │ x2 lần đầu · VIP+20k│ │
│ │        [Đổi]       │ │        [Đổi]       │  │
│ └────────────────────┘ └────────────────────┘  │
│ …8 mốc…                                        │
├──────────────────────────────────────────────┤
│ Lịch sử: 10.000 Xu → 18001 · S1 · đã phát ✔  │
│          100.000 Xu → Quỹ đặc biệt · đang phát…│
└──────────────────────────────────────────────┘
```

- Thẻ gói: tên Việt, nội dung quà (3 dòng đầu + "…"), giá Xu, badge, điều kiện ("ngày 1–14 sau mở server", "3 lần/ngày", "VIP ≥ 2") — chỉ hiển thị, game vẫn là nơi quyết định.
- Bấm mua → modal xác nhận (gói, giá, máy chủ/nhân vật, số dư sau) → POST → thẻ chuyển "đang phát" → "đã phát, vào game nhận". Không có "mua lại" ngay trong 10 s.
- Không đủ Xu: nút thành "Thiếu N Xu · Nạp thêm".
- Chưa vào game lần nào (`no_game_account`): chặn với hướng dẫn "vào game một lần".
- Lịch sử 20 dòng từ `ledger_entries` + `game_grants` (kể cả `ingame`).

## 6. Quản trị

- Trang `Gói` trong `cmd/admin`: bảng `game_packages` lọc theo category/status; sửa tên, mô tả, giá, badge, ẩn/hiện; thêm gói `item` (nhập chuỗi `reward`, có xem trước tên vật phẩm từ `item.txt`).
- Trang `Đơn mua`: `game_grants` với trạng thái, lỗi, nút "phát lại"/"hoàn Xu".
- Nhật ký: mọi sửa ghi `admin_audit` (đã có).

## 7. Kế hoạch làm — theo thứ tự

| # | Việc | Ở đâu | Phụ thuộc |
|---|---|---|---|
| 1 | **Test đường mua trong game** trên Mac: trỏ `hakihuyenthoai.net` → 127.0.0.1, dựng endpoint tạm trả `true`, bấm mua trong game, xem `removeItem(999999)` và `PayDeliverExe` trong log; thử `payRedirect=1` | Mac | không |
| 2 | Migration `0007` + `gen-game-packages.py` v2 + seed `game_packages.haitac.sql` mới | PC (cần Excel JSON) | không |
| 3 | Adapter: `wallet.Convert` nhận `grant_mode`; worker nhánh `mail`; console client `MailCreate/MailComplete`; hoàn Xu tự động khi `failed` | Mac | 2 |
| 4 | Adapter: `/api/game/legacy/check`, `/legacy/charge`; nginx 2 location; compose `extra_hosts`; dev-macos `--add-host` | Mac | 1 |
| 5 | Trang `/cua-hang` (template + JS), `/api/game/packages?category=`, `/api/game/orders` | Mac | 2, 3 |
| 6 | Admin: trang Gói, trang Đơn mua | Mac | 2 |
| 7 | Sửa tên/mô tả ~35 gói hiển thị trong DB qua admin | bạn | 6 |

## 8. Quyết định (2026-09-05, người vận hành)

1. **Tỷ giá**: giữ cả hai — 8 mốc nạp 1 Xu = 1 Nguyên Bảo (đường A, có x2 lần đầu và VIP) **và** gói vật phẩm web cũ (`500 vạn KNB` = 1,5 triệu Xu qua thư, đường B). Giá gói web sửa được ở trang quản trị.
2. **Gói sự kiện/giới hạn**: hiện trên web (tab "Gói sự kiện", tên máy dịch từ `pay.txt`). Game từ chối → hoàn Xu.
3. **Hoàn Xu tự động** khi console từ chối hoặc hết lần thử.
4. **`payRedirect`**: chấp nhận mọi nút mua trong game mở tab web nếu đường 4.2 không chạy.

## 9. Đã làm (commit sau 2026-09-05 đêm) và còn lại

Đã làm trên PC, build và test xanh, **chưa chạy thật**:

- Migration `0007_store_catalog.sql`: cột nhóm/cách phát/quà/mô tả/điều kiện cho `game_packages`; `game_grants` thêm `grant_mode`, `reward`, `refund_txn_id`, trạng thái `refunded`.
- `tools/gen-game-packages.py` v2 → `docker/platform-seed/game_packages.haitac.sql`: 1.933 gói (8 diamond, 8 card, 7 fund, 6 privilege, 10 daily, 15 limited, 1.870 event, 9 item), tên Việt từ `recharge-benefit`/`NAMES`/`pay.txt`, mô tả từ chuỗi quà + `item.txt`. 38 mã trong `id.txt` không có trong Excel bị bỏ. 52 mục lệch giá giữa `id.txt` và `额度` — giữ `id.txt`, in cảnh báo.
- `platform/internal/wallet`: `Package` đầy đủ cột, `Convert` có `Mode=ingame` (trừ Xu, không tạo lệnh phát), `RefundGrant` (idempotent theo txn), `Orders`/`RecentOrders`/`RetryGrant`.
- `platform/internal/console`: `RejectedError` (lỗi nghiệp vụ, không thử lại), `MailCreate`/`MailComplete` theo khuôn `gm/api.php` — **khuôn phản hồi id phiếu thư chưa kiểm chứng**.
- `platform/internal/grants`: nhánh `mail`, hoàn Xu tự động khi console từ chối / hết lần thử / thiếu dữ liệu.
- Adapter: `/cua-hang` (tab theo nhóm, chọn nhân vật từ `masterList`, xác nhận, đơn gần đây tự cập nhật), `/quy-doi` → 301, `/api/game/packages?category=`, `/api/game/orders`, `/api/game/roles`, **`/api/game/legacy/check`** (thay `api/api.php`) và **`/api/game/legacy/charge`** (thay `api/apisv.php`, chỉ loopback).
- nginx `game_site.conf`: `/cua-hang`, `/api/api.php`, `/api/apisv.php` (allow loopback). Compose (cả hai) `extra_hosts: hakihuyenthoai.net:127.0.0.1` cho mọi container Java; `dev-macos.sh` đặt `--add-host` ở `op-net`.
- Admin: `/goi` (lọc, sửa tên/giá/nhãn/mô tả/ẩn, thêm gói thư), `/don-mua` (phát lại, hoàn Xu).
- `platform-seed.sh` đợi cột `category` (image `id` cũ chưa có 0007 thì seed dừng có thông báo).

Còn lại — test trên Mac theo `docs/mac-test-brief.md` mục 0b: nút mua trong game (`removeItem(999999)`), khuôn `data` của `/gm/mail/x/create`, và toàn bộ trang cửa hàng với JAR thật.
