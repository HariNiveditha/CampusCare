# Quick Start Guide

## Step-by-Step Setup Instructions

### 1. Install MongoDB

**Option A: Local MongoDB**
- Download and install from https://www.mongodb.com/try/download/community
- Start MongoDB service

**Option B: MongoDB Atlas (Cloud)**
- Create free account at https://www.mongodb.com/cloud/atlas
- Create a cluster
- Get your connection string

### 2. Backend Setup

```bash
# Navigate to server folder
cd server

# Install dependencies
npm install

# Create .env file
# Windows:
type nul > .env
# Mac/Linux:
touch .env

# Add to .env:
MONGODB_URI=mongodb://localhost:27017/complaint-redressal-system
PORT=5000
NODE_ENV=development

# Seed database with demo data
node scripts/seedDatabase.js

# Start backend server
npm start
```

Backend should show: "Server running on port 5000"

### 3. Frontend Setup (New Terminal/Tab)

```bash
# Go back to root directory
cd ..

# Install dependencies
npm install

# Start frontend
npm start
```

Frontend should automatically open http://localhost:3000

### 4. Test the Application

**Login with demo credentials:**
- Admin account: username=`admin`, password=`admin123`
- Student account: username=`student`, password=`student123`

**Test Features:**
1. Login as student
2. Submit a new complaint
3. View all complaints and upvote some
4. Login as admin to manage complaints

## Troubleshooting

### "Cannot connect to MongoDB"
- Ensure MongoDB is running
- Check MONGODB_URI in server/.env
- Verify port 27017 is available

### "Port 5000 already in use"
- Change PORT in server/.env
- Update proxy in root package.json

### "Port 3000 already in use"
- Kill the process or use different port

### "Module not found errors"
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### API not responding
- Check backend is running on http://localhost:5000
- Check proxy in package.json matches backend URL
- Check both servers are running simultaneously

## Project Structure

```
EAD project/
├── public/                 # Frontend static files
├── src/
│   ├── components/        # React components
│   │   ├── AdminDashboard.js
│   │   ├── StudentDashboard.js
│   │   ├── ComplaintForm.js
│   │   ├── ComplaintCard.js
│   │   └── Login.js
│   ├── context/           # React Context (state management)
│   │   └── ComplaintContext.js
│   ├── api/               # API communication
│   │   └── api.js
│   ├── App.js
│   └── index.js
├── server/                # Backend (Express + MongoDB)
│   ├── models/            # MongoDB schemas
│   │   ├── User.js
│   │   └── Complaint.js
│   ├── routes/            # API routes
│   │   ├── auth.js
│   │   └── complaints.js
│   ├── controllers/       # Business logic
│   │   ├── authController.js
│   │   └── complaintController.js
│   ├── scripts/           # Utility scripts
│   │   └── seedDatabase.js
│   ├── server.js          # Express server setup
│   ├── .env               # Environment config
│   └── package.json
├── package.json           # Frontend dependencies
└── README.md
```

## Next Steps

1. **Development**: Modify components in `src/components/`
2. **Database**: Modify schemas in `server/models/`
3. **API**: Add endpoints in `server/routes/` and controllers
4. **Styling**: Edit `src/App.css` for UI changes
5. **Deployment**: See README.md for deployment options

## Security Notes

⚠️ **For Production, You Should:**
- Hash passwords with bcrypt
- Implement JWT authentication
- Add CORS configuration
- Validate all user inputs
- Use HTTPS/SSL
- Add rate limiting
- Add file upload security
- Use environment variables for sensitive data

## Support

For issues:
1. Check console for error messages
2. Verify both frontend and backend are running
3. Check .env configuration
4. Review server logs for detailed errors
5. Ensure MongoDB connection string is correct
