const express = require('express');
const router = express.Router();
const { User, Chit, ChitMember, Payment, Auction, ChitFreeze, AuditLog, CustomerDocument } = require('../models');
const { protect, admin, staff } = require('../middleware/authMiddleware');
const { upload, isCloudinaryConfigured } = require('../config/cloudinary');
const { logAuditEvent } = require('../utils/auditLogger');
const receiptPdfService = require('../utils/receiptPdfService');


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

// @route   POST /api/payments/submit
// @desc    Submit proof of payment for a chit monthly contribution
// @access  Private
router.post('/submit', protect, upload.single('proof'), async (req, res) => {
  try {
    const { chitId, monthNumber, amount, transactionId } = req.body;

    if (!chitId || !monthNumber || !amount || !transactionId) {
      return res.status(400).json({ success: false, message: 'Please provide all payment details' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload payment receipt screenshot' });
    }

    const chit = await Chit.findById(chitId).lean();
    if (!chit) {
      return res.status(404).json({ success: false, message: 'Chit not found' });
    }
    chit.members = await ChitMember.find({ chitId }).lean();

    const isApprovedMember = chit.members.some(
      (m) => (m.userId?.toString() === req.user.id.toString()) && m.status === 'approved'
    );

    if (!isApprovedMember) {
      return res.status(403).json({ success: false, message: 'You are not an approved member of this chit fund' });
    }

    const targetSlotNumber = Number(req.body.slotNumber || 1);

    const existingPayment = await Payment.findOne({
      userId: req.user.id,
      chitId: chitId,
      monthNumber: Number(monthNumber),
      slotNumber: targetSlotNumber
    });

    if (existingPayment) {
      // Allow resubmission when: rejected, edit_requested, or pending WITH an admin remark
      const canResubmit =
        existingPayment.status === 'rejected' ||
        existingPayment.status === 'edit_requested' ||
        (existingPayment.status === 'pending' && existingPayment.remarks && existingPayment.remarks.trim() !== '');

      if (canResubmit) {
        const updatedPayment = await Payment.findByIdAndUpdate(existingPayment.id, {
            transactionId,
            amount: Number(amount),
            proofImgUrl: getFileUrl(req.file),
            proofPublicId: getPublicId(req.file),
            status: 'pending',
            remarks: ''
          });
        return res.json({ success: true, message: 'Payment proof resubmitted successfully!', data: updatedPayment });
      }
      return res.status(400).json({
        success: false,
        message: `Payment proof for Month ${monthNumber} is already ${existingPayment.status}`,
      });
    }

    const payment = await Payment.create({
        userId: req.user.id,
        chitId: chitId,
        monthNumber: Number(monthNumber),
        slotNumber: targetSlotNumber,
        amount: Number(amount),
        transactionId,
        proofImgUrl: getFileUrl(req.file),
        proofPublicId: getPublicId(req.file),
        status: 'pending',
      });

    res.status(201).json({
      success: true,
      message: 'Payment proof submitted. Admin will verify shortly.',
      data: payment,
    });
  } catch (error) {
    console.error('Error submitting payment:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error submitting payment proof' });
  }
});

// @route   GET /api/payments/my-payments
// @desc    Get current user's payments
// @access  Private
router.get('/my-payments', protect, async (req, res) => {
  try {
    const rawPayments = await Payment.find({ userId: req.user.id })
      .populate('chitId')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    const payments = await Promise.all(rawPayments.map(async (p) => {
      const item = { ...p, id: p._id ? p._id.toString() : p.id };
      if (p.chitId) {
        const c = typeof p.chitId === 'object' ? { ...p.chitId, id: p.chitId._id ? p.chitId._id.toString() : p.chitId.id } : {};
        c.auctions = await Auction.find({ chitId: c._id || c.id })
          .populate('winningMemberId', 'name memberId email phone')
          .populate('winningChitMemberId')
          .sort({ monthNumber: -1 })
          .lean();
        item.chit = c;
      }
      if (p.userId) {
        item.user = typeof p.userId === 'object' ? { ...p.userId, id: p.userId._id ? p.userId._id.toString() : p.userId.id } : {};
      }
      return item;
    }));

    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: 'Server error fetching payments' });
  }
});

// @route   GET /api/payments/pending
// @desc    Get all pending payments for admin review
// @access  Private/Staff
router.get('/pending', protect, staff, async (req, res) => {
  try {
    const isEmp = req.user.role === 'employee';

    let chitIds = null;
    if (isEmp) {
      const empChits = await Chit.find({ createdBy: req.user.id }).select('_id').lean();
      chitIds = empChits.map(c => c._id);
    }

    const query = { status: 'pending' };
    if (chitIds) {
      query.chitId = { $in: chitIds };
    }

    const rawPayments = await Payment.find(query)
      .populate('userId', 'name email phone')
      .populate('chitId', 'name chitValue monthlyContribution currentMonth createdBy')
      .sort({ createdAt: 1 })
      .lean();

    const payments = rawPayments.map(p => {
      const item = { ...p, id: p._id ? p._id.toString() : p.id };
      if (p.userId) item.user = p.userId;
      if (p.chitId) item.chit = p.chitId;
      return item;
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ success: false, message: 'Server error fetching pending payments' });
  }
});

// @route   POST /api/payments/:id/verify
// @desc    Approve or reject user payment proof
// @access  Private/Staff
router.post('/:id/verify', protect, staff, async (req, res) => {
  try {
    const { status, remarks } = req.body; // status: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Please provide status approved or rejected' });
    }

    const payment = await Payment.findById(req.params.id).populate('chitId');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (req.user.role === 'employee' && payment.chitId?.createdBy && payment.chitId.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this chit' });
    }

    const updatedPayment = await Payment.findByIdAndUpdate(payment.id, {
        status,
        remarks: remarks || '',
        verifiedAt: new Date()
      });

    let receiptData = null;
    if (status === 'approved') {
      const chit = await Chit.findById(payment.chitId);
      const user = await User.findById(payment.userId);

      if (chit && user) {
        try {
          const userSlots = await ChitMember.countDocuments({ chitId: chit._id, userId: user._id, status: 'approved' }) || 1;
          const configObj = (chit.monthlyDues || []).find(d => d.monthNumber === payment.monthNumber);
          const configuredDue = configObj ? Number(configObj.dueAmount || 0) : (chit.monthlyContribution || 0);
          const totalDue = configuredDue * userSlots;

          const allApprovedPayments = await Payment.find({
            chitId: chit._id,
            userId: user._id,
            monthNumber: payment.monthNumber,
            status: 'approved'
          }).lean();

          const totalPaidSoFar = allApprovedPayments.reduce((acc, p) => acc + (p.amount || 0), 0) + (payment.amount || 0);
          const remainingDue = Math.max(0, totalDue - totalPaidSoFar);
          const excessAmount = totalPaidSoFar > totalDue ? (totalPaidSoFar - totalDue) : 0;

          receiptData = await receiptPdfService.generateAndUploadReceipt({
            chit,
            user,
            payment,
            monthNumber: payment.monthNumber,
            amountPaid: payment.amount,
            paymentMode: payment.paymentMode || 'UPI/Online',
            paymentDate: payment.paymentDate || new Date(),
            transactionId: payment.transactionId,
            receiptNo: payment.receiptNo,
            configuredDue,
            userSlots,
            totalPaidSoFar
          });

          await Payment.findByIdAndUpdate(payment.id, {
            receiptUrl: receiptData.receiptUrl,
            receiptPublicId: receiptData.receiptPublicId,
            receiptNo: receiptData.receiptNo,
            dueAmount: totalDue,
            remainingDue,
            excessAmount,
            digitalSignature: receiptData.digitalSignature,
            whatsappText: receiptData.whatsappText
          });
        } catch (receiptErr) {
          console.error('Error generating receipt on verify:', receiptErr);
        }
      }

      await logAuditEvent({
        req,
        module: 'receipts',
        action: 'Receipt Generated',
        recordId: payment.id,
        result: 'Success',
        severity: 'Info',
        details: `Approved payment of ₹${payment.amount}. Receipt saved in Cloudinary.`
      });

      if (chit) {
        const approvedMembersCount = await ChitMember.countDocuments({ chitId: chit._id, status: 'approved' });
        const paymentsForMonth = await Payment.countDocuments({
          chitId: chit._id,
          monthNumber: chit.currentMonth,
          status: 'approved',
        });

        if (paymentsForMonth >= approvedMembersCount && approvedMembersCount > 0) {
          const newStatus = chit.currentMonth >= chit.durationMonths ? 'completed' : chit.status;
          const newMonth = chit.currentMonth >= chit.durationMonths ? chit.currentMonth : chit.currentMonth + 1;
          
          await Chit.findByIdAndUpdate(chit._id, { status: newStatus, currentMonth: newMonth });
        }
      }
    } else {
      await logAuditEvent({
        req,
        module: 'payments',
        action: 'Payment Proof Rejected',
        recordId: payment.id,
        result: 'Failed',
        severity: 'Warning',
        details: remarks ? `Remarks: ${remarks}` : 'Payment rejected by admin'
      });
    }

    const finalPayment = await Payment.findById(payment.id);

    res.json({
      success: true,
      message: `Payment status updated to ${status}. ${receiptData ? 'Receipt generated & saved to Cloudinary.' : ''}`,
      data: finalPayment,
      receiptUrl: receiptData?.receiptUrl || finalPayment?.receiptUrl,
      whatsappUrl: receiptData?.whatsappUrl || null,
      whatsappText: receiptData?.whatsappText || finalPayment?.whatsappText
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Server error verifying payment' });
  }
});

// @route   GET /api/payments/chit/:chitId/matrix
// @desc    Get member payment matrix & installment ledger for a chit
// @access  Private/Staff
router.get('/chit/:chitId/matrix', protect, staff, async (req, res) => {
  try {
    const rawChit = await Chit.findById(req.params.chitId).lean();

    if (!rawChit) {
      return res.status(404).json({ success: false, message: 'Chit group not found' });
    }

    if (req.user.role === 'employee' && rawChit.createdBy && rawChit.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this chit group' });
    }

    const chit = { ...rawChit, id: rawChit._id ? rawChit._id.toString() : rawChit.id };
    chit.creator = rawChit.createdBy ? await User.findById(rawChit.createdBy).select('name role').lean() : null;

    const members = await ChitMember.find({ chitId: chit.id, status: 'approved' }).populate('userId', 'name email phone').lean();
    chit.members = members.map(m => {
      const mem = { ...m, id: m._id ? m._id.toString() : m.id };
      if (m.userId) {
        mem.user = typeof m.userId === 'object' ? { ...m.userId, id: m.userId._id ? m.userId._id.toString() : m.userId.id } : null;
      }
      return mem;
    });

    const freezes = await ChitFreeze.find({ chitId: chit.id }).populate('userId', 'name').lean();
    chit.freezes = freezes.map(f => {
      const frz = { ...f, id: f._id ? f._id.toString() : f.id };
      if (f.userId) {
        frz.user = typeof f.userId === 'object' ? { ...f.userId, id: f.userId._id ? f.userId._id.toString() : f.userId.id } : null;
      }
      return frz;
    });

    const payments = await Payment.find({ chitId: chit.id }).populate('userId', 'name phone').lean();
    chit.payments = payments.map(p => {
      const pay = { ...p, id: p._id ? p._id.toString() : p.id };
      if (p.userId) {
        pay.user = typeof p.userId === 'object' ? { ...p.userId, id: p.userId._id ? p.userId._id.toString() : p.userId.id } : null;
      }
      return pay;
    });

    const rawAuctions = await Auction.find({ chitId: chit.id })
      .populate('winningMemberId', 'name email phone memberId profileImgUrl')
      .sort({ monthNumber: 1 })
      .lean();
    chit.auctions = rawAuctions.map(a => ({
      ...a,
      id: a._id ? a._id.toString() : a.id,
      winningMember: a.winningMemberId
    }));

    res.json({ success: true, data: chit });
  } catch (error) {
    console.error('Error fetching chit payment matrix:', error);
    res.status(500).json({ success: false, message: 'Server error fetching payment matrix' });
  }
});

// @route   POST /api/payments/admin-toggle-status
// @desc    Admin manually sets a member payment status to Paid or Unpaid
// @access  Private/Staff
router.post('/admin-toggle-status', protect, staff, async (req, res) => {
  try {
    const { chitId, userId, monthNumber, status, paymentMode, remarks, transactionId } = req.body;

    if (!chitId || !userId || !monthNumber || !status) {
      return res.status(400).json({ success: false, message: 'Chit ID, User ID, Month Number, and Status are required' });
    }

    if (!['paid', 'unpaid'].includes(status.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Status must be either "paid" or "unpaid"' });
    }

    const chit = await Chit.findById(chitId).lean();
    if (!chit) {
      return res.status(404).json({ success: false, message: 'Chit not found' });
    }

    if (req.user.role === 'employee' && chit.createdBy && chit.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to manage this chit' });
    }

    const member = await ChitMember.findOne({ chitId, userId, status: 'approved' }).lean();
    if (!member) {
      return res.status(400).json({ success: false, message: 'User is not an approved member of this chit' });
    }

    const targetUser = await User.findById(userId).select('name').lean();

    const mNum = Number(monthNumber);
    if (mNum < 1 || mNum > chit.durationMonths) {
      return res.status(400).json({ success: false, message: `Invalid month number. Must be between 1 and ${chit.durationMonths}` });
    }

    const existingPayment = await Payment.findOne({
      userId,
      chitId,
      monthNumber: mNum
    });

    if (status.toLowerCase() === 'paid') {
      const modeText = paymentMode || 'Cash/Manual Entry';
      const remarkText = remarks ? `${modeText} - ${remarks}` : `${modeText} (Marked by Admin)`;
      const txnRef = transactionId || (existingPayment?.transactionId ? existingPayment.transactionId : `OFFLINE_${Date.now().toString().slice(-6)}`);
      
      let updatedOrCreated;
      if (existingPayment) {
        updatedOrCreated = await Payment.findByIdAndUpdate(existingPayment.id, {
            status: 'approved',
            remarks: remarkText,
            transactionId: txnRef,
            verifiedAt: new Date()
          }, { new: true });
      } else {
        updatedOrCreated = await Payment.create({
            userId,
            chitId,
            monthNumber: mNum,
            amount: chit.monthlyContribution,
            transactionId: txnRef,
            proofImgUrl: 'MANUAL_ADMIN_ENTRY',
            status: 'approved',
            remarks: remarkText,
            verifiedAt: new Date()
          });
      }

      // Generate Cloudinary Receipt & WhatsApp message
      let receiptData = null;
      try {
        const fullUser = await User.findById(userId);
        const userSlots = await ChitMember.countDocuments({ chitId, userId, status: 'approved' }) || 1;
        const configObj = (chit.monthlyDues || []).find(d => d.monthNumber === mNum);
        const configuredDue = configObj ? Number(configObj.dueAmount || 0) : (chit.monthlyContribution || 0);
        const totalDue = configuredDue * userSlots;

        const allApprovedPayments = await Payment.find({
          chitId,
          userId,
          monthNumber: mNum,
          status: 'approved'
        }).lean();

        const totalPaidSoFar = allApprovedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
        const remainingDue = Math.max(0, totalDue - totalPaidSoFar);
        const excessAmount = totalPaidSoFar > totalDue ? (totalPaidSoFar - totalDue) : 0;

        receiptData = await receiptPdfService.generateAndUploadReceipt({
          chit,
          user: fullUser,
          payment: updatedOrCreated,
          monthNumber: mNum,
          amountPaid: updatedOrCreated.amount,
          paymentMode: paymentMode || 'Cash',
          paymentDate: updatedOrCreated.paymentDate || new Date(),
          transactionId: txnRef,
          receiptNo: updatedOrCreated.receiptNo,
          configuredDue,
          userSlots,
          totalPaidSoFar
        });

        updatedOrCreated.receiptUrl = receiptData.receiptUrl;
        updatedOrCreated.receiptPublicId = receiptData.receiptPublicId;
        updatedOrCreated.receiptNo = receiptData.receiptNo;
        updatedOrCreated.dueAmount = totalDue;
        updatedOrCreated.remainingDue = remainingDue;
        updatedOrCreated.excessAmount = excessAmount;
        updatedOrCreated.digitalSignature = receiptData.digitalSignature;
        updatedOrCreated.whatsappText = receiptData.whatsappText;
        await updatedOrCreated.save();
      } catch (receiptErr) {
        console.error('Error generating receipt on toggle status:', receiptErr);
      }

      // Check if all approved members for chit.currentMonth are now paid
      const approvedMembersCount = await ChitMember.countDocuments({ chitId, status: 'approved' });
      const approvedPaymentsForMonth = await Payment.countDocuments({ chitId, monthNumber: chit.currentMonth, status: 'approved' });

      if (approvedPaymentsForMonth >= approvedMembersCount && approvedMembersCount > 0) {
        const newStatus = chit.currentMonth >= chit.durationMonths ? 'completed' : chit.status;
        const newMonth = chit.currentMonth >= chit.durationMonths ? chit.currentMonth : chit.currentMonth + 1;
        await Chit.findByIdAndUpdate(chitId, { status: newStatus, currentMonth: newMonth });
      }

      return res.json({
        success: true,
        message: `Month ${mNum} marked as PAID for ${targetUser?.name || 'member'} successfully. Receipt generated & saved in Cloudinary!`,
        data: updatedOrCreated,
        receiptUrl: receiptData?.receiptUrl || updatedOrCreated?.receiptUrl,
        whatsappUrl: receiptData?.whatsappUrl || null,
        whatsappText: receiptData?.whatsappText || updatedOrCreated?.whatsappText
      });
    } else {
      // status === 'unpaid'
      if (existingPayment) {
        await Payment.findByIdAndDelete(existingPayment.id);
      }

      return res.json({
        success: true,
        message: `Month ${mNum} marked as UNPAID (Due) for ${targetUser?.name || 'member'}.`,
        data: null
      });
    }
  } catch (error) {
    console.error('Error toggling member payment status:', error);
    res.status(500).json({ success: false, message: 'Server error updating payment status' });
  }
});

// @route   GET /api/payments/all-history
// @desc    Get all payments across all chits for admin/staff history & reporting
// @access  Private/Staff
router.get('/all-history', protect, staff, async (req, res) => {
  try {
    const isEmp = req.user.role === 'employee';
    const { chitId, status } = req.query;

    let allowedChitIds = null;
    if (isEmp) {
      const empChits = await Chit.find({ createdBy: req.user.id }).select('_id').lean();
      allowedChitIds = empChits.map(c => c._id);
    }

    const query = {};
    if (chitId && chitId !== 'all') {
      query.chitId = chitId;
    } else if (allowedChitIds) {
      query.chitId = { $in: allowedChitIds };
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const rawPayments = await Payment.find(query)
      .populate('userId', 'name email phone memberId')
      .populate({
        path: 'chitId',
        select: 'name chitValue monthlyContribution durationMonths currentMonth startDate endDate termsAndConditions'
      })
      .sort({ createdAt: -1 })
      .lean();

    const formattedPayments = await Promise.all(rawPayments.map(async (p) => {
      const item = { ...p, id: p._id ? p._id.toString() : p.id };
      if (p.userId) {
        item.user = typeof p.userId === 'object' ? { ...p.userId, id: p.userId._id ? p.userId._id.toString() : p.userId.id } : null;
      }
      if (p.chitId) {
        const c = typeof p.chitId === 'object' ? { ...p.chitId, id: p.chitId._id ? p.chitId._id.toString() : p.chitId.id } : {};
        c.members = await ChitMember.find({ chitId: c._id || c.id, status: 'approved' }).select('userId slotNumber ticketId').lean();
        c.auctions = await Auction.find({ chitId: c._id || c.id })
          .populate('winningMemberId', 'name memberId email phone')
          .populate('winningChitMemberId')
          .sort({ monthNumber: -1 })
          .lean();
        item.chit = c;
      }

      const member = (item.chit?.members || []).find(
        m => (m.userId?.toString() === item.userId?.toString() || m.userId?.toString() === item.userId?.id?.toString()) &&
          (m.slotNumber === item.slotNumber || (!item.slotNumber && m.slotNumber === 1))
      ) || (item.chit?.members || []).find(m => m.userId?.toString() === item.userId?.toString() || m.userId?.toString() === item.userId?.id?.toString());
      
      const rawTicketId = member?.ticketId || `MEMBER-${item.slotNumber || 1}`;
      item.ticketId = rawTicketId.replace(/^TICKET-/, 'MEMBER-');
      item.memberId = member ? (member.id || member._id?.toString()) : null;

      return item;
    }));

    res.json({ success: true, data: formattedPayments });
  } catch (error) {
    console.error('Error fetching all payment history:', error);
    res.status(500).json({ success: false, message: 'Server error fetching payment history' });
  }
});

// @route   GET /api/payments/receipt/verify/:receiptNo
// @desc    Public receipt verification & detail lookup by receipt number or auth hash
// @access  Public
router.get('/receipt/verify/:receiptNo', async (req, res) => {
  try {
    const { receiptNo } = req.params;
    if (!receiptNo) {
      return res.status(400).json({ success: false, message: 'Receipt number is required' });
    }

    const cleanReceiptNo = receiptNo.replace(/\.pdf$/i, '').trim();

    const payment = await Payment.findOne({
      $or: [
        { receiptNo: cleanReceiptNo },
        { receiptNo: { $regex: new RegExp(`^${cleanReceiptNo}$`, 'i') } },
        { 'digitalSignature.hash': cleanReceiptNo }
      ]
    })
      .populate('userId', 'name memberId phone')
      .populate('chitId', 'name monthlyContribution durationMonths startDate')
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: `Receipt "${cleanReceiptNo}" could not be found or verified.`
      });
    }

    return res.json({
      success: true,
      receipt: {
        receiptNo: payment.receiptNo,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentMode: payment.paymentMode || 'Cash',
        transactionId: payment.transactionId,
        monthNumber: payment.monthNumber,
        dueAmount: payment.dueAmount || 0,
        remainingDue: payment.remainingDue || 0,
        excessAmount: payment.excessAmount || 0,
        receiptUrl: payment.receiptUrl,
        digitalSignature: payment.digitalSignature || {
          hash: 'INA-AUTH-VERIFIED',
          signedBy: 'InaVolu Chit Funds Private Limited'
        },
        status: payment.status,
        userName: payment.userId?.name || 'Valued Member',
        memberId: payment.userId?.memberId || 'N/A',
        chitName: payment.chitId?.name || 'InaVolu Chit Scheme',
        monthlyContribution: payment.chitId?.monthlyContribution || 0,
        durationMonths: payment.chitId?.durationMonths || 0,
        startDate: payment.chitId?.startDate
      }
    });
  } catch (err) {
    console.error('Error verifying receipt:', err);
    return res.status(500).json({ success: false, message: 'Server error verifying receipt.' });
  }
});

// @route   GET /api/payments/receipt/download/:receiptNo
// @desc    Direct redirect/download to official PDF receipt
// @access  Public
router.get('/receipt/download/:receiptNo', async (req, res) => {
  try {
    const { receiptNo } = req.params;
    const cleanReceiptNo = (receiptNo || '').replace(/\.pdf$/i, '').trim();

    const payment = await Payment.findOne({
      $or: [
        { receiptNo: cleanReceiptNo },
        { receiptNo: { $regex: new RegExp(`^${cleanReceiptNo}$`, 'i') } },
        { 'digitalSignature.hash': cleanReceiptNo }
      ]
    }).lean();

    if (!payment || !payment.receiptUrl) {
      return res.status(404).send('Official receipt PDF not found');
    }

    return res.redirect(payment.receiptUrl);
  } catch (err) {
    console.error('Error downloading receipt PDF:', err);
    return res.status(500).send('Error loading receipt PDF');
  }
});

module.exports = router;

