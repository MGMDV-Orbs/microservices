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
const { EventHubClient, EventPosition } = require('@azure/event-hubs')
const client = EventHubClient.createFromConnectionString(process.env["EVENTHUB_CONNECTION_STRING"], process.env["EVENTHUB_NAME"])
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
 * Send event to Azure Event Hub.
 * Will also post a Danger message with the event info.
 * @param  {Object} prodChangeEvent
 * @return {undefined}
 */
async function sendEventToAzureEventHub(prodChangeEvent){
  await client.send(prodChangeEvent)
  message(`Azure change management system event: \n \`\`\`js \n ${JSON.stringify(prodChangeEvent, null, 2)} \n \`\`\` `)
}

// Requestor Field
checkAssignees()
prodChangeEvent.requestor = danger.github.pr.assignee.login

// Deployment Summary
if(hasDeploymentSummary()) {
  prodChangeEvent.deploymentSummaryText = danger.github.pr.body.split(deploymentSummarySectionTitle)[1]
  sendEventToAzureEventHub(prodChangeEvent)
} else {
  fail('Deployment Summary section is missing. Add "# Production Deployment Summary" to the end of the PR description followed by changes in this deployment.')
}
