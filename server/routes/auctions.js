const express = require('express');
const router = express.Router();
const { User, Chit, ChitMember, Payment, Auction, ChitFreeze, AuditLog, CustomerDocument } = require('../models');
const { protect, staff, admin } = require('../middleware/authMiddleware');
const { upload, isCloudinaryConfigured } = require('../config/cloudinary');
const { calculateBidAuctionResult } = require('../utils/auctionLogic');
const { logAuditEvent } = require('../utils/auditLogger');


const getFileUrl = (file) => {
  if (!file) return null;
  return isCloudinaryConfigured ? file.path : `/uploads/${file.filename}`;
};

const getPublicId = (file) => {
  if (!file) return null;
  return file.filename;
};

// @route   GET /api/auctions
// @desc    Get all recorded auctions (filterable by chitId)
// @access  Public / Private
router.get('/', async (req, res) => {
  try {
    const { chitId } = req.query;
    const filter = chitId ? { chitId } : {};

    const rawAuctions = await Auction.find(filter)
      .populate('chitId', 'name chitValue totalMembers durationMonths monthlyContribution')
      .populate('winningMemberId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    const auctions = rawAuctions.map(a => {
      const item = { ...a, id: a._id ? a._id.toString() : a.id };
      if (a.chitId) item.chit = a.chitId;
      if (a.winningMemberId) item.winningMember = a.winningMemberId;
      return item;
    });

    res.json({ success: true, count: auctions.length, data: auctions });
  } catch (error) {
    console.error('Error fetching auctions:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving auction records' });
  }
});

// @route   POST /api/auctions
// @desc    Record monthly auction result
// @access  Private / Staff / Admin
router.post('/', protect, staff, upload.single('receipt'), async (req, res) => {
  try {
    const {
      chitId,
      monthNumber,
      auctionDate,
      winningBidDiscount,
      winningMemberId,
      winningChitMemberId,
      winningTicket,
      auctionNotes,
      payoutMethod = 'Bank Transfer (NEFT / RTGS / IMPS)',
      beneficiaryBankName,
      bankUtr
    } = req.body;

    if (!chitId || !monthNumber || !winningBidDiscount || (!winningMemberId && !winningChitMemberId)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide chitId, monthNumber, winningBidDiscount, and winningMemberId/winningChitMemberId'
      });
    }

    const chit = await Chit.findById(chitId).lean();

    if (!chit) {
      return res.status(404).json({ success: false, message: 'Chit scheme not found' });
    }
    chit.members = await ChitMember.find({ chitId }).lean();

    // Check if month already has an auction
    const existingAuction = await Auction.findOne({
      chitId,
      monthNumber: Number(monthNumber)
    });

    if (existingAuction) {
      return res.status(400).json({
        success: false,
        message: `Auction for Month ${monthNumber} in "${chit.name}" has already been recorded.`
      });
    }

    // Verify winning ticket/member is part of this chit
    let memberEntry = null;
    if (winningChitMemberId) {
      memberEntry = chit.members.find(m => m.id === winningChitMemberId && m.status === 'approved');
    } else if (winningTicket) {
      memberEntry = chit.members.find(m => (m.ticketId === winningTicket || m.id === winningTicket) && m.status === 'approved');
    }
    if (!memberEntry && winningMemberId) {
      memberEntry = chit.members.find(m => m.userId === winningMemberId && m.status === 'approved');
    }

    if (!memberEntry && req.user.role !== 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Selected winner is not an approved member of this chit group'
      });
    }

    const finalUserId = memberEntry ? memberEntry.userId : winningMemberId;
    const rawTicket = winningTicket || memberEntry?.ticketId || `MEMBER-${memberEntry?.slotNumber || 1}`;
    const finalTicket = rawTicket ? rawTicket.replace(/^TICKET-/, 'MEMBER-') : rawTicket;

    // Check if this specific member slot has already won an auction in this chit
    const ticketAlreadyWon = await Auction.findOne({
        chitId,
        OR: [
          ...(memberEntry ? [{ winningChitMemberId: memberEntry.id }] : []),
          ...(finalTicket ? [{ winningTicket: finalTicket }] : [])
        ]
      });

    if (ticketAlreadyWon) {
      return res.status(400).json({
        success: false,
        message: `Member "${finalTicket}" has already won an auction in Month ${ticketAlreadyWon.monthNumber}. Other member slots for this user remain eligible.`
      });
    }

    // Server Financial Calculation (Safe math engine)
    const chitValue = Number(chit.chitValue);
    const duration = Number(chit.durationMonths);
    const discount = Number(winningBidDiscount);
    const nominalMonthly = Number(chit.monthlyContribution) || Math.round(chitValue / duration);
    
    const isFixedScheme = chit.termsAndConditions && chit.termsAndConditions.toLowerCase().includes('fixed');

    let foremanCommission = 0;
    let winnerPayout = chitValue - discount;
    let distributablePool = 0;
    let dividendPerMember = 0;
    let nextPayableAmount = nominalMonthly;

    const isLastMonth = Number(monthNumber) >= duration;

    if (!isFixedScheme) {
      let commissionPercent = 5;
      if (chit.termsAndConditions && chit.termsAndConditions.includes('Foreman Commission:')) {
        const match = chit.termsAndConditions.match(/Foreman Commission:\s*(\d+)%/i);
        if (match && match[1]) {
          commissionPercent = Number(match[1]);
        }
      }
      foremanCommission = Math.round(chitValue * (commissionPercent / 100));
      distributablePool = Math.max(0, discount - foremanCommission);
      dividendPerMember = Math.round(distributablePool / chit.totalMembers);
      nextPayableAmount = isLastMonth ? 0 : Math.max(0, nominalMonthly - dividendPerMember);
    } else {
      nextPayableAmount = isLastMonth ? 0 : nominalMonthly;
    }

    const receiptUrl = req.file ? getFileUrl(req.file) : null;
    const receiptPublicId = req.file ? getPublicId(req.file) : null;

    const auction = await Auction.create({
      chitId,
      monthNumber: Number(monthNumber),
      auctionDate: auctionDate ? new Date(auctionDate) : new Date(),
      winningBidDiscount: discount,
      foremanCommission,
      winnerPayout,
      distributablePool,
      dividendPerMember,
      nextPayableAmount,
      winningMemberId: finalUserId,
      winningChitMemberId: memberEntry ? (memberEntry.id || memberEntry._id) : null,
      winningTicket: finalTicket,
      auctionNotes: auctionNotes || '',
      payoutMethod,
      beneficiaryBankName: beneficiaryBankName || null,
      bankUtr: bankUtr || null,
      receiptUrl,
      receiptPublicId
    });

    // Advance chit's current month or mark completed if it's the final month
    if (isLastMonth) {
      await Chit.findByIdAndUpdate(chitId, { currentMonth: duration, status: 'completed' });
    } else if (Number(monthNumber) >= chit.currentMonth && chit.currentMonth < duration) {
      await Chit.findByIdAndUpdate(chitId, { currentMonth: Number(monthNumber) + 1 });
    }

    await logAuditEvent({
      req,
      module: 'auctions',
      action: 'Auction Winner Recorded',
      recordId: auction.id,
      result: 'Success',
      severity: 'Info',
      details: `Winner: ${finalTicket || finalUserId}, Month ${monthNumber}, Payout ₹${winnerPayout}`
    });

    res.status(201).json({
      success: true,
      message: `Auction for Month ${monthNumber} recorded successfully!`,
      data: auction
    });
  } catch (error) {
    console.error('Error creating auction:', error);
    res.status(500).json({ success: false, message: 'Server error recording auction' });
  }
});

// @route   DELETE /api/auctions/:id
// @desc    Delete an auction record
// @access  Private / Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    await Auction.findByIdAndDelete(id);

    await logAuditEvent({
      req,
      module: 'auctions',
      action: 'Delete Auction Record',
      recordId: auction.id,
      result: 'Success',
      severity: 'Warning',
      details: `Deleted auction for Month ${auction.monthNumber}`
    });

    res.json({ success: true, message: 'Auction record deleted successfully' });
  } catch (error) {
    console.error('Error deleting auction:', error);
    res.status(500).json({ success: false, message: 'Server error deleting auction' });
  }
});


module.exports = router;
