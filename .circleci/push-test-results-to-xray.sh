#!/bin/bash

set -e

echo "Push Xray Version 1.0.1"
echo "File to process: $1"
echo "Jira Project Name: $2"
echo "Test Type: $3"
echo "Cucumber Feature: $4"
echo "Cucumber Feature Name: $5"

SERVICE_DIR=$(pwd)
CIRCLE_SHA1=$(cd $SERVICE_DIR && git rev-parse HEAD)
TEST_RESULTS_FILE=$1
PROJECT_CODE=$2
TEST_TYPE=$3
IMPORT_FEATURE_FILE=$4

echo "CIRCLE_SHA1 = $CIRCLE_SHA1"
echo "Project Path: $SERVICE_DIR"
echo $TEST_RESULTS_FILE

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
# echo "XRAY_AUTH_TOKEN = $XRAY_AUTH_TOKEN"

if [ "$TEST_TYPE" == "cucumber" ]; then

  # This implementation has issues. 
  # Usage : bash push-test-results-to-xray.sh ../unit-test-results.json SRV cucumber ../get-profile.feature
  # IMPORT TEST RESULT = {"error":"Internal Application Error!"}

  echo "Importing Feature File $IMPORT_FEATURE_FILE"

  RESULTS_IMPORT=$(\curl "https://xray.cloud.xpand-it.com/api/v1/import/feature?projectKey=$PROJECT_CODE&revision=$CIRCLE_SHA1" \
    -H "Content-Type: multipart/form-data" \
    -X POST \
    -H "Authorization: Bearer $XRAY_AUTH_TOKEN" \
    --data @"$IMPORT_FEATURE_FILE"
  )

  echo "IMPORT TEST RESULT = $RESULTS_IMPORT"

  RESULTS_TEST=$(\curl "https://xray.cloud.xpand-it.com/api/v1/import/execution/cucumber?projectKey=$PROJECT_CODE&revision=$CIRCLE_SHA1" \
    -H "Content-Type: application/json" \
    -X POST \
    -H "Authorization: Bearer $XRAY_AUTH_TOKEN" \
    --data @"$TEST_RESULTS_FILE"
  )

  echo "UPLOAD TEST RESULTS = $RESULTS_TEST"
 
else
  # Usage bash ./.circleci/push-test-results-to-xray.sh /pth/to/test-results.xml JIRAPROJECTCODE cucumber
  
  RESULTS_TEST=$(\curl "https://xray.cloud.xpand-it.com/api/v1/import/execution/junit?projectKey=$PROJECT_CODE&revision=$CIRCLE_SHA1" \
    -H "Content-Type: text/xml" \
    -X POST \
    -H "Authorization: Bearer $XRAY_AUTH_TOKEN" \
    --data @"$TEST_RESULTS_FILE"
  )
  echo "UPLOAD RESULT = $RESULTS_TEST"

fi