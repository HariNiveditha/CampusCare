# API Documentation - Complaint Redressal & Ticket Management System (Phase 1)

All endpoints (except public authentication routes) require the following HTTP Header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Authentication APIs

### `POST /api/auth/register`
Create a new student user account.

- **Access**: Public
- **Request Body**:
```json
{
  "username": "student_user",
  "email": "student@college.edu",
  "password": "Password123",
  "confirmPassword": "Password123"
}
```
- **Responses**:
  - `201 Created`: User registered successfully, returns user object and JWT token.
  - `400 Bad Request`: Validation failure (passwords do not match, missing fields, or password < 6 characters).
  - `409 Conflict`: Username or email already registered.

### `POST /api/auth/login`
Authenticate existing user and issue JWT.

- **Access**: Public
- **Request Body**:
```json
{
  "username": "student_user",
  "password": "Password123"
}
```
- **Responses**:
  - `200 OK`: Returns authenticated user info, role, and signed JWT token.
  - `401 Unauthorized`: Invalid username or password.

### `GET /api/auth/admins`
Fetch active administrators list (for ticket assignment).

- **Access**: Admin Only
- **Responses**:
  - `200 OK`: Array of `{ _id, username, email }`.
  - `403 Forbidden`: Non-admin access attempt.

---

## 2. Ticket & Complaint APIs

### `POST /api/complaints`
Submit a new complaint ticket. Supports standard `application/json` or `multipart/form-data` with an image attachment.

- **Access**: Authenticated (Student / Admin)
- **Content-Type**: `multipart/form-data` or `application/json`
- **Fields**:
  - `title` (String, required): Brief title of the issue.
  - `description` (String, required): Detailed issue description.
  - `category` (String, required): e.g. "Electrical", "Plumbing", "Furniture", etc.
  - `location` (String, optional): Specific campus room, hostel, or wing.
  - `photo` (File, optional): Valid image (JPEG, PNG, GIF, WEBP, max 5MB).
- **Responses**:
  - `201 Created`: Returns created complaint object with unique `ticketNumber` (e.g. `CMP0001`), default priority, and status `Submitted`.
  - `400 Bad Request`: Missing required fields or unsupported image file.

### `GET /api/complaints`
Retrieve all complaints sorted by creation date descending.

- **Access**: Authenticated (Student / Admin)
- **Data Filtering**:
  - For **Admins**: Returns complete complaint documents including `workNotes`.
  - For **Students**: `workNotes` array is stripped to prevent unauthorized exposure of internal administrative logs.
- **Responses**:
  - `200 OK`: Array of complaint objects.

### `GET /api/complaints/:complaintId`
Fetch a single complaint by its ID.

- **Access**: Authenticated (Student / Admin)
- **Responses**:
  - `200 OK`: Complaint document (sanitized for students).
  - `404 Not Found`: Complaint ID does not exist.

### `GET /api/complaints/user/:userId`
Fetch complaints submitted by a specific user.

- **Access**: Authenticated
- **Access Rule**: Students may only query their own `userId`. Querying another student's `userId` yields `403 Forbidden`. Admins can query any `userId`.
- **Responses**:
  - `200 OK`: Array of user complaints.
  - `403 Forbidden`: Unauthorized user access.

### `PUT /api/complaints/:complaintId`
Update complaint status and public administrative response.

- **Access**: Admin Only
- **Request Body**:
```json
{
  "status": "In Progress",
  "adminResponse": "Technician dispatched to site."
}
```
- **Responses**:
  - `200 OK`: Updated complaint document.
  - `400 Bad Request`: Invalid status or missing status.
  - `403 Forbidden`: Access denied (non-admin).
  - `404 Not Found`: Complaint not found.

### `PUT /api/complaints/:complaintId/priority`
Update complaint priority. Also accepts `PATCH`.

- **Access**: Admin Only
- **Request Body**:
```json
{
  "priority": "Critical"
}
```
- **Valid Values**: `"Low"`, `"Medium"`, `"High"`, `"Critical"`
- **Responses**:
  - `200 OK`: Updated complaint document.
  - `400 Bad Request`: Invalid priority value.
  - `403 Forbidden`: Access denied (non-admin).

### `PUT /api/complaints/:complaintId/assign`
Assign or unassign a complaint to an administrator. Also accepts `PATCH`.

- **Access**: Admin Only
- **Request Body**:
```json
{
  "assignedTo": "60d0fe4f5311236168a109ca"
}
```
*(Pass `null` or empty string to unassign)*
- **Responses**:
  - `200 OK`: Updated complaint document.
  - `400 Bad Request`: Target user is not an active administrator.
  - `403 Forbidden`: Access denied (non-admin).

### `POST /api/complaints/:complaintId/work-notes`
Add an internal administrative work note.

- **Access**: Admin Only
- **Request Body**:
```json
{
  "note": "Replaced fuse. Checking capacitor stability."
}
```
- **Responses**:
  - `200 OK`: Updated complaint document with new work note.
  - `400 Bad Request`: Empty note content.
  - `403 Forbidden`: Access denied (non-admin).

### `POST /api/complaints/:complaintId/upvote`
Toggle upvote on a complaint to indicate community urgency.

- **Access**: Authenticated (Student / Admin)
- **Responses**:
  - `200 OK`: Updated complaint document with revised upvote count.

### `DELETE /api/complaints/:complaintId`
Delete a complaint ticket.

- **Access**: Admin Only
- **Responses**:
  - `200 OK`: `{ "message": "Complaint deleted successfully" }`.
  - `403 Forbidden`: Access denied (non-admin).

---

## 3. Audit Logging APIs

### `GET /api/audit-logs`
Retrieve paginated audit logs.

- **Access**: Admin Only
- **Query Parameters**:
  - `page` (Integer, default: 1): Page number.
  - `limit` (Integer, default: 20): Results per page.
  - `action` (String, optional): Filter by action (e.g. `COMPLAINT_CREATED`, `COMPLAINT_STATUS_UPDATED`, `COMPLAINT_ASSIGNED`).
  - `entityType` (String, optional): Filter by entity (e.g. `Complaint`, `User`).
- **Responses**:
  - `200 OK`:
  ```json
  {
    "logs": [
      {
        "_id": "60d0fe4f5311236168a109cb",
        "user": "60d0fe4f5311236168a109ca",
        "username": "admin",
        "role": "admin",
        "action": "COMPLAINT_PRIORITY_UPDATED",
        "entityType": "Complaint",
        "entityId": "60d0fe4f5311236168a109cc",
        "details": {
          "ticketNumber": "CMP0001",
          "oldPriority": "Medium",
          "newPriority": "Critical"
        },
        "timestamp": "2026-11-02T13:30:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "totalPages": 3
  }
  ```
  - `403 Forbidden`: Access denied (non-admin).


---

## 4. Notification Management APIs

All notifications are strictly user-isolated. Authenticated students receive acknowledgments and status updates for their own complaints. Administrators receive system and escalation alerts.

### `GET /api/notifications`
Retrieve paginated notifications for the authenticated user.

- **Access**: Authenticated (Student / Admin)
- **Query Parameters**:
  - `page` (Integer, default: 1): Page index.
  - `limit` (Integer, default: 20, max: 50): Number of notifications per page.
- **Responses**:
  - `200 OK`:
  ```json
  {
    "notifications": [
      {
        "_id": "6726229988bba10001",
        "recipient": "6726229988bba10002",
        "recipientRole": "student",
        "title": "Complaint Status Updated",
        "message": "The status of your ticket #CMP0001 has been updated to \"In Progress\".",
        "type": "STATUS_UPDATE",
        "ticketNumber": "CMP0001",
        "isRead": false,
        "createdAt": "2026-11-02T15:40:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1,
    "unreadCount": 1
  }
  ```

### `GET /api/notifications/unread-count`
Retrieve lightweight unread notification count (ideal for polling header badges).

- **Access**: Authenticated (Student / Admin)
- **Responses**:
  - `200 OK`: `{ "unreadCount": 3 }`

### `PATCH /api/notifications/:id/read`
Mark a specific notification as read.

- **Access**: Authenticated (Recipient only)
- **Responses**:
  - `200 OK`: Updated notification document (`isRead: true`, `readAt: <timestamp>`).
  - `403 Forbidden`: Attempting to mark another user's notification as read.
  - `404 Not Found`: Notification ID does not exist.

### `PATCH /api/notifications/read-all`
Mark all unread notifications belonging to the authenticated user as read.

- **Access**: Authenticated (Student / Admin)
- **Responses**:
  - `200 OK`:
  ```json
  {
    "message": "All notifications marked as read.",
    "modifiedCount": 3
  }
  ```

---

## 5. Flow Engine & Automation APIs

Workflow engine management endpoints for viewing automated rules, toggling flow execution states, inspecting execution history, and triggering SLA escalation checks.

### `GET /api/flows`
Retrieve all configured workflow definitions with real-time execution statistics.

- **Access**: Admin Only
- **Responses**:
  - `200 OK`:
  ```json
  [
    {
      "_id": "6726229988bba10010",
      "name": "Complaint Creation Acknowledgement",
      "description": "Sends an instant notification receipt to the student when a new complaint is filed.",
      "trigger": "COMPLAINT_CREATED",
      "conditions": [],
      "actions": [
        {
          "type": "SEND_NOTIFICATION",
          "params": {
            "recipientTarget": "STUDENT",
            "title": "Complaint Logged Successfully",
            "message": "Your complaint #{ticketNumber} (\"{title}\") has been received.",
            "type": "COMPLAINT_ACKNOWLEDGEMENT"
          }
        }
      ],
      "isActive": true,
      "stats": {
        "total": 12,
        "failed": 0
      }
    }
  ]
  ```
  - `403 Forbidden`: Non-admin access attempt.

### `GET /api/flows/:id`
Retrieve detailed configuration for a specific flow.

- **Access**: Admin Only
- **Responses**:
  - `200 OK`: Flow object.
  - `404 Not Found`: Flow ID not found.

### `PATCH /api/flows/:id/toggle`
Toggle a flow between Active (`true`) and Inactive (`false`). Inactive flows are safely skipped by the engine.

- **Access**: Admin Only
- **Responses**:
  - `200 OK`:
  ```json
  {
    "_id": "6726229988bba10010",
    "name": "Pending Complaint Escalation",
    "isActive": false,
    "message": "Flow \"Pending Complaint Escalation\" is now Inactive"
  }
  ```
  - `403 Forbidden`: Non-admin access attempt.

### `GET /api/flows/executions/history`
Retrieve execution history and audit logs of all automated trigger runs.

- **Access**: Admin Only
- **Query Parameters**:
  - `page` (Integer, default: 1): Page number.
  - `limit` (Integer, default: 20): Items per page.
- **Responses**:
  - `200 OK`:
  ```json
  {
    "executions": [
      {
        "_id": "6726229988bba10020",
        "flowName": "Pending Complaint Escalation",
        "trigger": "COMPLAINT_PENDING_DURATION",
        "ticketNumber": "CMP0004",
        "executionStatus": "SUCCESS",
        "executedActions": [
          { "type": "UPDATE_PRIORITY", "status": "SUCCESS" },
          { "type": "ESCALATE_COMPLAINT", "status": "SUCCESS" }
        ],
        "startedAt": "2026-11-02T15:42:00.000Z",
        "completedAt": "2026-11-02T15:42:00.080Z"
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1
  }
  ```
  - `403 Forbidden`: Non-admin access attempt.

### `POST /api/flows/trigger-escalation-job`
Manually trigger an SLA escalation cycle. Checks for complaints that have been in `Pending` status for $\ge 3$ days, updates priority to `High`, flags them as escalated, and dispatches alerts to administrators and students.

- **Access**: Admin Only
- **Request Body** *(Optional)*:
  ```json
  {
    "thresholdDays": 3
  }
  ```
- **Responses**:
  - `200 OK`:
  ```json
  {
    "message": "Escalation cycle completed",
    "status": "COMPLETED",
    "escalatedCount": 1,
    "checkedCount": 2,
    "escalatedTickets": ["CMP0004"]
  }
  ```
  - `403 Forbidden`: Non-admin access attempt.


---

## 6. Knowledge Base Management APIs

Provides self-service guidance, FAQs, and troubleshooting articles. Students can search and read published articles and mark them helpful. Administrators have full content lifecycle management (Draft/Publish states, editing, deletion, and metrics tracking).

### `GET /api/knowledge-base`
List knowledge base articles.

- **Access**: Authenticated (Student / Admin)
- **Role Enforcement**:
  - **Students**: Only receive articles where `status === "Published"`. Draft articles are strictly omitted.
  - **Admins**: Can retrieve both `Published` and `Draft` articles.
- **Query Parameters**:
  - `category` (String, optional): Filter by category (e.g. `Wi-Fi & IT`, `Electrical`, `Plumbing`, `Mess & Dining`).
  - `status` (String, optional, Admin only): Filter by `Draft` or `Published`.
  - `page` (Integer, default: 1): Page index.
  - `limit` (Integer, default: 20): Articles per page.
- **Responses**:
  - `200 OK`:
  ```json
  {
    "articles": [
      {
        "_id": "6726229988bba10030",
        "title": "Campus Wi-Fi Setup & Authentication Troubleshooting Guide",
        "content": "Follow these steps to connect your laptop to campus Wi-Fi...",
        "category": "Wi-Fi & IT",
        "tags": ["wifi", "network", "internet"],
        "status": "Published",
        "author": { "_id": "6726229988bba10001", "username": "admin", "email": "admin@college.edu" },
        "authorName": "admin",
        "views": 42,
        "helpfulCount": 15,
        "createdAt": "2026-11-02T12:00:00.000Z",
        "updatedAt": "2026-11-02T12:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1
  }
  ```

### `GET /api/knowledge-base/search`
Search articles by keyword across title, content, category, or tags.

- **Access**: Authenticated (Student / Admin)
- **Query Parameters**:
  - `q` (String, optional): Search keyword.
  - `category` (String, optional): Category filter.
- **Responses**:
  - `200 OK`: Array of matching article objects sorted by helpfulness and views. Students only receive published articles.

### `GET /api/knowledge-base/:id`
Retrieve an individual knowledge article by its ID. Increments the `views` counter by 1.

- **Access**: Authenticated (Student / Admin)
- **Responses**:
  - `200 OK`: Complete article object with `hasUserVotedHelpful` boolean flag.
  - `403 Forbidden`: Student attempting to access a `Draft` article.
  - `404 Not Found`: Article ID does not exist.

### `POST /api/knowledge-base/:id/helpful`
Mark a knowledge article as helpful.

- **Access**: Authenticated (Student / Admin)
- **Responses**:
  - `200 OK`:
  ```json
  {
    "message": "Article marked as helpful.",
    "helpfulCount": 16,
    "hasUserVotedHelpful": true
  }
  ```
  *(Duplicate requests from the same user return the existing helpful count without double-counting).*
  - `403 Forbidden`: Attempting to vote on a `Draft` article.
  - `404 Not Found`: Article does not exist.

### `POST /api/knowledge-base`
Create a new knowledge base article. Generates an `ARTICLE_CREATED` audit log entry.

- **Access**: Admin Only
- **Request Body**:
  ```json
  {
    "title": "Laboratory Power Backup & Diesel Generator Schedules",
    "content": "Official protocol for power backup during scheduled grid maintenance...",
    "category": "Electrical",
    "tags": ["power", "backup", "lab"],
    "status": "Published"
  }
  ```
- **Responses**:
  - `201 Created`: Created article object.
  - `400 Bad Request`: Missing required title or content.
  - `403 Forbidden`: Non-admin access attempt.

### `PUT /api/knowledge-base/:id`
Update an existing knowledge article. Generates an `ARTICLE_UPDATED` audit log entry.

- **Access**: Admin Only
- **Request Body**: Fields to update (`title`, `content`, `category`, `tags`, `status`).
- **Responses**:
  - `200 OK`: Updated article object.
  - `403 Forbidden`: Non-admin access attempt.
  - `404 Not Found`: Article ID not found.

### `PATCH /api/knowledge-base/:id/status`
Publish or unpublish an article. Generates `ARTICLE_PUBLISHED` or `ARTICLE_UNPUBLISHED` audit log.

- **Access**: Admin Only
- **Request Body**:
  ```json
  {
    "status": "Published"
  }
  ```
  *(Pass `"Published"` or `"Draft"`)*
- **Responses**:
  - `200 OK`: Updated status and article document.
  - `403 Forbidden`: Non-admin access attempt.

### `DELETE /api/knowledge-base/:id`
Delete an article permanently. Generates an `ARTICLE_DELETED` audit log entry.

- **Access**: Admin Only
- **Responses**:
  - `200 OK`: `{ "message": "Article deleted successfully." }`
  - `403 Forbidden`: Non-admin access attempt.
  - `404 Not Found`: Article ID not found.


---

## 7. Reports & Analytics APIs

Dedicated administrative reporting and analytics engine mounted at `/api/analytics`. All calculations, KPIs, trends, and distributions are computed directly from MongoDB records via aggregation pipelines.

> **Access Restriction**: All `/api/analytics/*` endpoints strictly enforce `verifyToken` and `authorizeRoles('admin')`. Student access attempts are rejected with `403 Forbidden`.

### Common Query Filter Parameters
All analytics endpoints accept the following optional query parameters for dynamic multidimensional filtering:
- `startDate` (ISO Date string, e.g. `2026-10-01`): Start of creation date range.
- `endDate` (ISO Date string, e.g. `2026-11-02`): End of creation date range (inclusive to end of day).
- `category` (String, e.g. `Electrical`, `Plumbing`, `Wi-Fi & IT`): Filter by complaint category.
- `priority` (String, e.g. `Low`, `Medium`, `High`, `Critical`): Filter by severity.
- `status` (String, e.g. `Submitted`, `Pending`, `In Progress`, `Resolved`, `Closed`): Filter by state.
- `assignedTo` (ObjectId or `'Unassigned'`): Filter by designated staff member.

---

### `GET /api/analytics/overview`
Retrieve aggregate counts for top-level operational KPI cards.

- **Access**: Admin Only
- **Response `200 OK`**:
  ```json
  {
    "total": 45,
    "submitted": 10,
    "inProgress": 15,
    "pending": 8,
    "resolved": 10,
    "closed": 2,
    "overdue": 3
  }
  ```
- **Overdue Definition**: A ticket is categorized as overdue if unresolved and either `isEscalated: true` or exceeding priority SLA thresholds (Critical $> 24$h, High $> 48$h, Medium/Low $> 72$h, or Pending $> 72$h).

### `GET /api/analytics/status`
Retrieve breakdown of complaints across all lifecycle statuses with percentage distributions.

- **Access**: Admin Only
- **Response `200 OK`**:
  ```json
  {
    "total": 45,
    "data": [
      { "status": "Submitted", "count": 10, "percentage": 22.2 },
      { "status": "Pending", "count": 8, "percentage": 17.8 },
      { "status": "In Progress", "count": 15, "percentage": 33.3 },
      { "status": "Resolved", "count": 10, "percentage": 22.2 },
      { "status": "Closed", "count": 2, "percentage": 4.4 }
    ]
  }
  ```

### `GET /api/analytics/priority`
Retrieve complaint distribution across severity levels.

- **Access**: Admin Only
- **Response `200 OK`**:
  ```json
  {
    "total": 45,
    "data": [
      { "priority": "Low", "count": 5, "percentage": 11.1 },
      { "priority": "Medium", "count": 20, "percentage": 44.4 },
      { "priority": "High", "count": 14, "percentage": 31.1 },
      { "priority": "Critical", "count": 6, "percentage": 13.3 }
    ]
  }
  ```

### `GET /api/analytics/category`
Retrieve complaint volume per facility category sorted by frequency descending.

- **Access**: Admin Only
- **Response `200 OK`**:
  ```json
  {
    "total": 45,
    "data": [
      { "category": "Electrical", "count": 16, "percentage": 35.6 },
      { "category": "Plumbing", "count": 12, "percentage": 26.7 },
      { "category": "Wi-Fi & IT", "count": 10, "percentage": 22.2 },
      { "category": "Mess & Dining", "count": 7, "percentage": 15.6 }
    ]
  }
  ```

### `GET /api/analytics/monthly-trends`
Retrieve monthly volume trends tracking total complaints filed versus tickets successfully resolved.

- **Access**: Admin Only
- **Response `200 OK`**:
  ```json
  [
    { "month": "2026-09", "label": "Sep 2026", "total": 12, "resolved": 11 },
    { "month": "2026-10", "label": "Oct 2026", "total": 20, "resolved": 16 },
    { "month": "2026-11", "label": "Nov 2026", "total": 13, "resolved": 5 }
  ]
  ```

### `GET /api/analytics/resolution-performance`
Calculate resolution velocity metrics and category breakdown.

- **Access**: Admin Only
- **Mathematical Formula**:
  $$\text{Average Resolution Hours} = \frac{\sum (\text{resolvedAt} - \text{createdAt})}{\text{Count}(\text{resolved complaints}) \times 3600000}$$
  *(Unresolved tickets are strictly omitted from average duration calculations)*
- **Response `200 OK`**:
  ```json
  {
    "averageResolutionHours": 18.5,
    "averageResolutionDays": 0.8,
    "formattedAverageTime": "18.5 hrs",
    "totalResolved": 12,
    "totalComplaints": 45,
    "resolutionPercentage": 26.7,
    "overdueCount": 3,
    "categoryPerformance": [
      { "category": "Electrical", "avgHours": 14.2, "count": 5 },
      { "category": "Plumbing", "avgHours": 22.0, "count": 7 }
    ]
  }
  ```

### `GET /api/analytics/admin-performance`
Retrieve administrator workload, assignment distribution, resolution efficiency, and individual mean resolution durations.

- **Access**: Admin Only
- **Response `200 OK`**:
  ```json
  [
    {
      "adminId": "6726229988bba10001",
      "adminName": "admin",
      "email": "admin@college.edu",
      "assignedCount": 18,
      "resolvedCount": 12,
      "inProgressCount": 4,
      "pendingCount": 2,
      "resolutionRate": 66.7,
      "avgResolutionHours": 16.4
    }
  ]
  ```

### `GET /api/analytics/export`
Stream complaints matching the active filter as a formatted CSV spreadsheet. Automatically logs an `ANALYTICS_REPORT_EXPORTED` event in the immutable `AuditLog`.

- **Access**: Admin Only
- **Response Headers**:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="complaints-report-YYYY-MM-DD.csv"`
- **Export Columns**:
  `Ticket Number, Title, Category, Priority, Status, Location, Submitted By, Assigned Admin, Created At, Resolved At, Is Escalated`
