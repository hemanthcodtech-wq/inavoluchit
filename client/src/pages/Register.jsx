import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  Lock,
  Upload,
  CheckCircle,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Check,
  Download,
  AlertCircle,
  FileText,
  Users,
  MapPin,
  Calendar,
  Sparkles
} from 'lucide-react';
import logoImg from '../assets/logo.jpeg';
import heroImg from '../assets/hero-illustration.png';

const Register = () => {
  const { register, API_URL } = useAuth();
  const navigate = useNavigate();

  // Wizard Step State: 1 = Personal, 2 = KYC, 3 = Nominee, 4 = Guarantor/Security
  const [currentStep, setCurrentStep] = useState(1);

  // Auto-generated Member ID
  const [memberId, setMemberId] = useState('');
  const [fetchingId, setFetchingId] = useState(false);

  // 1. Personal Details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    fetchNextMemberId();

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

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

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
  };

  // Step Validation before proceeding
  const validateStep = (step) => {
    setError('');
    if (step === 1) {
      if (!name.trim()) {
        setError('Please enter your Full Name.');
        return false;
      }
      const cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        setError('Please enter a valid 10-digit Mobile Number.');
        return false;
      }
      const cleanWhatsapp = whatsappNumber.trim().replace(/\D/g, '');
      if (cleanWhatsapp.length < 10) {
        setError('Please enter a valid 10-digit WhatsApp Number.');
        return false;
      }
      if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
        setError('Please enter a valid Email Address.');
        return false;
      }
      if (!gender) {
        setError('Please select Gender.');
        return false;
      }
      if (!dob) {
        setError('Please select your Date of Birth.');
        return false;
      }
      if (!occupation.trim()) {
        setError('Please enter your Occupation.');
        return false;
      }
      if (!city.trim()) {
        setError('Please enter your City / Town.');
        return false;
      }
      if (!state.trim()) {
        setError('Please enter your State.');
        return false;
      }
      const cleanPincode = pincode.trim().replace(/\D/g, '');
      if (cleanPincode.length < 6) {
        setError('Please enter a valid 6-digit Pincode.');
        return false;
      }
      if (!address.trim()) {
        setError('Please enter your complete Residential Address.');
        return false;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.');
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return false;
      }
    }

    if (step === 2) {
      const cleanAadhar = aadharNumber.trim().replace(/\D/g, '');
      if (cleanAadhar.length !== 12) {
        setError('Please enter a valid 12-digit Aadhaar Number.');
        return false;
      }
      if (!aadharFile) {
        setError('Please upload your Aadhaar Card Document / Photo.');
        return false;
      }
      const cleanPan = panNumber.trim().toUpperCase();
      if (!cleanPan || cleanPan.length < 10) {
        setError('Please enter a valid 10-character PAN Number (e.g. ABCDE1234F).');
        return false;
      }
      if (!panFile) {
        setError('Please upload your PAN Card Document / Photo.');
        return false;
      }
    }

    if (step === 3) {
      if (!nomineeName.trim()) {
        setError('Please enter Nominee Full Name.');
        return false;
      }
      if (!nomineeRelationship.trim()) {
        setError('Please select Nominee Relationship.');
        return false;
      }
      const cleanNomineePhone = nomineePhone.trim().replace(/\D/g, '');
      if (cleanNomineePhone.length < 10) {
        setError('Please enter a valid 10-digit Nominee Mobile Number.');
        return false;
      }
      if (!nomineeDob) {
        setError('Please select Nominee Date of Birth.');
        return false;
      }
      if (!nomineeAddress.trim()) {
        setError('Please enter Nominee Address.');
        return false;
      }
    }

    if (step === 4) {
      if (guarantorRequired === 'Yes') {
        if (!guarantorName.trim()) {
          setError('Please enter Guarantor Name.');
          return false;
        }
        if (!guarantorRelationship.trim()) {
          setError('Please enter Relationship with Member.');
          return false;
        }
        const cleanGPhone = guarantorPhone.trim().replace(/\D/g, '');
        if (cleanGPhone.length < 10) {
          setError('Please enter a valid 10-digit Guarantor Mobile Number.');
          return false;
        }
        if (!guarantorAddress.trim()) {
          setError('Please enter Guarantor Residential Address.');
          return false;
        }
        if (!securityValue.trim()) {
          setError('Please enter Security Value (₹).');
          return false;
        }
      }
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setError('');
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check all 4 steps sequentially and switch to the failing step if invalid
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
      formData.append('password', password);
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

      const res = await register(formData);
      setSuccessData(res.user || { memberId, name });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS SCREEN
  if (successData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem', backgroundColor: '#fbfcf9' }}>
        <div className="glass-panel card-premium" style={{
          width: '100%',
          maxWidth: '520px',
          padding: '3rem 2.5rem',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(10, 30, 59, 0.1)',
          boxShadow: '0 20px 40px rgba(10, 30, 59, 0.08)'
        }}>
          <div style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            backgroundColor: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            border: '3px solid #a5b4fc'
          }}>
            <CheckCircle size={52} color="#3b5bdb" />
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#3b5bdb', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Registration Successful!
          </h2>

          <p style={{ color: '#4b5563', fontSize: '1rem', lineHeight: '1.6', marginBottom: '1.75rem' }}>
            Welcome to <strong>InaVolu Chit Funds</strong>. Your account has been registered and activated immediately!
          </p>

          <div style={{
            backgroundColor: '#eff6ff',
            padding: '1.25rem',
            borderRadius: '0.85rem',
            border: '1.5px solid #a5b4fc',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b5bdb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Your Member ID
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1d4ed8', letterSpacing: '0.08em', marginTop: '0.25rem' }}>
              {successData.memberId || memberId}
            </div>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: '#4b5563' }}>
              Please note down your Member ID for future correspondence and payment receipts.
            </p>
          </div>

          <Link to="/login" className="btn-primary" style={{
            display: 'flex',
            width: '100%',
            height: '50px',
            borderRadius: 'var(--radius-full)',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '1.05rem',
            boxShadow: '0 4px 16px rgba(10, 30, 59, 0.25)',
            textDecoration: 'none',
            color: '#ffffff'
          }}>
            Proceed to Login <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#f8fafc',
    }} className="register-page-container">

      {/* Desktop Left Column - Hero Illustration Banner */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem 3.5rem',
        background: 'linear-gradient(180deg, #ffffff 0%, #f0f0ff 100%)',
        borderRight: '1px solid #e2e8f0',
        position: 'relative',
        overflow: 'hidden'
      }} className="register-hero-section">

        {/* Header Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', zIndex: 10 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img 
              src={logoImg} 
              alt="InaVolu Chit Funds Private Limited" 
              onError={(e) => { e.currentTarget.src = '/logo.png'; }} 
              style={{ height: '54px', width: 'auto', maxHeight: '60px', maxWidth: '260px', objectFit: 'contain' }} 
            />
          </Link>
        </div>

        {/* Hero Text */}
        <div style={{ flex: 1, maxWidth: '440px', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            backgroundColor: '#eef2ff',
            border: '1px solid #c7d2fe',
            padding: '0.4rem 0.95rem',
            borderRadius: '9999px',
            color: '#1e3a8a',
            fontWeight: 700,
            fontSize: '0.82rem',
            marginBottom: '1.25rem',
            width: 'fit-content'
          }}>
            <Sparkles size={14} color="#4f6ee8" />
            <span>Instant Membership Registration</span>
          </div>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#124d2a', lineHeight: 1.2, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Start Saving with Trust & Transparency
          </h1>

          <p style={{ color: '#4b5563', fontSize: '0.98rem', lineHeight: 1.6, marginBottom: '2.25rem', fontWeight: 500 }}>
            Register your verified chit membership in minutes. Your Member ID will be assigned and activated instantly!
          </p>

          {/* Stepper overview pills on the left for desktop */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { step: 1, label: 'Personal Details', icon: <User size={15} /> },
              { step: 2, label: 'KYC & Documents', icon: <FileText size={15} /> },
              { step: 3, label: 'Nominee Information', icon: <Users size={15} /> },
              { step: 4, label: 'Guarantor & Security', icon: <ShieldCheck size={15} /> }
            ].map((s) => (
              <div 
                key={s.step} 
                onClick={() => { if (s.step < currentStep || validateStep(currentStep)) setCurrentStep(s.step); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1.15rem',
                  borderRadius: '0.75rem',
                  backgroundColor: currentStep === s.step ? '#3b5bdb' : (s.step < currentStep ? '#f0f0ff' : '#ffffff'),
                  color: currentStep === s.step ? '#ffffff' : (s.step < currentStep ? '#1e3a8a' : '#64748b'),
                  fontWeight: currentStep === s.step ? 800 : 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  border: currentStep === s.step ? 'none' : (s.step < currentStep ? '1.5px solid #c7d2fe' : '1px solid #e2e8f0'),
                  boxShadow: currentStep === s.step ? '0 4px 14px rgba(30, 107, 62, 0.25)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: currentStep === s.step ? 'rgba(255, 255, 255, 0.25)' : (s.step < currentStep ? '#1e3a8a' : '#f1f5f9'),
                  color: currentStep === s.step || s.step < currentStep ? '#ffffff' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}>
                  {s.step < currentStep ? <Check size={14} strokeWidth={3} /> : s.step}
                </div>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: '#1e3a8a',
            fontWeight: 600
          }}>
            <ShieldCheck size={16} />
            <span>Regulated under The Chit Funds Act, 1982</span>
          </div>

        </div>

        {/* Hero image preview at bottom */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
          <img 
            src={heroImg} 
            alt="Hero Illustration" 
            onError={(e) => { e.currentTarget.src = '/hero-illustration.png'; }} 
            style={{ width: '100%', maxWidth: '340px', height: 'auto', objectFit: 'contain' }} 
          />
        </div>
      </div>

      {/* Right Column - Registration Form Container */}
      <div className="register-form-wrapper" style={{
        flex: 1.4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2.5rem 2.5rem',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}>
        
        {/* Registration Card */}
        <div style={{ width: '100%', maxWidth: '720px' }}>
          
          {/* Mobile Header Logo */}
          <div className="mobile-register-header" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', width: '100%' }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', marginBottom: '0.75rem' }}>
              <img 
                src={logoImg} 
                alt="InaVolu Chit Funds Private Limited" 
                onError={(e) => { e.currentTarget.src = '/logo.png'; }} 
                style={{ width: '100%', maxWidth: '240px', height: 'auto', maxHeight: '56px', objectFit: 'contain', display: 'block' }} 
              />
            </Link>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e3a8a' }}>New Member Registration Portal</span>
          </div>
          
          {/* Stepper Header Pills for Mobile / Tablet */}
          <div className="mobile-stepper-bar" style={{
            display: 'none',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            position: 'relative',
            backgroundColor: '#ffffff',
            padding: '0.75rem',
            borderRadius: '1rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            {[
              { num: 1, label: 'Personal' },
              { num: 2, label: 'KYC' },
              { num: 3, label: 'Nominee' },
              { num: 4, label: 'Guarantor' }
            ].map((s) => (
              <div 
                key={s.num} 
                onClick={() => { if (s.num < currentStep || validateStep(currentStep)) setCurrentStep(s.num); }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  flex: 1, 
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: currentStep === s.num ? '#3b5bdb' : (s.num < currentStep ? '#1e3a8a' : '#f1f5f9'),
                  color: currentStep === s.num || s.num < currentStep ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  border: currentStep === s.num ? '2.5px solid #c7d2fe' : '2px solid transparent',
                  boxShadow: currentStep === s.num ? '0 0 0 3px rgba(30, 107, 62, 0.2)' : 'none',
                  transition: 'all 0.2s'
                }}>
                  {s.num < currentStep ? <Check size={14} strokeWidth={3} /> : s.num}
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: currentStep === s.num ? 800 : 600,
                  color: currentStep === s.num ? '#3b5bdb' : '#64748b',
                  marginTop: '0.25rem'
                }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Form Container Card */}
          <div className="glass-panel card-premium" style={{
            padding: '2.25rem 2.5rem',
            borderRadius: '1.25rem',
            backgroundColor: '#ffffff',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0'
          }}>

            {/* Back to Home Navigation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              paddingBottom: '0.85rem',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <Link
                to="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: '#64748b',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#3b5bdb'}
                onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
              >
                <ArrowLeft size={16} />
                <span>Back to Home</span>
              </Link>

              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                Step <strong style={{ color: '#3b5bdb' }}>{currentStep}</strong> of 4
              </span>
            </div>

            {/* Auto-Generated Member ID Notification */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1.25rem',
              backgroundColor: '#f0f0ff',
              borderRadius: '0.85rem',
              border: '1px solid #c7d2fe',
              marginBottom: '1.75rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={18} color="#1e3a8a" />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                    Auto-Assigned Member ID
                  </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#124d2a', letterSpacing: '0.05em' }}>
                    {fetchingId ? 'Generating...' : memberId}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#1e3a8a', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontWeight: 700 }}>
                Verified Format
              </span>
            </div>

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
                gap: '0.5rem',
                marginBottom: '1.5rem'
              }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* ================= STEP 1: PERSONAL DETAILS ================= */}
              {currentStep === 1 && (
                <div>
                  <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                      1. Personal Details
                    </h2>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      Enter your identity and address details. Fields marked with * are required.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Full Name *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Mobile Number *</label>
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
                      <label style={labelStyle}>WhatsApp Number *</label>
                      <input
                        type="tel"
                        required
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="10-digit WhatsApp number"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Email Address *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Gender *</label>
                      <select required value={gender} onChange={(e) => setGender(e.target.value)} style={inputStyle}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>Date of Birth *</label>
                      <input
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Occupation *</label>
                      <input
                        type="text"
                        required
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder="Business / Salaried / Professional"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>City *</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City / Town"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>State *</label>
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
                      <label style={labelStyle}>Pincode *</label>
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
                      <label style={labelStyle}>Residential Address *</label>
                      <textarea
                        required
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House / Door No, Street, Landmark, Area..."
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Password (Login) *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          style={{ ...inputStyle, paddingRight: '2.5rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={eyeBtnStyle}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Confirm Password *</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Remarks (Optional)</label>
                      <input
                        type="text"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Any additional information"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 2: KYC DETAILS ================= */}
              {currentStep === 2 && (
                <div>
                  <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                      2. KYC Details & Proof Uploads
                    </h2>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      Provide your Aadhaar and PAN numbers, along with clear photo or document copies. All fields are mandatory *.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                    {/* Aadhaar Section */}
                    <div style={cardSectionStyle}>
                      <label style={labelStyle}>Aadhaar Number *</label>
                      <input
                        type="text"
                        required
                        value={aadharNumber}
                        onChange={(e) => setAadharNumber(e.target.value)}
                        placeholder="12-digit Aadhaar Number"
                        style={inputStyle}
                      />

                      <div style={{ marginTop: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                          Aadhaar Document Upload *
                        </label>
                        <label style={uploadBoxStyle(!!aadharFile)}>
                          <Upload size={18} color={aadharFile ? '#1d4ed8' : '#94a3b8'} />
                          <span style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: aadharFile ? 700 : 500, color: aadharFile ? '#1d4ed8' : '#64748b' }}>
                            {aadharFile ? aadharFile.name : 'Choose Aadhaar card photo *'}
                          </span>
                          <input
                            type="file"
                            required
                            accept="image/*"
                            onChange={(e) => setAadharFile(e.target.files[0] || null)}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* PAN Section */}
                    <div style={cardSectionStyle}>
                      <label style={labelStyle}>PAN Number *</label>
                      <input
                        type="text"
                        required
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                        placeholder="10-digit PAN (e.g. ABCDE1234F)"
                        style={inputStyle}
                      />

                      <div style={{ marginTop: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                          PAN Document Upload *
                        </label>
                        <label style={uploadBoxStyle(!!panFile)}>
                          <Upload size={18} color={panFile ? '#1d4ed8' : '#94a3b8'} />
                          <span style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: panFile ? 700 : 500, color: panFile ? '#1d4ed8' : '#64748b' }}>
                            {panFile ? panFile.name : 'Choose PAN card photo *'}
                          </span>
                          <input
                            type="file"
                            required
                            accept="image/*"
                            onChange={(e) => setPanFile(e.target.files[0] || null)}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 3: NOMINEE DETAILS ================= */}
              {currentStep === 3 && (
                <div>
                  <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                      3. Nominee Details
                    </h2>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      Nominee details ensure the safety and legal inheritance of your chit fund deposits. All fields marked * are required.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Nominee Name *</label>
                      <input
                        type="text"
                        required
                        value={nomineeName}
                        onChange={(e) => setNomineeName(e.target.value)}
                        placeholder="Nominee full name"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Relationship *</label>
                      <select
                        required
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
                      <label style={labelStyle}>Nominee Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={nomineePhone}
                        onChange={(e) => setNomineePhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Nominee Date of Birth *</label>
                      <input
                        type="date"
                        required
                        value={nomineeDob}
                        onChange={(e) => setNomineeDob(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Nominee Type</label>
                      <input
                        type="text"
                        value={nomineeType}
                        onChange={(e) => setNomineeType(e.target.value)}
                        placeholder="Primary"
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Nominee Address *</label>
                      <input
                        type="text"
                        required
                        value={nomineeAddress}
                        onChange={(e) => setNomineeAddress(e.target.value)}
                        placeholder="Complete residential address of nominee"
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Remarks</label>
                      <input
                        type="text"
                        value={nomineeRemarks}
                        onChange={(e) => setNomineeRemarks(e.target.value)}
                        placeholder="Nominee remarks (optional)"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 4: GUARANTOR / SECURITY DETAILS ================= */}
              {currentStep === 4 && (
                <div>
                  <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                          4. Guarantor / Security Details
                        </h2>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                          Optional / Applicable when required for specific high-value schemes.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                          Guarantor Required:
                        </span>
                        <select
                          value={guarantorRequired}
                          onChange={(e) => setGuarantorRequired(e.target.value)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
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
                  </div>

                  {guarantorRequired === 'Yes' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label style={labelStyle}>Guarantor Name *</label>
                        <input
                          type="text"
                          required
                          value={guarantorName}
                          onChange={(e) => setGuarantorName(e.target.value)}
                          placeholder="Full name"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Relationship with Member *</label>
                        <input
                          type="text"
                          required
                          value={guarantorRelationship}
                          onChange={(e) => setGuarantorRelationship(e.target.value)}
                          placeholder="Friend / Relative / Colleague"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Guarantor Mobile Number *</label>
                        <input
                          type="tel"
                          required
                          value={guarantorPhone}
                          onChange={(e) => setGuarantorPhone(e.target.value)}
                          placeholder="10-digit mobile number"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>KYC Status</label>
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
                        <label style={labelStyle}>Security Type *</label>
                        <select
                          required
                          value={securityType}
                          onChange={(e) => setSecurityType(e.target.value)}
                          style={inputStyle}
                        >
                          <option value="Cheque">Signed Cheque</option>
                          <option value="Property">Property Documents</option>
                          <option value="Promissory Note">Promissory Note</option>
                          <option value="Gold">Gold Deposit</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>Security Value (₹) *</label>
                        <input
                          type="text"
                          required
                          value={securityValue}
                          onChange={(e) => setSecurityValue(e.target.value)}
                          placeholder="Estimated amount in ₹"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>Verification Status</label>
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
                        <label style={labelStyle}>Guarantor Residential Address *</label>
                        <input
                          type="text"
                          required
                          value={guarantorAddress}
                          onChange={(e) => setGuarantorAddress(e.target.value)}
                          placeholder="Complete guarantor address"
                          style={inputStyle}
                        />
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Security Remarks</label>
                        <input
                          type="text"
                          value={securityRemarks}
                          onChange={(e) => setSecurityRemarks(e.target.value)}
                          placeholder="Additional security particulars (optional)"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.75rem',
                      border: '1px dashed #cbd5e1',
                      color: '#64748b'
                    }}>
                      <ShieldCheck size={36} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                        Guarantor is currently marked as Not Required.
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem' }}>
                        Select "Yes" above if your chit scheme requires a third-party guarantor or financial security.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Form Navigation Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '2rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid #f1f5f9',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.65rem 1.35rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Previous</span>
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.75rem 1.85rem',
                      borderRadius: '0.65rem',
                      border: 'none',
                      backgroundColor: '#3b5bdb',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(30, 107, 62, 0.25)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#124d2a'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b5bdb'}
                  >
                    <span>Next: Step {currentStep + 1}</span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.85rem 2.25rem',
                      borderRadius: '0.65rem',
                      border: 'none',
                      backgroundColor: '#3b5bdb',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.98rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 16px rgba(30, 107, 62, 0.3)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#124d2a'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b5bdb'}
                  >
                    {loading ? (
                      <span>Activating Membership...</span>
                    ) : (
                      <>
                        <Check size={18} />
                        <span>Submit Registration & Activate</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Already have an account */}
          <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.92rem', color: '#4b5563' }}>
            Already have a registered member account?{' '}
            <Link to="/login" style={{ color: '#3b5bdb', fontWeight: 800, textDecoration: 'none' }}>
              Sign In to Portal
            </Link>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .register-hero-section {
            display: none !important;
          }
          .mobile-register-header {
            display: flex !important;
          }
          .mobile-stepper-bar {
            display: flex !important;
          }
          .register-form-wrapper {
            padding: 1.5rem 1rem !important;
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
          }
        }
        @media (max-width: 480px) {
          .register-form-wrapper {
            padding: 1rem 0.5rem !important;
          }
          .register-form-wrapper .card-premium {
            padding: 1.25rem 1rem !important;
            border-radius: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
};

const labelStyle = {
  display: 'block',
  fontSize: '0.84rem',
  fontWeight: 700,
  color: '#1e293b',
  marginBottom: '0.4rem',
  letterSpacing: '-0.01em'
};

const inputStyle = {
  width: '100%',
  padding: '0.72rem 0.95rem',
  borderRadius: '0.65rem',
  border: '1.5px solid #e2e8f0',
  fontSize: '0.9rem',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  transition: 'all 0.2s ease',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
};

const eyeBtnStyle = {
  position: 'absolute',
  right: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#64748b',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px'
};

const cardSectionStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '0.85rem',
  padding: '1.25rem',
  backgroundColor: '#f8fafc',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
};

const uploadBoxStyle = (hasFile) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
  padding: '0.75rem 1rem',
  borderRadius: '0.65rem',
  border: hasFile ? '1.5px solid #3b5bdb' : '1.5px dashed #cbd5e1',
  backgroundColor: hasFile ? '#f0f0ff' : '#ffffff',
  cursor: 'pointer',
  color: hasFile ? '#1e3a8a' : '#64748b',
  fontWeight: hasFile ? 700 : 500,
  transition: 'all 0.2s ease',
  boxShadow: hasFile ? '0 2px 8px rgba(30, 107, 62, 0.08)' : 'none'
});

export default Register;
