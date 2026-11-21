const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const User = require('../models/User');
const KnowledgeArticle = require('../models/KnowledgeArticle');
const AuditLog = require('../models/AuditLog');

// Require test environment setup
require('./setup');

describe('PHASE 3: KNOWLEDGE BASE MANAGEMENT TEST SUITE', () => {
  let adminToken, studentToken, otherStudentToken;
  let adminUser, studentUser, otherStudentUser;
  let samplePublishedArticle, sampleDraftArticle;

  beforeAll(async () => {
    // Reset test database collections
    await User.deleteMany({});
    await KnowledgeArticle.deleteMany({});
    await AuditLog.deleteMany({});

    // Create test accounts
    adminUser = await User.create({
      username: 'kb_admin',
      email: 'kb_admin@college.edu',
      password: 'adminPassword123',
      role: 'admin',
    });

    studentUser = await User.create({
      username: 'kb_student',
      email: 'kb_student@college.edu',
      password: 'studentPassword123',
      role: 'student',
    });

    otherStudentUser = await User.create({
      username: 'kb_other_student',
      email: 'kb_other@college.edu',
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

    // Seed test articles
    samplePublishedArticle = await KnowledgeArticle.create({
      title: 'Hostel Wi-Fi Configuration Guide',
      content: 'Follow these steps to connect your laptop to campus Wi-Fi.',
      category: 'Wi-Fi & IT',
      tags: ['wifi', 'network', 'internet'],
      status: 'Published',
      author: adminUser._id,
      authorName: adminUser.username,
      views: 10,
      helpfulCount: 2,
    });

    sampleDraftArticle = await KnowledgeArticle.create({
      title: 'Draft Maintenance Protocol 2026',
      content: 'Confidential unpublished protocol under review by administration.',
      category: 'General',
      tags: ['draft_unique_tag', 'protocol'],
      status: 'Draft',
      author: adminUser._id,
      authorName: adminUser.username,
      views: 0,
      helpfulCount: 0,
    });
  });

  describe('Module 1: Article Creation & RBAC', () => {
    it('should allow admin to create a new knowledge article (status: Published)', async () => {
      const res = await request(app)
        .post('/api/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Emergency Power Backup Protocols',
          content: 'Details on diesel generators and laboratory uninterrupted power supply.',
          category: 'Electrical',
          tags: ['power', 'generator', 'backup'],
          status: 'Published',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Emergency Power Backup Protocols');
      expect(res.body.status).toBe('Published');
      expect(res.body.author).toBe(adminUser._id.toString());
      expect(res.body.tags).toEqual(expect.arrayContaining(['power', 'generator', 'backup']));

      // Verify audit log generated
      const audit = await AuditLog.findOne({
        action: 'ARTICLE_CREATED',
        entityId: res.body._id,
      });
      expect(audit).not.toBeNull();
      expect(audit.details.title).toBe('Emergency Power Backup Protocols');
    });

    it('should allow admin to create a draft knowledge article', async () => {
      const res = await request(app)
        .post('/api/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Upcoming Cafeteria Expansion Draft',
          content: 'Preliminary plans for seating in block D.',
          category: 'Mess & Dining',
          tags: ['cafeteria', 'expansion'],
          status: 'Draft',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('Draft');
    });

    it('should reject article creation with missing title or content (400)', async () => {
      const res = await request(app)
        .post('/api/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '',
          content: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/title is required/i);
    });

    it('should FORBID student from creating a knowledge article (403)', async () => {
      const res = await request(app)
        .post('/api/knowledge-base')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Unauthorized Article Submission',
          content: 'Student trying to post an article directly.',
          category: 'General',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Module 2: Article Retrieval & Access Restrictions', () => {
    it('should list published articles for student, strictly omitting draft articles', async () => {
      const res = await request(app)
        .get('/api/knowledge-base')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.articles)).toBe(true);
      expect(res.body.articles.length).toBeGreaterThanOrEqual(1);

      // Verify NO draft article is present in student response
      const hasDraft = res.body.articles.some((a) => a.status === 'Draft');
      expect(hasDraft).toBe(false);

      // Every returned article MUST be published
      res.body.articles.forEach((a) => {
        expect(a.status).toBe('Published');
      });
    });

    it('should allow admin to list all articles including drafts', async () => {
      const res = await request(app)
        .get('/api/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const statuses = res.body.articles.map((a) => a.status);
      expect(statuses).toContain('Published');
      expect(statuses).toContain('Draft');
    });

    it('should filter articles by category', async () => {
      const res = await request(app)
        .get('/api/knowledge-base?category=Wi-Fi%20%26%20IT')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      res.body.articles.forEach((a) => {
        expect(a.category).toBe('Wi-Fi & IT');
      });
    });

    it('should allow student to view a published article and increment views count', async () => {
      const initialViews = samplePublishedArticle.views;

      const res = await request(app)
        .get(`/api/knowledge-base/${samplePublishedArticle._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body._id.toString()).toBe(samplePublishedArticle._id.toString());
      expect(res.body.views).toBe(initialViews + 1);

      // Verify in DB
      const updatedInDb = await KnowledgeArticle.findById(samplePublishedArticle._id);
      expect(updatedInDb.views).toBe(initialViews + 1);
    });

    it('should FORBID student from viewing a draft article (403)', async () => {
      const res = await request(app)
        .get(`/api/knowledge-base/${sampleDraftArticle._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/draft articles are only accessible to administrators/i);
    });

    it('should allow admin to view a draft article', async () => {
      const res = await request(app)
        .get(`/api/knowledge-base/${sampleDraftArticle._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Draft');
    });
  });

  describe('Module 3: Article Search Functionality', () => {
    it('should search articles by keyword in title', async () => {
      const res = await request(app)
        .get('/api/knowledge-base/search?q=Wi-Fi')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].title).toContain('Wi-Fi');
    });

    it('should search articles by tag', async () => {
      const res = await request(app)
        .get('/api/knowledge-base/search?q=internet')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should ensure search results for students never contain draft articles', async () => {
      const res = await request(app)
        .get('/api/knowledge-base/search?q=draft_unique_tag')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      // 'draft_unique_tag' is in sampleDraftArticle, so student query must return 0 results
      expect(res.body.length).toBe(0);
    });
  });

  describe('Module 4: Helpful Vote Functionality', () => {
    it('should allow user to mark an article as helpful and increment helpfulCount', async () => {
      const initialCount = samplePublishedArticle.helpfulCount;

      const res = await request(app)
        .post(`/api/knowledge-base/${samplePublishedArticle._id}/helpful`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.helpfulCount).toBe(initialCount + 1);
      expect(res.body.hasUserVotedHelpful).toBe(true);

      const dbArticle = await KnowledgeArticle.findById(samplePublishedArticle._id);
      expect(dbArticle.helpfulCount).toBe(initialCount + 1);
    });

    it('should prevent duplicate helpful votes from the same user', async () => {
      // Second attempt by the same student
      const res = await request(app)
        .post(`/api/knowledge-base/${samplePublishedArticle._id}/helpful`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/already marked this article as helpful/i);
    });

    it('should allow another user to mark the same article as helpful', async () => {
      const current = await KnowledgeArticle.findById(samplePublishedArticle._id);
      const countBefore = current.helpfulCount;

      const res = await request(app)
        .post(`/api/knowledge-base/${samplePublishedArticle._id}/helpful`)
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.helpfulCount).toBe(countBefore + 1);
    });
  });

  describe('Module 5: Article Management (Update, Delete, Publish/Unpublish)', () => {
    let articleToModify;

    beforeEach(async () => {
      articleToModify = await KnowledgeArticle.create({
        title: 'Temporary Guidelines for Lab Equipment',
        content: 'Original content.',
        category: 'Academic',
        tags: ['lab', 'equipment'],
        status: 'Draft',
        author: adminUser._id,
        authorName: adminUser.username,
      });
    });

    it('should allow admin to update article details', async () => {
      const res = await request(app)
        .put(`/api/knowledge-base/${articleToModify._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Revised Guidelines for Lab Equipment',
          content: 'Updated protocol content with new rules.',
          category: 'Academic',
          tags: ['lab', 'equipment', 'safety'],
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Revised Guidelines for Lab Equipment');
      expect(res.body.tags).toContain('safety');

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'ARTICLE_UPDATED',
        entityId: articleToModify._id.toString(),
      });
      expect(audit).not.toBeNull();
    });

    it('should FORBID student from updating an article (403)', async () => {
      const res = await request(app)
        .put(`/api/knowledge-base/${articleToModify._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
    });

    it('should allow admin to publish and unpublish an article', async () => {
      // 1. Publish
      const pubRes = await request(app)
        .patch(`/api/knowledge-base/${articleToModify._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Published' });

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.status).toBe('Published');

      // Check audit log for ARTICLE_PUBLISHED
      const pubAudit = await AuditLog.findOne({
        action: 'ARTICLE_PUBLISHED',
        entityId: articleToModify._id.toString(),
      });
      expect(pubAudit).not.toBeNull();

      // 2. Unpublish (Draft)
      const unpubRes = await request(app)
        .patch(`/api/knowledge-base/${articleToModify._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Draft' });

      expect(unpubRes.status).toBe(200);
      expect(unpubRes.body.status).toBe('Draft');

      // Check audit log for ARTICLE_UNPUBLISHED
      const unpubAudit = await AuditLog.findOne({
        action: 'ARTICLE_UNPUBLISHED',
        entityId: articleToModify._id.toString(),
      });
      expect(unpubAudit).not.toBeNull();
    });

    it('should FORBID student from toggling article status (403)', async () => {
      const res = await request(app)
        .patch(`/api/knowledge-base/${articleToModify._id}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'Published' });

      expect(res.status).toBe(403);
    });

    it('should allow admin to delete an article', async () => {
      const res = await request(app)
        .delete(`/api/knowledge-base/${articleToModify._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted successfully/i);

      const exists = await KnowledgeArticle.findById(articleToModify._id);
      expect(exists).toBeNull();

      // Check audit log
      const audit = await AuditLog.findOne({
        action: 'ARTICLE_DELETED',
        entityId: articleToModify._id.toString(),
      });
      expect(audit).not.toBeNull();
    });

    it('should FORBID student from deleting an article (403)', async () => {
      const res = await request(app)
        .delete(`/api/knowledge-base/${articleToModify._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });
});
