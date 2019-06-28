#!/bin/bash


#usage bash ./.circleci/push-test-results-to-xray.sh /pth/to/test-results.xml JIRAPROJECTCODE cucumber
set -e

echo "Push Xray Version 1.0.1"
echo "File to process: $1"
echo "Jira Project Name: $2"
echo "Test Type: $3"

SERVICE_DIR=$(pwd)
CIRCLE_SHA1=$(cd $SERVICE_DIR && git rev-parse HEAD)
TEST_RESULTS_FILE=$1
PROJECT_CODE=$2
TEST_TYPE=$3

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

# Supporting 2 file type API upload methods
if [ "$TEST_TYPE" == "cucumber" ]; then

  RESULTS=$(\curl "https://xray.cloud.xpand-it.com/api/v1/import/execution/cucumber?projectKey=$PROJECT_CODE&revision=$CIRCLE_SHA1" \
    -H "Content-Type: application/json" \
    -X POST \
    -H "Authorization: Bearer $XRAY_AUTH_TOKEN" \
    --data @"$TEST_RESULTS_FILE"
  )

else

  RESULTS=$(\curl "https://xray.cloud.xpand-it.com/api/v1/import/execution/junit?projectKey=$PROJECT_CODE&revision=$CIRCLE_SHA1" \
    -H "Content-Type: text/xml" \
    -X POST \
    -H "Authorization: Bearer $XRAY_AUTH_TOKEN" \
    --data @"$TEST_RESULTS_FILE"
  )

fi

echo "UPLOAD RESULT = $RESULTS"