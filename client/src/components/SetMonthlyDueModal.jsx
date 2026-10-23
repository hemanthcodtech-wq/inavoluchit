import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  IndianRupee, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  MessageCircle, 
  Send, 
  Copy, 
  Share2, 
  Check, 
  Users, 
  Phone,
  ExternalLink,
  RotateCw,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatChitMonthYear, formatChitMonthFull, formatChitMonthWithNum } from '../utils/chitDateUtils';

const SetMonthlyDueModal = ({ isOpen, onClose, chit, initialMonth, members: passedMembers, onDueUpdated }) => {
  const { token, API_URL } = useAuth();

  const [monthNumber, setMonthNumber] = useState(initialMonth || chit?.currentMonth || 1);
  const [dueAmount, setDueAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // WhatsApp Broadcast Console View State
  const [showBroadcastView, setShowBroadcastView] = useState(false);
  const [broadcastMembers, setBroadcastMembers] = useState([]);
  const [sentMap, setSentMap] = useState({});
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoProgress, setAutoProgress] = useState(0);
  const [copiedAll, setCopiedAll] = useState(false);

  const prevOpenRef = React.useRef(false);

  useEffect(() => {
    // Only reset/initialize if modal opens from closed state
    if (isOpen && !prevOpenRef.current) {
      const targetMonth = initialMonth || chit?.currentMonth || 1;
      setMonthNumber(targetMonth);
      loadMonthDue(targetMonth);
      setError('');
      setSuccess('');
      setShowBroadcastView(false);
      setBroadcastMembers([]);
      setSentMap({});
      setAutoRunning(false);
      setAutoProgress(0);
      setCopiedAll(false);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialMonth]);

  const loadMonthDue = (mNum) => {
    if (!chit) return;
    const existing = (chit.monthlyDues || []).find((d) => d.monthNumber === Number(mNum));
    if (existing) {
      setDueAmount(String(existing.dueAmount));
      setDueDate(existing.dueDate ? existing.dueDate.split('T')[0] : '');
      setNotes(existing.notes || '');
    } else {
      setDueAmount(String(chit.monthlyContribution || ''));
      setDueDate('');
      setNotes('');
    }
  };

  const handleMonthChange = (e) => {
    const m = Number(e.target.value);
    setMonthNumber(m);
    loadMonthDue(m);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dueAmount || Number(dueAmount) < 0) {
      return setError('Please enter a valid monthly due amount.');
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const chitId = chit.id || chit._id;
      const res = await fetch(`${API_URL}/admin/chits/${chitId}/set-monthly-due`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          monthNumber: Number(monthNumber),
          dueAmount: Number(dueAmount),
          dueDate: dueDate || null,
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        if (onDueUpdated) onDueUpdated(data.data);

        const membersList = data.enrolledMembers || [];
        if (notifyWhatsApp && membersList.length > 0) {
          // Transition to the WhatsApp Broadcast Console View
          setBroadcastMembers(membersList);
          setShowBroadcastView(true);
          setSuccess(`Month ${monthNumber} due set to ₹${Number(dueAmount).toLocaleString()}! Ready to dispatch WhatsApp notices.`);
        } else {
          setSuccess(`Month ${monthNumber} due set to ₹${Number(dueAmount).toLocaleString()} successfully!`);
          setTimeout(() => {
            onClose();
          }, 1100);
        }
      } else {
        setError(data.message || 'Failed to set monthly due.');
      }
    } catch (err) {
      console.error('Error setting monthly due:', err);
      setError('Connection error updating monthly due.');
    } finally {
      setLoading(false);
    }
  };

  // Open WhatsApp chat directly for a member
  const sendWhatsAppToMember = (member, index) => {
    if (!member || !member.phone) return;
    const cleanPhone = String(member.phone).replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(member.whatsappText)}`;
    window.open(url, '_blank');
    setSentMap((prev) => ({ ...prev, [member.id || index]: true }));
  };

  // Automated runner: Dispatches WhatsApp messages sequentially so popups are not blocked
  const handleBroadcastAll = async () => {
    if (broadcastMembers.length === 0 || autoRunning) return;

    setAutoRunning(true);
    setAutoProgress(0);

    for (let i = 0; i < broadcastMembers.length; i++) {
      const member = broadcastMembers[i];
      setAutoProgress(i + 1);

      // Open member's chat
      sendWhatsAppToMember(member, i);

      // Brief delay between windows to let the browser handle the dispatch smoothly
      if (i < broadcastMembers.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    setAutoRunning(false);
  };

  // Copy bulk broadcast template and phone numbers to clipboard
  const handleCopyBulkNotice = () => {
    if (broadcastMembers.length === 0) return;

    const phonesList = broadcastMembers.map((m) => m.displayPhone || m.phone).join(', ');
    const sampleMessage = broadcastMembers[0]?.whatsappText || '';

    const textToCopy = `📋 *INAVOLU CHIT FUNDS - ENROLLED MEMBERS BROADCAST LIST*\n` +
      `📱 Numbers: ${phonesList}\n\n` +
      `------------------------------------\n` +
      `${sampleMessage}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    });
  };

  // Native mobile share sheet (if available on Android/iOS/Windows)
  const handleNativeShare = async () => {
    const sampleMessage = broadcastMembers[0]?.whatsappText || '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: `InaVolu Chits - Month ${monthNumber} Payment Due Notice`,
          text: sampleMessage
        });
      } catch (err) {
        console.warn('Share cancelled or not supported', err);
      }
    } else {
      handleCopyBulkNotice();
    }
  };

  if (!isOpen || !chit) return null;

  const duration = Number(chit.durationMonths || 20);
  const enrolledCount = passedMembers?.length 
    ? passedMembers.length 
    : ((chit.members || []).filter((m) => m.status === 'approved').length || chit.totalMembers || 0);
  const sentCount = Object.keys(sentMap).length;
  const nextUnsentIndex = broadcastMembers.findIndex((m, idx) => !sentMap[m.id || idx]);
  const nextUnsentMember = nextUnsentIndex !== -1 ? broadcastMembers[nextUnsentIndex] : null;
  const isAllSent = broadcastMembers.length > 0 && sentCount === broadcastMembers.length;

  return (
    <div 
      className="admin-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 25, 47, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '0.65rem',
        boxSizing: 'border-box'
      }} 
      onClick={onClose}
    >
      <div 
        className="admin-modal-card"
        style={{
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 100%)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderRadius: '20px',
          maxWidth: '580px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(10, 30, 59, 0.35)',
          overflow: 'hidden',
          border: '1.5px solid rgba(255, 255, 255, 0.85)',
          animation: 'modalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0a1e3b 0%, #172554 50%, #1e3a8a 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
          color: '#ffffff',
          padding: '1rem 1.35rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ minWidth: 0, flex: 1, paddingRight: '0.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
              <IndianRupee size={19} color="#fbbf24" />
              <span>{showBroadcastView ? 'WhatsApp Due Notice Broadcast' : 'Set Monthly Due Amount'}</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '0.2rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <Sparkles size={12} color="#fbbf24" />
              <span>{chit.name} • Pool Value: ₹{Number(chit.chitValue || 0).toLocaleString()}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.85)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* View 1: SET DUE FORM */}
        {!showBroadcastView ? (
          <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
            {error && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid #fca5a5' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid #86efac' }}>
                <CheckCircle2 size={16} />
                <span>{success}</span>
              </div>
            )}

            {/* Scheme Summary Banner */}
            <div style={{
              padding: '0.85rem 1rem',
              background: 'rgba(239, 246, 255, 0.85)',
              borderRadius: '12px',
              border: '1px solid rgba(191, 219, 254, 0.85)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.65rem'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Default Installment</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e3a8a', marginTop: '0.1rem' }}>
                  ₹{Number(chit.monthlyContribution || 0).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>/ member</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Enrolled Members</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e3a8a', marginTop: '0.1rem' }}>
                  {enrolledCount} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>/ {chit.totalMembers}</span>
                </div>
              </div>
            </div>

            {/* Month Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                Select Chit Month
              </label>
              <select
                value={monthNumber}
                onChange={handleMonthChange}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
              >
                {Array.from({ length: duration }, (_, i) => i + 1).map((m) => {
                  const config = (chit.monthlyDues || []).find((d) => d.monthNumber === m);
                  return (
                    <option key={m} value={m}>
                      {formatChitMonthWithNum(chit, m)} {config ? `— (Configured: ₹${config.dueAmount.toLocaleString()})` : `— (Default: ₹${(chit.monthlyContribution || 0).toLocaleString()})`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Due Amount Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                Payable Amount For {formatChitMonthWithNum(chit, monthNumber)} (₹) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#2563eb', fontSize: '1.1rem' }}>₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={dueAmount}
                  onChange={(e) => setDueAmount(e.target.value)}
                  placeholder="Enter payable amount per member"
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem 0.7rem 2.3rem',
                    borderRadius: '10px',
                    border: '2px solid #2563eb',
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>
              <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '0.3rem 0 0 0' }}>
                This due amount applies to all {enrolledCount} enrolled members for {formatChitMonthWithNum(chit, monthNumber)}.
              </p>
            </div>

            {/* Due Date & Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Payment Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Notes / Instructions
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Post-auction dividend installment"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>
            </div>

            {/* WhatsApp Notification Trigger Toggle */}
            <div 
              onClick={() => setNotifyWhatsApp(!notifyWhatsApp)}
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: notifyWhatsApp ? '#f0fdf4' : '#f8fafc',
                borderRadius: '12px',
                border: `1.5px solid ${notifyWhatsApp ? '#86efac' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: notifyWhatsApp ? '0 2px 8px rgba(22, 163, 74, 0.08)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: notifyWhatsApp ? '#22c55e' : '#cbd5e1',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <MessageCircle size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: notifyWhatsApp ? '#166534' : '#334155' }}>
                    Send WhatsApp Due Notice
                  </div>
                  <div style={{ fontSize: '0.74rem', color: notifyWhatsApp ? '#15803d' : '#64748b' }}>
                    Send notice to all {enrolledCount} enrolled members with due amount & payment link at one go
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyWhatsApp}
                onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
              />
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  minHeight: '42px',
                  boxSizing: 'border-box'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.65rem 1.45rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 6px 18px rgba(22, 163, 74, 0.35)',
                  minHeight: '42px',
                  boxSizing: 'border-box'
                }}
              >
                {loading ? 'Saving...' : (notifyWhatsApp ? `Save & Send WhatsApp (${enrolledCount})` : `Save Month ${monthNumber} Due`)}
              </button>
            </div>
          </form>
        ) : (
          /* View 2: WHATSAPP BROADCAST CONSOLE */
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
            
            {/* Success Banner */}
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '12px',
              border: '1.5px solid #86efac',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.6rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <CheckCircle2 size={20} color="#16a34a" />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#166534' }}>
                    Month {monthNumber} Due Saved Successfully!
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                    Payable: ₹{Number(dueAmount).toLocaleString()} • {broadcastMembers.length} Enrolled Members Ready
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, backgroundColor: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '9999px', border: '1px solid #bbf7d0' }}>
                {sentCount} / {broadcastMembers.length} Sent
              </span>
            </div>

            {/* Direct Dispatch Next Queue Card */}
            {!isAllSent && nextUnsentMember ? (
              <div style={{
                backgroundColor: '#f0fdf4',
                borderRadius: '14px',
                border: '1.5px solid #86efac',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Ready to Dispatch ({nextUnsentIndex + 1} of {broadcastMembers.length})
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#14532d' }}>
                      {nextUnsentMember.name} <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>({nextUnsentMember.ticketId || nextUnsentMember.memberId})</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#166534' }}>
                      📱 {nextUnsentMember.displayPhone || nextUnsentMember.phone} • Due: ₹{Number(nextUnsentMember.amount || dueAmount).toLocaleString()}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534', backgroundColor: '#dcfce7', padding: '0.25rem 0.65rem', borderRadius: '9999px', border: '1px solid #bbf7d0' }}>
                    {sentCount} / {broadcastMembers.length} Sent
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => sendWhatsAppToMember(nextUnsentMember, nextUnsentIndex)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <MessageCircle size={18} />
                  <span>⚡ Open WhatsApp for {nextUnsentMember.name} ({sentCount + 1}/{broadcastMembers.length})</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div style={{
                backgroundColor: '#f0fdf4',
                borderRadius: '14px',
                border: '1.5px solid #86efac',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <CheckCircle2 size={24} color="#16a34a" />
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#166534' }}>
                    All {broadcastMembers.length} WhatsApp notices have been sent!
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                    Enrolled members received their scheduled due amounts & payment links.
                  </div>
                </div>
              </div>
            )}

            {/* Quick Multi-Dispatch Toolbar */}
            <div style={{
              display: 'flex',
              gap: '0.65rem',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {/* Primary: Send to All at One Go */}
              <button
                type="button"
                onClick={handleBroadcastAll}
                disabled={autoRunning || broadcastMembers.length === 0}
                style={{
                  flex: '1 1 200px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.92rem',
                  cursor: autoRunning ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 20px rgba(34, 197, 94, 0.4)',
                  minHeight: '44px',
                  boxSizing: 'border-box'
                }}
              >
                {autoRunning ? (
                  <>
                    <RotateCw size={17} className="spin" />
                    <span>Sending ({autoProgress} / {broadcastMembers.length})...</span>
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    <span>🚀 Send to All at One Go</span>
                  </>
                )}
              </button>

              {/* Secondary: Copy Notice Text & Numbers */}
              <button
                type="button"
                onClick={handleCopyBulkNotice}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: copiedAll ? '#f0fdf4' : '#ffffff',
                  color: copiedAll ? '#166534' : '#334155',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  minHeight: '44px',
                  boxSizing: 'border-box'
                }}
              >
                {copiedAll ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedAll ? 'Copied All!' : 'Copy Numbers & Text'}</span>
              </button>

              {/* Mobile Share Sheet */}
              <button
                type="button"
                onClick={handleNativeShare}
                title="Share to WhatsApp App"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1.5px solid #2563eb',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  minHeight: '44px',
                  boxSizing: 'border-box'
                }}
              >
                <Share2 size={16} />
                <span>Share</span>
              </button>
            </div>

            <div style={{ fontSize: '0.73rem', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>💡 Tip: If browser popup blocker blocks multiple tabs, click the green "Open WhatsApp" button above or allow popups in your URL bar.</span>
            </div>

            {/* Enrolled Members Dispatch List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Enrolled Members ({broadcastMembers.length})
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '260px',
                overflowY: 'auto',
                paddingRight: '0.25rem'
              }}>
                {broadcastMembers.map((m, idx) => {
                  const isSent = Boolean(sentMap[m.id || idx]);
                  return (
                    <div
                      key={m.id || idx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: `1px solid ${isSent ? '#bbf7d0' : '#e2e8f0'}`,
                        backgroundColor: isSent ? '#f0fdf4' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.6rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isSent ? '#22c55e' : '#e0f2fe',
                          color: isSent ? '#ffffff' : '#0369a1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}>
                          {isSent ? <Check size={16} /> : (m.name || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.name} <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>({m.memberId || m.ticketId})</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Phone size={12} color="#16a34a" />
                            <span>{m.displayPhone || m.phone}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => sendWhatsAppToMember(m, idx)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: isSent ? '#dcfce7' : '#22c55e',
                          color: isSent ? '#166534' : '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isSent ? (
                          <>
                            <Check size={13} />
                            <span>Sent</span>
                          </>
                        ) : (
                          <>
                            <MessageCircle size={13} />
                            <span>Send</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Broadcast Completed Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.65rem 1.4rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <span>Done & Close</span>
                <Check size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalPopIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SetMonthlyDueModal;
