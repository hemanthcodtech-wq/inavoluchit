const mongoose = require('mongoose');

const customerDocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  fileName: String,
  fileUrl: { type: String, required: true },
  filePublicId: String,
  fileType: { type: String, default: 'JPEG' },
  fileSize: String,
  storageType: { type: String, default: 'S3' },
  remarks: String,
  uploadedBy: { type: String, default: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('CustomerDocument', customerDocumentSchema);
