#!/bin/bash
for i in {game,game2,game3,cross,group,statistic,meta,world,pay,login,console}
#以上顺序不可变更game进程一定需要优先关闭
do
if [ ! -z "$i" ]
then
	pid=`cat /var/run/tcg-${i}.pid`
	echo "/var/run/tcg-${i}.pid"
	echo "正在关闭${i}进程，pid是${pid}，请稍后。。。"
	if [ -n "$pid" ]
	then
		kill $pid
		echo "${i}进程已关闭。。。"
		sleep 3
    fi
fi
done
#清理所有日志，按需使用
find /h5/server -name '*.log'|xargs rm -f