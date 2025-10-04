const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    uppercase: true
  },
  convertedAmount: {
    type: Number,
    required: true
  },
  companyCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'travel',
      'meals',
      'accommodation',
      'transportation',
      'office_supplies',
      'entertainment',
      'utilities',
      'communication',
      'training',
      'other'
    ]
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  expenseDate: {
    type: Date,
    required: true
  },
  receipt: {
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'partially_approved'],
    default: 'pending'
  },
  currentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvalLevel: {
    type: Number,
    default: 1
  },
  totalApprovalLevels: {
    type: Number,
    default: 3
  },
  ocrData: {
    extractedText: String,
    merchant: String,
    date: Date,
    amount: Number,
    confidence: String,
    processedAt: Date,
    items: [{
      description: String,
      amount: Number
    }]
  },
  tags: [String],
  isReimbursable: {
    type: Boolean,
    default: true
  },
  rejectionReason: {
    type: String,
    default: null
  },
  approvedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    level: Number,
    approvedAt: Date,
    comments: String
  }],
  rejectedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    level: Number,
    rejectedAt: Date,
    reason: String
  }]
}, {
  timestamps: true
});

// Index for efficient queries
expenseSchema.index({ employee: 1, status: 1 });
expenseSchema.index({ company: 1, status: 1 });
expenseSchema.index({ expenseDate: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
