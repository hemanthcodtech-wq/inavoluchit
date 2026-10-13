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
  Lock, 
  Eye, 
  EyeOff, 
  Upload, 
  Check, 
  RefreshCw, 
  Copy, 
  Calendar,
  AlertCircle
} from 'lucide-react';

const AdminUserRegistrationModal = ({ isOpen, onClose, onUserCreated }) => {
  const { token, API_URL } = useAuth();

  // Active section tab
  const [activeSection, setActiveSection] = useState('all');

  // Form State
  const [memberId, setMemberId] = useState('');
  const [isCustomMemberId, setIsCustomMemberId] = useState(false);

  // 1. Personal Details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [pincode, setPincode] = useState('');
  const [remarks, setRemarks] = useState('');

  // 2. KYC Details
  const [panNumber, setPanNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile] = useState(null);

  // 3. Nominee Details
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelationship, setNomineeRelationship] = useState('Spouse');
  const [nomineePhone, setNomineePhone] = useState('');
  const [nomineeDob, setNomineeDob] = useState('');
  const [nomineeType, setNomineeType] = useState('Primary');
  const [nomineeAddress, setNomineeAddress] = useState('');
  const [nomineeRemarks, setNomineeRemarks] = useState('');

  // 4. Guarantor / Security Details
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

  // 5. Temporary Password
  const [temporaryPassword, setTemporaryPassword] = useState('Temp@1234');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetchingId, setFetchingId] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch next auto-generated Member ID on modal open
  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetchNextMemberId();
    }
  }, [isOpen]);

  const fetchNextMemberId = async () => {
    setFetchingId(true);
    try {
      const res = await fetch(`${API_URL}/auth/next-member-id`);
      const data = await res.json();
      if (data.success && data.memberId) {
        setMemberId(data.memberId);
      } else {
        setMemberId(`ANR${Math.floor(100 + Math.random() * 900)}`);
      }
    } catch {
      setMemberId(`ANR${Math.floor(100 + Math.random() * 900)}`);
    } finally {
      setFetchingId(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = 'InaVolu@';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTemporaryPassword(rand);
  };

  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(temporaryPassword);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setWhatsappNumber('');
    setEmail('');
    setGender('Male');
    setDob('');
    setOccupation('');
    setAddress('');
    setCity('');
    setState('Andhra Pradesh');
    setPincode('');
    setRemarks('');
    setPanNumber('');
    setAadharNumber('');
    setAadharFile(null);
    setPanFile(null);
    setNomineeName('');
    setNomineeRelationship('Spouse');
    setNomineePhone('');
    setNomineeDob('');
    setNomineeType('Primary');
    setNomineeAddress('');
    setNomineeRemarks('');
    setGuarantorRequired('No');
    setGuarantorName('');
    setGuarantorRelationship('');
    setGuarantorPhone('');
    setGuarantorAddress('');
    setGuarantorKycStatus('Pending');
    setSecurityType('Cheque');
    setSecurityValue('');
    setSecurityVerificationStatus('Pending');
    setSecurityRemarks('');
    setTemporaryPassword('Temp@1234');
    setIsCustomMemberId(false);
    setError('');
    setSuccess('');
    setActiveSection('all');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validations for all required details
    if (!name.trim()) {
      setError('Please enter member Full Name.');
      return;
    }
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit Mobile Number.');
      return;
    }
    const cleanWhatsapp = whatsappNumber.trim().replace(/\D/g, '');
    if (cleanWhatsapp.length < 10) {
      setError('Please enter a valid 10-digit WhatsApp Number.');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Please enter a valid Email Address.');
      return;
    }
    if (!gender) {
      setError('Please select Gender.');
      return;
    }
    if (!dob) {
      setError('Please select Date of Birth.');
      return;
    }
    if (!occupation.trim()) {
      setError('Please enter Occupation.');
      return;
    }
    if (!city.trim()) {
      setError('Please enter City.');
      return;
    }
    if (!state.trim()) {
      setError('Please enter State.');
      return;
    }
    const cleanPincode = pincode.trim().replace(/\D/g, '');
    if (cleanPincode.length < 6) {
      setError('Please enter a valid 6-digit Pincode.');
      return;
    }
    if (!address.trim()) {
      setError('Please enter complete Residential Address.');
      return;
    }
    if (!temporaryPassword.trim() || temporaryPassword.trim().length < 6) {
      setError('Temporary Password must be at least 6 characters.');
      return;
    }

    // KYC validation
    const cleanAadhar = aadharNumber.trim().replace(/\D/g, '');
    if (cleanAadhar.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar Number.');
      return;
    }
    if (!aadharFile) {
      setError('Please upload Aadhaar Card Document / Photo.');
      return;
    }
    const cleanPan = panNumber.trim().toUpperCase();
    if (!cleanPan || cleanPan.length < 10) {
      setError('Please enter a valid 10-character PAN Number.');
      return;
    }
    if (!panFile) {
      setError('Please upload PAN Card Document / Photo.');
      return;
    }

    // Nominee validation
    if (!nomineeName.trim()) {
      setError('Please enter Nominee Full Name.');
      return;
    }
    if (!nomineeRelationship.trim()) {
      setError('Please select Nominee Relationship.');
      return;
    }
    const cleanNomineePhone = nomineePhone.trim().replace(/\D/g, '');
    if (cleanNomineePhone.length < 10) {
      setError('Please enter a valid 10-digit Nominee Mobile Number.');
      return;
    }
    if (!nomineeDob) {
      setError('Please select Nominee Date of Birth.');
      return;
    }
    if (!nomineeAddress.trim()) {
      setError('Please enter Nominee Residential Address.');
      return;
    }

    // Guarantor validation if enabled
    if (guarantorRequired === 'Yes') {
      if (!guarantorName.trim()) {
        setError('Please enter Guarantor Name.');
        return;
      }
      if (!guarantorRelationship.trim()) {
        setError('Please enter Relationship with Member.');
        return;
      }
      const cleanGPhone = guarantorPhone.trim().replace(/\D/g, '');
      if (cleanGPhone.length < 10) {
        setError('Please enter a valid 10-digit Guarantor Mobile Number.');
        return;
      }
      if (!guarantorAddress.trim()) {
        setError('Please enter Guarantor Residential Address.');
        return;
      }
      if (!securityValue.trim()) {
        setError('Please enter Security Value (₹).');
        return;
      }
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('memberId', memberId.trim());
      formData.append('name', name.trim());
      formData.append('phone', phone.trim());
      formData.append('whatsappNumber', whatsappNumber.trim());
      formData.append('email', email.trim());
      formData.append('gender', gender);
      formData.append('dob', dob);
      formData.append('occupation', occupation.trim());
      formData.append('address', address.trim());
      formData.append('city', city.trim());
      formData.append('state', state.trim());
      formData.append('pincode', pincode.trim());
      formData.append('remarks', remarks.trim());

      formData.append('panNumber', panNumber.trim().toUpperCase());
      formData.append('aadharNumber', aadharNumber.trim());
      if (aadharFile) formData.append('aadhar', aadharFile);
      if (panFile) formData.append('pan', panFile);

      formData.append('nomineeName', nomineeName.trim());
      formData.append('nomineeRelationship', nomineeRelationship.trim());
      formData.append('nomineePhone', nomineePhone.trim());
      formData.append('nomineeDob', nomineeDob);
      formData.append('nomineeType', nomineeType);
      formData.append('nomineeAddress', nomineeAddress.trim());
      formData.append('nomineeRemarks', nomineeRemarks.trim());

      formData.append('guarantorRequired', guarantorRequired);
      formData.append('guarantorName', guarantorName.trim());
      formData.append('guarantorRelationship', guarantorRelationship.trim());
      formData.append('guarantorPhone', guarantorPhone.trim());
      formData.append('guarantorAddress', guarantorAddress.trim());
      formData.append('guarantorKycStatus', guarantorKycStatus);
      formData.append('securityType', securityType);
      formData.append('securityValue', securityValue);
      formData.append('securityVerificationStatus', securityVerificationStatus);
      formData.append('securityRemarks', securityRemarks.trim());

      formData.append('temporaryPassword', temporaryPassword.trim());

      const res = await fetch(`${API_URL}/admin/users/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Member registered successfully! Member ID: ${data.data?.memberId || memberId}`);
        if (onUserCreated) {
          onUserCreated(data.data);
        }
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setError(data.message || 'Failed to register member.');
      }
    } catch (err) {
      console.error('Error registering member:', err);
      setError(err.message || 'Connection error registering user.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '1.25rem',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(37, 99, 235, 0.15)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          backgroundColor: '#0f3922',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <User size={18} color="#818cf8" />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Manual User Registration
              </h2>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: 'rgba(74, 222, 128, 0.2)',
                color: '#818cf8',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Admin Portal
              </span>
            </div>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
              Fill in the member details to register and activate their account immediately.
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{
            padding: '1.5rem 1.75rem',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.75rem'
          }}>

            {error && (
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: '0.65rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                borderRadius: '0.65rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Check size={18} />
                <span>{success}</span>
              </div>
            )}

            {/* Auto-Generated Member ID Card */}
            <div style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#eff6ff',
              borderRadius: '0.85rem',
              border: '1px solid #a5b4fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <ShieldCheck size={18} color="#1d4ed8" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Auto-Generated Member ID *
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem' }}>
                  {isCustomMemberId ? (
                    <input
                      type="text"
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      placeholder="e.g. ANR105"
                      style={{
                        padding: '0.35rem 0.65rem',
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: '#2563eb',
                        borderRadius: '0.45rem',
                        border: '1.5px solid #2563eb',
                        outline: 'none',
                        width: '140px'
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1d4ed8', letterSpacing: '0.05em' }}>
                      {fetchingId ? 'Generating...' : memberId || 'INA---'}
                    </span>
                  )}
                  <span style={{ fontSize: '0.78rem', color: '#4b5563', fontStyle: 'italic' }}>
                    {isCustomMemberId ? '(Custom assigned ID)' : '(Next sequential membership ID)'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={fetchNextMemberId}
                  disabled={fetchingId}
                  title="Generate Fresh ID"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #bfdbfe',
                    backgroundColor: '#ffffff',
                    color: '#2563eb',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={13} className={fetchingId ? 'spin' : ''} />
                  <span>Refresh ID</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomMemberId(!isCustomMemberId)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isCustomMemberId ? 'Use Auto ID' : 'Edit Custom ID'}
                </button>
              </div>
            </div>

            {/* 1. PERSONAL DETAILS */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '1.25rem', backgroundColor: '#fafaf9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ backgroundColor: '#1d4ed8', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                  1
                </span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                  Personal Details
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter member full name"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="WhatsApp number (if different)"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@example.com (optional)"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Gender
                  </label>
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
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Business / Salaried / Self-Employed"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="6-digit pincode"
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Residential Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Door No, Street name, Locality, Landmark..."
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Any internal notes or references"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* 2. KYC DETAILS */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '1.25rem', backgroundColor: '#fafaf9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ backgroundColor: '#1d4ed8', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                  2
                </span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                  KYC Details & Documents
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    value={aadharNumber}
                    onChange={(e) => setAadharNumber(e.target.value)}
                    placeholder="12-digit Aadhaar Number"
                    style={inputStyle}
                  />

                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                      Aadhaar Document Upload
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: '1.5px dashed #cbd5e1',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      color: aadharFile ? '#1d4ed8' : '#64748b'
                    }}>
                      <Upload size={16} color={aadharFile ? '#1d4ed8' : '#94a3b8'} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {aadharFile ? aadharFile.name : 'Choose Aadhaar Card image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setAadharFile(e.target.files[0] || null)}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="10-digit PAN (e.g. ABCDE1234F)"
                    style={inputStyle}
                  />

                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                      PAN Document Upload
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: '1.5px dashed #cbd5e1',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      color: panFile ? '#1d4ed8' : '#64748b'
                    }}>
                      <Upload size={16} color={panFile ? '#1d4ed8' : '#94a3b8'} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {panFile ? panFile.name : 'Choose PAN Card image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPanFile(e.target.files[0] || null)}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. NOMINEE DETAILS */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '1.25rem', backgroundColor: '#fafaf9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ backgroundColor: '#1d4ed8', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                  3
                </span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                  Nominee Details
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Nominee Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomineeName}
                    onChange={(e) => setNomineeName(e.target.value)}
                    placeholder="Enter nominee name"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Relationship *
                  </label>
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
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Nominee Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={nomineePhone}
                    onChange={(e) => setNomineePhone(e.target.value)}
                    placeholder="Nominee contact number"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Nominee Date of Birth
                  </label>
                  <input
                    type="date"
                    value={nomineeDob}
                    onChange={(e) => setNomineeDob(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Nominee Type
                  </label>
                  <input
                    type="text"
                    value={nomineeType}
                    onChange={(e) => setNomineeType(e.target.value)}
                    placeholder="Primary"
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Nominee Address
                  </label>
                  <input
                    type="text"
                    value={nomineeAddress}
                    onChange={(e) => setNomineeAddress(e.target.value)}
                    placeholder="Same as member or specific address"
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Nominee Remarks
                  </label>
                  <input
                    type="text"
                    value={nomineeRemarks}
                    onChange={(e) => setNomineeRemarks(e.target.value)}
                    placeholder="Remarks"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* 4. GUARANTOR / SECURITY DETAILS */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '1.25rem', backgroundColor: '#fafaf9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ backgroundColor: '#1d4ed8', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                    4
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                    Guarantor / Security Details
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                    (Optional / When applicable)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Guarantor Required:</span>
                  <select
                    value={guarantorRequired}
                    onChange={(e) => setGuarantorRequired(e.target.value)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '0.45rem',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      backgroundColor: guarantorRequired === 'Yes' ? '#e0f2fe' : '#ffffff',
                      color: guarantorRequired === 'Yes' ? '#0369a1' : '#334155'
                    }}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>

              {guarantorRequired === 'Yes' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Guarantor Name
                    </label>
                    <input
                      type="text"
                      value={guarantorName}
                      onChange={(e) => setGuarantorName(e.target.value)}
                      placeholder="Guarantor full name"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Relationship with Member
                    </label>
                    <input
                      type="text"
                      value={guarantorRelationship}
                      onChange={(e) => setGuarantorRelationship(e.target.value)}
                      placeholder="Friend / Relative / Colleague"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Guarantor Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={guarantorPhone}
                      onChange={(e) => setGuarantorPhone(e.target.value)}
                      placeholder="Guarantor phone number"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      KYC Status
                    </label>
                    <select
                      value={guarantorKycStatus}
                      onChange={(e) => setGuarantorKycStatus(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Verified">Verified</option>
                      <option value="Under Review">Under Review</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Security Type
                    </label>
                    <select
                      value={securityType}
                      onChange={(e) => setSecurityType(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="Cheque">Signed Cheque</option>
                      <option value="Property">Property Documents</option>
                      <option value="Promissory Note">Promissory Note</option>
                      <option value="Gold">Gold Deposit</option>
                      <option value="Salary Slip">Salary Certificate</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Security Value (₹)
                    </label>
                    <input
                      type="text"
                      value={securityValue}
                      onChange={(e) => setSecurityValue(e.target.value)}
                      placeholder="Estimated value in INR"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Security Verification Status
                    </label>
                    <select
                      value={securityVerificationStatus}
                      onChange={(e) => setSecurityVerificationStatus(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Verified">Verified</option>
                      <option value="Waived">Waived</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Guarantor Address
                    </label>
                    <input
                      type="text"
                      value={guarantorAddress}
                      onChange={(e) => setGuarantorAddress(e.target.value)}
                      placeholder="Guarantor residential address"
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Security Remarks
                    </label>
                    <input
                      type="text"
                      value={securityRemarks}
                      onChange={(e) => setSecurityRemarks(e.target.value)}
                      placeholder="Security particulars or cheque numbers"
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. TEMPORARY PASSWORD CREDENTIALS */}
            <div style={{
              border: '1.5px solid #ca8a04',
              borderRadius: '0.85rem',
              padding: '1.25rem',
              backgroundColor: '#fefce8'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <Lock size={18} color="#ca8a04" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#854d0e' }}>
                  Temporary Password for Member Login *
                </h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#713f12', margin: '0 0 1rem 0' }}>
                Set a temporary password for this member. They will use this password to sign in to their mobile/web portal.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '260px' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    placeholder="Enter temporary password"
                    style={{
                      ...inputStyle,
                      paddingRight: '2.5rem',
                      fontWeight: 700,
                      backgroundColor: '#ffffff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={generateRandomPassword}
                  style={{
                    padding: '0.55rem 0.95rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #ca8a04',
                    backgroundColor: '#ffffff',
                    color: '#854d0e',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Generate Random
                </button>

                <button
                  type="button"
                  onClick={copyPasswordToClipboard}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.55rem 0.95rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #ca8a04',
                    backgroundColor: copiedPass ? '#854d0e' : '#ffffff',
                    color: copiedPass ? '#ffffff' : '#854d0e',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <Copy size={14} />
                  <span>{copiedPass ? 'Copied!' : 'Copy Password'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div style={{
            padding: '1.25rem 1.75rem',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '1rem',
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#2563eb'; }}
              onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Registering Member...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>Register & Activate Member</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '0.55rem 0.85rem',
  borderRadius: '0.5rem',
  border: '1px solid #cbd5e1',
  fontSize: '0.88rem',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff'
};

export default AdminUserRegistrationModal;
