const mongoose = require('mongoose');

const flowExecutionSchema = new mongoose.Schema({
  flow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flow',
    required: true,
    index: true,
  },
  flowName: {
    type: String,
    required: true,
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
  trigger: {
    type: String,
    required: true,
    index: true,
  },
  executionStatus: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'SKIPPED'],
    required: true,
    index: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  executedActions: [
    {
      type: { type: String },
      status: { type: String },
      details: { type: mongoose.Schema.Types.Mixed },
    },
  ],
  errorMessage: {
    type: String,
    default: null,
  },
  executionDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

flowExecutionSchema.index({ flow: 1, startedAt: -1 });
flowExecutionSchema.index({ startedAt: -1 });

module.exports = mongoose.model('FlowExecution', flowExecutionSchema);
