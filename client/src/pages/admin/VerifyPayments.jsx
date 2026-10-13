import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import { CheckSquare, Hourglass, ShieldCheck, Check, X, Eye, AlertCircle, Edit3, RefreshCw } from 'lucide-react';

const VerifyPayments = () => {
  const { token, API_URL, SERVER_URL } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  // Rejection Remarks State
  const [remarks, setRemarks] = useState({});
  const [showRejectFormId, setShowRejectFormId] = useState(null);

  const [message, setMessage] = useState({ text: '', type: '' });
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const fetchPendingPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/payments/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPayments(data.data);
      }
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPayments();
  }, [token, API_URL]);

  const handleVerify = async (paymentId, status) => {
    setMessage({ text: '', type: '' });
    setActionLoadingId(paymentId);

    const paymentRemarks = remarks[paymentId] || '';

    try {
      const response = await fetch(`${API_URL}/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          remarks: paymentRemarks
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        setShowRejectFormId(null);
        // Clear remarks for this ID
        setRemarks(prev => {
          const updated = { ...prev };
          delete updated[paymentId];
          return updated;
        });
        await fetchPendingPayments();
      } else {
        setMessage({ text: data.message || 'Payment verification failed.', type: 'danger' });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setMessage({ text: 'Server error updating payment status.', type: 'danger' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemarksChange = (paymentId, value) => {
    setRemarks(prev => ({
      ...prev,
      [paymentId]: value
    }));
  };

  const handleAllowEdit = async (paymentId) => {
    setMessage({ text: '', type: '' });
    setActionLoadingId(paymentId);
    try {
      const response = await fetch(`${API_URL}/admin/payments/${paymentId}/allow-edit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ text: 'Edit access granted. User will see an edit option in their payment history.', type: 'success' });
        await fetchPendingPayments();
      } else {
        setMessage({ text: data.message || 'Failed to grant edit access.', type: 'danger' });
      }
    } catch (error) {
      console.error('Error granting edit access:', error);
      setMessage({ text: 'Server error granting edit access.', type: 'danger' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getFullImgUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const base = SERVER_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'));
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading pending payments...</div>;
  }

  return (
    <div className="admin-page-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      <ScrollAnimationWrapper>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
              Payment <span style={{ color: 'var(--accent-yellow-dark)' }}>Receipt Verification</span>
            </h1>
            <p style={{ color: 'var(--color-secondary)', marginTop: '0.25rem' }}>
              Inspect user-submitted payment screenshots and match transaction numbers to confirm monthly contributions.
            </p>
          </div>

          <button
            onClick={fetchPendingPayments}
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
      </ScrollAnimationWrapper>

      {message.text && (
        <div style={{
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `1px solid ${message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
          color: message.type === 'success' ? '#1e3a8a' : '#b91c1c'
        }}>
          {message.text}
        </div>
      )}

      {payments.length === 0 ? (
        <div className="card-premium" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <CheckSquare size={48} style={{ margin: '0 auto 1rem auto', color: 'var(--color-secondary)' }} />
          <h3 style={{ fontWeight: 700 }}>No Pending Payments</h3>
          <p style={{ color: 'var(--color-secondary)', marginTop: '0.25rem' }}>All user-submitted receipts have been processed.</p>
        </div>
      ) : (
        <div className="admin-chit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
          {payments.map((payment) => (
            <ScrollAnimationWrapper key={payment.id}>
              <div className="glass-panel card-premium" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
                border: '1px solid rgba(255, 255, 255, 0.6)'
              }}>
                <div>
                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{payment.chit?.name || 'Deleted Chit'}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-secondary)' }}>Installment: <strong>Month {payment.monthNumber}</strong></p>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>₹{payment.amount.toLocaleString()}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    <p>Submitted By: <strong>{payment.user?.name}</strong></p>
                    <p>Contact Phone: <strong>{payment.user?.phone}</strong></p>
                    <p>Transaction ID: <code style={{ fontSize: '0.8rem', background: 'var(--bg-main)', padding: '2px 4px', borderRadius: '4px' }}>{payment.transactionId}</code></p>
                  </div>

                  {/* Receipt Thumbnail */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>Receipt Screenshot</p>
                    <div 
                      onClick={() => setLightboxUrl(getFullImgUrl(payment.proofImgUrl))}
                      style={{
                        height: '130px',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        background: `url(${getFullImgUrl(payment.proofImgUrl)}) center/cover no-repeat`,
                        cursor: 'pointer',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      className="receipt-thumb"
                    >
                      <div className="thumb-overlay" style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.35)',
                        opacity: 0,
                        transition: 'var(--transition-fast)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-md)',
                        color: '#fff'
                      }}>
                        <Eye size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Rejection input inline */}
                  {showRejectFormId === payment.id && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-danger)' }}>Rejection Remarks</label>
                      <input
                        type="text"
                        placeholder="Enter reason e.g. Invalid txn ID"
                        value={remarks[payment.id] || ''}
                        onChange={(e) => handleRemarksChange(payment.id, e.target.value)}
                        className="input-field"
                        style={{ padding: '0.5rem' }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  {showRejectFormId === payment.id ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <button
                        onClick={() => setShowRejectFormId(null)}
                        className="btn-secondary"
                        style={{ padding: '0.5rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleVerify(payment.id, 'rejected')}
                        disabled={actionLoadingId === payment.id || !(remarks[payment.id] || '').trim()}
                        className="btn-primary"
                        style={{ background: 'var(--color-danger)', borderColor: '#dc2626', color: '#fff', padding: '0.5rem' }}
                      >
                        Confirm Reject
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                      <button
                        onClick={() => setShowRejectFormId(payment.id)}
                        disabled={actionLoadingId === payment.id}
                        className="btn-secondary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem',
                          borderColor: 'var(--color-danger)',
                          color: 'var(--color-danger)',
                          padding: '0.6rem',
                          fontSize: '0.8rem'
                        }}
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleAllowEdit(payment.id)}
                        disabled={actionLoadingId === payment.id}
                        className="btn-secondary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem',
                          borderColor: 'var(--color-info, #3b82f6)',
                          color: 'var(--color-info, #3b82f6)',
                          padding: '0.6rem',
                          fontSize: '0.8rem'
                        }}
                      >
                        <Edit3 size={14} />
                        <span>Allow Edit</span>
                      </button>

                      <button
                        onClick={() => handleVerify(payment.id, 'approved')}
                        disabled={actionLoadingId === payment.id}
                        className="btn-primary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem',
                          background: 'var(--color-success)',
                          borderColor: '#3b5bdb',
                          color: '#fff',
                          padding: '0.6rem',
                          fontSize: '0.8rem'
                        }}
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </ScrollAnimationWrapper>
          ))}
        </div>
      )}

      {/* Image Zoom Lightbox Modal */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 150,
            padding: '1rem',
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={lightboxUrl} 
            alt="Payment Receipt Screenshot" 
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)' }}
          />
        </div>
      )}

      <style>{`
        .receipt-thumb:hover .thumb-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default VerifyPayments;
