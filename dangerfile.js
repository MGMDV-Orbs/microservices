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
 * Send notification to Change Order Azure Function
 * @param  {Object} productionEvent
 * @return {Promise}
 */
const postEventToChangeMgmtSystem = async (productionEvent) => {
  return await Promise.all([
    client.send(prodChangeEvent),
    axios.post(process.env.PROD_CHANGE_ORDER_FUNC_URL, { productionEvent })
  ])
}

// Capture Requestor Field
checkAssignees()
prodChangeEvent.requestor = danger.github.pr.assignee.login

// Capture Deployment Summary
if(hasDeploymentSummary()) {
  prodChangeEvent.deploymentSummaryText = danger.github.pr.body.split(deploymentSummarySectionTitle)[1]
  postEventToChangeMgmtSystem(prodChangeEvent)
  message(`MGM Change Management system event sent. \n \`\`\`js \n ${JSON.stringify(prodChangeEvent, null, 2)} \n \`\`\` `)
} else {
  fail('Deployment Summary section is missing. Add "# Production Deployment Summary" to the end of the PR description followed by changes in this deployment.')
}
