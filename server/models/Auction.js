const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  chitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chit', required: true },
  monthNumber: { type: Number, required: true },
  auctionDate: { type: Date, required: true, default: Date.now },
  auctionAmount: { type: Number, default: 0 },
  winnerPayout: { type: Number, required: true },
  winningBidDiscount: { type: Number, default: 0 },
  foremanCommission: { type: Number, default: 0 },
  distributablePool: { type: Number, default: 0 },
  dividendPerMember: { type: Number, default: 0 },
  nextPayableAmount: { type: Number, default: 0 },
  participatingUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  winningMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  winningChitMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChitMember' },
  winningTicket: String,
  auctionNotes: String,
  payoutMethod: { type: String, default: 'Bank Transfer (NEFT / RTGS / IMPS)' },
  beneficiaryBankName: String,
  bankUtr: String,
  receiptUrl: String,
  receiptPublicId: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Auction', auctionSchema);
