const mongoose = require('mongoose');

const chitFreezeSchema = new mongoose.Schema({
  chitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chit', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChitMember' },
  ticketId: String,
  monthNumber: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ChitFreeze', chitFreezeSchema);
