const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: String,
  userRole: { type: String, default: 'Super Admin' },
  module: { type: String, required: true },
  action: { type: String, required: true },
  recordId: String,
  result: { type: String, default: 'Success' },
  severity: { type: String, default: 'Info' },
  details: String,
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
