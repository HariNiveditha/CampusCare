const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// All audit log endpoints are strictly Admin-only
router.get('/', verifyToken, requireAdmin, auditLogController.getAuditLogs);

module.exports = router;
