const Flow = require('../models/Flow');
const FlowExecution = require('../models/FlowExecution');
const Complaint = require('../models/Complaint');
const notificationService = require('./notificationService');
const { logAudit } = require('../utils/auditLogger');

class FlowEngine {
  /**
   * Helper to replace template tags in strings like {{ticketNumber}}, {{title}}, {{status}}, etc.
   */
  interpolate(template = '', context = {}) {
    if (!template || typeof template !== 'string') return '';
    // Support both {{var}} and {var}
    return template.replace(/\{{1,2}(\w+)\}{1,2}/g, (match, key) => {
      if (context[key] !== undefined && context[key] !== null) {
        return context[key];
      }
      return match;
    });
  }

  /**
   * Evaluate a single condition against the context
   */
  evaluateCondition(condition, context) {
    const { field, operator, value } = condition;
    const actualValue = context[field];

    switch (operator) {
      case 'EQUALS':
        return String(actualValue) === String(value);
      case 'NOT_EQUALS':
        return String(actualValue) !== String(value);
      case 'GREATER_THAN':
        return Number(actualValue) > Number(value);
      case 'GREATER_THAN_OR_EQUAL':
        return Number(actualValue) >= Number(value);
      case 'LESS_THAN':
        return Number(actualValue) < Number(value);
      case 'LESS_THAN_OR_EQUAL':
        return Number(actualValue) <= Number(value);
      case 'IN':
        return Array.isArray(value) && value.includes(actualValue);
      case 'NOT_IN':
        return Array.isArray(value) && !value.includes(actualValue);
      case 'EXISTS':
        return actualValue !== undefined && actualValue !== null && actualValue !== '';
      default:
        return true;
    }
  }

  /**
   * Execute a trigger on all matching active flows
   * @param {string} trigger - e.g. COMPLAINT_CREATED, COMPLAINT_STATUS_CHANGED, COMPLAINT_PENDING_DURATION
   * @param {object} eventData - { complaint, previousState, context }
   */
  async executeTrigger(trigger, { complaint, previousState = {}, context = {} } = {}) {
    try {
      const activeFlows = await Flow.find({ trigger, isActive: true });
      if (!activeFlows || activeFlows.length === 0) {
        return [];
      }

      const results = [];
      for (const flow of activeFlows) {
        const result = await this.executeFlow(flow, { complaint, previousState, context });
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error(`FlowEngine trigger error [${trigger}]:`, error.message);
      return [];
    }
  }

  /**
   * Execute a single flow against a given complaint and context
   */
  async executeFlow(flow, { complaint, previousState = {}, context = {} }) {
    const startedAt = new Date();

    // Prepare evaluation context
    const evalContext = {
      ...context,
      ticketNumber: complaint?.ticketNumber || '',
      title: complaint?.title || '',
      category: complaint?.category || '',
      status: complaint?.status || '',
      priority: complaint?.priority || '',
      location: complaint?.location || '',
      userId: complaint?.userId ? complaint.userId.toString() : '',
      isEscalated: Boolean(complaint?.isEscalated),
      oldStatus: previousState?.status || '',
      newStatus: complaint?.status || '',
      statusChanged: previousState?.status !== undefined && previousState.status !== complaint?.status,
    };

    // Check conditions
    let conditionsMet = true;
    let failedCondition = null;

    if (Array.isArray(flow.conditions) && flow.conditions.length > 0) {
      for (const condition of flow.conditions) {
        const passes = this.evaluateCondition(condition, evalContext);
        if (!passes) {
          conditionsMet = false;
          failedCondition = condition;
          break;
        }
      }
    }

    // If conditions failed, record SKIPPED execution
    if (!conditionsMet) {
      const skippedExecution = new FlowExecution({
        flow: flow._id,
        flowName: flow.name,
        complaint: complaint?._id || null,
        ticketNumber: complaint?.ticketNumber || '',
        trigger: flow.trigger,
        executionStatus: 'SKIPPED',
        startedAt,
        completedAt: new Date(),
        executedActions: [],
        executionDetails: {
          reason: 'Conditions not met',
          failedCondition,
        },
      });
      await skippedExecution.save();
      return skippedExecution;
    }

    // Execute Actions
    const executedActions = [];
    let executionStatus = 'SUCCESS';
    let errorMessage = null;

    try {
      for (const action of flow.actions || []) {
        const actionResult = await this.executeAction(action, { complaint, evalContext });
        executedActions.push(actionResult);
        if (actionResult.status === 'FAILED') {
          executionStatus = 'FAILED';
          errorMessage = actionResult.details?.error || 'Action execution failed';
        }
      }
    } catch (actErr) {
      executionStatus = 'FAILED';
      errorMessage = actErr.message;
    }

    const completedAt = new Date();

    const executionRecord = new FlowExecution({
      flow: flow._id,
      flowName: flow.name,
      complaint: complaint?._id || null,
      ticketNumber: complaint?.ticketNumber || '',
      trigger: flow.trigger,
      executionStatus,
      startedAt,
      completedAt,
      executedActions,
      errorMessage,
      executionDetails: {
        evalContext,
      },
    });

    await executionRecord.save();

    // Log important workflow execution event to AuditLog
    await logAudit({
      user: null,
      role: 'system',
      action: `FLOW_${executionStatus}`,
      entityType: 'Flow',
      entityId: flow._id,
      details: {
        flowName: flow.name,
        trigger: flow.trigger,
        ticketNumber: complaint?.ticketNumber,
        executedActionsCount: executedActions.length,
      },
    });

    return executionRecord;
  }

  /**
   * Execute a single action definition
   */
  async executeAction(action, { complaint, evalContext }) {
    const type = action.type;
    const rawParams = action.params || {};
    const params = {
      ...rawParams,
      ...(action.title ? { title: action.title } : {}),
      ...(action.message ? { message: action.message } : {}),
      ...(action.template ? { message: action.template } : {}),
      ...(action.target ? { recipientTarget: action.target } : {}),
      ...(action.value && type === 'UPDATE_PRIORITY' ? { priority: action.value } : {}),
      ...(action.value && type === 'UPDATE_STATUS' ? { status: action.value } : {}),
    };

    try {
      switch (type) {
        case 'SEND_NOTIFICATION': {
          const title = this.interpolate(params.title || 'Complaint Notification', evalContext);
          const message = this.interpolate(params.message || '', evalContext);
          const notificationType = params.type || 'STATUS_UPDATE';

          if (params.recipientTarget === 'ADMIN' || params.recipientTarget === 'ALL_ADMINS') {
            await notificationService.createAdminAlert({
              title,
              message,
              complaint: complaint?._id,
              ticketNumber: complaint?.ticketNumber,
              type: notificationType,
            });
          } else {
            // Default target: Complaint owner
            const recipient = complaint?.userId;
            if (recipient) {
              await notificationService.createNotification({
                recipient,
                recipientRole: 'student',
                title,
                message,
                type: notificationType,
                complaint: complaint?._id,
                ticketNumber: complaint?.ticketNumber,
              });
            }
          }

          return { type, status: 'SUCCESS', details: { title, message } };
        }

        case 'UPDATE_PRIORITY': {
          if (complaint && params.priority) {
            complaint.priority = params.priority;
            await complaint.save();
          }
          return { type, status: 'SUCCESS', details: { newPriority: params.priority } };
        }

        case 'UPDATE_STATUS': {
          if (complaint && params.status) {
            complaint.status = params.status;
            await complaint.save();
          }
          return { type, status: 'SUCCESS', details: { newStatus: params.status } };
        }

        case 'ASSIGN_ADMIN': {
          if (complaint && params.adminId) {
            complaint.assignedTo = params.adminId;
            complaint.assignedToName = params.adminName || 'Assigned Admin';
            await complaint.save();
          }
          return { type, status: 'SUCCESS', details: { assignedTo: params.adminId } };
        }

        case 'ESCALATE_COMPLAINT': {
          if (complaint) {
            // Increase priority to High if Low or Medium
            if (complaint.priority === 'Low' || complaint.priority === 'Medium') {
              complaint.priority = 'High';
            }
            complaint.isEscalated = true;
            complaint.escalatedAt = new Date();
            await complaint.save();

            // Admin alert
            await notificationService.createAdminAlert({
              title: `Complaint Escalation: ${complaint.ticketNumber}`,
              message: `Ticket ${complaint.ticketNumber} (${complaint.title}) has been pending over 3 days and was escalated to High priority.`,
              complaint: complaint._id,
              ticketNumber: complaint.ticketNumber,
              type: 'COMPLAINT_ESCALATION',
            });

            // Student alert
            if (complaint.userId) {
              await notificationService.createNotification({
                recipient: complaint.userId,
                recipientRole: 'student',
                title: `Complaint Escalated: ${complaint.ticketNumber}`,
                message: `Your complaint ${complaint.ticketNumber} has been automatically escalated to High priority due to pending resolution.`,
                complaint: complaint._id,
                ticketNumber: complaint.ticketNumber,
                type: 'COMPLAINT_ESCALATION',
              });
            }
          }
          return { type, status: 'SUCCESS', details: { isEscalated: true, newPriority: complaint?.priority } };
        }

        default:
          return { type, status: 'SKIPPED', details: { reason: `Unknown action type: ${type}` } };
      }
    } catch (err) {
      console.error(`Action error [${type}]:`, err.message);
      return { type, status: 'FAILED', details: { error: err.message } };
    }
  }
}

module.exports = new FlowEngine();
