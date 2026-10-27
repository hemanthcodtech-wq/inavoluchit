import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatChitMonthYear, formatChitMonthFull, formatChitMonthWithNum } from '../utils/chitDateUtils';

const APP_BASE_URL = (import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://www.inavolu.com')).replace(/\/+$/, '');

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
  const [commonNoticeText, setCommonNoticeText] = useState('');
  const [sentMap, setSentMap] = useState({});
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedNumbers, setCopiedNumbers] = useState(false);
  const [copiedSingleMap, setCopiedSingleMap] = useState({});
  const [showIndividualList, setShowIndividualList] = useState(false);

  // Compute enrolled list of members with phone numbers
  const enrolledList = useMemo(() => {
    if (Array.isArray(passedMembers) && passedMembers.length > 0) {
      return passedMembers.map((m) => {
        const u = m.user || m.userId || m;
        const rawPhone = u.whatsappNumber || u.phone || '';
        const clean10 = rawPhone.replace(/\D/g, '').slice(-10);
        return {
          id: u._id || u.id || Math.random(),
          name: u.name || 'Member',
          phone: rawPhone,
          clean10: clean10,
          ticketId: Array.isArray(m.ticketIds) ? m.ticketIds.join(', ') : (m.ticketId || '')
        };
      }).filter((m) => m.clean10);
    }
    if (Array.isArray(chit?.members) && chit.members.length > 0) {
      return chit.members
        .filter((m) => m.status === 'approved' || !m.status)
        .map((m) => {
          const u = m.userId || m.user || m;
          const rawPhone = u.whatsappNumber || u.phone || '';
          const clean10 = rawPhone.replace(/\D/g, '').slice(-10);
          return {
            id: u._id || u.id || Math.random(),
            name: u.name || 'Member',
            phone: rawPhone,
            clean10: clean10,
            ticketId: m.ticketId || ''
          };
        }).filter((m) => m.clean10);
    }
    return [];
  }, [passedMembers, chit]);

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
      setCommonNoticeText('');
      setSentMap({});
      setCopiedAll(false);
      setCopiedNumbers(false);
      setShowIndividualList(false);
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

  const buildCommonNotice = (mNum, amt, dDate, nts, count) => {
    const schemeName = chit?.name || chit?.chitName || 'InaVolu Chit Scheme';
    const mName = formatChitMonthYear(chit, mNum);
    const formattedAmt = Number(amt).toLocaleString('en-IN');
    const dDateStr = dDate ? new Date(dDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'As scheduled';

    return `🔔 *INAVOLU CHIT FUNDS PRIVATE LIMITED* 🔔\n` +
      `*OFFICIAL MONTHLY PAYMENT DUE NOTICE*\n\n` +
      `Dear Valued Members,\n` +
      `The monthly installment for *${schemeName}* has been scheduled:\n\n` +
      `📋 *Scheme:* ${schemeName}\n` +
      `🗓 *Installment:* Month ${mNum} (${mName})\n` +
      `💰 *Payable Due Amount:* ₹${formattedAmt} per slot\n` +
      `📅 *Payment Due Date:* ${dDateStr}\n` +
      (nts ? `📝 *Notes:* ${nts}\n` : '') +
      `👥 *Enrolled Members:* ${count} Members\n\n` +
      `Kindly remit your monthly installment on or before the due date.\n\n` +
      `📱 *Online Member Portal & Verified Receipts:*\n` +
      `${APP_BASE_URL}/dashboard\n\n` +
      `Thank you,\n` +
      `*InaVolu Chit Funds Private Limited*\n` +
      `📞 Helpline: +91 8500319890 | 🌐 Web: www.inavolu.com`;
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
        const noticeMsg = data.commonWhatsAppText || buildCommonNotice(
          Number(monthNumber),
          Number(dueAmount),
          dueDate,
          notes.trim(),
          membersList.length
        );

        setCommonNoticeText(noticeMsg);
        setBroadcastMembers(membersList);

        if (notifyWhatsApp && (membersList.length > 0 || enrolledList.length > 0)) {
          setShowBroadcastView(true);

          // 1. Auto-copy all phone numbers to clipboard so admin can immediately paste into WhatsApp search bar
          const phonesToCopy = (membersList.length > 0
            ? membersList.map((m) => String(m.displayPhone || m.phone || '').replace(/\D/g, '').slice(-10)).filter((p) => p && p.length === 10).join(', ')
            : allPhonesCommaSeparated);

          if (phonesToCopy) {
            navigator.clipboard.writeText(phonesToCopy).catch(() => {});
          }

          // 2. Open WhatsApp "Send message to" dialog (native modal with search bar & checkboxes)
          const commonUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(noticeMsg)}`;
          window.open(commonUrl, '_blank');

          setSuccess(`Month ${monthNumber} due set to ₹${Number(dueAmount).toLocaleString()}! WhatsApp "Send message to" dialog opened & all member phone numbers copied to clipboard.`);
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

  // Compute all clean 10-digit phone numbers as comma-separated string
  const allPhonesCommaSeparated = useMemo(() => {
    const list = broadcastMembers.length > 0 ? broadcastMembers : enrolledList;
    return list
      .map((m) => {
        const p = m.clean10 || m.displayPhone || m.phone || '';
        return String(p).replace(/\D/g, '').slice(-10);
      })
      .filter((p) => p && p.length === 10)
      .join(', ');
  }, [broadcastMembers, enrolledList]);

  // Open WhatsApp with the common announcement (without phone param to open native "Send message to" dialog)
  const handleOpenCommonWhatsApp = () => {
    if (!commonNoticeText) return;
    const commonUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(commonNoticeText)}`;
    window.open(commonUrl, '_blank');
  };

  // Copy common notice to clipboard
  const handleCopyCommonNotice = () => {
    if (!commonNoticeText) return;
    navigator.clipboard.writeText(commonNoticeText).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    });
  };

  // Copy comma-separated member phone numbers
  const handleCopyPhoneNumbers = (customText) => {
    const phonesList = customText || allPhonesCommaSeparated;
    if (!phonesList) return;
    navigator.clipboard.writeText(phonesList).then(() => {
      setCopiedNumbers(true);
      setTimeout(() => setCopiedNumbers(false), 2500);
    });
  };

  // Copy single member phone number
  const handleCopySinglePhone = (phone, id) => {
    if (!phone) return;
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    navigator.clipboard.writeText(cleanPhone).then(() => {
      setCopiedSingleMap((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedSingleMap((prev) => ({ ...prev, [id]: false }));
      }, 2000);
    });
  };

  // Open WhatsApp chat directly for a specific member individually (reuses the same window to prevent multi-tab spam)
  const sendWhatsAppToMember = (member, index) => {
    if (!member || !member.phone) return;
    const cleanPhone = String(member.phone).replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(member.whatsappText || commonNoticeText)}`;
    window.open(url, 'inavolu_whatsapp_window');
    setSentMap((prev) => ({ ...prev, [member.id || index]: true }));
  };

  // Native mobile share sheet (if available)
  const handleNativeShare = async () => {
    if (navigator.share && commonNoticeText) {
      try {
        await navigator.share({
          title: `InaVolu Chits - Month ${monthNumber} Payment Due Notice`,
          text: commonNoticeText
        });
      } catch (err) {
        console.warn('Share cancelled or not supported', err);
      }
    } else {
      handleCopyCommonNotice();
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
  const isAllSent = broadcastMembers.length > 0 && broadcastMembers.every((m, idx) => sentMap[m.id || idx]);

  return createPortal(
    <div 
      className="admin-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '1rem',
        boxSizing: 'border-box'
      }} 
      onClick={onClose}
    >
      <div 
        className="admin-modal-card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          boxSizing: 'border-box',
          animation: 'modalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div style={{
          background: '#0a1e3b',
          borderBottom: '1px solid #1e293b',
          color: '#ffffff',
          padding: '0.9rem 1.25rem',
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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', margin: 0 }}>
            <div style={{ padding: '1.15rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto', flex: 1 }}>
              {error && (
                <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid #fca5a5' }}>
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid #86efac' }}>
                  <CheckCircle2 size={15} />
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

            {/* Enrolled Member Phone Numbers Panel with Copy Option */}
            {notifyWhatsApp && enrolledList.length > 0 && (
              <div style={{
                marginTop: '0.65rem',
                padding: '0.85rem 1rem',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1.5px solid #86efac',
                boxShadow: '0 2px 10px rgba(22, 163, 74, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Users size={16} color="#16a34a" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534' }}>
                      Enrolled Client Phone Numbers ({enrolledList.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCopyPhoneNumbers(allPhonesCommaSeparated);
                    }}
                    style={{
                      padding: '0.35rem 0.8rem',
                      borderRadius: '8px',
                      border: copiedNumbers ? '1px solid #16a34a' : '1px solid #86efac',
                      backgroundColor: copiedNumbers ? '#16a34a' : '#dcfce7',
                      color: copiedNumbers ? '#ffffff' : '#166534',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {copiedNumbers ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedNumbers ? 'Copied to Clipboard!' : 'Copy All Numbers'}</span>
                  </button>
                </div>

                {/* Comma-separated Numbers Readout Box */}
                <div style={{
                  padding: '0.55rem 0.75rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  color: '#334155',
                  wordBreak: 'break-all',
                  lineHeight: '1.45',
                  userSelect: 'all',
                  maxHeight: '65px',
                  overflowY: 'auto'
                }}>
                  {allPhonesCommaSeparated}
                </div>

                {/* Individual Member Phone Chips with 1-Click Copy */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '110px', overflowY: 'auto', paddingTop: '0.1rem' }}>
                  {enrolledList.map((m) => {
                    const isCopied = Boolean(copiedSingleMap[m.id]);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCopySinglePhone(m.clean10, m.id);
                        }}
                        title={`Click to copy ${m.name}'s phone number (${m.clean10})`}
                        style={{
                          padding: '0.25rem 0.55rem',
                          borderRadius: '6px',
                          border: isCopied ? '1px solid #16a34a' : '1px solid #cbd5e1',
                          backgroundColor: isCopied ? '#dcfce7' : '#ffffff',
                          color: isCopied ? '#166534' : '#334155',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>{m.name}:</span>
                        <span>{m.clean10}</span>
                        {isCopied ? <Check size={11} color="#16a34a" /> : <Copy size={11} color="#64748b" />}
                      </button>
                    );
                  })}
                </div>

                <div style={{
                  fontSize: '0.72rem',
                  color: '#15803d',
                  backgroundColor: '#f0fdf4',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px dashed #86efac',
                  lineHeight: 1.35
                }}>
                  💡 <b>Quick WhatsApp Dispatch:</b> When you click <b>Save & Send WhatsApp</b>, WhatsApp Web automatically opens with the <b>"Send message to"</b> dialog and copies these numbers. Paste in the search bar, select the clients, and click Send!
                </div>
              </div>
            )}

            </div>

            {/* Fixed Footer Buttons */}
            <div style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.65rem',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  minHeight: '38px',
                  boxSizing: 'border-box'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.55rem 1.35rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                  minHeight: '38px',
                  boxSizing: 'border-box'
                }}
              >
                {loading ? 'Saving...' : (notifyWhatsApp ? `Save & Send WhatsApp (${enrolledCount})` : `Save Month ${monthNumber} Due`)}
              </button>
            </div>
          </form>
        ) : (
          /* View 2: DEDICATED DIRECT MEMBER DISPATCHER CONSOLE */
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
            
            {/* Header & Progress Banner */}
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '12px',
              border: '1.5px solid #86efac',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <CheckCircle2 size={22} color="#16a34a" />
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#166534' }}>
                      Month {monthNumber} Due Saved Successfully!
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#15803d' }}>
                      Payable: ₹{Number(dueAmount).toLocaleString()} • {broadcastMembers.length} Enrolled Members
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 900, backgroundColor: isAllSent ? '#16a34a' : '#dcfce7', color: isAllSent ? '#ffffff' : '#166534', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid #86efac' }}>
                  {sentCount} / {broadcastMembers.length} Dispatched ({broadcastMembers.length > 0 ? Math.round((sentCount / broadcastMembers.length) * 100) : 0}%)
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div style={{ width: '100%', height: '7px', backgroundColor: '#dcfce7', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${broadcastMembers.length > 0 ? Math.round((sentCount / broadcastMembers.length) * 100) : 0}%`,
                  background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* PRIMARY: WHATSAPP "SEND MESSAGE TO" ALL CLIENTS HUB */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '2px solid #22c55e',
              boxShadow: '0 4px 16px rgba(34, 197, 94, 0.15)',
              padding: '1.15rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#166534' }}>
                      WhatsApp "Send message to" All Clients
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#15803d' }}>
                      Send due notice to all {broadcastMembers.length || enrolledCount} members in one go
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, backgroundColor: '#dcfce7', color: '#166534', padding: '0.2rem 0.65rem', borderRadius: '9999px', border: '1px solid #86efac' }}>
                  Numbers in Clipboard
                </span>
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={handleOpenCommonWhatsApp}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                    boxSizing: 'border-box'
                  }}
                >
                  <MessageCircle size={18} />
                  <span>Open WhatsApp "Send message to"</span>
                  <ExternalLink size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyPhoneNumbers()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: copiedNumbers ? '1.5px solid #16a34a' : '1.5px solid #cbd5e1',
                    backgroundColor: copiedNumbers ? '#f0fdf4' : '#ffffff',
                    color: copiedNumbers ? '#166534' : '#0f172a',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {copiedNumbers ? <Check size={18} color="#16a34a" /> : <Copy size={18} color="#64748b" />}
                  <span>{copiedNumbers ? 'Copied to Clipboard!' : 'Copy All Numbers Again'}</span>
                </button>
              </div>

              {/* Numbers Preview Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Enrolled Client Numbers (Comma-Separated):
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Select or click below to copy
                  </span>
                </div>
                <div style={{
                  padding: '0.55rem 0.75rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  color: '#334155',
                  wordBreak: 'break-all',
                  lineHeight: '1.45',
                  userSelect: 'all',
                  maxHeight: '65px',
                  overflowY: 'auto'
                }}>
                  {allPhonesCommaSeparated}
                </div>
              </div>

              {/* Member Chips with 1-Click Copy */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '110px', overflowY: 'auto', paddingTop: '0.1rem' }}>
                {(broadcastMembers.length > 0 ? broadcastMembers : enrolledList).map((m, idx) => {
                  const mId = m.id || idx;
                  const cleanP = String(m.clean10 || m.displayPhone || m.phone || '').replace(/\D/g, '').slice(-10);
                  const isCopied = Boolean(copiedSingleMap[mId]);
                  return (
                    <button
                      key={mId}
                      type="button"
                      onClick={() => handleCopySinglePhone(cleanP, mId)}
                      title={`Click to copy ${m.name}'s phone number (${cleanP})`}
                      style={{
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        border: isCopied ? '1px solid #16a34a' : '1px solid #cbd5e1',
                        backgroundColor: isCopied ? '#dcfce7' : '#ffffff',
                        color: isCopied ? '#166534' : '#334155',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{m.name}:</span>
                      <span>{cleanP}</span>
                      {isCopied ? <Check size={11} color="#16a34a" /> : <Copy size={11} color="#64748b" />}
                    </button>
                  );
                })}
              </div>

              {/* 3-Step Instruction Card Matching Screenshot */}
              <div style={{
                backgroundColor: '#f0fdf4',
                borderRadius: '10px',
                border: '1px solid #86efac',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={14} color="#16a34a" />
                  <span>How to send to all clients in 3 simple steps:</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#15803d', display: 'flex', flexDirection: 'column', gap: '0.25rem', lineHeight: '1.4' }}>
                  <div><b>Step 1:</b> The numbers above are already copied to your clipboard (or click <b>Copy All Numbers</b>).</div>
                  <div><b>Step 2:</b> In the WhatsApp <b>"Send message to"</b> dialog, paste (<code>Ctrl+V</code>) the phone number into the search box: <i>"Search name, number or @username"</i>.</div>
                  <div><b>Step 3:</b> Click the checkbox next to each matching contact, then click <b>Send</b>!</div>
                </div>
              </div>
            </div>

            {/* If all members marked sent, show celebration */}
            {isAllSent && broadcastMembers.length > 0 && (
              <div style={{
                backgroundColor: '#f0fdf4',
                borderRadius: '14px',
                border: '2px solid #86efac',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#22c55e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#166534' }}>
                      All {broadcastMembers.length} Members Notified!
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '0.15rem' }}>
                      All scheduled payment notices were dispatched.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#166534',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.88rem',
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
            )}

            {/* Member Dispatch Queue List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Enrolled Members Queue ({broadcastMembers.length})
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                  {sentCount} of {broadcastMembers.length} Sent
                </span>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                maxHeight: '220px',
                overflowY: 'auto',
                paddingRight: '0.25rem'
              }}>
                {broadcastMembers.map((m, idx) => {
                  const isSent = Boolean(sentMap[m.id || idx]);
                  const isCurrentNext = !isSent && idx === nextUnsentIndex;
                  return (
                    <div
                      key={m.id || idx}
                      style={{
                        padding: '0.55rem 0.8rem',
                        borderRadius: '8px',
                        border: `1.5px solid ${isCurrentNext ? '#22c55e' : (isSent ? '#bbf7d0' : '#e2e8f0')}`,
                        backgroundColor: isCurrentNext ? '#f0fdf4' : (isSent ? '#f8fafc' : '#ffffff'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.6rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          backgroundColor: isSent ? '#22c55e' : (isCurrentNext ? '#16a34a' : '#e2e8f0'),
                          color: isSent || isCurrentNext ? '#ffffff' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}>
                          {isSent ? <Check size={14} /> : (idx + 1)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.name} <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>({m.memberId || m.ticketId})</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Phone size={11} color="#16a34a" />
                            <span>{m.displayPhone || m.phone}</span>
                            <span>•</span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{Number(m.amount || dueAmount).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => sendWhatsAppToMember(m, idx)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.35rem 0.7rem',
                          borderRadius: '6px',
                          border: isSent ? '1px solid #bbf7d0' : 'none',
                          backgroundColor: isSent ? '#ffffff' : (isCurrentNext ? '#16a34a' : '#22c55e'),
                          color: isSent ? '#166534' : '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        {isSent ? (
                          <>
                            <Check size={12} color="#16a34a" />
                            <span>Re-send</span>
                          </>
                        ) : (
                          <>
                            <MessageCircle size={12} />
                            <span>Send Direct</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Collapsible: Chit Group Announcement & Tools */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem', backgroundColor: '#fcfcfd' }}>
              <button
                type="button"
                onClick={() => setShowIndividualList((prev) => !prev)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0.2rem 0.1rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#475569',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Share2 size={14} color="#2563eb" />
                  <span>Optional: Share Common Notice to WhatsApp Group or Copy Numbers</span>
                </div>
                {showIndividualList ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {showIndividualList && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.65rem' }}>
                  {/* Common Notice Preview Box */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    padding: '0.65rem',
                    fontSize: '0.75rem',
                    lineHeight: 1.5,
                    color: '#334155',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '120px',
                    overflowY: 'auto'
                  }}>
                    {commonNoticeText}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleOpenCommonWhatsApp}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #22c55e',
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      <MessageCircle size={14} />
                      <span>Open WhatsApp Group Picker</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyCommonNotice}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      {copiedAll ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedAll ? 'Notice Copied!' : 'Copy Notice'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyPhoneNumbers}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      {copiedNumbers ? <Check size={14} /> : <Phone size={14} />}
                      <span>{copiedNumbers ? 'Numbers Copied!' : 'Copy All Numbers'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Done & Close */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
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
    </div>,
    document.body
  );
};

export default SetMonthlyDueModal;
