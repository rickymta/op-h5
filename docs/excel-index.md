# Bảng tra cứu 200 file cấu hình Excel

**Đừng rename thủ công.** Tên file là khoá tra cứu hardcode trong bytecode; muốn đổi thêm thì sửa `tools/excel-name-map.json` rồi chạy `tools/patch-excel-names.py`.

Đường dẫn: `server/excel/release/`

**Cập nhật:** tên file đã được đổi sang tiếng Anh và bytecode đã được vá đồng bộ (xem CLAUDE.md mục 14). Cột "Tên gốc" giữ lại tên tiếng Trung để đối chiếu với bản trên server.

**Tên sheet bên trong file vẫn là tiếng Trung** — 824 sheet, cũng hardcode trong bytecode, không đổi được bằng bộ vá hiện tại. Đây là lý do bảng này vẫn cần thiết.


---

## Bảng nền — sửa là ảnh hưởng toàn game

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `item-table.xlsm` | `物品表.xlsm` | Bảng vật phẩm (bảng lớn nhất, chứa sheet `皮肤激活道具`) |
| `equipment-table.xlsx` | `装备表.xlsx` | Bảng trang bị |
| `装备表_1.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Bảng trang bị phần 2 |
| `hero.xlsx` | `英雄.xlsx` | Bảng tướng |
| `main-character.xlsx` | `主角.xlsx` | Nhân vật chính |
| `combat.xlsx` | `战斗.xlsx` | Chiến đấu |
| `battle-scene-config.xlsx` | `战斗场景配置.xlsx` | Cấu hình cảnh chiến đấu |
| `特效参数.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Tham số hiệu ứng |
| `技能预览.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Xem trước kỹ năng |
| `common.xlsx` | `通用.xlsx` | Cấu hình chung |
| `属性信息.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Thông tin thuộc tính |
| `realm.xlsx` | `境界.xlsx` | Cảnh giới |
| `instance-template.xlsx` | `实例.xlsx` | Bảng mẫu (runtime, xem `templateIgnore.json`) |
| `参考价值.xlsm` | *(giữ tên gốc — code không tham chiếu)* | Bảng giá trị tham chiếu (cân bằng) |
| `alert-threshold.xlsx` | `预警.xlsx` | Ngưỡng cảnh báo (chứa sheet `估值`) |
| `reset.xlsx` | `重置.xlsx` | Quy tắc reset |
| `timed-reset.xlsx` | `限时重置.xlsx` | Reset theo thời gian |
| `name-pool.xlsx` | `名字库.xlsx` | Kho tên NPC/nhân vật |
| `province-city-region.xlsx` | `省市地区.xlsx` | Danh mục tỉnh thành |
| `qq.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Cấu hình nền tảng QQ |

## Bảng văn bản / ngôn ngữ

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `text-localization.xlsx` | `文本语言表.xlsx` | Bảng dịch văn bản |
| `system-text.xlsx` | `系统文本.xlsx` | Văn bản hệ thống |
| `system-prompt-localization.xlsx` | `系统提示语言表.xlsx` | Bảng dịch thông báo hệ thống |
| `文本色值.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Mã màu văn bản |
| `chat.xlsx` | `聊天.xlsx` | Chat |
| `chat-tag.xlsx` | `聊天标签.xlsx` | Nhãn chat |

## Tướng — nuôi và nâng cấp

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `英雄变强.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Nâng sức mạnh tướng |
| `英雄升星限制.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Giới hạn nâng sao |
| `hero-inherit.xlsx` | `英雄继承.xlsx` | Kế thừa tướng |
| `hero-rollback.xlsx` | `英雄回退.xlsx` | Hoàn tướng |
| `timed-rollback.xlsx` | `限时回退.xlsx` | Hoàn giới hạn thời gian |
| `hero-sacrifice.xlsx` | `英雄献祭.xlsx` | Hiến tế tướng (chứa sheet `英雄高阶献祭星级` — **sai định dạng ô**) |
| `hero-deification-altar.xlsx` | `英雄封神台.xlsx` | Đài phong thần |
| `hero-bond.xlsx` | `英雄羁绊.xlsx` | Duyên phận tướng |
| `bond.xlsx` | `羁绊.xlsx` | Duyên phận |
| `substitute-hero.xlsx` | `替补英雄.xlsx` | Tướng dự bị |
| `linked-hero.xlsx` | `连线英雄.xlsx` | Tướng liên kết |
| `abnormal-hero-recycle.xlsx` | `异常英雄回收.xlsx` | Thu hồi tướng lỗi |

## Triệu hồi / gacha

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `hero-summon.xlsx` | `英雄召唤.xlsx` | Triệu hồi tướng |
| `limited-hero-summon.xlsx` | `限定英雄召唤.xlsx` | Triệu hồi tướng giới hạn |
| `hero-wish-pool.xlsx` | `英雄祈愿池.xlsx` | Hồ cầu nguyện tướng |
| `summon-ranking.xlsx` | `召唤排行.xlsx` | Xếp hạng triệu hồi |
| `hundred-pull-reward.xlsx` | `百抽奖励.xlsx` | Thưởng 100 lượt quay |
| `destiny-prayer.xlsx` | `命格祈祷.xlsx` | Cầu nguyện Mệnh Cách |
| `beast-soul-prayer-rateup.xlsx` | `兽魂祈祷UP.xlsx` | Cầu nguyện Thú Hồn (tăng tỉ lệ) |
| `immortal-artifact-rateup.xlsx` | `仙器UP.xlsx` | Tiên Khí tăng tỉ lệ |
| `super-wheel.xlsx` | `超级转盘.xlsx` | Vòng quay siêu cấp |
| `collection-awaken-wheel.xlsx` | `藏品觉醒转盘.xlsx` | Vòng quay thức tỉnh sưu tập |
| `lucky-blindbox.xlsx` | `幸运盲盒.xlsx` | Hộp mù may mắn |
| `universe-treasure-box.xlsx` | `乾坤宝匣.xlsx` | Kiền Khôn Bảo Hạp |
| `chest-multi-open.xlsx` | `宝箱连开.xlsx` | Mở rương liên tiếp |
| `custom-equipment-chest.xlsx` | `定制装备宝箱.xlsx` | Rương trang bị tuỳ chọn |
| `treasure-hunt.xlsx` | `寻宝.xlsx` | Tìm bảo vật |
| `magic-trick.xlsx` | `魔术戏法.xlsx` | Ảo thuật |

## Trang bị đặc biệt / hệ thống nuôi phụ

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `divine-equipment.xlsx` | `神装表.xlsx` | Thần trang |
| `divine-artifact.xlsx` | `神器.xlsx` | Thần Khí |
| `immortal-artifact.xlsx` | `仙器.xlsx` | Tiên Khí |
| `immortal-artifact-inherit.xlsx` | `仙器继承.xlsx` | Kế thừa Tiên Khí |
| `class-immortal-artifact.xlsx` | `职业仙器.xlsx` | Tiên Khí theo class |
| `rune.xlsx` | `符文.xlsx` | Phù Văn |
| `totem.xlsx` | `图腾.xlsx` | Đồ Đằng |
| `totem-sanctuary.xlsx` | `图腾圣殿.xlsx` | Thánh điện Đồ Đằng |
| `destiny.xlsx` | `命格.xlsx` | Mệnh Cách |
| `destiny-master.xlsx` | `命理大师.xlsx` | Đại sư Mệnh Lý |
| `collection.xlsx` | `藏品.xlsx` | Sưu tập |
| `collection-seal.xlsx` | `藏品封印.xlsx` | Phong ấn sưu tập |
| `exclusive-collection-release.xlsx` | `专属藏品上新.xlsx` | Ra mắt sưu tập độc quyền |
| `beast-spirit.xlsx` | `兽灵.xlsx` | Thú Linh |
| `兽灵技能控制.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Điều khiển kỹ năng Thú Linh |
| `beast-soul-share.xlsx` | `兽魂共享.xlsx` | Chia sẻ Thú Hồn |
| `divine-dragon.xlsx` | `神龙.xlsx` | Thần Long |
| `神龙技能控制.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Điều khiển kỹ năng Thần Long |
| `constellation-map.xlsx` | `星宿图.xlsx` | Tinh Tú Đồ |
| `honour-pendant.xlsx` | `荣誉挂件.xlsx` | Vật trang trí danh dự |
| `elite-avatar-frame.xlsx` | `精英头像框.xlsx` | Khung avatar tinh anh |

## Phó bản / PvE

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `序章.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Mở đầu |
| `新手引导.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Hướng dẫn tân thủ |
| `adventure.xlsx` | `冒险.xlsx` | Phiêu lưu |
| `daily-dungeon.xlsx` | `日常副本.xlsx` | Phó bản hàng ngày |
| `历练副本.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Phó bản lịch luyện |
| `destiny-dungeon.xlsx` | `命格副本.xlsx` | Phó bản Mệnh Cách |
| `dungeon-purchase-config.xlsx` | `副本购买配置.xlsx` | Cấu hình mua lượt phó bản |
| `endless-trial.xlsx` | `无尽试炼.xlsx` | Thí luyện vô tận |
| `tower-of-heaven.xlsx` | `通天塔.xlsx` | Thông Thiên Tháp |
| `race-tower.xlsx` | `种族塔.xlsx` | Tháp chủng tộc |
| `thirty-six-heavens.xlsx` | `三十六重天.xlsx` | Tam Thập Lục Trùng Thiên (thiếu sheet `三十六重天排行榜`) |
| `celestial-maze.xlsx` | `天界迷宫.xlsx` | Mê cung Thiên Giới |
| `blessed-grotto.xlsx` | `洞天福地.xlsx` | Động Thiên Phúc Địa |
| `sanctuary.xlsx` | `圣域.xlsx` | Thánh Vực |
| `封神祭坛.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Tế đàn Phong Thần |
| `prophet-sanctuary.xlsx` | `先知圣殿.xlsx` | Thánh điện Tiên Tri |
| `fusion-temple.xlsx` | `融合神殿.xlsx` | Thần điện Dung Hợp |
| `lingxiao-palace.xlsx` | `凌霄宝殿.xlsx` | Lăng Tiêu Bảo Điện |
| `bodhi-tree.xlsx` | `菩提树.xlsx` | Cây Bồ Đề |
| `primordial-era.xlsx` | `莽荒纪.xlsx` | Mãng Hoang Ký |
| `ancient-war.xlsx` | `上古之战.xlsx` | Chiến tranh Thượng Cổ |
| `hero-expedition.xlsx` | `英雄远征.xlsx` | Viễn chinh |
| `baoqing-workshop.xlsx` | `宝青坊.xlsx` | Bảo Thanh Phường |

## BOSS

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `world-boss.xlsx` | `世界BOSS.xlsx` | BOSS thế giới |
| `serverwide-boss.xlsx` | `全服BOSS.xlsx` | BOSS toàn server |
| `guild-boss.xlsx` | `公会BOSS.xlsx` | BOSS công hội |
| `dream-boss.xlsx` | `梦境BOSS.xlsx` | BOSS mộng cảnh |
| `cross-boss.xlsx` | `跨服BOSS.xlsx` | BOSS liên server |
| `legion-invasion.xlsx` | `军团入侵.xlsx` | Quân đoàn xâm lược |

## PvP

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `arena.xlsx` | `竞技场.xlsx` | Đấu trường |
| `race-arena.xlsx` | `种族竞技.xlsx` | Đấu trường chủng tộc (chứa sheet `竞猜奖励`) |
| `championship.xlsx` | `冠军赛.xlsx` | Giải vô địch (thiếu sheet `冠军赛竞猜随机奖励`) |
| `team-championship.xlsx` | `组队冠军赛.xlsx` | Giải vô địch tổ đội |
| `peak-tournament.xlsx` | `巅峰会武.xlsx` | Điên Phong Hội Võ |
| `peak-tournament-preview.xlsx` | `巅峰会武预告.xlsx` | Thông báo trước Điên Phong Hội Võ |
| `nation-war.xlsx` | `国战.xlsx` | Quốc chiến |
| `cross-ladder.xlsx` | `跨服天梯.xlsx` | Thiên thang liên server |
| `cross-rank-match.xlsx` | `跨服段位赛.xlsx` | Giải đấu hạng liên server |
| `cross-arena.xlsx` | `跨服竞技场.xlsx` | Đấu trường liên server |
| `跨服副本.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Phó bản liên server |

## Công hội

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `guild.xlsx` | `公会.xlsx` | Công hội |
| `guild-war.xlsx` | `公会战.xlsx` | Công hội chiến |
| `guild-treasury.xlsx` | `公会宝库.xlsx` | Bảo khố công hội |

## Shop & nạp tiền

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `shop.xlsx` | `商城.xlsx` | Cửa hàng |
| `vip-shop.xlsx` | `vip商城.xlsx` | Shop VIP |
| `cyclic-shop.xlsx` | `循环商城.xlsx` | Shop luân phiên |
| `cyclic-weekly-limited-shop.xlsx` | `循环周限购商城.xlsx` | Shop giới hạn tuần |
| `gold-shop.xlsx` | `金币商店.xlsx` | Shop vàng |
| `timed-skin-shop.xlsx` | `限时皮肤商店.xlsx` | Shop skin giới hạn |
| `mail-privilege-shop.xlsx` | `邮件特权商城.xlsx` | Shop đặc quyền qua thư |
| `recharge-item.xlsx` | `充值项.xlsx` | Gói nạp (khớp `charge_item` trong MySQL `tcg`) |
| `recharge-benefit.xlsx` | `充值福利.xlsx` | Phúc lợi nạp (**thiếu sheet `仙玉基金`, `元宝基金`**) |
| `cumulative-recharge.xlsx` | `累计充值.xlsx` | Tích nạp |
| `consecutive-recharge.xlsx` | `连续充值.xlsx` | Nạp liên tục |
| `monthly-first-recharge.xlsx` | `每月首充.xlsx` | Nạp đầu hàng tháng |
| `value-first-recharge.xlsx` | `超值首充.xlsx` | Nạp đầu siêu giá trị |
| `value-pack.xlsx` | `超值礼包.xlsx` | Gói quà siêu giá trị |
| `tenfold-rebate.xlsx` | `十倍返利.xlsx` | Hoàn 10 lần |
| `personal-customisation.xlsx` | `私人定制.xlsx` | Đặt hàng riêng |
| `prereg-reward.xlsx` | `预约奖励.xlsx` | Thưởng đăng ký trước |

## Thẻ tuần / thẻ tháng / battle pass

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `equipment-week-card.xlsx` | `装备周卡.xlsx` | Thẻ tuần trang bị |
| `rune-week-card.xlsx` | `符文周卡.xlsx` | Thẻ tuần Phù Văn |
| `divine-dragon-battlepass.xlsx` | `神龙战令.xlsx` | Chiến lệnh Thần Long |
| `launch-battlepass.xlsx` | `开服战令.xlsx` | Chiến lệnh khai server |

> Còn `英雄周卡.xlsx` (Hero week card / Thẻ tuần tướng) — **file này thiếu**, xem `MISSING-FILES.md`.

## Đăng nhập / tân thủ / quay lại

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `checkin.xlsx` | `签到.xlsx` | Điểm danh |
| `login-7day.xlsx` | `七日登录.xlsx` | Đăng nhập 7 ngày |
| `login-7day-new.xlsx` | `新七日登录.xlsx` | Đăng nhập 7 ngày (bản mới) |
| `calendarday-login-event.xlsx` | `自然日登录活动.xlsx` | Sự kiện đăng nhập theo ngày |
| `timed-login.xlsx` | `限时登陆.xlsx` | Đăng nhập giới hạn thời gian |
| `newbie-benefit.xlsx` | `新手福利.xlsx` | Phúc lợi tân thủ |
| `return-journey.xlsx` | `回归之旅.xlsx` | Hành trình quay lại |
| `launch-event.xlsx` | `开服活动.xlsx` | Sự kiện khai server |
| `launch-redpacket.xlsx` | `开服红包.xlsx` | Hồng bao khai server |
| `server-merge-event.xlsx` | `合服活动.xlsx` | Sự kiện gộp server |
| `overseas.xlsx` | `海外.xlsx` | Cấu hình bản ngoài nước |
| `overseas-login-gift.xlsx` | `海外登录豪礼.xlsx` | Quà đăng nhập bản ngoài nước |
| `overseas-prereg-mail.xlsx` | `海外预约邮件.xlsx` | Thư đăng ký trước bản ngoài nước |

## Hoạt động chu kỳ / khung sự kiện

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `cyclic-event.xlsx` | `循环活动.xlsx` | Hoạt động luân phiên (18 sheet) |
| `cyclic-event-2.xlsx` | `循环活动表二.xlsx` | Hoạt động luân phiên bảng 2 (14 sheet) |
| `cyclic-7day-fun.xlsx` | `循环七天乐.xlsx` | Vui 7 ngày luân phiên |
| `carnival-7day-fun.xlsx` | `狂欢七天乐.xlsx` | Vui 7 ngày cuồng hoan |
| `活动预告.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Thông báo trước sự kiện |
| `功能开启预告.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Thông báo mở tính năng |
| `限时玩法入口.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Cổng vào chế độ giới hạn |
| `generic-event-choice-pack.xlsx` | `通用活动之自选礼包.xlsx` | Gói quà tự chọn |
| `generic-leaderboard-reward.xlsx` | `通用排行榜奖励.xlsx` | Thưởng bảng xếp hạng chung |
| `new-hero-release-event.xlsx` | `新英雄上新活动.xlsx` | Sự kiện ra mắt tướng mới |

## Hoạt động lễ / theo mùa

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `lunar-newyear-event.xlsx` | `春节活动.xlsx` | Tết Nguyên Đán |
| `lantern-festival.xlsx` | `元宵喜乐.xlsx` | Tết Nguyên Tiêu |
| `midspring-month.xlsx` | `仲春之月.xlsx` | Tháng giữa xuân |
| `arbor-day.xlsx` | `植树节.xlsx` | Ngày trồng cây |
| `mayday-carnival.xlsx` | `五一狂欢.xlsx` | Cuồng hoan 1/5 |
| `dragonboat-festival.xlsx` | `端午龙舟.xlsx` | Tết Đoan Ngọ |
| `summer-battle.xlsx` | `暑期大作战.xlsx` | Đại chiến hè |
| `summer-carnival.xlsx` | `暑期狂欢.xlsx` | Cuồng hoan hè |
| `ghost-festival-night.xlsx` | `中元夜.xlsx` | Đêm Trung Nguyên |
| `midautumn-festival.xlsx` | `欢度中秋.xlsx` | Trung Thu |
| `nationalday-battle.xlsx` | `国庆大作战.xlsx` | Đại chiến Quốc Khánh |
| `nationalday-carnival.xlsx` | `国庆狂欢.xlsx` | Cuồng hoan Quốc Khánh |
| `exorcism-night.xlsx` | `驱魔之夜.xlsx` | Đêm trừ ma (Halloween) |
| `thanksgiving-event.xlsx` | `感恩节活动.xlsx` | Lễ Tạ Ơn |
| `christmas-tree.xlsx` | `圣诞树.xlsx` | Cây Giáng Sinh (chứa sheet `圣诞树奖励` — **lỗi định dạng**) |
| `fragrant-gift.xlsx` | `芬芳赠礼.xlsx` | Quà tặng thơm (Valentine / 8-3) |

## Quà / mốc / thúc đẩy

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `monday-grand-gift.xlsx` | `周一豪礼.xlsx` | Quà lớn thứ Hai |
| `accumulated-day-gift.xlsx` | `积天豪礼.xlsx` | Quà tích ngày |
| `wish-gift.xlsx` | `心愿之礼.xlsx` | Quà nguyện ước |
| `more-the-better.xlsx` | `多多益善.xlsx` | Càng nhiều càng tốt |
| `战力冲刺.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Bứt phá lực chiến |
| `我要变强.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Ta muốn mạnh hơn |
| `study-notes.xlsx` | `勤学笔记.xlsx` | Sổ tay học tập |
| `falling-fortune-bag.xlsx` | `天降福袋.xlsx` | Túi phúc từ trời |
| `redpacket-rain.xlsx` | `红包雨.xlsx` | Mưa hồng bao |
| `great-fortune.xlsx` | `鸿运当头.xlsx` | Hồng vận đương đầu (chứa sheet `鸿运当头礼包` — **lỗi định dạng**) |

## Nhiệm vụ / xã hội / khác

| Tên file (đã đổi) | Tên gốc | Tiếng Việt |
|---|---|---|
| `quest.xlsx` | `任务.xlsx` | Nhiệm vụ |
| `bounty-quest.xlsx` | `悬赏任务.xlsx` | Nhiệm vụ treo thưởng |
| `invite.xlsx` | `邀请.xlsx` | Mời (chứa sheet `每日邀请` — **lỗi định dạng**) |
| `personal-space.xlsx` | `个人空间.xlsx` | Không gian cá nhân |
| `榜单.xlsx` | *(giữ tên gốc — code không tham chiếu)* | Bảng xếp hạng |
| `cross-ingot-ranking.xlsx` | `跨服元宝排行.xlsx` | Xếp hạng Nguyên Bảo liên server |
| `cross-recharge-ranking.xlsx` | `跨服充值排行.xlsx` | Xếp hạng nạp liên server |
| `backend-mail-reward.xlsx` | `后台邮件奖励.xlsx` | Thưởng thư từ hậu trường (GM) |
| `resource-recovery.xlsx` | `资源找回.xlsx` | Tìm lại tài nguyên |
| `special-notice-config.xlsx` | `特殊通知配置.xlsx` | Cấu hình thông báo đặc biệt |
| `minigame-direct-reward.xlsx` | `小游戏直接领奖.xlsx` | Nhận thưởng trực tiếp mini-game |
| `ad-reward.xlsx` | `广告领奖.xlsx` | Thưởng xem quảng cáo |

---

## Nếu vẫn muốn có tên tiếng Anh để click

Cách an toàn duy nhất: **giữ file gốc tên tiếng Trung, tạo thêm symlink tên tiếng Anh** ở một thư mục riêng chỉ để người đọc dùng.

Trên Linux:

```bash
mkdir -p /h5/server/excel/release-en
cd /h5/server/excel/release-en
ln -s ../release/英雄.xlsx hero.xlsx
ln -s ../release/物品表.xlsm item-table.xlsm
```

Cảnh báo: **đừng mở file qua symlink rồi Save bằng Excel.** Excel lưu theo kiểu ghi file tạm rồi rename, việc đó thay thế symlink bằng file thật và làm file gốc tiếng Trung không còn được cập nhật. Chỉ dùng symlink để xem, sửa thì mở đúng file gốc.

Nói mình biết nếu muốn mình sinh sẵn toàn bộ lệnh `ln -s` cho 200 file.
