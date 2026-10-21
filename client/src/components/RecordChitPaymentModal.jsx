import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Calendar,
  CreditCard,
  User,
  Layers,
  Sparkles,
  TrendingDown,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProofUploader from './ProofUploader';
import { formatChitMonthYear, formatChitMonthFull, formatChitMonthWithNum } from '../utils/chitDateUtils';

const RecordChitPaymentModal = ({
  isOpen,
  onClose,
  chit,
  members = [],
  initialUserId = null,
  initialMonth = null,
  editingPayment = null,
  onPaymentRecorded
}) => {
  const { token, API_URL } = useAuth();

  const [selectedUserId, setSelectedUserId] = useState('');
  const [monthNumber, setMonthNumber] = useState(1);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [transactionId, setTransactionId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [proofFile, setProofFile] = useState(null);

  const [allRegisteredUsers, setAllRegisteredUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Build user slots & info map from members or chit.members
  const userMap = {};

  // 1. Check passed members (from dues-summary)
  if (Array.isArray(members) && members.length > 0) {
    members.forEach((m) => {
      const u = m.user || {};
      const uId = u._id ? u._id.toString() : (u.id ? u.id.toString() : '');
      if (!uId) return;
      userMap[uId] = {
        id: uId,
        name: u.name || 'Member',
        memberId: u.memberId || '',
        phone: u.phone || '',
        email: u.email || '',
        slotsCount: m.slotsCount || 1,
        ticketIds: m.ticketIds || [],
        months: m.months || []
      };
    });
  }

  // 2. Also check chit.members
  if (chit?.members && Array.isArray(chit.members)) {
    chit.members.forEach((m) => {
      if (m.status !== 'approved' && m.status !== undefined) return;
      const u = m.user || {};
      const uId = u._id ? u._id.toString() : (u.id ? u.id.toString() : (m.userId ? m.userId.toString() : ''));
      if (!uId) return;
      if (!userMap[uId]) {
        userMap[uId] = {
          id: uId,
          name: u.name || 'Member',
          memberId: u.memberId || '',
          phone: u.phone || '',
          email: u.email || '',
          slotsCount: 0,
          ticketIds: [],
          months: []
        };
      }
      userMap[uId].slotsCount++;
      if (m.ticketId) userMap[uId].ticketIds.push(m.ticketId);
    });
  }

  const enrolledUsersList = Object.values(userMap);

  // If no enrolled users in the chit, fetch all registered users from server
  useEffect(() => {
    if (isOpen && enrolledUsersList.length === 0) {
      const fetchApprovedUsers = async () => {
        setLoadingUsers(true);
        try {
          const res = await fetch(`${API_URL}/admin/users/approved`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setAllRegisteredUsers(data.data);
          }
        } catch (err) {
          console.error('Error fetching registered users:', err);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchApprovedUsers();
    }
  }, [isOpen, enrolledUsersList.length, API_URL, token]);

  // Combined options: enrolled members first, then other registered users
  const availableUsers = enrolledUsersList.length > 0
    ? enrolledUsersList
    : allRegisteredUsers.map((u) => ({
        id: u._id || u.id,
        name: u.name,
        memberId: u.memberId,
        phone: u.phone,
        email: u.email,
        slotsCount: 1,
        ticketIds: [],
        months: []
      }));

  // Initialize or reset form on open
  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccess('');
      setProofFile(null);

      const m = editingPayment
        ? editingPayment.monthNumber
        : (initialMonth || chit?.currentMonth || 1);
      setMonthNumber(Number(m));

      const uId = editingPayment
        ? (editingPayment.userId?._id || editingPayment.userId || '')
        : (initialUserId || (availableUsers[0]?.id || ''));
      setSelectedUserId(uId);

      if (editingPayment) {
        setAmountPaid(String(editingPayment.amount || ''));
        const pDate = editingPayment.paymentDate || editingPayment.paidDate;
        setPaymentDate(pDate ? new Date(pDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setPaymentMode(editingPayment.paymentMode || 'Cash');
        setTransactionId(editingPayment.transactionId || '');
        setRemarks(editingPayment.remarks || '');
      } else {
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentMode('Cash');
        setTransactionId('');
        setRemarks('');
      }
    }
  }, [isOpen, chit, initialUserId, initialMonth, editingPayment, availableUsers.length]);

  // When selected user or month changes, calculate due and suggest amount
  useEffect(() => {
    if (!chit || !selectedUserId || editingPayment) return;

    const uData = userMap[selectedUserId];
    const slots = uData?.slotsCount || 1;

    const duesConfig = chit.monthlyDues || [];
    const config = duesConfig.find((d) => d.monthNumber === Number(monthNumber));
    const baseDue = config ? config.dueAmount : (chit.monthlyContribution || 0);
    const totalDue = baseDue * slots;

    // Check months array if available
    const monthData = uData?.months?.find((x) => x.monthNumber === Number(monthNumber));
    if (monthData) {
      const rem = monthData.remainingDue;
      setAmountPaid(String(rem > 0 ? rem : totalDue));
    } else {
      setAmountPaid(String(totalDue));
    }
  }, [selectedUserId, monthNumber, chit, editingPayment]);

  if (!isOpen || !chit) return null;

  const duration = Number(chit.durationMonths || 20);
  const duesConfig = chit.monthlyDues || [];
  const monthConfig = duesConfig.find((d) => d.monthNumber === Number(monthNumber));
  const baseDue = monthConfig ? monthConfig.dueAmount : (chit.monthlyContribution || 0);

  const selectedUserData = userMap[selectedUserId] || availableUsers.find((u) => u.id === selectedUserId);
  const userSlots = selectedUserData?.slotsCount || 1;
  const totalMonthDue = baseDue * userSlots;

  const monthObj = selectedUserData?.months?.find((x) => x.monthNumber === Number(monthNumber));
  const amountPaidSoFar = monthObj?.amountPaid || 0;
  const remainingBeforePayment = monthObj ? monthObj.remainingDue : totalMonthDue;

  const enteredAmount = Number(amountPaid || 0);
  const projectedRemaining = editingPayment
    ? Math.max(0, totalMonthDue - enteredAmount)
    : Math.max(0, remainingBeforePayment - enteredAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      return setError('Please select a member.');
    }
    if (!amountPaid || Number(amountPaid) <= 0) {
      return setError('Please enter a valid amount paid greater than 0.');
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      if (editingPayment?.id) {
        formData.append('paymentId', editingPayment.id);
      }
      formData.append('userId', selectedUserId);
      formData.append('monthNumber', monthNumber);
      formData.append('amount', amountPaid);
      formData.append('paymentDate', paymentDate);
      formData.append('paymentMode', paymentMode);
      if (transactionId.trim()) formData.append('transactionId', transactionId.trim());
      if (remarks.trim()) formData.append('remarks', remarks.trim());
      if (proofFile) formData.append('proof', proofFile);

      const res = await fetch(`${API_URL}/admin/chits/${chit.id || chit._id}/mark-paid`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || 'Payment saved successfully! User due has been reduced.');
        if (onPaymentRecorded) onPaymentRecorded(data.data);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(data.message || 'Failed to record payment.');
      }
    } catch (err) {
      console.error('Error saving payment:', err);
      setError('Connection error recording payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 25, 47, 0.65)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1.25rem',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          maxWidth: '620px',
          width: '100%',
          maxHeight: '92vh',
          boxShadow: '0 25px 60px -15px rgba(10, 30, 59, 0.4), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          overflowY: 'auto',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxSizing: 'border-box',
          animation: 'modalScaleIn 0.22s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0a1e3b 0%, #0f274a 100%)',
            color: '#ffffff',
            padding: '1.15rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#ffffff' }}>
              <CreditCard size={18} color="#22c55e" />
              <span>{editingPayment ? 'Update Member Payment' : 'Record Member Payment'}</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              {chit.name} • {formatChitMonthWithNum(chit, monthNumber)} Installment
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.35rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '10px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid #fca5a5' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '10px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid #86efac' }}>
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          {/* Member Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
              Select Member <span style={{ color: '#dc2626' }}>*</span>
            </label>
            {loadingUsers ? (
              <div style={{ fontSize: '0.82rem', color: '#64748b', padding: '0.5rem' }}>Loading registered users...</div>
            ) : availableUsers.length === 0 ? (
              <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', fontSize: '0.82rem', color: '#b45309' }}>
                No members found. Please enroll users in this chit scheme.
              </div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                disabled={Boolean(editingPayment)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  color: '#0f172a'
                }}
              >
                <option value="">-- Choose Member --</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.memberId ? `(${u.memberId})` : ''} {u.phone ? `• ${u.phone}` : ''} {u.slotsCount > 1 ? `(${u.slotsCount} Slots)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Month & Financial Breakdown Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                Payment Month
              </label>
              <select
                value={monthNumber}
                onChange={(e) => setMonthNumber(Number(e.target.value))}
                disabled={Boolean(editingPayment)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  color: '#0f172a'
                }}
              >
                {Array.from({ length: duration }, (_, i) => i + 1).map((m) => {
                  const cfg = duesConfig.find((d) => d.monthNumber === m);
                  const dAmt = cfg ? cfg.dueAmount : chit.monthlyContribution;
                  return (
                    <option key={m} value={m}>
                      {formatChitMonthWithNum(chit, m)} (Due: ₹{Number(dAmt * userSlots).toLocaleString()})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                Payment Date <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.62rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.86rem',
                  boxSizing: 'border-box',
                  background: '#ffffff'
                }}
              />
            </div>
          </div>

          {/* Live Due Calculation Preview Card */}
          <div
            style={{
              padding: '0.9rem 1.15rem',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
              <span>{formatChitMonthYear(chit, monthNumber)} (Month {monthNumber}) Due ({userSlots} {userSlots === 1 ? 'Slot' : 'Slots'}):</span>
              <strong style={{ color: '#0f172a' }}>₹{totalMonthDue.toLocaleString()}</strong>
            </div>

            {amountPaidSoFar > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#16a34a' }}>
                <span>Already Paid So Far:</span>
                <strong>- ₹{amountPaidSoFar.toLocaleString()}</strong>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '0.35rem' }}>
              <span>Current Outstanding Due:</span>
              <span style={{ color: '#dc2626' }}>₹{remainingBeforePayment.toLocaleString()}</span>
            </div>

            {/* Projected Outcome */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: projectedRemaining === 0 ? '#15803d' : '#b45309',
                backgroundColor: projectedRemaining === 0 ? '#dcfce7' : '#fef3c7',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                marginTop: '0.2rem'
              }}
            >
              <TrendingDown size={14} />
              <span>
                {projectedRemaining === 0
                  ? 'This payment clears the entire balance due! Status will be marked "Fully Paid".'
                  : `User remaining due will reduce to ₹${projectedRemaining.toLocaleString()} (Partial).`}
              </span>
            </div>
          </div>

          {/* Amount Paid Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
              Amount Paid Now (₹) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#2563eb', fontSize: '1.1rem' }}>₹</span>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="Enter paid amount"
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem 0.7rem 2.3rem',
                  borderRadius: '10px',
                  border: '2px solid #2563eb',
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  background: '#ffffff'
                }}
              />
            </div>
          </div>

          {/* Payment Mode & Reference */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.62rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                  background: '#ffffff'
                }}
              >
                <option value="Cash">Cash (In-Hand)</option>
                <option value="UPI">UPI / PhonePe / GPay</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Transaction ID / Ref #
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g., UPI Ref or CASH_01"
                style={{
                  width: '100%',
                  padding: '0.62rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                  background: '#ffffff'
                }}
              />
            </div>
          </div>

          {/* Proof of Payment Upload / Camera */}
          <div>
            <ProofUploader
              label="Payment Receipt Proof (Upload File or Camera Snapshot)"
              description="Upload payment receipt image or capture live photo with camera"
              required={false}
              onFileSelected={(file) => setProofFile(file)}
            />
          </div>

          {/* Remarks */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Verified by Admin, cash received at office"
              style={{
                width: '100%',
                padding: '0.62rem 0.85rem',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
                background: '#ffffff'
              }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
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
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.65rem 1.6rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              {loading ? 'Saving...' : (editingPayment ? 'Update Payment & Due' : 'Save Payment & Reduce Due')}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalScaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default RecordChitPaymentModal;
