const cron = require('node-cron');
const escalationService = require('../services/escalationService');

let cronTask = null;
let isJobRunning = false;

const runEscalationCycle = async () => {
  if (isJobRunning) {
    console.log('[EscalationJob] Previous escalation cycle still running. Skipping.');
    return;
  }

  try {
    isJobRunning = true;
    console.log('[EscalationJob] Checking for pending complaints older than 3 days...');
    const result = await escalationService.checkAndEscalateComplaints({ thresholdDays: 3 });
    if (result.escalatedCount > 0) {
      console.log(`[EscalationJob] Successfully escalated ${result.escalatedCount} complaints:`, result.escalatedTickets);
    } else {
      console.log('[EscalationJob] No complaints eligible for escalation.');
    }
  } catch (error) {
    console.error('[EscalationJob] Error during escalation cycle:', error.message);
  } finally {
    isJobRunning = false;
  }
};

const startEscalationJob = () => {
  // Default to once every hour: '0 * * * *'
  const schedule = process.env.ESCALATION_CRON_SCHEDULE || '0 * * * *';

  if (cron.validate(schedule)) {
    cronTask = cron.schedule(schedule, runEscalationCycle);
    console.log(`[EscalationJob] Scheduled background escalation job with pattern: "${schedule}"`);
  } else {
    console.error(`[EscalationJob] Invalid cron pattern "${schedule}". Job not started.`);
  }

  return cronTask;
};

const stopEscalationJob = () => {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('[EscalationJob] Stopped background escalation job.');
  }
};

module.exports = {
  startEscalationJob,
  stopEscalationJob,
  runEscalationCycle,
};
