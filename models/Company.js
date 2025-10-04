const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    required: true,
    uppercase: true
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contact: {
    email: String,
    phone: String,
    website: String
  },
  settings: {
    approvalRules: {
      type: String,
      enum: ['percentage', 'specific', 'hybrid'],
      default: 'percentage'
    },
    percentageThreshold: {
      type: Number,
      default: 60,
      min: 0,
      max: 100
    },
    specificApprovers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    requireReceipt: {
      type: Boolean,
      default: false
    },
    maxExpenseAmount: {
      type: Number,
      default: 10000
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', companySchema);
