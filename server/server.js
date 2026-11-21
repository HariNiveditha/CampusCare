const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { startEscalationJob } = require('./jobs/escalationJob');

dotenv.config();

// Critical environment configuration checks
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  console.error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing.');
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self' http://localhost:5000 http://localhost:3000; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: http://localhost:5000"
  );
  next();
});

// MongoDB Connection (Only connect automatically if not running in test mode)
if (process.env.NODE_ENV !== 'test') {
  if (!process.env.MONGODB_URI) {
    console.error('FATAL CONFIGURATION ERROR: MONGODB_URI environment variable is missing.');
    process.exit(1);
  }
  mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log('MongoDB connected successfully');
      // Start background escalation job
      startEscalationJob();
    })
    .catch((err) => console.error('MongoDB connection error:', err));
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/flows', require('./routes/flows'));
app.use('/api/knowledge-base', require('./routes/knowledgeBase'));
app.use('/api/analytics', require('./routes/analytics'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
