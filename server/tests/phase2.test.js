const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Counter = require('../models/Counter');
const Flow = require('../models/Flow');
const FlowExecution = require('../models/FlowExecution');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const escalationService = require('../services/escalationService');

// Require test environment setup
require('./setup');

describe('PHASE 2: FLOW ENGINE, NOTIFICATIONS & ESCALATION TEST SUITE', () => {
  let adminToken, studentToken, otherStudentToken;
  let adminUser, studentUser, otherStudentUser;
  let createdAcknowledgementFlow, statusUpdateFlow, escalationFlow;

  beforeAll(async () => {
    // Reset test database
    await User.deleteMany({});
    await Complaint.deleteMany({});
    await Counter.deleteMany({});
    await Flow.deleteMany({});
    await FlowExecution.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});

    await Counter.create({ _id: 'ticketNumber', seq: 0 });

    // Create test accounts
    adminUser = await User.create({
      username: 'test_admin_phase2',
      email: 'admin_phase2@college.edu',
      password: 'adminPassword123',
      role: 'admin',
    });

    studentUser = await User.create({
      username: 'test_student_phase2',
      email: 'student_phase2@college.edu',
      password: 'studentPassword123',
      role: 'student',
    });

    otherStudentUser = await User.create({
      username: 'other_student_phase2',
      email: 'other_phase2@college.edu',
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

    otherStudentToken = jwt.sign(
      { id: otherStudentUser._id, username: otherStudentUser.username, role: otherStudentUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Create default seeded flows
    createdAcknowledgementFlow = await Flow.create({
      name: 'Complaint Creation Acknowledgement Test',
      description: 'Sends notification receipt when complaint is filed.',
      trigger: 'COMPLAINT_CREATED',
      conditions: [],
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          params: {
            recipientTarget: 'STUDENT',
            title: 'Complaint Logged Successfully',
            message: 'Your complaint #{ticketNumber} ("{title}") has been received.',
            type: 'COMPLAINT_ACKNOWLEDGEMENT',
          },
        },
      ],
      isActive: true,
      createdBy: adminUser._id,
    });

    statusUpdateFlow = await Flow.create({
      name: 'Complaint Status Update Notification Test',
      description: 'Notifies student on status changes.',
      trigger: 'COMPLAINT_STATUS_CHANGED',
      conditions: [],
      actions: [
        {
          type: 'SEND_NOTIFICATION',
          params: {
            recipientTarget: 'STUDENT',
            title: 'Complaint Status Updated',
            message: 'The status of your ticket #{ticketNumber} has been updated to "{newStatus}".',
            type: 'STATUS_UPDATE',
          },
        },
      ],
      isActive: true,
      createdBy: adminUser._id,
    });

    escalationFlow = await Flow.create({
      name: 'Pending Complaint Escalation Test',
      description: 'Escalates pending complaints >= 3 days old.',
      trigger: 'COMPLAINT_PENDING_DURATION',
      conditions: [
        {
          field: 'daysPending',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 3,
        },
      ],
      actions: [
        {
          type: 'UPDATE_PRIORITY',
          params: { priority: 'High' },
        },
        {
          type: 'ESCALATE_COMPLAINT',
          params: {},
        },
      ],
      isActive: true,
      createdBy: adminUser._id,
    });
  });

  describe('Module A: Flow Engine Triggers & Executions', () => {
    let createdComplaintId;
    let createdTicketNumber;

    it('should fire COMPLAINT_CREATED flow and deliver notification when complaint is submitted', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Ceiling Fan Wobbling',
          description: 'The ceiling fan in room 204 wobbles and makes a grinding noise.',
          category: 'Electrical',
          location: 'Hostel 1 - Room 204',
        });

      expect(res.status).toBe(201);
      expect(res.body.ticketNumber).toBeDefined();
      createdComplaintId = res.body._id;
      createdTicketNumber = res.body.ticketNumber;

      // Check FlowExecution record
      const execution = await FlowExecution.findOne({
        flow: createdAcknowledgementFlow._id,
        complaint: createdComplaintId,
      });

      expect(execution).not.toBeNull();
      expect(execution.executionStatus).toBe('SUCCESS');
      expect(execution.trigger).toBe('COMPLAINT_CREATED');

      // Check notification received by student
      const notification = await Notification.findOne({
        recipient: studentUser._id,
        complaint: createdComplaintId,
        type: 'COMPLAINT_ACKNOWLEDGEMENT',
      });

      expect(notification).not.toBeNull();
      expect(notification.message).toContain(createdTicketNumber);
      expect(notification.isRead).toBe(false);
    });

    it('should fire COMPLAINT_STATUS_CHANGED flow when status is updated', async () => {
      const res = await request(app)
        .put(`/api/complaints/${createdComplaintId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'In Progress',
          adminResponse: 'Maintenance team dispatched.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('In Progress');

      // Check execution record
      const execution = await FlowExecution.findOne({
        flow: statusUpdateFlow._id,
        complaint: createdComplaintId,
      });

      expect(execution).not.toBeNull();
      expect(execution.executionStatus).toBe('SUCCESS');

      // Verify status update notification created for student
      const notification = await Notification.findOne({
        recipient: studentUser._id,
        complaint: createdComplaintId,
        type: 'STATUS_UPDATE',
      });

      expect(notification).not.toBeNull();
      expect(notification.message).toContain('In Progress');
    });

    it('should NOT trigger COMPLAINT_STATUS_CHANGED if status remains unchanged', async () => {
      // Clear executions for status update flow
      await FlowExecution.deleteMany({ flow: statusUpdateFlow._id });

      const res = await request(app)
        .put(`/api/complaints/${createdComplaintId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'In Progress', // Same status!
          adminResponse: 'Additional parts ordered.',
        });

      expect(res.status).toBe(200);

      // Verify NO new execution logged because status did not change
      const executions = await FlowExecution.find({
        flow: statusUpdateFlow._id,
      });
      expect(executions.length).toBe(0);
    });

    it('should NOT execute flow actions if flow is marked inactive (isActive: false)', async () => {
      // Deactivate flow
      await Flow.findByIdAndUpdate(createdAcknowledgementFlow._id, { isActive: false });

      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Cold Water Tap Jammed',
          description: 'Cannot turn tap handle.',
          category: 'Plumbing',
          location: 'Block B Ground Floor',
        });

      expect(res.status).toBe(201);
      const newComplaintId = res.body._id;

      // Check that no execution was recorded for inactive flow
      const execution = await FlowExecution.findOne({
        flow: createdAcknowledgementFlow._id,
        complaint: newComplaintId,
      });
      expect(execution).toBeNull();

      // Restore active status
      await Flow.findByIdAndUpdate(createdAcknowledgementFlow._id, { isActive: true });
    });

    it('should ensure internal work notes are never exposed in notifications', async () => {
      // Add work note as admin
      const res = await request(app)
        .post(`/api/complaints/${createdComplaintId}/work-notes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'CONFIDENTIAL: Vendor invoice code 998811.' });

      expect(res.status).toBe(200);

      // Check all notifications for this complaint
      const notifications = await Notification.find({ complaint: createdComplaintId });
      for (const n of notifications) {
        expect(n.message).not.toContain('CONFIDENTIAL');
        expect(n.message).not.toContain('998811');
      }
    });
  });

  describe('Module B: Notification Management & Permissions', () => {
    it('should retrieve only the authenticated user\'s notifications', async () => {
      const studentRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(studentRes.status).toBe(200);
      expect(Array.isArray(studentRes.body.notifications)).toBe(true);

      // Every returned notification MUST belong to this student
      studentRes.body.notifications.forEach((n) => {
        expect(n.recipient.toString()).toBe(studentUser._id.toString());
      });
    });

    it('should return accurate unread count for user', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.unreadCount).toBe('number');
      expect(res.body.unreadCount).toBeGreaterThanOrEqual(1);
    });

    it('should allow user to mark their notification as read', async () => {
      const unread = await Notification.findOne({
        recipient: studentUser._id,
        isRead: false,
      });
      expect(unread).not.toBeNull();

      const patchRes = await request(app)
        .patch(`/api/notifications/${unread._id}/read`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.isRead).toBe(true);
      expect(patchRes.body.readAt).toBeDefined();

      const updated = await Notification.findById(unread._id);
      expect(updated.isRead).toBe(true);
    });

    it('should FORBID user from marking another user\'s notification as read', async () => {
      // Create notification specifically for studentUser
      const studentNotif = await Notification.create({
        recipient: studentUser._id,
        recipientRole: 'student',
        title: 'Private Alert',
        message: 'Student private message',
        type: 'STATUS_UPDATE',
      });

      // otherStudent attempts to mark studentUser's notification as read
      const patchRes = await request(app)
        .patch(`/api/notifications/${studentNotif._id}/read`)
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(patchRes.status).toBe(403);
    });

    it('should allow user to mark all their notifications as read', async () => {
      // Ensure there are unread notifications
      await Notification.create([
        {
          recipient: studentUser._id,
          recipientRole: 'student',
          title: 'Alert 1',
          message: 'Msg 1',
          type: 'STATUS_UPDATE',
        },
        {
          recipient: studentUser._id,
          recipientRole: 'student',
          title: 'Alert 2',
          message: 'Msg 2',
          type: 'STATUS_UPDATE',
        },
      ]);

      const markAllRes = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(markAllRes.status).toBe(200);
      expect(markAllRes.body.modifiedCount).toBeGreaterThanOrEqual(2);

      // Verify unread count is now 0
      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(countRes.status).toBe(200);
      expect(countRes.body.unreadCount).toBe(0);
    });
  });

  describe('Module C: Automated SLA Escalation Engine', () => {
    let overdueComplaint;
    let freshComplaint;
    let resolvedComplaint;

    beforeAll(async () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

      // Complaint pending for 4 days (should escalate)
      overdueComplaint = await Complaint.create({
        title: 'Broken Main Gate Lock',
        description: 'Main hostel gate lock is busted.',
        category: 'Security',
        priority: 'Low',
        location: 'Hostel Main Gate',
        userId: studentUser._id,
        userName: studentUser.username,
        status: 'Pending',
        pendingSince: fourDaysAgo,
        isEscalated: false,
      });

      // Complaint pending for only 1 day (should NOT escalate)
      freshComplaint = await Complaint.create({
        title: 'Projector Screen Smudge',
        description: 'Smudge on projector screen.',
        category: 'Electrical',
        priority: 'Low',
        location: 'Seminar Hall B',
        userId: studentUser._id,
        userName: studentUser.username,
        status: 'Pending',
        pendingSince: oneDayAgo,
        isEscalated: false,
      });

      // Complaint resolved 5 days ago (should NOT escalate)
      resolvedComplaint = await Complaint.create({
        title: 'Replaced Bulb',
        description: 'Already completed.',
        category: 'Electrical',
        priority: 'Low',
        location: 'Room 303',
        userId: studentUser._id,
        userName: studentUser.username,
        status: 'Resolved',
        pendingSince: fourDaysAgo,
        isEscalated: false,
      });
    });

    it('should escalate complaints pending >= 3 days, bump priority to High, and alert admin & student', async () => {
      const result = await escalationService.checkAndEscalateComplaints({ thresholdDays: 3 });

      expect(result.escalatedCount).toBe(1);
      expect(result.escalatedTickets).toContain(overdueComplaint.ticketNumber);

      // Verify complaint attributes in database
      const updated = await Complaint.findById(overdueComplaint._id);
      expect(updated.isEscalated).toBe(true);
      expect(updated.escalatedAt).toBeDefined();
      expect(updated.priority).toBe('High');

      // Verify Admin Notification was created
      const adminNotif = await Notification.findOne({
        recipient: adminUser._id,
        complaint: overdueComplaint._id,
        type: 'COMPLAINT_ESCALATION',
      });
      expect(adminNotif).not.toBeNull();

      // Verify Student Notification was created
      const studentNotif = await Notification.findOne({
        recipient: studentUser._id,
        complaint: overdueComplaint._id,
        type: 'COMPLAINT_ESCALATION',
      });
      expect(studentNotif).not.toBeNull();
    });

    it('should NOT escalate fresh pending complaint (< 3 days)', async () => {
      const fresh = await Complaint.findById(freshComplaint._id);
      expect(fresh.isEscalated).toBe(false);
      expect(fresh.priority).toBe('Low');
    });

    it('should NOT escalate resolved or closed complaints', async () => {
      const resolved = await Complaint.findById(resolvedComplaint._id);
      expect(resolved.isEscalated).toBe(false);
    });

    it('should NOT re-escalate an already escalated complaint in subsequent cycles', async () => {
      const secondCycle = await escalationService.checkAndEscalateComplaints({ thresholdDays: 3 });
      expect(secondCycle.escalatedCount).toBe(0);
    });
  });

  describe('Module D: Admin Flow Management & Security Access Control', () => {
    it('should allow admin to list all flows', async () => {
      const res = await request(app)
        .get('/api/flows')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
    });

    it('should FORBID student from listing flows (403)', async () => {
      const res = await request(app)
        .get('/api/flows')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow admin to toggle flow active state', async () => {
      const flow = await Flow.findOne({ trigger: 'COMPLAINT_PENDING_DURATION' });
      const originalState = flow.isActive;

      const toggleRes = await request(app)
        .patch(`/api/flows/${flow._id}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.isActive).toBe(!originalState);

      // Revert state
      await request(app)
        .patch(`/api/flows/${flow._id}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    it('should FORBID student from toggling flow state (403)', async () => {
      const flow = await Flow.findOne();
      const res = await request(app)
        .patch(`/api/flows/${flow._id}/toggle`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow admin to view execution history with pagination', async () => {
      const res = await request(app)
        .get('/api/flows/executions/history?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.executions)).toBe(true);
      expect(typeof res.body.total).toBe('number');
      expect(res.body.page).toBe(1);
    });

    it('should FORBID student from viewing execution history (403)', async () => {
      const res = await request(app)
        .get('/api/flows/executions/history')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow admin to trigger manual escalation cycle endpoint', async () => {
      const res = await request(app)
        .post('/api/flows/trigger-escalation-job')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ thresholdDays: 3 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
      expect(typeof res.body.escalatedCount).toBe('number');
    });

    it('should FORBID student from triggering escalation cycle (403)', async () => {
      const res = await request(app)
        .post('/api/flows/trigger-escalation-job')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ thresholdDays: 3 });

      expect(res.status).toBe(403);
    });
  });
});
