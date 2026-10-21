import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import { 
  Plus, 
  List, 
  Users, 
  IndianRupee, 
  Calendar, 
  FileText, 
  Check, 
  X, 
  User, 
  ChevronRight,
  Gavel,
  ChevronDown,
  ChevronUp,
  Info,
  Star,
  ArrowLeft,
  Pencil,
  Trash2,
  Eye,
  Phone,
  Mail,
  Search,
  UserPlus,
  ExternalLink,
  ShieldCheck,
  Play,
  RefreshCw,
  LogOut,
  Sliders,
  CreditCard
} from 'lucide-react';
import SetMonthlyDueModal from '../../components/SetMonthlyDueModal';
import RecordChitPaymentModal from '../../components/RecordChitPaymentModal';
import ChitDuesLedgerModal from '../../components/ChitDuesLedgerModal';

const ChitManager = () => {
  const { token, API_URL, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };
  const [chits, setChits] = useState([]);
  const [selectedChitForDues, setSelectedChitForDues] = useState(null);
  const [selectedChitForSetDue, setSelectedChitForSetDue] = useState(null);
  const [selectedChitForRecordPayment, setSelectedChitForRecordPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // View Members Modal State
  const [viewingMembersChit, setViewingMembersChit] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [approvalLoadingId, setApprovalLoadingId] = useState(null);
  const [removeLoadingId, setRemoveLoadingId] = useState(null);

  // Add Member Manually State
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [targetChitForAdd, setTargetChitForAdd] = useState(null);
  const [allUsersList, setAllUsersList] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSlotCounts, setUserSlotCounts] = useState({});
  const [userSearchText, setUserSearchText] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingChit, setEditingChit] = useState(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'pending', 'completed'
  const [editTotalMembers, setEditTotalMembers] = useState('20');
  const [editMonthlyContribution, setEditMonthlyContribution] = useState('');
  const [editDurationMonths, setEditDurationMonths] = useState('20');
  const [editAuctionType, setEditAuctionType] = useState('Fixed');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState('');
  const [editError, setEditError] = useState('');

  const handleMemberApproval = async (chitId, userId, status) => {
    setApprovalLoadingId(userId);
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
        setViewingMembersChit(prev => {
          if (!prev || prev.id !== chitId) return prev;
          const updatedMembers = prev.members.map(m => {
            if (m.user?.id === userId) {
              return { ...m, status };
            }
            return m;
          });
          return { ...prev, members: updatedMembers };
        });
      } else {
        alert(data.message || 'Status update failed.');
      }
    } catch (error) {
      console.error('Error updating member status:', error);
      alert('Connection error updating member status.');
    } finally {
      setApprovalLoadingId(null);
    }
  };

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

  const fetchAllUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAllUsersList(data.data.map(item => item.user).filter(Boolean));
      }
    } catch (err) {
      console.error('Error fetching users for manual enrollment:', err);
    }
  };

  const openAddMemberModal = (chit) => {
    setTargetChitForAdd(chit);
    setSelectedUserIds([]);
    setUserSlotCounts({});
    setUserSearchText('');
    setAddMemberError('');
    setIsAddMemberModalOpen(true);
    if (allUsersList.length === 0) {
      fetchAllUsers();
    }
  };

  const toggleUserSelection = (userId, maxVacancies) => {
    setAddMemberError('');
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        setUserSlotCounts(counts => {
          const next = { ...counts };
          delete next[userId];
          return next;
        });
        return prev.filter(id => id !== userId);
      } else {
        const currentTotalSlots = prev.reduce((sum, id) => sum + (userSlotCounts[id] || 1), 0);
        if (currentTotalSlots >= maxVacancies) {
          setAddMemberError(`Cannot select more slots. Only ${maxVacancies} vacancies available.`);
          return prev;
        }
        setUserSlotCounts(counts => ({ ...counts, [userId]: 1 }));
        return [...prev, userId];
      }
    });
  };

  const updateUserSlotCount = (userId, delta, maxVacancies) => {
    setAddMemberError('');
    const current = userSlotCounts[userId] || 1;
    const nextCount = current + delta;
    if (nextCount < 1) return; // Minimum 1 slot

    const otherSlots = selectedUserIds
      .filter(id => id !== userId)
      .reduce((sum, id) => sum + (userSlotCounts[id] || 1), 0);

    if (otherSlots + nextCount > maxVacancies) {
      setAddMemberError(`Cannot allocate more than ${maxVacancies} slots in total (scheme limit).`);
      return;
    }

    setUserSlotCounts(prev => ({ ...prev, [userId]: nextCount }));
  };

  const handleSelectAll = (availableUserIds, maxVacancies) => {
    setAddMemberError('');
    const toSelect = availableUserIds.slice(0, maxVacancies);
    setSelectedUserIds(toSelect);
    const newCounts = {};
    toSelect.forEach(uid => { newCounts[uid] = 1; });
    setUserSlotCounts(newCounts);
    if (availableUserIds.length > maxVacancies) {
      setAddMemberError(`Selected ${maxVacancies} users (maximum remaining vacancies in this scheme).`);
    }
  };

  const handleDeselectAll = () => {
    setSelectedUserIds([]);
    setUserSlotCounts({});
    setAddMemberError('');
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0 || !targetChitForAdd) {
      setAddMemberError('Please select at least one user to enroll.');
      return;
    }

    const enrollments = selectedUserIds.map(uid => ({
      userId: uid,
      slots: Math.max(1, userSlotCounts[uid] || 1)
    }));

    setAddMemberLoading(true);
    setAddMemberError('');

    try {
      const response = await fetch(`${API_URL}/chits/${targetChitForAdd.id}/add-member`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enrollments })
      });
      const data = await response.json();

      if (data.success) {
        setFormSuccess(data.message || `Members enrolled into "${targetChitForAdd.name}" successfully!`);
        setTimeout(() => setFormSuccess(''), 4000);
        setIsAddMemberModalOpen(false);
        setSelectedUserIds([]);
        setUserSlotCounts({});
        await fetchChits();
        if (viewingMembersChit && viewingMembersChit.id === targetChitForAdd.id) {
          setViewingMembersChit(data.data);
        }
      } else {
        setAddMemberError(data.message || 'Failed to add users to chit scheme.');
      }
    } catch (err) {
      console.error('Error adding users to chit:', err);
      setAddMemberError('Connection error adding users.');
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleRemoveMember = async (chitId, userId, userName, memberId = null) => {
    if (!window.confirm(`Are you sure you want to remove "${userName || 'this slot'}" from this chit scheme?`)) {
      return;
    }

    setRemoveLoadingId(memberId || userId);
    try {
      const response = await fetch(`${API_URL}/chits/${chitId}/remove-member`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, memberId })
      });
      const data = await response.json();

      if (data.success) {
        setFormSuccess(`Member slot removed from scheme successfully.`);
        setTimeout(() => setFormSuccess(''), 4000);
        await fetchChits();
        if (viewingMembersChit && viewingMembersChit.id === chitId) {
          setViewingMembersChit(data.data);
        }
      } else {
        alert(data.message || 'Failed to remove member slot.');
      }
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Connection error removing member.');
    } finally {
      setRemoveLoadingId(null);
    }
  };

  const openEditModal = (chit) => {
    setEditingChit(chit);
    setEditName(chit.name);
    setEditStatus(chit.status === 'upcoming' ? 'pending' : (chit.status || 'active'));
    setEditTotalMembers(String(chit.totalMembers));
    setEditMonthlyContribution(String(chit.monthlyContribution));
    setEditDurationMonths(String(chit.durationMonths));
    const tc = chit.termsAndConditions || '';
    if (tc.toLowerCase().includes('written bid')) {
      setEditAuctionType('Written Bid');
    } else {
      setEditAuctionType('Fixed');
    }

    const formatForInput = (d) => {
      if (!d) return '';
      const date = new Date(d);
      if (isNaN(date.getTime())) return '';
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    setEditStartDate(formatForInput(chit.startDate));
    setEditEndDate(formatForInput(chit.endDate));
    setEditSuccess('');
    setEditError('');
    setEditModalOpen(true);
  };

  const handleEditStartDateChange = (val) => {
    setEditStartDate(val);
    if (val && editDurationMonths) {
      const parts = val.split('-');
      if (parts.length === 3) {
        const start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(start.getTime())) {
          const end = new Date(start);
          end.setMonth(end.getMonth() + Number(editDurationMonths));
          const yyyy = end.getFullYear();
          const mm = String(end.getMonth() + 1).padStart(2, '0');
          const dd = String(end.getDate()).padStart(2, '0');
          setEditEndDate(`${yyyy}-${mm}-${dd}`);
        }
      }
    }
  };

  const handleEditChit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setEditLoading(true);

    try {
      const currentTerms = editingChit?.termsAndConditions || '';
      let commissionStr = 'Foreman Commission: 5%';
      const commMatch = currentTerms.match(/Foreman Commission:\s*(\d+)%/i);
      if (commMatch && commMatch[0]) {
        commissionStr = commMatch[0];
      }
      const finalTerms = `Auction Type: ${editAuctionType} | ${commissionStr}`;

      const response = await fetch(`${API_URL}/chits/${editingChit.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editName,
          status: editStatus,
          totalMembers: Number(editTotalMembers),
          chitValue: editingChit.chitValue,
          monthlyContribution: Number(editMonthlyContribution),
          durationMonths: Number(editDurationMonths),
          startDate: editStartDate ? new Date(editStartDate).toISOString() : null,
          endDate: editEndDate ? new Date(editEndDate).toISOString() : null,
          termsAndConditions: finalTerms
        })
      });

      const data = await response.json();
      if (data.success) {
        setEditSuccess('Chit updated successfully!');
        await fetchChits();
        setTimeout(() => {
          setEditModalOpen(false);
          setEditingChit(null);
        }, 1200);
      } else {
        setEditError(data.message || 'Failed to update chit.');
      }
    } catch (error) {
      console.error('Error updating chit:', error);
      setEditError('Server error updating chit.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleQuickStatusChange = async (chitId, newStatus) => {
    setStatusUpdatingId(chitId);
    try {
      const response = await fetch(`${API_URL}/chits/${chitId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (data.success) {
        setFormSuccess(`Chit status changed to ${newStatus.toUpperCase()} successfully.`);
        setTimeout(() => setFormSuccess(''), 3500);
        await fetchChits();
      } else {
        setFormError(data.message || 'Failed to update chit status.');
        setTimeout(() => setFormError(''), 4000);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setFormError('Connection error updating chit status.');
      setTimeout(() => setFormError(''), 4000);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDeleteChit = async (chit) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete "${chit.name}"?\n\nThis will remove the chit scheme and all associated auction and member records.`
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_URL}/chits/${chit.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setFormSuccess(`Chit scheme "${chit.name}" deleted successfully.`);
        await fetchChits();
      } else {
        alert(data.message || 'Failed to delete chit scheme.');
      }
    } catch (err) {
      console.error('Error deleting chit:', err);
      alert('Server error deleting chit scheme.');
    }
  };



  const handleActivateChit = async (chit) => {
    const confirmAct = window.confirm(
      `Are you sure you want to start and activate "${chit.name}"?`
    );
    if (!confirmAct) return;

    try {
      const response = await fetch(`${API_URL}/chits/${chit.id}/activate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setFormSuccess(data.message || `Chit "${chit.name}" is now Active!`);
        await fetchChits();
      } else {
        setFormError(data.message || 'Failed to activate chit scheme.');
      }
    } catch (err) {
      console.error('Error activating chit:', err);
      setFormError('Server error activating chit scheme.');
    }
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-primary-green)' }}>Loading Chit schemes management...</div>;
  }

  return (
    <div className="admin-page-container" style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Success Notification Banner */}
      {formSuccess && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          backgroundColor: '#eff6ff',
          border: '1px solid #a5b4fc',
          color: '#2563eb',
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Check size={18} color="#2563eb" />
            <span>{formSuccess}</span>
          </div>
          <button 
            type="button"
            onClick={() => setFormSuccess('')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {formError && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          color: '#dc2626',
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Info size={18} color="#dc2626" />
            <span>{formError}</span>
          </div>
          <button 
            type="button"
            onClick={() => setFormError('')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Active Chit Groups Main Section */}
      <ScrollAnimationWrapper>
        <div className="chit-manager-main-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header Bar */}
          <div className="chit-manager-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid #e5e7eb',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ flex: '1 1 auto', minWidth: '0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <List size={22} color="var(--color-primary-green)" />
                </div>
                <div style={{ flex: '1 1 auto', minWidth: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-primary-green)', margin: 0 }}>
                      Active Chit Groups
                    </h2>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      backgroundColor: '#dbeafe',
                      color: '#2563eb',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '9999px',
                      whiteSpace: 'nowrap'
                    }}>
                      {chits.length} {chits.length === 1 ? 'Scheme' : 'Schemes'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
                    View all chit schemes, manage enrollments, edit details, or create new schemes.
                  </p>
                </div>
              </div>
            </div>

            <div className="chit-manager-actions" style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={fetchChits}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1.1rem',
                  borderRadius: '9999px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <RefreshCw size={16} className={loading ? "spin" : ""} color="#475569" />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1.1rem',
                  borderRadius: '9999px',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  backgroundColor: '#ffffff',
                  color: '#dc2626',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(220, 38, 38, 0.08)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.color = '#dc2626';
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Status Quick Filter Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: statusFilter === 'all' ? '#2563eb' : '#f3f4f6',
                  color: statusFilter === 'all' ? '#ffffff' : '#4b5563',
                  transition: 'all 0.15s'
                }}
              >
                All ({chits.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: statusFilter === 'active' ? '#2563eb' : '#f3f4f6',
                  color: statusFilter === 'active' ? '#ffffff' : '#4b5563',
                  transition: 'all 0.15s'
                }}
              >
                Active ({chits.filter(c => c.status === 'active').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: statusFilter === 'pending' ? '#d97706' : '#f3f4f6',
                  color: statusFilter === 'pending' ? '#ffffff' : '#4b5563',
                  transition: 'all 0.15s'
                }}
              >
                Pending ({chits.filter(c => c.status !== 'active' && c.status !== 'completed').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: statusFilter === 'completed' ? '#2563eb' : '#f3f4f6',
                  color: statusFilter === 'completed' ? '#ffffff' : '#4b5563',
                  transition: 'all 0.15s'
                }}
              >
                Completed ({chits.filter(c => c.status === 'completed').length})
              </button>
            </div>
          </div>

          {/* Chit Schemes List */}
          {chits.filter(c => {
            if (statusFilter === 'active') return c.status === 'active';
            if (statusFilter === 'pending') return c.status !== 'active' && c.status !== 'completed';
            if (statusFilter === 'completed') return c.status === 'completed';
            return true;
          }).length === 0 ? (
            <div className="card-premium" style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#fff', borderRadius: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                <List size={32} color="#2563eb" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1f2937', marginBottom: '0.5rem' }}>No Chit Groups Found</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
                No chit schemes found matching the selected filter.
              </p>
            </div>
          ) : (
            <div className="admin-chit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {chits.filter(c => {
                if (statusFilter === 'active') return c.status === 'active';
                if (statusFilter === 'pending') return c.status !== 'active' && c.status !== 'completed';
                if (statusFilter === 'completed') return c.status === 'completed';
                return true;
              }).map((chit) => {
                const approvedCount = Array.isArray(chit.members) 
                  ? chit.members.filter((m) => m.status === 'approved').length 
                  : 0;
                const totalMemb = chit.totalMembers || 20;
                const percent = Math.min(100, Math.round((approvedCount / totalMemb) * 100));

                return (
                  <div 
                    key={chit.id} 
                    className="glass-panel card-premium chit-card-responsive" 
                    style={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid rgba(10, 30, 59, 0.1)', 
                      borderRadius: '16px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div>
                      {/* Top Row: Title + Status Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 auto', minWidth: '0' }}>
                          <h4 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-primary-green)', margin: 0, wordBreak: 'break-word' }}>
                            {chit.name}
                          </h4>
                          <span style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem', display: 'block' }}>
                            {chit.termsAndConditions || 'Standard Scheme'}
                          </span>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <select
                            value={chit.status === 'upcoming' ? 'pending' : (chit.status || 'active')}
                            onChange={(e) => handleQuickStatusChange(chit.id, e.target.value)}
                            disabled={statusUpdatingId === chit.id}
                            title="Click to change scheme status"
                            style={{
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              padding: '0.3rem 0.75rem',
                              borderRadius: '9999px',
                              border: chit.status === 'active' 
                                ? '1.5px solid #a5b4fc' 
                                : chit.status === 'completed' 
                                ? '1.5px solid #93c5fd' 
                                : '1.5px solid #fde68a',
                              backgroundColor: chit.status === 'active' 
                                ? '#eef2ff' 
                                : chit.status === 'completed' 
                                ? '#eff6ff' 
                                : '#fefce8',
                              color: chit.status === 'active' 
                                ? '#2563eb' 
                                : chit.status === 'completed' 
                                ? '#1d4ed8' 
                                : '#b45309',
                              cursor: statusUpdatingId === chit.id ? 'wait' : 'pointer',
                              outline: 'none',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <option value="active">Active {chit.status === 'active' ? `(${chit.currentMonth || 1}/${chit.durationMonths})` : ''}</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>

                      {/* Key details grid */}
                      <div className="chit-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', margin: '1rem 0' }}>
                        <div style={{ backgroundColor: '#f9fafb', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
                          <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chit Value</span>
                          <strong style={{ fontSize: '1.05rem', color: '#111827' }}>₹{Number(chit.chitValue || 0).toLocaleString()}</strong>
                        </div>
                        <div style={{ backgroundColor: '#f9fafb', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
                          <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly</span>
                          <strong style={{ fontSize: '1.05rem', color: '#111827' }}>₹{Number(chit.monthlyContribution || 0).toLocaleString()}</strong>
                        </div>
                        <div style={{ backgroundColor: '#f9fafb', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
                          <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duration</span>
                          <strong style={{ fontSize: '0.95rem', color: '#111827' }}>{chit.durationMonths} Months</strong>
                        </div>
                        <div style={{ backgroundColor: '#f9fafb', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
                          <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Members</span>
                          <strong style={{ fontSize: '0.95rem', color: approvedCount >= totalMemb ? '#2563eb' : '#111827' }}>
                            {approvedCount}/{totalMemb}
                          </strong>
                        </div>
                      </div>

                      {/* Enrollment progress bar */}
                      <div style={{ margin: '0.75rem 0 1.25rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.35rem' }}>
                          <span>Enrollment Progress</span>
                          <span style={{ fontWeight: 700, color: '#374151' }}>{approvedCount} of {totalMemb} ({percent}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '7px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${percent}%`,
                            height: '100%',
                            backgroundColor: percent === 100 ? '#2563eb' : 'var(--color-primary-green)',
                            borderRadius: '9999px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="chit-card-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid #f3f4f6', paddingTop: '0.85rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedChitForDues(chit)}
                        title="Manage Monthly Dues & User Payments"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(22, 163, 74, 0.35)',
                          backgroundColor: '#f0fdf4',
                          color: '#15803d',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 3px rgba(22, 163, 74, 0.1)'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dcfce7'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                      >
                        <CreditCard size={14} />
                        <span>Payments & Dues</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedChitForSetDue(chit)}
                        title="Set Monthly Installment Payable by Members"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef3c7'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fffbeb'; }}
                      >
                        <Sliders size={14} />
                        <span>Set Due</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openAddMemberModal(chit)}
                        title="Manually Add User to Chit Scheme"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(37, 99, 235, 0.25)',
                          backgroundColor: '#eef2ff',
                          color: '#1e3a8a',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#d1fae5'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#eef2ff'; }}
                      >
                        <UserPlus size={14} />
                        <span>Add User</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setViewingMembersChit(chit);
                          setMemberSearch('');
                        }}
                        title="View Group Members"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(29, 78, 216, 0.25)',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>

                      {chit.status === 'upcoming' && (
                        <button
                          type="button"
                          onClick={() => handleActivateChit(chit)}
                          title="Start Scheme / Mark Active"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(22, 163, 74, 0.3)',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
                        >
                          <Play size={13} fill="#ffffff" />
                          <span>Start Chit</span>
                        </button>
                      )}

                      {chit.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => openEditModal(chit)}
                          title="Edit Chit Scheme"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(10, 30, 59, 0.2)',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                        >
                          <Pencil size={14} />
                          <span>Edit</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteChit(chit)}
                        title="Delete Chit Scheme"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollAnimationWrapper>

      {/* Edit Chit Modal */}
      {editModalOpen && editingChit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease'
        }}
          onClick={(e) => { if (e.target === e.currentTarget) { setEditModalOpen(false); setEditingChit(null); } }}
        >
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 'var(--radius-lg, 16px)',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.3s ease'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f3f4f6',
              background: 'linear-gradient(135deg, #eff6ff 0%, #e2efe8 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={16} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb', margin: 0 }}>Edit Chit</h3>
                  <p style={{ fontSize: '0.72rem', color: '#4b5563', margin: 0 }}>Update chit details before it starts</p>
                </div>
              </div>
              <button
                onClick={() => { setEditModalOpen(false); setEditingChit(null); }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#6b7280',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#6b7280'; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              {editSuccess && (
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md, 8px)', background: '#dbeafe', border: '1px solid #3b82f6', color: '#2563eb', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={16} />
                  {editSuccess}
                </div>
              )}

              {editError && (
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md, 8px)', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid #ef4444', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {editError}
                </div>
              )}

              <form onSubmit={handleEditChit}>
                {/* Chit Name */}
                <div className="input-group">
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>Chit Name</span>
                  <div style={{ position: 'relative' }}>
                    <Users size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      required
                      placeholder="Enter chit name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input-field"
                      style={{ paddingLeft: '2.75rem', height: '44px', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* Chit Status Field */}
                <div className="input-group">
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>Chit Status</span>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="input-field"
                      style={{ height: '44px', fontSize: '0.9rem', fontWeight: 600, width: '100%', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #d1d5db' }}
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Number of Members */}
                <div className="input-group">
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>Number of Members</span>
                  <div style={{ position: 'relative' }}>
                    <Users size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 20"
                      value={editTotalMembers}
                      onChange={(e) => setEditTotalMembers(e.target.value)}
                      className="input-field"
                      style={{ paddingLeft: '2.75rem', height: '44px', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* Monthly Value */}
                <div className="input-group">
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>Monthly Contribution (₹)</span>
                  <div style={{ position: 'relative' }}>
                    <IndianRupee size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="e.g. 8200"
                      value={editMonthlyContribution}
                      onChange={(e) => setEditMonthlyContribution(e.target.value)}
                      className="input-field"
                      style={{ paddingLeft: '2.75rem', height: '44px', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* Duration */}
                <div className="input-group">
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>Chit Duration (Months)</span>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 16"
                      value={editDurationMonths}
                      onChange={(e) => {
                        setEditDurationMonths(e.target.value);
                        if (editStartDate && e.target.value) {
                          const parts = editStartDate.split('-');
                          if (parts.length === 3) {
                            const start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                            if (!isNaN(start.getTime())) {
                              const end = new Date(start);
                              end.setMonth(end.getMonth() + Number(e.target.value));
                              const yyyy = end.getFullYear();
                              const mm = String(end.getMonth() + 1).padStart(2, '0');
                              const dd = String(end.getDate()).padStart(2, '0');
                              setEditEndDate(`${yyyy}-${mm}-${dd}`);
                            }
                          }
                        }
                      }}
                      className="input-field"
                      style={{ paddingLeft: '2.75rem', height: '44px', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* Scheme Dates Row: Start Date & End Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="input-group">
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>Scheme Start Date</span>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => handleEditStartDateChange(e.target.value)}
                      className="input-field"
                      style={{ height: '44px', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div className="input-group">
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>Scheme End Date</span>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="input-field"
                      style={{ height: '44px', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                {/* Auction Type (Read-only / Un-editable after creation) */}
                <div className="input-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>Auction Type</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>🔒 Locked (Cannot be modified)</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Gavel size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      disabled
                      value={editAuctionType === 'Fixed' ? '🛡️ Fixed Amount Auction (Predefined Schedule)' : '🔨 Written Bid Auction (Reverse Bidding)'}
                      className="input-field"
                      style={{
                        paddingLeft: '2.75rem',
                        height: '44px',
                        fontSize: '0.88rem',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        fontWeight: 600,
                        cursor: 'not-allowed',
                        border: '1px solid #cbd5e1'
                      }}
                    />
                  </div>
                </div>

                {/* Edit Preview */}
                <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary-green)', display: 'block', marginBottom: '0.6rem' }}>Updated Preview</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    <div style={{ border: '1px solid #e5e7eb', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ padding: '0.35rem', borderRadius: '50%', backgroundColor: '#dbeafe', color: '#2563eb' }}>
                        <Users size={14} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.6rem', color: '#9ca3af', display: 'block' }}>Members</span>
                        <strong style={{ fontSize: '0.8rem' }}>{editTotalMembers || 0}/{editTotalMembers || 0}</strong>
                      </div>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ padding: '0.35rem', borderRadius: '50%', backgroundColor: '#dbeafe', color: '#2563eb' }}>
                        <IndianRupee size={13} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.6rem', color: '#9ca3af', display: 'block' }}>Monthly</span>
                        <strong style={{ fontSize: '0.8rem' }}>₹{(Number(editMonthlyContribution) || 0).toLocaleString()}</strong>
                      </div>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ padding: '0.35rem', borderRadius: '50%', backgroundColor: '#dbeafe', color: '#2563eb' }}>
                        <Calendar size={14} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.6rem', color: '#9ca3af', display: 'block' }}>Duration</span>
                        <strong style={{ fontSize: '0.8rem' }}>{editDurationMonths || 0} Months</strong>
                      </div>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ padding: '0.35rem', borderRadius: '50%', backgroundColor: '#fefbeb', color: '#ca8a04' }}>
                        <Star size={14} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.6rem', color: '#9ca3af', display: 'block' }}>Total Collection</span>
                        <strong style={{ fontSize: '0.8rem', color: '#ca8a04' }}>₹{((Number(editMonthlyContribution) || 0) * (Number(editDurationMonths) || 0)).toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => { setEditModalOpen(false); setEditingChit(null); }}
                    className="btn-secondary"
                    style={{
                      flex: 1,
                      height: '44px',
                      borderRadius: 'var(--radius-full, 50px)',
                      fontWeight: 700,
                      fontSize: '0.9rem'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="btn-primary"
                    style={{
                      flex: 2,
                      height: '44px',
                      borderRadius: 'var(--radius-full, 50px)',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      boxShadow: '0 4px 12px rgba(10, 30, 59, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    {editLoading ? 'Saving...' : (<><Check size={16} /> Save Changes</>)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Chit Monthly Dues & Payments Ledger Modal */}
      {selectedChitForDues && (
        <ChitDuesLedgerModal
          isOpen={Boolean(selectedChitForDues)}
          onClose={() => setSelectedChitForDues(null)}
          chitId={selectedChitForDues.id || selectedChitForDues._id}
          onChitUpdated={() => fetchChits()}
        />
      )}

      {/* Set Monthly Due Modal */}
      {selectedChitForSetDue && (
        <SetMonthlyDueModal
          isOpen={Boolean(selectedChitForSetDue)}
          onClose={() => setSelectedChitForSetDue(null)}
          chit={selectedChitForSetDue}
          onDueUpdated={() => fetchChits()}
        />
      )}

      {/* Record Member Payment Modal */}
      {selectedChitForRecordPayment && (
        <RecordChitPaymentModal
          isOpen={Boolean(selectedChitForRecordPayment)}
          onClose={() => setSelectedChitForRecordPayment(null)}
          chit={selectedChitForRecordPayment}
          onPaymentRecorded={() => fetchChits()}
        />
      )}

      {/* View Members Details Modal */}
      {viewingMembersChit && (() => {
        const allMembers = Array.isArray(viewingMembersChit.members) ? viewingMembersChit.members : [];
        const approvedCount = allMembers.filter(m => m.status === 'approved').length;
        const pendingCount = allMembers.filter(m => m.status === 'pending').length;
        const totalCapacity = viewingMembersChit.totalMembers || 20;

        const parseTicketNum = (ticketId, fallback = 999999) => {
          if (!ticketId) return fallback;
          const match = String(ticketId).match(/\d+/);
          return match ? parseInt(match[0], 10) : fallback;
        };

        const sortedMembers = [...allMembers].sort((a, b) => {
          const numA = parseTicketNum(a.ticketId, a.slotNumber || 999999);
          const numB = parseTicketNum(b.ticketId, b.slotNumber || 999999);
          return numA - numB;
        });

        const filteredMembers = memberSearch.trim() === ''
          ? sortedMembers
          : sortedMembers.filter(m => {
              const query = memberSearch.toLowerCase();
              const name = (m.user?.name || '').toLowerCase();
              const email = (m.user?.email || '').toLowerCase();
              const phone = (m.user?.phone || '').toLowerCase();
              const ticket = (m.ticketId || '').toLowerCase();
              return name.includes(query) || email.includes(query) || phone.includes(query) || ticket.includes(query);
            });

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            animation: 'fadeIn 0.2s ease'
          }}
            onClick={(e) => { if (e.target === e.currentTarget) setViewingMembersChit(null); }}
          >
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              animation: 'slideUp 0.3s ease'
            }}>
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e5e7eb',
                background: 'linear-gradient(135deg, #eff6ff 0%, #e2efe8 100%)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={22} color="#fff" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb', margin: 0 }}>
                        {viewingMembersChit.name}
                      </h3>
                      <span className={`badge ${viewingMembersChit.status === 'active' ? 'badge-active' : viewingMembersChit.status === 'completed' ? 'badge-approved' : 'badge-pending'}`} style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
                        {viewingMembersChit.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: '0.2rem 0 0 0' }}>
                      Value: ₹{Number(viewingMembersChit.chitValue || 0).toLocaleString()} | Monthly: ₹{Number(viewingMembersChit.monthlyContribution || 0).toLocaleString()} | Duration: {viewingMembersChit.durationMonths} Months
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingMembersChit(null)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#6b7280',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#6b7280'; }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Stats Summary Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.75rem',
                padding: '1rem 1.5rem',
                backgroundColor: '#f9fafb',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Total Slots</span>
                  <strong style={{ fontSize: '1.1rem', color: '#111827' }}>{totalCapacity}</strong>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '0.65rem', color: '#2563eb', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Approved</span>
                  <strong style={{ fontSize: '1.1rem', color: '#2563eb' }}>{approvedCount}</strong>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '0.65rem', color: '#b45309', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Pending</span>
                  <strong style={{ fontSize: '1.1rem', color: '#d97706' }}>{pendingCount}</strong>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '0.65rem', color: '#4b5563', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Vacancies</span>
                  <strong style={{ fontSize: '1.1rem', color: '#4b5563' }}>{Math.max(0, totalCapacity - approvedCount)}</strong>
                </div>
              </div>

              {/* Search Bar & Add Member Action */}
              <div style={{ padding: '0.85rem 1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Search enrolled members by name, phone, or email..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem 0.55rem 2.25rem',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => openAddMemberModal(viewingMembersChit)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.55rem 1.1rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
                >
                  <UserPlus size={15} />
                  <span>+ Add Member</span>
                </button>
              </div>

              {/* Members List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {filteredMembers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
                    <Users size={36} color="#9ca3af" style={{ margin: '0 auto 0.75rem auto' }} />
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                      {allMembers.length === 0 ? 'No members have joined this chit group yet.' : `No members match "${memberSearch}".`}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                      {allMembers.length === 0 ? 'You can manually add members using the "+ Add Member" button above.' : 'Try searching with a different name or phone number.'}
                    </p>
                  </div>
                ) : (
                  filteredMembers.map((member, index) => {
                    const initials = (member.user?.name || 'User')
                      .split(' ')
                      .map(w => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <div
                        key={member.id || member.user?.id || index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          borderRadius: '10px',
                          border: '1px solid #e5e7eb',
                          backgroundColor: member.status === 'pending' ? '#fffbeb' : '#ffffff',
                          gap: '1rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Left: Slot + Avatar + Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', minWidth: '28px', textAlign: 'center' }}>
                            {parseTicketNum(member.ticketId, index + 1)}
                          </span>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: member.status === 'approved' ? '#dbeafe' : member.status === 'pending' ? '#fef3c7' : '#fee2e2',
                            color: member.status === 'approved' ? '#2563eb' : member.status === 'pending' ? '#92400e' : '#991b1b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div
                              onClick={() => {
                                if (member.user?.id) {
                                  navigate(`/admin/records/user/${member.user.id}`);
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                              title="Click to view member payment records"
                            >
                              <strong style={{ fontSize: '0.9rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                                  {member.user?.name || 'Unnamed User'}
                                </span>
                                <span style={{ fontSize: '0.72rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                                  {(member.ticketId || `MEMBER-${member.slotNumber || 1}`).replace(/^TICKET-/, 'MEMBER-')}
                                </span>
                                {(() => {
                                  const chitFreeze = (viewingMembersChit.freezes || []).find(f => 
                                    f.memberId === member.id || (member.ticketId && f.ticketId === member.ticketId)
                                  );
                                  if (chitFreeze) {
                                    return (
                                      <span style={{ fontSize: '0.68rem', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                                        Option: Month {chitFreeze.monthNumber}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                                <ExternalLink size={12} color="#2563eb" />
                              </strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                              {member.user?.phone && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Phone size={12} color="#9ca3af" />
                                  <span>{member.user.phone}</span>
                                </span>
                              )}
                              {member.user?.email && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Mail size={12} color="#9ca3af" />
                                  <span>{member.user.email}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Status badge & Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {member.status === 'pending' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#fef3c7', color: '#92400e', padding: '0.25rem 0.55rem', borderRadius: '6px' }}>
                                Pending
                              </span>
                              <button
                                type="button"
                                disabled={approvalLoadingId === member.user?.id}
                                onClick={() => handleMemberApproval(viewingMembersChit.id, member.user.id, 'approved')}
                                title="Approve Member"
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: '#2563eb',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                disabled={approvalLoadingId === member.user?.id}
                                onClick={() => handleMemberApproval(viewingMembersChit.id, member.user.id, 'rejected')}
                                title="Reject Member"
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: '#dc2626',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : member.status === 'approved' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dbeafe', color: '#2563eb', padding: '0.25rem 0.65rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Check size={13} />
                                <span>Enrolled</span>
                              </span>
                              <button
                                type="button"
                                disabled={removeLoadingId === (member.id || member.user?.id)}
                                onClick={() => handleRemoveMember(
                                  viewingMembersChit.id,
                                  member.user?.id,
                                  `${member.user?.name || 'Member'} (${member.ticketId || `Slot ${member.slotNumber || 1}`})`,
                                  member.id
                                )}
                                title="Remove this slot from Scheme"
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '6px',
                                  border: '1px solid #fecaca',
                                  backgroundColor: '#fff',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#fafafa'
              }}>
                <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  Showing {filteredMembers.length} of {allMembers.length} enrolled members
                </span>
                <button
                  type="button"
                  onClick={() => setViewingMembersChit(null)}
                  className="btn-secondary"
                  style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '9999px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Manually Add Member to Chit Scheme Modal */}
      {isAddMemberModalOpen && targetChitForAdd && (() => {
        const approvedCount = (targetChitForAdd.members || []).filter(m => m.status === 'approved').length;
        const totalCapacity = targetChitForAdd.totalMembers || 20;
        const vacancies = Math.max(0, totalCapacity - approvedCount);

        // Count approved slots each user currently holds in this chit
        const enrolledSlotsPerUser = {};
        (targetChitForAdd.members || []).filter(m => m.status === 'approved').forEach(m => {
          const uid = m.userId || m.user?.id;
          if (uid) enrolledSlotsPerUser[uid] = (enrolledSlotsPerUser[uid] || 0) + 1;
        });

        const filteredUsers = allUsersList.filter(u => {
          const query = userSearchText.toLowerCase();
          const name = (u.name || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          const phone = (u.phone || '').toLowerCase();
          return name.includes(query) || email.includes(query) || phone.includes(query);
        });

        const selectedUsersList = allUsersList.filter(u => selectedUserIds.includes(u.id));
        const totalSelectedSlots = selectedUserIds.reduce((sum, id) => sum + (userSlotCounts[id] || 1), 0);
        const isAllFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.includes(u.id));

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
            animation: 'fadeIn 0.2s ease'
          }}
            onClick={(e) => { if (e.target === e.currentTarget) setIsAddMemberModalOpen(false); }}
          >
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              animation: 'slideUp 0.3s ease'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e5e7eb',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserPlus size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', margin: 0 }}>
                      Manually Add Users to Chit
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: '0.2rem 0 0 0' }}>
                      Members can participate 1 time, 2 times, or multiple times in this scheme
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scheme Summary Strip */}
              <div style={{
                padding: '0.9rem 1.5rem',
                backgroundColor: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#111827', display: 'block' }}>{targetChitForAdd.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    EMI: ₹{Number(targetChitForAdd.monthlyContribution || 0).toLocaleString()} | Pool: ₹{Number(targetChitForAdd.chitValue || 0).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                    backgroundColor: vacancies > 0 ? '#dbeafe' : '#fee2e2',
                    color: vacancies > 0 ? '#2563eb' : '#dc2626',
                    border: `1px solid ${vacancies > 0 ? '#a5b4fc' : '#fca5a5'}`
                  }}>
                    {approvedCount} / {totalCapacity} Filled ({vacancies} Vacant)
                  </span>

                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                    backgroundColor: totalSelectedSlots > 0 ? '#eff6ff' : '#f3f4f6',
                    color: totalSelectedSlots > 0 ? '#1d4ed8' : '#6b7280',
                    border: `1px solid ${totalSelectedSlots > 0 ? '#bfdbfe' : '#e5e7eb'}`
                  }}>
                    {totalSelectedSlots} Slots Selected ({selectedUserIds.length} Users)
                  </span>
                </div>
              </div>

              {/* Form Body */}
              <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {addMemberError && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fca5a5',
                      color: '#dc2626',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                      {addMemberError}
                    </div>
                  )}

                  {/* Search input for user */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
                      Search Registered Members:
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                      <input
                        type="text"
                        placeholder="Type name, phone or email..."
                        value={userSearchText}
                        onChange={(e) => setUserSearchText(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.85rem 0.6rem 2.2rem',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.88rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Multi-Selection Controls Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>
                      Select Members & Slots to Enroll ({totalSelectedSlots} of {vacancies} slots):
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const userIds = filteredUsers.map(u => u.id);
                          if (isAllFilteredSelected) {
                            handleDeselectAll();
                          } else {
                            handleSelectAll(userIds, vacancies);
                          }
                        }}
                        style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {isAllFilteredSelected ? 'Deselect All' : `Select All Filtered (${filteredUsers.length})`}
                      </button>

                      {selectedUserIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleDeselectAll}
                          style={{
                            padding: '0.3rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Clear ({selectedUserIds.length})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Users Selection List (with Slots Stepper) */}
                  <div style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: '#fff'
                  }}>
                    {allUsersList.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                        Loading registered users...
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                        No users match "{userSearchText}".
                      </div>
                    ) : (
                      filteredUsers.map(user => {
                        const currentSlots = enrolledSlotsPerUser[user.id] || 0;
                        const isSelected = selectedUserIds.includes(user.id);
                        const allocatedSlots = userSlotCounts[user.id] || 1;

                        return (
                          <div
                            key={user.id}
                            onClick={() => {
                              if (vacancies > 0 || isSelected) {
                                toggleUserSelection(user.id, vacancies);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.65rem 0.85rem',
                              borderBottom: '1px solid #f3f4f6',
                              cursor: 'pointer',
                              backgroundColor: isSelected ? '#eef2ff' : '#fff',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleUserSelection(user.id, vacancies);
                                }}
                                style={{
                                  cursor: 'pointer',
                                  width: '18px',
                                  height: '18px',
                                  accentColor: '#2563eb'
                                }}
                              />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                  <strong style={{ fontSize: '0.9rem', color: isSelected ? '#2563eb' : '#111827' }}>
                                    {user.name}
                                  </strong>
                                  {user.isApproved && (
                                    <span style={{ fontSize: '0.68rem', backgroundColor: '#dbeafe', color: '#2563eb', padding: '0.1rem 0.4rem', borderRadius: '9999px', fontWeight: 600 }}>
                                      Verified
                                    </span>
                                  )}
                                  {currentSlots > 0 && (
                                    <span style={{
                                      fontSize: '0.68rem',
                                      backgroundColor: '#eff6ff',
                                      color: '#1d4ed8',
                                      border: '1px solid #bfdbfe',
                                      padding: '0.1rem 0.45rem',
                                      borderRadius: '9999px',
                                      fontWeight: 700
                                    }}>
                                      Holds {currentSlots} {currentSlots === 1 ? 'slot' : 'slots'}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                                  {user.phone ? `${user.phone} • ` : ''}{user.email}
                                </div>
                              </div>
                            </div>

                            <div onClick={(e) => e.stopPropagation()}>
                              {isSelected ? (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  backgroundColor: '#fff',
                                  border: '1px solid #a5b4fc',
                                  padding: '0.2rem 0.45rem',
                                  borderRadius: '8px'
                                }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb' }}>
                                    Slots:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateUserSlotCount(user.id, -1, vacancies)}
                                    disabled={allocatedSlots <= 1}
                                    title="Decrease Slots"
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '4px',
                                      border: '1px solid #d1d5db',
                                      backgroundColor: allocatedSlots <= 1 ? '#f9fafb' : '#ffffff',
                                      color: allocatedSlots <= 1 ? '#9ca3af' : '#111827',
                                      fontWeight: 800,
                                      fontSize: '0.9rem',
                                      cursor: allocatedSlots <= 1 ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: 0
                                    }}
                                  >
                                    -
                                  </button>
                                  <span style={{
                                    minWidth: '22px',
                                    textAlign: 'center',
                                    fontSize: '0.88rem',
                                    fontWeight: 800,
                                    color: '#2563eb'
                                  }}>
                                    {allocatedSlots}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateUserSlotCount(user.id, 1, vacancies)}
                                    disabled={totalSelectedSlots >= vacancies}
                                    title="Increase Slots"
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '4px',
                                      border: '1px solid #a5b4fc',
                                      backgroundColor: totalSelectedSlots >= vacancies ? '#f9fafb' : '#dbeafe',
                                      color: totalSelectedSlots >= vacancies ? '#9ca3af' : '#2563eb',
                                      fontWeight: 800,
                                      fontSize: '0.9rem',
                                      cursor: totalSelectedSlots >= vacancies ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: 0
                                    }}
                                  >
                                    +
                                  </button>
                                  <span style={{ fontSize: '0.72rem', color: '#4b5563', marginLeft: '0.1rem' }}>
                                    {allocatedSlots === 1 ? 'ticket' : 'tickets'}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', padding: '0.2rem 0.5rem' }}>
                                  Click to select
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Multi-Selection Summary Tags */}
                  {selectedUsersList.length > 0 && (
                    <div style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Check size={14} />
                          Ready to Enroll ({totalSelectedSlots} {totalSelectedSlots === 1 ? 'Slot' : 'Slots'} across {selectedUsersList.length} {selectedUsersList.length === 1 ? 'Member' : 'Members'}):
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Vacancies left after enrollment: {Math.max(0, vacancies - totalSelectedSlots)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '90px', overflowY: 'auto' }}>
                        {selectedUsersList.map(u => {
                          const slots = userSlotCounts[u.id] || 1;
                          return (
                            <span
                              key={u.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                backgroundColor: '#fff',
                                border: '1px solid #a5b4fc',
                                color: '#2563eb',
                                borderRadius: '9999px',
                                padding: '0.2rem 0.65rem',
                                fontSize: '0.78rem',
                                fontWeight: 700
                              }}
                            >
                              <span>{u.name} ({slots} {slots === 1 ? 'Slot' : 'Slots'})</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleUserSelection(u.id, vacancies);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: '#9ca3af'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; }}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer buttons */}
                <div style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem'
                }}>
                  <button
                    type="button"
                    onClick={() => setIsAddMemberModalOpen(false)}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#fff',
                      color: '#4b5563',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={selectedUserIds.length === 0 || addMemberLoading || totalSelectedSlots === 0 || totalSelectedSlots > vacancies}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.6rem 1.5rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: selectedUserIds.length > 0 && totalSelectedSlots <= vacancies ? '#2563eb' : '#9ca3af',
                      color: '#fff',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: selectedUserIds.length > 0 && totalSelectedSlots <= vacancies ? 'pointer' : 'not-allowed',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    {addMemberLoading ? (
                      'Enrolling Slots...'
                    ) : (
                      <>
                        <UserPlus size={16} />
                        <span>
                          {selectedUserIds.length === 0
                            ? 'Select Users & Slots to Enroll'
                            : `Enroll ${totalSelectedSlots} ${totalSelectedSlots === 1 ? 'Slot' : 'Slots'} (${selectedUserIds.length} ${selectedUserIds.length === 1 ? 'Member' : 'Members'})`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      <style>{`
        @media (max-width: 900px) {
          .admin-chit-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ChitManager;
