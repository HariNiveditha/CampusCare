const Complaint = require('../models/Complaint');
const flowEngine = require('./flowEngine');
const { logAudit } = require('../utils/auditLogger');

class EscalationService {
  /**
   * Find all complaints that have been in 'Pending' status for >= threshold and escalate them.
   * @param {object} options - { thresholdDays: 3, thresholdMs: null }
   */
  async checkAndEscalateComplaints({ thresholdDays = 3, thresholdMs = null } = {}) {
    try {
      const ms = thresholdMs !== null ? thresholdMs : thresholdDays * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - ms);

      // Find complaints currently Pending, not yet escalated, with pendingSince <= cutoffDate
      const eligibleComplaints = await Complaint.find({
        status: 'Pending',
        isEscalated: { $ne: true },
        pendingSince: { $exists: true, $ne: null, $lte: cutoffDate },
      });

      if (!eligibleComplaints || eligibleComplaints.length === 0) {
        return {
          totalChecked: 0,
          escalatedCount: 0,
          escalatedTickets: [],
        };
      }

      const escalatedTickets = [];

      for (const complaint of eligibleComplaints) {
        const oldPriority = complaint.priority;

        // Execute Flow 3 via FlowEngine
        await flowEngine.executeTrigger('COMPLAINT_PENDING_DURATION', {
          complaint,
          context: {
            oldPriority,
            pendingSince: complaint.pendingSince,
            daysPending: Math.round((Date.now() - new Date(complaint.pendingSince).getTime()) / (24 * 60 * 60 * 1000)),
          },
        });

        // Audit log escalation
        await logAudit({
          user: null,
          role: 'system',
          action: 'COMPLAINT_ESCALATED',
          entityType: 'Complaint',
          entityId: complaint._id,
          details: {
            ticketNumber: complaint.ticketNumber,
            oldPriority,
            newPriority: complaint.priority,
            pendingSince: complaint.pendingSince,
          },
        });

        escalatedTickets.push(complaint.ticketNumber);
      }

      return {
        totalChecked: eligibleComplaints.length,
        escalatedCount: escalatedTickets.length,
        escalatedTickets,
      };
    } catch (error) {
      console.error('EscalationService error:', error.message);
      return {
        totalChecked: 0,
        escalatedCount: 0,
        escalatedTickets: [],
        error: error.message,
      };
    }
  }
}

module.exports = new EscalationService();
