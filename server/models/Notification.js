const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  recipientRole: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student',
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: [
      'COMPLAINT_ACKNOWLEDGEMENT',
      'ACKNOWLEDGEMENT',
      'STATUS_UPDATE',
      'COMPLAINT_ESCALATION',
      'ADMIN_ALERT',
      'SYSTEM_ALERT',
    ],
    required: true,
    index: true,
  },
  complaint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    default: null,
    index: true,
  },
  ticketNumber: {
    type: String,
    default: '',
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Composite indexes for efficient querying
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
