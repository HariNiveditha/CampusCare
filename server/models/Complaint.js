const mongoose = require('mongoose');
const Counter = require('./Counter');

const workNoteSchema = new mongoose.Schema({
  note: {
    type: String,
    required: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  authorName: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
  },
  changedAt: {
    type: Date,
    default: Date.now,
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
});

const complaintSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Submitted', 'Pending', 'In Progress', 'Resolved', 'Closed'],
    default: 'Submitted',
    index: true,
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
    index: true,
  },
  location: {
    type: String,
    default: '',
    trim: true,
  },
  photo: {
    type: String,
    default: '',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  assignedToName: {
    type: String,
    default: '',
  },
  upvotes: {
    type: Number,
    default: 0,
  },
  upvotedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  adminResponse: {
    type: String,
    default: '',
  },
  workNotes: [workNoteSchema],
  // Escalation & Phase 2 lifecycle tracking
  isEscalated: {
    type: Boolean,
    default: false,
    index: true,
  },
  escalatedAt: {
    type: Date,
    default: null,
  },
  pendingSince: {
    type: Date,
    default: null,
    index: true,
  },
  resolvedAt: {
    type: Date,
    default: null,
    index: true,
  },
  statusHistory: [statusHistorySchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Atomic sequential ticket number and pending tracker hook
complaintSchema.pre('save', async function (next) {
  try {
    if (this.isNew && !this.ticketNumber) {
      const counter = await Counter.findByIdAndUpdate(
        'ticketNumber',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.ticketNumber = `CMP${String(counter.seq).padStart(4, '0')}`;
    }

    // Track pendingSince when entering Pending status
    if (this.status === 'Pending') {
      if (!this.pendingSince || this.isModified('status')) {
        this.pendingSince = this.pendingSince || new Date();
      }
    } else if (this.isModified('status')) {
      // If status changed away from Pending, reset pendingSince and isEscalated
      // so returning to Pending in future starts a fresh 3-day escalation window
      this.pendingSince = null;
      this.isEscalated = false;
    }

    // Track resolvedAt timestamp when entering Resolved or Closed status
    if (this.status === 'Resolved' || this.status === 'Closed') {
      if (!this.resolvedAt) {
        this.resolvedAt = new Date();
      }
    } else if (this.isModified('status')) {
      this.resolvedAt = null;
    }

    this.updatedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Complaint', complaintSchema);
