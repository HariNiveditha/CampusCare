const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { handleImageUpload } = require('../middleware/upload');

// Create complaint with optional image upload
router.post('/', verifyToken, handleImageUpload('photo'), complaintController.createComplaint);

// Get complaints
router.get('/', verifyToken, complaintController.getAllComplaints);
router.get('/user/:userId', verifyToken, complaintController.getComplaintsByUser);
router.get('/:complaintId', verifyToken, complaintController.getComplaintById);

// Admin-only management endpoints
router.put('/:complaintId', verifyToken, requireAdmin, complaintController.updateComplaintStatus);
router.put('/:complaintId/priority', verifyToken, requireAdmin, complaintController.updateComplaintPriority);
router.patch('/:complaintId/priority', verifyToken, requireAdmin, complaintController.updateComplaintPriority);
router.put('/:complaintId/assign', verifyToken, requireAdmin, complaintController.assignComplaint);
router.patch('/:complaintId/assign', verifyToken, requireAdmin, complaintController.assignComplaint);
router.post('/:complaintId/work-notes', verifyToken, requireAdmin, complaintController.addWorkNote);
router.delete('/:complaintId', verifyToken, requireAdmin, complaintController.deleteComplaint);

// Upvote complaint
router.post('/:complaintId/upvote', verifyToken, complaintController.upvoteComplaint);

module.exports = router;
