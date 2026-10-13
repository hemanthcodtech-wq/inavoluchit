import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ScrollAnimationWrapper from '../components/ScrollAnimationWrapper';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  FileText, 
  CheckCircle,
  Briefcase,
  CreditCard,
  Eye,
  Download,
  Edit3,
  X,
  Save,
  MapPin,
  Calendar,
  Users,
  Loader
} from 'lucide-react';
import { generatePaymentReceiptPDF } from '../utils/receiptGenerator';
import ReceiptModal from '../components/ReceiptModal';

const Profile = () => {
  const { user, token, API_URL, SERVER_URL, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('details'); // 'details' or 'history'
  
  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // History State
  const [chits, setChits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [viewReceiptData, setViewReceiptData] = useState(null);

  useEffect(() => {
    if (!user || user.role === 'superadmin') return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const chitsRes = await fetch(`${API_URL}/chits`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const chitsData = await chitsRes.json();
        
        const paymentsRes = await fetch(`${API_URL}/payments/my-payments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const paymentsData = await paymentsRes.json();
        
        if (chitsData.success && paymentsData.success) {
          const joined = chitsData.data.filter((chit) => 
            chit.members.some((m) => m.user.id === user.id && m.status === 'approved')
          );
          setChits(joined);
          setPayments(paymentsData.data);
        }
      } catch (error) {
        console.error('Error fetching profile ledger details:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [token, user, API_URL]);

  // Initialize edit form with current user data
  const startEditing = () => {
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      whatsappNumber: user.whatsappNumber || '',
      gender: user.gender || '',
      dob: user.dob || '',
      occupation: user.occupation || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      pincode: user.pincode || '',
      nomineeName: user.nomineeName || '',
      nomineeRelationship: user.nomineeRelationship || '',
      nomineePhone: user.nomineePhone || '',
      nomineeAddress: user.nomineeAddress || '',
    });
    setEditError('');
    setEditSuccess('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditError('');
    setEditSuccess('');
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      setEditError('Full name is required.');
      return;
    }
    if (!editForm.phone.trim()) {
      setEditError('Phone number is required.');
      return;
    }

    setEditLoading(true);
    setEditError('');
    setEditSuccess('');

    try {
      const res = await fetch(`${API_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setEditSuccess('Profile updated successfully!');
        setTimeout(() => {
          setIsEditing(false);
          setEditSuccess('');
        }, 2000);
      } else {
        setEditError(data.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setEditError('Connection error. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  if (!user) return null;

  const getFullImgUrl = (path) => {
    if (!path) return 'https://res.cloudinary.com/demo/image/upload/v12345/mock-placeholder.png';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const base = SERVER_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'));
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '0.6rem',
    border: '1.5px solid #e5e7eb',
    fontSize: '0.88rem',
    fontWeight: 500,
    color: '#1f2937',
    backgroundColor: '#fafafa',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#6b7280',
    marginBottom: '0.3rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em'
  };

  return (
    <div className="user-page-container" style={{ maxWidth: '900px', margin: '0 auto', boxSizing: 'border-box' }}>
      <ScrollAnimationWrapper>
        <div className="glass-panel card-premium" style={{ padding: '2.5rem', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
          
          {/* User Profile Header banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.5rem' }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--accent-yellow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--accent-yellow-dark)',
              filter: 'drop-shadow(0 2px 4px rgba(250, 204, 21, 0.2))'
            }}>
              <User size={36} color="var(--color-primary)" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{user.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                {user.role !== 'superadmin' && (
                  <span className="badge" style={{ backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 700, fontSize: '0.82rem' }}>
                    Member ID: {user.memberId || 'INA101'}
                  </span>
                )}
                <span className="badge badge-approved" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle size={12} />
                  <span>Approved Member</span>
                </span>
                <span className="badge" style={{ backgroundColor: 'var(--border-subtle)', color: 'var(--color-primary)' }}>
                  {user.role === 'superadmin' ? 'Superadmin' : 'User'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation tabs inside profile for standard users */}
          {user.role !== 'superadmin' && (
            <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
              <button 
                onClick={() => setActiveTab('details')}
                style={{
                  padding: '0.75rem 0.5rem',
                  borderBottom: activeTab === 'details' ? '3px solid var(--accent-yellow-dark)' : '3px solid transparent',
                  fontWeight: activeTab === 'details' ? 700 : 500,
                  color: activeTab === 'details' ? 'var(--color-primary)' : 'var(--color-secondary)',
                  transition: 'var(--transition-fast)',
                  cursor: 'pointer'
                }}
              >
                Personal Info
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                style={{
                  padding: '0.75rem 0.5rem',
                  borderBottom: activeTab === 'history' ? '3px solid var(--accent-yellow-dark)' : '3px solid transparent',
                  fontWeight: activeTab === 'history' ? 700 : 500,
                  color: activeTab === 'history' ? 'var(--color-primary)' : 'var(--color-secondary)',
                  transition: 'var(--transition-fast)',
                  cursor: 'pointer'
                }}
              >
                Savings Ledger & History
              </button>
            </div>
          )}

          {/* Tab 1: Personal Info details */}
          {(activeTab === 'details' || user.role === 'superadmin') && (
            <>
              {/* Edit / View Toggle Button */}
              {user.role !== 'superadmin' && !isEditing && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                  <button
                    onClick={startEditing}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 1.15rem',
                      borderRadius: '0.65rem',
                      border: '1.5px solid #2563eb',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.1)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                  >
                    <Edit3 size={15} />
                    <span>Edit Details</span>
                  </button>
                </div>
              )}

              {/* Success / Error Banners */}
              {editSuccess && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.65rem',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #a5b4fc',
                  color: '#2563eb',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CheckCircle size={16} />
                  {editSuccess}
                </div>
              )}
              {editError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.65rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#dc2626',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <X size={16} />
                  {editError}
                </div>
              )}

              {/* EDITING MODE */}
              {isEditing ? (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  {/* Header with Save/Cancel buttons */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                    paddingBottom: '1rem',
                    borderBottom: '2px dashed #e5e7eb'
                  }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <Edit3 size={18} color="#2563eb" />
                      Edit Your Profile
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={cancelEditing}
                        disabled={editLoading}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.55rem',
                          border: '1px solid #d1d5db',
                          backgroundColor: '#fff',
                          color: '#6b7280',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <X size={14} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={editLoading}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.5rem 1.15rem',
                          borderRadius: '0.55rem',
                          border: 'none',
                          backgroundColor: '#2563eb',
                          color: '#fff',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: editLoading ? 'not-allowed' : 'pointer',
                          opacity: editLoading ? 0.7 : 1,
                          boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
                        }}
                      >
                        {editLoading ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                        {editLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>

                  {/* Personal Information Section */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#374151',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      <User size={15} color="#2563eb" />
                      Personal Information
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label style={labelStyle}>Full Name *</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => handleEditChange('name', e.target.value)}
                          style={inputStyle}
                          placeholder="Enter full name"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Phone Number *</label>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => handleEditChange('phone', e.target.value)}
                          style={inputStyle}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>WhatsApp Number</label>
                        <input
                          type="tel"
                          value={editForm.whatsappNumber}
                          onChange={(e) => handleEditChange('whatsappNumber', e.target.value)}
                          style={inputStyle}
                          placeholder="Enter WhatsApp number"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Gender</label>
                        <select
                          value={editForm.gender}
                          onChange={(e) => handleEditChange('gender', e.target.value)}
                          style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Date of Birth</label>
                        <input
                          type="date"
                          value={editForm.dob}
                          onChange={(e) => handleEditChange('dob', e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Occupation</label>
                        <input
                          type="text"
                          value={editForm.occupation}
                          onChange={(e) => handleEditChange('occupation', e.target.value)}
                          style={inputStyle}
                          placeholder="Enter occupation"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#374151',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      <MapPin size={15} color="#2563eb" />
                      Address Details
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Full Address</label>
                        <textarea
                          value={editForm.address}
                          onChange={(e) => handleEditChange('address', e.target.value)}
                          style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
                          placeholder="Enter full address"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>City</label>
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={(e) => handleEditChange('city', e.target.value)}
                          style={inputStyle}
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>State</label>
                        <input
                          type="text"
                          value={editForm.state}
                          onChange={(e) => handleEditChange('state', e.target.value)}
                          style={inputStyle}
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Pincode</label>
                        <input
                          type="text"
                          value={editForm.pincode}
                          onChange={(e) => handleEditChange('pincode', e.target.value)}
                          style={inputStyle}
                          placeholder="Pincode"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Nominee Section */}
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#374151',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      <Users size={15} color="#2563eb" />
                      Nominee Details
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label style={labelStyle}>Nominee Name</label>
                        <input
                          type="text"
                          value={editForm.nomineeName}
                          onChange={(e) => handleEditChange('nomineeName', e.target.value)}
                          style={inputStyle}
                          placeholder="Nominee name"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Relationship</label>
                        <input
                          type="text"
                          value={editForm.nomineeRelationship}
                          onChange={(e) => handleEditChange('nomineeRelationship', e.target.value)}
                          style={inputStyle}
                          placeholder="e.g. Father, Mother, Spouse"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Nominee Phone</label>
                        <input
                          type="tel"
                          value={editForm.nomineePhone}
                          onChange={(e) => handleEditChange('nomineePhone', e.target.value)}
                          style={inputStyle}
                          placeholder="Nominee phone number"
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Nominee Address</label>
                        <textarea
                          value={editForm.nomineeAddress}
                          onChange={(e) => handleEditChange('nomineeAddress', e.target.value)}
                          style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                          placeholder="Nominee address"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* VIEW MODE (original) */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                  {/* Account Details */}
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Shield size={18} color="var(--accent-yellow-dark)" />
                      <span>Account Information</span>
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {user.role !== 'superadmin' && (
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <CreditCard size={18} color="var(--color-primary-green)" />
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-secondary)' }}>Member ID</p>
                            <p style={{ fontWeight: 800, color: 'var(--color-primary-green)', fontSize: '0.98rem' }}>{user.memberId || 'INA101'}</p>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Mail size={18} color="var(--color-secondary)" />
                        <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-secondary)' }}>Email Address</p>
                          <p style={{ fontWeight: 500 }}>{user.email}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Phone size={18} color="var(--color-secondary)" />
                        <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-secondary)' }}>Phone Number</p>
                          <p style={{ fontWeight: 500 }}>{user.phone}</p>
                        </div>
                      </div>

                      {user.whatsappNumber && (
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <Phone size={18} color="#25d366" />
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-secondary)' }}>WhatsApp Number</p>
                            <p style={{ fontWeight: 500 }}>{user.whatsappNumber}</p>
                          </div>
                        </div>
                      )}

                      {user.gender && (
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <User size={18} color="var(--color-secondary)" />
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-secondary)' }}>Gender</p>
                            <p style={{ fontWeight: 500 }}>{user.gender}</p>
                          </div>
                        </div>
                      )}

                      {user.dob && (
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <Calendar size={18} color="var(--color-secondary)" />
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-secondary)' }}>Date of Birth</p>
                            <p style={{ fontWeight: 500 }}>{user.dob}</p>
                          </div>
                        </div>
                      )}

                      {user.occupation && (
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <Briefcase size={18} color="var(--color-secondary)" />
                          <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-secondary)' }}>Occupation</p>
                            <p style={{ fontWeight: 500 }}>{user.occupation}</p>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Shield size={18} color="var(--color-secondary)" />
                        <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-secondary)' }}>User Role</p>
                          <p style={{ fontWeight: 500, textTransform: 'capitalize' }}>{user.role}</p>
                        </div>
                      </div>
                    </div>

                    {/* Address Info (if available) */}
                    {(user.address || user.city || user.state) && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#374151' }}>
                          <MapPin size={16} color="var(--accent-yellow-dark)" />
                          Address
                        </h4>
                        <div style={{
                          padding: '0.85rem 1rem',
                          backgroundColor: '#f9fafb',
                          borderRadius: '0.6rem',
                          border: '1px solid #f3f4f6',
                          fontSize: '0.88rem',
                          color: '#374151',
                          lineHeight: 1.6
                        }}>
                          {user.address && <div>{user.address}</div>}
                          <div>
                            {[user.city, user.state, user.pincode].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Nominee Info (if available) */}
                    {user.nomineeName && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#374151' }}>
                          <Users size={16} color="var(--accent-yellow-dark)" />
                          Nominee Details
                        </h4>
                        <div style={{
                          padding: '0.85rem 1rem',
                          backgroundColor: '#f9fafb',
                          borderRadius: '0.6rem',
                          border: '1px solid #f3f4f6',
                          fontSize: '0.88rem',
                          color: '#374151',
                          lineHeight: 1.8
                        }}>
                          <div><strong>Name:</strong> {user.nomineeName}</div>
                          {user.nomineeRelationship && <div><strong>Relationship:</strong> {user.nomineeRelationship}</div>}
                          {user.nomineePhone && <div><strong>Phone:</strong> {user.nomineePhone}</div>}
                          {user.nomineeAddress && <div><strong>Address:</strong> {user.nomineeAddress}</div>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Proofs Summary */}
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={18} color="var(--accent-yellow-dark)" />
                      <span>Uploaded Documents</span>
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {user.aadharImgUrl && (
                        <div>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>Aadhar Card Proof</p>
                          <div 
                            onClick={() => setLightboxUrl(getFullImgUrl(user.aadharImgUrl))}
                            className="input-field" 
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--border-subtle)' }}
                          >
                            <FileText size={16} />
                            <span style={{ fontSize: '0.85rem', textDecoration: 'underline', color: 'var(--color-primary)' }}>View Aadhar Image</span>
                          </div>
                        </div>
                      )}

                      {user.panImgUrl && (
                        <div>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>PAN Card Proof</p>
                          <div 
                            onClick={() => setLightboxUrl(getFullImgUrl(user.panImgUrl))}
                            className="input-field" 
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--border-subtle)' }}
                          >
                            <FileText size={16} />
                            <span style={{ fontSize: '0.85rem', textDecoration: 'underline', color: 'var(--color-primary)' }}>View PAN Image</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tab 2: Savings Ledger & History (only for users) */}
          {user.role !== 'superadmin' && activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading savings log...</div>
              ) : (
                <>
                  {/* Active Joined Chits List */}
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Briefcase size={18} color="var(--accent-yellow-dark)" />
                      <span>My Savings Pools ({chits.length})</span>
                    </h3>
                    
                    {chits.length === 0 ? (
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-secondary)', fontStyle: 'italic' }}>You have not joined any active chit groups yet.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        {chits.map(chit => (
                          <div key={chit.id} style={{ padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: '#fff' }}>
                            <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{chit.name}</p>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-secondary)' }}>
                              <p>Pool Value: <strong>₹{chit.chitValue.toLocaleString()}</strong></p>
                              <p>Monthly payment: <strong>₹{chit.monthlyContribution.toLocaleString()}</strong></p>
                              <p>Chit Status: <strong style={{ textTransform: 'capitalize' }}>{chit.status}</strong></p>
                              {chit.startDate && <p>Start Date: <strong>{new Date(chit.startDate).toLocaleDateString()}</strong></p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contributions History ledger table */}
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CreditCard size={18} color="var(--accent-yellow-dark)" />
                      <span>Cash Installments Record ({payments.length})</span>
                    </h3>

                    {payments.length === 0 ? (
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-secondary)', fontStyle: 'italic' }}>No payment records found.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--color-secondary)' }}>
                              <th style={{ padding: '0.75rem 0.5rem' }}>Chit Pool</th>
                              <th style={{ padding: '0.75rem 0.5rem' }}>Installment</th>
                              <th style={{ padding: '0.75rem 0.5rem' }}>Amount</th>
                              <th style={{ padding: '0.75rem 0.5rem' }}>Transaction ID</th>
                              <th style={{ padding: '0.75rem 0.5rem' }}>Receipt Image</th>
                              <th style={{ padding: '0.75rem 0.5rem' }}>Verification</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map((p) => (
                              <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{p.chit?.name || 'Deleted Scheme'}</td>
                                <td style={{ padding: '0.75rem 0.5rem' }}>Month {p.monthNumber}</td>
                                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>₹{p.amount.toLocaleString()}</td>
                                <td style={{ padding: '0.75rem 0.5rem' }}><code>{p.transactionId}</code></td>
                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                  <button 
                                    onClick={() => setLightboxUrl(getFullImgUrl(p.proofImgUrl))}
                                    className="btn-secondary" 
                                    style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                                  >
                                    <Eye size={12} />
                                    <span>View Proof</span>
                                   </button>
                                   <button 
                                     onClick={() => generatePaymentReceiptPDF(p, p.chit, user, { 
                                       paidMonths: p.monthNumber,
                                       monthNumber: p.monthNumber,
                                       auctions: p.chit?.auctions,
                                       ticketId: p.ticketId
                                     })}
                                     style={{
                                       padding: '2px 8px',
                                       fontSize: '0.75rem',
                                       display: 'inline-flex',
                                       alignItems: 'center',
                                       gap: '3px',
                                       backgroundColor: '#2563eb',
                                       color: '#ffffff',
                                       border: 'none',
                                       borderRadius: '4px',
                                       fontWeight: 600,
                                       cursor: 'pointer',
                                       marginTop: '4px'
                                     }}
                                     title="Download official PDF receipt"
                                   >
                                     <Download size={12} />
                                     <span>Download Receipt</span>
                                  </button>
                                  {p.status === 'approved' && (
                                    <button 
                                      onClick={() => setViewReceiptData({ 
                                        payment: p, 
                                        chit: p.chit, 
                                        user, 
                                        extraData: { 
                                          paidMonths: p.monthNumber,
                                          monthNumber: p.monthNumber,
                                          auctions: p.chit?.auctions,
                                          ticketId: p.ticketId
                                        } 
                                      })}
                                      style={{
                                        padding: '2px 8px',
                                        fontSize: '0.75rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        backgroundColor: '#eff6ff',
                                        color: '#2563eb',
                                        border: '1px solid #2563eb',
                                        borderRadius: '4px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        marginTop: '4px',
                                        marginLeft: '4px'
                                      }}
                                      title="View official receipt on screen"
                                    >
                                      <Eye size={12} />
                                      <span>View Receipt</span>
                                    </button>
                                  )}
                                </td>
                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                  <span className={`badge ${p.status === 'approved' ? 'badge-approved' : p.status === 'pending' ? 'badge-pending' : 'badge-rejected'}`} style={{ fontSize: '0.7rem' }}>
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </ScrollAnimationWrapper>

      {/* Fullscreen Lightbox Zoom modal */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
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
            alt="Ledger Proof Preview" 
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)' }}
          />
        </div>
      )}

      {/* Official Receipt Modal */}
      {viewReceiptData && (
        <ReceiptModal
          isOpen={Boolean(viewReceiptData)}
          onClose={() => setViewReceiptData(null)}
          {...viewReceiptData}
        />
      )}
    </div>
  );
};

export default Profile;
