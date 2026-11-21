# CampusCare – Campus Complaint Redressal System

**A centralized platform for managing campus complaints, streamlining issue resolution, and improving communication between students and college administrators.**

## Overview

CampusCare is a web-based Campus Complaint Redressal System designed to simplify how students report and track campus-related issues. It provides a centralized platform where students can submit complaints, attach supporting photographs, monitor resolution progress, and receive notifications.

Administrators can manage incoming complaints, assign responsibilities, update priorities, monitor service-level agreements (SLAs), and analyze complaint resolution performance through an integrated management dashboard.

The system aims to make campus issue resolution more organized, transparent, accountable, and efficient.

## Key Features

### Student Portal
- **Complaint Submission:** Raise complaints with descriptions, facility categories, locations, and photo attachments.
- **Ticket Tracking:** Track complaint status and monitor resolution progress.
- **Community Interaction:** View community complaints and upvote issues.
- **Notifications:** Receive updates about complaint activities and status changes.
- **Knowledge Base:** Search self-help articles and find solutions to common campus issues.

### Administrator Dashboard
- **Complaint Management:** View, review, prioritize, assign, update, and resolve complaints.
- **Role-Based Access Control:** Separate student and administrator permissions.
- **Internal Work Notes:** Maintain administrative notes that are not visible to students.
- **Audit Trail:** Maintain records of important system and administrative activities.
- **Workflow Automation:** Configure automated actions based on complaint events and conditions.
- **SLA Monitoring:** Track resolution deadlines and automatically escalate overdue complaints.
- **Knowledge Base Management:** Create, edit, publish, and manage help articles.

### Reports & Analytics
- **Executive Dashboard:** Monitor complaint statistics through key performance indicators.
- **Visual Analytics:** View complaint distributions by status, priority, and facility category.
- **Resolution Trends:** Analyze monthly complaint volumes and resolution patterns.
- **SLA Performance:** Monitor overdue complaints and average resolution time.
- **Administrator Performance:** Evaluate workloads and resolution efficiency.
- **Report Export:** Download filtered reports in CSV format or print them as PDF.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React 18, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt |
| File Uploads | Multer |
| Automation | node-cron |
| API Communication | Axios |
| Testing | Jest, Supertest |

## System Architecture

CampusCare follows a client-server architecture with separate frontend and backend applications.

- **Frontend:** React-based interface providing dedicated student and administrator workspaces.
- **Backend:** Express.js REST API handling authentication, complaint operations, workflow execution, notifications, and analytics.
- **Database:** MongoDB for persistent storage of users, complaints, audit logs, workflows, notifications, and knowledge base articles.
- **Background Processing:** Scheduled jobs for monitoring complaint SLAs and triggering escalations.

## Getting Started

### Prerequisites
- Node.js and npm
- MongoDB instance (local or cloud)
- Git

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/HariNiveditha/CampusCare.git
cd CampusCare
```

**2. Install dependencies**

```bash
npm install
npm --prefix server install
```

**3. Configure environment variables**

Create the required `.env` configuration for the backend using `.env.example` as a reference.

Configure your MongoDB connection string and JWT secret.

**4. Initialize the database**

```bash
npm --prefix server run seed
```

**5. Start the backend**

```bash
npm --prefix server start
```

**6. Start the frontend**

Open another terminal and run:

```bash
npm start
```

The application will be available at:

`http://localhost:3000`

## Project Structure

```text
CampusCare/
├── public/
├── src/
│   ├── api/
│   ├── components/
│   ├── context/
│   ├── App.js
│   └── App.css
├── server/
│   ├── config/
│   ├── controllers/
│   ├── jobs/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── scripts/
│   ├── tests/
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
├── API_DOCUMENTATION.md
└── README.md
```

## API Documentation

For detailed REST API endpoints, request parameters, response formats, and access permissions, refer to [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## Testing

The backend includes an automated test suite using Jest and Supertest.

Run the tests using:

```bash
npm --prefix server test
```

## Project Goal

CampusCare aims to bridge the communication gap between students and college administration by providing a structured, transparent, and efficient complaint resolution process.

By combining complaint tracking, workflow automation, SLA monitoring, notifications, and performance analytics, the platform provides an integrated solution for managing campus service requests.

---

**Built with React, Node.js, Express, and MongoDB.**
