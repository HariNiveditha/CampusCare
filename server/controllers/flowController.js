const Flow = require('../models/Flow');
const FlowExecution = require('../models/FlowExecution');
const escalationService = require('../services/escalationService');
const { logAudit } = require('../utils/auditLogger');

// List all flows with execution metrics (Admin only)
exports.getAllFlows = async (req, res) => {
  try {
    const flows = await Flow.find().sort({ createdAt: 1 });

    // Fetch latest execution for each flow
    const flowsWithStats = await Promise.all(
      flows.map(async (f) => {
        const flowObj = f.toObject();
        const latestExecution = await FlowExecution.findOne({ flow: f._id }).sort({ startedAt: -1 });
        const totalExecutions = await FlowExecution.countDocuments({ flow: f._id });
        const failedExecutions = await FlowExecution.countDocuments({
          flow: f._id,
          executionStatus: 'FAILED',
        });

        return {
          ...flowObj,
          latestExecution: latestExecution
            ? {
                startedAt: latestExecution.startedAt,
                completedAt: latestExecution.completedAt,
                status: latestExecution.executionStatus,
                errorMessage: latestExecution.errorMessage,
              }
            : null,
          stats: {
            total: totalExecutions,
            failed: failedExecutions,
          },
        };
      })
    );

    res.json(flowsWithStats);
  } catch (error) {
    console.error('getAllFlows error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve flows', error: error.message });
  }
};

// Get single flow by ID
exports.getFlowById = async (req, res) => {
  try {
    const flow = await Flow.findById(req.params.id);
    if (!flow) {
      return res.status(404).json({ message: 'Flow not found' });
    }
    res.json(flow);
  } catch (error) {
    console.error('getFlowById error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve flow', error: error.message });
  }
};

// Toggle flow active/inactive status (Admin only)
exports.toggleFlowStatus = async (req, res) => {
  try {
    const flow = await Flow.findById(req.params.id);
    if (!flow) {
      return res.status(404).json({ message: 'Flow not found' });
    }

    const previousStatus = flow.isActive;
    flow.isActive = !flow.isActive;
    flow.updatedAt = new Date();
    await flow.save();

    await logAudit({
      user: req.user,
      role: req.user.role,
      action: 'FLOW_STATUS_TOGGLED',
      entityType: 'Flow',
      entityId: flow._id,
      details: {
        flowName: flow.name,
        previousStatus,
        newStatus: flow.isActive,
      },
    });

    res.json({
      ...flow.toObject(),
      message: `Flow "${flow.name}" is now ${flow.isActive ? 'Active' : 'Inactive'}`,
      flow,
    });
  } catch (error) {
    console.error('toggleFlowStatus error:', error.message);
    res.status(500).json({ message: 'Failed to toggle flow status', error: error.message });
  }
};

// Get global execution history (Admin only, paginated)
exports.getExecutionHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      FlowExecution.find()
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit),
      FlowExecution.countDocuments(),
    ]);

    res.json({
      executions,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('getExecutionHistory error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve execution history', error: error.message });
  }
};

// Manually trigger escalation check cycle (Admin only)
exports.triggerEscalationCycle = async (req, res) => {
  try {
    const thresholdDays = req.body.thresholdDays !== undefined ? Number(req.body.thresholdDays) : 3;
    const thresholdMs = req.body.thresholdMs !== undefined ? Number(req.body.thresholdMs) : null;

    const result = await escalationService.checkAndEscalateComplaints({ thresholdDays, thresholdMs });
    res.json({
      message: 'Escalation cycle completed',
      status: 'COMPLETED',
      escalatedCount: result.escalatedCount,
      checkedCount: result.checkedCount,
      escalatedTickets: result.escalatedTickets,
      result,
    });
  } catch (error) {
    console.error('triggerEscalationCycle error:', error.message);
    res.status(500).json({ message: 'Escalation cycle failed', error: error.message });
  }
};
