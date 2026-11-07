const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { User, Chit, ChitMember, Payment, Auction, ChitFreeze, AuditLog, CustomerDocument } = require('../models');
const { protect, staff } = require('../middleware/authMiddleware');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

// Ensure local uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.log('Skipping local uploads directory creation');
}

// Multer storage for documents
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch (e) {}
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `doc-${cleanName}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPG, PNG, WEBP) and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Resilient upload handler that handles all field names ('file', 'document', etc.) and returns clean JSON errors
const handleUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
    }
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

// Helper: Format file size
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Helper: Upload file to Cloudinary with fallback to local storage
const uploadToCloudinary = (file, folder = 'chitfund_documents') => {
  return new Promise((resolve) => {
    if (!isCloudinaryConfigured) {
      return resolve({
        fileUrl: `/uploads/${file.filename}`,
        filePublicId: file.filename,
        storageType: 'Local'
      });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const isPdf = ext === '.pdf' || file.mimetype === 'application/pdf';
    const resource_type = isPdf ? 'raw' : 'auto';

    cloudinary.uploader.upload(
      file.path,
      {
        folder,
        resource_type,
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        // Remove local temp file
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (e) {}

        if (error) {
          console.error('Cloudinary document upload error, falling back to local file:', error);
          return resolve({
            fileUrl: `/uploads/${file.filename}`,
            filePublicId: file.filename,
            storageType: 'Local'
          });
        }

        resolve({
          fileUrl: result.secure_url,
          filePublicId: result.public_id,
          storageType: 'Cloudinary'
        });
      }
    );
  });
};

// Helper: Delete file from Cloudinary or local disk
const deleteCloudinaryDoc = async (fileUrl, filePublicId, fileType) => {
  if (!fileUrl) return;
  if (fileUrl.includes('cloudinary.com') && filePublicId && isCloudinaryConfigured) {
    try {
      const isPdf = fileType === 'PDF' || fileUrl.toLowerCase().endsWith('.pdf');
      await cloudinary.uploader.destroy(filePublicId, {
        resource_type: isPdf ? 'raw' : 'image'
      });
      console.log(`Cloudinary document deleted: ${filePublicId}`);
    } catch (e) {
      console.warn(`Error deleting Cloudinary document ${filePublicId}:`, e.message);
    }
  } else if (fileUrl.startsWith('/uploads/')) {
    const localPath = path.join(__dirname, '..', fileUrl);
    try {
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    } catch (e) {}
  }
};

// Valid Categories
const VALID_CATEGORIES = [
  'All Documents',
  'KYC Documents',
  'Surety Documents',
  'Identity Documents',
  'Address Documents',
  'Chit Documents',
  'Payment Receipts',
  'Other Documents'
];

/**
 * GET /api/documents/customers
 * Get list of all registered members/customers for dropdown selector
 */
router.get('/customers', protect, staff, async (req, res) => {
  try {
    const customers = await User.find({ role: 'user' })
      .select('memberId name phone email city state panNumber aadharNumber aadharImgUrl panImgUrl createdAt')
      .sort({ memberId: 1, name: 1 })
      .lean();

    const normalizedCustomers = customers.map(c => ({
      ...c,
      id: String(c._id),
      _id: String(c._id)
    }));

    res.json({
      success: true,
      data: normalizedCustomers
    });
  } catch (error) {
    console.error('Error fetching customers for documents:', error);
    res.status(500).json({ success: false, message: 'Failed to load customers' });
  }
});

/**
 * GET /api/documents/customer/:userId
 * Get all categorized documents for a selected customer
 */
router.get('/customer/:userId', protect, staff, async (req, res) => {
  try {
    let { userId } = req.params;
    userId = decodeURIComponent(userId || '').trim();

    let user = null;
    // 1. Try finding by MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId).select('memberId name phone email city state aadharImgUrl panImgUrl createdAt').lean();
    }
    // 2. Try finding by memberId directly (e.g. "INA103")
    if (!user) {
      user = await User.findOne({ memberId: { $regex: new RegExp(`^${userId}$`, 'i') } })
        .select('memberId name phone email city state aadharImgUrl panImgUrl createdAt')
        .lean();
    }
    // 3. Fallback: If userId contains (INA...) extract memberId from string
    if (!user) {
      const match = userId.match(/INA\d+/i);
      if (match) {
        user = await User.findOne({ memberId: { $regex: new RegExp(`^${match[0]}$`, 'i') } })
          .select('memberId name phone email city state aadharImgUrl panImgUrl createdAt')
          .lean();
      }
    }
    // 4. Fallback: Try finding by name match
    if (!user) {
      user = await User.findOne({ name: { $regex: new RegExp(`^${userId}$`, 'i') } })
        .select('memberId name phone email city state aadharImgUrl panImgUrl createdAt')
        .lean();
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const actualUserId = user._id;
    const userObj = {
      ...user,
      id: String(user._id),
      _id: String(user._id)
    };

    const docs = await CustomerDocument.find({ userId: actualUserId }).sort({ createdAt: -1 }).lean();

    const normalizedDocs = docs.map(d => ({
      ...d,
      id: String(d._id),
      _id: String(d._id)
    }));

    // Structure into categorized buckets
    const categorized = {
      'KYC Documents': [],
      'Surety Documents': [],
      'Identity Documents': [],
      'Address Documents': [],
      'Chit Documents': [],
      'Payment Receipts': [],
      'Other Documents': []
    };

    normalizedDocs.forEach(doc => {
      const cat = doc.category || 'Other Documents';
      if (!categorized[cat]) {
        categorized[cat] = [];
      }
      categorized[cat].push(doc);
    });

    const allDocs = [];

    // Automatically inject initial registration KYC docs if present and not duplicated
    if (user.aadharImgUrl) {
      const hasAadhar = normalizedDocs.some(d => (d.title || '').toLowerCase().includes('aadhaar') || d.fileUrl === user.aadharImgUrl);
      const aadharDoc = {
        id: `reg-aadhar-${userObj.id}`,
        _id: `reg-aadhar-${userObj.id}`,
        userId: userObj.id,
        category: 'KYC Documents',
        title: 'Aadhaar Card (Registration KYC)',
        fileName: 'aadhaar_card.jpeg',
        fileUrl: user.aadharImgUrl,
        fileType: 'JPEG',
        fileSize: '512 KB',
        storageType: 'S3',
        remarks: 'Submitted during member registration',
        uploadedBy: 'System / User',
        createdAt: user.createdAt || new Date(),
        isSystemRegistrationDoc: true
      };
      if (!hasAadhar) {
        categorized['KYC Documents'].unshift(aadharDoc);
      }
      allDocs.push(aadharDoc);
    }

    if (user.panImgUrl) {
      const hasPan = normalizedDocs.some(d => (d.title || '').toLowerCase().includes('pan') || d.fileUrl === user.panImgUrl);
      const panDoc = {
        id: `reg-pan-${userObj.id}`,
        _id: `reg-pan-${userObj.id}`,
        userId: userObj.id,
        category: 'Identity Documents',
        title: 'PAN Card (Registration KYC)',
        fileName: 'pan_card.jpeg',
        fileUrl: user.panImgUrl,
        fileType: 'JPEG',
        fileSize: '480 KB',
        storageType: 'S3',
        remarks: 'Submitted during member registration',
        uploadedBy: 'System / User',
        createdAt: user.createdAt || new Date(),
        isSystemRegistrationDoc: true
      };
      if (!hasPan) {
        categorized['Identity Documents'].unshift(panDoc);
      }
      allDocs.push(panDoc);
    }

    allDocs.push(...normalizedDocs);

    res.json({
      success: true,
      customer: userObj,
      documents: allDocs,
      allDocuments: allDocs,
      categories: categorized,
      totalCount: allDocs.length
    });
  } catch (error) {
    console.error('Error fetching customer documents:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve documents' });
  }
});

/**
 * POST /api/documents/upload
 * Upload new document for a customer (Admin / Staff only)
 */
router.post('/upload', protect, staff, handleUpload, async (req, res) => {
  try {
    const { userId, category, title, remarks } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Customer ID is required' });
    }
    const resolvedCategory = (category && VALID_CATEGORIES.includes(category)) ? category : 'All Documents';
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Document title/name is required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Document file is required' });
    }

    const ext = path.extname(req.file.originalname).replace('.', '').toUpperCase();
    const fileType = ext === 'JPG' ? 'JPEG' : (ext || 'FILE');
    const fileSize = formatBytes(req.file.size);

    // Save document to Cloudinary (or fallback to local disk)
    const { fileUrl, filePublicId, storageType } = await uploadToCloudinary(req.file);

    const newDoc = await CustomerDocument.create({
      userId,
      category: resolvedCategory,
      title: title.trim(),
      fileName: req.file.originalname,
      fileUrl,
      filePublicId,
      fileType,
      fileSize,
      storageType,
      remarks: remarks?.trim() || '',
      uploadedBy: req.user.name || 'Admin'
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: newDoc
    });
  } catch (error) {
    console.error('Error uploading customer document:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to upload document' });
  }
});

/**
 * PUT /api/documents/:id
 * Edit existing document details (title, category, remarks, optional replacement file)
 */
router.put('/:id', protect, staff, handleUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, remarks } = req.body;

    // Special handling for Registration KYC documents (Aadhaar & PAN)
    if (id.startsWith('reg-aadhar-')) {
      const userId = id.replace('reg-aadhar-', '');
      const user = (mongoose.Types.ObjectId.isValid(userId) ? await User.findById(userId) : null)
        || await User.findOne({ id: userId });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      let newFileUrl = user.aadharImgUrl;
      let fileName = 'aadhaar_card.jpeg';
      let fileType = 'JPEG';
      let fileSize = '512 KB';

      if (req.file) {
        const ext = path.extname(req.file.originalname).replace('.', '').toUpperCase();
        fileType = ext === 'JPG' ? 'JPEG' : (ext || 'FILE');
        fileSize = formatBytes(req.file.size);
        fileName = req.file.originalname;
        newFileUrl = `/uploads/${req.file.filename}`;

        await User.findByIdAndUpdate(userId, {
            aadharImgUrl: newFileUrl,
            aadharPublicId: req.file.filename
          });
      }

      // Check if there is already a CustomerDocument for Aadhaar
      const existingDoc = await CustomerDocument.findOne({
          userId,
          category: 'KYC Documents'
        });

      if (existingDoc) {
        await CustomerDocument.findByIdAndUpdate(existingDoc.id, {
            title: title ? title.trim() : existingDoc.title,
            remarks: remarks !== undefined ? remarks.trim() : existingDoc.remarks,
            fileUrl: newFileUrl || existingDoc.fileUrl,
            fileName: fileName,
            fileType: fileType,
            fileSize: fileSize
          });
      }

      return res.json({
        success: true,
        message: 'Aadhaar Card updated successfully'
      });
    }

    if (id.startsWith('reg-pan-')) {
      const userId = id.replace('reg-pan-', '');
      const user = (mongoose.Types.ObjectId.isValid(userId) ? await User.findById(userId) : null)
        || await User.findOne({ id: userId });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      let newFileUrl = user.panImgUrl;
      let fileName = 'pan_card.jpeg';
      let fileType = 'JPEG';
      let fileSize = '480 KB';

      if (req.file) {
        const ext = path.extname(req.file.originalname).replace('.', '').toUpperCase();
        fileType = ext === 'JPG' ? 'JPEG' : (ext || 'FILE');
        fileSize = formatBytes(req.file.size);
        fileName = req.file.originalname;
        newFileUrl = `/uploads/${req.file.filename}`;

        await User.findByIdAndUpdate(userId, {
            panImgUrl: newFileUrl,
            panPublicId: req.file.filename
          });
      }

      const existingDoc = await CustomerDocument.findOne({
          userId,
          category: 'Identity Documents'
        });

      if (existingDoc) {
        await CustomerDocument.findByIdAndUpdate(existingDoc.id, {
            title: title ? title.trim() : existingDoc.title,
            remarks: remarks !== undefined ? remarks.trim() : existingDoc.remarks,
            fileUrl: newFileUrl || existingDoc.fileUrl,
            fileName: fileName,
            fileType: fileType,
            fileSize: fileSize
          });
      }

      return res.json({
        success: true,
        message: 'PAN Card updated successfully'
      });
    }

    const existing = await CustomerDocument.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const updateData = {};
    if (title && title.trim()) updateData.title = title.trim();
    if (category && VALID_CATEGORIES.includes(category)) updateData.category = category;
    if (remarks !== undefined) updateData.remarks = remarks.trim();

    if (req.file) {
      const ext = path.extname(req.file.originalname).replace('.', '').toUpperCase();
      const { fileUrl, filePublicId, storageType } = await uploadToCloudinary(req.file);
      updateData.fileType = ext === 'JPG' ? 'JPEG' : (ext || 'FILE');
      updateData.fileSize = formatBytes(req.file.size);
      updateData.fileName = req.file.originalname;
      updateData.fileUrl = fileUrl;
      updateData.filePublicId = filePublicId;
      updateData.storageType = storageType;

      // Clean up previous Cloudinary / local file
      await deleteCloudinaryDoc(existing.fileUrl, existing.filePublicId, existing.fileType);
    }

    const updated = await CustomerDocument.findByIdAndUpdate(id, updateData, { new: true });

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ success: false, message: 'Failed to update document' });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete document (Admin / Staff only)
 */
router.delete('/:id', protect, staff, async (req, res) => {
  try {
    const { id } = req.params;

    // Special handling for Registration KYC documents (Aadhaar & PAN)
    if (id.startsWith('reg-aadhar-')) {
      const userId = id.replace('reg-aadhar-', '');
      await User.findByIdAndUpdate(userId, {
          aadharImgUrl: null,
          aadharPublicId: null
        });
      await CustomerDocument.deleteMany({
        userId,
        category: 'KYC Documents',
        title: { $regex: 'Aadhaar', $options: 'i' }
      });
      return res.json({
        success: true,
        message: 'Aadhaar Card deleted successfully'
      });
    }

    if (id.startsWith('reg-pan-')) {
      const userId = id.replace('reg-pan-', '');
      await User.findByIdAndUpdate(userId, {
          panImgUrl: null,
          panPublicId: null
        });
      await CustomerDocument.deleteMany({
        userId,
        category: 'Identity Documents',
        title: { $regex: 'PAN', $options: 'i' }
      });
      return res.json({
        success: true,
        message: 'PAN Card deleted successfully'
      });
    }

    const existing = await CustomerDocument.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Remove file from Cloudinary or local disk
    await deleteCloudinaryDoc(existing.fileUrl, existing.filePublicId, existing.fileType);

    await CustomerDocument.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
});

/**
 * GET /api/documents/my-documents
 * For logged-in user to preview / view their documents (Read-only)
 */
router.get('/my-documents', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('memberId name aadharImgUrl panImgUrl').lean();

    const docs = await CustomerDocument.find({ userId }).sort({ createdAt: -1 }).lean();

    const categorized = {
      'KYC Documents': [],
      'Surety Documents': [],
      'Identity Documents': [],
      'Address Documents': [],
      'Chit Documents': [],
      'Payment Receipts': [],
      'Other Documents': []
    };

    docs.forEach(doc => {
      const cat = doc.category || 'Other Documents';
      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push(doc);
    });

    const allDocs = [];

    // Include registration KYC docs if not already there
    if (user?.aadharImgUrl) {
      const hasAadhar = docs.some(d => d.title.toLowerCase().includes('aadhaar') || d.fileUrl === user.aadharImgUrl);
      const aadharDoc = {
        id: `reg-aadhar-${user.id}`,
        userId: user.id,
        category: 'KYC Documents',
        title: 'Aadhaar Card (Registration KYC)',
        fileName: 'aadhaar_card.jpeg',
        fileUrl: user.aadharImgUrl,
        fileType: 'JPEG',
        fileSize: '512 KB',
        storageType: 'S3',
        remarks: 'Submitted during member registration',
        uploadedBy: 'System / User',
        createdAt: new Date(),
        isSystemRegistrationDoc: true
      };
      if (!hasAadhar) {
        categorized['KYC Documents'].unshift(aadharDoc);
      }
      allDocs.push(aadharDoc);
    }

    if (user?.panImgUrl) {
      const hasPan = docs.some(d => d.title.toLowerCase().includes('pan') || d.fileUrl === user.panImgUrl);
      const panDoc = {
        id: `reg-pan-${user.id}`,
        userId: user.id,
        category: 'Identity Documents',
        title: 'PAN Card (Registration KYC)',
        fileName: 'pan_card.jpeg',
        fileUrl: user.panImgUrl,
        fileType: 'JPEG',
        fileSize: '480 KB',
        storageType: 'S3',
        remarks: 'Submitted during member registration',
        uploadedBy: 'System / User',
        createdAt: new Date(),
        isSystemRegistrationDoc: true
      };
      if (!hasPan) {
        categorized['Identity Documents'].unshift(panDoc);
      }
      allDocs.push(panDoc);
    }

    allDocs.push(...docs);

    res.json({
      success: true,
      customer: user,
      documents: allDocs,
      allDocuments: allDocs,
      categories: categorized,
      totalCount: allDocs.length
    });
  } catch (error) {
    console.error('Error fetching my-documents:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve documents' });
  }
});

module.exports = router;
