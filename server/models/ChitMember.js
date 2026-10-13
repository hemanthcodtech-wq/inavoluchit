const mongoose = require('mongoose');

const chitMemberSchema = new mongoose.Schema({
  chitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chit', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slotNumber: { type: Number, default: 1 },
  ticketId: String,
  status: { type: String, default: 'pending' },
  joinedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ChitMember', chitMemberSchema);
