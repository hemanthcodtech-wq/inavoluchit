import React, { useState, useEffect } from 'react';
import { X, Calendar, IndianRupee, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatChitMonthYear, formatChitMonthFull, formatChitMonthWithNum } from '../utils/chitDateUtils';

const SetMonthlyDueModal = ({ isOpen, onClose, chit, onDueUpdated }) => {
  const { token, API_URL } = useAuth();

  const [monthNumber, setMonthNumber] = useState(chit?.currentMonth || 1);
  const [dueAmount, setDueAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (chit && isOpen) {
      const initialMonth = chit.currentMonth || 1;
      setMonthNumber(initialMonth);
      loadMonthDue(initialMonth);
      setError('');
      setSuccess('');
    }
  }, [chit, isOpen]);

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
      const res = await fetch(`${API_URL}/admin/chits/${chit.id || chit._id}/set-monthly-due`, {
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
        setSuccess(`Month ${monthNumber} due set to ₹${Number(dueAmount).toLocaleString()} for all members!`);
        if (onDueUpdated) onDueUpdated(data.data);
        setTimeout(() => {
          onClose();
        }, 1100);
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

  if (!isOpen || !chit) return null;

  const duration = Number(chit.durationMonths || 20);
  const enrolledCount = (chit.members || []).filter((m) => m.status === 'approved').length;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(10, 25, 47, 0.65)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1.25rem'
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.92) 100%)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRadius: '24px',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 25px 60px rgba(10, 30, 59, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
        overflow: 'hidden',
        border: '1.5px solid rgba(255, 255, 255, 0.85)',
        animation: 'modalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Morphism Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(10, 30, 59, 0.95) 0%, rgba(23, 37, 84, 0.92) 50%, rgba(30, 58, 138, 0.90) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
          color: '#ffffff',
          padding: '1.25rem 1.65rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
              <IndianRupee size={20} color="#fbbf24" />
              <span>Set Monthly Due Amount</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={12} color="#fbbf24" />
              <span>{chit.name} • Pool Value: ₹{Number(chit.chitValue || 0).toLocaleString()}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '0.45rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.85)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid #fca5a5' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem', border: '1px solid #86efac' }}>
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          {/* Morphism Scheme Banner */}
          <div style={{
            padding: '0.95rem 1.15rem',
            background: 'rgba(239, 246, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            border: '1px solid rgba(191, 219, 254, 0.8)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.9)'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Default Installment</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e3a8a', marginTop: '0.15rem' }}>
                ₹{Number(chit.monthlyContribution || 0).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>/ member</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Enrolled Members</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e3a8a', marginTop: '0.15rem' }}>
                {enrolledCount} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>/ {chit.totalMembers}</span>
              </div>
            </div>
          </div>

          {/* Month Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem' }}>
              Select Chit Month
            </label>
            <select
              value={monthNumber}
              onChange={handleMonthChange}
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                borderRadius: '12px',
                border: '1.5px solid rgba(203, 213, 225, 0.9)',
                fontSize: '0.9rem',
                fontWeight: 700,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                color: '#0f172a'
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
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem' }}>
              Payable Amount For {formatChitMonthWithNum(chit, monthNumber)} (₹) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#2563eb', fontSize: '1.1rem' }}>₹</span>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={dueAmount}
                onChange={(e) => setDueAmount(e.target.value)}
                placeholder="Enter amount to be paid per slot"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem 0.75rem 2.4rem',
                  borderRadius: '12px',
                  border: '2px solid #2563eb',
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  background: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.1)'
                }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.35rem 0 0 0' }}>
              This due amount will apply to all {enrolledCount} enrolled members for {formatChitMonthWithNum(chit, monthNumber)}.
            </p>
          </div>

          {/* Due Date & Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Payment Due Date (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '12px',
                  border: '1.5px solid rgba(203, 213, 225, 0.9)',
                  fontSize: '0.86rem',
                  boxSizing: 'border-box',
                  background: 'rgba(255, 255, 255, 0.9)'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Notes / Instructions
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Post-auction dividend installment"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '12px',
                  border: '1.5px solid rgba(203, 213, 225, 0.9)',
                  fontSize: '0.86rem',
                  boxSizing: 'border-box',
                  background: 'rgba(255, 255, 255, 0.9)'
                }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.65rem 1.35rem',
                borderRadius: '12px',
                border: '1px solid rgba(203, 213, 225, 0.9)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.86rem',
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
                borderRadius: '12px',
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
                transition: 'all 0.15s ease'
              }}
            >
              {loading ? 'Saving...' : `Save Month ${monthNumber} Due`}
            </button>
          </div>
        </form>
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
