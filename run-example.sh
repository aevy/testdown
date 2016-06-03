#!/bin/sh -e
./node_modules/.bin/webpack-dev-server --quiet --host 0.0.0.0 >/dev/null &
pid=$!
sleep 3
./node_modules/.bin/phantomjs example/phantom-script.js
kill $pid
