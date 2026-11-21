const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'SEND_NOTIFICATION',
        'UPDATE_PRIORITY',
        'UPDATE_STATUS',
        'ASSIGN_ADMIN',
        'ESCALATE_COMPLAINT',
      ],
      required: true,
    },
    params: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { strict: false }
);

const conditionSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
  },
  operator: {
    type: String,
    enum: [
      'EQUALS',
      'NOT_EQUALS',
      'GREATER_THAN',
      'GREATER_THAN_OR_EQUAL',
      'LESS_THAN',
      'LESS_THAN_OR_EQUAL',
      'IN',
      'NOT_IN',
      'EXISTS',
    ],
    default: 'EQUALS',
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
  },
});

const flowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  trigger: {
    type: String,
    enum: [
      'COMPLAINT_CREATED',
      'COMPLAINT_STATUS_CHANGED',
      'COMPLAINT_PENDING_DURATION',
    ],
    required: true,
    index: true,
  },
  conditions: [conditionSchema],
  actions: [actionSchema],
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

flowSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Flow', flowSchema);
