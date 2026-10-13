const express = require('express');
const router = express.Router();
const { User, Chit, ChitMember, Payment, Auction, ChitFreeze, AuditLog, CustomerDocument } = require('../models');
const { protect, admin, staff } = require('../middleware/authMiddleware');
const { logAuditEvent } = require('../utils/auditLogger');
const {

  calculateFixedMonthlyPayment,
  generateFixedSchemeSchedule,
  calculateBidAuctionResult,
  generateBidSchemeSchedule,
  getChitSchemeDetails
} = require('../utils/auctionLogic');

// Helper to sort members by member number in ascending sequence (MEMBER-1, MEMBER-2, ...)
function sortMembersByTicket(members) {
  if (!Array.isArray(members)) return [];
  return [...members].sort((a, b) => {
    const numA = parseInt(String(a.ticketId || '').replace(/\D/g, ''), 10) || a.slotNumber || 0;
    const numB = parseInt(String(b.ticketId || '').replace(/\D/g, ''), 10) || b.slotNumber || 0;
    return numA - numB;
  });
}

// Helper to re-sequence all members of a chit so member IDs are strictly 1..N
async function resequenceChit(chitId) {
  try {
    const chit = await Chit.findById(chitId).lean();
    if (chit) {
      chit.members = await ChitMember.find({ chitId }).sort({ joinedAt: 1, createdAt: 1, _id: 1 }).lean();
    }

    if (!chit || !chit.members || chit.members.length === 0) return;

    const sorted = [...chit.members].sort((a, b) => {
      const numA = parseInt(String(a.ticketId || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.ticketId || '').replace(/\D/g, ''), 10) || 0;
      if (numA && numB) return numA - numB;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    let num = 1;
    for (const m of sorted) {
      const newTicketId = `MEMBER-${num}`;
      if (m.ticketId !== newTicketId || m.slotNumber !== num) {
        await ChitMember.findByIdAndUpdate(m.id, {
            ticketId: newTicketId,
            slotNumber: num
          });

        await ChitFreeze.updateMany({ chitId: chit.id, memberId: m.id }, { ticketId: newTicketId });

        await Auction.updateMany({ chitId: chit.id, winningChitMemberId: m.id }, { winningTicket: newTicketId });
      }
      num++;
    }
  } catch (err) {
    console.error(`Error resequencing chit ${chitId}:`, err);
  }
}

// Helper to populate chit with creator, members (with user), freezes, and auctions
async function populateChitDetails(chit) {
  if (!chit) return null;
  const chitObj = chit.toObject ? chit.toObject() : { ...chit };
  chitObj.id = chitObj._id ? chitObj._id.toString() : (chitObj.id || chitObj._id);

  if (chitObj.createdBy) {
    chitObj.creator = await User.findById(chitObj.createdBy).select('name role').lean();
  } else {
    chitObj.creator = null;
  }

  const rawMembers = await ChitMember.find({ chitId: chitObj._id || chitObj.id }).populate('userId', 'name email phone').lean();
  chitObj.members = rawMembers.map(m => {
    const mem = { ...m, id: m._id ? m._id.toString() : m.id };
    if (m.userId) {
      mem.user = typeof m.userId === 'object' ? { ...m.userId, id: m.userId._id ? m.userId._id.toString() : m.userId.id } : null;
      mem.userId = m.userId._id ? m.userId._id.toString() : (m.userId.id || m.userId);
    }
    return mem;
  });
  chitObj.members = sortMembersByTicket(chitObj.members);

  const rawFreezes = await ChitFreeze.find({ chitId: chitObj._id || chitObj.id }).populate('userId', 'name').lean();
  chitObj.freezes = rawFreezes.map(f => {
    const frz = { ...f, id: f._id ? f._id.toString() : f.id };
    if (f.userId) {
      frz.user = typeof f.userId === 'object' ? { ...f.userId, id: f.userId._id ? f.userId._id.toString() : f.userId.id } : null;
    }
    return frz;
  });

  const rawAuctions = await Auction.find({ chitId: chitObj._id || chitObj.id })
    .populate('winningMemberId', 'name email phone')
    .populate('winningChitMemberId')
    .sort({ monthNumber: -1 })
    .lean();
  chitObj.auctions = rawAuctions.map(a => {
    const auc = { ...a, id: a._id ? a._id.toString() : a.id };
    if (a.winningMemberId) {
      auc.winningMember = typeof a.winningMemberId === 'object' ? { ...a.winningMemberId, id: a.winningMemberId._id ? a.winningMemberId._id.toString() : a.winningMemberId.id } : null;
    }
    if (a.winningChitMemberId) {
      auc.winningChitMember = typeof a.winningChitMemberId === 'object' ? { ...a.winningChitMemberId, id: a.winningChitMemberId._id ? a.winningChitMemberId._id.toString() : a.winningChitMemberId.id } : null;
    }
    return auc;
  });

  return chitObj;
}

// @route   POST /api/chits/calculate-preview
// @desc    Calculate scheme preview schedule for any chit value & duration (Fixed or Bid)
// @access  Public / Private
router.post('/calculate-preview', (req, res) => {
  try {
    const { chitValue, durationMonths, monthlyContribution, schemeType = 'BID_AUCTION', foremanCommissionPercent = 5, minWinnerPercent = 70 } = req.body;
    
    if (!chitValue || !durationMonths) {
      return res.status(400).json({ success: false, message: 'chitValue and durationMonths are required' });
    }

    if (schemeType === 'FIXED_AMOUNT' || schemeType.toLowerCase().includes('fixed')) {
      const scheduleData = generateFixedSchemeSchedule({
        chitValue: Number(chitValue),
        durationMonths: Number(durationMonths),
        monthlyPaymentFixed: monthlyContribution ? Number(monthlyContribution) : undefined,
        minWinnerPercent: Number(minWinnerPercent) || 70
      });
      return res.json({ success: true, data: scheduleData });
    } else {
      const scheduleData = generateBidSchemeSchedule({
        chitValue: Number(chitValue),
        durationMonths: Number(durationMonths),
        foremanCommissionPercent: Number(foremanCommissionPercent) || 5,
        maxDiscountPercent: 30
      });
      return res.json({ success: true, data: scheduleData });
    }
  } catch (error) {
    console.error('Error generating preview calculation:', error);
    res.status(500).json({ success: false, message: 'Server error generating preview calculation' });
  }
});

// @route   POST /api/chits
// @desc    Create a new chit group
// @access  Private/Staff
router.post('/', protect, staff, async (req, res) => {
  try {
    const { name, totalMembers, chitValue, monthlyContribution, durationMonths, termsAndConditions, startDate, endDate } = req.body;

    if (!name || !totalMembers || !chitValue || !durationMonths) {
      return res.status(400).json({ success: false, message: 'Please enter all required fields' });
    }

    const finalMonthlyContribution = monthlyContribution 
      ? Number(monthlyContribution) 
      : Math.round(Number(chitValue) / Number(totalMembers));

    let parsedStartDate = startDate ? new Date(startDate) : null;
    let parsedEndDate = endDate ? new Date(endDate) : null;
    if (parsedStartDate && !parsedEndDate && durationMonths) {
      const calcEnd = new Date(parsedStartDate);
      calcEnd.setMonth(calcEnd.getMonth() + Number(durationMonths));
      parsedEndDate = calcEnd;
    }

    const chit = await Chit.create({
        name,
        totalMembers: Number(totalMembers),
        chitValue: Number(chitValue),
        monthlyContribution: finalMonthlyContribution,
        durationMonths: Number(durationMonths),
        termsAndConditions: termsAndConditions || "",
        status: 'upcoming',
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        createdBy: req.user.role === 'employee' ? req.user.id : null,
      });

    await logAuditEvent({
      req,
      module: 'chit_groups',
      action: 'Created Chit Scheme',
      recordId: chit.id,
      result: 'Success',
      severity: 'Info',
      details: `Created new chit scheme "${chit.name}" (Value: ₹${chit.chitValue}, Members: ${chit.totalMembers})`
    });

    res.status(201).json({ success: true, data: chit });

  } catch (error) {
    console.error('Error creating chit:', error);
    res.status(500).json({ success: false, message: 'Server error creating chit' });
  }
});

// Helper to check and auto-activate upcoming chits whose start date has arrived or slots are full
async function checkAndAutoActivateChits(chitsList) {
  if (!Array.isArray(chitsList) || chitsList.length === 0) return;
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const toUpdate = [];
  for (const c of chitsList) {
    if (c.status === 'upcoming') {
      const approvedCount = (c.members || []).filter(m => m.status === 'approved').length;
      const isStartDatePassedOrToday = c.startDate && new Date(c.startDate) <= today;
      const isFull = approvedCount >= c.totalMembers;

      if (isStartDatePassedOrToday || isFull) {
        toUpdate.push(c.id);
        c.status = 'active'; // mutate in-memory copy immediately
      }
    }
  }

  if (toUpdate.length > 0) {
    try {
      await Chit.updateMany(
        { _id: { $in: toUpdate } },
        { status: 'active' }
      );
    } catch (e) {
      console.error('Error auto-updating upcoming chits to active:', e);
    }
  }
}

// @route   GET /api/chits/public
// @desc    Get all active/enrolling chits for public browsing
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const rawChits = await Chit.find({
      status: { $ne: 'completed' }
    }).sort({ createdAt: -1 });

    const chits = await Promise.all(rawChits.map(async (c) => {
      const obj = c.toObject ? c.toObject() : { ...c };
      obj.id = obj._id ? obj._id.toString() : obj.id;
      const mems = await ChitMember.find({ chitId: obj._id || obj.id }).select('id status').lean();
      obj.members = mems.map(m => ({ id: m._id ? m._id.toString() : m.id, status: m.status }));
      return obj;
    }));

    res.json({ success: true, data: chits });
  } catch (error) {
    console.error('Error fetching public chits:', error);
    res.status(500).json({ success: false, message: 'Server error fetching public chits' });
  }
});

// @route   GET /api/chits
// @desc    Get all chits (browse list)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const isEmp = req.user.role === 'employee';
    const filter = isEmp ? { createdBy: req.user.id } : {};

    const rawChits = await Chit.find(filter).sort({ createdAt: -1 });
    const chits = (await Promise.all(rawChits.map(c => populateChitDetails(c)))).filter(Boolean);

    // Automatically check and activate any chits whose start date has arrived or are full
    await checkAndAutoActivateChits(chits);

    chits.forEach(c => {
      if (c.members) c.members = sortMembersByTicket(c.members);
    });
    res.json({ success: true, data: chits });
  } catch (error) {
    console.error('Error fetching chits:', error);
    res.status(500).json({ success: false, message: 'Server error fetching chits' });
  }
});

// @route   GET /api/chits/:id
// @desc    Get single chit details
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const rawChit = await Chit.findById(req.params.id);
    if (!rawChit) {
      return res.status(404).json({ success: false, message: 'Chit not found' });
    }
    const chit = await populateChitDetails(rawChit);

    // Auto activate if start date arrived or full
    await checkAndAutoActivateChits([chit]);

    if (chit && chit.members) chit.members = sortMembersByTicket(chit.members);
    res.json({ success: true, data: chit });
  } catch (error) {
    console.error('Error fetching chit details:', error);
    res.status(500).json({ success: false, message: 'Server error fetching chit details' });
  }
});

// @route   PUT /api/chits/:id
// @desc    Update/edit a chit group
// @route   PUT /api/chits/:id
// @desc    Update/edit a chit group
// @access  Private/Staff
router.put('/:id', protect, staff, async (req, res) => {
  try {
    const { name, totalMembers, chitValue, monthlyContribution, durationMonths, termsAndConditions, status } = req.body;

    const rawChit = await Chit.findById(req.params.id);
    if (!rawChit) {
      return res.status(404).json({ success: false, message: 'Chit not found' });
    }
    const chit = await populateChitDetails(rawChit);

    // Employees can only edit chits they created
    if (req.user.role === 'employee' && chit.createdBy && chit.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit chits assigned to you' });
    }

    // Completed chits cannot be modified unless admin is changing its status
    if (chit.status === 'completed' && (!status || status === 'completed')) {
      return res.status(400).json({ success: false, message: 'Completed chits cannot be modified.' });
    }

    // If totalMembers is being reduced, check it doesn't go below already approved count
    if (totalMembers) {
      const approvedCount = (chit.members || []).filter(m => m.status === 'approved').length;
      if (Number(totalMembers) < approvedCount) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce members below ${approvedCount} (already approved). Remove members first.`
        });
      }
    }

    const durationVal = durationMonths !== undefined ? Number(durationMonths) : chit.durationMonths;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (totalMembers !== undefined) updateData.totalMembers = Number(totalMembers);
    if (monthlyContribution !== undefined) updateData.monthlyContribution = Number(monthlyContribution);
    if (durationMonths !== undefined) updateData.durationMonths = durationVal;
    if (termsAndConditions !== undefined) updateData.termsAndConditions = termsAndConditions;
    if (chitValue !== undefined) updateData.chitValue = Number(chitValue);
    if (status !== undefined) updateData.status = status;

    if (req.body.startDate !== undefined) {
      updateData.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
    }
    if (req.body.endDate !== undefined) {
      updateData.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    } else if (req.body.startDate && updateData.startDate) {
      const calcEnd = new Date(updateData.startDate);
      calcEnd.setMonth(calcEnd.getMonth() + (durationVal || 12));
      updateData.endDate = calcEnd;
    }

    // Check if new start date or existing member count qualifies it to be active
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const approvedCount = (chit.members || []).filter(m => m.status === 'approved').length;
    const checkStartDate = updateData.startDate !== undefined ? updateData.startDate : chit.startDate;
    const isStartDatePassedOrToday = checkStartDate && new Date(checkStartDate) <= today;
    const targetTotal = updateData.totalMembers || chit.totalMembers;
    const isFull = approvedCount >= targetTotal;

    if (!updateData.status && (isStartDatePassedOrToday || isFull)) {
      updateData.status = 'active';
    }

    await Chit.findByIdAndUpdate(req.params.id, updateData);
    const updatedChit = await populateChitDetails(await Chit.findById(req.params.id));

    await logAuditEvent({
      req,
      module: 'chit_groups',
      action: 'Update Chit Scheme',
      recordId: updatedChit.id,
      result: 'Success',
      severity: 'Info',
      details: `Updated scheme ${updatedChit.name}`
    });

    res.json({ success: true, message: 'Chit updated successfully', data: updatedChit });

  } catch (error) {
    console.error('Error updating chit:', error);
    res.status(500).json({ success: false, message: 'Server error updating chit' });
  }
});

// @route   POST /api/chits/:id/join
// @desc    Request to join a chit (users can request multiple tickets)
// @access  Private
router.post('/:id/join', protect, async (req, res) => {
  try {
    const rawChit = await Chit.findById(req.params.id);
    if (!rawChit) {
      return res.status(404).json({ success: false, message: 'Chit not found' });
    }
    const chit = await populateChitDetails(rawChit);

    if (chit.status === 'completed') {
      return res.status(400).json({ success: false, message: 'This chit scheme has been completed' });
    }

    // Check if user already has a pending request for this chit
    const hasPending = (chit.members || []).some(m => (m.userId === req.user.id || (m.user && m.user.id === req.user.id)) && m.status === 'pending');
    if (hasPending) {
      return res.status(400).json({ success: false, message: 'You already have a pending request for this chit. Please wait for admin approval.' });
    }

    // Check if chit has available slots
    const approvedCount = (chit.members || []).filter(m => m.status === 'approved').length;
    const pendingCount = (chit.members || []).filter(m => m.status === 'pending').length;
    if (approvedCount + pendingCount >= chit.totalMembers) {
      return res.status(400).json({ success: false, message: 'This chit scheme is full. No more slots available.' });
    }

    await ChitMember.create({
      chitId: chit._id || chit.id,
      userId: req.user.id,
      status: 'pending'
    });
    
    const updatedChit = await populateChitDetails(await Chit.findById(chit._id || chit.id));

    const userTickets = (updatedChit.members || []).filter(m => (m.userId === req.user.id || (m.user && m.user.id === req.user.id)) && m.status === 'approved').length;
    const msg = userTickets > 0
      ? `Additional membership request submitted! You already have ${userTickets} member slot(s). Waiting for admin approval.`
      : 'Request to join submitted. Waiting for admin approval.';

    res.json({ success: true, message: msg, data: updatedChit });
  } catch (error) {
    console.error('Error joining chit:', error);
    res.status(500).json({ success: false, message: 'Server error joining chit' });
  }
});

// @route   POST /api/chits/:id/approve-member
// @desc    Approve or reject a member request to join a chit (supports multiple memberships per user)
// @access  Private/Staff
router.post('/:id/approve-member', protect, staff, async (req, res) => {
  try {
    const { userId, memberId, status } = req.body; // status: 'approved' or 'rejected'

    if (!userId || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Please provide valid userId and status' });
    }

    const rawChit = await Chit.findById(req.params.id);
    if (!rawChit) {
      return res.status(404).json({ success: false, message: 'Chit not found' });
    }
    const chit = await populateChitDetails(rawChit);

    // Verify employee owns this chit
    if (req.user.role === 'employee' && chit.createdBy && chit.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only manage chits assigned to you' });
    }

    if (chit.status === 'completed') {
      return res.status(400).json({ success: false, message: 'This chit scheme has been completed' });
    }

    // Find the specific pending record — use memberId if provided, otherwise find any pending for this user
    let memberRecord;
    if (memberId) {
      memberRecord = (chit.members || []).find(m => (m.id === memberId || m._id?.toString() === memberId) && (m.userId === userId || m.user?.id === userId));
    } else {
      memberRecord = (chit.members || []).find(m => (m.userId === userId || m.user?.id === userId) && m.status === 'pending');
    }
    if (!memberRecord) {
      return res.status(404).json({ success: false, message: 'Enrollment request not found for this user' });
    }

    const approvedCount = (chit.members || []).filter(m => m.status === 'approved').length;

    if (status === 'approved' && approvedCount >= chit.totalMembers) {
      return res.status(400).json({ success: false, message: 'This chit is already full!' });
    }

    await ChitMember.findByIdAndUpdate(memberRecord.id || memberRecord._id, { status });

    // If approved, resequence tickets to assign proper ticket ID
    if (status === 'approved') {
      await resequenceChit(chit._id || chit.id);
    }

    const finalApprovedCount = status === 'approved' ? approvedCount + 1 : approvedCount;

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const isStartDatePassedOrToday = chit.startDate && new Date(chit.startDate) <= today;
    const shouldActivate = finalApprovedCount >= chit.totalMembers || isStartDatePassedOrToday;

    if (finalApprovedCount >= chit.totalMembers) {
      await ChitMember.updateMany({ chitId: chit._id || chit.id, status: 'pending' }, { status: 'rejected' });
    }

    if (shouldActivate && chit.status === 'upcoming') {
      await Chit.findByIdAndUpdate(chit._id || chit.id, { status: 'active' });
    }

    const finalChit = await populateChitDetails(await Chit.findById(chit._id || chit.id));

    await logAuditEvent({
      req,
      module: 'chit_groups',
      action: status === 'approved' ? 'Approve Chit Member' : 'Reject Chit Member',
      recordId: chit.id,
      result: 'Success',
      severity: status === 'approved' ? 'Info' : 'Warning',
      details: `${status === 'approved' ? 'Approved' : 'Rejected'} member request for user ID ${userId} in chit scheme "${chit.name}"`
    });

    res.json({
      success: true,
      message: `Member ${status} successfully.${shouldActivate ? ' Chit is now active!' : ''}`,
      data: finalChit,
    });
  } catch (error) {
    console.error('Error approving/rejecting member:', error);
    res.status(500).json({ success: false, message: 'Server error processing member request' });
  }
});

// @route   POST /api/chits/:id/add-member
// @desc    Directly add one or multiple approved members to a chit group (supports multiple slots per user)
// @access  Private/Staff
router.post('/:id/add-member', protect, staff, async (req, res) => {
  try {
    const { userId, userIds, enrollments, slots } = req.body;

    let enrollItems = [];
    if (Array.isArray(enrollments) && enrollments.length > 0) {
      enrollItems = enrollments
        .map(e => ({ userId: e.userId, slots: Math.max(1, parseInt(e.slots || 1, 10)) }))
        .filter(e => !!e.userId);
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      const counts = {};
      for (const uid of userIds) {
        if (uid) counts[uid] = (counts[uid] || 0) + 1;
      }
      enrollItems = Object.keys(counts).map(uid => ({ userId: uid, slots: counts[uid] }));
    } else if (userId) {
      enrollItems = [{ userId, slots: Math.max(1, parseInt(slots || 1, 10)) }];
    }

    if (enrollItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one user to enroll' });
    }

    const rawChit = await Chit.findById(req.params.id);
    if (!rawChit) {
      return res.status(404).json({ success: false, message: 'Chit group not found' });
    }
    const chit = await populateChitDetails(rawChit);

    const currentApprovedCount = (chit.members || []).filter(m => m.status === 'approved').length;
    const availableSlots = Math.max(0, chit.totalMembers - currentApprovedCount);
    const totalSlotsRequested = enrollItems.reduce((acc, item) => acc + item.slots, 0);

    if (totalSlotsRequested > availableSlots) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot enroll ${totalSlotsRequested} slots. Only ${availableSlots} vacant slots remaining.` 
      });
    }

    let nextTicketNum = 1;
    for (const m of (chit.members || [])) {
      if (m.ticketId) {
        const num = parseInt(m.ticketId.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num >= nextTicketNum) nextTicketNum = num + 1;
      }
    }
    if (nextTicketNum <= (chit.members || []).length) {
      nextTicketNum = (chit.members || []).length + 1;
    }

    for (const item of enrollItems) {
      const existingUserMembers = (chit.members || []).filter(m => m.userId === item.userId || m.user?.id === item.userId);
      let currentMaxSlot = existingUserMembers.reduce((max, m) => Math.max(max, m.slotNumber || 1), 0);
      if (existingUserMembers.length === 0) currentMaxSlot = 0;

      for (let s = 1; s <= item.slots; s++) {
        currentMaxSlot++;
        const ticketId = `MEMBER-${nextTicketNum++}`;
        await ChitMember.create({
          chitId: chit._id || chit.id,
          userId: item.userId,
          slotNumber: currentMaxSlot,
          ticketId,
          status: 'approved'
        });
      }
    }

    await resequenceChit(chit._id || chit.id);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const finalCount = currentApprovedCount + totalSlotsRequested;
    const isStartDatePassedOrToday = chit.startDate && new Date(chit.startDate) <= today;

    if ((finalCount >= chit.totalMembers || isStartDatePassedOrToday) && chit.status === 'upcoming') {
      await Chit.findByIdAndUpdate(chit._id || chit.id, { status: 'active' });
    }

    const updatedChit = await populateChitDetails(await Chit.findById(chit._id || chit.id));

    await logAuditEvent({
      req,
      module: 'chit_groups',
      action: 'Enroll Member Slots',
      recordId: chit.id,
      result: 'Success',
      severity: 'Info',
      details: `Enrolled ${totalSlotsRequested} slot(s) into chit scheme "${chit.name}"`
    });

    res.json({ 
      success: true, 
      message: `Successfully enrolled ${totalSlotsRequested} ${totalSlotsRequested === 1 ? 'slot' : 'slots'} into chit scheme.${(finalCount >= chit.totalMembers || isStartDatePassedOrToday) ? ' Scheme is now Active!' : ''}`, 
      data: updatedChit 
    });
  } catch (error) {
    console.error('Error adding member(s) to chit:', error);
    res.status(500).json({ success: false, message: 'Server error adding member(s) to chit' });
  }
});

// @route   POST /api/chits/:id/remove-member
// @desc    Directly remove a member or a specific slot from a chit group
// @access  Private/Staff
router.post('/:id/remove-member', protect, staff, async (req, res) => {
  try {
    const { userId, memberId } = req.body;
    if (!memberId && !userId) {
      return res.status(400).json({ success: false, message: 'Please provide valid memberId or userId' });
    }

    const rawChit = await Chit.findById(req.params.id);
    if (!rawChit) {
      return res.status(404).json({ success: false, message: 'Chit group not found' });
    }
    const chit = await populateChitDetails(rawChit);

    if (memberId) {
      await ChitMember.findByIdAndDelete(memberId);
    } else {
      const userSlots = (chit.members || []).filter(m => m.userId === userId || m.user?.id === userId);
      if (userSlots.length > 0) {
        const sorted = userSlots.sort((a, b) => (b.slotNumber || 1) - (a.slotNumber || 1));
        await ChitMember.findByIdAndDelete(sorted[0].id || sorted[0]._id);
      }
    }

    await resequenceChit(chit._id || chit.id);
    const updatedChit = await populateChitDetails(await Chit.findById(chit._id || chit.id));

    res.json({ success: true, message: 'Member slot removed from chit scheme.', data: updatedChit });
  } catch (error) {
    console.error('Error removing member from chit:', error);
    res.status(500).json({ success: false, message: 'Server error removing member from chit' });
  }
});

// @route   POST /api/chits/:id/activate
// @desc    Manually activate/start a chit scheme when members list is complete or ready
// @access  Private/Staff
router.post('/:id/activate', protect, staff, async (req, res) => {
  try {
    const chit = await Chit.findById(req.params.id);
    if (!chit) {
      return res.status(404).json({ success: false, message: 'Chit not found' });
    }

    if (req.user.role === 'employee' && chit.createdBy && chit.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only manage chits assigned to you' });
    }

    const startDate = chit.startDate || new Date();
    let endDate = chit.endDate;
    if (!endDate && chit.durationMonths) {
      const calcEnd = new Date(startDate);
      calcEnd.setMonth(calcEnd.getMonth() + chit.durationMonths);
      endDate = calcEnd;
    }

    await Chit.findByIdAndUpdate(chit._id || chit.id, {
      status: 'active',
      startDate,
      endDate
    });

    const updatedChit = await populateChitDetails(await Chit.findById(chit._id || chit.id));

    res.json({
      success: true,
      message: `Chit "${updatedChit.name}" has been successfully started and is now active!`,
      data: updatedChit,
    });
  } catch (error) {
    console.error('Error activating chit:', error);
    res.status(500).json({ success: false, message: 'Server error activating chit' });
  }
});

// @route   POST /api/chits/:id/freeze
// @desc    Freeze a specific month in a chit for the user / ticket
// @access  Private
router.post('/:id/freeze', protect, async (req, res) => {
  try {
    const { monthNumber, ticketId, memberId } = req.body;
    const chitId = req.params.id;
    const userId = req.user.id;

    if (!monthNumber) {
      return res.status(400).json({ success: false, message: 'Month number is required' });
    }

    const rawChit = await Chit.findById(chitId);
    if (!rawChit) {
      return res.status(404).json({ success: false, message: 'Chit not found' });
    }
    const chit = await populateChitDetails(rawChit);

    const userApprovedMembers = (chit.members || []).filter(m => (m.userId === userId || m.user?.id === userId) && m.status === 'approved');
    if (userApprovedMembers.length === 0 && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'You are not an approved member of this chit' });
    }

    let targetMember = null;
    if (memberId) {
      targetMember = userApprovedMembers.find(m => m.id === memberId || m._id?.toString() === memberId);
    } else if (ticketId) {
      targetMember = userApprovedMembers.find(m => m.ticketId === ticketId);
    }

    if (!targetMember) {
      targetMember = userApprovedMembers.find(m => 
        !(chit.freezes || []).some(f => f.memberId === m.id || (m.ticketId && f.ticketId === m.ticketId))
      );
    }

    if (!targetMember && req.user.role !== 'superadmin') {
      return res.status(400).json({ 
        success: false, 
        message: 'All your member slots in this chit have already taken a month.' 
      });
    }

    const ticketAlreadyFroze = targetMember && (chit.freezes || []).some(f => 
      f.memberId === targetMember.id || (targetMember.ticketId && f.ticketId === targetMember.ticketId)
    );
    if (ticketAlreadyFroze) {
      const formattedId = targetMember.ticketId ? targetMember.ticketId.replace(/^TICKET-/, 'MEMBER-') : 'Selected';
      return res.status(400).json({ 
        success: false, 
        message: `Member ${formattedId} has already taken a month in this chit.` 
      });
    }

    const monthAlreadyFrozen = (chit.freezes || []).some(f => f.monthNumber === Number(monthNumber));
    if (monthAlreadyFrozen) {
      return res.status(400).json({ success: false, message: 'This month is already frozen by another member' });
    }

    if (Number(monthNumber) < 1 || Number(monthNumber) > chit.durationMonths) {
      return res.status(400).json({ success: false, message: 'Invalid month number' });
    }

    const rawAssignedId = targetMember?.ticketId || (targetMember ? `MEMBER-${targetMember.slotNumber}` : null);
    const assignedTicketId = rawAssignedId ? rawAssignedId.replace(/^TICKET-/, 'MEMBER-') : null;

    const newFreeze = await ChitFreeze.create({
      chitId: chit._id || chit.id,
      userId,
      memberId: targetMember?.id || targetMember?._id || null,
      ticketId: assignedTicketId,
      monthNumber: Number(monthNumber)
    });

    res.json({
      success: true,
      message: `Month ${monthNumber} has been successfully frozen for ${assignedTicketId || 'your member slot'}!`,
      data: newFreeze
    });
  } catch (error) {
    console.error('Error freezing month:', error);
    res.status(500).json({ success: false, message: 'Server error freezing month' });
  }
});

// @route   DELETE /api/chits/:id
// @desc    Delete a chit scheme group
// @access  Private / Staff / Admin
router.delete('/:id', protect, staff, async (req, res) => {
  try {
    const { id } = req.params;

    const chit = await Chit.findById(id);

    if (!chit) {
      return res.status(404).json({ success: false, message: 'Chit scheme not found' });
    }

    if (req.user.role === 'employee' && chit.createdBy && chit.createdBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this chit scheme' });
    }

    await Chit.findByIdAndDelete(id);
    await ChitMember.deleteMany({ chitId: id });
    await ChitFreeze.deleteMany({ chitId: id });
    await Auction.deleteMany({ chitId: id });
    await Payment.deleteMany({ chitId: id });

    await logAuditEvent({
      req,
      module: 'chit_groups',
      action: 'Deleted Chit Scheme',
      recordId: chit.id,
      result: 'Success',
      severity: 'Warning',
      details: `Deleted scheme ${chit.name}`
    });

    res.json({
      success: true,
      message: `Chit scheme "${chit.name}" deleted successfully!`
    });

  } catch (error) {
    console.error('Error deleting chit scheme:', error);
    res.status(500).json({ success: false, message: 'Server error deleting chit scheme' });
  }
});

module.exports = router;
