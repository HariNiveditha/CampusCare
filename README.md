
# College Complaint Redressal & Ticket Management System
## Phase 1, Phase 2, Phase 3 & Phase 4: Reports, Analytics & Executive Dashboards

A modernized, enterprise-grade Complaint Management and Service Operations Workspace inspired by ServiceNow architecture. Built with React 18, Node.js, Express, MongoDB, secure JWT authentication, role-based access control, persistent multipart photo uploads, atomic sequential ticket generation, administrative work notes, immutable audit logs, a configurable Flow Engine, real-time notification bells, automated SLA escalation, a self-service Knowledge Base, and a comprehensive Reports & Analytics engine.

---

## 🏛️ 1. Project Architecture

The application is structured into decoupled frontend and backend layers with clear separation of concerns:

```
├── public/                     # Static assets and index.html
├── src/                        # Frontend React 18 Application
│   ├── api/                    # Axios API client (auth, complaints, audit, flows, notifications, KB, analytics)
│   ├── components/             # React UI Components
│   │   ├── Login.js            # Authentication & Registration view
│   │   ├── StudentDashboard.js # Student ticket submission, community board, notification bell & KB portal
│   │   ├── AdminDashboard.js   # Service operations workspace: tickets, audit trail, flows, KB & analytics
│   │   ├── ComplaintCard.js    # Structured ticket card with RBAC controls and badges
│   │   ├── ComplaintForm.js    # Multipart ticket form with photo upload & validation
│   │   ├── NotificationBell.js # Dropdown notification drawer with live unread badge & mark-as-read
│   │   ├── FlowManagement.js   # Flow engine orchestration: active toggles, metrics, execution history
│   │   ├── KnowledgeBaseAdmin.js   # Admin KB manager: metrics, create/edit modals, publish toggle
│   │   ├── KnowledgeBaseStudent.js # Student help center: search, category filters, detail view, helpful voting
│   │   └── AnalyticsDashboard.js   # Executive reports & analytics: KPIs, SVG charts, SLA metrics, CSV & print
│   ├── context/                # Global React Context (ComplaintContext)
│   ├── App.js                  # Application entrypoint & session controller
│   └── App.css                 # Theme, UI styling & @media print styles
│
├── server/                     # Backend Node.js / Express Application
│   ├── config/                 # Configuration helpers (JWT validator)
│   ├── controllers/            # Business logic controllers
│   │   ├── authController.js         # Login, Register, Admin lookups
│   │   ├── complaintController.js    # CRUD, priority, assign, notes, sanitization, flow triggers
│   │   ├── auditLogController.js     # Audit log retrieval (admin only)
│   │   ├── notificationController.js # User-isolated notifications, unread count, read states
│   │   ├── flowController.js         # Flow definitions, toggling, execution history, escalation trigger
│   │   ├── knowledgeBaseController.js# KB articles CRUD, search, helpful votes, publish toggling
│   │   └── analyticsController.js    # KPI aggregations, distributions, trends, SLA velocity, CSV export
│   ├── jobs/                   # Background Scheduled Jobs
│   │   └── escalationJob.js    # node-cron scheduled background job checking pending complaint SLAs
│   ├── middleware/             # Express middleware
│   │   ├── auth.js             # JWT verifyToken, authorizeRoles, RBAC
│   │   └── upload.js           # Multer image upload with MIME & size validation
│   ├── models/                 # Mongoose Models
│   │   ├── User.js             # User schema with bcrypt password hashing
│   │   ├── Complaint.js        # Ticket schema with sequential generator, work notes, escalation & resolvedAt
│   │   ├── Counter.js          # Atomic sequence counter for concurrency safety
│   │   ├── AuditLog.js         # Immutable security and operations audit trail
│   │   ├── Flow.js             # Configurable workflow model (trigger, conditions, actions, isActive)
│   │   ├── FlowExecution.js    # Execution log audit recording status, actions, and errors
│   │   ├── Notification.js     # Persistent user notification schema
│   │   └── KnowledgeArticle.js # Knowledge base article model with views, helpful votes & tags
│   ├── routes/                 # REST API Routes
│   │   ├── auth.js             # /api/auth endpoints
│   │   ├── complaints.js       # /api/complaints endpoints
│   │   ├── auditLogs.js        # /api/audit-logs endpoints
│   │   ├── notifications.js    # /api/notifications endpoints
│   │   ├── flows.js            # /api/flows endpoints
│   │   ├── knowledgeBase.js    # /api/knowledge-base endpoints
│   │   └── analytics.js        # /api/analytics endpoints (admin-only)
│   ├── services/               # Modular Business Logic Services
│   │   ├── flowEngine.js       # Trigger evaluation, condition checking, action executor
│   │   ├── notificationService.js # Notification creation, dispatching, and broadcast alerts
│   │   └── escalationService.js # SLA detection for pending complaints >= 3 days
│   ├── scripts/                # Database utility scripts
│   │   ├── seedDatabase.js     # Environment-driven seeder with default flows, demo tickets & KB articles
│   │   └── migrateData.js      # Legacy data schema migration script
│   ├── tests/                  # Jest & Supertest automated test suite
│   │   ├── setup.js            # Test database lifecycle setup
│   │   ├── phase1.test.js      # Full 32-test Phase 1 specification suite
│   │   ├── phase2.test.js      # Full 22-test Phase 2 Flow Engine & Notifications suite
│   │   ├── phase3.test.js      # Full 22-test Phase 3 Knowledge Base Management suite
│   │   └── phase4.test.js      # Full 14-test Phase 4 Reports & Analytics suite
│   ├── uploads/                # Local static directory for complaint attachments
│   ├── server.js               # Express application setup, routes, static server, and cron starter
│   └── package.json            # Backend dependencies & npm scripts
```

---

## 📊 2. Phase 4 Features: Reports & Analytics Engine

### 1. Executive Analytics Dashboard (`src/components/AnalyticsDashboard.js`)
Dedicated **"📊 Reports & Analytics"** tab in the Administrator Workspace providing an executive overview of facilities operations:
- **7 Dynamic KPI Cards**: Total Filed, Submitted, In Progress, Pending, Resolved, Closed, and Overdue (SLA breaches). All computed live from MongoDB records.
- **Overdue SLA Definition**:
  - Unresolved tickets (`status !== 'Resolved' && status !== 'Closed'`).
  - Either marked `isEscalated: true` OR exceeding priority resolution thresholds:
    - Critical: $> 24$ hours
    - High: $> 48$ hours
    - Medium / Low: $> 72$ hours (3 days)
    - Pending: $> 72$ hours

### 2. Interactive SVG Visualizations (Module 2)
Zero-dependency, pure SVG visual charts styled to match the campus theme:
1. **Complaints by Status**: Interactive Donut chart with circumference arcs, hover slice expansion, center count, and interactive legend with percentages.
2. **Complaints by Priority**: Color-coded Bar chart (Low=Green, Medium=Blue, High=Orange, Critical=Red) with hover value tooltips.
3. **Complaints by Facility Category**: Bar chart showing volume by facility category with counts and percentages.
4. **Monthly Volume & Resolution Trends**: Dual line trend chart plotting total complaints filed versus resolved over time with data points, gridlines, and hover info.

### 3. Resolution Performance & SLA Velocity (Module 3)
- **Mean Resolution Velocity Formula**:
  $$\text{Average Resolution Duration} = \frac{\sum (\text{resolvedAt} - \text{createdAt})}{\text{Count}(\text{resolved complaints})}$$
  *(Unresolved complaints are strictly excluded; missing dates are never fabricated).*
- **Resolution Percentage**: Calculated as $(\text{Resolved} / \text{Total}) \times 100$.
- **Category Resolution Breakdown**: Category-by-category average turnaround hours and ticket volumes.
- **Administrator Operational Matrix**: Table showing assigned load, in-progress count, pending count, resolved count, resolution success rate (%), and individual average resolution hours per administrator.

### 4. Interactive Multidimensional Filtering (Module 4)
- **Date Range**: `From Date` and `To Date` inputs.
- **Category**: All or specific facility categories.
- **Priority**: All, Low, Medium, High, Critical.
- **Status**: All, Submitted, Pending, In Progress, Resolved, Closed.
- **Assigned Administrator**: All, Unassigned, or individual staff members.
- **Live Indicator**: Displays count of currently active filters with a one-click **"Reset All Filters"** button.
- All KPI cards, charts, resolution statistics, and exports dynamically reflect selected filters simultaneously.

### 5. Report Generation & Export (Module 5)
- **CSV Export (`GET /api/analytics/export`)**: Downloads an official RFC-compliant CSV report containing ticket number, title, category, priority, status, location, author, assigned admin, and timestamps.
- **Audit Logging**: Export actions are automatically recorded in the immutable `AuditLog` collection (`action: 'ANALYTICS_REPORT_EXPORTED'`).
- **Print / Save PDF**: Print-optimized stylesheet (`@media print`) rendering a clean executive report layout with header, metadata, summary statistics, and tables while omitting navigation bars and action buttons.

---

## ⚡ 3. Preserved Phase 1, Phase 2 & Phase 3 Foundations

- **Phase 1**: Secure JWT auth (no fallbacks), role-based middleware (`student`, `admin`), atomic ticket sequence numbering (`CMP0001`...), internal work notes (shielded from students), multipart image persistence (JPEG/PNG/WEBP, 5MB max), and immutable audit trail.
- **Phase 2**: Configurable Flow Engine (`COMPLAINT_CREATED`, `COMPLAINT_STATUS_CHANGED`, `COMPLAINT_PENDING_DURATION`), default automated workflows, interactive header Notification Bell with unread count badge, and automated 3-day SLA escalation background cron job (`node-cron`).
- **Phase 3**: Knowledge Base Management with full-text search, category filters, interactive helpful voting, draft/publish lifecycle toggling, and article reading modals.

---

## 🔑 4. Demo Accounts (Safe Test Credentials)

| Role | Username | Password | Email | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | `admin@college.edu` | Full operations workspace, reports & analytics, flow engine, knowledge base manager, assignments, audit logs |
| **Admin** | `admin_sarah` | `admin123` | `sarah.admin@college.edu` | Operations administrator |
| **Student** | `student` | `student123` | `student@college.edu` | Knowledge Base portal, submit tickets with photos/location, view own tickets, receive automated notifications |
| **Student** | `john_doe` | `john123` | `john@college.edu` | Student account |

---

## ⚙️ 5. Installation & Execution

### Step 1: Install Dependencies
```bash
npm install
npm --prefix server install
```

### Step 2: Seed Database
Populates users, sample complaints with resolution timestamps, default flows, notifications, and knowledge base articles:
```bash
npm --prefix server run seed
```

### Step 3: Run the Application
```bash
# Terminal 1: Backend Server (Port 5000)
npm --prefix server start

# Terminal 2: Frontend Application (Port 3000)
npm start
```

---

## 🧪 6. Automated Testing (90 Tests, 100% Passing)

Run the full automated test suite containing Phase 1, Phase 2, Phase 3, and Phase 4 tests:

```bash
npm --prefix server test
```

### Complete Test Suite Breakdown:
- **Phase 1 Test Suite (`tests/phase1.test.js`)**: 32 Tests
  - Module 2: Secure JWT Configuration (3 tests)
  - Module 3: Authentication & Middleware (6 tests)
  - Module 4: Role-Based Access Control (8 tests)
  - Module 1 & 5: Location, Photo & Structured Tickets (8 tests)
  - Module 6: Audit Logging Trail (7 tests)
- **Phase 2 Test Suite (`tests/phase2.test.js`)**: 22 Tests
  - Module A: Flow Engine Triggers & Executions (5 tests)
  - Module B: Notification Management & Permissions (5 tests)
  - Module C: Automated SLA Escalation Engine (4 tests)
  - Module D: Admin Flow Management & Security (8 tests)
- **Phase 3 Test Suite (`tests/phase3.test.js`)**: 22 Tests
  - Module 1: Article Creation & RBAC (4 tests)
  - Module 2: Article Retrieval & Restrictions (6 tests)
  - Module 3: Search Functionality (3 tests)
  - Module 4: Helpful Vote Functionality (3 tests)
  - Module 5: Article Management (6 tests)
- **Phase 4 Test Suite (`tests/phase4.test.js`)**: 14 Tests
  - Module 1: Admin Overview KPIs (3 tests: dynamic KPI calculation, category filter, student 403)
  - Module 2: Status & Priority Aggregations (3 tests: status percentages, priority distribution, student 403)
  - Module 3: Category & Monthly Trends (2 tests: category volumes, monthly trends aggregation)
  - Module 4: Resolution Performance & Admin Analytics (2 tests: resolution hours calculation, admin metrics)
  - Module 5: Filtering & Empty Dataset Handling (2 tests: date range filtering, empty dataset zero-division safety)
  - Module 6: CSV Export & Audit Logging (2 tests: CSV headers/MIME/disposition & audit log, student 403)

**Total**: **90 Passed, 0 Failed (100% Pass Rate)**.

---

## 📡 7. REST API Reference Summary

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new student account |
| `POST` | `/api/auth/login` | Public | Login and receive signed JWT |
| `GET` | `/api/auth/admins` | Admin | Retrieve administrator list |
| `POST` | `/api/complaints` | Student / Admin | Create complaint (fires `COMPLAINT_CREATED` flow) |
| `GET` | `/api/complaints` | Student / Admin | View complaints (work notes omitted for students) |
| `GET` | `/api/complaints/:id` | Student / Admin | View complaint by ID (sanitized) |
| `GET` | `/api/complaints/user/:userId` | Student / Admin | View complaints submitted by user |
| `PUT` | `/api/complaints/:id` | Admin Only | Update status (fires `COMPLAINT_STATUS_CHANGED` flow) |
| `PUT` | `/api/complaints/:id/priority` | Admin Only | Update complaint priority |
| `PUT` | `/api/complaints/:id/assign` | Admin Only | Assign complaint to administrator |
| `POST` | `/api/complaints/:id/work-notes` | Admin Only | Add internal work note |
| `POST` | `/api/complaints/:id/upvote` | Student / Admin | Toggle community upvote |
| `DELETE`| `/api/complaints/:id` | Admin Only | Delete complaint |
| `GET` | `/api/audit-logs` | Admin Only | Query immutable audit trail logs |
| `GET` | `/api/notifications` | Student / Admin | Get paginated user notifications |
| `GET` | `/api/notifications/unread-count` | Student / Admin | Get unread notification count |
| `PATCH` | `/api/notifications/:id/read` | Recipient Only | Mark single notification as read |
| `PATCH` | `/api/notifications/read-all` | Student / Admin | Mark all user notifications as read |
| `GET` | `/api/flows` | Admin Only | List configured workflow definitions |
| `GET` | `/api/flows/:id` | Admin Only | Get single flow definition |
| `PATCH` | `/api/flows/:id/toggle` | Admin Only | Toggle flow active/inactive state |
| `GET` | `/api/flows/executions/history` | Admin Only | View execution history trail |
| `POST` | `/api/flows/trigger-escalation-job` | Admin Only | Manually invoke SLA escalation cycle |
| `GET` | `/api/knowledge-base` | Student / Admin | List articles (students: published only; admins: all) |
| `GET` | `/api/knowledge-base/search` | Student / Admin | Search articles by keyword, category, or tags |
| `GET` | `/api/knowledge-base/:id` | Student / Admin | View article details & increment view count |
| `POST` | `/api/knowledge-base/:id/helpful` | Student / Admin | Mark article as helpful |
| `POST` | `/api/knowledge-base` | Admin Only | Create new knowledge base article |
| `PUT` | `/api/knowledge-base/:id` | Admin Only | Update knowledge base article |
| `PATCH` | `/api/knowledge-base/:id/status` | Admin Only | Publish or unpublish an article |
| `DELETE`| `/api/knowledge-base/:id` | Admin Only | Delete knowledge base article |
| `GET` | `/api/analytics/overview` | Admin Only | Overview KPI cards (total, statuses, overdue) |
| `GET` | `/api/analytics/status` | Admin Only | Distribution breakdown by status with percentages |
| `GET` | `/api/analytics/priority` | Admin Only | Distribution breakdown by priority with percentages |
| `GET` | `/api/analytics/category` | Admin Only | Distribution breakdown by category with percentages |
| `GET` | `/api/analytics/monthly-trends` | Admin Only | Aggregated monthly volume & resolution trends |
| `GET` | `/api/analytics/resolution-performance`| Admin Only | SLA turnaround velocity & category averages |
| `GET` | `/api/analytics/admin-performance` | Admin Only | Admin workload, resolution rates & average hours |
| `GET` | `/api/analytics/export` | Admin Only | Export filtered complaints as RFC-compliant CSV |

For complete request and response payload documentation, see [API_DOCUMENTATION.md](file:///c:/Users/siric/OneDrive/Desktop/EAD%20project/API_DOCUMENTATION.md).

# CampusCare
CampusCare is a web-based Campus Complaint Redressal System that enables students to raise and track complaints, while administrators manage requests, monitor resolution progress, and ensure timely issue resolution through role-based access and SLA tracking.
