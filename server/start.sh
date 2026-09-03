#!/bin/bash
rabbitmq-server -detached
mongod --shutdown --dbpath /usr/local/mongodb/data --port 27017
mongod -f /usr/local/mongodb/mongodb.conf
sleep 10
cd /h5/server/console && ./start
sleep 10
cd /h5/server/world && ./start
sleep 10
cd /h5/server/meta && ./start
sleep 10
cd /h5/server/statistic && ./start
sleep 10
cd /h5/server/pay && ./start
sleep 10
cd /h5/server/group && ./start
sleep 50
cd /h5/server/game && ./start
sleep 50
cd /h5/server/login && ./start
sleep 20
cd /h5/server/cross && ./start
sleep 20
