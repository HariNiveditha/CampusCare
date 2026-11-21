# EAD Project - Backend Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or Atlas connection string)
- npm or yarn

## Installation & Setup

### 1. Install Backend Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `server` directory with:
```
MONGODB_URI=mongodb://localhost:27017/complaint-redressal-system
PORT=5000
NODE_ENV=development
```

**For MongoDB Atlas** (Cloud):
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/complaint-redressal-system
```

### 3. Seed Database with Demo Data
```bash
node scripts/seedDatabase.js
```

This will create:
- Demo admin user: `admin` / `admin123`
- Demo student users: `student` / `student123`, `john_doe` / `john123`
- Sample complaints for testing

### 4. Start the Backend Server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username and password
- `POST /api/auth/register` - Register new user

### Complaints
- `GET /api/complaints` - Get all complaints
- `GET /api/complaints/user/:userId` - Get user's complaints
- `POST /api/complaints` - Create new complaint
- `PUT /api/complaints/:complaintId` - Update complaint status
- `POST /api/complaints/:complaintId/upvote` - Upvote a complaint
- `DELETE /api/complaints/:complaintId` - Delete complaint

## Database Schema

### User
```
{
  username: String (unique, required)
  email: String (unique, required)
  password: String (required)
  role: String (student|admin, default: student)
  createdAt: Date
}
```

### Complaint
```
{
  title: String (required)
  description: String (required)
  category: String (required)
  status: String (Pending|In Progress|Resolved, default: Pending)
  userId: ObjectId (ref: User)
  userName: String
  upvotes: Number (default: 0)
  upvotedBy: [ObjectId] (ref: User)
  adminResponse: String
  createdAt: Date
  updatedAt: Date
}
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check MONGODB_URI in .env
- For MongoDB Atlas, ensure IP whitelist includes your machine

### Port Already in Use
```bash
# Change PORT in .env to 5001 (or another available port)
# Also update proxy in frontend package.json
```

### Dependencies Installation Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

## Frontend Connection
The frontend is configured to connect to the backend via proxy:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

Make sure both are running simultaneously for the app to work properly.
