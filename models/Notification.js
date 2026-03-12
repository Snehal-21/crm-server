const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['lead_created', 'lead_assigned', 'lead_status_changed', 'lead_deleted'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
