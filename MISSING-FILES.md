# Danh sách file thiếu / cần lấy lại

Kết quả đối chiếu tự động giữa snapshot này với:
- log khởi động của các service Java (`server/*/.logs/`)
- manifest tài nguyên client (`website/game/libs/2af72-f100c-2af72.json`, JSON nén deflate — 11.192 entry)
- các tham chiếu `include`/`require`/`curl_init` trong toàn bộ file PHP
- index sheet của toàn bộ 214 workbook Excel (824 sheet duy nhất)

Chia làm 2 nhóm: **A — phải lấy từ máy Linux gốc** (không thể tái tạo), và **B — sửa được ngay tại đây** (không cần cung cấp gì).

---

# A. CẦN LẤY TỪ MÁY LINUX GỐC

## A1. 10 file Excel cấu hình — ưu tiên cao nhất

> **QUAN TRỌNG — cập nhật sau khi vá bytecode:** tên file Excel đã chuyển sang tiếng Anh (xem CLAUDE.md mục 14).
> Mọi file lấy từ bản gốc về **phải được rename theo `tools/excel-name-map.json`** trước khi đặt vào `server/excel/release/`,
> nếu không server sẽ không tìm thấy. Cột "Lưu thành tên" dưới đây là tên bắt buộc.


**Đính chính:** 10 file này **cũng không có trên server Linux của bạn**. Log báo thiếu chính là do host `pgaming` tại `/h5/server` sinh ra (`server/game/.logs/game-s1/error.log`), nên copy từ chính server đó sẽ không giải quyết được gì. Nguồn phải là: bộ cài gốc từ nhà phát hành, một server khác chạy cùng bản game, hoặc backup cũ trước khi mất file.

**Trạng thái (2026-09-03): đã xử lý xong bằng cách tái tạo từ bytecode** — chi tiết ở [docs/missing-excel-reconstruction.md](docs/missing-excel-reconstruction.md).
- 5 file **tái tạo** trong `reconstructed/`, kiểm chứng bằng parser thật của game: `hero-week-card`, `jade-shop` (dữ liệu mượn từ file anh em), `friend-invite`, `free-buy`, `rejiang-hero-starup` (giá trị đặt tạm).
- 5 file **BT bỏ qua**: tính năng BT bị gate bởi `gameVer == BT`, server chạy MAINLAND nên không bao giờ chạy.
- **Đã copy vào `server/excel/release/`** (2026-09-03).

Đã xác nhận không tồn tại trong snapshot (kể cả sau khi decode tên mojibake):

| # | Tên file | Loader Java | Tính năng bị mất |
|---|---|---|---|
| 1 | `英雄周卡.xlsx` | `activity.cycle.weekcard.hc.excel.HCExcel` | Thẻ tuần anh hùng |
| 2 | `仙玉商城.xlsx` | `res.jade.excel.JadeExcel` | Shop Tiên Ngọc |
| 3 | `好友邀请.xlsx` | `activity.friendinvite.FriendInviteExcel` | Mời bạn bè |
| 4 | `0元购.xlsx` | `activity.cycle.freebuy.FreeBuyExcel` | Mua 0 đồng |
| 5 | `热江英雄升星.xlsx` | `rejiang.RejiangHeroStarUpExcel` | Nâng sao tướng (Nhiệt Giang) |
| 6 | `BT月卡.xlsx` | `bt.monthcard.BtMonthCardExcel` | Thẻ tháng BT |
| 7 | `BT假累计充值.xlsx` | `bt.dailycharge.BtDailyChargeExcel` | Tích nạp giả BT |
| 8 | `BTBUG商店.xlsx` | `bt.bugmall.BtBugMallExcel` | Shop BUG BT |
| 9 | `bt首充.xlsx` | `bt.firstpay.BtFirstPayExcel` | Nạp đầu BT |
| 10 | `BT潘达福利.xlsx` | `activity.cycle.panda.excel.PandaExcel` | Phúc lợi Panda BT |

> Nhóm `BT*` (5 file) là các tính năng "BT server" — nếu bản chạy không dùng thì có thể bỏ qua, server vẫn lên. 5 file còn lại là tính năng thường.

**Tên file gốc trên server → tên phải lưu thành:**

| Trên server Linux | Lưu thành tên |
|---|---|
| `英雄周卡.xlsx` | `hero-week-card.xlsx` |
| `仙玉商城.xlsx` | `jade-shop.xlsx` |
| `好友邀请.xlsx` | `friend-invite.xlsx` |
| `0元购.xlsx` | `free-buy.xlsx` |
| `热江英雄升星.xlsx` | `rejiang-hero-starup.xlsx` |
| `BT月卡.xlsx` | `bt-month-card.xlsx` |
| `BT假累计充值.xlsx` | `bt-fake-cumulative-recharge.xlsx` |
| `BTBUG商店.xlsx` | `bt-bug-shop.xlsx` |
| `bt首充.xlsx` | `bt-first-recharge.xlsx` |
| `BT潘达福利.xlsx` | `bt-panda-benefit.xlsx` |

## A2. 6 sheet thiếu bên trong workbook đã có

**Trạng thái (2026-09-03): đã chèn cả 6 sheet vào workbook trong `server/excel/release/`** bằng `tools/xlsx-add-sheet.py`; **6/6 đã qua parser thật của game** (`ExcelProbe` cho 3 workbook, `SheetProbe` cho 2 sheet `基金`). Chi tiết: [docs/missing-excel-reconstruction.md](docs/missing-excel-reconstruction.md). Bản gốc: `reconstructed/originals/`.

Log báo `找不到sheet` (không phải `找不到excel`) → **workbook có sẵn, chỉ thiếu sheet bên trong**. Cần copy sheet từ bản gốc sang.

| Sheet | Workbook đích | Loader | Ghi chú |
|---|---|---|---|
| `仙玉基金` | `充值福利.xlsx` | `pay.PayExcel` | Workbook này đã có `成长基金`, `月基金`, `爬塔基金`, `种族塔基金`, `快速作战基金` |
| `元宝基金` | `充值福利.xlsx` | `pay.PayExcel` | (như trên) |
| `冠军赛竞猜随机奖励` | `冠军赛.xlsx` | `pvp.champion.ChampionExcel` | Hiện chỉ có `冠军赛回合`, `冠军赛排行榜奖励` |
| `三十六重天排行榜` | `三十六重天.xlsx` | `farm.tsday.DayExcel` | Hiện có 6 sheet, thiếu sheet xếp hạng |
| `BT免费连充基础` | **chưa xác định** | `activity.cycle.accpay.CycleAccPayExcel` | Không có workbook nào chứa sheet tên `*连充*`. Ứng viên: `循环活动.xlsx`, `循环活动表二.xlsx`, `充值福利.xlsx` — cần đối chiếu bản gốc |
| `BT免费连充奖励` | **chưa xác định** | `activity.cycle.accpay.CycleAccPayExcel` | (như trên) |

## A3. 5 sheet có sẵn nhưng sai định dạng ô

Không thiếu file — server parse lỗi vì ô để kiểu Number trong khi code đọc String. Sửa được tại đây (đổi định dạng ô về **Text**) hoặc lấy lại workbook gốc:

| Sheet | Workbook | Lỗi |
|---|---|---|
| `英雄高阶献祭星级` | `英雄献祭.xlsx` | `Cannot get a STRING value from a NUMERIC cell` |
| `每日邀请` | `邀请.xlsx` | `Cannot get a STRING value from a NUMERIC cell` |
| `估值` | `预警.xlsx` | `Cannot get a STRING value from a NUMERIC cell` |
| `鸿运当头礼包` | `鸿运当头.xlsx` | `Cannot get a STRING value from a NUMERIC cell` |
| `圣诞树奖励` | `圣诞树.xlsx` | `NumberFormatException: null` tại rowId 0 |
| `皮肤激活道具` | `物品表.xlsm` | `NullPointerException` tại `SrvEnv.gameVer` — **đây là bug code, không phải lỗi dữ liệu**; chỉ xảy ra ở `world` server |

## A4. File PHP thiếu

| File | Bị gọi từ | Tác động |
|---|---|---|
| `website/game/gmhanglong/gm/coin.php` | `website/game/new/config.php` — POST tới `http://192.168.1.69/gmhanglong/gm/coin.php` tại **5 vị trí** | **Chức năng đổi xu → KNB đang hỏng hoàn toàn.** Đây là file thiếu nghiêm trọng nhất ở tầng web |
| `website/game/a3b31-4c087-1dc2f-hiente.js` | `website/game/hiente.php` | Loader cho biến thể domain khác — `hiente.php` hiện không chạy được |

## A5. Thư mục thiếu ở webroot

| Đường dẫn | Bị tham chiếu từ | Nội dung cần |
|---|---|---|
| `website/game/cli/houtai/` | Client bundle: `/cli/houtai/VIPkefu/touxiang`, `/cli/houtai/WXYXQ/icon.png` | Ảnh avatar CSKH VIP, icon QR |
| `website/game/cli/app/icon/` | `server/world/config/env.yml` → `extShopIconUrlBase` | Icon shop ngoại. **Lưu ý:** giá trị hiện tại trỏ `http://123.253.26.34:88/cli/app/icon/` — IP lạ, không phải server này, cần sửa |

## A6. Cấu hình nginx — không có trong snapshot

Toàn bộ route đẹp phụ thuộc rewrite của nginx nhưng **không có file config nào trong snapshot**. Cần lấy từ `/www/server/panel/vhost/nginx/` (aaPanel) hoặc `/etc/nginx/`:

- `/play-game` → `website/game/play.php`
- `/nap-tien`, `/tai-khoan`, `/lich-su`, `/tich-luy`, `/doi-knb`, `/webshop` → `website/game/user/index.php?page=<...>`
- `/user/login.php`, `/user/register.php`, `/user/email.php`, `/user/quenmatkhau.php` — **4 endpoint AJAX được `user/index.php` gọi nhưng không tồn tại dưới dạng file**. Gần như chắc chắn là rewrite về `api/config.php?act=login|reg|...`. Không có nginx config thì không xác nhận được — nếu chúng thực sự là rewrite thì **không thiếu gì**; nếu không, cần bổ sung 4 file.

## A7. 23 tài nguyên client thiếu (mức độ nhẹ)

Đối chiếu manifest 11.192 entry → 23 file tài nguyên thật không có trên đĩa. Lấy từ `/www/wwwroot/game/res/`:

**Spine hero 600800 — 14 file** (tướng này sẽ lỗi animation trong chiến đấu):
```
spine/600800/600400_atk_eft1_1.png
spine/600800/600800_atk_eft1_1.sk
spine/600800/600800_morph_atk_eft1_1.sk
spine/600800/600800_morph_atk_tx_1.sk
spine/600800/600800_morph_in_1.sk
spine/600800/600800_morph_s1_eft1_1.sk
spine/600800/600800_morph_s1_tx_1.sk
spine/600800/600800_morph_s2_eft2_1.sk
spine/600800/600800_s1_eft1_2.sk
spine/600800/600800_s1_tx_a1.sk
spine/600800/600800_s1_tx_b1.sk
spine/600800/600800_s2_eft1_1.sk
spine/600800/600800_s2_tx_1.sk
spine/600800/600800_s2_tx_2.sk
```

**Còn lại — 9 file:**
```
spine/301100/301100_s2_eft2_1 -5e65f3c20b.png
icon/camp41 copy.png
icon/item10118 -0ef0094595.png
icon/wealth10118 -1cfff24582.png
icon/totemBoss1?³-eb720d4f41.png          <- tên đã hỏng ngay trong manifest gốc
icon/totemBoss1?Կ?-eb720d4f41.png         <- tên đã hỏng ngay trong manifest gốc
img/Activity/gonggong zhanlin-526d6d3711.png
img/ZUPVP/bgpvp1 copy.jpg
sound/501300_vc_morph_s1 2.wav
```

Nhiều tên có ` copy`, khoảng trắng lạ, hoặc `?` → khả năng cao là **rác trong manifest từ lúc build**, không phải asset thật đang dùng. Ưu tiên thấp, trừ nhóm `spine/600800`.

## A8. Không cần lấy (đã xác nhận vô hại)

Manifest còn liệt kê 9 entry nữa nhưng đó là file của bản build **chưa đóng gói** (dev mode). Bản production dùng các file `libs/*-*-*.js` đã băm tên nên **không cần**:

```
index.js, index-uc.js, unpack.json
libs/laya.core.js, libs/laya.ani.js, libs/laya.html.js, libs/laya.ui.js
ydwxLibs/md5.min.js, ydwxLibs/zlib.min.js
```

54 file `utility/*.txt` (điều khoản sử dụng, chính sách bảo mật) có trên đĩa nhưng **lưu dưới tên đã percent-encode** (`%E6%B8%B8%E6%88%8F...txt`) trong khi manifest yêu cầu tên tiếng Trung đã decode. Cần kiểm tra thực tế xem nginx có phục vụ được không; đây chỉ là văn bản pháp lý, không ảnh hưởng gameplay.

Hai thư mục rỗng, có thể bỏ qua: `website/default/` (webroot mặc định), `server/log/` (chỉ dùng cho kênh SDK "efun" — `login/application.yml` trỏ `../log/efun_online.log`, tính năng này không thấy hoạt động).

Hai thư mục được `game/config/env.yml` khai báo nhưng **không tồn tại và cũng không gây lỗi nào trong log** — nên có lẽ không dùng:
- `server/script/` (`scriptDir: ../script/`, liên quan API `/srv/game/cmd/script/reload`)
- `server/game/sql/` (`sqlDir: sql/`, nhưng log ghi `初始化mysql数据库表结构完成` → schema nằm trong JAR)

Nếu bản gốc có 2 thư mục này thì cứ copy về cho đủ.

---

# B. SỬA ĐƯỢC NGAY — KHÔNG CẦN CUNG CẤP GÌ

## B1. 204 file Excel bị mojibake — decode lại tên là xong

Tên file bị hỏng do bytes UTF-8 bị đọc như CP1252 trong lúc copy. **Nội dung file nguyên vẹn.** Phép biến đổi ngược là xác định:

```
Tên hiện tại --[encode CP1252]--> bytes --[decode UTF-8]--> tên đúng
```

Ví dụ:

| Tên hiện tại | Tên đúng |
|---|---|
| `åå­—åº“.xlsx` | `名字库.xlsx` |
| `ä¸»è§’.xlsx` | `主角.xlsx` |
| `ä¸–ç•ŒBOSS.xlsx` | `世界BOSS.xlsx` |
| `å……å€¼ç¦åˆ©.xlsx` | `充值福利.xlsx` |
| `å† å†›èµ›.xlsx` | `冠军赛.xlsx` |
| `æ–°æ‰‹å¼•å¯¼.xlsx` | `新手引导.xlsx` |

Dùng script kèm theo:

```bash
powershell -ExecutionPolicy Bypass -File tools/fix-excel-names.ps1
```

Mặc định script chạy **dry-run** (chỉ in ra, không đổi gì). Đổi thật:

```bash
powershell -ExecutionPolicy Bypass -File tools/fix-excel-names.ps1 -Apply
```

## B2. 19 file `%3F` — là bản trùng, xoá được

Đã đối chiếu MD5 toàn bộ 227 file: **mỗi file `%3F` đều trùng nội dung byte-for-byte với một file mojibake khác.** Không mất dữ liệu.

**Nguồn gốc (xác nhận 2026-09-03 trên server):** các file này tồn tại **ngay trên server Linux** với tên literal `??.xlsx`, `??BOSS.xlsx`… — ký tự Trung đã bị thay bằng `?` từ một lần copy sai charset trước đây, rồi tool tải về URL-encode `?` thành `%3F`. Hậu quả: trên server, lệnh `cp "??.xlsx"` (paste tiếng Trung qua terminal Latin-1) sẽ **khớp file rác này và copy nhầm mà không báo lỗi**. Đếm trên server: `ls -1 /h5/server/excel/release | grep -cF '?'`.

| File `%3F` | Trùng với |
|---|---|
| `%3F%3F%3F.xlsm` | `物品表.xlsm` |
| `%3F%3F%3F.xlsx` | `通天塔.xlsx` |
| `%3F%3F%3F_1.xlsx` | `装备表_1.xlsx` |
| `%3F%3F%3F%3F.xlsm` | `参考价值.xlsm` |
| `%3F%3F%3F%3F.xlsx` | `鸿运当头.xlsx` |
| `%3F%3F%3F%3FUP.xlsx` | `兽魂祈祷UP.xlsx` |
| `%3F%3F%3F%3F%3F.xlsx` | `跨服竞技场.xlsx` |
| `%3F%3F%3F%3F%3F%3F.xlsx` | `限时皮肤商店.xlsx` |
| `%3F%3F%3F%3F%3F%3F%3F.xlsx` | `通用排行榜奖励.xlsx` |
| `%3F%3F%3F%3F%3F%3F%3F%3F%3F.xlsx` | `通用活动之自选礼包.xlsx` |
| `%3F%3F.xlsx` | `预警.xlsx` |
| `%3F%3FBOSS.xlsx` | `跨服BOSS.xlsx` |
| `%3F%3FUP.xlsx` | `仙器UP.xlsx` |
| `vip%3F%3F.xlsx` | `vip商城.xlsx` |
| `%3F%3F%3F %3F%3F%3F.xlk` | `名字库 的备份.xlk` |
| `Backup of %3F%3F%3F %3F%3F%3F.xlk` | `Backup of 名字库 的备份.xlk` |
| `Backup of %3F%3F%3F.xlk` | `Backup of 名字库.xlk` |
| `buff%3F%3F%3F%3F.docx` | `buff填写说明.docx` |
| `%3F%3F...%3F.txt` (12×%3F) | `资源奖励与消耗的配置方法.txt` |

Script ở B1 tự phát hiện và báo các file này; chạy với `-Apply -RemoveDuplicates` để xoá.

> `.xlk`, `.docx`, `.txt` chỉ là file backup/tài liệu Excel tạo ra, server không đọc — xoá hẳn cũng được.

## B3. `heroname.ttf` — chỉ cần copy

`website/game/play.php` khai báo `@font-face { font-family: heroname; src: url(/assets/fonts/heroname.ttf) }` nhưng file nằm sai chỗ:

- Có: `website/game/heroname.ttf`
- Cần: `website/game/assets/fonts/heroname.ttf`

```bash
cp website/game/heroname.ttf website/game/assets/fonts/heroname.ttf
```

## B4. Sửa cấu hình sai (không phải file thiếu)

| Vấn đề | File | Sửa thành |
|---|---|---|
| `group` chết vì OOM | `server/group/start` | `-Xmx512m` → `-Xmx1128m` (khớp `jvmArgs` trong DB) |
| Đường dẫn excel của group sai | `server/group/config/env.yml` | `excelPath: ../excel/` → `../excel/release/` |
| IP hardcode | `server/console/store/global.conf.json` + 6 file web | Đổi `192.168.1.69` sang IP/domain thật |
| Icon shop trỏ IP lạ | `server/world/config/env.yml` | `extShopIconUrlBase: http://123.253.26.34:88/...` → host của bạn |
| `stop.sh` bỏ sót s4–s6 | `server/stop.sh` | Thêm `game4,game5,game6` vào danh sách |
| Rác | `server/erl_crash.dump` | Xoá (RabbitMQ crash 19/08/2025, `dist_port_already_used 25672`) |

---

# Thứ tự đề nghị

1. Chạy `tools/fix-excel-names.ps1 -Apply -RemoveDuplicates` → **227 → 208 file, tên đúng chuẩn**. Không cần cung cấp gì.
2. Copy 10 file Excel ở **A1** từ `/h5/server/excel/release/` (bỏ nhóm BT nếu không dùng).
3. Copy `gmhanglong/gm/coin.php` ở **A4** — sửa được chức năng đổi xu.
4. Copy nginx config ở **A6** — để xác nhận 4 endpoint `/user/*.php` không thực sự thiếu.
5. Copy 6 sheet ở **A2** và sửa 5 sheet sai định dạng ở **A3**.
6. Copy `cli/` (**A5**), 23 asset client (**A7**) — ưu tiên `spine/600800`.
7. Áp các sửa cấu hình ở **B4**, rồi khởi động lại theo thứ tự trong `CLAUDE.md` mục 2.

Sau mỗi bước, xác minh bằng:

```bash
grep -E '找不到excel|找不到sheet|加载错误' /h5/server/game/.logs/game-s1/error.log
```

Danh sách rỗng = đã đủ cấu hình.
