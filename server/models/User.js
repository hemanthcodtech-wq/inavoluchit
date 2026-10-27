const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  memberId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, default: 'user' },
  isApproved: { type: Boolean, default: true },

  whatsappNumber: String,
  gender: String,
  dob: String,
  age: String,
  occupation: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  remarks: String,

  panNumber: String,
  aadharNumber: String,
  aadharImgUrl: String,
  aadharPublicId: String,
  panImgUrl: String,
  panPublicId: String,
  profileImgUrl: String,
  profilePublicId: String,

  nomineeName: String,
  nomineeRelationship: String,
  nomineePhone: String,
  nomineeDob: String,
  nomineeType: { type: String, default: 'Primary' },
  nomineeAddress: String,
  nomineeRemarks: String,

  guarantorRequired: { type: String, default: 'No' },
  guarantorName: String,
  guarantorRelationship: String,
  guarantorPhone: String,
  guarantorAddress: String,
  guarantorKycStatus: String,
  securityType: String,
  securityValue: String,
  securityVerificationStatus: String,
  securityRemarks: String,

  otp: String,
  otpExpires: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
