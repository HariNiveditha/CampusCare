const express = require('express');
const router = express.Router();
const flowController = require('../controllers/flowController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// All flow routes are strictly Admin-only
router.use(verifyToken, requireAdmin);

router.get('/', flowController.getAllFlows);
router.get('/executions/history', flowController.getExecutionHistory);
router.get('/:id', flowController.getFlowById);
router.patch('/:id/toggle', flowController.toggleFlowStatus);
router.post('/trigger-escalation-job', flowController.triggerEscalationCycle);

module.exports = router;
