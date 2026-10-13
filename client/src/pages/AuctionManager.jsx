import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import ScrollAnimationWrapper from '../components/ScrollAnimationWrapper';
import {
  Gavel,
  Calendar,
  IndianRupee,
  Users,
  CheckCircle2,
  FileText,
  Building,
  Upload,
  Eye,
  Trash2,
  AlertCircle,
  Clock,
  Check,
  ShieldCheck,
  ArrowRight,
  Lock,
  Layers,
  Sparkles,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { generateFixedSchemeSchedule, calculateFixedMonthlyPayment } from '../utils/auctionLogic';

const AuctionManager = () => {
  const { user, token, API_URL } = useAuth();
  const isStaffOrAdmin = user && (user.role === 'superadmin' || user.role === 'employee');

  // Auction Type State: 'bid' (Written Bid) or 'fixed' (Fixed Amount)
  const [auctionType, setAuctionType] = useState('bid');

  // Data State
  const [chits, setChits] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Form State
  const [selectedChitId, setSelectedChitId] = useState('');
  const [auctionMonth, setAuctionMonth] = useState('1');
  const [auctionDate, setAuctionDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [winnerPayout, setWinnerPayout] = useState('');
  const [winningDiscount, setWinningDiscount] = useState('');
  const [winningMemberId, setWinningMemberId] = useState('');
  const [auctionNotes, setAuctionNotes] = useState('');

  // Payment Details Sub-form
  const [payoutMethod, setPayoutMethod] = useState('Cash');
  const [beneficiaryBank, setBeneficiaryBank] = useState('');
  const [bankUtr, setBankUtr] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);

  // Receipt Modal
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState(null);

  // Fetch chits and auctions
  const fetchData = async () => {
    setLoading(true);
    try {
      const [chitsRes, auctionsRes] = await Promise.all([
        fetch(`${API_URL}/chits`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/auctions`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const chitsData = await chitsRes.json();
      const auctionsData = await auctionsRes.json();

      if (chitsData.success) {
        setChits(chitsData.data || []);
      }
      if (auctionsData.success) {
        setAuctions(auctionsData.data || []);
      }
    } catch (err) {
      console.error('Error loading auction data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, API_URL]);

  // Selected Chit Object
  const selectedChit = chits.find(c => c.id === selectedChitId);

  // Fixed Scheme Schedule (Calculated dynamically for selected chit)
  const fixedScheduleData = useMemo(() => {
    if (!selectedChit) return null;
    
    // Combine manual freezes and recorded auctions for this chit
    const bookedFreezes = (selectedChit.freezes || []).concat(
      auctions
        .filter(a => a.chitId === selectedChit.id)
        .map(a => ({
          monthNumber: a.monthNumber,
          userId: a.winningMemberId,
          user: a.winningMember,
          ticketId: a.winningTicket
        }))
    );

    return generateFixedSchemeSchedule({
      chitValue: selectedChit.chitValue,
      durationMonths: selectedChit.durationMonths,
      monthlyPaymentFixed: selectedChit.monthlyContribution,
      bookedFreezes
    });
  }, [selectedChit, auctions]);

  // Handle Auction Type Switch
  const handleAuctionTypeChange = (type) => {
    setAuctionType(type);
    setMessage({ text: '', type: '' });
    if (type === 'fixed' && selectedChit && fixedScheduleData) {
      const targetMonthNum = Number(auctionMonth) || 1;
      const slot = fixedScheduleData.schedule.find(s => s.month === targetMonthNum) || fixedScheduleData.schedule[0];
      if (slot) {
        setWinnerPayout(String(slot.winnerAmount));
        setWinningDiscount(String(slot.discountAmount));
      }
    }
  };

  // When selected chit changes, auto-suggest next auction month & prefill values
  // When selected chit changes, auto-detect auction type and suggest next auction month & prefill values
  const handleChitChange = (chitId) => {
    setSelectedChitId(chitId);
    setWinningMemberId('');
    if (chitId) {
      const chit = chits.find(c => c.id === chitId);
      if (chit) {
        // Auto-detect auction type from chit scheme configuration (termsAndConditions)
        const tc = (chit.termsAndConditions || '').toLowerCase();
        const detectedType = tc.includes('written bid') ? 'bid' : 'fixed';
        setAuctionType(detectedType);

        const chitAuctions = auctions.filter(a => a.chitId === chitId);
        const nextMonth = chitAuctions.length > 0
          ? Math.max(...chitAuctions.map(a => a.monthNumber)) + 1
          : (chit.currentMonth || 1);
        const mStr = String(Math.min(nextMonth, chit.durationMonths));
        setAuctionMonth(mStr);

        if (detectedType === 'fixed') {
          const schedule = generateFixedSchemeSchedule({
            chitValue: chit.chitValue,
            durationMonths: chit.durationMonths,
            monthlyPaymentFixed: chit.monthlyContribution
          });
          const slot = schedule.schedule.find(s => s.month === Number(mStr)) || schedule.schedule[0];
          if (slot) {
            setWinnerPayout(String(slot.winnerAmount));
            setWinningDiscount(String(slot.discountAmount));
          }
        } else {
          setWinnerPayout('');
          setWinningDiscount('');
        }
      }
    }
  };

  // When month changes in Fixed Mode, auto-update the winner amount
  const handleMonthChange = (mStr) => {
    setAuctionMonth(mStr);
    if (auctionType === 'fixed' && selectedChit) {
      const mNum = Number(mStr);
      const schedule = generateFixedSchemeSchedule({
        chitValue: selectedChit.chitValue,
        durationMonths: selectedChit.durationMonths,
        monthlyPaymentFixed: selectedChit.monthlyContribution
      });
      const slot = schedule.schedule.find(s => s.month === mNum);
      if (slot) {
        setWinnerPayout(String(slot.winnerAmount));
        setWinningDiscount(String(slot.discountAmount));
      }
    }
  };

  // Select slot directly from Fixed Schedule Table
  const handleSelectFixedSlot = (slot) => {
    setAuctionMonth(String(slot.month));
    setWinnerPayout(String(slot.winnerAmount));
    setWinningDiscount(String(slot.discountAmount));
  };

  // Handle Winner Payout input change (Written Bid Mode)
  const handleWinnerPayoutChange = (val) => {
    setWinnerPayout(val);
    if (selectedChit) {
      const chitVal = Number(selectedChit.chitValue) || 0;
      const numVal = Number(val);
      if (val !== '' && !isNaN(numVal) && numVal <= chitVal) {
        setWinningDiscount(String(chitVal - numVal));
      } else if (val === '') {
        setWinningDiscount('');
      }
    }
  };

  // Handle Discount input change (Written Bid Mode)
  const handleDiscountChange = (val) => {
    setWinningDiscount(val);
    if (selectedChit) {
      const chitVal = Number(selectedChit.chitValue) || 0;
      const numVal = Number(val);
      if (val !== '' && !isNaN(numVal) && numVal <= chitVal) {
        setWinnerPayout(String(chitVal - numVal));
      } else if (val === '') {
        setWinnerPayout('');
      }
    }
  };

  // Handle Winning Member change
  const handleWinningMemberChange = (val) => {
    setWinningMemberId(val);
    if (payoutMethod === 'Cheque' && !beneficiaryBank && selectedChit) {
      const member = (selectedChit.members || []).find(m => m.id === val || m.userId === val);
      if (member && member.user?.name) {
        setBeneficiaryBank(member.user.name);
      }
    }
  };

  // Handle Payout Method change
  const handlePayoutMethodChange = (method) => {
    setPayoutMethod(method);
    setMessage({ text: '', type: '' });
    if (method === 'Cash') {
      setBeneficiaryBank('');
      setBankUtr('');
      setReceiptFile(null);
    } else if (method === 'Cheque' && !beneficiaryBank && winningMemberId && selectedChit) {
      const member = (selectedChit.members || []).find(m => m.id === winningMemberId || m.userId === winningMemberId);
      if (member && member.user?.name) {
        setBeneficiaryBank(member.user.name);
      }
    }
  };

  // Approved members in the selected chit
  const approvedMembers = selectedChit
    ? (selectedChit.members || [])
        .filter(m => m.status === 'approved')
        .sort((a, b) => {
          const numA = parseInt(String(a.ticketId || '').match(/\d+/)?.[0] || a.slotNumber || 0, 10);
          const numB = parseInt(String(b.ticketId || '').match(/\d+/)?.[0] || b.slotNumber || 0, 10);
          return numA - numB;
        })
    : [];

  // Real-time server financial calculations
  const calcResults = (() => {
    if (!selectedChit || winningDiscount === '' || Number(winningDiscount) < 0) {
      return null;
    }

    const chitValue = Number(selectedChit.chitValue) || 0;
    const duration = Number(selectedChit.durationMonths) || 1;
    const totalMembers = Number(selectedChit.totalMembers) || duration;
    const discount = Number(winningDiscount) || 0;
    const nominalMonthly = Number(selectedChit.monthlyContribution) || Math.round(chitValue / duration);
    const totalMonths = Number(selectedChit.durationMonths || selectedChit.totalMonths || 12);
    const isFinalMonth = Number(auctionMonth) >= totalMonths;

    if (auctionType === 'fixed') {
      const schedule = fixedScheduleData || generateFixedSchemeSchedule({
        chitValue,
        durationMonths: duration,
        monthlyPaymentFixed: selectedChit.monthlyContribution
      });
      const currentSlot = schedule.schedule.find(s => s.month === Number(auctionMonth)) || schedule.schedule[0];
      const fixedMonthly = Number(selectedChit.monthlyContribution) || schedule.monthlyPaymentFixed;
      const manuallyEnteredPayout = winnerPayout !== '' ? Number(winnerPayout) : (chitValue - discount);
      const winnerAmount = !isNaN(manuallyEnteredPayout) && manuallyEnteredPayout > 0
        ? manuallyEnteredPayout
        : (currentSlot ? currentSlot.winnerAmount : (chitValue - discount));
      const totalMemberContribution = fixedMonthly * duration;
      const totalBenefit = chitValue - totalMemberContribution;

      return {
        isFixed: true,
        chitValue,
        duration,
        totalMembers,
        monthNumber: Number(auctionMonth),
        fixedMonthly,
        winnerPayout: winnerAmount,
        discount: chitValue - winnerAmount,
        discountPercent: (((chitValue - winnerAmount) / chitValue) * 100).toFixed(1),
        totalMemberContribution,
        totalBenefit,
        nextPayableAmount: isFinalMonth ? 0 : fixedMonthly
      };
    } else {
      // Written Bid Auction Calculations
      let commissionPercent = 5;
      if (selectedChit.termsAndConditions && selectedChit.termsAndConditions.includes('Foreman Commission:')) {
        const match = selectedChit.termsAndConditions.match(/Foreman Commission:\s*(\d+)%/i);
        if (match && match[1]) {
          commissionPercent = Number(match[1]);
        }
      }

      const foremanCommission = Math.round(chitValue * (commissionPercent / 100));
      const winnerPayoutAmount = chitValue - discount;
      const distributablePool = Math.max(0, discount - foremanCommission);
      const dividendPerMember = Math.round(distributablePool / totalMembers);
      const nextPayableAmount = isFinalMonth ? 0 : Math.max(0, nominalMonthly - dividendPerMember);
      const discountPercent = ((discount / chitValue) * 100).toFixed(1);

      return {
        isFixed: false,
        chitValue,
        duration,
        totalMembers,
        discount,
        discountPercent,
        commissionPercent,
        foremanCommission,
        distributablePool,
        dividendPerMember,
        winnerPayout: winnerPayoutAmount,
        nominalMonthly,
        nextPayableAmount
      };
    }
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (!selectedChitId) {
      setMessage({ text: 'Please select an active chit scheme.', type: 'error' });
      return;
    }
    if (!winningMemberId) {
      setMessage({ text: 'Please select a winning member.', type: 'error' });
      return;
    }
    if (winningDiscount === '' || Number(winningDiscount) < 0) {
      setMessage({ text: 'Please enter a valid winning payout or discount amount.', type: 'error' });
      return;
    }

    // Payout Method specific validation
    if (payoutMethod === 'UPI') {
      if (!bankUtr || !bankUtr.trim()) {
        setMessage({ text: 'Please enter the UPI Transaction ID / Reference Number.', type: 'error' });
        return;
      }
      if (!receiptFile) {
        setMessage({ text: 'Please upload the UPI payment screenshot.', type: 'error' });
        return;
      }
    } else if (payoutMethod === 'Cheque') {
      if (!beneficiaryBank || !beneficiaryBank.trim()) {
        setMessage({ text: 'Please enter the Beneficiary / Payee Name for the cheque.', type: 'error' });
        return;
      }
      if (!bankUtr || !bankUtr.trim()) {
        setMessage({ text: 'Please enter the Cheque Number.', type: 'error' });
        return;
      }
    } else if (payoutMethod === 'Bank Transfer (NEFT / RTGS / IMPS)') {
      if (!beneficiaryBank || !beneficiaryBank.trim()) {
        setMessage({ text: 'Please enter the Beneficiary Bank Name.', type: 'error' });
        return;
      }
      if (!bankUtr || !bankUtr.trim()) {
        setMessage({ text: 'Please enter the Bank UTR / Reference Number.', type: 'error' });
        return;
      }
      if (!receiptFile) {
        setMessage({ text: 'Please upload the Bank Transfer payment proof / receipt screenshot.', type: 'error' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('chitId', selectedChitId);
      formData.append('monthNumber', auctionMonth);
      formData.append('auctionDate', auctionDate);
      formData.append('winningBidDiscount', winningDiscount);
      formData.append('auctionNotes', auctionNotes || (auctionType === 'fixed' ? 'Fixed Amount Scheme Winner Claim' : ''));
      formData.append('payoutMethod', payoutMethod);
      if (payoutMethod !== 'Cash') {
        formData.append('beneficiaryBankName', beneficiaryBank || '');
        formData.append('bankUtr', bankUtr || '');
      }
      if (payoutMethod !== 'Cash' && receiptFile) {
        formData.append('receipt', receiptFile);
      }

      // Selected member
      const selectedMember = approvedMembers.find(m => m.id === winningMemberId || m.userId === winningMemberId);
      if (selectedMember) {
        formData.append('winningMemberId', selectedMember.userId || selectedMember.user?.id);
        formData.append('winningChitMemberId', selectedMember.id);
        const rawWinning = selectedMember.ticketId || `MEMBER-${selectedMember.slotNumber || 1}`;
        formData.append('winningTicket', rawWinning.replace(/^TICKET-/, 'MEMBER-'));
      } else {
        formData.append('winningMemberId', winningMemberId);
      }

      const response = await fetch(`${API_URL}/auctions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ text: data.message || 'Auction result recorded successfully!', type: 'success' });
        // Reset inputs
        setWinnerPayout('');
        setWinningDiscount('');
        setWinningMemberId('');
        setAuctionNotes('');
        setBeneficiaryBank('');
        setBankUtr('');
        setReceiptFile(null);
        await fetchData();
      } else {
        setMessage({ text: data.message || 'Failed to record auction.', type: 'error' });
      }
    } catch (err) {
      console.error('Error saving auction:', err);
      setMessage({ text: 'Server error recording auction result.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAuction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this auction record?')) return;
    try {
      const response = await fetch(`${API_URL}/auctions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ text: 'Auction record deleted successfully.', type: 'success' });
        await fetchData();
      } else {
        setMessage({ text: data.message || 'Failed to delete auction record.', type: 'error' });
      }
    } catch (err) {
      console.error('Error deleting auction:', err);
      setMessage({ text: 'Error connecting to server.', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#2563eb', fontWeight: 600 }}>
        Loading auction management portal...
      </div>
    );
  }

  return (
    <div className="admin-page-container" style={{ width: '100%', maxWidth: '1380px', margin: '0 auto', paddingBottom: '3rem', boxSizing: 'border-box' }}>
      
      {/* 1. Header Banner */}
      <ScrollAnimationWrapper>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.85rem',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.75rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                borderRadius: '0.6rem',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Gavel size={26} />
              </div>
              <div>
                <h1 style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: '0 0 0.25rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  Conduct Monthly Auction
                </h1>
                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                  Select a chit scheme to record its monthly auction. The scheme's configured auction type (<strong>Fixed Amount</strong> or <strong>Written Bid</strong>) loads automatically.
                </p>
              </div>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.1rem',
                borderRadius: '0.6rem',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} color="#475569" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Global Status Message */}
      {message.text && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '0.6rem',
          marginBottom: '1.25rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          backgroundColor: message.type === 'success' ? '#eff6ff' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#a5b4fc' : '#fca5a5'}`,
          color: message.type === 'success' ? '#2563eb' : '#b91c1c',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 2. Main 2-Column Section (Form + Server Financial Preview) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isStaffOrAdmin ? '1.55fr 1fr' : '1fr',
        gap: '1.75rem',
        marginBottom: '2.5rem'
      }} className="auction-grid-container">

        {/* Left Column: Form */}
        {isStaffOrAdmin ? (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.85rem',
            border: '1px solid #e2e8f0',
            padding: '1.75rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            {/* Form Section Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              marginBottom: '1.5rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid #f1f5f9'
            }}>
              {auctionType === 'fixed' ? <ShieldCheck size={18} color="#2563eb" /> : <Gavel size={18} color="#2563eb" />}
              <h2 style={{
                fontSize: '0.92rem',
                fontWeight: 800,
                color: '#1e293b',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                margin: 0
              }}>
                {auctionType === 'fixed' ? '1. FIXED SCHEME PARAMETERS & WINNER RECORD' : '1. REVERSE BID AUCTION PARAMETERS & WINNER SELECTION'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Row 1: Chit Scheme * & Auction Month # * */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Chit Scheme *
                  </label>
                  <select
                    required
                    value={selectedChitId}
                    onChange={(e) => handleChitChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none'
                    }}
                  >
                    <option value="">-- Select Active Scheme --</option>
                    {chits.map(chit => (
                      <option key={chit.id} value={chit.id}>
                        {chit.name} (₹{chit.chitValue.toLocaleString()} · {chit.durationMonths}M)
                      </option>
                    ))}
                  </select>
                  {selectedChit && (
                    <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '0.18rem 0.6rem',
                        borderRadius: '9999px',
                        backgroundColor: auctionType === 'fixed' ? '#dbeafe' : '#eff6ff',
                        color: auctionType === 'fixed' ? '#2563eb' : '#1d4ed8',
                        border: `1px solid ${auctionType === 'fixed' ? '#a5b4fc' : '#bfdbfe'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        {auctionType === 'fixed' ? '🛡️ Configured as Fixed Amount Scheme' : '🔨 Configured as Written Bid Scheme'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Auction Month # *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedChit ? selectedChit.durationMonths : 100}
                    value={auctionMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Auction Date * & Bid Inputs */}
              {auctionType === 'fixed' ? (
                /* Fixed Auction Mode Inputs */
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Auction Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={auctionDate}
                      onChange={(e) => setAuctionDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.35rem' }}>
                      Fixed Winner Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={winnerPayout}
                      onChange={(e) => handleWinnerPayoutChange(e.target.value)}
                      placeholder="e.g. 210000"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: '1.5px solid #2563eb',
                        backgroundColor: '#ffffff',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#1d4ed8',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#1d4ed8';
                        e.target.style.boxShadow = '0 0 0 3px rgba(22, 163, 74, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#2563eb', display: 'block', marginTop: '0.2rem' }}>
                      Enter winner take-home manually
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Fixed Monthly Installment (₹)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={calcResults?.fixedMonthly ? `₹${calcResults.fixedMonthly.toLocaleString()}` : 'Select Chit'}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#334155',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
                      Fixed every month
                    </span>
                  </div>
                </div>
              ) : (
                /* Written Bid Mode Inputs */
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Auction Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={auctionDate}
                      onChange={(e) => setAuctionDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.35rem' }}>
                      Winner Take-Home (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder={selectedChit ? `e.g. ${selectedChit.chitValue * 0.7}` : 'e.g. 70000'}
                      value={winnerPayout}
                      onChange={(e) => handleWinnerPayoutChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: '1.5px solid #2563eb',
                        backgroundColor: '#eff6ff',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#1d4ed8',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#2563eb', display: 'block', marginTop: '0.2rem' }}>
                      Amount winner takes home
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Bid Discount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder={selectedChit ? `e.g. ${selectedChit.chitValue * 0.3}` : 'e.g. 30000'}
                      value={winningDiscount}
                      onChange={(e) => handleDiscountChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
                      Chit Value - Take Home
                    </span>
                  </div>
                </div>
              )}

              {/* Row 3: Winning Member / Ticket * */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Winning Member / Ticket *
                </label>
                <select
                  required
                  disabled={!selectedChitId}
                  value={winningMemberId}
                  onChange={(e) => handleWinningMemberChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    color: '#0f172a',
                    backgroundColor: selectedChitId ? '#ffffff' : '#f8fafc',
                    outline: 'none',
                    cursor: selectedChitId ? 'pointer' : 'not-allowed'
                  }}
                >
                  {!selectedChitId ? (
                    <option value="">-- Select a Chit Scheme First --</option>
                  ) : approvedMembers.length === 0 ? (
                    <option value="">-- No Approved Members in Scheme --</option>
                  ) : (
                    <>
                      <option value="">-- Select Winning Member --</option>
                      {approvedMembers.map((m, idx) => {
                        const rawLabel = m.ticketId || `MEMBER-${m.slotNumber || (idx + 1)}`;
                        const ticketLabel = rawLabel.replace(/^TICKET-/, 'MEMBER-');
                        const chitAuctions = auctions.filter(a => a.chitId === selectedChitId);
                        const prevWin = chitAuctions.find(a => 
                          a.winningChitMemberId === m.id || 
                          (a.winningTicket && a.winningTicket.toUpperCase() === ticketLabel.toUpperCase()) ||
                          (a.winningTicket && a.winningTicket.replace(/^TICKET-/, 'MEMBER-').toUpperCase() === ticketLabel.toUpperCase())
                        );
                        return (
                          <option 
                            key={m.id} 
                            value={m.id}
                            disabled={!!prevWin}
                          >
                            {ticketLabel} - {m.user?.name || 'Member'} ({m.user?.phone || m.user?.email || 'N/A'}){prevWin ? ` [Won Month ${prevWin.monthNumber}]` : ''}
                          </option>
                        );
                      })}
                    </>
                  )}
                </select>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '0.3rem', fontStyle: 'italic' }}>
                  Please select an active chit scheme above to view member options.
                </span>
              </div>

              {/* Row 4: Auction Notes / Minutes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Auction Notes / Minutes
                </label>
                <input
                  type="text"
                  placeholder="Optional remarks (e.g., Highest bidder after 15 rounds)"
                  value={auctionNotes}
                  onChange={(e) => setAuctionNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Sub-card: Winner Payout Payment Details */}
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1rem' }}>💸</span>
                  <strong style={{ fontSize: '0.92rem', color: '#2563eb' }}>
                    Winner Payout Payment Details
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#1d4ed8', fontStyle: 'italic' }}>
                    (How is the winner being paid?)
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#2563eb', marginBottom: '0.35rem' }}>
                    Payout Method *
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => handlePayoutMethodChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #a5b4fc',
                      backgroundColor: '#ffffff',
                      fontSize: '0.9rem',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  >
                    <option value="Cash">💵 Cash (Liquid Mode)</option>
                    <option value="UPI">📱 UPI Payment</option>
                    <option value="Bank Transfer (NEFT / RTGS / IMPS)">🏦 Bank Transfer (NEFT / RTGS / IMPS)</option>
                    <option value="Cheque">📑 Cheque Payment</option>
                  </select>
                </div>

                {/* 1. Cash Mode */}
                {payoutMethod === 'Cash' && (
                  <div style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '0.5rem',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem'
                  }}>
                    <span style={{ fontSize: '1.35rem' }}>💵</span>
                    <div>
                      <strong style={{ display: 'block', color: '#1d4ed8', marginBottom: '0.15rem' }}>
                        Liquid Cash Payment Mode
                      </strong>
                      <span>Winner will be paid directly in cash. No screenshot or bank transaction details required.</span>
                    </div>
                  </div>
                )}

                {/* 2. UPI Mode */}
                {payoutMethod === 'UPI' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.35rem' }}>
                        UPI Transaction ID / Ref No. *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 428910284729 / UPI-TXN-984"
                        value={bankUtr}
                        onChange={(e) => setBankUtr(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #a5b4fc',
                          backgroundColor: '#ffffff',
                          fontSize: '0.88rem',
                          color: '#0f172a',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.35rem' }}>
                        Upload UPI Payment Screenshot *
                      </label>
                      <input
                        type="file"
                        required
                        accept="image/*,.pdf"
                        onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.5rem',
                          border: '1px dashed #a5b4fc',
                          backgroundColor: '#ffffff',
                          fontSize: '0.85rem',
                          color: '#475569',
                          outline: 'none'
                        }}
                      />
                      {receiptFile && (
                        <span style={{ fontSize: '0.74rem', color: '#1d4ed8', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                          ✓ Selected: {receiptFile.name}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Cheque Mode */}
                {payoutMethod === 'Cheque' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.35rem' }}>
                        Beneficiary Name (Payee) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Santhosh Kumar"
                        value={beneficiaryBank}
                        onChange={(e) => setBeneficiaryBank(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #a5b4fc',
                          backgroundColor: '#ffffff',
                          fontSize: '0.88rem',
                          color: '#0f172a',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.35rem' }}>
                        Cheque Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. CHQ492810"
                        value={bankUtr}
                        onChange={(e) => setBankUtr(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #a5b4fc',
                          backgroundColor: '#ffffff',
                          fontSize: '0.88rem',
                          color: '#0f172a',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 4. Bank Transfer (NEFT / RTGS / IMPS) Mode */}
                {payoutMethod === 'Bank Transfer (NEFT / RTGS / IMPS)' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.35rem' }}>
                          Beneficiary Bank Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. HDFC Bank, SBI, ICICI"
                          value={beneficiaryBank}
                          onChange={(e) => setBeneficiaryBank(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #a5b4fc',
                            backgroundColor: '#ffffff',
                            fontSize: '0.88rem',
                            color: '#0f172a',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.35rem' }}>
                          Bank UTR / Transaction Ref No. *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. N20261984210"
                          value={bankUtr}
                          onChange={(e) => setBankUtr(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #a5b4fc',
                            backgroundColor: '#ffffff',
                            fontSize: '0.88rem',
                            color: '#0f172a',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.35rem' }}>
                        Upload Bank Transfer Proof / Receipt *
                      </label>
                      <input
                        type="file"
                        required
                        accept="image/*,.pdf"
                        onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.5rem',
                          border: '1px dashed #a5b4fc',
                          backgroundColor: '#ffffff',
                          fontSize: '0.85rem',
                          color: '#475569',
                          outline: 'none'
                        }}
                      />
                      {receiptFile && (
                        <span style={{ fontSize: '0.74rem', color: '#1d4ed8', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                          ✓ Selected: {receiptFile.name}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Record Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: '#4f6ee8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '0.75rem 1.85rem',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => !submitting && (e.currentTarget.style.backgroundColor = '#3b5bdb')}
                  onMouseOut={(e) => !submitting && (e.currentTarget.style.backgroundColor = '#4f6ee8')}
                >
                  <Check size={18} />
                  <span>{submitting ? 'RECORDING...' : (auctionType === 'fixed' ? 'RECORD FIXED CLAIM' : 'RECORD AUCTION RESULT')}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.85rem',
            border: '1px solid #e2e8f0',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <Gavel size={42} color="#2563eb" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Live Chit Auctions & Dividends</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '520px', margin: '0.5rem auto 1.5rem auto' }}>
              Transparency in reverse bidding and fixed schemes: members receive the chit payout, and dividends reduce every member's payment schedule.
            </p>
          </div>
        )}

        {/* Right Column: SERVER FINANCIAL PREVIEW */}
        <div style={{
          backgroundColor: '#0c1427',
          borderRadius: '0.85rem',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.75rem',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '440px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)'
        }}>
          <div>
            <span style={{
              display: 'inline-block',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#38bdf8',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '0.35rem'
            }}>
              SERVER FINANCIAL PREVIEW
            </span>
            <h3 style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 1.5rem 0',
              letterSpacing: '-0.01em'
            }}>
              {auctionType === 'fixed' ? 'Fixed Scheme Payout' : 'Auction Payout & Dividends'}
            </h3>

            {!calcResults ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                color: '#64748b',
                fontSize: '0.9rem',
                lineHeight: 1.6
              }}>
                Select a scheme to view real-time financial calculations.
              </div>
            ) : calcResults.isFixed ? (
              /* Fixed Scheme Financial Preview */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '0.4rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Chit Value</span>
                  <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>₹{calcResults.chitValue.toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.12)', borderRadius: '0.5rem', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                  <div>
                    <span style={{ color: '#bfdbfe', fontSize: '0.82rem', fontWeight: 600, display: 'block' }}>Guaranteed Winner Payout</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Month {calcResults.monthNumber} Slot</span>
                  </div>
                  <strong style={{ color: '#818cf8', fontSize: '1.2rem', fontWeight: 800 }}>₹{calcResults.winnerPayout.toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '0.4rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Fixed Monthly Payment</span>
                  <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>
                    ₹{calcResults.fixedMonthly.toLocaleString()}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '0.4rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Member Paid (over {calcResults.duration}M)</span>
                  <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>₹{calcResults.totalMemberContribution.toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div>
                    <span style={{ color: '#bae6fd', fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>Member Total Savings Benefit</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Chit Value - Total Paid</span>
                  </div>
                  <strong style={{ color: '#38bdf8', fontSize: '1.05rem', fontWeight: 800 }}>₹{calcResults.totalBenefit.toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '0.5rem' }}>
                  <div>
                    <span style={{ color: '#cbd5e1', fontSize: '0.85rem', display: 'block' }}>Every Month Payable</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Equal fixed installment</span>
                  </div>
                  <strong style={{ color: '#f8fafc', fontSize: '1rem', fontWeight: 700 }}>₹{calcResults.nextPayableAmount.toLocaleString()}</strong>
                </div>
              </div>
            ) : (
              /* Written Bid Financial Preview */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '0.4rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Chit Value</span>
                  <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>₹{calcResults.chitValue.toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.12)', borderRadius: '0.5rem', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                  <div>
                    <span style={{ color: '#bfdbfe', fontSize: '0.82rem', fontWeight: 600, display: 'block' }}>Net Winner Payout (Take-Home)</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Amount transferred to winner</span>
                  </div>
                  <strong style={{ color: '#818cf8', fontSize: '1.2rem', fontWeight: 800 }}>₹{calcResults.winnerPayout.toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '0.4rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Winning Bid Discount</span>
                  <strong style={{ color: '#f59e0b', fontSize: '0.95rem' }}>
                    ₹{calcResults.discount.toLocaleString()} ({calcResults.discountPercent}%)
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '0.4rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Foreman Commission ({calcResults.commissionPercent}%)</span>
                  <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>₹{calcResults.foremanCommission.toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '0.4rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block' }}>Distributable Dividend Pool</span>
                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Discount (₹{calcResults.discount.toLocaleString()}) - Foreman (₹{calcResults.foremanCommission.toLocaleString()})</span>
                  </div>
                  <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>₹{calcResults.distributablePool.toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div>
                    <span style={{ color: '#bae6fd', fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>Dividend Per Member</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>₹{calcResults.distributablePool.toLocaleString()} ÷ {calcResults.totalMembers} members</span>
                  </div>
                  <strong style={{ color: '#38bdf8', fontSize: '1.05rem', fontWeight: 800 }}>₹{calcResults.dividendPerMember.toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '0.5rem' }}>
                  <div>
                    <span style={{ color: '#cbd5e1', fontSize: '0.85rem', display: 'block' }}>Next Month Payable Per Member</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Nominal (₹{calcResults.nominalMonthly.toLocaleString()}) - Dividend (₹{calcResults.dividendPerMember.toLocaleString()})</span>
                  </div>
                  <strong style={{ color: '#f8fafc', fontSize: '1rem', fontWeight: 700 }}>₹{calcResults.nextPayableAmount.toLocaleString()}</strong>
                </div>
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            marginTop: '1.5rem',
            color: '#818cf8',
            fontSize: '0.78rem',
            fontWeight: 600
          }}>
            <ShieldCheck size={16} />
            <span>Decimals safe math engine verified</span>
          </div>
        </div>
      </div>

      {/* AUCTION HISTORY RECORDS Table */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.85rem',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{
            fontSize: '0.95rem',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            margin: 0
          }}>
            AUCTION HISTORY RECORDS
          </h2>
        </div>

        {auctions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              No auction records found yet. Record the first monthly auction above.
            </p>
          </div>
        ) : (
          <div style={{ 
            overflowX: 'auto', 
            width: '100%', 
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin'
          }}>
            <table style={{ 
              width: '100%', 
              minWidth: '1280px', 
              borderCollapse: 'collapse', 
              textAlign: 'left', 
              fontSize: '0.88rem' 
            }}>
              <thead>
                <tr style={{ backgroundColor: '#0c1427', color: '#ffffff' }}>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '220px', width: '220px', whiteSpace: 'nowrap' }}>SCHEME</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '100px', whiteSpace: 'nowrap' }}>MONTH</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '110px', whiteSpace: 'nowrap' }}>DATE</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '160px', whiteSpace: 'nowrap' }}>WINNING MEMBER</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '130px', whiteSpace: 'nowrap' }}>WINNING DISCOUNT</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '130px', whiteSpace: 'nowrap' }}>FOREMAN COMM.</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '130px', whiteSpace: 'nowrap' }}>WINNER PAYOUT</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '130px', whiteSpace: 'nowrap' }}>DIVIDEND / MEMBER</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '120px', whiteSpace: 'nowrap' }}>NEXT PAYABLE</th>
                  <th style={{ padding: '0.9rem 1rem', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '100px', textAlign: 'center', whiteSpace: 'nowrap' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {auctions.map((auc, index) => {
                  const dateStr = auc.auctionDate
                    ? new Date(auc.auctionDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
                    : '-';

                  const totalMonths = Number(auc.chit?.durationMonths || auc.chit?.totalMonths || 12);
                  const isFinalMonth = Number(auc.monthNumber) >= totalMonths || Number(auc.nextPayableAmount) === 0;
                  const isFixed = auc.chit?.termsAndConditions?.toLowerCase().includes('fixed') || (auc.dividendPerMember === 0 && auc.foremanCommission === 0);
                  const displayForeman = isFixed ? 0 : Number(auc.foremanCommission);
                  const displayDividend = isFixed ? 0 : Number(auc.dividendPerMember);
                  const displayNextPayable = isFinalMonth 
                    ? 0
                    : (isFixed 
                        ? (Number(auc.chit?.monthlyContribution) || Number(auc.nextPayableAmount))
                        : Number(auc.nextPayableAmount));

                  return (
                    <tr
                      key={auc.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc'}
                    >
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#0f172a', minWidth: '220px' }}>
                        {auc.chit?.name || 'Chit Scheme'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: '#334155', fontWeight: 600 }}>
                        Month {auc.monthNumber}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: '#64748b' }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: '#0f172a' }}>
                        <div style={{ fontWeight: 600 }}>{auc.winningMember?.name || 'Winner'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{auc.winningTicket || ''}</div>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#f59e0b' }}>
                        ₹{Number(auc.winningBidDiscount).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: '#475569' }}>
                        ₹{displayForeman.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#2563eb' }}>
                        ₹{Number(auc.winnerPayout).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#0284c7' }}>
                        ₹{displayDividend.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                        {isFinalMonth ? (
                          <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.2rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem' }}>
                            ₹0 (Completed)
                          </span>
                        ) : (
                          `₹${displayNextPayable.toLocaleString()}`
                        )}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {auc.receiptUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewReceiptUrl(auc.receiptUrl)}
                              title="View Payout Receipt"
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                borderRadius: '0.4rem',
                                padding: '0.35rem 0.6rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.78rem',
                                fontWeight: 600
                              }}
                            >
                              <Eye size={13} />
                              <span>Receipt</span>
                            </button>
                          )}
                          {user?.role === 'superadmin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAuction(auc.id)}
                              title="Delete Auction Record"
                              style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                borderRadius: '0.4rem',
                                padding: '0.35rem 0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lightbox / Receipt Modal */}
      {previewReceiptUrl && (
        <div
          onClick={() => setPreviewReceiptUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.85rem',
              maxWidth: '600px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Winner Payout Proof Receipt</strong>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ textAlign: 'center', maxHeight: '70vh', overflowY: 'auto' }}>
              <img
                src={previewReceiptUrl.startsWith('http') ? previewReceiptUrl : `${API_URL.replace('/api', '')}${previewReceiptUrl}`}
                alt="Payout Receipt"
                style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '0.5rem', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AuctionManager;
