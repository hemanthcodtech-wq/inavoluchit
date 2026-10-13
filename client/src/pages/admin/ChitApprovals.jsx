import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import { 
  List, 
  Users, 
  Check, 
  X, 
  ChevronUp,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

const ChitApprovals = () => {
  const { token, API_URL } = useAuth();
  const [chits, setChits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedChitId, setExpandedChitId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchChits = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/chits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setChits(data.data);
      }
    } catch (error) {
      console.error('Error fetching chits for admin:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChits();
  }, [token, API_URL]);

  const handleMemberApproval = async (chitId, userId, status) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/chits/${chitId}/approve-member`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, status })
      });
      const data = await response.json();
      if (data.success) {
        await fetchChits();
      } else {
        alert(data.message || 'Verification update failed.');
      }
    } catch (error) {
      console.error('Error verifying member join:', error);
      alert('Connection error verifying member join.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateChit = async (chitId) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/chits/${chitId}/activate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        await fetchChits();
      } else {
        alert(data.message || 'Activation failed.');
      }
    } catch (error) {
      console.error('Error activating chit:', error);
      alert('Connection error starting the chit.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleExpandChit = (id) => {
    setExpandedChitId(expandedChitId === id ? null : id);
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-primary-green)' }}>Loading Chit approvals...</div>;
  }

  return (
    <div className="admin-page-container" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box' }}>
      <ScrollAnimationWrapper>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary-green)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Users size={22} color="var(--color-primary-green)" />
              <span>Manage Chit Approvals</span>
            </h2>

            <button
              onClick={fetchChits}
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

          {chits.length === 0 ? (
            <div className="card-premium" style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#fff' }}>
              <p style={{ color: 'var(--color-secondary)' }}>No chit groups created yet.</p>
            </div>
          ) : (
            chits.map((chit) => {
              const isExpanded = expandedChitId === chit.id;
              const pendingRequests = chit.members.filter((m) => m.status === 'pending');
              const approvedCount = chit.members.filter((m) => m.status === 'approved').length;

              return (
                <div key={chit.id} className="glass-panel card-premium" style={{ backgroundColor: '#fff', border: '1px solid rgba(10, 30, 59, 0.06)', borderRadius: 'var(--radius-lg)' }}>
                  <div 
                    onClick={() => toggleExpandChit(chit.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary-green)' }}>{chit.name}</h4>
                        {pendingRequests.length > 0 && (
                          <span className="badge badge-pending animate-pulse" style={{ fontSize: '0.65rem', animation: 'softPulse 2s infinite', backgroundColor: '#fef3c7', color: '#ca8a04' }}>
                            {pendingRequests.length} JOIN REQUESTS
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', marginTop: '0.25rem' }}>
                        Value: <strong>₹{chit.chitValue.toLocaleString()}</strong> | Members: <strong>{approvedCount >= chit.totalMembers ? 'Filled' : `${approvedCount}/${chit.totalMembers}`}</strong>
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {chit.status === 'active' ? (
                        <span className="badge badge-active" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>Active (Month {chit.currentMonth}/{chit.durationMonths})</span>
                      ) : chit.status === 'completed' ? (
                        <span className="badge badge-approved" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>Completed</span>
                      ) : (
                        <span className="badge badge-pending" style={{ backgroundColor: '#fef3c7', color: '#ca8a04' }}>Upcoming</span>
                      )}
                      {isExpanded ? <ChevronUp size={18} color="#6b7280" /> : <ChevronDown size={18} color="#6b7280" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                      {chit.status === 'upcoming' && approvedCount === chit.totalMembers && (
                        <div className="card-premium pulse-accent" style={{
                          backgroundColor: '#fefbeb',
                          border: '1.5px solid #ca8a04',
                          padding: '1rem',
                          marginBottom: '1.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderRadius: 'var(--radius-md)'
                        }}>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#713f12' }}>Chit ready to start!</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-secondary)' }}>All required members ({chit.totalMembers}) have been approved.</p>
                          </div>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleActivateChit(chit.id)}
                            className="btn-primary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius-full)' }}
                          >
                            Activate Chit
                          </button>
                        </div>
                      )}

                      <h5 style={{ fontWeight: 750, marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--color-primary-green)' }}>Enrollment Management</h5>

                      {chit.members.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', fontStyle: 'italic' }}>No user join requests received yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {chit.members.map((member) => (
                            <div key={member.user?.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#fafbfc', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                              <div>
                                <p style={{ fontWeight: 700, color: '#374151' }}>{member.user?.name || 'Unknown User'}</p>
                                <p style={{ color: 'var(--color-secondary)', fontSize: '0.75rem' }}>Phone: {member.user?.phone}</p>
                              </div>

                              <div>
                                {member.status === 'pending' ? (
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                      disabled={actionLoading}
                                      onClick={() => handleMemberApproval(chit.id, member.user.id, 'rejected')}
                                      className="btn-secondary"
                                      style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)', borderRadius: 'var(--radius-sm)' }}
                                    >
                                      <X size={14} />
                                    </button>
                                    <button
                                      disabled={actionLoading}
                                      onClick={() => handleMemberApproval(chit.id, member.user.id, 'approved')}
                                      className="btn-primary"
                                      style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'var(--color-success)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                                    >
                                      <Check size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <span className={`badge ${member.status === 'approved' ? 'badge-approved' : 'badge-rejected'}`} style={{ fontSize: '0.7rem', backgroundColor: member.status === 'approved' ? '#dbeafe' : '#fee2e2', color: member.status === 'approved' ? '#2563eb' : '#991b1b' }}>
                                    {member.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollAnimationWrapper>
    </div>
  );
};

export default ChitApprovals;
