import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import { 
  Users, 
  Search, 
  UserCheck, 
  Clock, 
  Briefcase, 
  Eye, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle,
  FileSpreadsheet,
  Calendar,
  Phone,
  Mail,
  Filter,
  RefreshCw,
  Trash2,
  Check,
  X,
  UserPlus,
  Edit3
} from 'lucide-react';
import AdminUserRegistrationModal from '../../components/AdminUserRegistrationModal';
import EditUserModal from '../../components/EditUserModal';
import * as XLSX from 'xlsx';

const AllUsers = () => {
  const { token, API_URL } = useAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'verified', 'pending'
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const getFullImgUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);

  const handleEditUser = (user) => {
    setSelectedUserForEdit(user);
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    fetchUsers();
  }, [token, API_URL]);

  const handleDeleteUser = async (user) => {
    if (!user || !user.id) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete member "${user.name}" (${user.email})?\n\nThis will remove their user account, KYC documents, and all associated chit records.`
    );
    if (!confirmDelete) return;

    setDeleteLoadingId(user.id);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const contentType = res.headers.get('content-type');
      let data = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(
          res.status === 404
            ? 'User deletion API endpoint not found on the backend server. Please re-upload the latest LIVE_HOSTINGER_BACKEND.zip file to Hostinger.'
            : `Server returned HTTP ${res.status}`
        );
      }

      if (res.ok && data.success) {
        setSuccessMsg(`Member "${user.name}" deleted successfully.`);
        setRecords(prev => prev.filter(r => r.user?.id !== user.id));
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(data.message || `Failed to delete user (HTTP ${res.status}).`);
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Connection error deleting user.');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleEditMemberId = async (user) => {
    const currentId = user.memberId || '';
    const newMemberId = window.prompt(`Enter custom Member ID for "${user.name}":`, currentId);
    if (newMemberId === null || newMemberId.trim() === currentId) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}/member-id`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ memberId: newMemberId.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Member ID for ${user.name} updated to "${newMemberId.trim()}".`);
        fetchUsers();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(data.message || 'Failed to update Member ID.');
      }
    } catch (err) {
      console.error('Error updating Member ID:', err);
      setError('Connection error updating Member ID.');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/users-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.data || []);
      } else {
        setError(data.message || 'Failed to load user records.');
      }
    } catch (err) {
      console.error('Error fetching all users:', err);
      setError('Connection error loading users.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered users based on search and status
  const filteredRecords = records.filter(record => {
    const user = record.user || {};
    const nameMatch = (user.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = (user.phone || '').includes(searchQuery);
    const matchesSearch = nameMatch || emailMatch || phoneMatch;

    if (!matchesSearch) return false;

    if (filterStatus === 'verified') return user.isApproved === true;
    if (filterStatus === 'pending') return user.isApproved === false;
    return true;
  });

  const totalMembers = records.length;
  const verifiedMembers = records.filter(r => r.user?.isApproved).length;
  const pendingMembers = records.filter(r => !r.user?.isApproved).length;
  const totalEnrolledChits = records.reduce((acc, r) => acc + (r.chits?.length || 0), 0);

  const exportToExcel = () => {
    if (!filteredRecords || filteredRecords.length === 0) {
      alert('No user records to export.');
      return;
    }

    const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '');
    const txt = (v) => (v === null || v === undefined ? '' : String(v).trim());

    // Only real, user-entered data — no hardcoded fillers like "N/A" / "Not Assigned"
    const dataToExport = filteredRecords.map((r, idx) => {
      const u = r.user || {};
      const chitsList = (r.chits || []).map(c => c.name).filter(Boolean).join('; ');
      const approvedPayments = (r.payments || []).filter(p => p.status === 'approved');
      const totalAmountPaid = approvedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      return {
        'S.No': idx + 1,
        'Member ID': txt(u.memberId),
        'Full Name': txt(u.name),
        'Phone Number': txt(u.phone),
        'WhatsApp Number': txt(u.whatsappNumber),
        'Email Address': txt(u.email),
        'KYC Status': u.isApproved ? 'Verified Member' : 'Pending Review',
        'Registration Date': fmtDate(u.createdAt),
        'Gender': txt(u.gender),
        'Date of Birth': fmtDate(u.dob),
        'Occupation': txt(u.occupation),
        'Address': txt(u.address),
        'City': txt(u.city),
        'State': txt(u.state),
        'Pincode': txt(u.pincode),
        'Aadhar Number': txt(u.aadharNumber),
        'PAN Number': txt(u.panNumber),
        'Nominee Name': txt(u.nomineeName),
        'Nominee Relationship': txt(u.nomineeRelationship),
        'Nominee Phone': txt(u.nomineePhone),
        'Nominee Address': txt(u.nomineeAddress),
        'Guarantor Name': txt(u.guarantorName),
        'Guarantor Relationship': txt(u.guarantorRelationship),
        'Guarantor Phone': txt(u.guarantorPhone),
        'Guarantor Address': txt(u.guarantorAddress),
        'Enrolled Chits Count': r.chits?.length || 0,
        'Enrolled Chit Schemes': chitsList,
        'Approved Payments Count': approvedPayments.length,
        'Total Paid Amount (Rs)': totalAmountPaid
      };
    });

    const colWidthMap = {
      'S.No': 8, 'Member ID': 20, 'Full Name': 28, 'Phone Number': 20, 'WhatsApp Number': 20,
      'Email Address': 38, 'KYC Status': 20, 'Registration Date': 22, 'Gender': 12, 'Date of Birth': 18,
      'Occupation': 22, 'Address': 38, 'City': 18, 'State': 18, 'Pincode': 14, 'Aadhar Number': 22,
      'PAN Number': 18, 'Nominee Name': 24, 'Nominee Relationship': 24, 'Nominee Phone': 20,
      'Nominee Address': 38, 'Guarantor Name': 24, 'Guarantor Relationship': 24, 'Guarantor Phone': 20,
      'Guarantor Address': 38, 'Enrolled Chits Count': 22, 'Enrolled Chit Schemes': 42,
      'Approved Payments Count': 26, 'Total Paid Amount (Rs)': 24
    };

    // Drop text columns that no exported user has filled in
    const columns = Object.keys(dataToExport[0]).filter(key =>
      typeof dataToExport[0][key] === 'number' || dataToExport.some(row => row[key] !== '')
    );

    const cleanRows = dataToExport.map(row => Object.fromEntries(columns.map(c => [c, row[c]])));
    const cleanSheet = XLSX.utils.json_to_sheet(cleanRows, { header: columns });

    // Column widths so Excel never shows "######" or truncated text
    cleanSheet['!cols'] = columns.map(c => ({ wch: colWidthMap[c] || 20 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, cleanSheet, 'All_Members_Directory');
    XLSX.writeFile(workbook, `InaVolu_Members_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="admin-page-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Page Header */}
      <ScrollAnimationWrapper>
        <div className="admin-page-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-primary-green)', margin: 0 }}>
              All <span style={{ color: 'var(--accent-yellow-dark)' }}>Users & Members</span>
            </h1>
            <p style={{ color: 'var(--color-secondary)', marginTop: '0.4rem', fontSize: '0.9rem', lineHeight: 1.4 }}>
              Directory of all registered members. Click any individual user to view their complete payment records and enrolled chits.
            </p>
          </div>

          <div className="admin-page-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.92rem',
                padding: '0.65rem 1.4rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(29, 78, 216, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
            >
              <UserPlus size={18} />
              <span>+ Add New Member</span>
            </button>

            <button
              onClick={fetchUsers}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} color="#475569" />
              <span>Refresh</span>
            </button>


          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Success Notification Banner */}
      {successMsg && (
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
            <span>{successMsg}</span>
          </div>
          <button 
            type="button"
            onClick={() => setSuccessMsg('')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {error && !loading && (
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
            <X size={18} color="#dc2626" />
            <span>{error}</span>
          </div>
          <button 
            type="button"
            onClick={() => setError('')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <ScrollAnimationWrapper>
        <div 
          className="dashboard-stats-row"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}
        >
          <div className="card-premium" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Total Users</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827' }}>{totalMembers}</div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>All registered accounts</p>
          </div>

          <div className="card-premium" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Verified Members</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>{verifiedMembers}</div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>KYC verified & active</p>
          </div>

          <div className="card-premium" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Pending Approvals</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706' }}>{pendingMembers}</div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>Awaiting admin review</p>
          </div>

          <div className="card-premium" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Chit Enrollments</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#9333ea' }}>{totalEnrolledChits}</div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>Active pool subscriptions</p>
          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Search & Status Filters */}
      <ScrollAnimationWrapper>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.4rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Filter size={14} /> Filter:
            </span>
            <button
              onClick={() => setFilterStatus('all')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filterStatus === 'all' ? '#2563eb' : '#f3f4f6',
                color: filterStatus === 'all' ? '#fff' : '#4b5563',
                transition: 'all 0.15s ease'
              }}
            >
              All ({totalMembers})
            </button>
            <button
              onClick={() => setFilterStatus('verified')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filterStatus === 'verified' ? '#2563eb' : '#f3f4f6',
                color: filterStatus === 'verified' ? '#fff' : '#4b5563',
                transition: 'all 0.15s ease'
              }}
            >
              Verified ({verifiedMembers})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: filterStatus === 'pending' ? '#d97706' : '#f3f4f6',
                color: filterStatus === 'pending' ? '#fff' : '#4b5563',
                transition: 'all 0.15s ease'
              }}
            >
              Pending ({pendingMembers})
            </button>
          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Users List */}
      {loading ? (
        <div style={{ padding: '3.5rem', textAlign: 'center', color: '#2563eb', fontWeight: 700 }}>
          Loading users directory...
        </div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626', backgroundColor: '#fef2f2', borderRadius: '12px' }}>
          {error}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="card-premium" style={{ textAlign: 'center', padding: '3.5rem', backgroundColor: '#fff', borderRadius: '12px' }}>
          <Users size={44} style={{ color: '#9ca3af', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#374151' }}>No Users Found</h3>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            No users match your search query or filter selection.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {filteredRecords.map((record) => {
            const user = record.user || {};
            const enrolledChitsCount = record.chits?.length || 0;
            const paymentsCount = record.payments?.length || 0;

            return (
              <ScrollAnimationWrapper key={user.id}>
                <div
                  onClick={() => navigate(`/admin/records/user/${user.id}`)}
                  className="card-premium glass-panel admin-user-item-card"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(10, 30, 59, 0.12)',
                    borderRadius: '14px',
                    padding: '1.1rem 1.4rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.25rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary-green)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(10, 30, 59, 0.12)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.03)';
                  }}
                >
                  {/* Left: Avatar + Details */}
                  <div className="admin-user-info-col" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                    {user.profileImgUrl ? (
                      <img
                        src={getFullImgUrl(user.profileImgUrl)}
                        alt={user.name}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: `2px solid ${user.isApproved ? '#2563eb' : '#f59e0b'}`,
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        backgroundColor: user.isApproved ? '#dbeafe' : '#fef3c7',
                        color: user.isApproved ? '#2563eb' : '#b45309',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        border: `2px solid ${user.isApproved ? '#a5b4fc' : '#fde68a'}`,
                        flexShrink: 0
                      }}>
                        {(user.name || 'U').substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0, wordBreak: 'break-word' }}>
                          {user.name}
                        </h3>
                        {user.isApproved ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: '#eef2ff',
                            color: '#1e3a8a',
                            border: '1px solid #c7d2fe',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            whiteSpace: 'nowrap'
                          }}>
                            <CheckCircle size={11} />
                            Verified Member
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            backgroundColor: '#fffbeb',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            whiteSpace: 'nowrap'
                          }}>
                            <Clock size={11} />
                            Pending Review
                          </span>
                        )}

                        {/* Member ID Badge */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditMemberId(user);
                          }}
                          title="Click to edit Member ID"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            backgroundColor: '#f1f5f9',
                            color: '#0f172a',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span>Member ID: {user.memberId || 'Not Assigned'}</span>
                          <span style={{ fontSize: '0.68rem', color: '#2563eb', textDecoration: 'underline' }}>✏️ Edit</span>
                        </button>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.2rem',
                        fontSize: '0.82rem',
                        color: '#6b7280',
                        marginTop: '0.35rem',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', wordBreak: 'break-all' }}>
                          <Mail size={13} color="#9ca3af" />
                          {user.email}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                          <Phone size={13} color="#9ca3af" />
                          {user.phone || 'No phone'}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                          <Calendar size={13} color="#9ca3af" />
                          Joined {new Date(user.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Enrolled Chits Badge & View / Edit / Delete Buttons */}
                  <div className="admin-user-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0, flexWrap: 'wrap' }}>
                    <span className="admin-user-enrolled-badge" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      height: '36px',
                      padding: '0 0.8rem',
                      borderRadius: '8px',
                      backgroundColor: enrolledChitsCount > 0 ? '#eff6ff' : '#f3f4f6',
                      color: enrolledChitsCount > 0 ? '#1d4ed8' : '#6b7280',
                      border: `1px solid ${enrolledChitsCount > 0 ? '#bfdbfe' : '#e5e7eb'}`,
                      whiteSpace: 'nowrap'
                    }}>
                      {enrolledChitsCount} {enrolledChitsCount === 1 ? 'Chit Enrolled' : 'Chits Enrolled'}
                    </span>

                    <button
                      type="button"
                      className="admin-user-btn admin-user-btn-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditUser(user);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '9999px',
                        height: '36px',
                        padding: '0 1rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
                    >
                      <Edit3 size={15} />
                      <span>Edit Details</span>
                    </button>

                    <button
                      type="button"
                      className="admin-user-btn admin-user-btn-view"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/records/user/${user.id}`);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '9999px',
                        height: '36px',
                        padding: '0 1rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
                    >
                      <Eye size={15} />
                      <span>View Records</span>
                      <ArrowRight size={14} />
                    </button>

                    {user.role !== 'superadmin' && (
                      <button
                        type="button"
                        className="admin-user-btn admin-user-btn-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUser(user);
                        }}
                        disabled={deleteLoadingId === user.id}
                        title={`Delete user account ${user.name}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '9999px',
                          height: '36px',
                          padding: '0 0.9rem',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: deleteLoadingId === user.id ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                      >
                        <Trash2 size={15} />
                        <span>{deleteLoadingId === user.id ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </ScrollAnimationWrapper>
            );
          })}
        </div>
      )}
      {/* Manual User Registration Modal */}
      <AdminUserRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onUserCreated={(newUser) => {
          setSuccessMsg(`Member "${newUser?.name || 'New User'}" created and activated successfully!`);
          fetchUsers();
          setTimeout(() => setSuccessMsg(''), 5000);
        }}
      />
      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUserForEdit(null);
        }}
        user={selectedUserForEdit}
        onUserUpdated={(updatedUser) => {
          setSuccessMsg(`User "${updatedUser?.name || 'Member'}" details updated successfully!`);
          fetchUsers();
          setTimeout(() => setSuccessMsg(''), 5000);
        }}
      />
    </div>
  );
};

export default AllUsers;
