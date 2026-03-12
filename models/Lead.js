const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Lead name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name must not exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  source: {
    type: String,
    enum: ['website', 'referral', 'cold', 'social', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'won', 'lost'],
    default: 'new'
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes must not exceed 1000 characters']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Indexes for performance
leadSchema.index({ createdBy: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ createdAt: -1 });
// Compound index for common filter combinations
leadSchema.index({ status: 1, source: 1, createdAt: -1 });
leadSchema.index({ createdBy: 1, assignedTo: 1, status: 1 });
// Text search index
leadSchema.index({ name: 'text', email: 'text', phone: 'text' });

module.exports = mongoose.model('Lead', leadSchema);
