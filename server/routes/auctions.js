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
      .populate('chitId', 'name chitValue totalMembers durationMonths monthlyContribution status currentMonth')
      .populate('winningMemberId', 'name email phone memberId profileImgUrl')
      .populate('participatingUserIds', 'name email phone memberId profileImgUrl')
      .sort({ createdAt: -1 })
      .lean();

    const auctions = rawAuctions.map(a => {
      const item = { ...a, id: a._id ? a._id.toString() : a.id };
      if (a.chitId) item.chit = a.chitId;
      if (a.winningMemberId) item.winningMember = a.winningMemberId;
      if (a.participatingUserIds) {
        item.participatingUsers = a.participatingUserIds.map(u => ({
          ...u,
          id: u._id ? u._id.toString() : u.id
        }));
      } else {
        item.participatingUsers = [];
      }
      return item;
    });

    res.json({ success: true, count: auctions.length, data: auctions });
  } catch (error) {
    console.error('Error fetching auctions:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving auction records' });
  }
});

// @route   POST /api/auctions
// @desc    Record monthly auction: chit, month, participating users, winning user, auctioned amount, and payment proof
// @access  Private / Staff / Admin
router.post('/', protect, staff, upload.single('receipt'), async (req, res) => {
  try {
    const {
      chitId,
      monthNumber,
      auctionDate,
      auctionAmount,
      winnerPayout,
      winningMemberId,
      winningChitMemberId,
      winningTicket,
      participatingUserIds,
      auctionNotes,
      payoutMethod = 'Bank Transfer (NEFT / RTGS / IMPS)',
      beneficiaryBankName,
      bankUtr
    } = req.body;

    const parsedAuctionAmount = Number(auctionAmount !== undefined ? auctionAmount : winnerPayout);

    if (!chitId || !monthNumber || isNaN(parsedAuctionAmount) || (!winningMemberId && !winningChitMemberId)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide chitId, monthNumber, winning member, and auctioned amount.'
      });
    }

    const chit = await Chit.findById(chitId).lean();
    if (!chit) {
      return res.status(404).json({ success: false, message: 'Chit scheme not found.' });
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

    // Verify winning member is part of this chit
    let memberEntry = null;
    if (winningChitMemberId) {
      memberEntry = chit.members.find(m => (m._id?.toString() === winningChitMemberId || m.id === winningChitMemberId) && m.status === 'approved');
    } else if (winningTicket) {
      memberEntry = chit.members.find(m => (m.ticketId === winningTicket || m.id === winningTicket) && m.status === 'approved');
    }
    if (!memberEntry && winningMemberId) {
      memberEntry = chit.members.find(m => (m.userId?.toString() === winningMemberId || m.userId === winningMemberId) && m.status === 'approved');
    }

    if (!memberEntry && req.user.role !== 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Selected winner is not an approved member of this chit group.'
      });
    }

    const finalUserId = memberEntry ? (memberEntry.userId?.toString() || memberEntry.userId) : winningMemberId;
    const rawTicket = winningTicket || memberEntry?.ticketId || `MEMBER-${memberEntry?.slotNumber || 1}`;
    const finalTicket = rawTicket ? rawTicket.replace(/^TICKET-/, 'MEMBER-') : rawTicket;

    // Check if this specific ticket slot already won
    if (memberEntry) {
      const ticketAlreadyWon = await Auction.findOne({
        chitId,
        $or: [
          { winningChitMemberId: memberEntry._id || memberEntry.id },
          { winningTicket: finalTicket }
        ]
      });
      if (ticketAlreadyWon) {
        return res.status(400).json({
          success: false,
          message: `Ticket "${finalTicket}" has already won an auction in Month ${ticketAlreadyWon.monthNumber}.`
        });
      }
    }

    // Parse participating users
    let parsedParticipants = [];
    if (participatingUserIds) {
      if (Array.isArray(participatingUserIds)) {
        parsedParticipants = participatingUserIds;
      } else if (typeof participatingUserIds === 'string') {
        try {
          parsedParticipants = JSON.parse(participatingUserIds);
        } catch {
          parsedParticipants = participatingUserIds.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    // Ensure winner is among participants
    if (finalUserId && !parsedParticipants.includes(finalUserId)) {
      parsedParticipants.push(finalUserId);
    }

    const receiptUrl = req.file ? getFileUrl(req.file) : null;
    const receiptPublicId = req.file ? getPublicId(req.file) : null;

    const auction = await Auction.create({
      chitId,
      monthNumber: Number(monthNumber),
      auctionDate: auctionDate ? new Date(auctionDate) : new Date(),
      auctionAmount: parsedAuctionAmount,
      winnerPayout: parsedAuctionAmount,
      winningBidDiscount: Math.max(0, (chit.chitValue || 0) - parsedAuctionAmount),
      foremanCommission: 0,
      distributablePool: 0,
      dividendPerMember: 0,
      nextPayableAmount: chit.monthlyContribution || 0,
      participatingUserIds: parsedParticipants,
      winningMemberId: finalUserId,
      winningChitMemberId: memberEntry ? (memberEntry.id || memberEntry._id) : null,
      winningTicket: finalTicket,
      auctionNotes: auctionNotes || '',
      payoutMethod,
      beneficiaryBankName: beneficiaryBankName || null,
      bankUtr: bankUtr || null,
      receiptUrl,
      receiptPublicId,
      recordedBy: req.user._id || req.user.id
    });

    // Advance chit's current month or mark completed if it's the final month
    const duration = Number(chit.durationMonths);
    const isLastMonth = Number(monthNumber) >= duration;
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
      details: `Winner: ${finalTicket || finalUserId}, Month ${monthNumber}, Auctioned Amount ₹${parsedAuctionAmount}`
    });

    res.status(201).json({
      success: true,
      message: `Auction for Month ${monthNumber} recorded successfully!`,
      data: auction
    });
  } catch (error) {
    console.error('Error creating auction:', error);
    res.status(500).json({ success: false, message: 'Server error recording auction: ' + error.message });
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
