const mongoose = require('mongoose');

const chitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  totalMembers: { type: Number, required: true },
  chitValue: { type: Number, required: true },
  monthlyContribution: { type: Number, required: true },
  durationMonths: { type: Number, required: true },
  termsAndConditions: { type: String, default: '' },
  status: { type: String, default: 'upcoming' },
  currentMonth: { type: Number, default: 1 },
  startDate: Date,
  endDate: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  monthlyDues: [{
    monthNumber: { type: Number, required: true },
    dueAmount: { type: Number, required: true },
    dueDate: Date,
    notes: String,
    updatedAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Chit', chitSchema);
