import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Calendar } from 'lucide-react';

const CreateSchemeModal = ({ isOpen, onClose, onSchemeCreated }) => {
  const { token, API_URL } = useAuth();

  // Form State starting empty for user entry
  const [name, setName] = useState('');
  const [chitValue, setChitValue] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalMembers, setTotalMembers] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [foremanCommission, setForemanCommission] = useState('5');
  const [auctionType, setAuctionType] = useState('Fixed'); // 'Fixed' or 'Written Bid'

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset form whenever modal opens so no auto-filled details show
  useEffect(() => {
    if (isOpen) {
      setName('');
      setChitValue('');
      setDurationMonths('');
      setStartDate('');
      setEndDate('');
      setTotalMembers('');
      setMonthlyContribution('');
      setForemanCommission('0');
      setAuctionType('Fixed');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  // Auto-calculate end date when start date and duration are provided
  useEffect(() => {
    if (startDate && durationMonths) {
      const parts = startDate.split('-');
      if (parts.length === 3) {
        const start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(start.getTime())) {
          const end = new Date(start);
          end.setMonth(end.getMonth() + Number(durationMonths));
          const yyyy = end.getFullYear();
          const mm = String(end.getMonth() + 1).padStart(2, '0');
          const dd = String(end.getDate()).padStart(2, '0');
          setEndDate(`${yyyy}-${mm}-${dd}`);
        }
      }
    }
  }, [startDate, durationMonths]);

  // Handle Chit Value change cleanly without auto-filling Scheme Name
  const handleChitValueChange = (val) => {
    setChitValue(val);
  };

  // Handle Duration change cleanly without auto-filling Number of Members
  const handleDurationChange = (dur) => {
    setDurationMonths(dur);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const terms = `Auction Type: ${auctionType} | Foreman Commission: ${foremanCommission}%`;
      const response = await fetch(`${API_URL}/chits`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          chitValue: Number(chitValue),
          durationMonths: Number(durationMonths),
          totalMembers: Number(totalMembers),
          monthlyContribution: Number(monthlyContribution),
          startDate: startDate ? new Date(startDate).toISOString() : null,
          endDate: endDate ? new Date(endDate).toISOString() : null,
          termsAndConditions: terms
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Scheme created successfully!');
        setName('');
        setChitValue('');
        setDurationMonths('');
        setTotalMembers('');
        setMonthlyContribution('');
        if (onSchemeCreated) {
          onSchemeCreated(data.data);
        }
        setTimeout(() => {
          onClose();
          setSuccess('');
        }, 800);
      } else {
        setError(data.message || 'Failed to create scheme. Please check required fields.');
      }
    } catch (err) {
      console.error('Error creating scheme:', err);
      setError('Server error creating scheme. Please verify connection.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '650px',
        backgroundColor: '#ffffff',
        borderRadius: '0.85rem',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'modalSlideUp 0.22s ease-out'
      }}>
        {/* Dark Navy Header matching screenshot */}
        <div style={{
          backgroundColor: '#0c1427',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#ffffff',
            margin: 0,
            letterSpacing: '-0.01em',
            fontFamily: 'inherit'
          }}>
            Create New Chit Scheme
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.375rem',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#dc2626',
              borderRadius: '0.5rem',
              fontSize: '0.88rem'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#2563eb',
              borderRadius: '0.5rem',
              fontSize: '0.88rem'
            }}>
              ✓ {success}
            </div>
          )}

          {/* Row 1: Scheme Name * */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.45rem' }}>
              Scheme Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="₹1,00,000 Chit Scheme"
              style={{
                width: '100%',
                padding: '0.65rem 0.9rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563eb';
                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Row 2: Total Chit Value (₹) * | Duration (Months) * */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.45rem' }}>
                Total Chit Value (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={chitValue}
                onChange={(e) => handleChitValueChange(e.target.value)}
                placeholder="100000"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.45rem' }}>
                Duration (Months) *
              </label>
              <input
                type="number"
                required
                value={durationMonths}
                onChange={(e) => handleDurationChange(e.target.value)}
                placeholder="20"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Row 3: Scheme Start Date * | Scheme End Date * */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.45rem' }}>
                Scheme Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.45rem' }}>
                Scheme End Date *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Row 4: Number of Members * | Monthly Contribution (₹) * */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.45rem' }}>
                Number of Members *
              </label>
              <input
                type="number"
                required
                value={totalMembers}
                onChange={(e) => setTotalMembers(e.target.value)}
                placeholder="20"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.45rem' }}>
                Monthly Contribution (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                placeholder="e.g. 8200"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                Enter fixed/agreed monthly installment manually (e.g. ₹8,200)
              </span>
            </div>
          </div>

          {/* Row 5: Auction Type * | Foreman Commission (%) */}
          <div style={{ display: 'grid', gridTemplateColumns: auctionType === 'Fixed' ? '1fr' : '1.4fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.45rem' }}>
                Auction Type *
              </label>
              <select
                value={auctionType}
                onChange={(e) => {
                  const val = e.target.value;
                  setAuctionType(val);
                  if (val === 'Fixed') {
                    setForemanCommission('0');
                  } else {
                    setForemanCommission('5');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '0.5rem',
                  border: '1.5px solid #2563eb',
                  backgroundColor: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="Fixed">🛡️ Fixed Amount Auction (Predefined Schedule)</option>
                <option value="Written Bid">🔨 Written Bid Auction (Reverse Bidding)</option>
              </select>
            </div>

            {auctionType !== 'Fixed' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.45rem' }}>
                  Foreman Commission (%)
                </label>
                <input
                  type="number"
                  value={foremanCommission}
                  onChange={(e) => setForemanCommission(e.target.value)}
                  placeholder="5"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Modal Action Buttons matching screenshot */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '0.75rem',
            paddingTop: '1rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.6rem 1.6rem',
                borderRadius: '9999px',
                border: '1px solid #0f172a',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.6rem 1.75rem',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1e40af')}
              onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1d4ed8')}
            >
              {loading ? 'Creating...' : 'Create Scheme'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default CreateSchemeModal;
