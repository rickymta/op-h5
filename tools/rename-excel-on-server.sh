#!/bin/bash
# Doi ten file Excel tieng Trung -> tieng Anh TREN SERVER LINUX,
# va (tuy chon) copy cac file dang thieu tu mot thu muc nguon.
#
# SINH TU: tools/excel-name-map.json  (188 cap ten)  -- khong sua tay file nay,
# sua mapping roi sinh lai de tranh lech giua bytecode va ten file.
#
# !!! THU TU BAT BUOC !!!
# Ten file la khoa tra cuu hardcode trong bytecode. Cac JAR tren server phai la
# BAN DA VA truoc (hoac cung luc) khi doi ten. Neu doi ten ma JAR con la ban goc
# thi moi bang cau hinh se bao "excel配置文件不存在".
#
#   1. tat server:            /h5/server/stop.sh
#   2. backup:                cp -a /h5/server/excel/release /h5/server/excel/release.bak
#   3. upload 10 JAR da va    (xem danh sach o cuoi file nay)
#   4. chay script nay:       ./rename-excel-on-server.sh --apply
#   5. copy file thieu:       ./rename-excel-on-server.sh --import /duong/dan/nguon --apply
#   6. bat server:            /h5/server/start.sh
#
# CACH DUNG
#   ./rename-excel-on-server.sh                          # dry-run, chi in ra
#   ./rename-excel-on-server.sh --apply                  # doi ten that
#   ./rename-excel-on-server.sh --import DIR             # dry-run import
#   ./rename-excel-on-server.sh --import DIR --apply     # copy that
#   ./rename-excel-on-server.sh --revert --apply         # doi nguoc ve tieng Trung

set -u
DIR="${EXCEL_DIR:-/h5/server/excel/release}"
APPLY=0; REVERT=0; IMPORT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --apply)  APPLY=1 ;;
    --revert) REVERT=1 ;;
    --import) shift; IMPORT="${1:-}" ;;
    --dir)    shift; DIR="${1:-}" ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "Tham so la: $1"; exit 2 ;;
  esac
  shift
done

[ -d "$DIR" ] || { echo "Khong thay thu muc: $DIR"; exit 1; }
cd "$DIR" || exit 1
echo "Thu muc : $DIR"
echo "Che do  : $([ $APPLY -eq 1 ] && echo 'APPLY' || echo 'DRY-RUN')$([ $REVERT -eq 1 ] && echo ' (REVERT)')"
echo

n_ok=0; n_skip=0; n_absent=0

do_mv() {   # $1 = nguon, $2 = dich
  local src="$1" dst="$2"
  if [ -e "$dst" ] && [ ! -e "$src" ]; then
    n_skip=$((n_skip+1)); return
  fi
  if [ ! -e "$src" ]; then
    echo "  THIEU  $src"
    n_absent=$((n_absent+1)); return
  fi
  if [ -e "$dst" ]; then
    echo "  ! BO QUA $src -> $dst (dich da ton tai)"
    n_skip=$((n_skip+1)); return
  fi
  echo "  $src -> $dst"
  if [ $APPLY -eq 1 ]; then mv -- "$src" "$dst" || return; fi
  n_ok=$((n_ok+1))
}

rename_all() {
  if [ $REVERT -eq 1 ]; then do_mv "free-buy.xlsx" "0元购.xlsx"; else do_mv "0元购.xlsx" "free-buy.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "bt-bug-shop.xlsx" "BTBUG商店.xlsx"; else do_mv "BTBUG商店.xlsx" "bt-bug-shop.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "bt-fake-cumulative-recharge.xlsx" "BT假累计充值.xlsx"; else do_mv "BT假累计充值.xlsx" "bt-fake-cumulative-recharge.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "bt-month-card.xlsx" "BT月卡.xlsx"; else do_mv "BT月卡.xlsx" "bt-month-card.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "bt-panda-benefit.xlsx" "BT潘达福利.xlsx"; else do_mv "BT潘达福利.xlsx" "bt-panda-benefit.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "bt-first-recharge.xlsx" "bt首充.xlsx"; else do_mv "bt首充.xlsx" "bt-first-recharge.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "vip-shop.xlsx" "vip商城.xlsx"; else do_mv "vip商城.xlsx" "vip-shop.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "login-7day.xlsx" "七日登录.xlsx"; else do_mv "七日登录.xlsx" "login-7day.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "thirty-six-heavens.xlsx" "三十六重天.xlsx"; else do_mv "三十六重天.xlsx" "thirty-six-heavens.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "ancient-war.xlsx" "上古之战.xlsx"; else do_mv "上古之战.xlsx" "ancient-war.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "exclusive-collection-release.xlsx" "专属藏品上新.xlsx"; else do_mv "专属藏品上新.xlsx" "exclusive-collection-release.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "world-boss.xlsx" "世界BOSS.xlsx"; else do_mv "世界BOSS.xlsx" "world-boss.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "personal-space.xlsx" "个人空间.xlsx"; else do_mv "个人空间.xlsx" "personal-space.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "ghost-festival-night.xlsx" "中元夜.xlsx"; else do_mv "中元夜.xlsx" "ghost-festival-night.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "main-character.xlsx" "主角.xlsx"; else do_mv "主角.xlsx" "main-character.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "universe-treasure-box.xlsx" "乾坤宝匣.xlsx"; else do_mv "乾坤宝匣.xlsx" "universe-treasure-box.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "mayday-carnival.xlsx" "五一狂欢.xlsx"; else do_mv "五一狂欢.xlsx" "mayday-carnival.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "immortal-artifact.xlsx" "仙器.xlsx"; else do_mv "仙器.xlsx" "immortal-artifact.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "immortal-artifact-rateup.xlsx" "仙器UP.xlsx"; else do_mv "仙器UP.xlsx" "immortal-artifact-rateup.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "immortal-artifact-inherit.xlsx" "仙器继承.xlsx"; else do_mv "仙器继承.xlsx" "immortal-artifact-inherit.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "jade-shop.xlsx" "仙玉商城.xlsx"; else do_mv "仙玉商城.xlsx" "jade-shop.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "midspring-month.xlsx" "仲春之月.xlsx"; else do_mv "仲春之月.xlsx" "midspring-month.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "quest.xlsx" "任务.xlsx"; else do_mv "任务.xlsx" "quest.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "lantern-festival.xlsx" "元宵喜乐.xlsx"; else do_mv "元宵喜乐.xlsx" "lantern-festival.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "recharge-benefit.xlsx" "充值福利.xlsx"; else do_mv "充值福利.xlsx" "recharge-benefit.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "recharge-item.xlsx" "充值项.xlsx"; else do_mv "充值项.xlsx" "recharge-item.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "prophet-sanctuary.xlsx" "先知圣殿.xlsx"; else do_mv "先知圣殿.xlsx" "prophet-sanctuary.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "serverwide-boss.xlsx" "全服BOSS.xlsx"; else do_mv "全服BOSS.xlsx" "serverwide-boss.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "guild.xlsx" "公会.xlsx"; else do_mv "公会.xlsx" "guild.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "guild-boss.xlsx" "公会BOSS.xlsx"; else do_mv "公会BOSS.xlsx" "guild-boss.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "guild-treasury.xlsx" "公会宝库.xlsx"; else do_mv "公会宝库.xlsx" "guild-treasury.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "guild-war.xlsx" "公会战.xlsx"; else do_mv "公会战.xlsx" "guild-war.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "beast-spirit.xlsx" "兽灵.xlsx"; else do_mv "兽灵.xlsx" "beast-spirit.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "beast-soul-share.xlsx" "兽魂共享.xlsx"; else do_mv "兽魂共享.xlsx" "beast-soul-share.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "beast-soul-prayer-rateup.xlsx" "兽魂祈祷UP.xlsx"; else do_mv "兽魂祈祷UP.xlsx" "beast-soul-prayer-rateup.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "adventure.xlsx" "冒险.xlsx"; else do_mv "冒险.xlsx" "adventure.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "legion-invasion.xlsx" "军团入侵.xlsx"; else do_mv "军团入侵.xlsx" "legion-invasion.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "championship.xlsx" "冠军赛.xlsx"; else do_mv "冠军赛.xlsx" "championship.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "lingxiao-palace.xlsx" "凌霄宝殿.xlsx"; else do_mv "凌霄宝殿.xlsx" "lingxiao-palace.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "dungeon-purchase-config.xlsx" "副本购买配置.xlsx"; else do_mv "副本购买配置.xlsx" "dungeon-purchase-config.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "study-notes.xlsx" "勤学笔记.xlsx"; else do_mv "勤学笔记.xlsx" "study-notes.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "tenfold-rebate.xlsx" "十倍返利.xlsx"; else do_mv "十倍返利.xlsx" "tenfold-rebate.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "summon-ranking.xlsx" "召唤排行.xlsx"; else do_mv "召唤排行.xlsx" "summon-ranking.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "server-merge-event.xlsx" "合服活动.xlsx"; else do_mv "合服活动.xlsx" "server-merge-event.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "name-pool.xlsx" "名字库.xlsx"; else do_mv "名字库.xlsx" "name-pool.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "backend-mail-reward.xlsx" "后台邮件奖励.xlsx"; else do_mv "后台邮件奖励.xlsx" "backend-mail-reward.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "monday-grand-gift.xlsx" "周一豪礼.xlsx"; else do_mv "周一豪礼.xlsx" "monday-grand-gift.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "destiny.xlsx" "命格.xlsx"; else do_mv "命格.xlsx" "destiny.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "destiny-dungeon.xlsx" "命格副本.xlsx"; else do_mv "命格副本.xlsx" "destiny-dungeon.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "destiny-prayer.xlsx" "命格祈祷.xlsx"; else do_mv "命格祈祷.xlsx" "destiny-prayer.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "destiny-master.xlsx" "命理大师.xlsx"; else do_mv "命理大师.xlsx" "destiny-master.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "shop.xlsx" "商城.xlsx"; else do_mv "商城.xlsx" "shop.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "return-journey.xlsx" "回归之旅.xlsx"; else do_mv "回归之旅.xlsx" "return-journey.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "nationalday-battle.xlsx" "国庆大作战.xlsx"; else do_mv "国庆大作战.xlsx" "nationalday-battle.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "nationalday-carnival.xlsx" "国庆狂欢.xlsx"; else do_mv "国庆狂欢.xlsx" "nationalday-carnival.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "nation-war.xlsx" "国战.xlsx"; else do_mv "国战.xlsx" "nation-war.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "totem.xlsx" "图腾.xlsx"; else do_mv "图腾.xlsx" "totem.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "totem-sanctuary.xlsx" "图腾圣殿.xlsx"; else do_mv "图腾圣殿.xlsx" "totem-sanctuary.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "sanctuary.xlsx" "圣域.xlsx"; else do_mv "圣域.xlsx" "sanctuary.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "christmas-tree.xlsx" "圣诞树.xlsx"; else do_mv "圣诞树.xlsx" "christmas-tree.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "realm.xlsx" "境界.xlsx"; else do_mv "境界.xlsx" "realm.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "more-the-better.xlsx" "多多益善.xlsx"; else do_mv "多多益善.xlsx" "more-the-better.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "celestial-maze.xlsx" "天界迷宫.xlsx"; else do_mv "天界迷宫.xlsx" "celestial-maze.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "falling-fortune-bag.xlsx" "天降福袋.xlsx"; else do_mv "天降福袋.xlsx" "falling-fortune-bag.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "friend-invite.xlsx" "好友邀请.xlsx"; else do_mv "好友邀请.xlsx" "friend-invite.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "custom-equipment-chest.xlsx" "定制装备宝箱.xlsx"; else do_mv "定制装备宝箱.xlsx" "custom-equipment-chest.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "chest-multi-open.xlsx" "宝箱连开.xlsx"; else do_mv "宝箱连开.xlsx" "chest-multi-open.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "baoqing-workshop.xlsx" "宝青坊.xlsx"; else do_mv "宝青坊.xlsx" "baoqing-workshop.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "instance-template.xlsx" "实例.xlsx"; else do_mv "实例.xlsx" "instance-template.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "treasure-hunt.xlsx" "寻宝.xlsx"; else do_mv "寻宝.xlsx" "treasure-hunt.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "minigame-direct-reward.xlsx" "小游戏直接领奖.xlsx"; else do_mv "小游戏直接领奖.xlsx" "minigame-direct-reward.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "peak-tournament.xlsx" "巅峰会武.xlsx"; else do_mv "巅峰会武.xlsx" "peak-tournament.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "peak-tournament-preview.xlsx" "巅峰会武预告.xlsx"; else do_mv "巅峰会武预告.xlsx" "peak-tournament-preview.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "lucky-blindbox.xlsx" "幸运盲盒.xlsx"; else do_mv "幸运盲盒.xlsx" "lucky-blindbox.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "ad-reward.xlsx" "广告领奖.xlsx"; else do_mv "广告领奖.xlsx" "ad-reward.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "launch-battlepass.xlsx" "开服战令.xlsx"; else do_mv "开服战令.xlsx" "launch-battlepass.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "launch-event.xlsx" "开服活动.xlsx"; else do_mv "开服活动.xlsx" "launch-event.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "launch-redpacket.xlsx" "开服红包.xlsx"; else do_mv "开服红包.xlsx" "launch-redpacket.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "abnormal-hero-recycle.xlsx" "异常英雄回收.xlsx"; else do_mv "异常英雄回收.xlsx" "abnormal-hero-recycle.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "cyclic-7day-fun.xlsx" "循环七天乐.xlsx"; else do_mv "循环七天乐.xlsx" "cyclic-7day-fun.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "cyclic-weekly-limited-shop.xlsx" "循环周限购商城.xlsx"; else do_mv "循环周限购商城.xlsx" "cyclic-weekly-limited-shop.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "cyclic-shop.xlsx" "循环商城.xlsx"; else do_mv "循环商城.xlsx" "cyclic-shop.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "cyclic-event.xlsx" "循环活动.xlsx"; else do_mv "循环活动.xlsx" "cyclic-event.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "cyclic-event-2.xlsx" "循环活动表二.xlsx"; else do_mv "循环活动表二.xlsx" "cyclic-event-2.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "wish-gift.xlsx" "心愿之礼.xlsx"; else do_mv "心愿之礼.xlsx" "wish-gift.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "bounty-quest.xlsx" "悬赏任务.xlsx"; else do_mv "悬赏任务.xlsx" "bounty-quest.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "thanksgiving-event.xlsx" "感恩节活动.xlsx"; else do_mv "感恩节活动.xlsx" "thanksgiving-event.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "combat.xlsx" "战斗.xlsx"; else do_mv "战斗.xlsx" "combat.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "battle-scene-config.xlsx" "战斗场景配置.xlsx"; else do_mv "战斗场景配置.xlsx" "battle-scene-config.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "text-localization.xlsx" "文本语言表.xlsx"; else do_mv "文本语言表.xlsx" "text-localization.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "login-7day-new.xlsx" "新七日登录.xlsx"; else do_mv "新七日登录.xlsx" "login-7day-new.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "newbie-benefit.xlsx" "新手福利.xlsx"; else do_mv "新手福利.xlsx" "newbie-benefit.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "new-hero-release-event.xlsx" "新英雄上新活动.xlsx"; else do_mv "新英雄上新活动.xlsx" "new-hero-release-event.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "endless-trial.xlsx" "无尽试炼.xlsx"; else do_mv "无尽试炼.xlsx" "endless-trial.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "daily-dungeon.xlsx" "日常副本.xlsx"; else do_mv "日常副本.xlsx" "daily-dungeon.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "constellation-map.xlsx" "星宿图.xlsx"; else do_mv "星宿图.xlsx" "constellation-map.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "lunar-newyear-event.xlsx" "春节活动.xlsx"; else do_mv "春节活动.xlsx" "lunar-newyear-event.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "summer-battle.xlsx" "暑期大作战.xlsx"; else do_mv "暑期大作战.xlsx" "summer-battle.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "summer-carnival.xlsx" "暑期狂欢.xlsx"; else do_mv "暑期狂欢.xlsx" "summer-carnival.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "substitute-hero.xlsx" "替补英雄.xlsx"; else do_mv "替补英雄.xlsx" "substitute-hero.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "dream-boss.xlsx" "梦境BOSS.xlsx"; else do_mv "梦境BOSS.xlsx" "dream-boss.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "arbor-day.xlsx" "植树节.xlsx"; else do_mv "植树节.xlsx" "arbor-day.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "midautumn-festival.xlsx" "欢度中秋.xlsx"; else do_mv "欢度中秋.xlsx" "midautumn-festival.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "monthly-first-recharge.xlsx" "每月首充.xlsx"; else do_mv "每月首充.xlsx" "monthly-first-recharge.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "blessed-grotto.xlsx" "洞天福地.xlsx"; else do_mv "洞天福地.xlsx" "blessed-grotto.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "overseas.xlsx" "海外.xlsx"; else do_mv "海外.xlsx" "overseas.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "overseas-login-gift.xlsx" "海外登录豪礼.xlsx"; else do_mv "海外登录豪礼.xlsx" "overseas-login-gift.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "overseas-prereg-mail.xlsx" "海外预约邮件.xlsx"; else do_mv "海外预约邮件.xlsx" "overseas-prereg-mail.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "rejiang-hero-starup.xlsx" "热江英雄升星.xlsx"; else do_mv "热江英雄升星.xlsx" "rejiang-hero-starup.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "item-table.xlsm" "物品表.xlsm"; else do_mv "物品表.xlsm" "item-table.xlsm"; fi
  if [ $REVERT -eq 1 ]; then do_mv "special-notice-config.xlsx" "特殊通知配置.xlsx"; else do_mv "特殊通知配置.xlsx" "special-notice-config.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "carnival-7day-fun.xlsx" "狂欢七天乐.xlsx"; else do_mv "狂欢七天乐.xlsx" "carnival-7day-fun.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "hundred-pull-reward.xlsx" "百抽奖励.xlsx"; else do_mv "百抽奖励.xlsx" "hundred-pull-reward.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "province-city-region.xlsx" "省市地区.xlsx"; else do_mv "省市地区.xlsx" "province-city-region.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "divine-artifact.xlsx" "神器.xlsx"; else do_mv "神器.xlsx" "divine-artifact.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "divine-equipment.xlsx" "神装表.xlsx"; else do_mv "神装表.xlsx" "divine-equipment.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "divine-dragon.xlsx" "神龙.xlsx"; else do_mv "神龙.xlsx" "divine-dragon.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "divine-dragon-battlepass.xlsx" "神龙战令.xlsx"; else do_mv "神龙战令.xlsx" "divine-dragon-battlepass.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "personal-customisation.xlsx" "私人定制.xlsx"; else do_mv "私人定制.xlsx" "personal-customisation.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "race-tower.xlsx" "种族塔.xlsx"; else do_mv "种族塔.xlsx" "race-tower.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "race-arena.xlsx" "种族竞技.xlsx"; else do_mv "种族竞技.xlsx" "race-arena.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "accumulated-day-gift.xlsx" "积天豪礼.xlsx"; else do_mv "积天豪礼.xlsx" "accumulated-day-gift.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "arena.xlsx" "竞技场.xlsx"; else do_mv "竞技场.xlsx" "arena.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "dragonboat-festival.xlsx" "端午龙舟.xlsx"; else do_mv "端午龙舟.xlsx" "dragonboat-festival.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "rune.xlsx" "符文.xlsx"; else do_mv "符文.xlsx" "rune.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "rune-week-card.xlsx" "符文周卡.xlsx"; else do_mv "符文周卡.xlsx" "rune-week-card.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "checkin.xlsx" "签到.xlsx"; else do_mv "签到.xlsx" "checkin.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "elite-avatar-frame.xlsx" "精英头像框.xlsx"; else do_mv "精英头像框.xlsx" "elite-avatar-frame.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "system-prompt-localization.xlsx" "系统提示语言表.xlsx"; else do_mv "系统提示语言表.xlsx" "system-prompt-localization.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "system-text.xlsx" "系统文本.xlsx"; else do_mv "系统文本.xlsx" "system-text.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "cumulative-recharge.xlsx" "累计充值.xlsx"; else do_mv "累计充值.xlsx" "cumulative-recharge.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "redpacket-rain.xlsx" "红包雨.xlsx"; else do_mv "红包雨.xlsx" "redpacket-rain.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "team-championship.xlsx" "组队冠军赛.xlsx"; else do_mv "组队冠军赛.xlsx" "team-championship.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "bond.xlsx" "羁绊.xlsx"; else do_mv "羁绊.xlsx" "bond.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "chat.xlsx" "聊天.xlsx"; else do_mv "聊天.xlsx" "chat.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "chat-tag.xlsx" "聊天标签.xlsx"; else do_mv "聊天标签.xlsx" "chat-tag.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "class-immortal-artifact.xlsx" "职业仙器.xlsx"; else do_mv "职业仙器.xlsx" "class-immortal-artifact.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "calendarday-login-event.xlsx" "自然日登录活动.xlsx"; else do_mv "自然日登录活动.xlsx" "calendarday-login-event.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "fragrant-gift.xlsx" "芬芳赠礼.xlsx"; else do_mv "芬芳赠礼.xlsx" "fragrant-gift.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "hero.xlsx" "英雄.xlsx"; else do_mv "英雄.xlsx" "hero.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "hero-summon.xlsx" "英雄召唤.xlsx"; else do_mv "英雄召唤.xlsx" "hero-summon.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "hero-week-card.xlsx" "英雄周卡.xlsx"; else do_mv "英雄周卡.xlsx" "hero-week-card.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "hero-rollback.xlsx" "英雄回退.xlsx"; else do_mv "英雄回退.xlsx" "hero-rollback.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "hero-deification-altar.xlsx" "英雄封神台.xlsx"; else do_mv "英雄封神台.xlsx" "hero-deification-altar.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "hero-sacrifice.xlsx" "英雄献祭.xlsx"; else do_mv "英雄献祭.xlsx" "hero-sacrifice.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "hero-wish-pool.xlsx" "英雄祈愿池.xlsx"; else do_mv "英雄祈愿池.xlsx" "hero-wish-pool.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "hero-inherit.xlsx" "英雄继承.xlsx"; else do_mv "英雄继承.xlsx" "hero-inherit.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "hero-bond.xlsx" "英雄羁绊.xlsx"; else do_mv "英雄羁绊.xlsx" "hero-bond.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "hero-expedition.xlsx" "英雄远征.xlsx"; else do_mv "英雄远征.xlsx" "hero-expedition.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "honour-pendant.xlsx" "荣誉挂件.xlsx"; else do_mv "荣誉挂件.xlsx" "honour-pendant.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "primordial-era.xlsx" "莽荒纪.xlsx"; else do_mv "莽荒纪.xlsx" "primordial-era.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "bodhi-tree.xlsx" "菩提树.xlsx"; else do_mv "菩提树.xlsx" "bodhi-tree.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "collection.xlsx" "藏品.xlsx"; else do_mv "藏品.xlsx" "collection.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "collection-seal.xlsx" "藏品封印.xlsx"; else do_mv "藏品封印.xlsx" "collection-seal.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "collection-awaken-wheel.xlsx" "藏品觉醒转盘.xlsx"; else do_mv "藏品觉醒转盘.xlsx" "collection-awaken-wheel.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "fusion-temple.xlsx" "融合神殿.xlsx"; else do_mv "融合神殿.xlsx" "fusion-temple.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "equipment-week-card.xlsx" "装备周卡.xlsx"; else do_mv "装备周卡.xlsx" "equipment-week-card.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "equipment-table.xlsx" "装备表.xlsx"; else do_mv "装备表.xlsx" "equipment-table.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "resource-recovery.xlsx" "资源找回.xlsx"; else do_mv "资源找回.xlsx" "resource-recovery.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "value-pack.xlsx" "超值礼包.xlsx"; else do_mv "超值礼包.xlsx" "value-pack.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "value-first-recharge.xlsx" "超值首充.xlsx"; else do_mv "超值首充.xlsx" "value-first-recharge.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "super-wheel.xlsx" "超级转盘.xlsx"; else do_mv "超级转盘.xlsx" "super-wheel.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "cross-boss.xlsx" "跨服BOSS.xlsx"; else do_mv "跨服BOSS.xlsx" "cross-boss.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "cross-ingot-ranking.xlsx" "跨服元宝排行.xlsx"; else do_mv "跨服元宝排行.xlsx" "cross-ingot-ranking.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "cross-recharge-ranking.xlsx" "跨服充值排行.xlsx"; else do_mv "跨服充值排行.xlsx" "cross-recharge-ranking.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "cross-ladder.xlsx" "跨服天梯.xlsx"; else do_mv "跨服天梯.xlsx" "cross-ladder.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "cross-rank-match.xlsx" "跨服段位赛.xlsx"; else do_mv "跨服段位赛.xlsx" "cross-rank-match.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "cross-arena.xlsx" "跨服竞技场.xlsx"; else do_mv "跨服竞技场.xlsx" "cross-arena.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "linked-hero.xlsx" "连线英雄.xlsx"; else do_mv "连线英雄.xlsx" "linked-hero.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "consecutive-recharge.xlsx" "连续充值.xlsx"; else do_mv "连续充值.xlsx" "consecutive-recharge.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "tower-of-heaven.xlsx" "通天塔.xlsx"; else do_mv "通天塔.xlsx" "tower-of-heaven.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "common.xlsx" "通用.xlsx"; else do_mv "通用.xlsx" "common.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "generic-leaderboard-reward.xlsx" "通用排行榜奖励.xlsx"; else do_mv "通用排行榜奖励.xlsx" "generic-leaderboard-reward.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "generic-event-choice-pack.xlsx" "通用活动之自选礼包.xlsx"; else do_mv "通用活动之自选礼包.xlsx" "generic-event-choice-pack.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "invite.xlsx" "邀请.xlsx"; else do_mv "邀请.xlsx" "invite.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "mail-privilege-shop.xlsx" "邮件特权商城.xlsx"; else do_mv "邮件特权商城.xlsx" "mail-privilege-shop.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "reset.xlsx" "重置.xlsx"; else do_mv "重置.xlsx" "reset.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "gold-shop.xlsx" "金币商店.xlsx"; else do_mv "金币商店.xlsx" "gold-shop.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "limited-hero-summon.xlsx" "限定英雄召唤.xlsx"; else do_mv "限定英雄召唤.xlsx" "limited-hero-summon.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "timed-rollback.xlsx" "限时回退.xlsx"; else do_mv "限时回退.xlsx" "timed-rollback.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "timed-login.xlsx" "限时登陆.xlsx"; else do_mv "限时登陆.xlsx" "timed-login.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "timed-skin-shop.xlsx" "限时皮肤商店.xlsx"; else do_mv "限时皮肤商店.xlsx" "timed-skin-shop.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "timed-reset.xlsx" "限时重置.xlsx"; else do_mv "限时重置.xlsx" "timed-reset.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "prereg-reward.xlsx" "预约奖励.xlsx"; else do_mv "预约奖励.xlsx" "prereg-reward.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "alert-threshold.xlsx" "预警.xlsx"; else do_mv "预警.xlsx" "alert-threshold.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "exorcism-night.xlsx" "驱魔之夜.xlsx"; else do_mv "驱魔之夜.xlsx" "exorcism-night.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "magic-trick.xlsx" "魔术戏法.xlsx"; else do_mv "魔术戏法.xlsx" "magic-trick.xlsx"; fi
  if [ $REVERT -eq 1 ]; then do_mv "great-fortune.xlsx" "鸿运当头.xlsx"; else do_mv "鸿运当头.xlsx" "great-fortune.xlsx"; fi
}

import_missing() {
  local SRC="$1"
  [ -d "$SRC" ] || { echo "Khong thay thu muc nguon: $SRC"; exit 1; }
  echo "Nguon: $SRC"
  echo
  local cn en found=0 miss=0
  while IFS='|' read -r cn en; do
    [ -n "$en" ] || continue
    if [ -e "$DIR/$en" ]; then continue; fi          # da co roi
    local f=""
    if   [ -e "$SRC/$cn" ]; then f="$SRC/$cn"
    elif [ -e "$SRC/$en" ]; then f="$SRC/$en"
    else f="$(find "$SRC" -type f -name "$cn" -print -quit 2>/dev/null)"
         [ -n "$f" ] || f="$(find "$SRC" -type f -name "$en" -print -quit 2>/dev/null)"
    fi
    if [ -n "$f" ] && [ -e "$f" ]; then
      echo "  COPY  $(basename "$f")  ->  $en"
      [ $APPLY -eq 1 ] && cp -p -- "$f" "$DIR/$en"
      found=$((found+1))
    else
      echo "  VAN THIEU  $en   (goc: $cn)"
      miss=$((miss+1))
    fi
  done <<'PAIRS'
0元购.xlsx|free-buy.xlsx
BTBUG商店.xlsx|bt-bug-shop.xlsx
BT假累计充值.xlsx|bt-fake-cumulative-recharge.xlsx
BT月卡.xlsx|bt-month-card.xlsx
BT潘达福利.xlsx|bt-panda-benefit.xlsx
bt首充.xlsx|bt-first-recharge.xlsx
vip商城.xlsx|vip-shop.xlsx
七日登录.xlsx|login-7day.xlsx
三十六重天.xlsx|thirty-six-heavens.xlsx
上古之战.xlsx|ancient-war.xlsx
专属藏品上新.xlsx|exclusive-collection-release.xlsx
世界BOSS.xlsx|world-boss.xlsx
个人空间.xlsx|personal-space.xlsx
中元夜.xlsx|ghost-festival-night.xlsx
主角.xlsx|main-character.xlsx
乾坤宝匣.xlsx|universe-treasure-box.xlsx
五一狂欢.xlsx|mayday-carnival.xlsx
仙器.xlsx|immortal-artifact.xlsx
仙器UP.xlsx|immortal-artifact-rateup.xlsx
仙器继承.xlsx|immortal-artifact-inherit.xlsx
仙玉商城.xlsx|jade-shop.xlsx
仲春之月.xlsx|midspring-month.xlsx
任务.xlsx|quest.xlsx
元宵喜乐.xlsx|lantern-festival.xlsx
充值福利.xlsx|recharge-benefit.xlsx
充值项.xlsx|recharge-item.xlsx
先知圣殿.xlsx|prophet-sanctuary.xlsx
全服BOSS.xlsx|serverwide-boss.xlsx
公会.xlsx|guild.xlsx
公会BOSS.xlsx|guild-boss.xlsx
公会宝库.xlsx|guild-treasury.xlsx
公会战.xlsx|guild-war.xlsx
兽灵.xlsx|beast-spirit.xlsx
兽魂共享.xlsx|beast-soul-share.xlsx
兽魂祈祷UP.xlsx|beast-soul-prayer-rateup.xlsx
冒险.xlsx|adventure.xlsx
军团入侵.xlsx|legion-invasion.xlsx
冠军赛.xlsx|championship.xlsx
凌霄宝殿.xlsx|lingxiao-palace.xlsx
副本购买配置.xlsx|dungeon-purchase-config.xlsx
勤学笔记.xlsx|study-notes.xlsx
十倍返利.xlsx|tenfold-rebate.xlsx
召唤排行.xlsx|summon-ranking.xlsx
合服活动.xlsx|server-merge-event.xlsx
名字库.xlsx|name-pool.xlsx
后台邮件奖励.xlsx|backend-mail-reward.xlsx
周一豪礼.xlsx|monday-grand-gift.xlsx
命格.xlsx|destiny.xlsx
命格副本.xlsx|destiny-dungeon.xlsx
命格祈祷.xlsx|destiny-prayer.xlsx
命理大师.xlsx|destiny-master.xlsx
商城.xlsx|shop.xlsx
回归之旅.xlsx|return-journey.xlsx
国庆大作战.xlsx|nationalday-battle.xlsx
国庆狂欢.xlsx|nationalday-carnival.xlsx
国战.xlsx|nation-war.xlsx
图腾.xlsx|totem.xlsx
图腾圣殿.xlsx|totem-sanctuary.xlsx
圣域.xlsx|sanctuary.xlsx
圣诞树.xlsx|christmas-tree.xlsx
境界.xlsx|realm.xlsx
多多益善.xlsx|more-the-better.xlsx
天界迷宫.xlsx|celestial-maze.xlsx
天降福袋.xlsx|falling-fortune-bag.xlsx
好友邀请.xlsx|friend-invite.xlsx
定制装备宝箱.xlsx|custom-equipment-chest.xlsx
宝箱连开.xlsx|chest-multi-open.xlsx
宝青坊.xlsx|baoqing-workshop.xlsx
实例.xlsx|instance-template.xlsx
寻宝.xlsx|treasure-hunt.xlsx
小游戏直接领奖.xlsx|minigame-direct-reward.xlsx
巅峰会武.xlsx|peak-tournament.xlsx
巅峰会武预告.xlsx|peak-tournament-preview.xlsx
幸运盲盒.xlsx|lucky-blindbox.xlsx
广告领奖.xlsx|ad-reward.xlsx
开服战令.xlsx|launch-battlepass.xlsx
开服活动.xlsx|launch-event.xlsx
开服红包.xlsx|launch-redpacket.xlsx
异常英雄回收.xlsx|abnormal-hero-recycle.xlsx
循环七天乐.xlsx|cyclic-7day-fun.xlsx
循环周限购商城.xlsx|cyclic-weekly-limited-shop.xlsx
循环商城.xlsx|cyclic-shop.xlsx
循环活动.xlsx|cyclic-event.xlsx
循环活动表二.xlsx|cyclic-event-2.xlsx
心愿之礼.xlsx|wish-gift.xlsx
悬赏任务.xlsx|bounty-quest.xlsx
感恩节活动.xlsx|thanksgiving-event.xlsx
战斗.xlsx|combat.xlsx
战斗场景配置.xlsx|battle-scene-config.xlsx
文本语言表.xlsx|text-localization.xlsx
新七日登录.xlsx|login-7day-new.xlsx
新手福利.xlsx|newbie-benefit.xlsx
新英雄上新活动.xlsx|new-hero-release-event.xlsx
无尽试炼.xlsx|endless-trial.xlsx
日常副本.xlsx|daily-dungeon.xlsx
星宿图.xlsx|constellation-map.xlsx
春节活动.xlsx|lunar-newyear-event.xlsx
暑期大作战.xlsx|summer-battle.xlsx
暑期狂欢.xlsx|summer-carnival.xlsx
替补英雄.xlsx|substitute-hero.xlsx
梦境BOSS.xlsx|dream-boss.xlsx
植树节.xlsx|arbor-day.xlsx
欢度中秋.xlsx|midautumn-festival.xlsx
每月首充.xlsx|monthly-first-recharge.xlsx
洞天福地.xlsx|blessed-grotto.xlsx
海外.xlsx|overseas.xlsx
海外登录豪礼.xlsx|overseas-login-gift.xlsx
海外预约邮件.xlsx|overseas-prereg-mail.xlsx
热江英雄升星.xlsx|rejiang-hero-starup.xlsx
物品表.xlsm|item-table.xlsm
特殊通知配置.xlsx|special-notice-config.xlsx
狂欢七天乐.xlsx|carnival-7day-fun.xlsx
百抽奖励.xlsx|hundred-pull-reward.xlsx
省市地区.xlsx|province-city-region.xlsx
神器.xlsx|divine-artifact.xlsx
神装表.xlsx|divine-equipment.xlsx
神龙.xlsx|divine-dragon.xlsx
神龙战令.xlsx|divine-dragon-battlepass.xlsx
私人定制.xlsx|personal-customisation.xlsx
种族塔.xlsx|race-tower.xlsx
种族竞技.xlsx|race-arena.xlsx
积天豪礼.xlsx|accumulated-day-gift.xlsx
竞技场.xlsx|arena.xlsx
端午龙舟.xlsx|dragonboat-festival.xlsx
符文.xlsx|rune.xlsx
符文周卡.xlsx|rune-week-card.xlsx
签到.xlsx|checkin.xlsx
精英头像框.xlsx|elite-avatar-frame.xlsx
系统提示语言表.xlsx|system-prompt-localization.xlsx
系统文本.xlsx|system-text.xlsx
累计充值.xlsx|cumulative-recharge.xlsx
红包雨.xlsx|redpacket-rain.xlsx
组队冠军赛.xlsx|team-championship.xlsx
羁绊.xlsx|bond.xlsx
聊天.xlsx|chat.xlsx
聊天标签.xlsx|chat-tag.xlsx
职业仙器.xlsx|class-immortal-artifact.xlsx
自然日登录活动.xlsx|calendarday-login-event.xlsx
芬芳赠礼.xlsx|fragrant-gift.xlsx
英雄.xlsx|hero.xlsx
英雄召唤.xlsx|hero-summon.xlsx
英雄周卡.xlsx|hero-week-card.xlsx
英雄回退.xlsx|hero-rollback.xlsx
英雄封神台.xlsx|hero-deification-altar.xlsx
英雄献祭.xlsx|hero-sacrifice.xlsx
英雄祈愿池.xlsx|hero-wish-pool.xlsx
英雄继承.xlsx|hero-inherit.xlsx
英雄羁绊.xlsx|hero-bond.xlsx
英雄远征.xlsx|hero-expedition.xlsx
荣誉挂件.xlsx|honour-pendant.xlsx
莽荒纪.xlsx|primordial-era.xlsx
菩提树.xlsx|bodhi-tree.xlsx
藏品.xlsx|collection.xlsx
藏品封印.xlsx|collection-seal.xlsx
藏品觉醒转盘.xlsx|collection-awaken-wheel.xlsx
融合神殿.xlsx|fusion-temple.xlsx
装备周卡.xlsx|equipment-week-card.xlsx
装备表.xlsx|equipment-table.xlsx
资源找回.xlsx|resource-recovery.xlsx
超值礼包.xlsx|value-pack.xlsx
超值首充.xlsx|value-first-recharge.xlsx
超级转盘.xlsx|super-wheel.xlsx
跨服BOSS.xlsx|cross-boss.xlsx
跨服元宝排行.xlsx|cross-ingot-ranking.xlsx
跨服充值排行.xlsx|cross-recharge-ranking.xlsx
跨服天梯.xlsx|cross-ladder.xlsx
跨服段位赛.xlsx|cross-rank-match.xlsx
跨服竞技场.xlsx|cross-arena.xlsx
连线英雄.xlsx|linked-hero.xlsx
连续充值.xlsx|consecutive-recharge.xlsx
通天塔.xlsx|tower-of-heaven.xlsx
通用.xlsx|common.xlsx
通用排行榜奖励.xlsx|generic-leaderboard-reward.xlsx
通用活动之自选礼包.xlsx|generic-event-choice-pack.xlsx
邀请.xlsx|invite.xlsx
邮件特权商城.xlsx|mail-privilege-shop.xlsx
重置.xlsx|reset.xlsx
金币商店.xlsx|gold-shop.xlsx
限定英雄召唤.xlsx|limited-hero-summon.xlsx
限时回退.xlsx|timed-rollback.xlsx
限时登陆.xlsx|timed-login.xlsx
限时皮肤商店.xlsx|timed-skin-shop.xlsx
限时重置.xlsx|timed-reset.xlsx
预约奖励.xlsx|prereg-reward.xlsx
预警.xlsx|alert-threshold.xlsx
驱魔之夜.xlsx|exorcism-night.xlsx
魔术戏法.xlsx|magic-trick.xlsx
鸿运当头.xlsx|great-fortune.xlsx
PAIRS
  echo
  echo "Tim thay: $found | Van thieu: $miss"
}

if [ -n "$IMPORT" ]; then
  import_missing "$IMPORT"
else
  rename_all
  echo
  echo "Doi ten: $n_ok | Bo qua (da dung ten): $n_skip | Khong co tren dia: $n_absent"
fi

if [ $APPLY -eq 0 ]; then
  echo
  echo "DRY-RUN: chua thay doi gi. Them --apply de chay that."
fi

# ---------------------------------------------------------------------------
# 10 JAR phai upload ban DA VA (tu may Windows, duong dan tuong ung tren server):
#   server/game/tcg-game.jar                        -> /h5/server/game/
#   server/game/lib/tcg-common-1.5.0-SNAPSHOT.jar   -> /h5/server/game/lib/
#   server/world/tcg-world-server-0.0.1-SNAPSHOT.jar     -> /h5/server/world/
#   server/cross/tcg-cross.jar                      -> /h5/server/cross/
#   server/group/tcg-group.jar                      -> /h5/server/group/
#   server/pay/tcg-pay-server-0.0.1-SNAPSHOT.jar    -> /h5/server/pay/
#   server/statistic/tcg-stat-server-0.0.1-SNAPSHOT.jar -> /h5/server/statistic/
#   server/console/tcg-console-server-0.0.1-SNAPSHOT.jar -> /h5/server/console/
#   server/login/tcg-login-server-0.0.1-SNAPSHOT.jar     -> /h5/server/login/
#   server/meta/tcg-meta-0.0.1-SNAPSHOT.jar         -> /h5/server/meta/
# ---------------------------------------------------------------------------
