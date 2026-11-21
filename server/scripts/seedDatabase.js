const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Counter = require('../models/Counter');
const AuditLog = require('../models/AuditLog');
const Flow = require('../models/Flow');
const FlowExecution = require('../models/FlowExecution');
const Notification = require('../models/Notification');
const KnowledgeArticle = require('../models/KnowledgeArticle');

dotenv.config();

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('FATAL CONFIGURATION ERROR: MONGODB_URI environment variable is missing.');
      console.error('Please configure MONGODB_URI in your .env file before running seed script.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log('Connected to MongoDB for database seeding');

    // Clear existing data
    await User.deleteMany({});
    await Complaint.deleteMany({});
    await Counter.deleteMany({});
    await AuditLog.deleteMany({});
    await Flow.deleteMany({});
    await FlowExecution.deleteMany({});
    await Notification.deleteMany({});
    await KnowledgeArticle.deleteMany({});
    console.log('Cleared existing data');

    // Initialize ticket counter
    await Counter.create({ _id: 'ticketNumber', seq: 0 });

    // Create demo users
    const users = await User.create([
      {
        username: 'admin',
        email: 'admin@college.edu',
        password: 'admin123',
        role: 'admin',
      },
      {
        username: 'admin_sarah',
        email: 'sarah.admin@college.edu',
        password: 'admin123',
        role: 'admin',
      },
      {
        username: 'student',
        email: 'student@college.edu',
        password: 'student123',
        role: 'student',
      },
      {
        username: 'john_doe',
        email: 'john@college.edu',
        password: 'john123',
        role: 'student',
      },
    ]);
    console.log(`Created ${users.length} demo users`);

    const adminUser = users[0];
    const sarahAdmin = users[1];
    const studentUser = users[2];
    const johnUser = users[3];

    // Seed Default Flows
    const seededFlows = await Flow.create([
      {
        name: 'Complaint Creation Acknowledgement',
        description: 'Sends an instant notification receipt to the student when a new complaint is filed.',
        trigger: 'COMPLAINT_CREATED',
        conditions: [],
        actions: [
          {
            type: 'SEND_NOTIFICATION',
            params: {
              recipientTarget: 'STUDENT',
              title: 'Complaint Logged Successfully',
              message: 'Your complaint #{ticketNumber} ("{title}") has been received and logged into our system.',
              type: 'ACKNOWLEDGEMENT',
            },
          },
        ],
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        name: 'Complaint Status Update Notification',
        description: 'Notifies student immediately whenever ticket status changes (In Progress, Resolved, Closed).',
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
      },
      {
        name: 'Pending Complaint Escalation',
        description: 'Automatically escalates complaints that stay pending for >= 3 days to High priority and alerts admins.',
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
            params: {
              priority: 'High',
            },
          },
          {
            type: 'ESCALATE_COMPLAINT',
            params: {},
          },
          {
            type: 'SEND_NOTIFICATION',
            params: {
              recipientTarget: 'ADMIN',
              title: 'Pending Complaint Auto-Escalated',
              message: 'ALERT: Complaint #{ticketNumber} has been pending for >= 3 days. Priority escalated to High.',
              type: 'COMPLAINT_ESCALATION',
            },
          },
          {
            type: 'SEND_NOTIFICATION',
            params: {
              recipientTarget: 'STUDENT',
              title: 'Complaint Escalation Notice',
              message: 'Notice: Your pending complaint #{ticketNumber} has been auto-escalated to High priority for administrative review.',
              type: 'COMPLAINT_ESCALATION',
            },
          },
        ],
        isActive: true,
        createdBy: adminUser._id,
      },
    ]);
    console.log(`Created ${seededFlows.length} default flows`);

    // Four days ago date for pending escalation demo
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

    // Create demo complaints with Phase 1 & Phase 2 ticket attributes
    const complaints = await Complaint.create([
      {
        title: 'Broken Light in Room 101',
        description: 'The light bulb in room 101 is flickering and completely off, creating safety issues.',
        category: 'Electrical',
        priority: 'High',
        location: 'Academic Block A - Room 101',
        userId: studentUser._id,
        userName: studentUser.username,
        status: 'In Progress',
        assignedTo: adminUser._id,
        assignedToName: adminUser.username,
        upvotes: 3,
        upvotedBy: [johnUser._id],
        adminResponse: 'Electrician scheduled to replace fixtures this afternoon.',
        workNotes: [
          {
            note: 'Vendor notified for replacement ballast and LED tubes.',
            authorId: adminUser._id,
            authorName: adminUser.username,
            createdAt: new Date(Date.now() - 3600000 * 5),
          },
        ],
      },
      {
        title: 'Leaky Tap in 2nd Floor Washroom',
        description: 'There is a continuous high-volume leak from the tap in the 2nd-floor washroom.',
        category: 'Plumbing',
        priority: 'Critical',
        location: 'Hostel Block B - 2nd Floor Washroom',
        userId: johnUser._id,
        userName: johnUser.username,
        status: 'In Progress',
        assignedTo: sarahAdmin._id,
        assignedToName: sarahAdmin.username,
        upvotes: 6,
        upvotedBy: [studentUser._id, johnUser._id],
        adminResponse: 'Main valve shut off temporarily. Plumber on site.',
        workNotes: [
          {
            note: 'Water supply isolated to prevent floor flooding.',
            authorId: sarahAdmin._id,
            authorName: sarahAdmin.username,
            createdAt: new Date(Date.now() - 3600000 * 2),
          },
        ],
      },
      {
        title: 'Broken Window Latch',
        description: 'The window latch in the common reading room is loose and bangs in the wind.',
        category: 'Window',
        priority: 'Medium',
        location: 'Library - Common Reading Hall',
        userId: studentUser._id,
        userName: studentUser.username,
        status: 'Resolved',
        resolvedAt: new Date(Date.now() - 3600000 * 20),
        createdAt: new Date(Date.now() - 3600000 * 48),
        assignedTo: adminUser._id,
        assignedToName: adminUser.username,
        upvotes: 2,
        upvotedBy: [],
        adminResponse: 'Window latch repaired and lock tested.',
        workNotes: [
          {
            note: 'Replaced screws and aligned latch plate.',
            authorId: adminUser._id,
            authorName: adminUser.username,
            createdAt: new Date(Date.now() - 86400000),
          },
        ],
      },
      {
        title: 'Water Cooler Compressor Fault',
        description: 'Water cooler in Block C has not been dispensing cold water and is making a humming sound.',
        category: 'Appliance',
        priority: 'Low',
        location: 'Hostel Block C - Ground Floor',
        userId: studentUser._id,
        userName: studentUser.username,
        status: 'Pending',
        pendingSince: fourDaysAgo,
        isEscalated: false,
        upvotes: 1,
        upvotedBy: [],
        adminResponse: '',
        workNotes: [],
      },
    ]);
    console.log(`Created ${complaints.length} demo complaints`);

    // Create initial notifications
    await Notification.create([
      {
        recipient: studentUser._id,
        recipientRole: 'student',
        title: 'Complaint Status Updated',
        message: `The status of your ticket #${complaints[2].ticketNumber} has been updated to "Resolved".`,
        type: 'STATUS_UPDATE',
        complaint: complaints[2]._id,
        ticketNumber: complaints[2].ticketNumber,
        isRead: false,
      },
      {
        recipient: studentUser._id,
        recipientRole: 'student',
        title: 'Complaint Acknowledged',
        message: `Your complaint #${complaints[0].ticketNumber} ("${complaints[0].title}") has been received and logged into our system.`,
        type: 'ACKNOWLEDGEMENT',
        complaint: complaints[0]._id,
        ticketNumber: complaints[0].ticketNumber,
        isRead: true,
        readAt: new Date(Date.now() - 3600000 * 4),
      },
      {
        recipient: adminUser._id,
        recipientRole: 'admin',
        title: 'Complaint Assigned',
        message: `You have been assigned to handle ticket #${complaints[0].ticketNumber}.`,
        type: 'SYSTEM_ALERT',
        complaint: complaints[0]._id,
        ticketNumber: complaints[0].ticketNumber,
        isRead: false,
      },
    ]);
    console.log('Created sample notifications');

    // Seed Knowledge Base Articles
    const articles = await KnowledgeArticle.create([
      {
        title: 'Campus Wi-Fi Setup & Authentication Troubleshooting Guide',
        content: `### Connecting to Campus Wi-Fi\n\n1. Select SSID "Campus_Secure_5G" or "Campus_Hostel_Wi-Fi".\n2. In the authentication prompt, select EAP Method PEAP and Phase 2 Authentication MSCHAPv2.\n3. Enter your student roll number as identity and your college portal password.\n4. If prompted for a CA Certificate, select "Do Not Validate" or install the college root certificate from the intranet portal.\n\n### Common Issues & Quick Fixes\n- IP Configuration Failure: Turn device Wi-Fi off for 10 seconds, then reconnect.\n- Authentication Error: Ensure your portal account is not locked due to multiple wrong password entries.\n- If signal is weak or access point is rebooting, please submit an Electrical / IT ticket with your room number.`,
        category: 'Wi-Fi & IT',
        tags: ['wifi', 'network', 'internet', 'troubleshooting'],
        status: 'Published',
        author: adminUser._id,
        authorName: adminUser.username,
        views: 42,
        helpfulCount: 15,
        helpfulUsers: [studentUser._id],
        createdAt: new Date(Date.now() - 3600000 * 48),
      },
      {
        title: 'Electrical Safety & Reporting Power Outages',
        content: `### Reporting Electrical Issues\n\n- In case of spark, smoke, or burning odor from wall sockets, immediately switch off the room sub-circuit breaker located in your corridor panel.\n- Do not use heavy electrical appliances (immersion water heaters, hot plates, high-wattage induction stoves) in hostel dorm rooms as they overload the 5A circuits.\n- For tube light replacements and switchboard faults, submit a ticket under the Electrical category specifying your block, wing, and room number.\n- Urgent emergency hotline: Dial campus intercom extension 108 for 24/7 electrician dispatch.`,
        category: 'Electrical',
        tags: ['electrical', 'power', 'safety', 'lights'],
        status: 'Published',
        author: adminUser._id,
        authorName: adminUser.username,
        views: 29,
        helpfulCount: 8,
        helpfulUsers: [johnUser._id],
        createdAt: new Date(Date.now() - 3600000 * 36),
      },
      {
        title: 'Hostel Plumbing & Water Supply Guidelines',
        content: `### Water Timings & Maintenance Schedules\n\n- Morning water supply: 06:00 AM – 10:00 AM\n- Evening water supply: 05:00 PM – 09:00 PM\n- Continuous RO drinking water is available 24/7 at corridor dispensaries.\n\n### How to Report Leaks\n1. If a tap or flush tank is running continuously, close the angular stop-cock valve located beneath the basin.\n2. Submit a ticket under Plumbing with a photo of the leak.\n3. Plumbing staff inspect corridors daily at 11:00 AM and 04:00 PM.`,
        category: 'Plumbing',
        tags: ['plumbing', 'water', 'leak', 'washroom'],
        status: 'Published',
        author: sarahAdmin._id,
        authorName: sarahAdmin.username,
        views: 18,
        helpfulCount: 5,
        helpfulUsers: [],
        createdAt: new Date(Date.now() - 3600000 * 24),
      },
      {
        title: 'Mess Committee Escalation Matrix & Food Quality Feedback',
        content: `### Food Safety & Feedback Process\n\n- Weekly mess menus are finalized on Friday evenings by the student-elected Mess Committee.\n- In case of immediate concerns regarding food quality, hygiene, or dining hall cleanliness, notify the mess supervisor on duty before leaving the hall.\n- Formal grievances can be filed under the Mess & Dining category. Complaints with more than 5 student upvotes are automatically escalated to the Warden's council.`,
        category: 'Mess & Dining',
        tags: ['mess', 'food', 'dining', 'hygiene'],
        status: 'Published',
        author: sarahAdmin._id,
        authorName: sarahAdmin.username,
        views: 35,
        helpfulCount: 12,
        helpfulUsers: [studentUser._id, johnUser._id],
        createdAt: new Date(Date.now() - 3600000 * 12),
      },
      {
        title: 'Draft Energy Conservation Policy for Academic Blocks',
        content: `This is a draft policy outlining temperature standards for air conditioning units across Lecture Theatres and Computer Labs. All AC thermostats will be standardized to 24°C during operational hours (08:00 AM – 06:00 PM). Feedback from department heads is currently under review.`,
        category: 'General',
        tags: ['draft', 'energy', 'policy', 'ac'],
        status: 'Draft',
        author: adminUser._id,
        authorName: adminUser.username,
        views: 3,
        helpfulCount: 0,
        helpfulUsers: [],
        createdAt: new Date(Date.now() - 3600000 * 2),
      },
    ]);
    console.log(`Created ${articles.length} sample knowledge base articles`);

    // Create initial audit log entries
    await AuditLog.create([
      {
        user: studentUser._id,
        username: studentUser.username,
        role: 'student',
        action: 'COMPLAINT_CREATED',
        entityType: 'Complaint',
        entityId: complaints[0]._id,
        details: { ticketNumber: complaints[0].ticketNumber, title: complaints[0].title, priority: complaints[0].priority },
        timestamp: new Date(Date.now() - 3600000 * 6),
      },
      {
        user: adminUser._id,
        username: adminUser.username,
        role: 'admin',
        action: 'COMPLAINT_ASSIGNED',
        entityType: 'Complaint',
        entityId: complaints[0]._id,
        details: { ticketNumber: complaints[0].ticketNumber, assignedToName: adminUser.username },
        timestamp: new Date(Date.now() - 3600000 * 4),
      },
      {
        user: adminUser._id,
        username: adminUser.username,
        role: 'admin',
        action: 'WORK_NOTE_ADDED',
        entityType: 'Complaint',
        entityId: complaints[0]._id,
        details: { ticketNumber: complaints[0].ticketNumber, authorName: adminUser.username },
        timestamp: new Date(Date.now() - 3600000 * 3),
      },
      {
        user: sarahAdmin._id,
        username: sarahAdmin.username,
        role: 'admin',
        action: 'COMPLAINT_STATUS_UPDATED',
        entityType: 'Complaint',
        entityId: complaints[1]._id,
        details: { ticketNumber: complaints[1].ticketNumber, oldStatus: 'Submitted', newStatus: 'In Progress' },
        timestamp: new Date(Date.now() - 3600000 * 1),
      },
    ]);
    console.log('Seeded initial audit logs');

    console.log('\nDatabase seeding completed successfully!');
    console.log('\nDemo Credentials:');
    console.log('- Admin 1: username=admin, password=admin123');
    console.log('- Admin 2: username=admin_sarah, password=admin123');
    console.log('- Student 1: username=student, password=student123');
    console.log('- Student 2: username=john_doe, password=john123');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
