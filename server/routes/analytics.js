const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// All analytics endpoints require authenticated administrator privileges
router.use(verifyToken);
router.use(authorizeRoles('admin'));

// Analytical endpoints
router.get('/overview', analyticsController.getOverviewKPIs);
router.get('/status', analyticsController.getStatusAnalytics);
router.get('/priority', analyticsController.getPriorityAnalytics);
router.get('/category', analyticsController.getCategoryAnalytics);
router.get('/monthly-trends', analyticsController.getMonthlyTrends);
router.get('/resolution-performance', analyticsController.getResolutionPerformance);
router.get('/admin-performance', analyticsController.getAdminPerformance);
router.get('/export', analyticsController.exportComplaintsCSV);

module.exports = router;
