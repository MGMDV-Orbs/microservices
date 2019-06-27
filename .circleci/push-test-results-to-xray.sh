#!/bin/bash

set -e


XRAY_CLIENT_ID=4BB10706536D4C5FA3B37E2828116857
XRAY_CLIENT_SECRET=2a299a2d18aff586a52156f298880b823dd2272648e3b8e9d69bce190b80f056


echo "File to process: $1"
echo "Jira Project Name: $2"

SERVICE_DIR=$(pwd)
echo "Project Path: $SERVICE_DIR"

CIRCLE_SHA1=${2:-$(cd $SERVICE_DIR && git rev-parse HEAD)}

# if ! test -f $SERVICE_DIR/package.json; then
#   echo "SERVICE package.json not found"
#   exit 1
# fi

# Mocha Results
TEST_RESULTS_FILE=$1

if ! test -f $TEST_RESULTS_FILE; then
  echo "mocha test results file not found ($TEST_RESULTS_FILE)"
  exit 1
fi

XRAY_AUTH_TOKEN=$(\
  curl -s https://xray.cloud.xpand-it.com/api/v1/authenticate \
    -H "Content-Type: application/json" -X POST \
    --data "{ \"client_id\": \"$XRAY_CLIENT_ID\", \"client_secret\": \"$XRAY_CLIENT_SECRET\" }" \
    | tr -d '"'
)

echo "CIRCLE_SHA1 = $CIRCLE_SHA1"
echo "XRAY_AUTH_TOKEN = $XRAY_AUTH_TOKEN"

echo "https://xray.cloud.xpand-it.com/api/v1/import/execution/junit?projectKey=$2&revision=$CIRCLE_SHA1"
echo $TEST_RESULTS_FILE



RESULTS=$(\curl "https://xray.cloud.xpand-it.com/api/v1/import/execution/junit?projectKey=$2&revision=$CIRCLE_SHA1" \
  -H "Content-Type: text/xml" \
  -X POST \
  -H "Authorization: Bearer $XRAY_AUTH_TOKEN" \
  --data @"$TEST_RESULTS_FILE"
)

echo "UPLOAD RESULT = $RESULTS"