const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { logAudit } = require('../utils/auditLogger');

/**
 * Helper to build MongoDB filter query from request parameters
 */
const buildComplaintFilter = (queryParams = {}) => {
  const filter = {};

  // Date range filter on createdAt
  if (queryParams.startDate || queryParams.endDate) {
    filter.createdAt = {};
    if (queryParams.startDate) {
      const start = new Date(queryParams.startDate);
      if (!isNaN(start.getTime())) {
        filter.createdAt.$gte = start;
      }
    }
    if (queryParams.endDate) {
      const end = new Date(queryParams.endDate);
      if (!isNaN(end.getTime())) {
        // Include full end date till 23:59:59.999
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
  }

  // Category filter
  if (queryParams.category && queryParams.category !== 'All') {
    filter.category = queryParams.category.trim();
  }

  // Priority filter
  if (queryParams.priority && queryParams.priority !== 'All') {
    filter.priority = queryParams.priority.trim();
  }

  // Status filter
  if (queryParams.status && queryParams.status !== 'All') {
    filter.status = queryParams.status.trim();
  }

  // Assigned administrator filter
  if (queryParams.assignedTo && queryParams.assignedTo !== 'All') {
    if (queryParams.assignedTo === 'Unassigned') {
      filter.assignedTo = null;
    } else if (mongoose.Types.ObjectId.isValid(queryParams.assignedTo)) {
      filter.assignedTo = new mongoose.Types.ObjectId(queryParams.assignedTo);
    }
  }

  return filter;
};

/**
 * Helper for overdue complaint conditions based on SLA thresholds
 */
const getOverdueCondition = () => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

  return {
    status: { $nin: ['Resolved', 'Closed'] },
    $or: [
      { isEscalated: true },
      { priority: 'Critical', createdAt: { $lt: oneDayAgo } },
      { priority: 'High', createdAt: { $lt: twoDaysAgo } },
      { priority: { $in: ['Medium', 'Low'] }, createdAt: { $lt: threeDaysAgo } },
      { status: 'Pending', pendingSince: { $ne: null, $lt: threeDaysAgo } },
    ],
  };
};

/**
 * 1. Overview KPIs
 * GET /api/analytics/overview
 */
exports.getOverviewKPIs = async (req, res) => {
  try {
    const filter = buildComplaintFilter(req.query);

    const [
      total,
      submitted,
      inProgress,
      pending,
      resolved,
      closed,
      overdue,
    ] = await Promise.all([
      Complaint.countDocuments(filter),
      Complaint.countDocuments({ ...filter, status: 'Submitted' }),
      Complaint.countDocuments({ ...filter, status: 'In Progress' }),
      Complaint.countDocuments({ ...filter, status: 'Pending' }),
      Complaint.countDocuments({ ...filter, status: 'Resolved' }),
      Complaint.countDocuments({ ...filter, status: 'Closed' }),
      Complaint.countDocuments({ ...filter, ...getOverdueCondition() }),
    ]);

    res.json({
      total,
      submitted,
      inProgress,
      pending,
      resolved,
      closed,
      overdue,
    });
  } catch (error) {
    console.error('getOverviewKPIs error:', error.message);
    res.status(500).json({ message: 'Failed to calculate analytics overview', error: error.message });
  }
};

/**
 * 2. Complaints by Status
 * GET /api/analytics/status
 */
exports.getStatusAnalytics = async (req, res) => {
  try {
    const filter = buildComplaintFilter(req.query);
    const allStatuses = ['Submitted', 'Pending', 'In Progress', 'Resolved', 'Closed'];

    const aggregation = await Complaint.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const total = aggregation.reduce((sum, item) => sum + item.count, 0);

    const data = allStatuses.map((status) => {
      const found = aggregation.find((item) => item._id === status);
      const count = found ? found.count : 0;
      const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
      return { status, count, percentage };
    });

    res.json({ total, data });
  } catch (error) {
    console.error('getStatusAnalytics error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve status analytics', error: error.message });
  }
};

/**
 * 3. Complaints by Priority
 * GET /api/analytics/priority
 */
exports.getPriorityAnalytics = async (req, res) => {
  try {
    const filter = buildComplaintFilter(req.query);
    const allPriorities = ['Low', 'Medium', 'High', 'Critical'];

    const aggregation = await Complaint.aggregate([
      { $match: filter },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const total = aggregation.reduce((sum, item) => sum + item.count, 0);

    const data = allPriorities.map((priority) => {
      const found = aggregation.find((item) => item._id === priority);
      const count = found ? found.count : 0;
      const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
      return { priority, count, percentage };
    });

    res.json({ total, data });
  } catch (error) {
    console.error('getPriorityAnalytics error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve priority analytics', error: error.message });
  }
};

/**
 * 4. Complaints by Category
 * GET /api/analytics/category
 */
exports.getCategoryAnalytics = async (req, res) => {
  try {
    const filter = buildComplaintFilter(req.query);

    const aggregation = await Complaint.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const total = aggregation.reduce((sum, item) => sum + item.count, 0);

    const data = aggregation.map((item) => ({
      category: item._id || 'Uncategorized',
      count: item.count,
      percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0,
    }));

    res.json({ total, data });
  } catch (error) {
    console.error('getCategoryAnalytics error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve category analytics', error: error.message });
  }
};

/**
 * 5. Monthly Complaint Trends
 * GET /api/analytics/monthly-trends
 */
exports.getMonthlyTrends = async (req, res) => {
  try {
    const filter = buildComplaintFilter(req.query);

    const aggregation = await Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
    ]);

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const trends = aggregation.map((item) => {
      const year = item._id.year;
      const monthNum = item._id.month;
      const monthStr = String(monthNum).padStart(2, '0');
      const label = `${monthNames[monthNum - 1]} ${year}`;
      return {
        month: `${year}-${monthStr}`,
        label,
        total: item.total,
        resolved: item.resolved,
      };
    });

    res.json(trends);
  } catch (error) {
    console.error('getMonthlyTrends error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve monthly trends', error: error.message });
  }
};

/**
 * 6. Resolution Performance Metrics
 * GET /api/analytics/resolution-performance
 */
exports.getResolutionPerformance = async (req, res) => {
  try {
    const filter = buildComplaintFilter(req.query);

    // Query all complaints matching filter
    const complaints = await Complaint.find(filter, {
      status: 1,
      createdAt: 1,
      updatedAt: 1,
      resolvedAt: 1,
      category: 1,
      priority: 1,
      isEscalated: 1,
      pendingSince: 1,
    });

    const totalComplaints = complaints.length;
    const resolvedComplaints = complaints.filter(
      (c) => c.status === 'Resolved' || c.status === 'Closed'
    );
    const totalResolved = resolvedComplaints.length;

    // Overdue count
    const overdueCondition = getOverdueCondition();
    const overdueCount = await Complaint.countDocuments({
      ...filter,
      ...overdueCondition,
    });

    // Calculate resolution times strictly for resolved complaints
    let totalResolutionMilliseconds = 0;
    const categoryResolutionMap = {};

    resolvedComplaints.forEach((c) => {
      const start = new Date(c.createdAt).getTime();
      const end = new Date(c.resolvedAt || c.updatedAt).getTime();
      const diffMs = Math.max(0, end - start);

      totalResolutionMilliseconds += diffMs;

      const cat = c.category || 'General';
      if (!categoryResolutionMap[cat]) {
        categoryResolutionMap[cat] = { totalMs: 0, count: 0 };
      }
      categoryResolutionMap[cat].totalMs += diffMs;
      categoryResolutionMap[cat].count += 1;
    });

    const averageResolutionHours =
      totalResolved > 0
        ? Number((totalResolutionMilliseconds / (totalResolved * 3600000)).toFixed(1))
        : 0;

    const averageResolutionDays =
      totalResolved > 0
        ? Number((averageResolutionHours / 24).toFixed(1))
        : 0;

    const resolutionPercentage =
      totalComplaints > 0
        ? Number(((totalResolved / totalComplaints) * 100).toFixed(1))
        : 0;

    const categoryPerformance = Object.entries(categoryResolutionMap).map(
      ([category, data]) => ({
        category,
        avgHours: Number((data.totalMs / (data.count * 3600000)).toFixed(1)),
        count: data.count,
      })
    );

    // Format human-readable average time
    let formattedAverageTime = '0 hrs';
    if (averageResolutionHours >= 24) {
      formattedAverageTime = `${averageResolutionDays} days`;
    } else if (averageResolutionHours > 0) {
      formattedAverageTime = `${averageResolutionHours} hrs`;
    }

    res.json({
      averageResolutionHours,
      averageResolutionDays,
      formattedAverageTime,
      totalResolved,
      totalComplaints,
      resolutionPercentage,
      overdueCount,
      categoryPerformance,
    });
  } catch (error) {
    console.error('getResolutionPerformance error:', error.message);
    res.status(500).json({ message: 'Failed to calculate resolution performance', error: error.message });
  }
};

/**
 * 7. Admin-wise Performance Metrics
 * GET /api/analytics/admin-performance
 */
exports.getAdminPerformance = async (req, res) => {
  try {
    const filter = buildComplaintFilter(req.query);

    // Find all admin accounts
    const admins = await User.find({ role: 'admin' }, '_id username email');

    // Aggregate complaints assigned to admins
    const aggregation = await Complaint.aggregate([
      { $match: { ...filter, assignedTo: { $ne: null } } },
      {
        $group: {
          _id: '$assignedTo',
          adminName: { $first: '$assignedToName' },
          assignedCount: { $sum: 1 },
          resolvedCount: {
            $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] },
          },
          inProgressCount: {
            $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] },
          },
          totalResolutionMs: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Resolved', 'Closed']] },
                {
                  $subtract: [
                    { $ifNull: ['$resolvedAt', '$updatedAt'] },
                    '$createdAt',
                  ],
                },
                0,
              ],
            },
          },
        },
      },
    ]);

    const adminStats = admins.map((adm) => {
      const match = aggregation.find((a) => a._id?.toString() === adm._id.toString());
      const assignedCount = match ? match.assignedCount : 0;
      const resolvedCount = match ? match.resolvedCount : 0;
      const inProgressCount = match ? match.inProgressCount : 0;
      const pendingCount = match ? match.pendingCount : 0;
      const resolutionRate =
        assignedCount > 0 ? Number(((resolvedCount / assignedCount) * 100).toFixed(1)) : 0;
      const avgResolutionHours =
        resolvedCount > 0
          ? Number((match.totalResolutionMs / (resolvedCount * 3600000)).toFixed(1))
          : 0;

      return {
        adminId: adm._id,
        adminName: adm.username,
        email: adm.email,
        assignedCount,
        resolvedCount,
        inProgressCount,
        pendingCount,
        resolutionRate,
        avgResolutionHours,
      };
    });

    res.json(adminStats);
  } catch (error) {
    console.error('getAdminPerformance error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve admin performance', error: error.message });
  }
};

/**
 * 8. Export Filtered Complaints as CSV
 * GET /api/analytics/export
 */
exports.exportComplaintsCSV = async (req, res) => {
  try {
    const filter = buildComplaintFilter(req.query);

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Helper to escape CSV cell content
    const escapeCSV = (field) => {
      if (field === null || field === undefined) return '""';
      const stringValue = String(field).replace(/"/g, '""');
      return `"${stringValue}"`;
    };

    const headers = [
      'Ticket Number',
      'Title',
      'Category',
      'Priority',
      'Status',
      'Location',
      'Submitted By',
      'Assigned Admin',
      'Created At',
      'Resolved At',
      'Is Escalated',
    ];

    const rows = complaints.map((c) => {
      const createdAt = c.createdAt ? new Date(c.createdAt).toISOString() : '';
      const resolvedAt = c.resolvedAt
        ? new Date(c.resolvedAt).toISOString()
        : c.status === 'Resolved' || c.status === 'Closed'
        ? new Date(c.updatedAt).toISOString()
        : '';

      return [
        escapeCSV(c.ticketNumber || ''),
        escapeCSV(c.title || ''),
        escapeCSV(c.category || ''),
        escapeCSV(c.priority || ''),
        escapeCSV(c.status || ''),
        escapeCSV(c.location || ''),
        escapeCSV(c.userName || ''),
        escapeCSV(c.assignedToName || 'Unassigned'),
        escapeCSV(createdAt),
        escapeCSV(resolvedAt),
        escapeCSV(c.isEscalated ? 'Yes' : 'No'),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    // Audit Log
    await logAudit({
      user: req.user,
      role: req.user.role,
      action: 'ANALYTICS_REPORT_EXPORTED',
      entityType: 'Report',
      entityId: null,
      details: {
        format: 'CSV',
        filters: req.query,
        rowCount: complaints.length,
      },
    });

    const filename = `complaints-report-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('exportComplaintsCSV error:', error.message);
    res.status(500).json({ message: 'Failed to generate CSV export', error: error.message });
  }
};
