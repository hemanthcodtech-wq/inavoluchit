import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import ScrollAnimationWrapper from '../components/ScrollAnimationWrapper';
import ProofUploader from '../components/ProofUploader';
import {
  getChitMonthDate,
  formatChitMonthYear,
  formatChitMonthFull,
  formatChitMonthWithNum
} from '../utils/chitDateUtils';
import {
  Gavel,
  Calendar,
  IndianRupee,
  Users,
  CheckCircle2,
  FileText,
  Upload,
  Eye,
  Trash2,
  AlertCircle,
  Clock,
  Check,
  ShieldCheck,
  RefreshCw,
  Building,
  CreditCard,
  UserCheck,
  Search,
  Filter,
  Download,
  Trophy,
  ArrowRight,
  ChevronRight,
  Layers,
  Sparkles,
  ExternalLink,
  Plus
} from 'lucide-react';

const AuctionManager = () => {
  const { user, token, API_URL, SERVER_URL } = useAuth();
  const isStaffOrAdmin = user && (user.role === 'superadmin' || user.role === 'employee');

  // Navigation Tab State ('conduct' or 'history')
  const [activeTab, setActiveTab] = useState('conduct');

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
    return today.toISOString().split('T')[0];
  });
  const [participatingUserIds, setParticipatingUserIds] = useState([]);
  const [winningMemberId, setWinningMemberId] = useState('');
  const [auctionAmount, setAuctionAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('Bank Transfer (NEFT / RTGS / IMPS)');
  const [beneficiaryBank, setBeneficiaryBank] = useState('');
  const [bankUtr, setBankUtr] = useState('');
  const [auctionNotes, setAuctionNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);

  // Search & Filters for History
  const [filterChitId, setFilterChitId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Proof Lightbox
  const [lightboxUrl, setLightboxUrl] = useState(null);

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
  const selectedChit = useMemo(() => {
    return chits.find((c) => (c.id || c._id) === selectedChitId);
  }, [chits, selectedChitId]);

  // Approved enrolled members for selected chit
  const enrolledMembers = useMemo(() => {
    if (!selectedChit) return [];
    const raw = (selectedChit.members || []).filter((m) => m.status === 'approved');

    // Group by user id to prevent duplicate users in participation list
    const userMap = {};
    raw.forEach((m) => {
      const u = m.user || {};
      const uId = u.id || u._id || m.userId;
      if (!uId) return;
      if (!userMap[uId]) {
        userMap[uId] = {
          id: uId,
          name: u.name || 'Member',
          email: u.email || '',
          phone: u.phone || '',
          memberId: u.memberId || '',
          profileImgUrl: u.profileImgUrl || '',
          tickets: [],
          slotCount: 0
        };
      }
      userMap[uId].slotCount++;
      if (m.ticketId) userMap[uId].tickets.push(m.ticketId);
    });

    return Object.values(userMap);
  }, [selectedChit]);

  // Handle Chit Change
  const handleChitChange = (chitId) => {
    setSelectedChitId(chitId);
    setWinningMemberId('');
    setParticipatingUserIds([]);
    setAuctionAmount('');
    setMessage({ text: '', type: '' });

    if (chitId) {
      const chit = chits.find((c) => (c.id || c._id) === chitId);
      if (chit) {
        const chitAuctions = auctions.filter((a) => (a.chitId?.id || a.chitId?._id || a.chitId) === chitId);
        const nextMonth =
          chitAuctions.length > 0
            ? Math.max(...chitAuctions.map((a) => a.monthNumber)) + 1
            : (chit.currentMonth || 1);
        const mStr = String(Math.min(nextMonth, chit.durationMonths || 20));
        setAuctionMonth(mStr);

        // Pre-select all enrolled members as participating by default
        const rawMembers = (chit.members || []).filter((m) => m.status === 'approved');
        const ids = [...new Set(rawMembers.map((m) => m.user?.id || m.user?._id || m.userId).filter(Boolean))];
        setParticipatingUserIds(ids);
      }
    }
  };

  // Toggle Participating User
  const toggleParticipatingUser = (userId) => {
    setParticipatingUserIds((prev) => {
      if (prev.includes(userId)) {
        const next = prev.filter((id) => id !== userId);
        if (winningMemberId === userId) {
          setWinningMemberId('');
        }
        return next;
      } else {
        return [...prev, userId];
      }
    });
  };

  // Select all / clear participating users
  const handleSelectAllParticipants = () => {
    const allIds = enrolledMembers.map((m) => m.id);
    setParticipatingUserIds(allIds);
  };

  const handleClearParticipants = () => {
    setParticipatingUserIds([]);
    setWinningMemberId('');
  };

  // Summary Metrics
  const totalAuctionsCount = auctions.length;
  const totalPrizeDistributed = useMemo(() => {
    return auctions.reduce((sum, a) => sum + Number(a.auctionAmount || a.winnerPayout || 0), 0);
  }, [auctions]);
  const activeChitsCount = useMemo(() => {
    return chits.filter((c) => c.status === 'active').length;
  }, [chits]);
  const latestAuction = auctions[0] || null;

  // Submit Auction Record
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (!selectedChitId) {
      return setMessage({ text: 'Please select a chit scheme.', type: 'error' });
    }
    if (!auctionMonth || Number(auctionMonth) <= 0) {
      return setMessage({ text: 'Please select a valid auction month.', type: 'error' });
    }
    if (!winningMemberId) {
      return setMessage({ text: 'Please select which user is awarded the auctioned chit payout.', type: 'error' });
    }
    if (!auctionAmount || Number(auctionAmount) <= 0) {
      return setMessage({ text: 'Please enter how much amount was auctioned (prize payout).', type: 'error' });
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('chitId', selectedChitId);
      formData.append('monthNumber', auctionMonth);
      formData.append('auctionDate', auctionDate);
      formData.append('auctionAmount', auctionAmount);
      formData.append('winnerPayout', auctionAmount);
      formData.append('winningMemberId', winningMemberId);
      formData.append('participatingUserIds', JSON.stringify(participatingUserIds));
      formData.append('payoutMethod', payoutMethod);
      if (beneficiaryBank.trim()) formData.append('beneficiaryBankName', beneficiaryBank.trim());
      if (bankUtr.trim()) formData.append('bankUtr', bankUtr.trim());
      if (auctionNotes.trim()) formData.append('auctionNotes', auctionNotes.trim());
      if (receiptFile) formData.append('receipt', receiptFile);

      const res = await fetch(`${API_URL}/auctions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          text: `Auction for Month ${auctionMonth} recorded successfully! Prize payout of ₹${Number(auctionAmount).toLocaleString()} saved.`,
          type: 'success'
        });

        // Reset form inputs
        setWinningMemberId('');
        setAuctionAmount('');
        setBankUtr('');
        setBeneficiaryBank('');
        setAuctionNotes('');
        setReceiptFile(null);

        // Refresh data
        await fetchData();

        // Switch to history tab so user sees the newly created record
        setTimeout(() => {
          setActiveTab('history');
        }, 800);
      } else {
        setMessage({ text: data.message || 'Failed to record auction.', type: 'error' });
      }
    } catch (err) {
      console.error('Error recording auction:', err);
      setMessage({ text: 'Connection error recording auction.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Auction Record
  const handleDeleteAuction = async (auctionId, mNum) => {
    if (!window.confirm(`Are you sure you want to delete the auction record for Month ${mNum}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auctions/${auctionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `Auction for Month ${mNum} deleted.`, type: 'success' });
        fetchData();
      } else {
        setMessage({ text: data.message || 'Failed to delete auction.', type: 'error' });
      }
    } catch (err) {
      console.error('Error deleting auction:', err);
      setMessage({ text: 'Error deleting auction record.', type: 'error' });
    }
  };

  const getFullImgUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base =
      SERVER_URL ||
      (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5000'
        : import.meta.env.VITE_SERVER_URL || 'http://localhost:5000');
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  // Filtered recorded auctions
  const filteredAuctions = useMemo(() => {
    return auctions.filter((a) => {
      const cId = a.chitId?._id || a.chitId?.id || a.chitId;
      if (filterChitId !== 'all' && cId !== filterChitId) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const chitName = (a.chit?.name || a.chitId?.name || '').toLowerCase();
      const winnerName = (a.winningMember?.name || '').toLowerCase();
      const winnerId = (a.winningMember?.memberId || '').toLowerCase();
      const utr = (a.bankUtr || '').toLowerCase();
      return chitName.includes(q) || winnerName.includes(q) || winnerId.includes(q) || utr.includes(q);
    });
  }, [auctions, filterChitId, searchQuery]);

  return (
    <div className="auction-page-container">
      <ScrollAnimationWrapper>
        {/* Top Header Banner */}
        <div className="auction-header-banner">
          <div className="auction-header-text">
            <div className="auction-badge">
              <Gavel size={14} />
              <span>Chit Auction Portal</span>
            </div>
            <h1 className="auction-title">
              Monthly <span className="highlight-text">Auction Management</span>
            </h1>
            <p className="auction-subtitle">
              Conduct live monthly auctions, select bidders, award payouts, and manage verified payment proofs.
            </p>
          </div>

          <div className="auction-header-actions">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="refresh-btn"
              title="Refresh Records"
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Summary Stat Cards */}
      <div className="auction-stats-grid">
        <div className="auction-stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Gavel size={22} />
          </div>
          <div>
            <span className="stat-card-label">Auctions Recorded</span>
            <div className="stat-card-value">{totalAuctionsCount}</div>
            <span className="stat-card-sub">Completed bidding sessions</span>
          </div>
        </div>

        <div className="auction-stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <IndianRupee size={22} />
          </div>
          <div>
            <span className="stat-card-label">Total Prize Disbursed</span>
            <div className="stat-card-value" style={{ color: '#059669' }}>
              ₹{totalPrizeDistributed.toLocaleString()}
            </div>
            <span className="stat-card-sub">Net payout to winners</span>
          </div>
        </div>

        <div className="auction-stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <Building size={22} />
          </div>
          <div>
            <span className="stat-card-label">Active Schemes</span>
            <div className="stat-card-value">{activeChitsCount}</div>
            <span className="stat-card-sub">Chit schemes currently active</span>
          </div>
        </div>

        <div className="auction-stat-card">
          <div className="stat-card-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
            <Trophy size={22} />
          </div>
          <div>
            <span className="stat-card-label">Latest Winner</span>
            <div className="stat-card-value" style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {latestAuction?.winningMember?.name || 'None Recorded'}
            </div>
            <span className="stat-card-sub">
              {latestAuction ? `${formatChitMonthYear(latestAuction.chit, latestAuction.monthNumber)} (M${latestAuction.monthNumber}) • ₹${Number(latestAuction.auctionAmount || latestAuction.winnerPayout || 0).toLocaleString()}` : 'Awaiting first auction'}
            </span>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message.text && (
        <div className={`auction-alert-box ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage({ text: '', type: '' })} className="alert-close-btn">
            ✕
          </button>
        </div>
      )}

      {/* Responsive View Tabs */}
      <div className="auction-nav-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('conduct')}
          className={`tab-btn ${activeTab === 'conduct' ? 'active' : ''}`}
        >
          <Gavel size={17} />
          <span>Conduct Auction</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
        >
          <Building size={17} />
          <span>Auction History</span>
          <span className="tab-count-badge">{filteredAuctions.length}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CONDUCT AUCTION FORM                                               */}
      {/* ========================================================================= */}
      {activeTab === 'conduct' && (
        <ScrollAnimationWrapper>
          <div className="conduct-auction-card">
            <div className="conduct-card-header">
              <div className="conduct-header-icon">
                <Gavel size={22} />
              </div>
              <div>
                <h2 className="conduct-header-title">Conduct Monthly Auction</h2>
                <p className="conduct-header-desc">
                  Select chit scheme, mark participating bidders, pick the winning member, and save receipt proof.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="conduct-form">
              <div className="conduct-form-grid">
                
                {/* LEFT COLUMN: Scheme, Month & Bidders */}
                <div className="form-col">
                  {/* Step 1: Select Chit */}
                  <div className="form-group">
                    <label className="form-label">
                      1. Select Chit Scheme <span className="req-star">*</span>
                    </label>
                    <select
                      value={selectedChitId}
                      onChange={(e) => handleChitChange(e.target.value)}
                      required
                      className="form-input form-select"
                    >
                      <option value="">-- Choose Active Chit Scheme --</option>
                      {chits.map((c) => (
                        <option key={c.id || c._id} value={c.id || c._id}>
                          {c.name} — ₹{Number(c.chitValue).toLocaleString()} ({c.durationMonths} Mos) [{c.status}]
                        </option>
                      ))}
                    </select>
                    {selectedChit && (
                      <div className="selected-chit-badge-row">
                        <span className="chit-info-chip">
                          Pool: <strong>₹{Number(selectedChit.chitValue).toLocaleString()}</strong>
                        </span>
                        <span className="chit-info-chip">
                          Duration: <strong>{selectedChit.durationMonths} Mos</strong>
                        </span>
                        <span className="chit-info-chip">
                          Enrolled: <strong>{enrolledMembers.length} Members</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Month & Date */}
                  <div className="form-row-2col">
                    <div className="form-group">
                      <label className="form-label">
                        2. Auction Month & Year <span className="req-star">*</span>
                      </label>
                      <select
                        value={auctionMonth}
                        onChange={(e) => {
                          const mVal = e.target.value;
                          setAuctionMonth(mVal);
                          if (selectedChit) {
                            const d = getChitMonthDate(selectedChit, mVal);
                            if (d) {
                              const yr = d.getFullYear();
                              const mo = String(d.getMonth() + 1).padStart(2, '0');
                              const day = String(new Date().getDate()).padStart(2, '0');
                              setAuctionDate(`${yr}-${mo}-${day}`);
                            }
                          }
                        }}
                        required
                        className="form-input form-select"
                      >
                        {Array.from({ length: selectedChit?.durationMonths || 20 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            {formatChitMonthWithNum(selectedChit, m)}
                          </option>
                        ))}
                      </select>
                      {selectedChit && (
                        <span className="form-hint" style={{ color: '#1e40af', fontWeight: 600 }}>
                          📅 Target Period: {formatChitMonthFull(selectedChit, auctionMonth)}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Auction Date <span className="req-star">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={auctionDate}
                        onChange={(e) => setAuctionDate(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Step 3: Participating Bidders Selection */}
                  <div className="form-group">
                    <div className="bidders-header">
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        3. Participating Bidders ({participatingUserIds.length}/{enrolledMembers.length})
                      </label>
                      <div className="bidders-quick-actions">
                        <button
                          type="button"
                          onClick={handleSelectAllParticipants}
                          disabled={enrolledMembers.length === 0}
                          className="link-btn"
                        >
                          Select All
                        </button>
                        <span className="dot-sep">•</span>
                        <button
                          type="button"
                          onClick={handleClearParticipants}
                          disabled={participatingUserIds.length === 0}
                          className="link-btn link-btn-secondary"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {enrolledMembers.length === 0 ? (
                      <div className="bidders-empty-box">
                        {selectedChitId
                          ? 'No approved members enrolled in this chit scheme yet.'
                          : 'Select a chit scheme first to view enrolled members.'}
                      </div>
                    ) : (
                      <div className="bidders-list-box">
                        {enrolledMembers.map((m) => {
                          const isSelected = participatingUserIds.includes(m.id);
                          return (
                            <div
                              key={m.id}
                              onClick={() => toggleParticipatingUser(m.id)}
                              className={`bidder-item ${isSelected ? 'selected' : ''}`}
                            >
                              <div className="bidder-item-left">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // handled by parent div
                                  className="bidder-checkbox"
                                />
                                <div>
                                  <div className="bidder-name">{m.name}</div>
                                  <div className="bidder-meta">
                                    {m.memberId ? `ID: ${m.memberId}` : ''} {m.phone ? `• ${m.phone}` : ''}
                                  </div>
                                </div>
                              </div>
                              <span className="bidder-slot-badge">
                                {m.slotCount} {m.slotCount === 1 ? 'Slot' : 'Slots'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <span className="form-hint">
                      Check members who attended or placed bids in this session.
                    </span>
                  </div>
                </div>

                {/* RIGHT COLUMN: Winner, Payout & Receipt */}
                <div className="form-col">
                  {/* Step 4: Given To Which User */}
                  <div className="form-group">
                    <label className="form-label">
                      4. Awarded Winning Member <span className="req-star">*</span>
                    </label>
                    <select
                      value={winningMemberId}
                      onChange={(e) => setWinningMemberId(e.target.value)}
                      required
                      disabled={enrolledMembers.length === 0}
                      className="form-input form-select winner-select"
                    >
                      <option value="">-- Choose Winning User --</option>
                      {(participatingUserIds.length > 0
                        ? enrolledMembers.filter((m) => participatingUserIds.includes(m.id))
                        : enrolledMembers
                      ).map((m) => (
                        <option key={m.id} value={m.id}>
                          🏆 {m.name} {m.memberId ? `(${m.memberId})` : ''} — {m.phone}
                        </option>
                      ))}
                    </select>
                    {winningMemberId ? (
                      <div className="winner-confirm-pill">
                        <Trophy size={14} color="#b45309" />
                        <span>Winner: <strong>{enrolledMembers.find((m) => m.id === winningMemberId)?.name}</strong> will receive Month {auctionMonth} payout.</span>
                      </div>
                    ) : (
                      <span className="form-hint" style={{ color: '#2563eb', fontWeight: 600 }}>
                        Selected member will receive the auctioned prize fund payout for Month {auctionMonth}.
                      </span>
                    )}
                  </div>

                  {/* Step 5: Auctioned Amount */}
                  <div className="form-group">
                    <label className="form-label">
                      5. Auctioned Amount / Prize Payout (₹) <span className="req-star">*</span>
                    </label>
                    <div className="amount-input-wrap">
                      <span className="rupee-symbol">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={auctionAmount}
                        onChange={(e) => setAuctionAmount(e.target.value)}
                        placeholder="e.g., 70000"
                        className="form-input amount-input"
                      />
                    </div>
                    {selectedChit && auctionAmount && (
                      <div className="amount-breakdown-card">
                        <div className="breakdown-item">
                          <span>Chit Pool Value:</span>
                          <strong>₹{Number(selectedChit.chitValue).toLocaleString()}</strong>
                        </div>
                        <div className="breakdown-item">
                          <span>Bid Discount:</span>
                          <strong style={{ color: '#d97706' }}>
                            ₹{Math.max(0, Number(selectedChit.chitValue) - Number(auctionAmount)).toLocaleString()}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 6: Payout Method & UTR */}
                  <div className="form-row-2col">
                    <div className="form-group">
                      <label className="form-label">Payout Method</label>
                      <select
                        value={payoutMethod}
                        onChange={(e) => setPayoutMethod(e.target.value)}
                        className="form-input form-select"
                      >
                        <option value="Bank Transfer (NEFT / RTGS / IMPS)">Bank Transfer (NEFT/RTGS/IMPS)</option>
                        <option value="Cash">Cash Handover</option>
                        <option value="UPI">UPI / PhonePe / GPay</option>
                        <option value="Cheque">Bank Cheque</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Bank UTR / Ref #</label>
                      <input
                        type="text"
                        value={bankUtr}
                        onChange={(e) => setBankUtr(e.target.value)}
                        placeholder="e.g., UTR / Trans ID"
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Step 7: Proof Upload */}
                  <div className="form-group">
                    <ProofUploader
                      label="Auction Payout Proof Receipt"
                      description="Upload payment receipt or voucher photograph"
                      required={false}
                      onFileSelected={(file) => setReceiptFile(file)}
                    />
                  </div>

                  {/* Step 8: Notes */}
                  <div className="form-group">
                    <label className="form-label">Session Notes (Optional)</label>
                    <input
                      type="text"
                      value={auctionNotes}
                      onChange={(e) => setAuctionNotes(e.target.value)}
                      placeholder="e.g., 4 members placed active bids"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Form Bottom Actions */}
              <div className="form-actions-bar">
                <button
                  type="submit"
                  disabled={submitting}
                  className="submit-auction-btn"
                >
                  <Check size={18} />
                  <span>{submitting ? 'Saving Auction Record...' : 'Save Auction Record & Proof'}</span>
                </button>
              </div>
            </form>
          </div>
        </ScrollAnimationWrapper>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RECORDED AUCTIONS HISTORY & RECEIPTS                               */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <ScrollAnimationWrapper>
          <div className="history-container-card">
            {/* Header & Filter Controls */}
            <div className="history-filter-bar">
              <div>
                <h2 className="history-card-title">
                  <Building size={20} color="#2563eb" />
                  <span>Recorded Auction History ({filteredAuctions.length})</span>
                </h2>
                <p className="history-card-desc">
                  Registry of past auctions, prize payouts, participating bidders, and proof vouchers.
                </p>
              </div>

              <div className="history-controls">
                <select
                  value={filterChitId}
                  onChange={(e) => setFilterChitId(e.target.value)}
                  className="history-filter-select"
                >
                  <option value="all">All Chit Schemes</option>
                  {chits.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <div className="history-search-wrap">
                  <Search size={15} className="history-search-icon" />
                  <input
                    type="text"
                    placeholder="Search winner, UTR, chit..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="history-search-input"
                  />
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredAuctions.length === 0 ? (
              <div className="history-empty-state">
                <Gavel size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
                <h3>No Auction Records Found</h3>
                <p>
                  {searchQuery || filterChitId !== 'all'
                    ? 'No records match your search filter. Try clearing filters.'
                    : 'Conduct and save your first auction using the "Conduct New Auction" tab.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('conduct')}
                  className="btn-create-auction"
                >
                  <Plus size={16} />
                  <span>Conduct Auction Now</span>
                </button>
              </div>
            ) : (
              <>
                {/* Desktop / Tablet Table View (>= 768px) */}
                <div className="history-table-wrapper hidden-on-mobile">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Chit & Month</th>
                        <th>Winning Member</th>
                        <th>Auctioned Amount</th>
                        <th>Participating Bidders</th>
                        <th>Payout & UTR</th>
                        <th>Proof Receipt</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuctions.map((a) => {
                        const chitName = a.chit?.name || a.chitId?.name || 'Chit Scheme';
                        const winner = a.winningMember || {};
                        const participants = a.participatingUsers || [];
                        const hasProof = a.receiptUrl && a.receiptUrl !== 'MANUAL_ENTRY';

                        return (
                          <tr key={a.id || a._id}>
                            {/* Chit & Month */}
                            <td>
                              <div className="table-chit-name">{chitName}</div>
                              <div className="table-chit-meta">
                                <span className="month-pill">{formatChitMonthYear(a.chit, a.monthNumber)} • M{a.monthNumber}</span>
                                <span className="date-text">
                                  {a.auctionDate
                                    ? new Date(a.auctionDate).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })
                                    : '—'}
                                </span>
                              </div>
                            </td>

                            {/* Winning Member */}
                            <td>
                              <div className="table-winner-cell">
                                <div className="winner-trophy-badge">🏆</div>
                                <div>
                                  <div className="winner-name">{winner.name || 'Member'}</div>
                                  <div className="winner-sub">
                                    {winner.memberId ? `ID: ${winner.memberId}` : ''}{' '}
                                    {winner.phone ? `• ${winner.phone}` : ''}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Auctioned Amount */}
                            <td>
                              <div className="payout-amount-text">
                                ₹{Number(a.auctionAmount || a.winnerPayout || 0).toLocaleString()}
                              </div>
                              <div className="payout-sub">Prize payout given</div>
                            </td>

                            {/* Participating Bidders */}
                            <td>
                              {participants.length === 0 ? (
                                <span className="all-enrolled-tag">All enrolled members</span>
                              ) : (
                                <div className="bidders-chips-wrap">
                                  {participants.slice(0, 3).map((p, idx) => (
                                    <span key={p.id || p._id || idx} className="bidder-chip">
                                      {p.name || 'Member'}
                                    </span>
                                  ))}
                                  {participants.length > 3 && (
                                    <span className="bidder-chip-more">
                                      +{participants.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Payout & UTR */}
                            <td>
                              <div className="payout-method-text">{a.payoutMethod || 'Bank Transfer'}</div>
                              {a.bankUtr && <div className="payout-utr-code">UTR: {a.bankUtr}</div>}
                            </td>

                            {/* Proof Receipt */}
                            <td>
                              {hasProof ? (
                                <div className="proof-cell">
                                  <img
                                    src={getFullImgUrl(a.receiptUrl)}
                                    alt="Receipt"
                                    onClick={() => setLightboxUrl(getFullImgUrl(a.receiptUrl))}
                                    className="proof-thumb"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setLightboxUrl(getFullImgUrl(a.receiptUrl))}
                                    className="view-proof-btn"
                                  >
                                    <Eye size={13} />
                                    <span>View</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="no-proof-text">No receipt</span>
                              )}
                            </td>

                            {/* Action */}
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteAuction(a.id || a._id, a.monthNumber)}
                                title="Delete Record"
                                className="delete-auction-btn"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Cards View (< 768px) */}
                <div className="history-mobile-cards">
                  {filteredAuctions.map((a) => {
                    const chitName = a.chit?.name || a.chitId?.name || 'Chit Scheme';
                    const winner = a.winningMember || {};
                    const participants = a.participatingUsers || [];
                    const hasProof = a.receiptUrl && a.receiptUrl !== 'MANUAL_ENTRY';

                    return (
                      <div key={a.id || a._id} className="mobile-auction-card">
                        <div className="mobile-card-top">
                          <div>
                            <div className="mobile-chit-name">{chitName}</div>
                            <span className="month-pill">{formatChitMonthYear(a.chit, a.monthNumber)} • M{a.monthNumber}</span>
                            <span className="mobile-date">
                              {a.auctionDate
                                ? new Date(a.auctionDate).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })
                                : ''}
                            </span>
                          </div>
                          <div className="mobile-amount-badge">
                            ₹{Number(a.auctionAmount || a.winnerPayout || 0).toLocaleString()}
                          </div>
                        </div>

                        <div className="mobile-card-divider" />

                        <div className="mobile-winner-row">
                          <div className="winner-trophy-badge">🏆</div>
                          <div>
                            <div className="winner-name">{winner.name || 'Member'}</div>
                            <div className="winner-sub">
                              {winner.memberId ? `ID: ${winner.memberId}` : ''}{' '}
                              {winner.phone ? `• ${winner.phone}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="mobile-details-grid">
                          <div>
                            <span className="mobile-detail-lbl">Payout Method</span>
                            <div className="mobile-detail-val">{a.payoutMethod || 'Bank Transfer'}</div>
                            {a.bankUtr && <div className="payout-utr-code">UTR: {a.bankUtr}</div>}
                          </div>

                          <div>
                            <span className="mobile-detail-lbl">Bidders</span>
                            <div className="mobile-detail-val">
                              {participants.length > 0 ? `${participants.length} participated` : 'All enrolled'}
                            </div>
                          </div>
                        </div>

                        <div className="mobile-card-footer">
                          {hasProof ? (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(getFullImgUrl(a.receiptUrl))}
                              className="mobile-view-proof-btn"
                            >
                              <Eye size={14} />
                              <span>View Receipt Proof</span>
                            </button>
                          ) : (
                            <span className="no-proof-text">No receipt proof</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteAuction(a.id || a._id, a.monthNumber)}
                            className="delete-auction-btn"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </ScrollAnimationWrapper>
      )}

      {/* Lightbox Modal for Receipt Proofs */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} className="lightbox-overlay">
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Receipt Proof" className="lightbox-img" />
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="lightbox-close-btn"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Scoped Responsive Styles */}
      <style>{`
        .auction-page-container {
          width: 100%;
          max-width: 1300px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        /* Top Banner */
        .auction-header-banner {
          background: linear-gradient(135deg, #0a1e3b 0%, #1e3a8a 100%);
          color: #ffffff;
          border-radius: 16px;
          padding: 1.75rem 2rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 25px rgba(10, 30, 59, 0.22);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.25rem;
        }

        .auction-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background-color: rgba(251, 191, 36, 0.15);
          border: 1px solid #fbbf24;
          color: #fbbf24;
          padding: 0.3rem 0.8rem;
          border-radius: 9999px;
          font-size: 0.76rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 0.5rem;
        }

        .auction-title {
          font-size: 1.95rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .highlight-text {
          color: #fbbf24;
        }

        .auction-subtitle {
          color: #cbd5e1;
          margin: 0.45rem 0 0 0;
          font-size: 0.92rem;
          max-width: 650px;
          line-height: 1.45;
        }

        .refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.25rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background-color: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          backdrop-filter: blur(6px);
          transition: all 0.2s ease;
        }
        .refresh-btn:hover:not(:disabled) {
          background-color: rgba(255, 255, 255, 0.22);
          transform: translateY(-1px);
        }

        /* Stat Cards */
        .auction-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.75rem;
        }

        .auction-stat-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1.15rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
          transition: transform 0.2s, box-shadow 0.2s;
          min-width: 0;
        }
        .auction-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
        }

        .stat-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-card-label {
          display: block;
          font-size: 0.74rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .stat-card-value {
          font-size: 1.55rem;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.2;
          margin: 0.15rem 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .stat-card-sub {
          font-size: 0.74rem;
          color: #94a3b8;
          font-weight: 500;
        }

        /* Alert Box */
        .auction-alert-box {
          padding: 0.9rem 1.25rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          position: relative;
        }
        .alert-error {
          background-color: #fee2e2;
          color: #dc2626;
          border: 1.5px solid #f87171;
        }
        .alert-success {
          background-color: #ecfdf5;
          color: #059669;
          border: 1.5px solid #6ee7b7;
        }
        .alert-close-btn {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          color: inherit;
          opacity: 0.7;
        }

        /* Navigation Tabs */
        .auction-nav-tabs {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0.65rem;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .auction-nav-tabs::-webkit-scrollbar {
          display: none;
        }

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.7rem 1.4rem;
          border-radius: 10px;
          border: 1px solid transparent;
          background-color: transparent;
          color: #64748b;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .tab-btn:hover {
          color: #1e3a8a;
          background-color: #f1f5f9;
        }
        .tab-btn.active {
          background-color: #1e3a8a;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.25);
        }

        .tab-count-badge {
          background-color: rgba(255, 255, 255, 0.25);
          color: inherit;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
        }
        .tab-btn:not(.active) .tab-count-badge {
          background-color: #e2e8f0;
          color: #475569;
        }

        /* Conduct Auction Card */
        .conduct-auction-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }

        .conduct-card-header {
          background-color: #f8fafc;
          padding: 1.25rem 1.75rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .conduct-header-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background-color: #eff6ff;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .conduct-header-title {
          font-size: 1.25rem;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
        }

        .conduct-header-desc {
          font-size: 0.82rem;
          color: #64748b;
          margin: 0.2rem 0 0 0;
        }

        .conduct-form {
          padding: 1.75rem;
        }

        .conduct-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .form-col {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 0.4rem;
        }

        .req-star {
          color: #dc2626;
        }

        .form-row-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-input {
          width: 100%;
          padding: 0.7rem 0.85rem;
          border-radius: 9px;
          border: 1.5px solid #cbd5e1;
          font-size: 0.9rem;
          font-weight: 600;
          color: #0f172a;
          background-color: #ffffff;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .form-select {
          cursor: pointer;
        }

        .winner-select {
          border: 2px solid #2563eb !important;
          font-size: 0.92rem !important;
          font-weight: 700 !important;
        }

        .selected-chit-badge-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-top: 0.45rem;
        }

        .chit-info-chip {
          background-color: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
          font-size: 0.74rem;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
        }

        .winner-confirm-pill {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background-color: #fef3c7;
          border: 1px solid #fde68a;
          color: #92400e;
          padding: 0.4rem 0.65rem;
          border-radius: 7px;
          font-size: 0.78rem;
          margin-top: 0.45rem;
        }

        .form-hint {
          font-size: 0.74rem;
          color: #64748b;
          margin-top: 0.35rem;
        }

        /* Bidders Box */
        .bidders-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.45rem;
        }

        .bidders-quick-actions {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .link-btn {
          background: none;
          border: none;
          color: #2563eb;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }
        .link-btn:hover {
          text-decoration: underline;
        }
        .link-btn-secondary {
          color: #64748b;
        }

        .dot-sep {
          color: #cbd5e1;
          font-size: 0.8rem;
        }

        .bidders-empty-box {
          padding: 1.5rem;
          background-color: #f8fafc;
          border-radius: 8px;
          border: 1px dashed #cbd5e1;
          text-align: center;
          font-size: 0.82rem;
          color: #64748b;
        }

        .bidders-list-box {
          max-height: 210px;
          overflow-y: auto;
          border: 1.5px solid #cbd5e1;
          border-radius: 9px;
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          background-color: #f8fafc;
        }

        .bidder-item {
          padding: 0.55rem 0.75rem;
          border-radius: 7px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          font-size: 0.84rem;
          transition: all 0.15s ease;
          user-select: none;
        }
        .bidder-item:hover {
          border-color: #93c5fd;
          background-color: #f0fdf4;
        }
        .bidder-item.selected {
          background-color: #eff6ff;
          border-color: #3b82f6;
        }

        .bidder-item-left {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          min-width: 0;
        }

        .bidder-checkbox {
          cursor: pointer;
          width: 16px;
          height: 16px;
          accent-color: #2563eb;
        }

        .bidder-name {
          font-weight: 700;
          color: #0f172a;
          word-break: break-word;
        }

        .bidder-meta {
          font-size: 0.72rem;
          color: #64748b;
        }

        .bidder-slot-badge {
          font-size: 0.72rem;
          font-weight: 700;
          color: #1d4ed8;
          background-color: #dbeafe;
          padding: 0.18rem 0.5rem;
          border-radius: 6px;
          white-space: nowrap;
        }

        /* Amount Field */
        .amount-input-wrap {
          position: relative;
        }

        .rupee-symbol {
          position: absolute;
          left: 0.9rem;
          top: 50%;
          transform: translateY(-50%);
          font-weight: 900;
          color: #16a34a;
          font-size: 1.25rem;
        }

        .amount-input {
          padding-left: 2.3rem !important;
          border: 2px solid #16a34a !important;
          font-size: 1.35rem !important;
          font-weight: 900 !important;
          color: #14532d !important;
        }
        .amount-input:focus {
          border-color: #15803d !important;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15) !important;
        }

        .amount-breakdown-card {
          margin-top: 0.5rem;
          padding: 0.65rem 0.85rem;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #475569;
        }

        .breakdown-item strong {
          margin-left: 0.35rem;
        }

        /* Form Bottom Button */
        .form-actions-bar {
          margin-top: 1.75rem;
          padding-top: 1.25rem;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
        }

        .submit-auction-btn {
          padding: 0.85rem 2rem;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          color: #ffffff;
          font-weight: 800;
          font-size: 0.98rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          box-shadow: 0 4px 15px rgba(22, 163, 74, 0.35);
          transition: all 0.2s ease;
        }
        .submit-auction-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(22, 163, 74, 0.45);
        }
        .submit-auction-btn:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* History Table Container */
        .history-container-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }

        .history-filter-bar {
          background-color: #f8fafc;
          padding: 1.25rem 1.75rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .history-card-title {
          font-size: 1.2rem;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }

        .history-card-desc {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0.2rem 0 0 0;
        }

        .history-controls {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .history-filter-select {
          padding: 0.55rem 0.85rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 0.85rem;
          font-weight: 600;
          color: #0f172a;
          background-color: #fff;
          outline: none;
        }

        .history-search-wrap {
          position: relative;
        }

        .history-search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .history-search-input {
          padding: 0.55rem 0.85rem 0.55rem 2.2rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 0.85rem;
          width: 220px;
          outline: none;
          box-sizing: border-box;
        }
        .history-search-input:focus {
          border-color: #2563eb;
        }

        .history-empty-state {
          text-align: center;
          padding: 4.5rem 1.5rem;
          color: #64748b;
        }
        .history-empty-state h3 {
          font-size: 1.2rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }
        .history-empty-state p {
          font-size: 0.88rem;
          color: #64748b;
          margin: 0 0 1.5rem 0;
          max-width: 440px;
          margin-left: auto;
          margin-right: auto;
        }

        .btn-create-auction {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.65rem 1.4rem;
          border-radius: 9999px;
          border: none;
          background-color: #2563eb;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
        }

        /* Desktop Table */
        .history-table-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .history-table {
          width: 100%;
          min-width: 750px;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.84rem;
        }

        .history-table thead tr {
          background-color: #f8fafc;
          border-bottom: 1.5px solid #cbd5e1;
          color: #475569;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .history-table th {
          padding: 0.75rem 0.65rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .history-table td {
          padding: 0.75rem 0.65rem;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }

        .history-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .table-chit-name {
          font-weight: 800;
          color: #0f172a;
          font-size: 0.9rem;
        }

        .table-chit-meta {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          margin-top: 0.25rem;
        }

        .month-pill {
          background-color: #dbeafe;
          color: #1e40af;
          font-weight: 800;
          font-size: 0.72rem;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          white-space: nowrap;
        }

        .date-text {
          font-size: 0.74rem;
          color: #64748b;
          white-space: nowrap;
        }

        .table-winner-cell {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .winner-trophy-badge {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #fef3c7;
          border: 1px solid #fde68a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .winner-name {
          font-weight: 800;
          color: #0f172a;
          font-size: 0.88rem;
        }

        .winner-sub {
          font-size: 0.74rem;
          color: #64748b;
        }

        .payout-amount-text {
          font-size: 1.15rem;
          font-weight: 900;
          color: #15803d;
        }

        .payout-sub {
          font-size: 0.72rem;
          color: #64748b;
        }

        .all-enrolled-tag {
          font-size: 0.75rem;
          color: #94a3b8;
          font-style: italic;
        }

        .bidders-chips-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          max-width: 170px;
        }

        .bidder-chip {
          background-color: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .bidder-chip-more {
          background-color: #e2e8f0;
          color: #475569;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .payout-method-text {
          font-weight: 700;
          color: #0f172a;
          font-size: 0.8rem;
        }

        .payout-utr-code {
          font-size: 0.74rem;
          color: #2563eb;
          font-family: monospace;
          font-weight: 700;
          margin-top: 0.15rem;
        }

        .proof-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .proof-thumb {
          width: 36px;
          height: 36px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .proof-thumb:hover {
          transform: scale(1.08);
        }

        .view-proof-btn {
          background: transparent;
          border: none;
          color: #2563eb;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0;
        }
        .view-proof-btn:hover {
          text-decoration: underline;
        }

        .no-proof-text {
          font-size: 0.76rem;
          color: #94a3b8;
          font-style: italic;
        }

        .delete-auction-btn {
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 7px;
          padding: 0.4rem 0.65rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.76rem;
          font-weight: 700;
          transition: all 0.15s ease;
        }
        .delete-auction-btn:hover {
          background-color: #dc2626;
          color: #ffffff;
        }

        /* Mobile Cards View */
        .history-mobile-cards {
          display: none;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
        }

        .mobile-auction-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }

        .mobile-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .mobile-chit-name {
          font-weight: 800;
          font-size: 1rem;
          color: #0f172a;
          margin-bottom: 0.25rem;
        }

        .mobile-date {
          font-size: 0.76rem;
          color: #64748b;
          margin-left: 0.5rem;
        }

        .mobile-amount-badge {
          font-size: 1.15rem;
          font-weight: 900;
          color: #15803d;
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 0.3rem 0.65rem;
          border-radius: 8px;
          white-space: nowrap;
        }

        .mobile-card-divider {
          height: 1px;
          background-color: #f1f5f9;
          margin: 0.85rem 0;
        }

        .mobile-winner-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 0.85rem;
        }

        .mobile-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 0.85rem;
          background-color: #f8fafc;
          padding: 0.65rem 0.75rem;
          border-radius: 8px;
        }

        .mobile-detail-lbl {
          display: block;
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
        }

        .mobile-detail-val {
          font-size: 0.82rem;
          font-weight: 700;
          color: #0f172a;
          margin-top: 0.15rem;
        }

        .mobile-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.75rem;
          border-top: 1px solid #f1f5f9;
        }

        .mobile-view-proof-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.75rem;
          border-radius: 6px;
          border: 1px solid #bfdbfe;
          background-color: #eff6ff;
          color: #1d4ed8;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }

        /* Lightbox */
        .lightbox-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 1.5rem;
        }

        .lightbox-content {
          position: relative;
          max-width: 85vw;
          max-height: 85vh;
        }

        .lightbox-img {
          max-width: 100%;
          max-height: 85vh;
          object-fit: contain;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .lightbox-close-btn {
          position: absolute;
          top: -15px;
          right: -15px;
          background-color: #ffffff;
          color: #0f172a;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: 900;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        }

        /* Spin animation for refresh icon */
        .spin {
          animation: spinAnimation 1s linear infinite;
        }
        @keyframes spinAnimation {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .auction-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .conduct-form-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .auction-header-banner {
            padding: 1.25rem 1.25rem;
          }
          .auction-title {
            font-size: 1.5rem;
          }
          .form-row-2col {
            grid-template-columns: 1fr;
          }
          .history-filter-bar {
            flex-direction: column;
            align-items: stretch;
            padding: 1rem;
          }
          .history-controls {
            flex-direction: column;
            width: 100%;
            gap: 0.75rem;
          }
          .history-filter-select,
          .history-search-wrap,
          .history-search-input {
            width: 100% !important;
          }
          .hidden-on-mobile,
          div.history-table-wrapper,
          div:has(> table.history-table) {
            display: none !important;
          }
          .history-mobile-cards {
            display: flex !important;
          }
          .form-actions-bar {
            justify-content: stretch;
          }
          .submit-auction-btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .auction-stats-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 0.65rem !important;
          }
          .auction-stat-card {
            padding: 0.75rem !important;
            gap: 0.5rem !important;
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .stat-card-icon {
            width: 32px !important;
            height: 32px !important;
            border-radius: 8px !important;
          }
          .stat-card-icon svg {
            width: 16px !important;
            height: 16px !important;
          }
          .stat-card-value {
            font-size: 1.18rem !important;
          }
          .stat-card-label {
            font-size: 0.68rem !important;
          }
          .stat-card-sub {
            display: none !important;
          }
          .auction-nav-tabs {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 0.5rem !important;
            width: 100% !important;
            box-sizing: border-box !important;
            border-bottom: none !important;
            padding-bottom: 0 !important;
          }
          .tab-btn {
            width: 100% !important;
            justify-content: center !important;
            padding: 0.65rem 0.4rem !important;
            font-size: 0.8rem !important;
            text-align: center !important;
            gap: 0.35rem !important;
          }
          .conduct-form {
            padding: 1.25rem 0.85rem !important;
          }
          .conduct-card-header {
            padding: 1rem 1rem !important;
          }
        }

        @media (max-width: 480px) {
          .auction-header-banner {
            padding: 1.15rem 1rem;
          }
          .auction-title {
            font-size: 1.35rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AuctionManager;
