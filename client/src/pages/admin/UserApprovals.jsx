import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import { UserCheck, ShieldAlert, FileText, Check, X, Eye, RefreshCw } from 'lucide-react';

const UserApprovals = () => {
  const { token, API_URL, SERVER_URL } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [memberIdsMap, setMemberIdsMap] = useState({});
  // Image Preview Lightbox State
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/users/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
        // Initialize member IDs map
        const initialMap = {};
        (data.data || []).forEach((u, index) => {
          initialMap[u.id] = u.memberId || `INA${101 + index}`;
        });
        setMemberIdsMap(initialMap);
      }
    } catch (error) {
      console.error('Error fetching pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, [token, API_URL]);

  const handleVerify = async (userId, action) => {
    setMessage({ text: '', type: '' });
    setActionLoadingId(userId);

    const customMemberId = memberIdsMap[userId] || '';

    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, memberId: customMemberId })
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        await fetchPendingUsers();
      } else {
        setMessage({ text: data.message || 'Verification update failed.', type: 'danger' });
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      setMessage({ text: 'Server error updating user status.', type: 'danger' });
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
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading pending approvals...</div>;
  }

  return (
    <div className="admin-page-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      <ScrollAnimationWrapper>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
              User <span style={{ color: 'var(--accent-yellow-dark)' }}>Registration Approvals</span>
            </h1>
            <p style={{ color: 'var(--color-secondary)', marginTop: '0.25rem' }}>
              Review new registrant credentials and proof files (Aadhar / PAN) before granting login permissions.
            </p>
          </div>

          <button
            onClick={fetchPendingUsers}
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

      {users.length === 0 ? (
        <div className="card-premium" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <UserCheck size={48} style={{ margin: '0 auto 1rem auto', color: 'var(--color-secondary)' }} />
          <h3 style={{ fontWeight: 700 }}>All Caught Up!</h3>
          <p style={{ color: 'var(--color-secondary)', marginTop: '0.25rem' }}>No pending user registrations waiting for review.</p>
        </div>
      ) : (
        <div className="admin-chit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
          {users.map((pendingUser) => (
            <ScrollAnimationWrapper key={pendingUser.id}>
              <div className="glass-panel card-premium" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
                border: '1px solid rgba(255, 255, 255, 0.6)'
              }}>
                <div>
                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{pendingUser.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)' }}>Registered: {new Date(pendingUser.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    <p>Email: <strong>{pendingUser.email}</strong></p>
                    <p>Phone: <strong>{pendingUser.phone}</strong></p>
                  </div>

                  {/* Document Thumbnails */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-secondary)', marginBottom: '0.25rem' }}>Aadhar Card</p>
                      <div 
                        onClick={() => setLightboxUrl(getFullImgUrl(pendingUser.aadharImgUrl))}
                        style={{
                          height: '90px',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          background: `url(${getFullImgUrl(pendingUser.aadharImgUrl)}) center/cover no-repeat`,
                          cursor: 'pointer',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        className="doc-thumb"
                      >
                        <div className="thumb-overlay" style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: 'rgba(0,0,0,0.3)',
                          opacity: 0,
                          transition: 'var(--transition-fast)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-md)',
                          color: '#fff'
                        }}>
                          <Eye size={18} />
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-secondary)', marginBottom: '0.25rem' }}>PAN Card</p>
                      <div 
                        onClick={() => setLightboxUrl(getFullImgUrl(pendingUser.panImgUrl))}
                        style={{
                          height: '90px',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          background: `url(${getFullImgUrl(pendingUser.panImgUrl)}) center/cover no-repeat`,
                          cursor: 'pointer',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        className="doc-thumb"
                      >
                        <div className="thumb-overlay" style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: 'rgba(0,0,0,0.3)',
                          opacity: 0,
                          transition: 'var(--transition-fast)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-md)',
                          color: '#fff'
                        }}>
                          <Eye size={18} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Member ID Input for Admin Customization */}
                <div style={{ marginBottom: '1rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Assign Member ID (Admin Choice):
                  </label>
                  <input
                    type="text"
                    value={memberIdsMap[pendingUser.id] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMemberIdsMap(prev => ({ ...prev, [pendingUser.id]: val }));
                    }}
                    placeholder="e.g. ANR289"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '0.375rem',
                      border: '1.5px solid #2563eb',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    You can edit or keep this Member ID. It will print on all receipts for this user.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <button
                    onClick={() => handleVerify(pendingUser.id, 'reject')}
                    disabled={actionLoadingId === pendingUser.id}
                    className="btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      borderColor: 'var(--color-danger)',
                      color: 'var(--color-danger)',
                      padding: '0.6rem'
                    }}
                  >
                    <X size={16} />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleVerify(pendingUser.id, 'approve')}
                    disabled={actionLoadingId === pendingUser.id}
                    className="btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      background: 'var(--color-success)',
                      borderColor: '#3b5bdb',
                      color: '#fff',
                      padding: '0.6rem'
                    }}
                  >
                    <Check size={16} />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            </ScrollAnimationWrapper>
          ))}
        </div>
      )}

      {/* Image Preview Lightbox Modal */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
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
            alt="Credential Document Preview" 
            style={{ maxWidth: '100%', maxHeight: '90%', objectFit: 'contain', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)' }}
          />
        </div>
      )}

      <style>{`
        .doc-thumb:hover .thumb-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default UserApprovals;
