const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chit', required: true },
  monthNumber: { type: Number, required: true },
  slotNumber: { type: Number, default: 1 },
  amount: { type: Number, required: true },
  transactionId: { type: String, required: true },
  proofImgUrl: { type: String, required: true },
  proofPublicId: String,
  status: { type: String, default: 'pending' },
  remarks: { type: String, default: '' },
  paymentDate: { type: Date, default: Date.now },
  paymentMode: { type: String, default: 'Cash' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
