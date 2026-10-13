import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ScrollAnimationWrapper from '../components/ScrollAnimationWrapper';
import { CreditCard, CheckCircle, Hourglass, AlertCircle, Edit3, Upload, RefreshCw, Download, Eye } from 'lucide-react';
import { generatePaymentReceiptPDF } from '../utils/receiptGenerator';
import ReceiptModal from '../components/ReceiptModal';

const UserPayments = () => {
  const { user, token, API_URL, SERVER_URL } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewReceiptData, setViewReceiptData] = useState(null);

  // Edit form state per payment ID
  const [editFormId, setEditFormId] = useState(null);
  const [editData, setEditData] = useState({ transactionId: '', file: null });
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState({ text: '', type: '' });

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${API_URL}/payments/my-payments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPayments(data.data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [token, API_URL]);

  const getFullImgUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const base = SERVER_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'));
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const openEditForm = (payment) => {
    setEditFormId(payment.id);
    setEditData({ transactionId: payment.transactionId || '', file: null });
    setEditMessage({ text: '', type: '' });
  };

  const closeEditForm = () => {
    setEditFormId(null);
    setEditData({ transactionId: '', file: null });
    setEditMessage({ text: '', type: '' });
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 1000;
          let { width, height } = img;
          if (width > height) {
            if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; }
          } else {
            if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          }, 'image/jpeg', 0.8);
        };
      };
    });
  };

  const handleResubmit = async (payment) => {
    if (!editData.file) {
      setEditMessage({ text: 'Please upload a new payment screenshot.', type: 'danger' });
      return;
    }
    if (!editData.transactionId.trim()) {
      setEditMessage({ text: 'Please enter the transaction ID.', type: 'danger' });
      return;
    }

    setEditLoading(true);
    setEditMessage({ text: '', type: '' });

    try {
      const compressed = await compressImage(editData.file);
      const formData = new FormData();
      formData.append('chitId', payment.chitId);
      formData.append('monthNumber', payment.monthNumber);
      formData.append('amount', payment.amount);
      formData.append('transactionId', editData.transactionId.trim());
      formData.append('proof', compressed);

      const response = await fetch(`${API_URL}/payments/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setEditMessage({ text: 'Payment resubmitted! Admin will verify shortly.', type: 'success' });
        setEditFormId(null);
        setEditData({ transactionId: '', file: null });
        await fetchPayments();
      } else {
        setEditMessage({ text: data.message || 'Resubmission failed. Please try again.', type: 'danger' });
      }
    } catch (error) {
      console.error('Error resubmitting payment:', error);
      setEditMessage({ text: 'Connection error. Please try again.', type: 'danger' });
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading payment history...</div>;
  }

  const statusConfig = {
    approved: {
      badge: 'badge-approved',
      icon: <CheckCircle size={12} />,
      label: 'Paid'
    },
    pending: {
      badge: 'badge-pending',
      icon: <Hourglass size={12} />,
      label: 'Verifying'
    },
    rejected: {
      badge: 'badge-rejected',
      icon: <AlertCircle size={12} />,
      label: 'Rejected'
    },
    edit_requested: {
      badge: 'badge-edit',
      icon: <Edit3 size={12} />,
      label: 'Edit Required'
    }
  };

  return (
    <div className="user-page-container" style={{ padding: '0', width: '100%', boxSizing: 'border-box' }}>
      <ScrollAnimationWrapper>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            Payment <span style={{ color: 'var(--accent-yellow-dark)' }}>History</span>
          </h1>
          <p style={{ color: 'var(--color-secondary)', marginTop: '0.25rem' }}>
            A ledger of all monthly installments submitted by you on Chit Fund.
          </p>
        </div>
      </ScrollAnimationWrapper>

      {payments.length === 0 ? (
        <div className="card-premium" style={{ textAlign: 'center', padding: '3rem' }}>
          <CreditCard size={48} style={{ margin: '0 auto 1rem auto', color: 'var(--color-secondary)' }} />
          <h3 style={{ fontWeight: 700 }}>No Payments Logged</h3>
          <p style={{ color: 'var(--color-secondary)', marginTop: '0.25rem' }}>You have not submitted any monthly payment proofs yet.</p>
        </div>
      ) : (
        <ScrollAnimationWrapper>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {payments.map((payment) => {
              const cfg = statusConfig[payment.status] || statusConfig.pending;
              const isEditOpen = editFormId === payment.id;

              return (
                <div key={payment.id} className="glass-panel card-premium chit-card-responsive" style={{
                  border: payment.status === 'edit_requested'
                    ? '2px solid #f59e0b'
                    : '1px solid rgba(255,255,255,0.6)',
                  transition: 'border 0.2s ease'
                }}>
                  {/* Payment summary row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '1rem' }}>{payment.chit?.name || 'Deleted Chit'}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', marginTop: '0.2rem' }}>
                        Month {payment.monthNumber} &nbsp;·&nbsp; ₹{payment.amount.toLocaleString()} &nbsp;·&nbsp;
                        <code style={{ background: 'var(--bg-main)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.78rem' }}>
                          {payment.transactionId}
                        </code>
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', marginTop: '0.25rem' }}>
                        Submitted: {new Date(payment.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="user-payment-action-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <span className={`badge ${cfg.badge}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {cfg.icon}
                        <span>{cfg.label}</span>
                      </span>

                      <div className="user-payment-btn-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {payment.proofImgUrl && (
                          <a
                            href={getFullImgUrl(payment.proofImgUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--color-info, #3b82f6)', textDecoration: 'underline', fontSize: '0.8rem' }}
                          >
                            Proof Photo
                          </a>
                        )}
                        {payment.status === 'approved' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setViewReceiptData({
                                payment,
                                chit: payment.chit,
                                user,
                                extraData: { 
                                  paidMonths: payment.monthNumber,
                                  monthNumber: payment.monthNumber,
                                  auctions: payment.chit?.auctions,
                                  ticketId: payment.ticketId
                                }
                              });
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              border: '1.5px solid #2563eb',
                              borderRadius: '0.45rem',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.08)',
                              transition: 'all 0.2s ease',
                              whiteSpace: 'nowrap'
                            }}
                            title="View official receipt on screen"
                          >
                            <Eye size={13} />
                            View Receipt
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            generatePaymentReceiptPDF(payment, payment.chit, user, { 
                              paidMonths: payment.monthNumber,
                              monthNumber: payment.monthNumber,
                              auctions: payment.chit?.auctions,
                              ticketId: payment.ticketId
                            });
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '0.45rem',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                          }}
                          title="Download official PDF payment receipt"
                        >
                          <Download size={13} />
                          Download Receipt
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Admin remarks */}
                  {payment.remarks && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: payment.status === 'edit_requested'
                        ? 'rgba(245, 158, 11, 0.08)'
                        : payment.status === 'rejected'
                        ? 'rgba(239, 68, 68, 0.06)'
                        : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${payment.status === 'edit_requested' ? '#f59e0b' : payment.status === 'rejected' ? 'var(--color-danger)' : 'var(--border-subtle)'}`,
                      fontSize: '0.8rem',
                      color: payment.status === 'edit_requested' ? '#92400e' : 'inherit'
                    }}>
                      <strong>Admin note:</strong> {payment.remarks}
                    </div>
                  )}

                  {/* Edit & Resubmit CTA for edit_requested */}
                  {payment.status === 'edit_requested' && !isEditOpen && (
                    <button
                      onClick={() => openEditForm(payment)}
                      className="btn-primary"
                      style={{
                        marginTop: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        borderColor: '#d97706',
                        color: '#fff',
                        padding: '0.6rem 1.25rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      <Edit3 size={15} />
                      Edit &amp; Resubmit Payment
                    </button>
                  )}

                  {/* Inline edit form */}
                  {isEditOpen && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(245, 158, 11, 0.05)',
                      border: '1px dashed #f59e0b'
                    }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Edit3 size={15} style={{ color: '#d97706' }} />
                        Update Payment Details
                      </h4>

                      {editMessage.text && (
                        <div style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          marginBottom: '0.75rem',
                          fontSize: '0.82rem',
                          backgroundColor: editMessage.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                          border: `1px solid ${editMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
                          color: editMessage.type === 'success' ? '#065f46' : '#b91c1c'
                        }}>
                          {editMessage.text}
                        </div>
                      )}

                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                          Transaction ID / UPI Reference *
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Enter updated transaction ID"
                          value={editData.transactionId}
                          onChange={(e) => setEditData({ ...editData, transactionId: e.target.value })}
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                          Payment Screenshot *
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditData({ ...editData, file: e.target.files[0] })}
                          style={{ width: '100%', fontSize: '0.85rem' }}
                        />
                        {editData.file && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', marginTop: '0.25rem' }}>
                            ✓ Selected: {editData.file.name}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={closeEditForm}
                          className="btn-secondary"
                          disabled={editLoading}
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleResubmit(payment)}
                          className="btn-primary"
                          disabled={editLoading || !editData.file || !editData.transactionId.trim()}
                          style={{
                            padding: '0.5rem 1.25rem',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            background: 'var(--color-success)',
                            borderColor: '#059669'
                          }}
                        >
                          {editLoading ? (
                            <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
                          ) : (
                            <><Upload size={14} /> Resubmit</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollAnimationWrapper>
      )}

      {/* Official Receipt Modal */}
      {viewReceiptData && (
        <ReceiptModal
          isOpen={Boolean(viewReceiptData)}
          onClose={() => setViewReceiptData(null)}
          {...viewReceiptData}
        />
      )}

      <style>{`
        .badge-edit {
          background-color: rgba(245, 158, 11, 0.12);
          color: #92400e;
          border: 1px solid #f59e0b;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          .user-payment-action-col {
            align-items: flex-start !important;
            width: 100% !important;
            margin-top: 0.5rem !important;
          }
          .user-payment-btn-group {
            justify-content: flex-start !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default UserPayments;
