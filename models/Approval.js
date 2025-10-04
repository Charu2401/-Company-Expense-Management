const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
  expense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: true
  },
  approver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  comments: {
    type: String,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  dueDate: {
    type: Date,
    default: null
  },
  isOverdue: {
    type: Boolean,
    default: false
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  lastReminderSent: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
approvalSchema.index({ approver: 1, status: 1 });
approvalSchema.index({ expense: 1, level: 1 });
approvalSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('Approval', approvalSchema);
