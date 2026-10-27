import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ScrollAnimationWrapper from '../components/ScrollAnimationWrapper';
import { 
  Briefcase, 
  ChevronDown, 
  ChevronUp, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  X, 
  IndianRupee,
  CreditCard,
  Edit3,
  Lock,
  QrCode,
  Camera,
  ArrowRight,
  Copy,
  Check,
  Download,
  Eye
} from 'lucide-react';
import paymentQrImg from '../assets/payment-qr.jpeg';
import { generatePaymentReceiptPDF } from '../utils/receiptGenerator';
import ReceiptModal from '../components/ReceiptModal';
import { formatChitMonthYear, formatChitMonthWithNum } from '../utils/chitDateUtils';

const MyActiveChits = () => {
  const { user, token, API_URL } = useAuth();
  const [chits, setChits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedChitId, setExpandedChitId] = useState(null);
  const [viewReceiptData, setViewReceiptData] = useState(null);
  
  // Payment Modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [modalChit, setModalChit] = useState(null);
  const [modalMonth, setModalMonth] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofFileName, setProofFileName] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('inavoluchits@axl');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Custom Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, chitId: null, monthNumber: null, memberId: null, ticketId: null });
  const [isFreezing, setIsFreezing] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const fetchData = async () => {
    try {
      const [chitsRes, paymentsRes, auctionsRes] = await Promise.all([
        fetch(`${API_URL}/chits`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/payments/my-payments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/auctions`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const chitsData = await chitsRes.json();
      const paymentsData = await paymentsRes.json();
      const auctionsData = await auctionsRes.json();

      if (auctionsData.success) {
        setAuctions(auctionsData.data || []);
      }

      if (chitsData.success && paymentsData.success) {
        // Build one entry per approved ticket membership
        const userMemberships = [];
        chitsData.data.forEach((chit) => {
          const userMembers = (chit.members || []).filter(
            (m) => (m.userId === user?.id || m.user?.id === user?.id) && m.status === 'approved'
          );
          userMembers.sort((a, b) => {
            const numA = parseInt(String(a.ticketId || '').match(/\d+/)?.[0] || a.slotNumber || 0, 10);
            const numB = parseInt(String(b.ticketId || '').match(/\d+/)?.[0] || b.slotNumber || 0, 10);
            return numA - numB;
          });
          userMembers.forEach((member, idx) => {
            const rawTicketId = member.ticketId || `MEMBER-${member.slotNumber || (idx + 1)}`;
            const ticketId = rawTicketId.replace(/^TICKET-/, 'MEMBER-');
            userMemberships.push({
              ...chit,
              uniqueId: `${chit.id}_member_${member.id}`,
              memberId: member.id,
              ticketId: ticketId,
              slotNumber: member.slotNumber || (idx + 1),
              displayTitle: `${chit.name} (${ticketId})`
            });
          });
        });
        setChits(userMemberships);
        setPayments(paymentsData.data);
      }
    } catch (error) {
      console.error('Error fetching user active chits data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, API_URL]);

  const toggleExpandChit = (id) => {
    setExpandedChitId(expandedChitId === id ? null : id);
  };

  const openPaymentModal = (chit, month) => {
    setModalChit(chit);
    setModalMonth(month);
    // Pre-fill transaction ID if user is editing an existing submission (edit_requested or pending+remark)
    const existingPayment = getPaymentForMonth(chit.id, month, chit.slotNumber || 1);
    const isEditMode =
      existingPayment?.status === 'edit_requested' ||
      (existingPayment?.status === 'pending' && existingPayment?.remarks && existingPayment.remarks.trim() !== '');
    setTransactionId(isEditMode ? (existingPayment.transactionId || '') : '');
    setProofFile(null);
    setProofFileName('');
    setSubmitError('');
    setShowPayModal(true);
  };


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setSubmitError('Please select an image file (PNG, JPG, JPEG, WEBP).');
        return;
      }
      setProofFile(file);
      setProofFileName(file.name);
      setSubmitError('');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!transactionId || !proofFile) {
      setSubmitError('Please fill in transaction ID and upload a receipt image.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const chitAuctions = auctions.filter(a => a.chitId === modalChit.id);
      const dueAmount = getDueAmountForMonth(modalChit, modalMonth, chitAuctions);
      const formData = new FormData();
      formData.append('chitId', modalChit.id);
      formData.append('monthNumber', modalMonth);
      formData.append('slotNumber', modalChit.slotNumber || 1);
      formData.append('amount', dueAmount);
      formData.append('transactionId', transactionId);
      formData.append('proof', proofFile);

      const response = await fetch(`${API_URL}/payments/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setShowPayModal(false);
        // Refresh data
        await fetchData();
      } else {
        setSubmitError(data.message || 'Payment submission failed.');
      }
    } catch (error) {
      console.error('Error submitting payment proof:', error);
      setSubmitError(error.message ? `Connection error: ${error.message}` : 'Server connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPaymentForMonth = (chitId, monthNumber, slotNumber = 1) => {
    return payments.find((p) => p.chitId === chitId && p.monthNumber === monthNumber && (p.slotNumber || 1) === (slotNumber || 1));
  };

  const getDueAmountForMonth = (chit, monthNum, chitAuctions = []) => {
    if (!chit) return 0;
    const totalMonths = Number(chit.durationMonths || chit.totalMonths || 12);
    if (monthNum > totalMonths) return 0;
    const nominal = Number(chit.monthlyContribution || 0);
    if (monthNum <= 1) return nominal;

    // For Month M, check dividend / nextPayable from Month M-1 auction
    const prevAuction = (chitAuctions || []).find(a => Number(a.monthNumber) === monthNum - 1);
    if (prevAuction) {
      if (prevAuction.nextPayableAmount !== undefined && prevAuction.nextPayableAmount !== null) {
        return Number(prevAuction.nextPayableAmount);
      }
      if (prevAuction.dividendPerMember !== undefined && prevAuction.dividendPerMember !== null && Number(prevAuction.dividendPerMember) > 0) {
        return Math.max(0, nominal - Number(prevAuction.dividendPerMember));
      }
    }
    return nominal;
  };

  const handleFreezeMonth = (chitId, monthNumber, memberId, ticketId) => {
    setConfirmModal({ isOpen: true, chitId, monthNumber, memberId, ticketId });
  };

  const confirmFreezeMonth = async () => {
    const { chitId, monthNumber, memberId, ticketId } = confirmModal;
    setIsFreezing(true);
    
    try {
      const res = await fetch(`${API_URL}/chits/${chitId}/freeze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ monthNumber, memberId, ticketId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        fetchData();
      } else {
        showToast(data.message || 'Error freezing month', 'error');
      }
    } catch (error) {
      console.error('Error freezing month:', error);
      showToast('Server error while freezing month', 'error');
    } finally {
      setIsFreezing(false);
      setConfirmModal({ isOpen: false, chitId: null, monthNumber: null, memberId: null, ticketId: null });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading your chits...</p>
      </div>
    );
  }

  return (
    <div className="user-page-container" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <ScrollAnimationWrapper>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1f2937', lineHeight: 1.2 }}>
            My Active <span style={{ color: '#2563eb' }}>Chits</span>
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.3rem', fontSize: '0.85rem' }}>
            Track your payment schedule, check dues, and submit monthly installment receipts.
          </p>
        </div>
      </ScrollAnimationWrapper>

      {chits.length === 0 ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px dashed #d1fae5', padding: '3rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
            <Briefcase size={28} color="#3b82f6" />
          </div>
          <h3 style={{ fontWeight: 700, color: '#374151', fontSize: '1.1rem' }}>No Joined Schemes</h3>
          <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.85rem', maxWidth: '260px', margin: '0.5rem auto 0 auto', lineHeight: 1.5 }}>
            You haven't been approved in any chit schemes yet. Join schemes in the Browse section.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {chits.map((chit) => {
            const isExpanded = expandedChitId === chit.uniqueId;
            const wonAuction = (auctions || []).find(a => 
              a.chitId === chit.id && (
                a.winningChitMemberId === chit.memberId ||
                (a.winningTicket && String(a.winningTicket).toUpperCase() === String(chit.ticketId).toUpperCase()) ||
                (a.winningMemberId === user?.id && !a.winningChitMemberId)
              )
            );
            
            return (
              <ScrollAnimationWrapper key={chit.uniqueId}>
                <div className="card-premium chit-card-responsive" style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px solid #f3f4f6', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden', padding: 0 }}>
                  
                  {/* Green Top Bar */}
                  <div style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)', padding: '1.25rem 1.25rem 0 1.25rem', position: 'relative', overflow: 'hidden' }}>
                    
                    {/* Decorative circles */}
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: '-30px', right: '60px', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

                    {/* Name + Status row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', position: 'relative', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Briefcase size={20} color="#fff" />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{chit.displayTitle || chit.name}</h3>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.85)', fontWeight: 700, letterSpacing: '0.03em', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px', marginTop: '0.2rem', display: 'inline-block' }}>
                            {chit.ticketId}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {wonAuction ? (
                          <span style={{
                            backgroundColor: '#fef08a',
                            color: '#854d0e',
                            fontSize: '0.68rem',
                            padding: '0.22rem 0.6rem',
                            borderRadius: '1rem',
                            fontWeight: 800,
                            border: '1px solid #facc15',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                          }}>
                            🏆 Won Month {wonAuction.monthNumber} · ₹{Number(wonAuction.winnerPayout).toLocaleString()}
                          </span>
                        ) : (
                          <span style={{
                            backgroundColor: 'rgba(255,255,255,0.18)',
                            color: '#ffffff',
                            fontSize: '0.65rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '1rem',
                            fontWeight: 600,
                            border: '1px solid rgba(255,255,255,0.25)'
                          }}>
                            Auction: Not Participated
                          </span>
                        )}

                        {chit.status === 'active' ? (
                          <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.68rem', padding: '0.25rem 0.65rem', borderRadius: '1rem', fontWeight: 700, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
                            Active ({chit.currentMonth}/{chit.durationMonths}M)
                          </span>
                        ) : chit.status === 'completed' ? (
                          <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.68rem', padding: '0.25rem 0.65rem', borderRadius: '1rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)' }}>✓ Completed</span>
                        ) : (
                          <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.68rem', padding: '0.25rem 0.65rem', borderRadius: '1rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)' }}>⏳ Upcoming</span>
                        )}
                      </div>
                    </div>

                    {/* Stats strip — always 4 cols side by side using flex */}
                    <div style={{ 
                      display: 'flex', flexDirection: 'row', flexWrap: 'nowrap',
                      backgroundColor: 'rgba(0,0,0,0.15)',
                      borderRadius: '0.75rem 0.75rem 0 0',
                      marginTop: '1rem',
                      overflow: 'hidden'
                    }}>
                      {[
                        { label: 'POOL', value: `₹${(chit.chitValue / 1000).toFixed(0)}K` },
                        { label: 'EMI', value: `₹${(chit.monthlyContribution / 1000).toFixed(0)}K` },
                        { label: 'DURATION', value: `${chit.durationMonths}M` },
                        { label: 'MANAGER', value: chit.creator ? chit.creator.name.split(' ')[0] : 'Admin' },
                      ].map((item, idx) => (
                        <div key={idx} style={{
                          width: '25%', flexShrink: 0, flexGrow: 0,
                          padding: '0.7rem 0.2rem',
                          textAlign: 'center',
                          borderLeft: idx > 0 ? '1px solid rgba(255,255,255,0.15)' : 'none'
                        }}>
                          <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.2rem', fontWeight: 700, letterSpacing: '0.06em' }}>{item.label}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 0.15rem' }}>{item.value}</span>
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* Body: Toggle Button */}
                  <div
                    onClick={() => toggleExpandChit(chit.uniqueId)}
                    style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                      padding: '0.85rem 1rem', cursor: 'pointer', 
                      backgroundColor: '#fff', userSelect: 'none',
                      transition: 'background 0.15s',
                      gap: '0.65rem'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IndianRupee size={13} color="#2563eb" />
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1f2937', lineHeight: 1.3 }}>Installment Schedule & Auction Status</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 700, whiteSpace: 'nowrap' }}>{isExpanded ? 'Hide' : 'View'}</span>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isExpanded ? <ChevronUp size={13} color="#2563eb" /> : <ChevronDown size={13} color="#2563eb" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Installments */}
                  {isExpanded && (
                    <div style={{ padding: '1rem 1.25rem 1.25rem', borderTop: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                      {chit.status === 'upcoming' ? (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', backgroundColor: '#fff', borderRadius: '1rem', border: '1px dashed #d1fae5', fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.6 }}>
                          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                          <strong style={{ color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Not Started Yet</strong>
                          This chit fund begins once {chit.totalMembers} members are approved by the admin.
                        </div>
                      ) : (() => {
                        return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          
                          {/* Dedicated Auction Status Card */}
                          {wonAuction ? (
                            <div style={{
                              backgroundColor: '#eff6ff',
                              border: '1.5px solid #a5b4fc',
                              borderRadius: '0.85rem',
                              padding: '0.9rem 1.15rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.75rem',
                              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  backgroundColor: '#2563eb',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.15rem',
                                  boxShadow: '0 2px 6px rgba(22,163,74,0.3)'
                                }}>
                                  🏆
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Auction Status
                                  </div>
                                  <strong style={{ fontSize: '0.92rem', color: '#2563eb', display: 'block' }}>
                                    Auction Participated & Got Prize Money!
                                  </strong>
                                  <span style={{ fontSize: '0.76rem', color: '#1d4ed8' }}>
                                    Claimed in <strong>Month {wonAuction.monthNumber}</strong> · Mode: <strong>{wonAuction.payoutMethod || 'Direct Payment'}</strong>
                                  </span>
                                </div>
                              </div>
                              <div style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #bfdbfe',
                                padding: '0.45rem 0.85rem',
                                borderRadius: '0.6rem',
                                textAlign: 'right'
                              }}>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', fontWeight: 600 }}>Prize Money Received</span>
                                <strong style={{ fontSize: '1.05rem', color: '#1d4ed8', fontWeight: 800 }}>
                                  ₹{Number(wonAuction.winnerPayout).toLocaleString()}
                                </strong>
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '0.85rem',
                              padding: '0.8rem 1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.5rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: '#f1f5f9',
                                  color: '#64748b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.95rem'
                                }}>
                                  ⏳
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                                    Auction Status
                                  </div>
                                  <strong style={{ fontSize: '0.85rem', color: '#334155' }}>
                                    Not Participated / Not Claimed Yet
                                  </strong>
                                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block' }}>
                                    Eligible to participate and claim prize in upcoming monthly auctions.
                                  </span>
                                </div>
                              </div>
                              <span style={{
                                fontSize: '0.72rem',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '9999px',
                                color: '#475569',
                                fontWeight: 700
                              }}>
                                Eligible for Upcoming Months
                              </span>
                            </div>
                          )}
                          {/* Progress Bar */}
                          {/* Progress bar */}
                          {(() => {
                            const totalPaid = Array.from({ length: chit.durationMonths }, (_, i) => i + 1)
                              .filter(mNum => {
                                const p = getPaymentForMonth(chit.id, mNum, chit.slotNumber);
                                return p && p.status === 'approved';
                              }).length;
                            const progressPct = Math.round((totalPaid / chit.durationMonths) * 100);

                            return (
                              <div style={{ backgroundColor: '#fff', borderRadius: '0.85rem', padding: '0.85rem 1rem', border: '1px solid #f3f4f6', marginBottom: '0.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151' }}>Payment Progress</span>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb' }}>{totalPaid}/{chit.durationMonths} Paid</span>
                                </div>
                                <div style={{ height: '7px', backgroundColor: '#f3f4f6', borderRadius: '1rem', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #2563eb, #3b82f6)', borderRadius: '1rem', transition: 'width 0.5s ease' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                                  <span style={{ fontSize: '0.62rem', color: '#9ca3af' }}>0%</span>
                                  <span style={{ fontSize: '0.62rem', color: '#9ca3af' }}>{progressPct}% complete</span>
                                  <span style={{ fontSize: '0.62rem', color: '#9ca3af' }}>100%</span>
                                </div>
                              </div>
                            );
                          })()}
                          {(() => {
                            const chitAuctions = (auctions || []).filter(a => a.chitId === chit.id);
                            const maxAuctionMonth = chitAuctions.reduce((max, a) => Math.max(max, Number(a.monthNumber || 0)), 0);
                            const activeCurrentMonth = Number(chit.currentMonth || 1);
                            const maxVisibleMonth = Math.min(chit.durationMonths, Math.max(activeCurrentMonth, maxAuctionMonth + 1));
                            return Array.from({ length: chit.durationMonths }, (_, i) => i + 1)
                              .filter(mNum => mNum <= maxVisibleMonth);
                          })().map((monthNum) => {
                            const chitStartDate = new Date(chit.startDate || chit.createdAt);
                            const dueDate = new Date(chitStartDate);
                            dueDate.setMonth(dueDate.getMonth() + monthNum - 1);
                            dueDate.setDate(5);
                            const formattedDueDate = dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                            const monthNamesList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                            const formattedDueMonth = `${monthNamesList[dueDate.getMonth()]} ${dueDate.getFullYear()}`;
                            const payment = getPaymentForMonth(chit.id, monthNum, chit.slotNumber);
                            const isCurrent = chit.currentMonth === monthNum && chit.status === 'active';
                            const freeze = chit.freezes?.find(f => f.monthNumber === monthNum);
                            
                            // Check if this specific ticket froze this month
                            const isFrozenByThisTicket = freeze && (
                              freeze.memberId === chit.memberId ||
                              (chit.ticketId && freeze.ticketId === chit.ticketId) ||
                              (!freeze.ticketId && freeze.userId === user?.id)
                            );

                            // Check if this specific ticket has frozen any month
                            const thisTicketHasFrozenAny = (chit.freezes || []).some(f => 
                              f.memberId === chit.memberId || 
                              (chit.ticketId && f.ticketId === chit.ticketId)
                            );
                            
                            let statusText = 'Unpaid';
                            let statusBg = '#fef9c3';
                            let statusColor = '#92400e';
                            let canPay = chit.status === 'active' && monthNum <= chit.currentMonth;

                            if (payment) {
                              if (payment.status === 'approved') {
                                statusText = 'Paid'; statusBg = '#dbeafe'; statusColor = '#2563eb'; canPay = false;
                              } else if (payment.status === 'pending' && payment.remarks && payment.remarks.trim() !== '') {
                                statusText = 'Edit Required'; statusBg = '#fef3c7'; statusColor = '#92400e'; canPay = true;
                              } else if (payment.status === 'pending') {
                                statusText = 'Verifying'; statusBg = '#dbeafe'; statusColor = '#1e40af'; canPay = false;
                              } else if (payment.status === 'rejected') {
                                statusText = 'Rejected'; statusBg = '#fee2e2'; statusColor = '#991b1b'; canPay = true;
                              } else if (payment.status === 'edit_requested') {
                                statusText = 'Edit Required'; statusBg = '#fef3c7'; statusColor = '#92400e'; canPay = true;
                              }
                            }

                            if (freeze) {
                              const freezeLabel = freeze.ticketId ? freeze.ticketId.replace(/^TICKET-/, 'MEMBER-') : 'Other Member';
                              if (isFrozenByThisTicket) {
                                statusText = `Taken by You (${chit.ticketId})`;
                                statusBg = '#dbeafe';
                                statusColor = '#2563eb';
                                canPay = false;
                              } else if (!payment || (payment.status !== 'approved' && payment.status !== 'pending')) {
                                statusText = `Taken by ${freezeLabel}`;
                                statusBg = '#f3f4f6';
                                statusColor = '#6b7280';
                              }
                            }

                            if (payment && (payment.status === 'approved' || (payment.status === 'pending' && (!payment.remarks || payment.remarks.trim() === '')))) {
                              canPay = false;
                            }

                            return (
                              <div
                                key={monthNum}
                                style={{
                                  borderRadius: '0.9rem',
                                  border: isCurrent ? '1.5px solid #3b82f6' : '1px solid #e5e7eb',
                                  backgroundColor: isCurrent ? '#eff6ff' : '#fff',
                                  overflow: 'hidden',
                                  boxShadow: isCurrent ? '0 4px 16px rgba(34,197,94,0.12)' : '0 1px 4px rgba(0,0,0,0.04)'
                                }}
                              >
                                {/* Left accent + header row */}
                                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                  {/* Colored left bar */}
                                  <div style={{
                                    width: '4px', flexShrink: 0,
                                    backgroundColor: payment?.status === 'approved' ? '#3b82f6'
                                      : payment?.status === 'pending' && !payment?.remarks ? '#3b82f6'
                                      : payment?.status === 'rejected' || payment?.status === 'edit_requested' || (payment?.status === 'pending' && payment?.remarks) ? '#f59e0b'
                                      : isCurrent ? '#2563eb' : '#e5e7eb'
                                  }} />

                                  <div style={{ flex: 1, padding: '0.7rem 0.85rem' }}>
                                    {/* Top row: Month + Status badge */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1f2937' }}>
                                          {formatChitMonthYear(chit, monthNum)} <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500 }}>(M{monthNum})</span>
                                        </span>
                                        {isCurrent && <span style={{ fontSize: '0.58rem', backgroundColor: '#2563eb', color: '#fff', padding: '0.1rem 0.45rem', borderRadius: '1rem', fontWeight: 700, letterSpacing: '0.02em' }}>CURRENT</span>}
                                      </div>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, backgroundColor: statusBg, color: statusColor, padding: '0.18rem 0.55rem', borderRadius: '1rem', border: `1px solid ${statusColor}22` }}>
                                        {statusText}
                                      </span>
                                    </div>

                                    {/* Info row: Due Amount | Due Date | Tx ID */}
                                    {(() => {
                                      const chitAuctions = (auctions || []).filter(a => a.chitId === chit.id);
                                      const monthDueAmount = getDueAmountForMonth(chit, monthNum, chitAuctions);
                                      const displayAmount = (payment?.amount && Number(payment.amount) > 0) ? Number(payment.amount) : monthDueAmount;
                                      
                                      return (
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                          <div>
                                            <span style={{ fontSize: '0.6rem', color: '#9ca3af', display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Due</span>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: payment?.status === 'approved' ? '#2563eb' : '#ef4444' }}>
                                              ₹{displayAmount.toLocaleString()}
                                            </span>
                                          </div>
                                          <div>
                                            <span style={{ fontSize: '0.6rem', color: '#9ca3af', display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>{formattedDueDate}</span>
                                          </div>
                                          {payment?.transactionId && (
                                            <div>
                                              <span style={{ fontSize: '0.6rem', color: '#9ca3af', display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ref</span>
                                              <code style={{ fontSize: '0.7rem', backgroundColor: '#f3f4f6', padding: '0.1rem 0.35rem', borderRadius: '4px', color: '#374151', fontWeight: 600 }}>{payment.transactionId}</code>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}

                                    {/* Admin Remark */}
                                    {payment?.remarks && (payment.status === 'edit_requested' || (payment.status === 'pending' && payment.remarks.trim() !== '')) && (
                                      <div style={{ marginTop: '0.6rem', padding: '0.45rem 0.65rem', borderRadius: '0.5rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.72rem', lineHeight: 1.5 }}>
                                        ⚠ <strong>Admin Note:</strong> {payment.remarks}
                                      </div>
                                    )}
                                    {payment?.remarks && payment.status === 'rejected' && (
                                      <div style={{ marginTop: '0.6rem', padding: '0.45rem 0.65rem', borderRadius: '0.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.72rem', lineHeight: 1.5 }}>
                                        ✕ <strong>Reason:</strong> {payment.remarks}
                                      </div>
                                    )}

                                    {/* Pay / Take / View & Download Receipt Button Row */}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                                      {payment?.status === 'approved' && (
                                        <div style={{ display: 'flex', gap: '0.4rem', flex: 1, flexWrap: 'wrap' }}>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const chitAuctions = (auctions || []).filter(a => a.chitId === chit.id);
                                              const monthDueAmount = getDueAmountForMonth(chit, monthNum, chitAuctions);
                                              const monthPayment = payment ? { ...payment, monthNumber: monthNum } : { monthNumber: monthNum, amount: monthDueAmount, status: 'approved' };
                                              setViewReceiptData({
                                                payment: monthPayment,
                                                chit,
                                                user,
                                                extraData: {
                                                  paidMonths: monthNum,
                                                  monthNumber: monthNum,
                                                  dueDate: formattedDueDate,
                                                  dueMonth: formattedDueMonth,
                                                  dueAmount: (payment?.amount && Number(payment.amount) > 0) ? Number(payment.amount) : monthDueAmount,
                                                  auctions: chitAuctions,
                                                  ticketId: chit.ticketId
                                                }
                                              });
                                            }}
                                            style={{
                                              flex: 1, minWidth: '110px', padding: '0.45rem 0.65rem', borderRadius: '0.65rem',
                                              border: '1.5px solid #2563eb', fontWeight: 700, fontSize: '0.78rem',
                                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                                              background: '#eff6ff', color: '#2563eb',
                                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.08)',
                                              transition: 'all 0.2s ease', whiteSpace: 'nowrap'
                                            }}
                                            title="View official payment receipt on screen"
                                          >
                                            <Eye size={13} />
                                            View Receipt
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const chitAuctions = (auctions || []).filter(a => a.chitId === chit.id);
                                              const monthDueAmount = getDueAmountForMonth(chit, monthNum, chitAuctions);
                                              const monthPayment = payment ? { ...payment, monthNumber: monthNum } : { monthNumber: monthNum, amount: monthDueAmount, status: 'approved' };
                                              generatePaymentReceiptPDF(monthPayment, chit, user, { 
                                                paidMonths: monthNum, 
                                                monthNumber: monthNum,
                                                dueDate: formattedDueDate,
                                                dueMonth: formattedDueMonth,
                                                dueAmount: (payment?.amount && Number(payment.amount) > 0) ? Number(payment.amount) : monthDueAmount,
                                                auctions: chitAuctions,
                                                ticketId: chit.ticketId
                                              });
                                            }}
                                            style={{
                                              padding: '0.45rem 0.65rem', borderRadius: '0.65rem',
                                              border: '1px solid #bfdbfe', fontWeight: 700, fontSize: '0.78rem',
                                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                                              background: '#ffffff', color: '#2563eb',
                                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                                              transition: 'all 0.2s ease', whiteSpace: 'nowrap'
                                            }}
                                            title="Download official PDF payment receipt"
                                          >
                                            <Download size={13} />
                                            Download
                                          </button>
                                        </div>
                                      )}
                                      {canPay && !isFrozenByThisTicket && (
                                        <button
                                          onClick={() => openPaymentModal(chit, monthNum)}
                                          style={{
                                            flex: 1, padding: '0.55rem 0', borderRadius: '0.65rem',
                                            border: 'none', fontWeight: 700, fontSize: '0.8rem',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                            background: (payment?.status === 'edit_requested' || (payment?.status === 'pending' && payment?.remarks))
                                              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                              : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                                            color: '#fff',
                                            boxShadow: (payment?.status === 'edit_requested' || (payment?.status === 'pending' && payment?.remarks))
                                              ? '0 4px 12px rgba(245, 158, 11, 0.3)'
                                              : '0 4px 12px rgba(22, 163, 74, 0.25)',
                                            letterSpacing: '0.01em'
                                          }}
                                        >
                                          {(payment?.status === 'edit_requested' || (payment?.status === 'pending' && payment?.remarks)) ? (
                                            <><Edit3 size={13} /><span>Edit & Resubmit</span></>
                                          ) : payment?.status === 'rejected' ? (
                                            <><Upload size={13} /><span>Resubmit Proof</span></>
                                          ) : (
                                            <><Upload size={13} /><span>Pay Contribution</span></>
                                          )}
                                        </button>
                                      )}
                                      
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );

                          })}

                          {(() => {
                            const chitAuctions = (auctions || []).filter(a => a.chitId === chit.id);
                            const maxAuctionMonth = chitAuctions.reduce((max, a) => Math.max(max, Number(a.monthNumber || 0)), 0);
                            const activeCurrentMonth = Number(chit.currentMonth || 1);
                            const maxVisibleMonth = Math.min(chit.durationMonths, Math.max(activeCurrentMonth, maxAuctionMonth + 1));
                            
                            if (maxVisibleMonth < chit.durationMonths) {
                              return (
                                <div style={{
                                  textAlign: 'center',
                                  padding: '0.85rem 1rem',
                                  backgroundColor: '#ffffff',
                                  borderRadius: '0.85rem',
                                  border: '1px dashed #cbd5e1',
                                  fontSize: '0.78rem',
                                  color: '#64748b',
                                  marginTop: '0.25rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.4rem',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                }}>
                                  <span>🔒</span>
                                  <span>
                                    Months {maxVisibleMonth + 1} to {chit.durationMonths} will unlock after their respective monthly auctions are conducted.
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        );
                      })()}
                    </div>
                  )}

                </div>
              </ScrollAnimationWrapper>
            );
          })}
        </div>
      )}

      {/* Payment Submit Modal */}
      {showPayModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 100050, padding: 0, overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '540px',
            backgroundColor: '#fff',
            borderRadius: '1.5rem 1.5rem 0 0',
            padding: '1.25rem 1.1rem',
            paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 1rem))',
            position: 'relative',
            maxHeight: '92vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            boxSizing: 'border-box',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.2)'
          }}>
            
            {/* Drag Handle */}
            <div style={{ width: '40px', height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px', margin: '0 auto 1rem auto' }} />

            <button
              onClick={() => setShowPayModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
              title="Close"
            >
              <X size={18} color="#374151" />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', paddingRight: '2.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CreditCard size={18} color="#fff" />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1f2937', margin: 0, wordBreak: 'break-word', lineHeight: 1.3 }}>
                  {payments.find(p => p.chitId === modalChit?.id && p.monthNumber === modalMonth)?.status === 'edit_requested'
                    ? 'Edit & Resubmit Payment'
                    : 'Submit Payment Proof'}
                </h3>
                <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: 0 }}>
                  {modalChit?.name} · {formatChitMonthWithNum(modalChit, modalMonth)}
                </p>
              </div>
            </div>

            {submitError && (
              <div style={{ padding: '0.6rem 0.85rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', color: '#991b1b', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <AlertCircle size={14} />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} style={{ marginTop: '1rem' }}>
              {/* Amount Due Banner */}
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.85rem', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                <span style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600 }}>Amount Due</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563eb' }}>
                  ₹{getDueAmountForMonth(modalChit, modalMonth, (auctions || []).filter(a => a.chitId === modalChit?.id)).toLocaleString()}
                </span>
              </div>

              {/* Step 1: QR Code */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 800 }}>1</span>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1f2937' }}>Scan QR Code & Make Payment</span>
                </div>
                <div style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '1rem',
                  padding: '0.85rem',
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}>
                  <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '0.75rem',
                    padding: '0.4rem',
                    display: 'inline-block',
                    border: '2px solid #f3f4f6',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    maxWidth: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <img
                      src={paymentQrImg}
                      alt="Payment QR Code"
                      style={{ width: '180px', height: '180px', maxWidth: '100%', objectFit: 'contain', borderRadius: '0.5rem', display: 'block' }}
                    />
                  </div>

                  {/* UPI ID Display & Copy */}
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '0.5rem',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '0.6rem',
                      padding: '0.4rem 0.85rem',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 600 }}>UPI ID:</span>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace', letterSpacing: '0.5px' }}>inavoluchits@axl</span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: copiedUpi ? '#2563eb' : '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'center',
                          padding: '2px',
                          borderRadius: '4px',
                          transition: 'all 0.2s'
                        }}
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                    </div>
                    {copiedUpi && (
                      <div style={{ fontSize: '0.7rem', color: '#2563eb', marginTop: '0.25rem', fontWeight: 600 }}>
                        Copied to clipboard!
                      </div>
                    )}
                  </div>


                </div>
              </div>

              {/* Step 2: Transaction ID */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 800 }}>2</span>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1f2937' }}>Enter Transaction Details</span>
                </div>
                <input
                  id="txnId"
                  type="text"
                  required
                  placeholder="Enter UPI/Bank transaction reference ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', fontSize: '16px', color: '#1f2937', outline: 'none', backgroundColor: '#fafafa', boxSizing: 'border-box' }}
                />
              </div>

              {/* Step 3: Upload Screenshot */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 800 }}>3</span>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1f2937' }}>Upload Payment Screenshot</span>
                </div>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '1.25rem', border: '1.5px dashed #d1d5db', borderRadius: '0.85rem',
                  cursor: 'pointer', textAlign: 'center', backgroundColor: '#fafafa',
                  transition: 'all 0.2s ease',
                  ...(proofFileName ? { borderColor: '#3b82f6', backgroundColor: '#eff6ff' } : {})
                }}>
                  {proofFileName ? <CheckCircle size={20} color="#2563eb" /> : <Camera size={20} color="#9ca3af" />}
                  <span style={{ fontSize: '0.78rem', color: proofFileName ? '#2563eb' : '#9ca3af', fontWeight: proofFileName ? 600 : 400 }}>
                    {proofFileName || 'Click to upload payment screenshot'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>PNG, JPG, JPEG, WEBP supported</span>
                  <input type="file" required accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
              </div>

              {/* Info note about admin approval */}
              <div style={{
                backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.75rem',
                padding: '0.65rem 0.85rem', marginBottom: '1rem',
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
              }}>
                <AlertCircle size={14} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.72rem', color: '#1e40af', lineHeight: 1.5 }}>
                  After submitting, your payment will be <strong>verified by the admin</strong>. Once approved, your installment status will update to <strong style={{ color: '#2563eb' }}>Paid</strong>.
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', padding: '0.85rem', borderRadius: '0.85rem',
                  background: submitting ? '#d1d5db' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  cursor: submitting ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  boxShadow: submitting ? 'none' : '0 4px 14px rgba(22, 163, 74, 0.3)'
                }}
              >
                {submitting ? (
                  <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Submitting...</>
                ) : (
                  <><Upload size={16} /> Submit for Verification</>  
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100060
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '1rem',
            padding: '2rem',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'modalFadeIn 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#1f2937' }}>
              <div style={{ backgroundColor: '#fef3c7', padding: '0.5rem', borderRadius: '50%', color: '#d97706' }}>
                <AlertCircle size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Confirm Action</h3>
            </div>
            
            <p style={{ color: '#4b5563', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to take the payment for <strong>Month {confirmModal.monthNumber}</strong> on <strong>{confirmModal.ticketId ? confirmModal.ticketId.replace(/^TICKET-/, 'MEMBER-') : 'this member slot'}</strong>? 
              This action cannot be undone and will book this month specifically for {confirmModal.ticketId ? confirmModal.ticketId.replace(/^TICKET-/, 'MEMBER-') : 'your member slot'}.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setConfirmModal({ isOpen: false, chitId: null, monthNumber: null })}
                disabled={isFreezing}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  color: isFreezing ? '#9ca3af' : '#374151',
                  fontWeight: 600,
                  cursor: isFreezing ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                  opacity: isFreezing ? 0.6 : 1
                }}
                onMouseOver={(e) => !isFreezing && (e.target.style.backgroundColor = '#f3f4f6')}
                onMouseOut={(e) => !isFreezing && (e.target.style.backgroundColor = '#fff')}
              >
                Cancel
              </button>
              <button
                onClick={confirmFreezeMonth}
                disabled={isFreezing}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: isFreezing ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: isFreezing ? 0.7 : 1
                }}
                onMouseOver={(e) => !isFreezing && (e.target.style.backgroundColor = '#1d4ed8')}
                onMouseOut={(e) => !isFreezing && (e.target.style.backgroundColor = '#2563eb')}
              >
                {isFreezing ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Processing...
                  </>
                ) : (
                  'Yes, Take Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt View Modal */}
      {viewReceiptData && (
        <ReceiptModal
          isOpen={Boolean(viewReceiptData)}
          onClose={() => setViewReceiptData(null)}
          {...viewReceiptData}
        />
      )}

      {/* Custom Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: toast.type === 'success' ? '#2563eb' : '#ef4444',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 9999,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{toast.message}</span>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes modalFadeIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default MyActiveChits;
