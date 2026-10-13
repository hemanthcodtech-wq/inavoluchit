import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ScrollAnimationWrapper from '../components/ScrollAnimationWrapper';
import { Search, Info, HelpCircle, UserPlus, Check, Hourglass, ArrowRight, Lock } from 'lucide-react';

const BrowseChits = () => {
  const { user, token, API_URL } = useAuth();
  const navigate = useNavigate();
  const [chits, setChits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchChits = async () => {
    try {
      if (token) {
        const response = await fetch(`${API_URL}/chits`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setChits(data.data);
          return;
        }
      }

      // Guest or public endpoint
      const pubRes = await fetch(`${API_URL}/chits/public`).catch(() => null);
      if (pubRes && pubRes.ok) {
        const pubData = await pubRes.json();
        if (pubData.success && Array.isArray(pubData.data)) {
          setChits(pubData.data);
          return;
        }
      }

      setChits([]);
    } catch (error) {
      console.error('Error fetching chits:', error);
      setChits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChits();
  }, [token, API_URL]);

  const handleJoinRequest = async (chitId) => {
    setMessage({ text: '', type: '' });
    setActionLoading(true);

    try {
      const response = await fetch(`${API_URL}/chits/${chitId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        // Refresh chit list
        await fetchChits();
      } else {
        setMessage({ text: data.message || 'Failed to submit request.', type: 'danger' });
      }
    } catch (error) {
      console.error('Error sending join request:', error);
      setMessage({ text: 'Server error. Please try again.', type: 'danger' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading available chit schemes...</div>;
  }

  // Filter chits by search query if typed, otherwise show all
  const filteredChits = searchQuery.trim() !== ''
    ? chits.filter(c => c.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : chits;

  return (
    <div className="user-page-container" style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', boxSizing: 'border-box' }}>
      <ScrollAnimationWrapper>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
              Browse <span style={{ color: 'var(--accent-yellow-dark)' }}>Chit Schemes</span>
            </h1>
            <p style={{ color: 'var(--color-secondary)', marginTop: '0.25rem' }}>
              Find the perfect saving and borrowing plan that matches your monthly goals.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '2rem', position: 'relative', maxWidth: '420px' }}>
          <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--color-secondary)' }}>
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search chit schemes by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.6rem', width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
          />
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
          color: message.type === 'success' ? '#065f46' : '#b91c1c'
        }}>
          {message.text}
        </div>
      )}

      {filteredChits.length === 0 ? (
        <div className="card-premium" style={{ textAlign: 'center', padding: '3rem' }}>
          <HelpCircle size={48} style={{ margin: '0 auto 1rem auto', color: 'var(--color-secondary)' }} />
          <h3 style={{ fontWeight: 700 }}>No Scheme Found</h3>
          <p style={{ color: 'var(--color-secondary)', marginTop: '0.25rem' }}>
            {searchQuery ? `Could not find a scheme matching "${searchQuery}".` : 'No schemes available at this moment. Please check back later.'}
          </p>
        </div>
      ) : (
        <div className="admin-chit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
          {filteredChits.map((chit) => {
            // Find all of the current user's memberships in this chit
            const userMemberships = chit.members?.filter(m => m.user?.id === user?.id) || [];
            const approvedTickets = userMemberships.filter(m => m.status === 'approved');
            const pendingTickets = userMemberships.filter(m => m.status === 'pending');
            const rejectedAll = userMemberships.length > 0 && userMemberships.every(m => m.status === 'rejected');
            const approvedCount = chit.members?.filter(m => m.status === 'approved').length || 0;
            const pendingCount = chit.members?.filter(m => m.status === 'pending').length || 0;
            const isFull = (approvedCount + pendingCount) >= chit.totalMembers;

            return (
              <ScrollAnimationWrapper key={chit.id}>
                <div className="glass-panel card-premium chit-card-responsive" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '100%',
                  border: '1px solid rgba(255, 255, 255, 0.6)'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{chit.name}</h3>
                      {chit.status === 'active' ? (
                        <span className="badge badge-active">Active</span>
                      ) : chit.status === 'completed' ? (
                        <span className="badge badge-approved">Completed</span>
                      ) : (
                        <span className="badge badge-pending">Enrolling</span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                      <div>
                        <p style={{ color: 'var(--color-secondary)' }}>Total Value</p>
                        <p style={{ fontWeight: 700, fontSize: '1.05rem' }}>₹{chit.chitValue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-secondary)' }}>Monthly contribution</p>
                        <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-yellow-dark)' }}>₹{chit.monthlyContribution.toLocaleString()}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-secondary)' }}>Duration</p>
                        <p style={{ fontWeight: 600 }}>{chit.durationMonths} Months</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-secondary)' }}>Filled Members</p>
                        <p style={{ fontWeight: 600 }}>
                          {approvedCount >= chit.totalMembers ? <span style={{ color: 'var(--color-primary)' }}>Filled ({chit.totalMembers}/{chit.totalMembers})</span> : `${approvedCount} / ${chit.totalMembers}`}
                        </p>
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                      <p style={{ color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>Managed By:</span>
                        <strong style={{ color: 'var(--color-primary-green)' }}>
                          {chit.creator ? `${chit.creator.name} (${chit.creator.role})` : 'Superadmin'}
                        </strong>
                      </p>
                    </div>

                    {chit.termsAndConditions && (
                      <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          <Info size={12} />
                          <span>Terms</span>
                        </div>
                        <p style={{ color: 'var(--color-secondary)' }}>{chit.termsAndConditions}</p>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {!user ? (
                      <button
                        onClick={() => navigate('/login', { 
                          state: { 
                            fromScheme: chit.name, 
                            notice: `Please sign in to view full scheme details, auction schedules, and enroll in ${chit.name}.` 
                          } 
                        })}
                        className="btn-primary"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
                      >
                        <span>Know More</span>
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <>
                        {/* Show enrolled tickets info */}
                        {approvedTickets.length > 0 && (
                          <div style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
                            backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', 
                            padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success)', 
                            fontWeight: 600, fontSize: '0.88rem' 
                          }}>
                            <Check size={16} />
                            <span>Enrolled — {approvedTickets.length} {approvedTickets.length === 1 ? 'Member Slot' : 'Member Slots'}</span>
                          </div>
                        )}

                        {/* Show pending status */}
                        {pendingTickets.length > 0 && (
                          <div style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
                            backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', 
                            padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-warning)', 
                            fontWeight: 600, fontSize: '0.85rem' 
                          }}>
                            <Hourglass size={16} />
                            <span>{pendingTickets.length} Request Pending Approval</span>
                          </div>
                        )}

                        {/* Request another member slot button — allow users to send join requests for non-completed schemes */}
                        {chit.status !== 'completed' && !isFull && pendingTickets.length === 0 ? (
                          <button
                            onClick={() => handleJoinRequest(chit.id)}
                            disabled={actionLoading}
                            className="btn-primary"
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                          >
                            <UserPlus size={16} />
                            <span>{approvedTickets.length > 0 ? 'Request Another Member Slot' : 'Send Join Request'}</span>
                          </button>
                        ) : chit.status !== 'completed' && isFull && approvedTickets.length === 0 && pendingTickets.length === 0 ? (
                          <button disabled style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#e5e7eb', color: '#9ca3af', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
                            <span>Scheme is Full</span>
                          </button>
                        ) : chit.status === 'completed' && approvedTickets.length === 0 && pendingTickets.length === 0 ? (
                          <button disabled style={{ width: '100%', display: 'center', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#e5e7eb', color: '#9ca3af', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
                            <span>Scheme Completed</span>
                          </button>
                        ) : rejectedAll ? (
                          <button disabled style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger)', fontWeight: 600 }}>
                            <span>Enrollment Rejected</span>
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </ScrollAnimationWrapper>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BrowseChits;
