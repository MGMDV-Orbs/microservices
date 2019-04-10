/**
 * @name Production PR Dangerfile
 *
 * @description
 * This dangerfile validates production PRs before the deployment step
 * to assure all change order requirements are met.
 * The data captured here is then forwarded to Azure.
 *
 * See the following orb commands for reference:
 * validate-change-management-event-info
 * send-change-management-event
 */
const { danger, warn, message } = require('danger');
const { checkAssignees } = require('danger-plugin-complete-pr');
// const deploymentSummarySectionTitle = '# Production Deployment Summary';
const deploymentSummarySectionTitle = '## Checklist';
const prodChangeEvent = {
  requestor: null,
  templateId: null,
  affectedEndUser: null,
  assignee: 'MGMResorts/prod-deployment-approvers',
  scheduledStartDate: new Date(),
};

// Requestor Field
checkAssignees();
prodChangeEvent.requestor = danger.github.pr.assignee.login;

// Deployment Summary
checkDeploymentSummary();

function checkDeploymentSummary() {
  const hasDeploymentSummarySection = danger.github.pr.body.includes(deploymentSummarySectionTitle)
  const hasDeploymentSummaryText = danger.github.pr.body.split(deploymentSummarySectionTitle).length
    && danger.github.pr.body.split(deploymentSummarySectionTitle)[1].length > 7

  if (!hasDeploymentSummarySection || !hasDeploymentSummaryText) {
    fail('Deployment Summary section is missing. Add "# Production Deployment Summary" to the end of the PR description followed by changes in this deployment.');
  } else {
    prodChangeEvent.deploymentSummaryText = danger.github.pr.body.split(deploymentSummarySectionTitle)[1];
    message(`Azure change management system event: \n \`\`\`js ${JSON.stringify(prodChangeEvent, null, 2)} \n \`\`\` `);
  }
}

