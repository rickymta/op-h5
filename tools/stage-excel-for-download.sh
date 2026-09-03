#!/bin/bash
# Chay TREN SERVER LINUX. Copy file Excel ra mot thu muc staging voi TEN ASCII
# tieng Anh, de khi tai ve may local thi ten khong con kha nang bi hong encoding.
#
# KHONG SUA GI TRONG THU MUC GOC -- chi doc va copy ra ngoai.
#
# CACH DUNG
#   ./stage-excel-for-download.sh                  # dry-run
#   ./stage-excel-for-download.sh --apply          # copy that
#   SRC=/duong/khac DST=/tmp/x ./stage-excel-for-download.sh --apply
#
# SAU DO tai ve:
#   tar -czf /tmp/excel-en.tar.gz -C /tmp/excel-staging .
#   # roi scp/sftp file .tar.gz nay ve may local
#
# Ten trong staging deu la ASCII nen scp/sftp/FTP/download qua web deu an toan.

set -u
SRC="${SRC:-/h5/server/excel/release}"
DST="${DST:-/tmp/excel-staging}"
APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

[ -d "$SRC" ] || { echo "Khong thay thu muc nguon: $SRC"; exit 1; }
echo "Nguon   : $SRC"
echo "Staging : $DST"
echo "Che do  : $([ $APPLY -eq 1 ] && echo APPLY || echo DRY-RUN)"
echo
[ $APPLY -eq 1 ] && mkdir -p "$DST"

n=0; miss=0
cpx() {   # $1 = ten goc, $2 = ten ASCII dich
  if [ -e "$SRC/$1" ]; then
    echo "  cp \"$1\" -> $2"
    if [ $APPLY -eq 1 ]; then
      cp -p -- "$SRC/$1" "$DST/$2"
      printf '%s
' "$1" >> "$DST/_goc-da-copy.txt"
    fi
    n=$((n+1))
  else
    miss=$((miss+1))
  fi
}

cpx "0元购.xlsx" "free-buy.xlsx"
cpx "BTBUG商店.xlsx" "bt-bug-shop.xlsx"
cpx "BT假累计充值.xlsx" "bt-fake-cumulative-recharge.xlsx"
cpx "BT月卡.xlsx" "bt-month-card.xlsx"
cpx "BT潘达福利.xlsx" "bt-panda-benefit.xlsx"
cpx "bt首充.xlsx" "bt-first-recharge.xlsx"
cpx "vip商城.xlsx" "vip-shop.xlsx"
cpx "七日登录.xlsx" "login-7day.xlsx"
cpx "三十六重天.xlsx" "thirty-six-heavens.xlsx"
cpx "上古之战.xlsx" "ancient-war.xlsx"
cpx "专属藏品上新.xlsx" "exclusive-collection-release.xlsx"
cpx "世界BOSS.xlsx" "world-boss.xlsx"
cpx "个人空间.xlsx" "personal-space.xlsx"
cpx "中元夜.xlsx" "ghost-festival-night.xlsx"
cpx "主角.xlsx" "main-character.xlsx"
cpx "乾坤宝匣.xlsx" "universe-treasure-box.xlsx"
cpx "五一狂欢.xlsx" "mayday-carnival.xlsx"
cpx "仙器.xlsx" "immortal-artifact.xlsx"
cpx "仙器UP.xlsx" "immortal-artifact-rateup.xlsx"
cpx "仙器继承.xlsx" "immortal-artifact-inherit.xlsx"
cpx "仙玉商城.xlsx" "jade-shop.xlsx"
cpx "仲春之月.xlsx" "midspring-month.xlsx"
cpx "任务.xlsx" "quest.xlsx"
cpx "元宵喜乐.xlsx" "lantern-festival.xlsx"
cpx "充值福利.xlsx" "recharge-benefit.xlsx"
cpx "充值项.xlsx" "recharge-item.xlsx"
cpx "先知圣殿.xlsx" "prophet-sanctuary.xlsx"
cpx "全服BOSS.xlsx" "serverwide-boss.xlsx"
cpx "公会.xlsx" "guild.xlsx"
cpx "公会BOSS.xlsx" "guild-boss.xlsx"
cpx "公会宝库.xlsx" "guild-treasury.xlsx"
cpx "公会战.xlsx" "guild-war.xlsx"
cpx "兽灵.xlsx" "beast-spirit.xlsx"
cpx "兽魂共享.xlsx" "beast-soul-share.xlsx"
cpx "兽魂祈祷UP.xlsx" "beast-soul-prayer-rateup.xlsx"
cpx "冒险.xlsx" "adventure.xlsx"
cpx "军团入侵.xlsx" "legion-invasion.xlsx"
cpx "冠军赛.xlsx" "championship.xlsx"
cpx "凌霄宝殿.xlsx" "lingxiao-palace.xlsx"
cpx "副本购买配置.xlsx" "dungeon-purchase-config.xlsx"
cpx "勤学笔记.xlsx" "study-notes.xlsx"
cpx "十倍返利.xlsx" "tenfold-rebate.xlsx"
cpx "召唤排行.xlsx" "summon-ranking.xlsx"
cpx "合服活动.xlsx" "server-merge-event.xlsx"
cpx "名字库.xlsx" "name-pool.xlsx"
cpx "后台邮件奖励.xlsx" "backend-mail-reward.xlsx"
cpx "周一豪礼.xlsx" "monday-grand-gift.xlsx"
cpx "命格.xlsx" "destiny.xlsx"
cpx "命格副本.xlsx" "destiny-dungeon.xlsx"
cpx "命格祈祷.xlsx" "destiny-prayer.xlsx"
cpx "命理大师.xlsx" "destiny-master.xlsx"
cpx "商城.xlsx" "shop.xlsx"
cpx "回归之旅.xlsx" "return-journey.xlsx"
cpx "国庆大作战.xlsx" "nationalday-battle.xlsx"
cpx "国庆狂欢.xlsx" "nationalday-carnival.xlsx"
cpx "国战.xlsx" "nation-war.xlsx"
cpx "图腾.xlsx" "totem.xlsx"
cpx "图腾圣殿.xlsx" "totem-sanctuary.xlsx"
cpx "圣域.xlsx" "sanctuary.xlsx"
cpx "圣诞树.xlsx" "christmas-tree.xlsx"
cpx "境界.xlsx" "realm.xlsx"
cpx "多多益善.xlsx" "more-the-better.xlsx"
cpx "天界迷宫.xlsx" "celestial-maze.xlsx"
cpx "天降福袋.xlsx" "falling-fortune-bag.xlsx"
cpx "好友邀请.xlsx" "friend-invite.xlsx"
cpx "定制装备宝箱.xlsx" "custom-equipment-chest.xlsx"
cpx "宝箱连开.xlsx" "chest-multi-open.xlsx"
cpx "宝青坊.xlsx" "baoqing-workshop.xlsx"
cpx "实例.xlsx" "instance-template.xlsx"
cpx "寻宝.xlsx" "treasure-hunt.xlsx"
cpx "小游戏直接领奖.xlsx" "minigame-direct-reward.xlsx"
cpx "巅峰会武.xlsx" "peak-tournament.xlsx"
cpx "巅峰会武预告.xlsx" "peak-tournament-preview.xlsx"
cpx "幸运盲盒.xlsx" "lucky-blindbox.xlsx"
cpx "广告领奖.xlsx" "ad-reward.xlsx"
cpx "开服战令.xlsx" "launch-battlepass.xlsx"
cpx "开服活动.xlsx" "launch-event.xlsx"
cpx "开服红包.xlsx" "launch-redpacket.xlsx"
cpx "异常英雄回收.xlsx" "abnormal-hero-recycle.xlsx"
cpx "循环七天乐.xlsx" "cyclic-7day-fun.xlsx"
cpx "循环周限购商城.xlsx" "cyclic-weekly-limited-shop.xlsx"
cpx "循环商城.xlsx" "cyclic-shop.xlsx"
cpx "循环活动.xlsx" "cyclic-event.xlsx"
cpx "循环活动表二.xlsx" "cyclic-event-2.xlsx"
cpx "心愿之礼.xlsx" "wish-gift.xlsx"
cpx "悬赏任务.xlsx" "bounty-quest.xlsx"
cpx "感恩节活动.xlsx" "thanksgiving-event.xlsx"
cpx "战斗.xlsx" "combat.xlsx"
cpx "战斗场景配置.xlsx" "battle-scene-config.xlsx"
cpx "文本语言表.xlsx" "text-localization.xlsx"
cpx "新七日登录.xlsx" "login-7day-new.xlsx"
cpx "新手福利.xlsx" "newbie-benefit.xlsx"
cpx "新英雄上新活动.xlsx" "new-hero-release-event.xlsx"
cpx "无尽试炼.xlsx" "endless-trial.xlsx"
cpx "日常副本.xlsx" "daily-dungeon.xlsx"
cpx "星宿图.xlsx" "constellation-map.xlsx"
cpx "春节活动.xlsx" "lunar-newyear-event.xlsx"
cpx "暑期大作战.xlsx" "summer-battle.xlsx"
cpx "暑期狂欢.xlsx" "summer-carnival.xlsx"
cpx "替补英雄.xlsx" "substitute-hero.xlsx"
cpx "梦境BOSS.xlsx" "dream-boss.xlsx"
cpx "植树节.xlsx" "arbor-day.xlsx"
cpx "欢度中秋.xlsx" "midautumn-festival.xlsx"
cpx "每月首充.xlsx" "monthly-first-recharge.xlsx"
cpx "洞天福地.xlsx" "blessed-grotto.xlsx"
cpx "海外.xlsx" "overseas.xlsx"
cpx "海外登录豪礼.xlsx" "overseas-login-gift.xlsx"
cpx "海外预约邮件.xlsx" "overseas-prereg-mail.xlsx"
cpx "热江英雄升星.xlsx" "rejiang-hero-starup.xlsx"
cpx "物品表.xlsm" "item-table.xlsm"
cpx "特殊通知配置.xlsx" "special-notice-config.xlsx"
cpx "狂欢七天乐.xlsx" "carnival-7day-fun.xlsx"
cpx "百抽奖励.xlsx" "hundred-pull-reward.xlsx"
cpx "省市地区.xlsx" "province-city-region.xlsx"
cpx "神器.xlsx" "divine-artifact.xlsx"
cpx "神装表.xlsx" "divine-equipment.xlsx"
cpx "神龙.xlsx" "divine-dragon.xlsx"
cpx "神龙战令.xlsx" "divine-dragon-battlepass.xlsx"
cpx "私人定制.xlsx" "personal-customisation.xlsx"
cpx "种族塔.xlsx" "race-tower.xlsx"
cpx "种族竞技.xlsx" "race-arena.xlsx"
cpx "积天豪礼.xlsx" "accumulated-day-gift.xlsx"
cpx "竞技场.xlsx" "arena.xlsx"
cpx "端午龙舟.xlsx" "dragonboat-festival.xlsx"
cpx "符文.xlsx" "rune.xlsx"
cpx "符文周卡.xlsx" "rune-week-card.xlsx"
cpx "签到.xlsx" "checkin.xlsx"
cpx "精英头像框.xlsx" "elite-avatar-frame.xlsx"
cpx "系统提示语言表.xlsx" "system-prompt-localization.xlsx"
cpx "系统文本.xlsx" "system-text.xlsx"
cpx "累计充值.xlsx" "cumulative-recharge.xlsx"
cpx "红包雨.xlsx" "redpacket-rain.xlsx"
cpx "组队冠军赛.xlsx" "team-championship.xlsx"
cpx "羁绊.xlsx" "bond.xlsx"
cpx "聊天.xlsx" "chat.xlsx"
cpx "聊天标签.xlsx" "chat-tag.xlsx"
cpx "职业仙器.xlsx" "class-immortal-artifact.xlsx"
cpx "自然日登录活动.xlsx" "calendarday-login-event.xlsx"
cpx "芬芳赠礼.xlsx" "fragrant-gift.xlsx"
cpx "英雄.xlsx" "hero.xlsx"
cpx "英雄召唤.xlsx" "hero-summon.xlsx"
cpx "英雄周卡.xlsx" "hero-week-card.xlsx"
cpx "英雄回退.xlsx" "hero-rollback.xlsx"
cpx "英雄封神台.xlsx" "hero-deification-altar.xlsx"
cpx "英雄献祭.xlsx" "hero-sacrifice.xlsx"
cpx "英雄祈愿池.xlsx" "hero-wish-pool.xlsx"
cpx "英雄继承.xlsx" "hero-inherit.xlsx"
cpx "英雄羁绊.xlsx" "hero-bond.xlsx"
cpx "英雄远征.xlsx" "hero-expedition.xlsx"
cpx "荣誉挂件.xlsx" "honour-pendant.xlsx"
cpx "莽荒纪.xlsx" "primordial-era.xlsx"
cpx "菩提树.xlsx" "bodhi-tree.xlsx"
cpx "藏品.xlsx" "collection.xlsx"
cpx "藏品封印.xlsx" "collection-seal.xlsx"
cpx "藏品觉醒转盘.xlsx" "collection-awaken-wheel.xlsx"
cpx "融合神殿.xlsx" "fusion-temple.xlsx"
cpx "装备周卡.xlsx" "equipment-week-card.xlsx"
cpx "装备表.xlsx" "equipment-table.xlsx"
cpx "资源找回.xlsx" "resource-recovery.xlsx"
cpx "超值礼包.xlsx" "value-pack.xlsx"
cpx "超值首充.xlsx" "value-first-recharge.xlsx"
cpx "超级转盘.xlsx" "super-wheel.xlsx"
cpx "跨服BOSS.xlsx" "cross-boss.xlsx"
cpx "跨服元宝排行.xlsx" "cross-ingot-ranking.xlsx"
cpx "跨服充值排行.xlsx" "cross-recharge-ranking.xlsx"
cpx "跨服天梯.xlsx" "cross-ladder.xlsx"
cpx "跨服段位赛.xlsx" "cross-rank-match.xlsx"
cpx "跨服竞技场.xlsx" "cross-arena.xlsx"
cpx "连线英雄.xlsx" "linked-hero.xlsx"
cpx "连续充值.xlsx" "consecutive-recharge.xlsx"
cpx "通天塔.xlsx" "tower-of-heaven.xlsx"
cpx "通用.xlsx" "common.xlsx"
cpx "通用排行榜奖励.xlsx" "generic-leaderboard-reward.xlsx"
cpx "通用活动之自选礼包.xlsx" "generic-event-choice-pack.xlsx"
cpx "邀请.xlsx" "invite.xlsx"
cpx "邮件特权商城.xlsx" "mail-privilege-shop.xlsx"
cpx "重置.xlsx" "reset.xlsx"
cpx "金币商店.xlsx" "gold-shop.xlsx"
cpx "限定英雄召唤.xlsx" "limited-hero-summon.xlsx"
cpx "限时回退.xlsx" "timed-rollback.xlsx"
cpx "限时登陆.xlsx" "timed-login.xlsx"
cpx "限时皮肤商店.xlsx" "timed-skin-shop.xlsx"
cpx "限时重置.xlsx" "timed-reset.xlsx"
cpx "预约奖励.xlsx" "prereg-reward.xlsx"
cpx "预警.xlsx" "alert-threshold.xlsx"
cpx "驱魔之夜.xlsx" "exorcism-night.xlsx"
cpx "魔术戏法.xlsx" "magic-trick.xlsx"
cpx "鸿运当头.xlsx" "great-fortune.xlsx"
# Cac file KHONG co trong bang anh xa (code khong tham chieu, van giu ten goc).
# Chung duoc dong vao mot tar rieng -- tar giu nguyen BYTE cua ten file nen
# khong bi hong encoding khi truyen; giai nen tren Windows bang 7-Zip
# (chon UTF-8) hoac WSL tar.
stage_rest() {
  local list="$DST/_ten-goc-khong-doi.txt"
  local done_list="$DST/_goc-da-copy.txt"
  [ -f "$done_list" ] || : > "$done_list"
  : > "$list"
  local cnt=0 f
  cd "$SRC" || return
  for f in *; do
    [ -f "$f" ] || continue
    grep -qxF -- "$f" "$done_list" && continue     # da copy voi ten tieng Anh
    printf '%s
' "$f" >> "$list"
    cnt=$((cnt+1))
  done
  if [ "$cnt" -gt 0 ]; then
    tar -czf "$DST/_con-lai-ten-goc.tar.gz" -T "$list"
    echo "  Da dong $cnt file con lai (giu ten goc) vao _con-lai-ten-goc.tar.gz"
  else
    echo "  Khong con file nao ngoai bang anh xa."
  fi
}

echo
echo "Da copy: $n | Khong co tren server: $miss"

if [ $APPLY -eq 1 ]; then
  stage_rest
  echo
  echo "Xong. Buoc tiep theo tren server:"
  echo "  tar -czf /tmp/excel-en.tar.gz -C \"$DST\" ."
  echo "Roi tai /tmp/excel-en.tar.gz ve may local."
else
  echo
  echo "DRY-RUN: chua copy gi. Them --apply de chay that."
fi
