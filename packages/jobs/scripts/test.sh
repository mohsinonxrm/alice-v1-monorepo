#!/bin/bash

set -e
set -x

function test() {
  CONTRACTS_DIR=$(node -e "console.log(path.dirname(require.resolve('@alice-si/contracts/package.json')));")/contracts
  npx truffle test --contracts_directory=$CONTRACTS_DIR $1
}

npx ganache-cli -a 150 -i 3 -s 123 >/dev/null &
GANACHE_PID=$!
trap "kill $GANACHE_PID" EXIT

echo "Started Ganache, PID: $GANACHE_PID"

if [ $# -eq 0 ]
then
  for testFile in `find ./test/* -maxdepth 0 -type f`
  do
    test $testFile
  done
else
  test $1
fi

echo "Tests ran"
