const express = require('express');
const router = express.Router();
const knowledgeBaseController = require('../controllers/knowledgeBaseController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// All knowledge base routes require authentication
router.use(verifyToken);

// --- Public/Student Access Routes ---
router.get('/', knowledgeBaseController.getArticles);
router.get('/search', knowledgeBaseController.searchArticles);
router.get('/:id', knowledgeBaseController.getArticleById);
router.post('/:id/helpful', knowledgeBaseController.markHelpful);

// --- Admin Access Routes ---
router.post('/', authorizeRoles('admin'), knowledgeBaseController.createArticle);
router.put('/:id', authorizeRoles('admin'), knowledgeBaseController.updateArticle);
router.delete('/:id', authorizeRoles('admin'), knowledgeBaseController.deleteArticle);
router.patch('/:id/status', authorizeRoles('admin'), knowledgeBaseController.toggleArticleStatus);

module.exports = router;
