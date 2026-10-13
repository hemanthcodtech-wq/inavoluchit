const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  chitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chit', required: true },
  monthNumber: { type: Number, required: true },
  auctionDate: { type: Date, required: true },
  winningBidDiscount: { type: Number, required: true },
  foremanCommission: { type: Number, required: true },
  winnerPayout: { type: Number, required: true },
  distributablePool: { type: Number, required: true },
  dividendPerMember: { type: Number, required: true },
  nextPayableAmount: { type: Number, required: true },
  winningMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  winningChitMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChitMember' },
  winningTicket: String,
  auctionNotes: String,
  payoutMethod: { type: String, default: 'Bank Transfer (NEFT / RTGS / IMPS)' },
  beneficiaryBankName: String,
  bankUtr: String,
  receiptUrl: String,
  receiptPublicId: String,
}, { timestamps: true });

module.exports = mongoose.model('Auction', auctionSchema);
