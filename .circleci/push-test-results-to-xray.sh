#!/bin/bash

set -e

echo "File to process: $1"
echo "Jira Project Name: $2"

SERVICE_DIR=$(dirname $(cd -P -- "$(dirname -- "$0")" && pwd -P))
CIRCLE_SHA1=${2:-$(cd $SERVICE_DIR && git rev-parse HEAD)}

if ! test -f $SERVICE_DIR/package.json; then
  echo "SERVICE package.json not found"
  exit 1
fi

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

RESULTS=$(\curl "https://xray.cloud.xpand-it.com/api/v1/import/execution/junit?projectKey=$2&revision=$CIRCLE_SHA1" \
  -H "Content-Type: text/json" \
  -X POST \
  -H "Authorization: Bearer $XRAY_AUTH_TOKEN" \
  --data @"$TEST_RESULTS_FILE"
)

echo "UPLOAD RESULT = $RESULTS"