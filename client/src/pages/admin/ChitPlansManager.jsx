import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Coins, 
  CheckCircle2, 
  Clock, 
  Users, 
  Calendar, 
  IndianRupee, 
  ExternalLink, 
  AlertCircle, 
  X, 
  Check, 
  Sparkles,
  HelpCircle,
  Eye,
  RefreshCw,
  Sliders
} from 'lucide-react';

const ChitPlansManager = () => {
  const { user, token, API_URL } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Notification Message
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [chitValue, setChitValue] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [durationMonths, setDurationMonths] = useState('25');
  const [totalMembers, setTotalMembers] = useState('25');
  const [status, setStatus] = useState('upcoming');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Confirm Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Auto calculate monthly contribution when chitValue or totalMembers change
  const handleValueChange = (val) => {
    setChitValue(val);
    const numVal = Number(val);
    const members = Number(totalMembers) || Number(durationMonths) || 20;
    if (numVal && members) {
      setMonthlyContribution(Math.round(numVal / members));
    }
  };

  const handleMembersChange = (mem) => {
    setTotalMembers(mem);
    const numVal = Number(chitValue);
    const members = Number(mem);
    if (numVal && members) {
      setMonthlyContribution(Math.round(numVal / members));
    }
  };

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => {
      setToast({ show: false, text: '', type: 'success' });
    }, 4000);
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/chits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPlans(data.data);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      showToast('Failed to load chit plans from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPlans();
    }
  }, [token]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedPlanId(null);
    setName('');
    setChitValue('250000');
    setTotalMembers('25');
    setDurationMonths('25');
    setMonthlyContribution('10000');
    setStatus('upcoming');
    setTermsAndConditions('');
    setFormError('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (plan) => {
    setIsEditing(true);
    setSelectedPlanId(plan.id);
    setName(plan.name || '');
    setChitValue(plan.chitValue || '');
    setTotalMembers(plan.totalMembers || '25');
    setDurationMonths(plan.durationMonths || '25');
    setMonthlyContribution(plan.monthlyContribution || '');
    setStatus(plan.status || 'upcoming');
    setTermsAndConditions(plan.termsAndConditions || '');
    setFormError('');
    setModalOpen(true);
  };

  // Submit Form (Create or Update)
  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Plan Name is required.');
      return;
    }
    if (!chitValue || Number(chitValue) <= 0) {
      setFormError('Please enter a valid Chit Value.');
      return;
    }
    if (!durationMonths || Number(durationMonths) <= 0) {
      setFormError('Duration in months is required.');
      return;
    }
    if (!totalMembers || Number(totalMembers) <= 0) {
      setFormError('Total Members count is required.');
      return;
    }

    setFormLoading(true);

    try {
      const payload = {
        name: name.trim(),
        chitValue: Number(chitValue),
        monthlyContribution: Number(monthlyContribution) || Math.round(Number(chitValue) / Number(totalMembers)),
        durationMonths: Number(durationMonths),
        totalMembers: Number(totalMembers),
        status: status || 'upcoming',
        termsAndConditions: termsAndConditions.trim()
      };

      let url = `${API_URL}/chits`;
      let method = 'POST';

      if (isEditing && selectedPlanId) {
        url = `${API_URL}/chits/${selectedPlanId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        showToast(isEditing ? 'Chit Plan updated successfully!' : 'New Chit Plan published successfully!');
        setModalOpen(false);
        await fetchPlans();
      } else {
        setFormError(data.message || 'Failed to save Chit Plan.');
      }
    } catch (err) {
      console.error('Error saving plan:', err);
      setFormError('Server error while saving Chit Plan. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Plan
  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/chits/${planToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Chit Plan "${planToDelete.name}" deleted successfully.`);
        setDeleteModalOpen(false);
        setPlanToDelete(null);
        await fetchPlans();
      } else {
        showToast(data.message || 'Failed to delete plan.', 'error');
      }
    } catch (err) {
      console.error('Error deleting plan:', err);
      showToast('Server error while deleting plan.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Seed default 4 plans if empty
  const handleSeedDefaults = async () => {
    try {
      setLoading(true);
      for (const p of DEFAULT_SEED_PLANS) {
        await fetch(`${API_URL}/chits`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(p)
        });
      }
      showToast('Default Chit Plans imported into database successfully!');
      await fetchPlans();
    } catch (err) {
      console.error('Error importing default plans:', err);
      showToast('Error importing default plans.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter plans
  const filteredPlans = plans.filter((p) => {
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.chitValue).includes(searchQuery) ||
      p.termsAndConditions?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = plans.reduce((acc, p) => acc + (Number(p.chitValue) || 0), 0);
  const activeCount = plans.filter(p => p.status === 'active' || p.status === 'upcoming').length;

  return (
    <div style={{ width: '100%', maxWidth: '1300px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 999999,
          backgroundColor: toast.type === 'error' ? '#ef4444' : '#2563eb',
          color: '#ffffff',
          padding: '0.85rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontWeight: 600,
          fontSize: '0.92rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Page Header */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <div style={{
                backgroundColor: '#dbeafe',
                color: '#2563eb',
                padding: '0.4rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Coins size={24} />
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#0f291e' }}>
                Chit Plans <span style={{ color: '#2563eb' }}>Management</span>
              </h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
              Edit and customize the public chit plans displayed on the website landing page and catalog.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.open('/#chit-plans', '_blank')}
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.88rem'
              }}
            >
              <ExternalLink size={16} />
              <span>Preview Live Site</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
              }}
            >
              <Plus size={18} />
              <span>Create Chit Plan</span>
            </button>
          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Summary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        <div className="card-premium" style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Published Plans</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb', margin: '0.35rem 0 0 0' }}>{plans.length}</h3>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Live on public landing page</span>
        </div>

        <div className="card-premium" style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Active / Enrolling</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ca8a04', margin: '0.35rem 0 0 0' }}>{activeCount}</h3>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Accepting member join requests</span>
        </div>

        <div className="card-premium" style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Portfolio Total Value</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb', margin: '0.35rem 0 0 0' }}>₹{totalValue.toLocaleString()}</h3>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cumulative chit pool sum</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.75rem',
        backgroundColor: '#ffffff',
        padding: '1rem 1.25rem',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '460px' }}>
          <Search size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search plans by name, value, or terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem 0.65rem 2.6rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="upcoming">Upcoming / Enrolling</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>

          <button
            onClick={fetchPlans}
            title="Refresh Plans"
            style={{
              padding: '0.6rem 0.8rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Plans List Display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b', background: '#ffffff', borderRadius: '16px' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem auto', color: '#2563eb' }} />
          <p style={{ fontWeight: 600 }}>Loading Chit Plans from server...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
        }}>
          <Coins size={48} style={{ color: '#ca8a04', margin: '0 auto 1rem auto', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
            No Chit Plans Found
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
            {searchQuery 
              ? `No schemes match "${searchQuery}". Try clearing search.` 
              : 'There are no chit plans currently saved in the database.'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleOpenCreate}
              className="btn-primary"
              style={{ padding: '0.7rem 1.4rem', borderRadius: '10px', fontWeight: 700 }}
            >
              + Create First Chit Plan
            </button>

            {plans.length === 0 && (
              <button
                onClick={handleSeedDefaults}
                className="btn-secondary"
                style={{ padding: '0.7rem 1.4rem', borderRadius: '10px', fontWeight: 700 }}
              >
                Import 4 Default Catalog Plans
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredPlans.map((plan) => {
            const approvedCount = plan.members?.filter(m => m.status === 'approved').length || 0;
            const isFull = approvedCount >= plan.totalMembers;

            return (
              <div
                key={plan.id}
                className="card-premium"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  padding: '1.5rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div>
                  {/* Top Bar with Status and Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <span style={{
                      backgroundColor: plan.status === 'active' ? '#dbeafe' : plan.status === 'completed' ? '#f1f5f9' : '#fef3c7',
                      color: plan.status === 'active' ? '#2563eb' : plan.status === 'completed' ? '#475569' : '#b45309',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {plan.status === 'upcoming' ? 'Enrolling' : plan.status}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleOpenEdit(plan)}
                        title="Edit Chit Plan"
                        style={{
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          padding: '0.45rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        onClick={() => { setPlanToDelete(plan); setDeleteModalOpen(true); }}
                        title="Delete Chit Plan"
                        style={{
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          padding: '0.45rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Plan Name */}
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 1rem 0' }}>
                    {plan.name}
                  </h3>

                  {/* Value Grid */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Chit Value</span>
                      <strong style={{ fontSize: '1.15rem', color: '#2563eb', fontWeight: 800 }}>
                        ₹{Number(plan.chitValue).toLocaleString()}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Monthly Sub.</span>
                      <strong style={{ fontSize: '1.15rem', color: '#ca8a04', fontWeight: 800 }}>
                        ₹{Number(plan.monthlyContribution || Math.round(plan.chitValue / plan.totalMembers)).toLocaleString()}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Duration</span>
                      <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 700 }}>
                        {plan.durationMonths} Months
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Member Slots</span>
                      <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 700 }}>
                        {approvedCount} / {plan.totalMembers} Slots
                      </span>
                    </div>
                  </div>

                  {/* Terms / Description */}
                  {plan.termsAndConditions && (
                    <p style={{
                      fontSize: '0.84rem',
                      color: '#64748b',
                      lineHeight: 1.5,
                      margin: '0 0 1rem 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {plan.termsAndConditions}
                    </p>
                  )}
                </div>

                {/* Footer Action */}
                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    ID: {plan.id.slice(0, 8)}...
                  </span>

                  <button
                    onClick={() => handleOpenEdit(plan)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <span>Edit Details</span>
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            position: 'relative'
          }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f291e' }}>
                  {isEditing ? 'Edit Chit Plan' : 'Create New Chit Plan'}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  {isEditing ? 'Update scheme parameters for the website and catalog' : 'Fill details to publish a new scheme for visitors to browse'}
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                color: '#b91c1c',
                fontSize: '0.88rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPlan}>
              
              {/* Plan Name */}
              <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem', display: 'block' }}>
                  Chit Plan Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. InaVolu Super Gold Chit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                />
              </div>

              {/* Value and Members Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem', display: 'block' }}>
                    Chit Value (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1000"
                    placeholder="e.g. 250000"
                    value={chitValue}
                    onChange={(e) => handleValueChange(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem', display: 'block' }}>
                    Total Member Slots *
                  </label>
                  <input
                    type="number"
                    required
                    min="2"
                    placeholder="e.g. 25"
                    value={totalMembers}
                    onChange={(e) => handleMembersChange(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              {/* Duration & Monthly Installment Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem', display: 'block' }}>
                    Duration (Months) *
                  </label>
                  <input
                    type="number"
                    required
                    min="2"
                    placeholder="e.g. 25"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem', display: 'block' }}>
                    Monthly Installment (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 10000"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Auto-calculated (can customize)</span>
                </div>
              </div>

              {/* Status */}
              <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem', display: 'block' }}>
                  Enrollment Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="upcoming">Upcoming (Enrolling - Open for Join Requests)</option>
                  <option value="active">Active (Ongoing Auction Cycle)</option>
                  <option value="completed">Completed (Archived)</option>
                </select>
              </div>

              {/* Terms and Description */}
              <div className="input-group" style={{ marginBottom: '1.75rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem', display: 'block' }}>
                  Plan Highlights & Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe target audience, dividend benefits, or special rules..."
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 600 }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-primary"
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 700 }}
                >
                  {formLoading ? 'Saving Plan...' : isEditing ? 'Save Changes' : 'Publish Chit Plan'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && planToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '440px',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto'
            }}>
              <Trash2 size={28} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#1e293b' }}>
              Delete Chit Plan?
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
              Are you sure you want to delete <strong>"{planToDelete.name}"</strong>? It will no longer be visible on the public website catalog.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setPlanToDelete(null); }}
                className="btn-secondary"
                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontWeight: 600 }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeletePlan}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChitPlansManager;
