const AuditLog = require('../models/AuditLog');

// Get audit logs (Admin only)
exports.getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.action) {
      query.action = req.query.action;
    }
    if (req.query.entityType) {
      query.entityType = req.query.entityType;
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('Get audit logs error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
