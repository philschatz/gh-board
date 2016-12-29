#!/bin/bash
$(npm bin)/parallelshell --verbose "npm run-script start-webdriver" "http-server ." "./script/run-build-and-then-test.sh"

statusCode=$?
if [[ ${statusCode} -eq 42 ]]
then
  exit 0
else
  exit ${statusCode}
fi
