const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/admins', verifyToken, requireAdmin, authController.getAdmins);

module.exports = router;
