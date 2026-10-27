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
  receiptUrl: { type: String, default: null },
  receiptPublicId: { type: String, default: null },
  receiptNo: { type: String, default: null },
  dueAmount: { type: Number, default: 0 },
  remainingDue: { type: Number, default: 0 },
  excessAmount: { type: Number, default: 0 },
  digitalSignature: {
    hash: String,
    signedAt: Date,
    signedBy: String,
  },
  whatsappText: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
