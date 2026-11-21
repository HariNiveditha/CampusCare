const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const Counter = require('../models/Counter');
const { getJwtSecret } = require('../config/jwt');

require('./setup');

describe('PHASE 1: CRITICAL FOUNDATION TEST SUITE', () => {
  let studentToken;
  let studentUser;
  let student2Token;
  let student2User;
  let adminToken;
  let adminUser;

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Complaint.deleteMany({});
    await AuditLog.deleteMany({});
    await Counter.deleteMany({});

    // Seed test users
    adminUser = await User.create({
      username: 'test_admin',
      email: 'admin@test.edu',
      password: 'Password123',
      role: 'admin',
    });

    studentUser = await User.create({
      username: 'test_student',
      email: 'student@test.edu',
      password: 'Password123',
      role: 'student',
    });

    student2User = await User.create({
      username: 'other_student',
      email: 'other@test.edu',
      password: 'Password123',
      role: 'student',
    });

    // Generate tokens
    studentToken = jwt.sign(
      { id: studentUser._id, username: studentUser.username, role: studentUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    student2Token = jwt.sign(
      { id: student2User._id, username: student2User.username, role: student2User.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: adminUser._id, username: adminUser.username, role: adminUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  // =========================================================================
  // MODULE 2: SECURE JWT CONFIGURATION
  // =========================================================================
  describe('Module 2: Secure JWT Configuration', () => {
    it('should retrieve secret exclusively from environment variables', () => {
      expect(getJwtSecret()).toBe(process.env.JWT_SECRET);
    });

    it('should throw fatal configuration error if JWT_SECRET is missing', () => {
      const origSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      expect(() => getJwtSecret()).toThrow(/JWT_SECRET environment variable is missing/);
      process.env.JWT_SECRET = origSecret;
    });

    it('should generate verifiable tokens with expiration', () => {
      const token = jwt.sign({ id: '123' }, process.env.JWT_SECRET, { expiresIn: '10m' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe('123');
      expect(decoded.exp).toBeDefined();
    });
  });

  // =========================================================================
  // MODULE 3: AUTHENTICATION & AUTH MIDDLEWARE
  // =========================================================================
  describe('Module 3: Authentication & Middleware', () => {
    it('should authenticate user and return token on valid login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test_student', password: 'Password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('test_student');
      expect(res.body.role).toBe('student');
    });

    it('should reject invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test_student', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid username or password/);
    });

    it('should reject requests without Authorization token with 401', async () => {
      const res = await request(app).get('/api/complaints');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/No token provided/);
    });

    it('should reject requests with invalid token format with 401', async () => {
      const res = await request(app)
        .get('/api/complaints')
        .set('Authorization', 'InvalidFormat 12345');
      expect(res.status).toBe(401);
    });

    it('should reject requests with tampered/invalid token with 401', async () => {
      const res = await request(app)
        .get('/api/complaints')
        .set('Authorization', 'Bearer invalid.tampered.token');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid token/);
    });

    it('should reject expired tokens with 401', async () => {
      const expiredToken = jwt.sign(
        { id: studentUser._id, username: studentUser.username, role: 'student' },
        process.env.JWT_SECRET,
        { expiresIn: '-10s' } // Expired 10 seconds ago
      );

      const res = await request(app)
        .get('/api/complaints')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Token expired/);
    });
  });

  // =========================================================================
  // MODULE 4: ROLE-BASED ACCESS CONTROL (RBAC)
  // =========================================================================
  describe('Module 4: Role-Based Access Control', () => {
    let testComplaint;

    beforeEach(async () => {
      testComplaint = await Complaint.create({
        title: 'Water filter issue',
        description: 'Filter not working',
        category: 'Plumbing',
        userId: studentUser._id,
        userName: studentUser.username,
        priority: 'Medium',
        status: 'Submitted',
      });
    });

    it('should allow students to access permitted route (view complaints)', async () => {
      const res = await request(app)
        .get('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should allow admin to access admin routes (view admins list)', async () => {
      const res = await request(app)
        .get('/api/auth/admins')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((a) => a.username === 'test_admin')).toBe(true);
    });

    it('should FORBID student from updating complaint status (403)', async () => {
      const res = await request(app)
        .put(`/api/complaints/${testComplaint._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'Resolved' });

      expect(res.status).toBe(403);
    });

    it('should FORBID student from updating priority (403)', async () => {
      const res = await request(app)
        .put(`/api/complaints/${testComplaint._id}/priority`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ priority: 'Critical' });

      expect(res.status).toBe(403);
    });

    it('should FORBID student from assigning complaints (403)', async () => {
      const res = await request(app)
        .put(`/api/complaints/${testComplaint._id}/assign`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ assignedTo: adminUser._id });

      expect(res.status).toBe(403);
    });

    it('should FORBID student from adding internal work notes (403)', async () => {
      const res = await request(app)
        .post(`/api/complaints/${testComplaint._id}/work-notes`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ note: 'Attempting internal note' });

      expect(res.status).toBe(403);
    });

    it('should FORBID student from accessing another student restricted complaints (403)', async () => {
      // studentToken (studentUser) queries student2User's complaints
      const res = await request(app)
        .get(`/api/complaints/user/${student2User._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow student to access their own complaints', async () => {
      const res = await request(app)
        .get(`/api/complaints/user/${studentUser._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });

  // =========================================================================
  // MODULE 1 & 5: LOCATION, PHOTO & TICKET MANAGEMENT
  // =========================================================================
  describe('Module 1 & 5: Location, Photo & Structured Ticket Management', () => {
    it('should create complaint with location and generate atomic ticketNumber (CMP0001)', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'AC Broken in Seminar Hall',
          description: 'AC unit 3 is leaking water continuously',
          category: 'Electrical',
          location: 'Seminar Hall 2 - 3rd Floor',
        });

      expect(res.status).toBe(201);
      expect(res.body.ticketNumber).toBe('CMP0001');
      expect(res.body.location).toBe('Seminar Hall 2 - 3rd Floor');
      expect(res.body.priority).toBe('Medium');
      expect(res.body.status).toBe('Submitted');
      // User ID must be attached securely from token
      expect(res.body.userId).toBe(studentUser._id.toString());
      expect(res.body.userName).toBe(studentUser.username);
    });

    it('should increment ticketNumber sequentially for concurrent creations (CMP0001, CMP0002, CMP0003)', async () => {
      const c1 = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Issue 1', description: 'Desc 1', category: 'Furniture' });

      const c2 = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Issue 2', description: 'Desc 2', category: 'Cleanliness' });

      const c3 = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Issue 3', description: 'Desc 3', category: 'Window' });

      expect(c1.body.ticketNumber).toBe('CMP0001');
      expect(c2.body.ticketNumber).toBe('CMP0002');
      expect(c3.body.ticketNumber).toBe('CMP0003');
    });

    it('should persist photo upload with valid image format', async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64'
      );

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Broken Door Lock')
        .field('description', 'Lock broken with image')
        .field('category', 'Door/Lock')
        .field('location', 'Room 204')
        .attach('photo', pngBuffer, 'test-door.png');

      expect(res.status).toBe(201);
      expect(res.body.photo).toMatch(/\/uploads\/complaint-.*\.png/);
      expect(res.body.location).toBe('Room 204');
    });

    it('should reject unsupported photo formats with 400 Bad Request', async () => {
      const txtBuffer = Buffer.from('This is a text file, not an image');

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Unsupported File')
        .field('description', 'Testing file upload restriction')
        .field('category', 'Other')
        .attach('photo', txtBuffer, 'malicious.exe');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Unsupported file format/);
    });

    it('should allow admin to update complaint priority', async () => {
      const complaint = await Complaint.create({
        title: 'Main water line burst',
        description: 'Flooding building entrance',
        category: 'Plumbing',
        userId: studentUser._id,
        userName: studentUser.username,
        priority: 'Medium',
      });

      const res = await request(app)
        .put(`/api/complaints/${complaint._id}/priority`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priority: 'Critical' });

      expect(res.status).toBe(200);
      expect(res.body.priority).toBe('Critical');

      const updated = await Complaint.findById(complaint._id);
      expect(updated.priority).toBe('Critical');
    });

    it('should allow admin to assign complaint to an administrator', async () => {
      const complaint = await Complaint.create({
        title: 'Projector broken',
        description: 'Lamp needs replacement',
        category: 'Electrical',
        userId: studentUser._id,
        userName: studentUser.username,
      });

      const res = await request(app)
        .put(`/api/complaints/${complaint._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedTo: adminUser._id });

      expect(res.status).toBe(200);
      expect(res.body.assignedTo).toBe(adminUser._id.toString());
      expect(res.body.assignedToName).toBe(adminUser.username);
    });

    it('should allow admin to add internal work notes and prevent student visibility', async () => {
      const complaint = await Complaint.create({
        title: 'Roof leak',
        description: 'Water drops in corridor',
        category: 'Cleanliness',
        userId: studentUser._id,
        userName: studentUser.username,
      });

      // Admin adds work note
      const noteRes = await request(app)
        .post(`/api/complaints/${complaint._id}/work-notes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Called contractor XYZ. Quoted $400 for roof sealant.' });

      expect(noteRes.status).toBe(200);
      expect(noteRes.body.workNotes).toBeDefined();
      expect(noteRes.body.workNotes.length).toBe(1);
      expect(noteRes.body.workNotes[0].note).toBe('Called contractor XYZ. Quoted $400 for roof sealant.');
      expect(noteRes.body.workNotes[0].authorName).toBe(adminUser.username);

      // Student views the same complaint
      const studentViewRes = await request(app)
        .get(`/api/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(studentViewRes.status).toBe(200);
      // Student MUST NOT see internal work notes
      expect(studentViewRes.body.workNotes).toBeUndefined();

      // Student views all complaints list
      const studentAllRes = await request(app)
        .get('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`);

      const foundComplaint = studentAllRes.body.find((c) => c._id === complaint._id.toString());
      expect(foundComplaint.workNotes).toBeUndefined();
    });

    it('should allow admin to update status and add admin response', async () => {
      const complaint = await Complaint.create({
        title: 'Classroom Fan Noise',
        description: 'Bearing worn out',
        category: 'Electrical',
        userId: studentUser._id,
        userName: studentUser.username,
        status: 'Submitted',
      });

      const res = await request(app)
        .put(`/api/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Resolved',
          adminResponse: 'Electrician replaced bearing and balanced blades.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Resolved');
      expect(res.body.adminResponse).toBe('Electrician replaced bearing and balanced blades.');
    });
  });

  // =========================================================================
  // MODULE 6: AUDIT LOGGING
  // =========================================================================
  describe('Module 6: Audit Logging Trail', () => {
    it('should automatically log COMPLAINT_CREATED on complaint creation', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Campus WiFi Outage',
          description: 'No connection in West Wing',
          category: 'Other',
          location: 'West Wing Block 3',
        });

      expect(res.status).toBe(201);

      const logs = await AuditLog.find({ action: 'COMPLAINT_CREATED' });
      expect(logs.length).toBe(1);
      expect(logs[0].entityType).toBe('Complaint');
      expect(logs[0].entityId.toString()).toBe(res.body._id);
      expect(logs[0].username).toBe(studentUser.username);
      expect(logs[0].details.ticketNumber).toBe(res.body.ticketNumber);
      expect(logs[0].details.location).toBe('West Wing Block 3');
    });

    it('should log COMPLAINT_STATUS_UPDATED and ADMIN_RESPONSE_ADDED on status change', async () => {
      const complaint = await Complaint.create({
        title: 'Broken Bench',
        description: 'Wood plank split',
        category: 'Furniture',
        userId: studentUser._id,
        userName: studentUser.username,
        status: 'Submitted',
      });

      await request(app)
        .put(`/api/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'In Progress',
          adminResponse: 'Carpenter assigned for repairs.',
        });

      const statusLog = await AuditLog.findOne({ action: 'COMPLAINT_STATUS_UPDATED' });
      expect(statusLog).toBeDefined();
      expect(statusLog.details.oldStatus).toBe('Submitted');
      expect(statusLog.details.newStatus).toBe('In Progress');
      expect(statusLog.username).toBe(adminUser.username);

      const responseLog = await AuditLog.findOne({ action: 'ADMIN_RESPONSE_ADDED' });
      expect(responseLog).toBeDefined();
      expect(responseLog.details.response).toBe('Carpenter assigned for repairs.');
    });

    it('should log COMPLAINT_ASSIGNED and WORK_NOTE_ADDED', async () => {
      const complaint = await Complaint.create({
        title: 'Gym equipment issue',
        description: 'Treadmill belt loose',
        category: 'Other',
        userId: studentUser._id,
        userName: studentUser.username,
      });

      // Assignment
      await request(app)
        .put(`/api/complaints/${complaint._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedTo: adminUser._id });

      const assignLog = await AuditLog.findOne({ action: 'COMPLAINT_ASSIGNED' });
      expect(assignLog).toBeDefined();
      expect(assignLog.details.assignedToName).toBe(adminUser.username);

      // Work note
      await request(app)
        .post(`/api/complaints/${complaint._id}/work-notes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Technician visit confirmed for Thursday 10 AM.' });

      const workNoteLog = await AuditLog.findOne({ action: 'WORK_NOTE_ADDED' });
      expect(workNoteLog).toBeDefined();
      expect(workNoteLog.details.authorName).toBe(adminUser.username);
    });

    it('should allow admin to query audit logs with pagination', async () => {
      await AuditLog.create([
        { action: 'TEST_ACTION_1', entityType: 'Complaint', role: 'admin', username: 'admin' },
        { action: 'TEST_ACTION_2', entityType: 'Complaint', role: 'admin', username: 'admin' },
      ]);

      const res = await request(app)
        .get('/api/audit-logs?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(2);
      expect(res.body.page).toBe(1);
    });

    it('should FORBID student from querying audit logs (403)', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('should ensure no modification/deletion APIs exist for audit logs', async () => {
      // Ordinary HTTP DELETE or PUT to audit-logs route should return 404 or 405
      const putRes = await request(app)
        .put('/api/audit-logs/12345')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'MALICIOUS_OVERWRITE' });
      expect(putRes.status).toBe(404);

      const deleteRes = await request(app)
        .delete('/api/audit-logs/12345')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteRes.status).toBe(404);
    });

    it('should NEVER store passwords, secrets, or tokens in audit logs', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'audit_test_user',
          email: 'audit@test.edu',
          password: 'SecretPassword123!',
          confirmPassword: 'SecretPassword123!',
        });

      const regLog = await AuditLog.findOne({ action: 'USER_REGISTERED' });
      expect(regLog).toBeDefined();
      expect(regLog.details.password).toBeUndefined();
      expect(regLog.details.confirmPassword).toBeUndefined();
      expect(regLog.details.token).toBeUndefined();
    });
  });
});
