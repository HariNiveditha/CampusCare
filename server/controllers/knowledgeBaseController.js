const KnowledgeArticle = require('../models/KnowledgeArticle');
const { logAudit } = require('../utils/auditLogger');

// List articles (Students: Published only; Admins: all or filtered by status)
exports.getArticles = async (req, res) => {
  try {
    const { category, status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    // Role-based visibility
    if (req.user.role === 'admin') {
      if (status && ['Draft', 'Published'].includes(status)) {
        query.status = status;
      }
    } else {
      // Students can ONLY view Published articles
      query.status = 'Published';
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    const [articles, total] = await Promise.all([
      KnowledgeArticle.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('author', 'username email'),
      KnowledgeArticle.countDocuments(query),
    ]);

    res.json({
      articles,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    console.error('getArticles error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve articles', error: error.message });
  }
};

// Search articles (by title, content, category, or tags)
exports.searchArticles = async (req, res) => {
  try {
    const { q, category } = req.query;

    const query = {};

    // Students only view Published
    if (req.user.role !== 'admin') {
      query.status = 'Published';
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      query.$or = [
        { title: regex },
        { content: regex },
        { category: regex },
        { tags: { $in: [regex] } },
      ];
    }

    const articles = await KnowledgeArticle.find(query)
      .sort({ helpfulCount: -1, views: -1, createdAt: -1 })
      .limit(30)
      .populate('author', 'username email');

    res.json(articles);
  } catch (error) {
    console.error('searchArticles error:', error.message);
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
};

// Get single article by ID
exports.getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await KnowledgeArticle.findById(id).populate('author', 'username email');
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    // Role check: Students cannot access Draft articles
    if (req.user.role !== 'admin' && article.status === 'Draft') {
      return res.status(403).json({
        message: 'Access denied: Draft articles are only accessible to administrators.',
      });
    }

    // Increment view count atomically
    article.views = (article.views || 0) + 1;
    await article.save();

    // Attach whether current user marked helpful
    const articleObj = article.toObject();
    const hasVoted = (article.helpfulUsers || []).some(
      (uId) => uId.toString() === req.user.id.toString()
    );
    articleObj.hasUserVotedHelpful = hasVoted;

    res.json(articleObj);
  } catch (error) {
    console.error('getArticleById error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve article', error: error.message });
  }
};

// Mark article as helpful (Student & Admin)
exports.markHelpful = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const article = await KnowledgeArticle.findById(id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    // Role check: Non-admins cannot interact with Draft articles
    if (req.user.role !== 'admin' && article.status === 'Draft') {
      return res.status(403).json({
        message: 'Access denied: Cannot vote on draft articles.',
      });
    }

    const alreadyVoted = (article.helpfulUsers || []).some(
      (uId) => uId.toString() === userId.toString()
    );

    if (alreadyVoted) {
      return res.status(200).json({
        message: 'You have already marked this article as helpful.',
        helpfulCount: article.helpfulCount,
        hasUserVotedHelpful: true,
      });
    }

    article.helpfulUsers.push(userId);
    article.helpfulCount = (article.helpfulCount || 0) + 1;
    await article.save();

    res.json({
      message: 'Article marked as helpful.',
      helpfulCount: article.helpfulCount,
      hasUserVotedHelpful: true,
    });
  } catch (error) {
    console.error('markHelpful error:', error.message);
    res.status(500).json({ message: 'Failed to mark article helpful', error: error.message });
  }
};

// Create article (Admin only)
exports.createArticle = async (req, res) => {
  try {
    const { title, content, category, tags, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Article title is required.' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Article content is required.' });
    }

    const parsedTags = Array.isArray(tags)
      ? tags.map((t) => String(t).trim()).filter(Boolean)
      : typeof tags === 'string'
      ? tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const articleStatus = status === 'Published' ? 'Published' : 'Draft';

    const newArticle = new KnowledgeArticle({
      title: title.trim(),
      content: content.trim(),
      category: (category || 'General').trim(),
      tags: parsedTags,
      status: articleStatus,
      author: req.user.id,
      authorName: req.user.username || 'Admin',
    });

    await newArticle.save();

    // Audit Log
    await logAudit({
      user: req.user,
      role: req.user.role,
      action: 'ARTICLE_CREATED',
      entityType: 'KnowledgeArticle',
      entityId: newArticle._id,
      details: {
        title: newArticle.title,
        category: newArticle.category,
        status: newArticle.status,
        tagsCount: parsedTags.length,
      },
    });

    res.status(201).json(newArticle);
  } catch (error) {
    console.error('createArticle error:', error.message);
    res.status(500).json({ message: 'Failed to create article', error: error.message });
  }
};

// Update article (Admin only)
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, status } = req.body;

    const article = await KnowledgeArticle.findById(id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const previousData = {
      title: article.title,
      category: article.category,
      status: article.status,
    };

    if (title && title.trim()) article.title = title.trim();
    if (content && content.trim()) article.content = content.trim();
    if (category && category.trim()) article.category = category.trim();

    if (tags !== undefined) {
      article.tags = Array.isArray(tags)
        ? tags.map((t) => String(t).trim()).filter(Boolean)
        : typeof tags === 'string'
        ? tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
    }

    if (status && ['Draft', 'Published'].includes(status)) {
      article.status = status;
    }

    article.updatedAt = new Date();
    await article.save();

    // Audit Log
    await logAudit({
      user: req.user,
      role: req.user.role,
      action: 'ARTICLE_UPDATED',
      entityType: 'KnowledgeArticle',
      entityId: article._id,
      details: {
        title: article.title,
        previousData,
        newData: {
          title: article.title,
          category: article.category,
          status: article.status,
        },
      },
    });

    res.json(article);
  } catch (error) {
    console.error('updateArticle error:', error.message);
    res.status(500).json({ message: 'Failed to update article', error: error.message });
  }
};

// Delete article (Admin only)
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await KnowledgeArticle.findByIdAndDelete(id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    // Audit Log
    await logAudit({
      user: req.user,
      role: req.user.role,
      action: 'ARTICLE_DELETED',
      entityType: 'KnowledgeArticle',
      entityId: id,
      details: {
        title: article.title,
        category: article.category,
        status: article.status,
      },
    });

    res.json({ message: 'Article deleted successfully.' });
  } catch (error) {
    console.error('deleteArticle error:', error.message);
    res.status(500).json({ message: 'Failed to delete article', error: error.message });
  }
};

// Publish or unpublish an article (Admin only)
exports.toggleArticleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const article = await KnowledgeArticle.findById(id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    // Determine target status
    let targetStatus = status;
    if (!targetStatus || !['Draft', 'Published'].includes(targetStatus)) {
      targetStatus = article.status === 'Published' ? 'Draft' : 'Published';
    }

    const previousStatus = article.status;
    article.status = targetStatus;
    article.updatedAt = new Date();
    await article.save();

    const auditAction = targetStatus === 'Published' ? 'ARTICLE_PUBLISHED' : 'ARTICLE_UNPUBLISHED';

    // Audit Log
    await logAudit({
      user: req.user,
      role: req.user.role,
      action: auditAction,
      entityType: 'KnowledgeArticle',
      entityId: article._id,
      details: {
        title: article.title,
        previousStatus,
        newStatus: targetStatus,
      },
    });

    res.json({
      message: `Article successfully ${targetStatus.toLowerCase()}.`,
      article,
      status: targetStatus,
    });
  } catch (error) {
    console.error('toggleArticleStatus error:', error.message);
    res.status(500).json({ message: 'Failed to update article status', error: error.message });
  }
};
