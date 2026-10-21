const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { User, Chit, ChitMember, Payment, Auction, ChitFreeze, AuditLog, CustomerDocument } = require('../models');
const { protect, admin, staff } = require('../middleware/authMiddleware');
const { upload, isCloudinaryConfigured } = require('../config/cloudinary');
const { logAuditEvent } = require('../utils/auditLogger');
const { generateNextMemberId } = require('../utils/memberIdHelper');


const bcrypt = require('bcryptjs');

const getFileUrl = (file) => {
  if (!file) return null;
  if (isCloudinaryConfigured) {
    return file.path;
  } else {
    return `/uploads/${file.filename}`;
  }
};

const getPublicId = (file) => {
  if (!file) return null;
  return file.filename;
};

// @route   POST /api/admin/users/create
// @desc    Admin manually registers a new member with a temporary password
// @access  Private/Staff
router.post(
  '/users/create',
  protect,
  staff,
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'aadhar', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        memberId: requestedMemberId,
        name,
        email,
        temporaryPassword,
        phone,
        whatsappNumber,
        gender,
        dob,
        occupation,
        address,
        city,
        state,
        pincode,
        remarks,
        panNumber,
        aadharNumber,
        nomineeName,
        nomineeRelationship,
        nomineePhone,
        nomineeDob,
        nomineeType,
        nomineeAddress,
        nomineeRemarks,
        guarantorRequired,
        guarantorName,
        guarantorRelationship,
        guarantorPhone,
        guarantorAddress,
        guarantorKycStatus,
        securityType,
        securityValue,
        securityVerificationStatus,
        securityRemarks,
      } = req.body;

      if (
        !name?.trim() ||
        !phone?.trim() ||
        !address?.trim() ||
        !aadharNumber?.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Official Name, Mobile Number, Address, and Aadhaar Number are mandatory fields.'
        });
      }

      if (!req.files?.aadhar?.[0]) {
        return res.status(400).json({
          success: false,
          message: 'Aadhaar document upload/capture is mandatory.'
        });
      }

      if (guarantorRequired === 'Yes') {
        if (!guarantorName?.trim() || !guarantorRelationship?.trim() || !guarantorPhone?.trim() || !guarantorAddress?.trim()) {
          return res.status(400).json({
            success: false,
            message: 'All guarantor details are mandatory when Guarantor is set to Yes.'
          });
        }
      }

      const cleanPhone = phone.trim();
      const cleanEmail = (email && email.trim()) 
        ? email.trim().toLowerCase() 
        : `${cleanPhone.replace(/\D/g, '')}@inavoluchits.com`;

      // Check email uniqueness
      const userExists = await User.findOne({ email: cleanEmail });
      if (userExists) {
        return res.status(400).json({ success: false, message: `A user with email "${cleanEmail}" already exists.` });
      }

      // Check phone uniqueness
      const phoneExists = await User.findOne({ phone: cleanPhone });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: `A user with mobile number "${cleanPhone}" already exists.` });
      }

      const tempPass = (temporaryPassword && temporaryPassword.trim()) ? temporaryPassword.trim() : 'Temp@1234';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPass, salt);

      const memberId = (requestedMemberId && requestedMemberId.trim())
        ? requestedMemberId.trim()
        : await generateNextMemberId();

      const photoFile = req.files?.photo?.[0];
      const aadharFile = req.files?.aadhar?.[0];
      const panFile = req.files?.pan?.[0];

      const newUser = await User.create({
          memberId,
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          phone: cleanPhone,
          whatsappNumber: whatsappNumber ? whatsappNumber.trim() : cleanPhone,
          role: 'user',
          isApproved: true,
          gender: gender || 'Male',
          dob: dob || null,
          occupation: occupation ? occupation.trim() : null,
          address: address.trim(),
          city: city ? city.trim() : null,
          state: state ? state.trim() : 'Andhra Pradesh',
          pincode: pincode ? pincode.trim() : null,
          remarks: remarks ? remarks.trim() : null,
          panNumber: panNumber ? panNumber.trim().toUpperCase() : null,
          aadharNumber: aadharNumber.trim(),
          profileImgUrl: getFileUrl(photoFile),
          profilePublicId: getPublicId(photoFile),
          aadharImgUrl: getFileUrl(aadharFile),
          aadharPublicId: getPublicId(aadharFile),
          panImgUrl: getFileUrl(panFile),
          panPublicId: getPublicId(panFile),
          nomineeName: nomineeName ? nomineeName.trim() : null,
          nomineeRelationship: nomineeRelationship ? nomineeRelationship.trim() : null,
          nomineePhone: nomineePhone ? nomineePhone.trim() : null,
          nomineeDob: nomineeDob || null,
          nomineeType: nomineeType || 'Primary',
          nomineeAddress: nomineeAddress ? nomineeAddress.trim() : null,
          nomineeRemarks: nomineeRemarks ? nomineeRemarks.trim() : null,
          guarantorRequired: guarantorRequired || 'No',
          guarantorName: guarantorName ? guarantorName.trim() : null,
          guarantorRelationship: guarantorRelationship ? guarantorRelationship.trim() : null,
          guarantorPhone: guarantorPhone ? guarantorPhone.trim() : null,
          guarantorAddress: guarantorAddress ? guarantorAddress.trim() : null,
          guarantorKycStatus: guarantorKycStatus || null,
          securityType: securityType || null,
          securityValue: securityValue || null,
          securityVerificationStatus: securityVerificationStatus || null,
          securityRemarks: securityRemarks || null,
        });

      await logAuditEvent({
        req,
        module: 'members',
        action: 'Manual User Registration',
        recordId: newUser.id,
        result: 'Success',
        severity: 'Info',
        details: `Admin created member "${newUser.name}" (Member ID: ${newUser.memberId}) with temporary password.`
      });

      res.status(201).json({
        success: true,
        message: `Member "${newUser.name}" registered successfully with Member ID: ${newUser.memberId}!`,
        data: newUser
      });
    } catch (error) {
      console.error('Error creating user manually:', error);
      res.status(500).json({ success: false, message: error.message || 'Server error creating user' });
    }
  }
);

// @route   GET /api/admin/users/pending
// @desc    Get all pending user registrations (not approved yet)
// @access  Private/Admin
router.get('/users/pending', protect, admin, async (req, res) => {
  try {
    const rawPending = await User.find({ isApproved: false, role: 'user' }).sort({ createdAt: -1 }).lean();
    const pendingUsers = rawPending.map(u => ({ ...u, id: u._id.toString() }));
    res.json({ success: true, data: pendingUsers });
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ success: false, message: 'Server error fetching pending users' });
  }
});

// @route   GET /api/admin/users/approved
// @desc    Get all approved and registered members
// @access  Private/Admin
router.get('/users/approved', protect, admin, async (req, res) => {
  try {
    const rawUsers = await User.find({ isApproved: true, role: 'user' }).sort({ createdAt: -1 }).lean();
    const approvedUsers = await Promise.all(rawUsers.map(async (u) => {
      const chitMembers = await ChitMember.find({ userId: u._id }).populate('chitId').lean();
      const formattedMembers = chitMembers.map(cm => ({
        ...cm,
        id: cm._id.toString(),
        chit: cm.chitId ? { ...cm.chitId, id: cm.chitId._id ? cm.chitId._id.toString() : cm.chitId.id } : null
      }));
      return {
        ...u,
        id: u._id.toString(),
        chitMembers: formattedMembers
      };
    }));
    res.json({ success: true, data: approvedUsers });
  } catch (error) {
    console.error('Error fetching approved users:', error);
    res.status(500).json({ success: false, message: 'Server error fetching approved users' });
  }
});

// @route   POST /api/admin/users/:id/revoke
// @desc    Revoke approval / move user back to pending
// @access  Private/Admin
router.post('/users/:id/revoke', protect, admin, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await User.findByIdAndUpdate(user.id, { isApproved: false });

    await logAuditEvent({
      req,
      module: 'members',
      action: 'User Approval Revoked',
      recordId: user.id,
      result: 'Success',
      severity: 'Warning',
      details: `Revoked approval for user ${user.name} (${user.email})`
    });

    res.json({ success: true, message: `User ${user.name} approval revoked.` });
  } catch (error) {
    console.error('Error revoking user:', error);
    res.status(500).json({ success: false, message: 'Server error revoking user' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Admin permanently delete a user/member account
// @access  Private/Admin
router.delete('/users/:id', protect, admin, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'superadmin') {
      return res.status(400).json({ success: false, message: 'Superadmin accounts cannot be deleted.' });
    }

    // Delete proof images from Cloudinary / local storage if present
    try {
      const { deleteProof } = require('../config/cloudinary');
      if (deleteProof) {
        if (user.aadharImgUrl) await deleteProof(user.aadharImgUrl, user.aadharPublicId).catch(() => {});
        if (user.panImgUrl) await deleteProof(user.panImgUrl, user.panPublicId).catch(() => {});
      }
    } catch (e) {
      console.log('Proof delete helper note:', e.message);
    }

    // Transactionally clean up associated child records to avoid foreign key constraints
    await Promise.all([
      Payment.deleteMany({ userId }),
      ChitFreeze.deleteMany({ userId }),
      ChitMember.deleteMany({ userId }),
      Auction.deleteMany({ winningMemberId: userId }),
      Chit.updateMany({ createdBy: userId }, { createdBy: null }),
      User.findByIdAndDelete(userId)
    ]);

    await logAuditEvent({
      req,
      module: 'members',
      action: 'Delete User Account',
      recordId: user.id,
      result: 'Success',
      severity: 'Critical',
      details: `Deleted member account: ${user.name} (${user.email})`
    });

    res.json({ success: true, message: `User ${user.name} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error deleting user account' });
  }
});

// @route   POST /api/admin/users/:id/verify
// @desc    Approve or reject a user registration with custom or auto-generated Member ID
// @access  Private/Admin
router.post('/users/:id/verify', protect, admin, async (req, res) => {
  try {
    const { action, memberId: customMemberId } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Specify approve or reject.' });
    }

    const user = await User.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (action === 'approve') {
      let finalMemberId = customMemberId && customMemberId.trim() ? customMemberId.trim() : user.memberId;
      if (!finalMemberId) {
        finalMemberId = await generateNextMemberId();
      }

      const updatedUser = await User.findByIdAndUpdate(user.id, {
          isApproved: true,
          memberId: finalMemberId
        });

      await logAuditEvent({
        req,
        module: 'members',
        action: 'Approve User Registration',
        recordId: user.id,
        result: 'Success',
        severity: 'Info',
        details: `Approved user ${user.name} (${user.email}) with Member ID ${finalMemberId}`
      });

      return res.json({ success: true, message: `User ${user.name} approved successfully with Member ID: ${finalMemberId}`, data: updatedUser });
    } else {
      // Delete the proofs from Cloudinary / local storage
      const { deleteProof } = require('../config/cloudinary');
      
      if (user.aadharImgUrl) {
        await deleteProof(user.aadharImgUrl, user.aadharPublicId);
      }
      if (user.panImgUrl) {
        await deleteProof(user.panImgUrl, user.panPublicId);
      }

      await User.findByIdAndDelete(user.id);

      await logAuditEvent({
        req,
        module: 'members',
        action: 'Reject User Registration',
        recordId: user.id,
        result: 'Failed',
        severity: 'Warning',
        details: `Rejected user ${user.name} (${user.email})`
      });

      return res.json({ success: true, message: `User ${user.name} registration rejected and record removed.` });
    }
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({ success: false, message: 'Server error verifying user registration' });
  }
});

// @route   PUT /api/admin/users/:id/member-id
// @desc    Admin update/assign Member ID for a user
// @access  Private/Admin
router.put('/users/:id/member-id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;

    if (!memberId || !memberId.trim()) {
      return res.status(400).json({ success: false, message: 'Member ID cannot be empty.' });
    }

    const trimmedId = memberId.trim();

    // Check if memberId is already taken by another user
    const existing = await User.findOne({
      memberId: trimmedId,
      _id: { $ne: id }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Member ID "${trimmedId}" is already assigned to ${existing.name}.` });
    }

    const updatedUser = await User.findByIdAndUpdate(id, { memberId: trimmedId }, { new: true });

    await logAuditEvent({
      req,
      module: 'members',
      action: 'Updated Member ID',
      recordId: id,
      result: 'Success',
      severity: 'Info',
      details: `Updated Member ID to ${trimmedId} for ${updatedUser.name}`
    });

    res.json({ success: true, message: `Member ID updated to ${trimmedId}`, data: updatedUser });
  } catch (error) {
    console.error('Error updating member ID:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error updating Member ID' });
  }
});

// @route   PUT /api/admin/users/:id/edit
// @desc    Admin edit user profile details
// @access  Private/Admin
router.put('/users/:id/edit', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, whatsappNumber, memberId,
      gender, dob, occupation, address, city, state, pincode, remarks,
      aadharNumber, panNumber,
      nomineeName, nomineeRelationship, nomineePhone, nomineeDob,
      nomineeType, nomineeAddress, nomineeRemarks,
      guarantorRequired, guarantorName, guarantorRelationship,
      guarantorPhone, guarantorAddress, guarantorKycStatus,
      securityType, securityValue, securityVerificationStatus, securityRemarks
    } = req.body;

    const existingUser = await User.findOne({ id });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Uniqueness checks
    if (email && email.trim().toLowerCase() !== existingUser.email) {
      const emailTaken = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: id } });
      if (emailTaken) {
        return res.status(400).json({ success: false, message: `Email "${email.trim()}" is already used by another user.` });
      }
    }

    if (phone && phone.trim() !== existingUser.phone) {
      const phoneTaken = await User.findOne({ phone: phone.trim(), _id: { $ne: id } });
      if (phoneTaken) {
        return res.status(400).json({ success: false, message: `Phone "${phone.trim()}" is already used by another user.` });
      }
    }

    if (memberId && memberId.trim() !== (existingUser.memberId || '')) {
      const memberIdTaken = await User.findOne({ memberId: memberId.trim(), _id: { $ne: id } });
      if (memberIdTaken) {
        return res.status(400).json({ success: false, message: `Member ID "${memberId.trim()}" is already assigned to another user.` });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber.trim() || null;
    if (memberId !== undefined) updateData.memberId = memberId.trim() || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (dob !== undefined) updateData.dob = dob || null;
    if (occupation !== undefined) updateData.occupation = occupation || null;
    if (address !== undefined) updateData.address = address || null;
    if (city !== undefined) updateData.city = city || null;
    if (state !== undefined) updateData.state = state || null;
    if (pincode !== undefined) updateData.pincode = pincode || null;
    if (remarks !== undefined) updateData.remarks = remarks || null;
    if (aadharNumber !== undefined) updateData.aadharNumber = aadharNumber ? aadharNumber.trim() : null;
    if (panNumber !== undefined) updateData.panNumber = panNumber ? panNumber.trim().toUpperCase() : null;
    if (nomineeName !== undefined) updateData.nomineeName = nomineeName ? nomineeName.trim() : null;
    if (nomineeRelationship !== undefined) updateData.nomineeRelationship = nomineeRelationship ? nomineeRelationship.trim() : null;
    if (nomineePhone !== undefined) updateData.nomineePhone = nomineePhone ? nomineePhone.trim() : null;
    if (nomineeDob !== undefined) updateData.nomineeDob = nomineeDob || null;
    if (nomineeType !== undefined) updateData.nomineeType = nomineeType || 'Primary';
    if (nomineeAddress !== undefined) updateData.nomineeAddress = nomineeAddress || null;
    if (nomineeRemarks !== undefined) updateData.nomineeRemarks = nomineeRemarks || null;
    if (guarantorRequired !== undefined) updateData.guarantorRequired = guarantorRequired || 'No';
    if (guarantorName !== undefined) updateData.guarantorName = guarantorName || null;
    if (guarantorRelationship !== undefined) updateData.guarantorRelationship = guarantorRelationship || null;
    if (guarantorPhone !== undefined) updateData.guarantorPhone = guarantorPhone || null;
    if (guarantorAddress !== undefined) updateData.guarantorAddress = guarantorAddress || null;
    if (guarantorKycStatus !== undefined) updateData.guarantorKycStatus = guarantorKycStatus || null;
    if (securityType !== undefined) updateData.securityType = securityType || null;
    if (securityValue !== undefined) updateData.securityValue = securityValue || null;
    if (securityVerificationStatus !== undefined) updateData.securityVerificationStatus = securityVerificationStatus || null;
    if (securityRemarks !== undefined) updateData.securityRemarks = securityRemarks || null;

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });

    await logAuditEvent({
      req,
      module: 'members',
      action: 'Edited User Profile',
      recordId: id,
      result: 'Success',
      severity: 'Info',
      details: `Admin edited profile for member "${updatedUser.name}" (${updatedUser.memberId || 'No Member ID'}). Fields updated: ${Object.keys(updateData).join(', ')}`
    });

    res.json({ success: true, message: `User "${updatedUser.name}" updated successfully.`, data: updatedUser });
  } catch (error) {
    console.error('Error editing user:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error editing user.' });
  }
});

// @route   PUT /api/admin/users/:id/documents
// @desc    Admin update user Aadhar and/or PAN card proof documents
// @access  Private/Staff
router.put(
  '/users/:id/documents',
  protect,
  staff,
  upload.fields([
    { name: 'aadhar', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findOne({ id });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const updateData = {};
      if (req.files && req.files.aadhar && req.files.aadhar[0]) {
        updateData.aadharImgUrl = getFileUrl(req.files.aadhar[0]);
        updateData.aadharPublicId = getFileUrl(req.files.aadhar[0]);
      }
      if (req.files && req.files.pan && req.files.pan[0]) {
        updateData.panImgUrl = getFileUrl(req.files.pan[0]);
        updateData.panPublicId = getFileUrl(req.files.pan[0]);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'Please select an Aadhar or PAN image to upload.' });
      }

      const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });

      await logAuditEvent({
        req,
        module: 'members',
        action: 'Admin Updated User Documents',
        recordId: user.id,
        result: 'Success',
        severity: 'Info',
        details: `Updated documents for member ${user.name} (${user.email})`
      });

      res.json({
        success: true,
        message: `Documents updated successfully for ${user.name}`,
        data: updatedUser
      });
    } catch (error) {
      console.error('Error updating user documents by admin:', error);
      res.status(500).json({ success: false, message: 'Failed to update user documents' });
    }
  }
);

// @route   DELETE /api/admin/users/:id/documents/:docType
// @desc    Admin delete a user's specific document (aadhar or pan)
// @access  Private/Staff
router.delete('/users/:id/documents/:docType', protect, staff, async (req, res) => {
  try {
    const { id, docType } = req.params;

    if (!['aadhar', 'pan'].includes(docType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type. Specify aadhar or pan.' });
    }

    const user = await User.findOne({ id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updateData = {};
    const { deleteProof } = require('../config/cloudinary');

    if (docType === 'aadhar') {
      if (user.aadharImgUrl) {
        await deleteProof(user.aadharImgUrl, user.aadharPublicId).catch(() => {});
      }
      updateData.aadharImgUrl = null;
      updateData.aadharPublicId = null;
    } else if (docType === 'pan') {
      if (user.panImgUrl) {
        await deleteProof(user.panImgUrl, user.panPublicId).catch(() => {});
      }
      updateData.panImgUrl = null;
      updateData.panPublicId = null;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });

    await logAuditEvent({
      req,
      module: 'members',
      action: `Admin Deleted User ${docType.toUpperCase()} Document`,
      recordId: user.id,
      result: 'Success',
      severity: 'Warning',
      details: `Deleted ${docType.toUpperCase()} for member ${user.name} (${user.email})`
    });

    res.json({
      success: true,
      message: `${docType.toUpperCase()} document deleted successfully`,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error deleting user document by admin:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user document' });
  }
});


// @desc    Get metrics for admin dashboard
// @access  Private/Staff
router.get('/dashboard-stats', protect, staff, async (req, res) => {
  try {
    const isEmp = req.user.role === 'employee';
    const chitWhere = isEmp ? { createdBy: req.user.id } : {};

    const totalUsers = await User.countDocuments({ role: 'user', isApproved: true });
    const pendingApprovals = await User.countDocuments({ role: 'user', isApproved: false });
    const totalChits = await Chit.countDocuments(chitWhere);
    const activeChits = await Chit.countDocuments({ ...chitWhere, status: 'active' });
    
    // Total revenue = sum of approved payments
    let approvedPaymentFilter = { status: 'approved' };
    if (isEmp) {
      const empChits = await Chit.find({ createdBy: req.user.id }).select('_id').lean();
      approvedPaymentFilter.chitId = { $in: empChits.map(c => c._id) };
    }
    const payments = await Payment.find(approvedPaymentFilter).lean();
    const totalRevenue = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const pendingPaymentsCount = await Payment.countDocuments({ status: 'pending' });

    const upcomingChits = await Chit.find({ ...chitWhere, status: 'upcoming' }).lean();
    const upcomingChitsWithMembers = await Promise.all(upcomingChits.map(async (c) => {
      const members = await ChitMember.find({ chitId: c._id }).lean();
      return { ...c, id: c._id.toString(), members };
    }));
    
    const readyToActivateChitsCount = upcomingChitsWithMembers.filter(chit => {
      const approvedCount = chit.members.filter(m => m.status === 'approved').length;
      return approvedCount === chit.totalMembers && chit.totalMembers > 0;
    }).length;

    let pendingChitJoinsCount = 0;
    upcomingChitsWithMembers.forEach(chit => {
      pendingChitJoinsCount += chit.members.filter(m => m.status === 'pending').length;
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        pendingApprovals,
        totalChits,
        activeChits,
        totalRevenue,
        pendingPaymentsCount,
        readyToActivateChitsCount,
        pendingChitJoinsCount,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard stats' });
  }
});

// @route   GET /api/admin/users-records
// @desc    Get all user profiles and transaction history (chits & payments)
// @access  Private/Staff
router.get('/users-records', protect, staff, async (req, res) => {
  try {
    const isEmp = req.user.role === 'employee';
    
    let rawUsers = await User.find({ role: 'user' }).sort({ createdAt: -1 }).lean();
    let users = rawUsers.map(u => ({ ...u, id: u._id.toString() }));

    // Chits: employees only see their own created chits
    const chitQuery = isEmp ? { createdBy: req.user.id } : {};
    const rawChits = await Chit.find(chitQuery).lean();
    const chits = await Promise.all(rawChits.map(async (c) => {
      const chitId = c._id.toString();
      const rawMembers = await ChitMember.find({ chitId: c._id }).populate('userId').lean();
      const members = rawMembers.map(m => ({
        ...m,
        id: m._id.toString(),
        user: m.userId ? { ...m.userId, id: m.userId._id ? m.userId._id.toString() : m.userId.id } : null
      }));
      const rawFreezes = await ChitFreeze.find({ chitId: c._id }).populate('userId').lean();
      const freezes = rawFreezes.map(f => ({
        ...f,
        id: f._id.toString(),
        user: f.userId ? { ...f.userId, id: f.userId._id ? f.userId._id.toString() : f.userId.id } : null
      }));
      const rawAuctions = await Auction.find({ chitId: c._id }).sort({ monthNumber: 1 }).lean();
      const auctions = rawAuctions.map(a => ({ ...a, id: a._id.toString() }));
      return {
        ...c,
        id: chitId,
        members,
        freezes,
        auctions
      };
    }));

    // Build set of allowed chit IDs for payment filtering
    const allowedChitIds = new Set(chits.map(c => c.id));

    // Payments: employees only see payments for their chits
    const paymentQuery = isEmp ? { chitId: { $in: Array.from(allowedChitIds) } } : {};
    const rawPayments = await Payment.find(paymentQuery).populate('chitId').lean();
    const payments = rawPayments.map(p => ({
      ...p,
      id: p._id.toString(),
      chit: p.chitId ? { ...p.chitId, id: p.chitId._id ? p.chitId._id.toString() : p.chitId.id } : null
    }));

    if (isEmp) {
      // Employees only see users that are members of their assigned chits
      const allowedUserIds = new Set();
      chits.forEach(chit => {
        chit.members.forEach(member => {
          if (member.userId) allowedUserIds.add(member.userId);
        });
      });
      users = users.filter(user => allowedUserIds.has(user.id));
    }

    const userRecords = users.map(user => {
      const joinedChits = chits.filter(chit => 
        chit.members.some(m => m.user && m.user.id === user.id && m.status === 'approved')
      ).map(chit => ({
        id: chit.id,
        name: chit.name,
        status: chit.status,
        currentMonth: chit.currentMonth,
        durationMonths: chit.durationMonths,
        monthlyContribution: chit.monthlyContribution,
        chitValue: chit.chitValue,
        monthlyDues: chit.monthlyDues || [],
        members: chit.members || [],
        freezes: chit.freezes,
        auctions: chit.auctions || []
      }));

      // Only return payments for this user AND for the allowed chits
      const userPayments = payments.filter(p => 
        p.userId === user.id && allowedChitIds.has(p.chitId)
      );

      return {
        user,
        chits: joinedChits,
        payments: userPayments
      };
    });

    res.json({ success: true, data: userRecords });
  } catch (error) {
    console.error('Error fetching users records:', error);
    res.status(500).json({ success: false, message: 'Server error fetching user records' });
  }
});

// @route   GET /api/admin/users-records/:userId
// @desc    Get detailed records for a specific user
// @access  Private/Staff
router.get('/users-records/:userId', protect, staff, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userObjId = user._id || user.id;
    const userMemberRecords = await ChitMember.find({ userId: userObjId, status: 'approved' }).select('chitId').lean();
    const enrolledChitIds = userMemberRecords.map(m => m.chitId);

    const rawChits = await Chit.find({ _id: { $in: enrolledChitIds } }).populate('createdBy', 'name role').lean();
    const chits = await Promise.all(rawChits.map(async (c) => {
      const rawMembers = await ChitMember.find({ chitId: c._id }).populate('userId', 'name phone email').lean();
      const members = rawMembers.map(m => ({
        ...m,
        id: m._id.toString(),
        userId: m.userId ? (m.userId._id ? m.userId._id.toString() : m.userId.id) : null,
        user: m.userId ? { ...m.userId, id: m.userId._id ? m.userId._id.toString() : m.userId.id } : null
      }));
      const rawFreezes = await ChitFreeze.find({ chitId: c._id, userId: userObjId }).lean();
      const freezes = rawFreezes.map(f => ({ ...f, id: f._id.toString() }));
      const rawAuctions = await Auction.find({ chitId: c._id }).sort({ monthNumber: 1 }).lean();
      const auctions = rawAuctions.map(a => ({ ...a, id: a._id.toString() }));
      return {
        ...c,
        id: c._id.toString(),
        creator: c.createdBy,
        members,
        freezes,
        auctions
      };
    }));

    const chitIds = chits.map(c => c.id);

    const rawPayments = await Payment.find({
      userId: userObjId,
      chitId: { $in: chitIds }
    }).populate('chitId').sort({ monthNumber: 1 }).lean();

    const payments = rawPayments.map(p => ({
      ...p,
      id: p._id.toString(),
      chit: p.chitId ? { ...p.chitId, id: p.chitId._id ? p.chitId._id.toString() : p.chitId.id } : null
    }));

    const enrolledSlotsList = [];
    chits.forEach(chit => {
      const userSlotsInThisChit = chit.members.filter(m => m.userId === user.id && m.status === 'approved');
      userSlotsInThisChit.sort((a, b) => {
        const numA = parseInt(String(a.ticketId || '').match(/\d+/)?.[0] || a.slotNumber || 0, 10);
        const numB = parseInt(String(b.ticketId || '').match(/\d+/)?.[0] || b.slotNumber || 0, 10);
        return numA - numB;
      });
      const hasMultipleSlots = userSlotsInThisChit.length > 1;

      userSlotsInThisChit.forEach((memberEntry, idx) => {
        const slotNum = memberEntry.slotNumber || (idx + 1);
        const rawTicketId = memberEntry.ticketId || `MEMBER-${slotNum}`;
        const ticketId = rawTicketId.replace(/^TICKET-/, 'MEMBER-');
        enrolledSlotsList.push({
          id: `${chit.id}_slot_${slotNum}`,
          chitId: chit.id,
          memberId: memberEntry.id,
          slotNumber: slotNum,
          ticketId: ticketId,
          name: `${chit.name} (${ticketId})`,
          baseName: chit.name,
          status: chit.status,
          currentMonth: chit.currentMonth,
          durationMonths: chit.durationMonths,
          monthlyContribution: chit.monthlyContribution,
          chitValue: chit.chitValue,
          termsAndConditions: chit.termsAndConditions,
          freezes: chit.freezes,
          totalMembers: chit.totalMembers,
          auctions: chit.auctions || []
        });
      });
    });

    res.json({
      success: true,
      data: {
        user,
        chits: enrolledSlotsList,
        payments
      }
    });
  } catch (error) {
    console.error('Error fetching user detailed record:', error);
    res.status(500).json({ success: false, message: 'Server error fetching user record' });
  }
});


// @route   GET /api/admin/chits-records
// @desc    Get all chit pools and member details and installment history
// @access  Private/Staff
router.get('/chits-records', protect, staff, async (req, res) => {
  try {
    const isEmp = req.user.role === 'employee';
    const chitQuery = isEmp ? { createdBy: req.user.id } : {};
    const rawChits = await Chit.find(chitQuery).populate('createdBy', 'name role').lean();
    const chits = await Promise.all(rawChits.map(async (c) => {
      const rawMembers = await ChitMember.find({ chitId: c._id }).populate('userId').lean();
      const members = rawMembers.map(m => ({
        ...m,
        id: m._id.toString(),
        user: m.userId ? { ...m.userId, id: m.userId._id ? m.userId._id.toString() : m.userId.id } : null
      }));
      const rawFreezes = await ChitFreeze.find({ chitId: c._id }).populate('userId').lean();
      const freezes = rawFreezes.map(f => ({
        ...f,
        id: f._id.toString(),
        user: f.userId ? { ...f.userId, id: f.userId._id ? f.userId._id.toString() : f.userId.id } : null
      }));
      return {
        ...c,
        id: c._id.toString(),
        creator: c.createdBy,
        members,
        freezes
      };
    }));

    const rawPayments = await Payment.find().populate('userId').lean();
    const payments = rawPayments.map(p => ({
      ...p,
      id: p._id.toString(),
      chitId: p.chitId ? p.chitId.toString() : null,
      user: p.userId ? { ...p.userId, id: p.userId._id ? p.userId._id.toString() : p.userId.id } : null
    }));
    
    const chitRecords = chits.map(chit => {
      const chitPayments = payments.filter(p => p.chitId === chit.id);
      return {
        chit,
        payments: chitPayments
      };
    });

    res.json({ success: true, data: chitRecords });
  } catch (error) {
    console.error('Error fetching chits records:', error);
    res.status(500).json({ success: false, message: 'Server error fetching chit records' });
  }
});

// @route   POST /api/admin/chits/:chitId/set-monthly-due
// @desc    Admin sets or updates the payable installment due amount for a specific month
// @access  Private/Staff
router.post('/chits/:chitId/set-monthly-due', protect, staff, async (req, res) => {
  try {
    const { chitId } = req.params;
    const { monthNumber, dueAmount, dueDate, notes } = req.body;

    if (!monthNumber || dueAmount === undefined || dueAmount === null || Number(dueAmount) < 0) {
      return res.status(400).json({ success: false, message: 'Please provide valid monthNumber and dueAmount.' });
    }

    const chit = await Chit.findById(chitId);
    if (!chit) {
      return res.status(404).json({ success: false, message: 'Chit scheme not found.' });
    }

    const mNum = Number(monthNumber);
    const amount = Number(dueAmount);

    if (!chit.monthlyDues) {
      chit.monthlyDues = [];
    }

    const existingIdx = chit.monthlyDues.findIndex(d => d.monthNumber === mNum);
    if (existingIdx >= 0) {
      chit.monthlyDues[existingIdx].dueAmount = amount;
      if (dueDate) chit.monthlyDues[existingIdx].dueDate = new Date(dueDate);
      if (notes !== undefined) chit.monthlyDues[existingIdx].notes = notes;
      chit.monthlyDues[existingIdx].updatedAt = new Date();
    } else {
      chit.monthlyDues.push({
        monthNumber: mNum,
        dueAmount: amount,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || '',
        updatedAt: new Date()
      });
    }

    await chit.save();

    await logAuditEvent({
      req,
      module: 'chit_groups',
      action: 'Set Monthly Due',
      recordId: chit.id,
      result: 'Success',
      severity: 'Info',
      details: `Configured Month ${mNum} payable due to ₹${amount} for chit "${chit.name}"`
    });

    res.json({
      success: true,
      message: `Monthly due for Month ${mNum} set to ₹${amount.toLocaleString()} successfully!`,
      data: chit
    });
  } catch (error) {
    console.error('Error setting monthly due:', error);
    res.status(500).json({ success: false, message: 'Server error setting monthly due: ' + error.message });
  }
});

// @route   GET /api/admin/chits/:chitId/dues-summary
// @desc    Get breakdown of configured monthly dues, amounts paid, and remaining dues for all enrolled members
// @access  Private/Staff
router.get('/chits/:chitId/dues-summary', protect, staff, async (req, res) => {
  try {
    const { chitId } = req.params;
    const chit = await Chit.findById(chitId).lean();
    if (!chit) {
      return res.status(404).json({ success: false, message: 'Chit not found.' });
    }

    const members = await ChitMember.find({ chitId: chit._id, status: 'approved' })
      .populate('userId', 'name email phone memberId profileImgUrl')
      .lean();

    const payments = await Payment.find({ chitId: chit._id, status: 'approved' }).lean();

    const userSlotsMap = {};
    members.forEach(m => {
      if (!m.userId) return;
      const uId = m.userId._id ? m.userId._id.toString() : m.userId.toString();
      if (!userSlotsMap[uId]) {
        userSlotsMap[uId] = {
          user: m.userId,
          slotsCount: 0,
          ticketIds: []
        };
      }
      userSlotsMap[uId].slotsCount++;
      if (m.ticketId) userSlotsMap[uId].ticketIds.push(m.ticketId);
    });

    const duesConfig = chit.monthlyDues || [];
    const duration = chit.durationMonths || 20;

    const result = Object.keys(userSlotsMap).map(uId => {
      const item = userSlotsMap[uId];
      const userPayments = payments.filter(p => p.userId.toString() === uId);

      const monthsData = [];
      for (let m = 1; m <= duration; m++) {
        const config = duesConfig.find(d => d.monthNumber === m);
        const baseDue = config ? config.dueAmount : chit.monthlyContribution;
        const totalDue = baseDue * item.slotsCount;

        const monthPayments = userPayments.filter(p => p.monthNumber === m);
        const amountPaid = monthPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
        const remainingDue = Math.max(0, totalDue - amountPaid);

        monthsData.push({
          monthNumber: m,
          baseDue,
          totalDue,
          amountPaid,
          remainingDue,
          isPaid: remainingDue === 0,
          isPartial: amountPaid > 0 && remainingDue > 0,
          payments: monthPayments.map(p => ({
            id: p._id.toString(),
            amount: p.amount,
            paidDate: p.paymentDate || p.createdAt,
            transactionId: p.transactionId,
            proofImgUrl: p.proofImgUrl,
            remarks: p.remarks,
            paymentMode: p.paymentMode || 'Cash'
          }))
        });
      }

      return {
        user: item.user,
        slotsCount: item.slotsCount,
        ticketIds: item.ticketIds,
        months: monthsData
      };
    });

    res.json({
      success: true,
      data: {
        chit: {
          id: chit._id.toString(),
          name: chit.name,
          chitValue: chit.chitValue,
          durationMonths: chit.durationMonths,
          currentMonth: chit.currentMonth,
          monthlyContribution: chit.monthlyContribution,
          status: chit.status,
          monthlyDues: duesConfig
        },
        members: result
      }
    });
  } catch (error) {
    console.error('Error fetching dues summary:', error);
    res.status(500).json({ success: false, message: 'Server error fetching dues summary: ' + error.message });
  }
});

// @route   POST /api/admin/chits/:chitId/mark-paid
// @desc    Admin manually records or updates a member's payment with date, amount, mode, and receipt proof (reduces due)
// @access  Private/Staff
router.post('/chits/:chitId/mark-paid', protect, staff, upload.single('proof'), async (req, res) => {
  try {
    const { chitId } = req.params;
    const {
      paymentId,
      userId,
      monthNumber,
      amount,
      paymentDate,
      paymentMode = 'Cash',
      transactionId,
      slotNumber,
      remarks
    } = req.body;

    if (!userId || !monthNumber || amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Missing required fields (userId, monthNumber, amount > 0)' });
    }

    const targetSlotNumber = Number(slotNumber || 1);
    const mNum = Number(monthNumber);
    const paidAmt = Number(amount);

    // Verify chit exists
    const chit = (mongoose.Types.ObjectId.isValid(chitId) ? await Chit.findById(chitId) : null)
      || await Chit.findOne({ id: chitId });
    if (!chit) {
      return res.status(404).json({ success: false, message: 'Chit scheme not found.' });
    }
    
    if (req.user.role === 'employee' && chit.createdBy && chit.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this chit scheme.' });
    }

    // Verify user exists
    const user = (mongoose.Types.ObjectId.isValid(userId) ? await User.findById(userId) : null)
      || await User.findOne({ id: userId })
      || await User.findOne({ memberId: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Auto-ensure user is enrolled as an approved member in ChitMember
    let existingMember = await ChitMember.findOne({ chitId: chit._id, userId: user._id });
    if (!existingMember) {
      const memberCount = await ChitMember.countDocuments({ chitId: chit._id });
      await ChitMember.create({
        chitId: chit._id,
        userId: user._id,
        slotNumber: memberCount + 1,
        ticketId: `TICKET-${memberCount + 1}`,
        status: 'approved'
      });
    } else if (existingMember.status !== 'approved') {
      existingMember.status = 'approved';
      await existingMember.save();
    }

    const parsedDate = paymentDate ? new Date(paymentDate) : new Date();
    const finalTxId = transactionId && transactionId.trim() ? transactionId.trim() : `PAY_${Date.now()}`;

    let payment;

    // Check if updating an existing payment
    if (paymentId && mongoose.Types.ObjectId.isValid(paymentId)) {
      payment = await Payment.findById(paymentId);
      if (payment) {
        payment.amount = paidAmt;
        payment.paymentDate = parsedDate;
        payment.paymentMode = paymentMode || payment.paymentMode || 'Cash';
        payment.transactionId = finalTxId;
        if (remarks !== undefined) payment.remarks = remarks;
        if (req.file) {
          payment.proofImgUrl = getFileUrl(req.file);
          payment.proofPublicId = getPublicId(req.file);
        }
        payment.status = 'approved';
        payment.verifiedAt = new Date();
        await payment.save();
      }
    }

    // Otherwise create a new payment
    if (!payment) {
      let proofImgUrl = req.file ? getFileUrl(req.file) : 'MANUAL_ENTRY';
      let proofPublicId = req.file ? getPublicId(req.file) : null;

      payment = await Payment.create({
        userId: user._id,
        chitId: chit._id,
        monthNumber: mNum,
        slotNumber: targetSlotNumber,
        amount: paidAmt,
        paymentDate: parsedDate,
        paymentMode: paymentMode || 'Cash',
        transactionId: finalTxId,
        proofImgUrl,
        proofPublicId,
        status: 'approved',
        remarks: remarks || `Manually recorded by Admin (${req.user.name || 'Admin'})`,
        recordedBy: req.user._id,
        verifiedAt: new Date(),
      });
    }

    // Calculate updated due breakdown for this user & month
    const userSlots = await ChitMember.countDocuments({ chitId: chit._id, userId: user._id, status: 'approved' }) || 1;
    const configuredDue = (chit.monthlyDues || []).find(d => d.monthNumber === mNum)?.dueAmount || chit.monthlyContribution;
    const totalDue = configuredDue * userSlots;

    const allApprovedPayments = await Payment.find({
      chitId: chit._id,
      userId: user._id,
      monthNumber: mNum,
      status: 'approved'
    }).lean();

    const totalPaidSoFar = allApprovedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const remainingDue = Math.max(0, totalDue - totalPaidSoFar);

    await logAuditEvent({
      req,
      module: 'payments',
      action: paymentId ? 'Update Member Payment' : 'Record Member Payment',
      recordId: payment.id,
      result: 'Success',
      severity: 'Info',
      details: `${paymentId ? 'Updated' : 'Recorded'} ₹${paidAmt} payment for ${user.name} (Chit: ${chit.name}, Month: ${mNum}). Remaining due: ₹${remainingDue}`
    });

    res.json({
      success: true,
      message: `Payment of ₹${paidAmt.toLocaleString()} saved for ${user.name} (Month ${mNum}). Remaining due: ₹${remainingDue.toLocaleString()}`,
      data: {
        payment,
        dueSummary: {
          monthNumber: mNum,
          totalDue,
          totalPaid: totalPaidSoFar,
          remainingDue,
          isFullyPaid: remainingDue === 0
        }
      }
    });
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({ success: false, message: 'Server error marking payment: ' + (error.message || '') });
  }
});

// @route   DELETE /api/admin/payments/:id
// @desc    Admin deletes a recorded payment
// @access  Private/Staff
router.delete('/payments/:id', protect, staff, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    await Payment.findByIdAndDelete(payment._id);

    await logAuditEvent({
      req,
      module: 'payments',
      action: 'Delete Member Payment',
      recordId: payment.id,
      result: 'Success',
      severity: 'Warning',
      details: `Deleted payment of ₹${payment.amount} for user ID ${payment.userId} (Month ${payment.monthNumber})`
    });

    res.json({ success: true, message: 'Payment record removed successfully.' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, message: 'Server error deleting payment: ' + error.message });
  }
});

// @route   POST /api/admin/payments/:id/allow-edit
// @desc    Grant user permission to edit/resubmit their payment (sets status to edit_requested)
// @access  Private/Staff
router.post('/payments/:id/allow-edit', protect, staff, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('chitId');
    if (payment && payment.chitId) payment.chit = payment.chitId;

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (req.user.role === 'employee' && payment.chit.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this chit' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot allow edit on a payment with status: ${payment.status}` });
    }

    const updatedPayment = await Payment.findByIdAndUpdate(payment.id, {
        status: 'edit_requested',
        remarks: 'Admin has requested you to update your payment details and resubmit.'
      });

    res.json({
      success: true,
      message: 'Edit access granted. User can now update and resubmit this payment.',
      data: updatedPayment
    });
  } catch (error) {
    console.error('Error allowing payment edit:', error);
    res.status(500).json({ success: false, message: 'Server error granting edit access' });
  }
});

// @route   POST /api/admin/payments/:id/mark-unpaid
// @desc    Reset an approved payment back to pending (mark as unpaid / unverified)
// @access  Private/Staff
router.post('/payments/:id/mark-unpaid', protect, staff, async (req, res) => {
  try {
    const { remarks } = req.body;

    const payment = await Payment.findById(req.params.id).populate('chitId');
    if (payment && payment.chitId) payment.chit = payment.chitId;

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (req.user.role === 'employee' && payment.chit.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this chit' });
    }

    const updatedPayment = await Payment.findByIdAndUpdate(payment.id, {
        status: 'edit_requested',
        remarks: remarks || 'Marked as unpaid by Admin. Please update your transaction ID and re-upload the payment screenshot.',
        verifiedAt: null
      });

    res.json({
      success: true,
      message: 'Payment has been marked as unpaid and returned to verification queue.',
      data: updatedPayment
    });
  } catch (error) {
    console.error('Error marking payment as unpaid:', error);
    res.status(500).json({ success: false, message: 'Server error marking payment as unpaid' });
  }
});

// @route   DELETE /api/admin/payments/:id
// @desc    Delete a payment record permanently
// @access  Private/Staff
router.delete('/payments/:id', protect, staff, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('chitId');
    if (payment && payment.chitId) payment.chit = payment.chitId;

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (req.user.role === 'employee' && payment.chit.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this chit' });
    }

    if (payment.proofPublicId) {
      const { deleteProof } = require('../config/cloudinary');
      await deleteProof(payment.proofImgUrl, payment.proofPublicId);
    }

    await Payment.findByIdAndDelete(req.params.id);

    logAuditEvent({
      userId: req.user.id,
      action: 'DELETE',
      module: 'payments',
      targetId: req.params.id,
      details: `Deleted payment record ${req.params.id} (Amount: Rs.${payment.amount}, Month: ${payment.monthNumber})`,
      severity: 'WARNING'
    });

    res.json({ success: true, message: 'Payment record deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment record:', error);
    res.status(500).json({ success: false, message: 'Server error deleting payment record' });
  }
});

// ==========================================
// EMPLOYEE (STAFF) MANAGEMENT ROUTES
// ==========================================

// @route   GET /api/admin/employees
// @desc    Get all employees
// @access  Private/Admin
router.get('/employees', protect, admin, async (req, res) => {
  try {
    const rawEmployees = await User.find({ role: 'employee' }).sort({ createdAt: -1 }).lean();
    const employees = await Promise.all(rawEmployees.map(async (emp) => {
      const createdChits = await Chit.find({ createdBy: emp._id }).select('name status').lean();
      return {
        id: emp._id.toString(),
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        createdAt: emp.createdAt,
        createdChits: createdChits.map(c => ({ id: c._id.toString(), name: c.name, status: c.status }))
      };
    }));
    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Server error fetching employees' });
  }
});

// @route   POST /api/admin/employees
// @desc    Create a new employee account
// @access  Private/Admin
router.post('/employees', protect, admin, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const createdEmp = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'employee',
      isApproved: true, // Employees are auto-approved
    });
    const employee = {
      id: createdEmp._id.toString(),
      name: createdEmp.name,
      email: createdEmp.email,
      role: createdEmp.role
    };

    res.status(201).json({ success: true, message: 'Employee created successfully', data: employee });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ success: false, message: 'Server error creating employee' });
  }
});

// @route   DELETE /api/admin/employees/:id
// @desc    Delete an employee account
// @access  Private/Admin
router.delete('/employees/:id', protect, admin, async (req, res) => {
  try {
    const employee = await User.findOne({ id: req.params.id });
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ success: false, message: 'Server error deleting employee' });
  }
});

// @route   PUT /api/admin/chits/:chitId/assign
// @desc    Assign a chit to an employee
// @access  Private/Admin
router.put('/chits/:chitId/assign', protect, admin, async (req, res) => {
  try {
    const { employeeId } = req.body; // Can be null to unassign
    
    if (employeeId) {
      const employee = await User.findOne({ id: employeeId });
      if (!employee || employee.role !== 'employee') {
        return res.status(400).json({ success: false, message: 'Invalid employee ID' });
      }
    }

    const chit = await Chit.findByIdAndUpdate(req.params.chitId, { createdBy: employeeId || null }, { new: true }).populate('createdBy', 'name');
    const creatorName = chit?.createdBy?.name || 'staff member';

    res.json({ 
      success: true, 
      message: employeeId ? `Chit assigned to ${creatorName}` : 'Chit unassigned',
      data: chit 
    });
  } catch (error) {
    console.error('Error assigning chit:', error);
    res.status(500).json({ success: false, message: 'Server error assigning chit' });
  }
});

// @route   GET /api/admin/frozen-months
// @desc    Get all taken payments (frozen months) across chits
// @access  Private/Staff
router.get('/frozen-months', protect, staff, async (req, res) => {
  try {
    const isEmp = req.user.role === 'employee';
    
    // Fetch all freezes. If employee, only for chits they created.
    let freezeFilter = {};
    if (isEmp) {
      const empChits = await Chit.find({ createdBy: req.user.id }).select('_id').lean();
      freezeFilter.chitId = { $in: empChits.map(c => c._id) };
    }
    const rawFreezes = await ChitFreeze.find(freezeFilter)
      .populate('chitId')
      .populate('userId')
      .sort({ createdAt: -1 })
      .lean();
    const freezes = rawFreezes.map(f => ({
      ...f,
      id: f._id.toString(),
      chit: f.chitId ? { ...f.chitId, id: f.chitId._id ? f.chitId._id.toString() : f.chitId.id } : null,
      user: f.userId ? { ...f.userId, id: f.userId._id ? f.userId._id.toString() : f.userId.id } : null
    }));

    res.json({ success: true, data: freezes });
  } catch (error) {
    console.error('Error fetching frozen months:', error);
    res.status(500).json({ success: false, message: 'Server error fetching frozen months' });
  }
});

// @route   POST /api/admin/audit-logs/page-view
// @desc    Log tab navigation / page view event
// @access  Private/Staff
router.post('/audit-logs/page-view', protect, staff, async (req, res) => {
  try {
    const { tabName, module: modName } = req.body;
    if (tabName) {
      await logAuditEvent({
        req,
        module: modName || 'system',
        action: `Accessed Tab: ${tabName}`,
        result: 'Success',
        severity: 'Info'
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging tab navigation:', error);
    res.status(500).json({ success: false, message: 'Server error logging tab navigation' });
  }
});

// @route   GET /api/admin/audit-logs
// @desc    Fetch filtered audit logs
// @access  Private/Staff
router.get('/audit-logs', protect, staff, async (req, res) => {
  try {
    const { search, severity, module: modFilter } = req.query;

    const where = {};

    if (severity && severity !== 'All') {
      where.severity = severity;
    }

    if (modFilter && modFilter !== 'All') {
      if (modFilter === 'payments') {
        where.module = { $in: ['payments', 'receipts'] };
      } else if (modFilter === 'chit_groups') {
        where.module = { $in: ['chit_groups', 'chits', 'chit_schemes'] };
      } else {
        where.module = modFilter;
      }
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.$or = [
        { userEmail: { $regex: q, $options: 'i' } },
        { action: { $regex: q, $options: 'i' } },
        { module: { $regex: q, $options: 'i' } },
        { recordId: { $regex: q, $options: 'i' } },
        { userRole: { $regex: q, $options: 'i' } }
      ];
    }

    const rawLogs = await AuditLog.find(where).sort({ createdAt: -1 }).limit(100).lean();
    const logs = rawLogs.map(l => ({ ...l, id: l._id.toString() }));

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error fetching audit logs' });
  }
});

// @route   GET /api/admin/audit-logs/export
// @desc    Export audit logs as CSV
// @access  Private/Staff
router.get('/audit-logs/export', protect, staff, async (req, res) => {
  try {
    const rawLogs = await AuditLog.find().sort({ createdAt: -1 }).lean();
    const logs = rawLogs.map(l => ({ ...l, id: l._id.toString() }));


    let csvContent = 'DATE / TIME,USER,ROLE,MODULE,ACTION,RECORD,RESULT,SEVERITY\n';

    logs.forEach((log) => {
      const formattedDate = new Date(log.createdAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const line = [
        `"${formattedDate}"`,
        `"${log.userEmail || ''}"`,
        `"${log.userRole || ''}"`,
        `"${log.module || ''}"`,
        `"${log.action || ''}"`,
        `"${log.recordId || ''}"`,
        `"${log.result || ''}"`,
        `"${log.severity || ''}"`
      ].join(',');
      csvContent += line + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error exporting audit logs' });
  }
});

module.exports = router;


