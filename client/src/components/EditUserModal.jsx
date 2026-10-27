import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  ShieldCheck, 
  Users, 
  Save, 
  Loader,
  AlertCircle,
  Calendar,
  Check
} from 'lucide-react';

const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }) => {
  const { token, API_URL } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [memberId, setMemberId] = useState('');
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [pincode, setPincode] = useState('');
  const [remarks, setRemarks] = useState('');

  // KYC
  const [panNumber, setPanNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');

  // Nominee
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelationship, setNomineeRelationship] = useState('Spouse');
  const [nomineePhone, setNomineePhone] = useState('');
  const [nomineeDob, setNomineeDob] = useState('');
  const [nomineeType, setNomineeType] = useState('Primary');
  const [nomineeAddress, setNomineeAddress] = useState('');
  const [nomineeRemarks, setNomineeRemarks] = useState('');

  // Guarantor / Security
  const [guarantorRequired, setGuarantorRequired] = useState('No');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorRelationship, setGuarantorRelationship] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorAddress, setGuarantorAddress] = useState('');
  const [guarantorKycStatus, setGuarantorKycStatus] = useState('Pending');
  const [securityType, setSecurityType] = useState('Cheque');
  const [securityValue, setSecurityValue] = useState('');
  const [securityVerificationStatus, setSecurityVerificationStatus] = useState('Pending');
  const [securityRemarks, setSecurityRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setWhatsappNumber(user.whatsappNumber || '');
      setMemberId(user.memberId || '');
      setGender(user.gender || 'Male');
      setAge(user.age || '');
      setDob(user.dob ? user.dob.split('T')[0] : '');
      setOccupation(user.occupation || '');
      setAddress(user.address || '');
      setCity(user.city || '');
      setState(user.state || 'Andhra Pradesh');
      setPincode(user.pincode || '');
      setRemarks(user.remarks || '');

      setPanNumber(user.panNumber || '');
      setAadharNumber(user.aadharNumber || '');

      setNomineeName(user.nomineeName || '');
      setNomineeRelationship(user.nomineeRelationship || 'Spouse');
      setNomineePhone(user.nomineePhone || '');
      setNomineeDob(user.nomineeDob ? user.nomineeDob.split('T')[0] : '');
      setNomineeType(user.nomineeType || 'Primary');
      setNomineeAddress(user.nomineeAddress || '');
      setNomineeRemarks(user.nomineeRemarks || '');

      setGuarantorRequired(user.guarantorRequired || 'No');
      setGuarantorName(user.guarantorName || '');
      setGuarantorRelationship(user.guarantorRelationship || '');
      setGuarantorPhone(user.guarantorPhone || '');
      setGuarantorAddress(user.guarantorAddress || '');
      setGuarantorKycStatus(user.guarantorKycStatus || 'Pending');
      setSecurityType(user.securityType || 'Cheque');
      setSecurityValue(user.securityValue || '');
      setSecurityVerificationStatus(user.securityVerificationStatus || 'Pending');
      setSecurityRemarks(user.securityRemarks || '');

      setError('');
      setSuccess('');
      setActiveTab('personal');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone Number is required.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name,
        email,
        phone,
        whatsappNumber,
        memberId,
        gender,
        age,
        dob,
        occupation,
        address,
        city,
        state,
        pincode,
        remarks,
        aadharNumber,
        panNumber,
        nomineeName,
        nomineeRelationship,
        nomineePhone,
        nomineeDob,
        nomineeType,
        nomineeAddress,
        nomineeRemarks,
        guarantorRequired,
        guarantorName,
        guarantorRelationship,
        guarantorPhone,
        guarantorAddress,
        guarantorKycStatus,
        securityType,
        securityValue,
        securityVerificationStatus,
        securityRemarks
      };

      const res = await fetch(`${API_URL}/admin/users/${user.id}/edit`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setSuccess('User details updated successfully!');
        if (onUserUpdated) onUserUpdated(data.user);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(data.message || 'Failed to update user details.');
      }
    } catch (err) {
      console.error('Error saving user details:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '0.5rem',
    border: '1.5px solid #cbd5e1',
    fontSize: '0.88rem',
    fontWeight: 500,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#475569',
    marginBottom: '0.35rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Edit User Details</h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                Editing user: <strong style={{ color: '#ffffff' }}>{user.name}</strong> ({user.memberId || 'INA Member'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '6px'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Tab Bar */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 1.5rem',
          gap: '1rem',
          overflowX: 'auto'
        }}>
          {[
            { id: 'personal', label: 'Personal Details', icon: User },
            { id: 'kyc', label: 'KYC Info', icon: ShieldCheck },
            { id: 'nominee', label: 'Nominee Details', icon: Users },
            { id: 'guarantor', label: 'Guarantor & Security', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.85rem 0.5rem',
                  borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem',
                  color: isActive ? '#2563eb' : '#64748b',
                  background: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderTop: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.75rem' }}>
            
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Check size={18} />
                <span>{success}</span>
              </div>
            )}

            {/* TAB 1: PERSONAL DETAILS */}
            {activeTab === 'personal' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.1rem' }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>

                <div>
                  <label style={labelStyle}>Member ID</label>
                  <input
                    type="text"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. ANR2602"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Phone Number *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>

                <div>
                  <label style={labelStyle}>WhatsApp Number</label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Age (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 35"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Occupation</label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Residential Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Pincode</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Admin Remarks</label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: KYC INFO */}
            {activeTab === 'kyc' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem' }}>
                <div>
                  <label style={labelStyle}>Aadhar Card Number</label>
                  <input
                    type="text"
                    value={aadharNumber}
                    onChange={(e) => setAadharNumber(e.target.value)}
                    style={inputStyle}
                    placeholder="12 digit Aadhar number"
                  />
                </div>

                <div>
                  <label style={labelStyle}>PAN Card Number</label>
                  <input
                    type="text"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    style={inputStyle}
                    placeholder="10 digit PAN"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: NOMINEE DETAILS */}
            {activeTab === 'nominee' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.1rem' }}>
                <div>
                  <label style={labelStyle}>Nominee Full Name</label>
                  <input
                    type="text"
                    value={nomineeName}
                    onChange={(e) => setNomineeName(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Relationship with Member</label>
                  <select
                    value={nomineeRelationship}
                    onChange={(e) => setNomineeRelationship(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Nominee Phone</label>
                  <input
                    type="text"
                    value={nomineePhone}
                    onChange={(e) => setNomineePhone(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Nominee DOB</label>
                  <input
                    type="date"
                    value={nomineeDob}
                    onChange={(e) => setNomineeDob(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Nominee Type</label>
                  <select
                    value={nomineeType}
                    onChange={(e) => setNomineeType(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nominee Address</label>
                  <input
                    type="text"
                    value={nomineeAddress}
                    onChange={(e) => setNomineeAddress(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* TAB 4: GUARANTOR DETAILS */}
            {activeTab === 'guarantor' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.1rem' }}>
                <div>
                  <label style={labelStyle}>Guarantor Required</label>
                  <select
                    value={guarantorRequired}
                    onChange={(e) => setGuarantorRequired(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Guarantor Full Name</label>
                  <input
                    type="text"
                    value={guarantorName}
                    onChange={(e) => setGuarantorName(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Relationship</label>
                  <input
                    type="text"
                    value={guarantorRelationship}
                    onChange={(e) => setGuarantorRelationship(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Guarantor Phone</label>
                  <input
                    type="text"
                    value={guarantorPhone}
                    onChange={(e) => setGuarantorPhone(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Guarantor Address</label>
                  <input
                    type="text"
                    value={guarantorAddress}
                    onChange={(e) => setGuarantorAddress(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Security Type</label>
                  <select
                    value={securityType}
                    onChange={(e) => setSecurityType(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="Cheque">Cheque</option>
                    <option value="Promissory Note">Promissory Note</option>
                    <option value="Property Documents">Property Documents</option>
                    <option value="Salary Slip">Salary Slip</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Security Details / Value</label>
                  <input
                    type="text"
                    value={securityValue}
                    onChange={(e) => setSecurityValue(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. Cheque #401928 HDFC"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div style={{
            padding: '1rem 1.75rem',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.6rem 1.4rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
              }}
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{loading ? 'Saving...' : 'Save User Details'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
