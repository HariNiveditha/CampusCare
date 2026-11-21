const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Counter = require('../models/Counter');
const AuditLog = require('../models/AuditLog');

// Require test environment setup
require('./setup');

describe('PHASE 4: REPORTS & ANALYTICS TEST SUITE', () => {
  let adminToken, studentToken;
  let adminUser, studentUser;
  let complaint1, complaint2, complaint3, complaint4, complaint5;

  beforeAll(async () => {
    // Reset test database
    await User.deleteMany({});
    await Complaint.deleteMany({});
    await Counter.deleteMany({});
    await AuditLog.deleteMany({});

    await Counter.create({ _id: 'ticketNumber', seq: 0 });

    // Create test accounts
    adminUser = await User.create({
      username: 'analytics_admin',
      email: 'analytics_admin@college.edu',
      password: 'adminPassword123',
      role: 'admin',
    });

    studentUser = await User.create({
      username: 'analytics_student',
      email: 'analytics_student@college.edu',
      password: 'studentPassword123',
      role: 'student',
    });

    adminToken = jwt.sign(
      { id: adminUser._id, username: adminUser.username, role: adminUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    studentToken = jwt.sign(
      { id: studentUser._id, username: studentUser.username, role: studentUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Seed test complaints across statuses and categories
    const now = Date.now();
    const fourDaysAgo = new Date(now - 4 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 1 * 24 * 60 * 60 * 1000);

    // Complaint 1: Submitted (Electrical, Low)
    complaint1 = await Complaint.create({
      title: 'Flickering Bulb',
      description: 'Room 101 flickering light.',
      category: 'Electrical',
      priority: 'Low',
      location: 'Block A',
      status: 'Submitted',
      userId: studentUser._id,
      userName: studentUser.username,
      createdAt: oneDayAgo,
    });

    // Complaint 2: In Progress (Plumbing, Critical, assigned to adminUser)
    complaint2 = await Complaint.create({
      title: 'Major Pipe Burst',
      description: 'Corridor flooding.',
      category: 'Plumbing',
      priority: 'Critical',
      location: 'Block B',
      status: 'In Progress',
      assignedTo: adminUser._id,
      assignedToName: adminUser.username,
      userId: studentUser._id,
      userName: studentUser.username,
      createdAt: twoDaysAgo, // Critical and > 24 hours -> Overdue!
    });

    // Complaint 3: Pending & Escalated (Electrical, High, 4 days ago -> Overdue!)
    complaint3 = await Complaint.create({
      title: 'Power Socket Short',
      description: 'Lab 2 power socket.',
      category: 'Electrical',
      priority: 'High',
      location: 'Lab 2',
      status: 'Pending',
      isEscalated: true,
      pendingSince: fourDaysAgo,
      userId: studentUser._id,
      userName: studentUser.username,
      createdAt: fourDaysAgo,
    });

    // Complaint 4: Resolved (Plumbing, Medium, created 48h ago, resolved 24h ago -> 24h resolution time)
    complaint4 = await Complaint.create({
      title: 'Leaky Tap Replaced',
      description: 'Tap was dripping.',
      category: 'Plumbing',
      priority: 'Medium',
      location: 'Washroom 3',
      status: 'Resolved',
      assignedTo: adminUser._id,
      assignedToName: adminUser.username,
      userId: studentUser._id,
      userName: studentUser.username,
      createdAt: twoDaysAgo,
      resolvedAt: oneDayAgo, // Diff = 24 hours
    });

    // Complaint 5: Closed (Wi-Fi & IT, High, created 24h ago, resolved 12h ago -> 12h resolution time)
    complaint5 = await Complaint.create({
      title: 'Router Rebooted',
      description: 'Hostel router was offline.',
      category: 'Wi-Fi & IT',
      priority: 'High',
      location: 'Hostel C',
      status: 'Closed',
      assignedTo: adminUser._id,
      assignedToName: adminUser.username,
      userId: studentUser._id,
      userName: studentUser.username,
      createdAt: oneDayAgo,
      resolvedAt: new Date(now - 12 * 60 * 60 * 1000),
    });
  });

  describe('Module 1: Admin Overview KPIs', () => {
    it('should calculate accurate overview KPIs dynamically from database records', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(5);
      expect(res.body.submitted).toBe(1);
      expect(res.body.inProgress).toBe(1);
      expect(res.body.pending).toBe(1);
      expect(res.body.resolved).toBe(1);
      expect(res.body.closed).toBe(1);
      expect(res.body.overdue).toBeGreaterThanOrEqual(1); // complaint2 (critical > 24h) and complaint3 (escalated pending)
    });

    it('should filter overview KPIs by category', async () => {
      const res = await request(app)
        .get('/api/analytics/overview?category=Electrical')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.submitted).toBe(1);
      expect(res.body.pending).toBe(1);
      expect(res.body.resolved).toBe(0);
    });

    it('should FORBID student from accessing overview KPIs (403)', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Module 2: Status & Priority Aggregations', () => {
    it('should aggregate complaints by status with correct percentages', async () => {
      const res = await request(app)
        .get('/api/analytics/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(5);
      expect(Array.isArray(res.body.data)).toBe(true);

      const submitted = res.body.data.find((d) => d.status === 'Submitted');
      expect(submitted.count).toBe(1);
      expect(submitted.percentage).toBe(20.0);
    });

    it('should aggregate complaints by priority with correct distribution', async () => {
      const res = await request(app)
        .get('/api/analytics/priority')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(5);

      const critical = res.body.data.find((d) => d.priority === 'Critical');
      expect(critical.count).toBe(1);
      expect(critical.percentage).toBe(20.0);

      const high = res.body.data.find((d) => d.priority === 'High');
      expect(high.count).toBe(2);
      expect(high.percentage).toBe(40.0);
    });

    it('should FORBID student from accessing status/priority endpoints (403)', async () => {
      const res1 = await request(app)
        .get('/api/analytics/status')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res1.status).toBe(403);

      const res2 = await request(app)
        .get('/api/analytics/priority')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res2.status).toBe(403);
    });
  });

  describe('Module 3: Category & Monthly Trends', () => {
    it('should aggregate complaints by category', async () => {
      const res = await request(app)
        .get('/api/analytics/category')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(5);

      const categories = res.body.data.map((d) => d.category);
      expect(categories).toContain('Electrical');
      expect(categories).toContain('Plumbing');
      expect(categories).toContain('Wi-Fi & IT');
    });

    it('should aggregate monthly trends with total and resolved counts', async () => {
      const res = await request(app)
        .get('/api/analytics/monthly-trends')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const totalInTrends = res.body.reduce((sum, m) => sum + m.total, 0);
      const resolvedInTrends = res.body.reduce((sum, m) => sum + m.resolved, 0);
      expect(totalInTrends).toBe(5);
      expect(resolvedInTrends).toBe(2);
    });
  });

  describe('Module 4: Resolution Performance & Admin Analytics', () => {
    it('should calculate resolution times strictly from resolved complaints', async () => {
      const res = await request(app)
        .get('/api/analytics/resolution-performance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalComplaints).toBe(5);
      expect(res.body.totalResolved).toBe(2);
      expect(res.body.resolutionPercentage).toBe(40.0);
      expect(res.body.averageResolutionHours).toBeGreaterThan(0);
      expect(res.body.overdueCount).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.categoryPerformance)).toBe(true);
    });

    it('should aggregate admin-wise assignment and resolution metrics', async () => {
      const res = await request(app)
        .get('/api/analytics/admin-performance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const adminStat = res.body.find((a) => a.adminId.toString() === adminUser._id.toString());
      expect(adminStat).toBeDefined();
      expect(adminStat.assignedCount).toBe(3); // complaint2, complaint4, complaint5
      expect(adminStat.resolvedCount).toBe(2); // complaint4, complaint5
      expect(adminStat.inProgressCount).toBe(1); // complaint2
      expect(adminStat.resolutionRate).toBeCloseTo(66.7, 0);
    });
  });

  describe('Module 5: Filtering & Empty Dataset Handling', () => {
    it('should handle date range filtering properly', async () => {
      // Future date range where no complaints exist
      const futureStart = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const futureEnd = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .get(`/api/analytics/overview?startDate=${futureStart}&endDate=${futureEnd}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
      expect(res.body.resolved).toBe(0);
      expect(res.body.overdue).toBe(0);
    });

    it('should handle resolution performance gracefully with zero matches (no division by zero)', async () => {
      const futureStart = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .get(`/api/analytics/resolution-performance?startDate=${futureStart}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalComplaints).toBe(0);
      expect(res.body.totalResolved).toBe(0);
      expect(res.body.averageResolutionHours).toBe(0);
      expect(res.body.resolutionPercentage).toBe(0);
      expect(res.body.formattedAverageTime).toBe('0 hrs');
    });
  });

  describe('Module 6: CSV Export & Audit Logging', () => {
    it('should export complaints as CSV with correct headers and Content-Type', async () => {
      const res = await request(app)
        .get('/api/analytics/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="complaints-report-/);

      // Check CSV content headers
      expect(res.text).toContain('Ticket Number');
      expect(res.text).toContain('Title');
      expect(res.text).toContain('Category');
      expect(res.text).toContain('Priority');
      expect(res.text).toContain('Status');

      // Check complaint records in CSV
      expect(res.text).toContain('Flickering Bulb');
      expect(res.text).toContain('Major Pipe Burst');

      // Verify AuditLog entry recorded
      const audit = await AuditLog.findOne({ action: 'ANALYTICS_REPORT_EXPORTED' });
      expect(audit).not.toBeNull();
      expect(audit.username).toBe(adminUser.username);
      expect(audit.details.format).toBe('CSV');
      expect(audit.details.rowCount).toBe(5);
    });

    it('should FORBID student from exporting CSV report (403)', async () => {
      const res = await request(app)
        .get('/api/analytics/export')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });
});
