import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Calendar,
  IndianRupee,
  CreditCard,
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  TrendingUp,
  Clock,
  Pencil,
  Trash2,
  Receipt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SetMonthlyDueModal from './SetMonthlyDueModal';
import RecordChitPaymentModal from './RecordChitPaymentModal';
import { formatChitMonthYear, formatChitMonthFull } from '../utils/chitDateUtils';

const ChitDuesLedgerModal = ({ isOpen, onClose, chitId, onChitUpdated }) => {
  const { token, API_URL, SERVER_URL } = useAuth();

  const [duesData, setDuesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [searchMember, setSearchMember] = useState('');

  // Sub-modals
  const [isSetDueOpen, setIsSetDueOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentTargetUser, setPaymentTargetUser] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);

  // Lightbox preview for receipts
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record? The user due will be restored.')) return;
    try {
      const res = await fetch(`${API_URL}/admin/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchDuesSummary();
        if (onChitUpdated) onChitUpdated();
      } else {
        alert(data.message || 'Failed to delete payment');
      }
    } catch (err) {
      console.error('Error deleting payment:', err);
      alert('Connection error deleting payment');
    }
  };

  const fetchDuesSummary = async (options = {}) => {
    if (!chitId) return;
    if (!options.silent) setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/admin/chits/${chitId}/dues-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDuesData(data.data);
        if (!options.preserveMonth && !selectedMonth && data.data.chit?.currentMonth) {
          setSelectedMonth(data.data.chit.currentMonth);
        }
      } else {
        setError(data.message || 'Failed to load chit dues summary.');
      }
    } catch (err) {
      console.error('Error fetching dues summary:', err);
      setError('Connection error loading chit dues summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && chitId) {
      fetchDuesSummary();
    }
  }, [isOpen, chitId]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (!isSetDueOpen && !isRecordPaymentOpen && !lightboxUrl) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSetDueOpen, isRecordPaymentOpen, lightboxUrl, onClose]);

  if (!isOpen) return null;

  const chit = duesData?.chit;
  const members = duesData?.members || [];
  const duration = chit?.durationMonths || 20;

  // Selected month calculations
  const monthConfig = (chit?.monthlyDues || []).find((d) => d.monthNumber === selectedMonth);
  const isMonthConfigured = Boolean(monthConfig);
  const baseDueForMonth = isMonthConfigured ? Number(monthConfig.dueAmount || 0) : 0;

  // Compute month totals
  let totalMonthExpected = 0;
  let totalMonthCollected = 0;
  let fullyPaidMembersCount = 0;
  let partialPaidMembersCount = 0;

  members.forEach((m) => {
    const mData = m.months?.find((x) => x.monthNumber === selectedMonth);
    const slots = m.slotsCount || 1;
    const due = isMonthConfigured ? (mData?.totalDue ?? (slots * baseDueForMonth)) : 0;
    const paid = mData?.amountPaid ?? 0;

    totalMonthExpected += due;
    totalMonthCollected += paid;

    if (isMonthConfigured && mData?.isPaid) {
      fullyPaidMembersCount++;
    } else if (isMonthConfigured && mData?.isPartial) {
      partialPaidMembersCount++;
    }
  });

  const totalMonthOutstanding = isMonthConfigured ? Math.max(0, totalMonthExpected - totalMonthCollected) : 0;
  const collectionPercentage = totalMonthExpected > 0 ? Math.min(100, Math.round((totalMonthCollected / totalMonthExpected) * 100)) : 0;

  // Filtered members by search query
  const filteredMembers = members.filter((m) => {
    if (!searchMember.trim()) return true;
    const q = searchMember.toLowerCase();
    const u = m.user || {};
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.memberId && u.memberId.toLowerCase().includes(q)) ||
      (m.ticketIds && m.ticketIds.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const getFullImgUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${SERVER_URL}${cleanPath}`;
  };

  return (
    <>
      {/* Centered Frosted Backdrop */}
      <div
        className="chit-dues-backdrop"
        onClick={onClose}
      >
        {/* Centered Modal Card with Decreased Width */}
        <div
          className="chit-dues-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="chit-dues-header">
            <div className="chit-dues-header-info">
              <div className="chit-dues-title-row">
                <h2 className="chit-dues-title">{chit?.name || 'Chit Scheme'}</h2>
                <span className="chit-dues-badge-pool">
                  Pool: ₹{Number(chit?.chitValue || 0).toLocaleString()}
                </span>
                <span className={`chit-dues-badge-status status-${chit?.status || 'active'}`}>
                  ● {chit?.status || 'Active'}
                </span>
                <span className="chit-dues-badge-month">
                  {formatChitMonthYear(chit, selectedMonth)} • Month {selectedMonth}/{duration}
                </span>
              </div>
              <p className="chit-dues-subtitle">
                <Sparkles size={13} color="#fbbf24" />
                <span>Monthly Dues Management & Member Payment Collections Ledger</span>
              </p>
            </div>

            {/* Header Action Buttons */}
            <div className="chit-dues-header-actions">
              <button
                type="button"
                className="chit-btn-due"
                onClick={() => setIsSetDueOpen(true)}
                title="Configure payable installment for this month"
              >
                <Sliders size={14} />
                <span>Set Month Due</span>
              </button>

              <button
                type="button"
                className="chit-btn-record"
                onClick={() => {
                  setPaymentTargetUser(null);
                  setIsRecordPaymentOpen(true);
                }}
                title="Record member payment"
              >
                <Plus size={15} />
                <span>Record Payment</span>
              </button>

              <button
                type="button"
                className="chit-btn-icon"
                onClick={fetchDuesSummary}
                title="Refresh Ledger"
              >
                <RefreshCw size={15} className={loading ? 'spin' : ''} />
              </button>

              <button
                type="button"
                className="chit-btn-close"
                onClick={onClose}
                title="Close (Esc)"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Month Selector Carousel */}
          <div className="chit-dues-months-bar">
            <div className="chit-months-label">
              <Calendar size={13} />
              <span>Months:</span>
            </div>
            <div className="chit-months-list">
              {Array.from({ length: duration }, (_, i) => i + 1).map((m) => {
                const isSelected = selectedMonth === m;
                const hasCustomDue = (chit?.monthlyDues || []).some((d) => d.monthNumber === m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonth(m)}
                    className={`chit-month-btn ${isSelected ? 'active' : ''}`}
                    title={`Month ${m} (${formatChitMonthFull(chit, m)})`}
                  >
                    <span>{formatChitMonthYear(chit, m)}</span>
                    <span style={{ fontSize: '0.68rem', opacity: 0.85, marginLeft: '0.2rem' }}>M{m}</span>
                    {hasCustomDue && <span className="chit-dot" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="chit-dues-metrics-bar">
            <div className="chit-metrics-grid">
              
              {/* Card 1: Due Rate */}
              <div className="chit-metric-card border-blue">
                <div className="chit-metric-head">
                  <span className="chit-metric-lbl">{formatChitMonthYear(chit, selectedMonth)} (Month {selectedMonth}) Due Rate</span>
                  <div className="chit-icon-circle blue">
                    <IndianRupee size={13} />
                  </div>
                </div>
                <div className="chit-metric-val">
                  {isMonthConfigured ? `₹${baseDueForMonth.toLocaleString()}` : <span style={{ color: '#d97706', fontSize: '1.35rem' }}>Not Set</span>}
                </div>
                <div className="chit-metric-sub">
                  {isMonthConfigured ? (
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>● Custom monthly due set by admin</span>
                  ) : (
                    <span style={{ color: '#b45309', fontWeight: 600 }}>Installment due not configured yet</span>
                  )}
                </div>
              </div>

              {/* Card 2: Total Collected */}
              <div className="chit-metric-card border-green">
                <div className="chit-metric-head">
                  <span className="chit-metric-lbl" style={{ color: '#16a34a' }}>
                    Total Collected So Far
                  </span>
                  <div className="chit-icon-circle green">
                    <TrendingUp size={13} />
                  </div>
                </div>
                <div className="chit-metric-val text-green">
                  ₹{totalMonthCollected.toLocaleString()}
                </div>
                
                {/* Micro Progress Bar */}
                <div className="chit-progress-bar">
                  <div
                    className="chit-progress-fill"
                    style={{ width: `${collectionPercentage}%` }}
                  />
                </div>

                <div className="chit-metric-sub flex-between">
                  <span>{isMonthConfigured ? `${fullyPaidMembersCount} of ${members.length} members paid` : 'Advance / ad-hoc payments'}</span>
                  {isMonthConfigured && <span style={{ fontWeight: 800, color: '#16a34a' }}>{collectionPercentage}%</span>}
                </div>
              </div>

              {/* Card 3: Remaining Due */}
              <div className="chit-metric-card border-red">
                <div className="chit-metric-head">
                  <span className="chit-metric-lbl" style={{ color: '#dc2626' }}>
                    Total Remaining Balance Due
                  </span>
                  <div className="chit-icon-circle red">
                    <Clock size={13} />
                  </div>
                </div>
                <div className="chit-metric-val text-red">
                  {isMonthConfigured ? `₹${totalMonthOutstanding.toLocaleString()}` : <span style={{ color: '#64748b' }}>₹0</span>}
                </div>
                <div className="chit-metric-sub">
                  {isMonthConfigured ? (
                    <>Expected pool: <strong style={{ color: '#0f172a' }}>₹{totalMonthExpected.toLocaleString()}</strong></>
                  ) : (
                    <span style={{ color: '#64748b' }}>No due scheduled for Month {selectedMonth}</span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Notice banner if due is not set for selected month */}
          {!isMonthConfigured && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.65rem',
              padding: '0.85rem 1.15rem',
              borderRadius: '12px',
              backgroundColor: '#fffbeb',
              border: '1.5px solid #fde68a',
              margin: '0 1.25rem 0.5rem 1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: '#92400e', fontSize: '0.86rem' }}>
                <AlertCircle size={17} color="#d97706" style={{ flexShrink: 0 }} />
                <span>
                  Due installment has <strong>not been scheduled</strong> for <strong>{formatChitMonthYear(chit, selectedMonth)} (Month {selectedMonth})</strong>. Remaining balance is ₹0 until configured.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSetDueOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.95rem',
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)'
                }}
              >
                <Sliders size={13} />
                <span>Set Due for Month {selectedMonth}</span>
              </button>
            </div>
          )}

          {/* Members Table Section */}
          <div className="chit-dues-body">
            <div className="chit-dues-body-head">
              <h3 className="chit-dues-body-title">
                <Users size={17} color="#2563eb" />
                <span>Enrolled Members Dues Breakdown ({filteredMembers.length})</span>
              </h3>

              <div className="chit-search-box">
                <Search size={14} className="chit-search-icon" />
                <input
                  type="text"
                  placeholder="Search member name, ID, phone..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  className="chit-search-input"
                />
                {searchMember && (
                  <button
                    type="button"
                    onClick={() => setSearchMember('')}
                    className="chit-search-clear"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="chit-state-box">
                <RefreshCw size={24} className="spin" color="#2563eb" />
                <p>Loading member dues ledger...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="chit-state-box">
                <div className="chit-state-icon">
                  <Users size={30} color="#94a3b8" />
                </div>
                <h4>No Enrolled Members Found</h4>
                <p>
                  {searchMember
                    ? `No members match "${searchMember}". Try another search term.`
                    : 'Enroll members into this chit scheme from Chit Schemes to view their dues ledger.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentTargetUser(null);
                    setEditingPayment(null);
                    setIsRecordPaymentOpen(true);
                  }}
                  style={{
                    marginTop: '0.85rem',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.45rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Plus size={14} />
                  <span>Record Payment for User</span>
                </button>
              </div>
            ) : (
              <div className="chit-table-scroll">
                <table className="chit-table">
                  <thead>
                    <tr>
                      <th>Member Info</th>
                      <th>Slots / Tickets</th>
                      <th>{formatChitMonthYear(chit, selectedMonth)} Due</th>
                      <th>Amount Paid</th>
                      <th>Remaining Due</th>
                      <th style={{ textAlign: 'right' }}>Excess with Us</th>
                      <th>Receipt Proofs</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m) => {
                      const u = m.user || {};
                      const mData = m.months?.find((x) => x.monthNumber === selectedMonth) || {};
                      const isFullyPaid = mData.isPaid;
                      const isPartial = mData.isPartial;
                      const payments = mData.payments || [];

                      return (
                        <tr key={u._id || u.id}>
                          {/* Member Info */}
                          <td>
                            <div className="td-member-name">{u.name || 'Member'}</div>
                            <div className="td-member-meta">
                              {u.memberId && <span className="td-member-id">ID: {u.memberId}</span>}
                              {u.phone && <span>• {u.phone}</span>}
                            </div>
                          </td>

                          {/* Slots */}
                          <td>
                            <span className="td-slot-badge">
                              {m.slotsCount} {m.slotsCount === 1 ? 'Slot' : 'Slots'}
                            </span>
                            <div className="td-tickets-sub">
                              {(m.ticketIds || []).join(', ') || `TICKET-${m.slotsCount}`}
                            </div>
                          </td>

                          {/* Month Due */}
                          <td className="td-bold">
                            {isMonthConfigured ? (
                              `₹${(mData.totalDue || 0).toLocaleString()}`
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 600, fontSize: '0.85rem' }}>
                                Not Set
                              </span>
                            )}
                          </td>

                          {/* Amount Paid */}
                          <td className="td-bold text-green">
                            ₹{(mData.amountPaid || 0).toLocaleString()}
                            {mData.excessApplied > 0 && (
                              <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 800, marginTop: '0.1rem' }}>
                                {mData.directPaid > 0
                                  ? `(₹${mData.directPaid.toLocaleString()} paid + ₹${mData.excessApplied.toLocaleString()} adv)`
                                  : `(₹${mData.excessApplied.toLocaleString()} Adv Credit)`}
                              </div>
                            )}
                          </td>

                          {/* Remaining Due */}
                          <td>
                            {isMonthConfigured ? (
                              isFullyPaid ? (
                                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                                  <span className="td-pill pill-paid">
                                    <CheckCircle2 size={12} />
                                    <span>Fully Paid</span>
                                  </span>
                                  {mData.monthSurplus > 0 && (
                                    <span style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 800, backgroundColor: '#dcfce7', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #86efac' }}>
                                      +₹{mData.monthSurplus.toLocaleString()} Advance
                                    </span>
                                  )}
                                  {mData.excessApplied > 0 && mData.directPaid === 0 && (
                                    <span style={{ fontSize: '0.65rem', color: '#1d4ed8', fontWeight: 800, backgroundColor: '#eff6ff', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                                      Adv Credit Settled
                                    </span>
                                  )}
                                </div>
                              ) : isPartial ? (
                                <span className="td-pill pill-partial">
                                  <span>₹{(mData.remainingDue || 0).toLocaleString()} Due</span>
                                </span>
                              ) : (
                                <span className="td-pill pill-due">
                                  <span>₹{(mData.remainingDue || 0).toLocaleString()} Due</span>
                                </span>
                              )
                            ) : (
                              (mData.amountPaid || 0) > 0 ? (
                                <span className="td-pill pill-paid" style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                                  <span>Paid ₹{(mData.amountPaid || 0).toLocaleString()} (Adv)</span>
                                </span>
                              ) : (
                                <span className="td-pill" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}>
                                  <span>Due Not Set</span>
                                </span>
                              )
                            )}
                          </td>

                          {/* Excess with Us */}
                          <td style={{ textAlign: 'right' }}>
                            {(mData.excessCarriedOver > 0 || mData.monthSurplus > 0) ? (
                              <div>
                                <span style={{ fontWeight: 800, color: '#16a34a', display: 'block', fontSize: '0.86rem' }}>
                                  +₹{(mData.excessCarriedOver || mData.monthSurplus || 0).toLocaleString()}
                                </span>
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: '0.65rem',
                                  color: '#15803d',
                                  fontWeight: 800,
                                  backgroundColor: '#dcfce7',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  border: '1px solid #86efac',
                                  marginTop: '0.1rem'
                                }}>
                                  Advance Balance
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>₹0</span>
                            )}
                          </td>

                          {/* Receipt Proofs */}
                          <td>
                            {payments.length === 0 ? (
                              mData.excessApplied > 0 ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: '6px',
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  border: '1px solid #bfdbfe'
                                }}>
                                  <span>⚖️ Settled via ₹{mData.excessApplied.toLocaleString()} Prev Month Credit</span>
                                </span>
                              ) : (
                                <span className="td-none">No receipts</span>
                              )
                            ) : (
                              <div className="td-receipts-flex">
                                {payments.map((p, pIdx) => {
                                  const hasProof = p.proofImgUrl && p.proofImgUrl !== 'MANUAL_ENTRY' && p.proofImgUrl !== 'MANUAL_ADMIN_ENTRY';
                                  const hasReceiptNo = Boolean(p.receiptNo);
                                  const isOnline = String(p.paymentMode || '').toLowerCase().includes('online') || String(p.paymentMode || '').toLowerCase().includes('upi');
                                  return (
                                    <div key={p.id || pIdx} className="td-receipt-chip">
                                      <div className="td-receipt-main">
                                        <span className="td-receipt-amt">₹{p.amount.toLocaleString()}</span>
                                        <span className={`td-receipt-mode-pill ${isOnline ? 'mode-upi' : 'mode-cash'}`}>
                                          {p.paymentMode || 'Cash'}
                                        </span>
                                      </div>
                                      <div className="td-receipt-actions">
                                        {hasReceiptNo && (
                                          <Link
                                            to={`/receipt/${p.receiptNo}`}
                                            target="_blank"
                                            className="td-btn-chip-action official-doc"
                                            title={`Official Receipt: ${p.receiptNo}`}
                                          >
                                            <Receipt size={11} />
                                          </Link>
                                        )}
                                        {hasProof && (
                                          <button
                                            type="button"
                                            onClick={() => setLightboxUrl(getFullImgUrl(p.proofImgUrl))}
                                            title="View Receipt Proof"
                                            className="td-btn-chip-action eye"
                                          >
                                            <Eye size={11} />
                                          </button>
                                        )}
                                        {/* Edit Payment */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingPayment({
                                              id: p.id,
                                              userId: u._id || u.id,
                                              userName: u.name,
                                              monthNumber: selectedMonth,
                                              amount: p.amount,
                                              paidDate: p.paidDate,
                                              paymentMode: p.paymentMode,
                                              transactionId: p.transactionId,
                                              remarks: p.remarks,
                                              proofImgUrl: p.proofImgUrl
                                            });
                                            setPaymentTargetUser(u);
                                            setIsRecordPaymentOpen(true);
                                          }}
                                          title="Update Payment & Receipt"
                                          className="td-btn-chip-action edit"
                                        >
                                          <Pencil size={11} />
                                        </button>
                                        {/* Delete Payment */}
                                        <button
                                          type="button"
                                          onClick={() => handleDeletePayment(p.id)}
                                          title="Delete Payment Record"
                                          className="td-btn-chip-action del"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* Action */}
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPayment(null);
                                setPaymentTargetUser(u);
                                setIsRecordPaymentOpen(true);
                              }}
                              className={`td-record-btn ${isFullyPaid ? 'paid' : ''}`}
                            >
                              <CreditCard size={12} />
                              <span>{isFullyPaid ? '+ Add More' : 'Record'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-modal: Set Monthly Due */}
      {isSetDueOpen && (
        <SetMonthlyDueModal
          isOpen={isSetDueOpen}
          onClose={() => setIsSetDueOpen(false)}
          chit={chit}
          initialMonth={selectedMonth}
          members={members}
          onDueUpdated={(updatedChit) => {
            fetchDuesSummary({ preserveMonth: true, silent: true });
            if (onChitUpdated) onChitUpdated();
          }}
        />
      )}

      {/* Sub-modal: Record Payment */}
      {isRecordPaymentOpen && (
        <RecordChitPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => {
            setIsRecordPaymentOpen(false);
            setEditingPayment(null);
            setPaymentTargetUser(null);
          }}
          chit={chit}
          members={members}
          editingPayment={editingPayment}
          initialUserId={editingPayment?.userId?._id || editingPayment?.userId || paymentTargetUser?.id || paymentTargetUser?._id}
          initialMonth={editingPayment?.monthNumber || selectedMonth}
          onPaymentRecorded={() => {
            fetchDuesSummary();
            if (onChitUpdated) onChitUpdated();
          }}
        />
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="chit-lightbox-overlay"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="chit-lightbox-box" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              alt="Receipt Proof"
              className="chit-lightbox-img"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="chit-lightbox-close"
              title="Close Preview"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Clean, Refined CSS Stylesheet */}
      <style>{`
        /* Backdrop */
        .chit-dues-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(10, 25, 47, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9998;
          padding: 1.25rem;
          box-sizing: border-box;
          animation: modalFadeIn 0.22s ease-out;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalScaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Centered Card with Decreased Width */
        .chit-dues-card {
          width: 100%;
          max-width: 860px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border-radius: 18px;
          box-shadow: 0 25px 60px -12px rgba(10, 30, 59, 0.4), 0 0 0 1px rgba(226, 232, 240, 0.8);
          overflow: hidden;
          box-sizing: border-box;
          animation: modalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Header */
        .chit-dues-header {
          background: linear-gradient(135deg, #0a1e3b 0%, #0f274a 100%);
          color: #ffffff;
          padding: 1.15rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.85rem;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .chit-dues-header-info {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          min-width: 0;
        }

        .chit-dues-title-row {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          flex-wrap: wrap;
        }

        .chit-dues-title {
          font-size: 1.3rem;
          font-weight: 800;
          margin: 0;
          color: #ffffff;
          letter-spacing: -0.02em;
        }

        .chit-dues-badge-pool {
          background: rgba(56, 189, 248, 0.2);
          border: 1px solid rgba(56, 189, 248, 0.45);
          color: #38bdf8;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .chit-dues-badge-status {
          background: rgba(251, 191, 36, 0.2);
          border: 1px solid rgba(251, 191, 36, 0.45);
          color: #fbbf24;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          text-transform: capitalize;
        }

        .chit-dues-badge-status.status-active {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(74, 222, 128, 0.45);
          color: #4ade80;
        }

        .chit-dues-badge-month {
          background: rgba(168, 85, 247, 0.2);
          border: 1px solid rgba(192, 132, 252, 0.45);
          color: #d8b4fe;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
        }

        .chit-dues-subtitle {
          font-size: 0.78rem;
          color: #94a3b8;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        /* Header Action Buttons */
        .chit-dues-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .chit-btn-due {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #ffffff;
          border: none;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
          transition: all 0.15s ease;
        }
        .chit-btn-due:hover {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
          transform: translateY(-1px);
        }

        .chit-btn-record {
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          color: #ffffff;
          border: none;
          padding: 0.45rem 0.9rem;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
          transition: all 0.15s ease;
        }
        .chit-btn-record:hover {
          background: linear-gradient(135deg, #15803d 0%, #166534 100%);
          transform: translateY(-1px);
        }

        .chit-btn-icon {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          padding: 0.45rem;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .chit-btn-icon:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .chit-btn-close {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          padding: 0.45rem;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .chit-btn-close:hover {
          background: #ef4444;
          border-color: #ef4444;
        }

        /* Months Bar */
        .chit-dues-months-bar {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.55rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          overflow-x: auto;
          flex-shrink: 0;
          scrollbar-width: thin;
        }

        .chit-months-label {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.72rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }

        .chit-months-list {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .chit-months-list::-webkit-scrollbar {
          display: none;
        }

        .chit-month-btn {
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          transition: all 0.12s ease;
        }
        .chit-month-btn:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }
        .chit-month-btn.active {
          border-color: #2563eb;
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
        }

        .chit-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #fbbf24;
        }

        /* 3 Metrics Bar */
        .chit-dues-metrics-bar {
          padding: 0.9rem 1.5rem;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          flex-shrink: 0;
        }

        .chit-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.85rem;
        }

        .chit-metric-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.85rem 1rem;
          position: relative;
          overflow: hidden;
        }
        .chit-metric-card.border-blue {
          border-top: 3px solid #2563eb;
        }
        .chit-metric-card.border-green {
          border-top: 3px solid #16a34a;
        }
        .chit-metric-card.border-red {
          border-top: 3px solid #dc2626;
        }

        .chit-metric-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .chit-metric-lbl {
          font-size: 0.7rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .chit-icon-circle {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chit-icon-circle.blue {
          background: #eff6ff;
          color: #2563eb;
        }
        .chit-icon-circle.green {
          background: #f0fdf4;
          color: #16a34a;
        }
        .chit-icon-circle.red {
          background: #fef2f2;
          color: #dc2626;
        }

        .chit-metric-val {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0.15rem 0;
          letter-spacing: -0.02em;
        }
        .chit-metric-val.text-green {
          color: #16a34a;
        }
        .chit-metric-val.text-red {
          color: #dc2626;
        }

        .chit-progress-bar {
          width: 100%;
          height: 4px;
          background: #e2e8f0;
          border-radius: 9999px;
          overflow: hidden;
          margin: 0.35rem 0 0.25rem 0;
        }
        .chit-progress-fill {
          height: 100%;
          background: #16a34a;
          border-radius: 9999px;
        }

        .chit-metric-sub {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 600;
        }
        .chit-metric-sub.flex-between {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* Body Section */
        .chit-dues-body {
          padding: 1.15rem 1.5rem;
          flex: 1;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .chit-dues-body-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.85rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .chit-dues-body-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .chit-search-box {
          position: relative;
          width: 250px;
          max-width: 100%;
        }

        .chit-search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .chit-search-input {
          width: 100%;
          padding: 0.45rem 1.8rem 0.45rem 2.1rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 0.8rem;
          box-sizing: border-box;
          background: #ffffff;
        }
        .chit-search-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }

        .chit-search-clear {
          position: absolute;
          right: 0.65rem;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 0.75rem;
          padding: 0;
        }

        /* Table */
        .chit-table-scroll {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
        }

        .chit-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.82rem;
          min-width: 720px;
        }

        .chit-table thead tr {
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .chit-table th {
          padding: 0.75rem 0.95rem;
          font-weight: 800;
        }

        .chit-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
          transition: background-color 0.12s ease;
        }
        .chit-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .chit-table td {
          padding: 0.75rem 0.95rem;
        }

        .td-member-name {
          font-weight: 700;
          color: #0f172a;
          font-size: 0.85rem;
        }

        .td-member-meta {
          font-size: 0.72rem;
          color: #64748b;
          margin-top: 0.1rem;
        }

        .td-member-id {
          font-weight: 600;
          color: #1e40af;
          background: #eff6ff;
          padding: 0.05rem 0.35rem;
          border-radius: 4px;
        }

        .td-slot-badge {
          background-color: #eff6ff;
          color: #1d4ed8;
          padding: 0.15rem 0.5rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.72rem;
          border: 1px solid #bfdbfe;
          display: inline-block;
        }

        .td-tickets-sub {
          font-size: 0.68rem;
          color: #64748b;
          margin-top: 0.15rem;
        }

        .td-bold {
          font-weight: 800;
          color: #0f172a;
        }
        .td-bold.text-green {
          color: #16a34a;
        }

        .td-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.22rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 800;
          white-space: nowrap;
        }
        .td-pill.pill-paid {
          background-color: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
        }
        .td-pill.pill-partial {
          background-color: #fef3c7;
          color: #b45309;
          border: 1px solid #fde68a;
        }
        .td-pill.pill-due {
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #fca5a5;
        }

        .td-none {
          font-size: 0.72rem;
          color: #94a3b8;
          font-style: italic;
        }

        .td-receipts-flex {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .td-receipt-chip {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.45rem;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          border-radius: 6px;
          padding: 0.22rem 0.45rem;
          font-size: 0.74rem;
          transition: all 0.15s ease;
        }

        .td-receipt-chip:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.07);
          background-color: #f8fafc;
        }

        .td-receipt-main {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .td-receipt-amt {
          font-weight: 800;
          color: #0f172a;
          font-variant-numeric: tabular-nums;
          font-size: 0.78rem;
          letter-spacing: -0.01em;
        }

        .td-receipt-mode-pill {
          font-size: 0.63rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 1px 5px;
          border-radius: 4px;
        }

        .td-receipt-mode-pill.mode-cash {
          background-color: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .td-receipt-mode-pill.mode-upi {
          background-color: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
        }

        .td-receipt-actions {
          display: inline-flex;
          align-items: center;
          gap: 0.15rem;
        }

        .td-btn-chip-action {
          background: transparent;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          transition: all 0.12s ease;
          text-decoration: none;
        }

        .td-btn-chip-action.official-doc { color: #d97706; }
        .td-btn-chip-action.official-doc:hover { background: #fef3c7; color: #b45309; }
        .td-btn-chip-action.eye { color: #2563eb; }
        .td-btn-chip-action.eye:hover { background: #eff6ff; color: #1d4ed8; }
        .td-btn-chip-action.edit { color: #64748b; }
        .td-btn-chip-action.edit:hover { background: #f1f5f9; color: #0f172a; }
        .td-btn-chip-action.del { color: #94a3b8; }
        .td-btn-chip-action.del:hover { background: #fef2f2; color: #ef4444; }

        .td-record-btn {
          background-color: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 0.35rem 0.75rem;
          font-size: 0.74rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          transition: all 0.12s ease;
        }
        .td-record-btn:hover {
          background-color: #1d4ed8;
        }
        .td-record-btn.paid {
          background-color: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        .td-record-btn.paid:hover {
          background-color: #e2e8f0;
        }

        /* Empty / Loading State */
        .chit-state-box {
          text-align: center;
          padding: 2.25rem 1.25rem;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
        }
        .chit-state-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 0.75rem auto;
        }
        .chit-state-box h4 {
          font-size: 0.98rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 0.25rem 0;
        }
        .chit-state-box p {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
          max-width: 420px;
          margin: 0 auto;
        }

        /* Lightbox Overlay */
        .chit-lightbox-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(10, 25, 47, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 1.5rem;
        }

        .chit-lightbox-box {
          position: relative;
          max-width: 85vw;
          max-height: 85vh;
        }

        .chit-lightbox-img {
          max-width: 100%;
          max-height: 82vh;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .chit-lightbox-close {
          position: absolute;
          top: -14px;
          right: -14px;
          background: #ffffff;
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
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .chit-dues-card {
            max-width: 96vw;
            max-height: 94vh;
            border-radius: 14px;
          }
          .chit-dues-header {
            padding: 0.9rem 1.15rem;
          }
          .chit-dues-title {
            font-size: 1.15rem;
          }
          .chit-dues-header-actions {
            width: 100%;
            justify-content: flex-start;
          }
          .chit-metrics-grid {
            grid-template-columns: 1fr;
            gap: 0.65rem;
          }
          .chit-dues-body {
            padding: 1rem 1.15rem;
          }
          .chit-search-box {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};

export default ChitDuesLedgerModal;
