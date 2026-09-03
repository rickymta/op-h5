# Tái tạo 10 file Excel bị thiếu từ bytecode

10 file cấu hình không có cả trên server lẫn bản local, không tìm được từ nguồn nào khác. Bài này ghi lại **cái gì suy ra được từ bytecode, cái gì không, và kết quả tái tạo**.

Thư mục kết quả: `reconstructed/` (5 file, bản gốc 4 workbook bị sửa nằm ở `reconstructed/originals/`). **Đã copy vào `server/excel/release/` ngày 2026-09-03** theo yêu cầu vận hành — xem mục "Đưa vào dùng".

---

## Nguyên tắc: bytecode cho cấu trúc, không cho dữ liệu

Mỗi file Excel được nạp bởi một lớp con của `EExcel`; mỗi sheet bởi một `ESheet<Row>`; mỗi dòng bởi `Row.parse(XSSFRowWrap)`:

```java
// HCBaseRow.parse — cot duoc doc THEO TEN, khong theo vi tri
this.activityId = row.getInteger("ID", 0);
this.openDay    = row.getInteger("开启天数", 0);
this.openTimeStr= row.getString("开启时间");
```

Nên từ bytecode lấy được **chính xác**: tên file, tên sheet, tên cột, kiểu dữ liệu (`getInteger/getString/getBoolean`), cột nào có default (tuỳ chọn), và cách `decode()` diễn giải chuỗi (định dạng phần thưởng `type:id:count#…`, định dạng ngày). **Không lấy được**: giá trị thật (ID vật phẩm, giá, mốc, số lượng). Giá trị phải đến từ (a) file "anh em" cùng khuôn, hoặc (b) đặt tạm.

## Kết quả

| File | Trạng thái | Nguồn dữ liệu | Kiểm chứng parser thật |
|---|---|---|---|
| `hero-week-card.xlsx` (英雄周卡) | **Tái tạo** | Copy `equipment-week-card.xlsx`, đổi tên 2 sheet — cột trùng 100% | load ✓ decode ✓ 8+2 row, MixRes parse đúng |
| `jade-shop.xlsx` (仙玉商城) | **Tái tạo** | Copy `vip-shop.xlsx` sheet `vip商城商品` (9/12 cột), thêm 3 cột tuỳ chọn trống | load ✓ decode ✓ 2646 row |
| `friend-invite.xlsx` (好友邀请) | **Tái tạo, giá trị tạm** | Sinh từ schema, 1 dòng | load ✓ decode ✓ reward parse đúng |
| `free-buy.xlsx` (0元购) | **Tái tạo, giá trị tạm** | Sinh từ schema, 3 sheet | load ✓ decode ✓ ngày parse ra epoch |
| `rejiang-hero-starup.xlsx` (热江英雄升星) | **Tái tạo, giá trị tạm** | Sinh từ schema × 2428 hero trong `hero.xlsx` | load ✓ decode ✓ starCost parse đúng |
| `bt-month-card.xlsx` | **Bỏ — không cần** | — | — |
| `bt-fake-cumulative-recharge.xlsx` | **Bỏ — không cần** | — | — |
| `bt-bug-shop.xlsx` | **Bỏ — không cần** | — | — |
| `bt-first-recharge.xlsx` | **Bỏ — không cần** | — | — |
| `bt-panda-benefit.xlsx` | **Bỏ — không cần** | — | — |

### Vì sao 5 file BT không cần

`BtFakePayReq` (và các handler `bt/msg/*` khác) kiểm tra ngay đầu:

```
getstatic GameVer.BT ; invokevirtual SrvEnv.gameVer() ; if_acmpeq …
→ nếu khác: NoticeHandler.message(master, "not bt version")
```

Server chạy `gameVer=MAINLAND` (`global.conf.json`, log `本次执行的游戏内容版本是 MAINLAND`). Enum `GameVer` có: MAINLAND, GAT, VIETNAM, KOREA, JAPAN, SOUTHEAST_ASIA, WEST, BT. Tính năng BT không bao giờ chạy trên server này; thiếu file chỉ gây 1 dòng `ERROR` vô hại lúc khởi động. Muốn tắt cả dòng log thì tạo file rỗng đúng tên sheet — không cần.

### `热江` chỉ chạy khi GM bật cờ

`HeroAction.starUp()` chỉ tra bảng `热江英雄升星` khi `master.system.free == true`. Cờ `SystemPO.free` **chỉ được gán bởi `admin.menu.system.SystemMenu`** (menu GM). Mặc định tài khoản không có cờ này → bảng không được đọc. Nhưng nếu GM bật cờ cho một tài khoản mà bảng thiếu → `NullPointerException` khi nâng sao. Vì vậy vẫn tái tạo để an toàn.

---

## Schema từng file (trích từ bytecode)

Kiểu: `int` = `getInteger`, `str` = `getString`, `bool` = `getBoolean`. Cột có `(mặc định)` là tuỳ chọn.

### hero-week-card.xlsx — `activity.cycle.weekcard.hc.excel.HCExcel`

| Sheet | Cột |
|---|---|
| `英雄周卡基础` | `ID` int → id, activityId · `开启天数` int · `开启时间` str `HH:mm:ss` · `结束天数` int · `结束时间` str · `分组` int |
| `英雄周卡详情` | `ID` int → tid · `基础奖励` str MixRes · `每日奖励` str MixRes · `持续天数` int · `邮件ID` int · `分组` int |

Sibling `equipment-week-card.xlsx` có đúng các cột này (thêm `活动名称`, `价格`, `展示奖励`, `充值项ID`, `类型` — thừa, bị bỏ qua). File tái tạo mang **phần thưởng của thẻ trang bị**; muốn đúng nghĩa "thẻ tướng" thì sửa `每日奖励` sang vật phẩm tướng.

### jade-shop.xlsx — `res.jade.excel.JadeExcel`

| Sheet | Cột |
|---|---|
| `仙玉商城商品` | `物品ID` → tid · `商店页签` int (mặc định) → mallId · `主角等级开放` int (mặc định) · `开服天数开放` int (mặc định) · `充值项` int (mặc định) → payId · `售价` str → consumeStr · `限购方式` str → autoCycle · `限购数量` int (mặc định) · `VIP等级开启` int (mặc định) · `网管特权等级开启` int (mặc định) → vipBt · `是否进入记录` bool (mặc định) · `是否下架` bool (mặc định) |

Sibling `vip-shop.xlsx::vip商城商品` có 9/12 cột; 3 cột thiếu (`商店页签`, `VIP等级开启`, `网管特权等级开启`) đều có default nên đã thêm header trống. File tái tạo bán **đúng hàng của shop VIP** — cần lọc lại thành hàng "Tiên Ngọc".

### friend-invite.xlsx — `config.activity.friendinvite.FriendInviteExcel`

| Sheet | Cột |
|---|---|
| `好友邀请` | `可邀请次数` int · `奖励` str MixRes |

Row **không đọc cột ID** → `id` luôn 0 → `ESheet.map` chỉ giữ dòng cuối. Đây là cấu hình **một dòng**. Giá trị tạm: 5 lượt, thưởng `3:100022:1#3:200033:200`.

### free-buy.xlsx — `config.activity.cycle.freebuy.FreeBuyExcel`

| Sheet | Cột |
|---|---|
| `0元购基础` | `活动ID` int → id · `开始时间` str **`yyyy-MM-dd HH:mm:ss`** · `结束时间` str · `最少开服天数` int · `商店分组` int · `任务积分道具ID` int |
| `0元购商品` | `ID` · `商店分组` int · `基础奖励` str MixRes · `充值项1..3` int · `进度1..3` int · `第三方充值项1..3` int |
| `0元购任务` | `ID` · `任务ID` int |

Chú ý: `开始时间` ở đây là **ngày đầy đủ** (decode ném `ParseException` nếu chỉ ghi `00:00:00`), khác `英雄周卡` chỉ ghi giờ. Giá trị tạm: 1 hoạt động 2024→2030, 2 món, 2 nhiệm vụ.

### rejiang-hero-starup.xlsx — `config.rejiang.RejiangHeroStarUpExcel`

| Sheet | Cột |
|---|---|
| `热江英雄升星` | `英雄ID` int → id, heroTid · `消耗狗粮` str · `消耗进阶石` str · `消耗灌魔之瓶` str · `消耗指定道具` str |

`decode()` bỏ qua ô trống hoặc `"0"`, nối các ô còn lại bằng `#` thành `starCost` MixRes → mỗi ô phải là `type:id:count`. Giá trị tạm: mỗi hero `消耗进阶石 = 3:100001:50` (100001 = "Đan tiến giai" trong `item-table.xlsm`).

### 5 file BT (schema để tham khảo, không tái tạo)

| File | Sheet → cột |
|---|---|
| `bt-month-card.xlsx` | `BT月卡`: 月卡天数, 购买后获得, 购买每日获得, 邮件ID |
| `bt-fake-cumulative-recharge.xlsx` | `BT假累计充值`: 开服天数下限, 开服天数上限, 任务ID |
| `bt-bug-shop.xlsx` | `BUG商店信息`: 商店ID · `BUG商店商品`: 商品ID, 商店ID, 商品内容, VIP等级, 网管等级, 限购次数, 刷新周期, 主角等级, 开服天数 · `BUG商品价格`: 商品ID, 开始次数, 结束次数, 消耗 |
| `bt-first-recharge.xlsx` | `BT假首充基础`: 充值金额 · `BT假首充奖励`: 档位, 登录天数, 奖励 · `BT真首充`: 累计充值数, 奖励 |
| `bt-panda-benefit.xlsx` | `BT潘达福利`: 任务ID, 任务类型 · `每日领取奖励`: 解锁关卡数, 领取奖励 · `商城`: (không có cột CJK) |

---

## Bẫy quan trọng: file sinh bằng openpyxl mất sạch cột chuỗi

`XSSFRowWrap.getString()` gọi `cell.setCellType(CellType.STRING)` **trước khi đọc**. Với ô `inlineStr` (openpyxl luôn ghi kiểu này), POI chuyển sang shared-string trong khi `<v>` rỗng → giá trị mất → server nhận `""` **không báo lỗi**. Excel và file gốc ghi `t="s"` nên không sao.

Hậu quả quan sát được: `reward=[]`, `cost=""`, ngày rỗng — trông như "sai định dạng" nhưng thật ra là mất dữ liệu. Sửa bằng:

```bash
python tools/xlsx-inline-to-shared.py <file.xlsx>
```

Áp dụng cho **mọi** file cấu hình sinh bằng code trước khi đưa lên server. File mở-rồi-Save bằng Excel thì Excel tự ghi shared string, không cần.

---

## Kiểm chứng bằng parser thật

`tools/ExcelProbe.java` nạp file qua `EExcel.load(File)` + `decode()` của chính game rồi in từng field. Biên dịch một lần:

```bash
javac -proc:none -cp "server/game/tcg-game.jar;server/game/lib/*" -d build/probe tools/ExcelProbe.java
```

Chạy (Windows dùng `;`, Linux dùng `:`; dùng `/` trong đường dẫn):

```bash
java -Dfile.encoding=UTF-8 -cp "server/game/tcg-game.jar;server/game/lib/*;build/probe" ExcelProbe reconstructed/hero-week-card.xlsx com.ososx.tcg.game.activity.cycle.weekcard.hc.excel.HCExcel
```

`load(File): OK` + `decode(): OK` + field có giá trị = file hợp lệ với server. Đây là mức kiểm chứng cao nhất không cần môi trường Linux đầy đủ.

---

## 6 sheet bổ sung vào workbook có sẵn

Khác với 10 file trên, 6 sheet này nằm **bên trong workbook đã có**. Chèn bằng `tools/xlsx-add-sheet.py` ở mức XML (không round-trip openpyxl → giữ nguyên formula cache/định dạng của các sheet khác, chuỗi ghi `t="s"`). Bản gốc trước khi sửa: `reconstructed/originals/`.

| Sheet | Workbook | Cột (từ bytecode) | Nguồn dữ liệu | Kiểm chứng parser thật |
|---|---|---|---|---|
| `仙玉基金` | `recharge-benefit.xlsx` | = `成长基金` (XyFundSheet **kế thừa** `GrowFundSheet`, cùng `GrowFundRow`): ID, 成长等级, 基础奖励, 额外奖励, 排序 | copy nguyên `成长基金` (20 dòng thật) | XyFundSheet: load ✓ decode ✓ 20 row, reward `[0:1:1056]` |
| `元宝基金` | `recharge-benefit.xlsx` | như trên (YbFundSheet kế thừa GrowFundSheet) | copy nguyên `成长基金` | YbFundSheet: load ✓ decode ✓ 20 row |
| `冠军赛竞猜随机奖励` | `championship.xlsx` | `奖励ID` int, `奖励` str MixRes, `权重` double (ChampionBetExtraRwdRow) | schema, 3 dòng tạm (`0:0:250000`/50, `0:11:3500`/30, `3:900009:1`/20) | load ✓ decode ✓ 3 row |
| `三十六重天排行榜` | `thirty-six-heavens.xlsx` | ID, `排名起始` int, `排名结束` int, `奖励` str (DayRankRow) | copy `fusion-temple.xlsx::融合神殿排行榜` — 4/4 cột trùng, dữ liệu thật | load ✓ decode ✓ 6 row |
| `BT免费连充基础` | `accumulated-day-gift.xlsx` (积天豪礼) | = `积天豪礼基础` + `额外奖励` str + `额外奖励领取天数` int (BTCycleAccPayRow) | copy `积天豪礼基础` (48 dòng thật) + 2 cột tạm (`3:100022:1#3:200033:200`, 7) | load ✓ decode ✓ 48 row |
| `BT免费连充奖励` | `accumulated-day-gift.xlsx` | ID, `天数` int, `奖励` str, `奖励分组` int (BTCycleAccPayRwdRow) — trùng hệt `积天豪礼奖励` | copy nguyên `积天豪礼奖励` (15 dòng thật) | load ✓ decode ✓ 15 row |

Lưu ý `BT免费连充*`: dù tên có "BT", **không bị gate** `GameVer.BT` (0 lần so sánh trong `BTCycleAccPayManager` và các handler `btAcc/msg/*`) → tính năng này có thể chạy thật trên MAINLAND. Vì vậy dùng dữ liệu thật của `积天豪礼` thay vì bỏ qua như 5 file BT.


Kết quả `ExcelProbe` trên cả `recharge-benefit.xlsx` (PayExcel): `load(File): OK` cho 24 sheet khai báo (2 sheet `基金` mới: 20 row mỗi sheet), `decode(): OK`; một `NullPointerException: SrvEnv.gameVer()` in ra giữa chừng do sheet khác gọi `Game.env` (static chỉ có khi server chạy thật) — cùng hiện tượng world server ghi trong log ở máy thật, không liên quan dữ liệu.

Kiểm chứng **từng sheet** thay vì cả workbook: `tools/SheetProbe.java` nạp một `ESheet` cụ thể qua `ESheet.load(XSSFSheet)` + `decode()` (tên sheet lấy từ chính class — không truyền tiếng Trung qua dòng lệnh, vì Git Bash → Java sẽ biến thành `????` và glob khớp tên thư mục 4 ký tự). Dùng khi loader cả workbook không thoát: `PayExcel` khởi tạo thread nền non-daemon nên `ExcelProbe` chạy xong `main` mà JVM vẫn sống — luôn bọc `timeout`.

```bash
javac -proc:none -cp "server/game/tcg-game.jar;server/game/lib/*" -d build/probe tools/SheetProbe.java
timeout 120 java -Dfile.encoding=UTF-8 -cp "server/game/tcg-game.jar;server/game/lib/*;build/probe" SheetProbe server/excel/release/recharge-benefit.xlsx com.ososx.tcg.game.config.pay.sheet.XyFundSheet
```

Cách chèn một sheet mới vào workbook bất kỳ:

```bash
python tools/xlsx-add-sheet.py <dich.xlsx> <ten_sheet_moi> --from <nguon.xlsx> <ten_sheet_nguon> [--add-cols "cot=gia_tri,..."]
```

---

## Đưa vào dùng

**Đã thực hiện:** 5 file đã ở `server/excel/release/`, 6 sheet đã chèn tại chỗ. Muốn quay lại: copy từ `reconstructed/originals/` (4 workbook) và xoá 5 file tái tạo.

Rồi đẩy lên server cùng bộ Excel (tên đã ASCII, không lo hỏng) và nạp lại nóng: `POST http://127.0.0.1:9999/srv/game/cmd/excel/reload`.

**Trước khi copy, cân nhắc:** 3 file `friend-invite`, `free-buy`, `rejiang-hero-starup` mang **giá trị tôi đặt tạm**, không phải thiết kế gốc — chúng làm tính năng chạy được, nhưng phần thưởng/chi phí là tuỳ ý. 2 file `hero-week-card`, `jade-shop` mang **dữ liệu thật mượn từ tính năng anh em** — hợp lệ nhưng bán/thưởng đồ của tính năng khác. Nếu server đang có người chơi thật, xem lại giá trị trước khi bật.

Không copy thì không sao: 5 tính năng này hiện đã không hoạt động, server vẫn chạy như trước.

## Sinh lại

Các script sinh nằm inline trong lịch sử làm việc; để tái sinh, dùng `openpyxl` với đúng tên sheet/cột ở trên → `xlsx-inline-to-shared.py` → `ExcelProbe`. Bảng header của toàn bộ 941 sheet hiện có: `docs/sheet-headers.json` (dùng để tìm file anh em cho bất kỳ schema nào).
