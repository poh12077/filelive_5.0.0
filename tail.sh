#!/bin/sh 
while :
do
	tail -1000 solrtmp_server_samsung.log | cat > tailed_samsung.log
	node solRTMP_filelive_monitoring.js
	sleep 3s
done
