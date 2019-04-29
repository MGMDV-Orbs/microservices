/**
 * @name Production PR Dangerfile
 *
 * @description
 * This dangerfile validates production PRs before the deployment step
 * to assure all change order requirements are met.
 * The data captured here is then forwarded to Azure.
 *
 * See the orb commands for reference:
 */
const danger = require('danger')
const { checkAssignees } = require('danger-plugin-complete-pr')
const axios = require('axios')
const { EventHubClient, EventPosition } = require('@azure/event-hubs')
const client = EventHubClient.createFromConnectionString(process.env["PROD_CHANGE_ORDER_EVENTHUB_CONNECTION_STRING"], process.env["PROD_CHANGE_ORDER_EVENTHUB_NAME"])
const deploymentSummarySectionTitle = '# Production Deployment Summary'

const prodChangeEvent = {
  requestor: null,
  templateId: null,
  affectedEndUser: null,
  assignee: 'MGMResorts/prod-deployment-approvers',
  scheduledStartDate: new Date(),
}

/**
 * Checks for a specific section of
 * the PR description called prod deployment summary
 *
 * @return {Boolean}
 */
const hasDeploymentSummary = () => {
  const hasDeploymentSummarySection = danger.github.pr.body.includes(deploymentSummarySectionTitle)
  const hasDeploymentSummaryText = hasDeploymentSummarySection &&
    danger.github.pr.body.split(deploymentSummarySectionTitle).length &&
    danger.github.pr.body.split(deploymentSummarySectionTitle)[1].length > 7

  return hasDeploymentSummaryText
}

/**
 * Sends deployment event to MGM Change Management systems
 *
 * @param  {Object} prodChangeEvent
 * @return {Promise}
 */
const sendEventToChangeMgmtSystem = (productionEvent) => {
  return Promise.all([
    // send event to EventHub for change management
    client.send(productionEvent),

    // send event to Azure Func for change management
    axios.post(process.env.PROD_CHANGE_ORDER_FUNC_URL, { productionEvent }),
  ])
}

const githubFormatJson = msgObj => `\n \`\`\`js \n ${JSON.stringify(msgObj, null, 2)} \n \`\`\``

// Capture Requestor Field
checkAssignees()
prodChangeEvent.requestor = danger.github.pr.assignee.login

console.log('Checking Deployment Summary');

// Capture Deployment Summary
if(hasDeploymentSummary()) {

  prodChangeEvent.deploymentSummaryText = danger.github.pr.body.split(deploymentSummarySectionTitle)[1]

  sendEventToChangeMgmtSystem(prodChangeEvent)
    .then(r =>
      message(`MGM Change Management system event sent. ${githubFormatJson(prodChangeEvent)}`)
    )
    .catch(azureError =>
      fail(`Unable to send Change Management event to Azure. ${githubFormatJson(azureError)}`)
    )
    // `danger.schedule` method does not work with nested, chained, or Promise.all promises
    // Necessary hack to get async code to work with danger-js Peril
    .then(() => process.exit())

} else {
  fail('Deployment Summary section is missing. Add "# Production Deployment Summary" to the end of the PR description followed by changes in this deployment.')
}
