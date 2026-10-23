import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  Camera,
  RotateCw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';

const AdminUserRegistrationModal = ({ isOpen, onClose, onUserCreated }) => {
  const { token, API_URL } = useAuth();

  // Wizard Steps: 1: Official & Contact, 2: Address & Nominee, 3: KYC & Photo Proofs, 4: Security & Credentials
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [memberId, setMemberId] = useState('');
  const [isCustomMemberId, setIsCustomMemberId] = useState(false);

  // 1. Official & Contact Details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [occupation, setOccupation] = useState('');

  // 2. Residential Address
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [pincode, setPincode] = useState('');
  const [remarks, setRemarks] = useState('');

  // 3. KYC Details & Images
  const [aadharNumber, setAadharNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  
  // Files (Uploaded file or captured blob)
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const [aadharFile, setAadharFile] = useState(null);
  const [aadharPreview, setAadharPreview] = useState('');

  const [panFile, setPanFile] = useState(null);
  const [panPreview, setPanPreview] = useState('');

  // Camera capture modal/stream state: 'photo' | 'aadhar' | 'pan' | null
  const [cameraActiveTarget, setCameraActiveTarget] = useState(null);
  const [cameraFacingMode, setCameraFacingMode] = useState('user'); // 'user' or 'environment'
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState('');

  // 4. Nominee Details (Optional / Flexible)
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelationship, setNomineeRelationship] = useState('Spouse');
  const [nomineePhone, setNomineePhone] = useState('');
  const [nomineeDob, setNomineeDob] = useState('');
  const [nomineeType, setNomineeType] = useState('Primary');
  const [nomineeAddress, setNomineeAddress] = useState('');
  const [nomineeRemarks, setNomineeRemarks] = useState('');

  // 5. Guarantor / Security Details
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

  // 6. Temporary Password
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

  // Clean up camera stream on unmount or target change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActiveTarget(null);
    setCameraError('');
  };

  const startCamera = async (target, facing = 'user') => {
    stopCamera();
    setCameraActiveTarget(target);
    setCameraFacingMode(facing);
    setCameraError('');

    try {
      const constraints = {
        video: {
          facingMode: target === 'photo' ? facing : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. Please enable permissions or upload a file directly.');
    }
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    // Flip horizontally if front camera user photo
    if (cameraFacingMode === 'user' && cameraActiveTarget === 'photo') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `${cameraActiveTarget}_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);

      if (cameraActiveTarget === 'photo') {
        setPhotoFile(file);
        setPhotoPreview(previewUrl);
      } else if (cameraActiveTarget === 'aadhar') {
        setAadharFile(file);
        setAadharPreview(previewUrl);
      } else if (cameraActiveTarget === 'pan') {
        setPanFile(file);
        setPanPreview(previewUrl);
      }

      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const fetchNextMemberId = async () => {
    setFetchingId(true);
    try {
      const res = await fetch(`${API_URL}/auth/next-member-id`);
      const data = await res.json();
      if (data.success && data.memberId) {
        setMemberId(data.memberId);
      } else {
        setMemberId(`INA${Math.floor(100 + Math.random() * 900)}`);
      }
    } catch {
      setMemberId(`INA${Math.floor(100 + Math.random() * 900)}`);
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
    setCurrentStep(1);
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
    setPhotoFile(null);
    setPhotoPreview('');
    setAadharFile(null);
    setAadharPreview('');
    setPanFile(null);
    setPanPreview('');
    stopCamera();
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
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    if (type === 'photo') {
      setPhotoFile(file);
      setPhotoPreview(previewUrl);
    } else if (type === 'aadhar') {
      setAadharFile(file);
      setAadharPreview(previewUrl);
    } else if (type === 'pan') {
      setPanFile(file);
      setPanPreview(previewUrl);
    }
  };

  const validateStep = (step) => {
    setError('');
    if (step === 1) {
      if (!name.trim()) {
        setError('Please enter member Full Name.');
        return false;
      }
      const cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        setError('Please enter a valid 10-digit Official Mobile Number.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!address.trim()) {
        setError('Please enter Residential Address.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      const cleanAadhar = aadharNumber.trim().replace(/\D/g, '');
      if (cleanAadhar.length !== 12) {
        setError('Please enter a valid 12-digit Aadhaar Number (Mandatory).');
        return false;
      }
      if (!aadharFile) {
        setError('Aadhaar Document proof is Mandatory. Upload file or capture photo.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Final checks
    if (!name.trim()) {
      setError('Please enter member Full Name.');
      setCurrentStep(1);
      return;
    }
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit Mobile Number.');
      setCurrentStep(1);
      return;
    }
    if (!address.trim()) {
      setError('Please enter Residential Address.');
      setCurrentStep(2);
      return;
    }
    const cleanAadhar = aadharNumber.trim().replace(/\D/g, '');
    if (cleanAadhar.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar Number.');
      setCurrentStep(3);
      return;
    }
    if (!aadharFile) {
      setError('Aadhaar document upload/capture is mandatory.');
      setCurrentStep(3);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('memberId', memberId.trim());
      formData.append('name', name.trim());
      formData.append('phone', phone.trim());
      formData.append('whatsappNumber', whatsappNumber.trim() || phone.trim());
      formData.append('email', email.trim());
      formData.append('gender', gender);
      formData.append('dob', dob);
      formData.append('occupation', occupation.trim());
      formData.append('address', address.trim());
      formData.append('city', city.trim());
      formData.append('state', state.trim());
      formData.append('pincode', pincode.trim());
      formData.append('remarks', remarks.trim());

      formData.append('aadharNumber', aadharNumber.trim());
      formData.append('panNumber', panNumber.trim().toUpperCase());

      // Proofs & User Live Photo
      if (photoFile) formData.append('photo', photoFile);
      if (aadharFile) formData.append('aadhar', aadharFile);
      if (panFile) formData.append('pan', panFile);

      // Nominee details
      formData.append('nomineeName', nomineeName.trim());
      formData.append('nomineeRelationship', nomineeRelationship.trim());
      formData.append('nomineePhone', nomineePhone.trim());
      formData.append('nomineeDob', nomineeDob);
      formData.append('nomineeType', nomineeType);
      formData.append('nomineeAddress', nomineeAddress.trim());
      formData.append('nomineeRemarks', nomineeRemarks.trim());

      // Guarantor / Security
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
        setSuccess(`Member "${data.data?.name || name}" registered and verified successfully! Member ID: ${data.data?.memberId || memberId}`);
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

  const stepsList = [
    { num: 1, title: 'Official & Contact', desc: 'Name, Phone & Profile' },
    { num: 2, title: 'Address & Nominee', desc: 'Residential & Nominee' },
    { num: 3, title: 'KYC & Live Capture', desc: 'Aadhaar (Req), PAN & Pic' },
    { num: 4, title: 'Portal Password', desc: 'Set Password & Activate' },
  ];

  return (
    <div 
      className="admin-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '1.25rem',
        boxSizing: 'border-box'
      }}>
      <div 
        className="admin-modal-card"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1.5rem',
          width: '100%',
          maxWidth: '1040px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 30px 70px -15px rgba(15, 23, 42, 0.45)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          overflow: 'hidden'
        }}>
        {/* Modal Top Header */}
        <div 
          className="admin-modal-header"
          style={{
            padding: '1.35rem 2rem',
            background: 'linear-gradient(135deg, #0a1f14 0%, #164e2e 50%, #1e3a8a 100%)',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div 
                className="admin-modal-header-icon"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                <User size={22} color="#fcd34d" />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h2 
                    className="admin-modal-header-title"
                    style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', lineHeight: 1.25 }}>
                    New Member Onboarding
                  </h2>
                  <span 
                    className="admin-modal-header-badge"
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      backgroundColor: 'rgba(252, 211, 77, 0.2)',
                      color: '#fcd34d',
                      padding: '0.15rem 0.6rem',
                      borderRadius: '9999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      border: '1px solid rgba(252, 211, 77, 0.3)',
                      whiteSpace: 'nowrap'
                    }}>
                    Official Admin Entry
                  </span>
                </div>
                <p 
                  className="admin-modal-header-desc"
                  style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#e2e8f0' }}>
                  Register member with official contact, residential address, KYC (Aadhaar Mandatory, PAN Optional), and user live photo.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => { stopCamera(); onClose(); }}
            type="button"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div 
          className="admin-modal-stepper"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '0.85rem 2rem',
            gap: '1rem'
          }}>
          {stepsList.map(step => {
            const isActive = currentStep === step.num;
            const isDone = currentStep > step.num;
            return (
              <div 
                key={step.num}
                className={`admin-modal-step-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                onClick={() => {
                  if (isDone) setCurrentStep(step.num);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  cursor: isDone ? 'pointer' : 'default',
                  opacity: isActive || isDone ? 1 : 0.65,
                  transition: 'opacity 0.2s'
                }}
              >
                <div 
                  className="admin-modal-step-circle"
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    backgroundColor: isDone ? '#16a34a' : (isActive ? '#2563eb' : '#cbd5e1'),
                    color: '#ffffff',
                    boxShadow: isActive ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none',
                    flexShrink: 0
                  }}>
                  {isDone ? <Check size={16} /> : step.num}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div 
                    className="admin-modal-step-title"
                    style={{ fontSize: '0.85rem', fontWeight: 800, color: isActive ? '#1e3a8a' : (isDone ? '#166534' : '#475569'), whiteSpace: 'nowrap' }}>
                    {step.title}
                  </div>
                  <div 
                    className="admin-modal-step-desc"
                    style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {step.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Main Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div 
            className="admin-modal-body"
            style={{
              padding: '1.75rem 2rem',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>

            {error && (
              <div style={{
                padding: '0.85rem 1.25rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{
                padding: '0.85rem 1.25rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                borderRadius: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <Check size={18} />
                <span>{success}</span>
              </div>
            )}

            {/* Auto-Generated Member ID Badge & Quick Switch */}
            <div 
              className="admin-modal-id-card"
              style={{
                padding: '0.9rem 1.25rem',
                background: 'linear-gradient(to right, #eff6ff, #f8fafc)',
                borderRadius: '0.85rem',
                border: '1.5px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.85rem'
              }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <ShieldCheck size={17} color="#2563eb" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Membership ID Allocation
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.25rem' }}>
                  {isCustomMemberId ? (
                    <input
                      type="text"
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      placeholder="e.g. INA101"
                      style={{
                        padding: '0.35rem 0.65rem',
                        fontSize: '1.15rem',
                        fontWeight: 900,
                        color: '#1d4ed8',
                        borderRadius: '0.45rem',
                        border: '2px solid #2563eb',
                        outline: 'none',
                        width: '160px',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1d4ed8', letterSpacing: '0.04em' }}>
                      {fetchingId ? 'Allocating...' : memberId || 'INA---'}
                    </span>
                  )}
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {isCustomMemberId ? '(Manual Custom ID)' : '(Next System Generated ID)'}
                  </span>
                </div>
              </div>

              <div className="admin-modal-id-card-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={fetchNextMemberId}
                  disabled={fetchingId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #bfdbfe',
                    backgroundColor: '#ffffff',
                    color: '#2563eb',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={14} className={fetchingId ? 'spin' : ''} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomMemberId(!isCustomMemberId)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isCustomMemberId ? 'Use Auto ID' : 'Edit Custom ID'}
                </button>
              </div>
            </div>

            {/* STEP 1: OFFICIAL DATA & CONTACT DETAILS */}
            {currentStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{
                  padding: '1.25rem',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 800 }}>1</div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      Official Personal & Contact Information
                    </h3>
                  </div>

                  <div 
                    className="admin-modal-grid-step1"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    <div className="admin-modal-span-2" style={{ gridColumn: 'span 2' }}>
                      <label style={labelStyle}>Full Official Name (As on Aadhaar) *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter full legal name"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Official Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setPhone(val);
                          if (!whatsappNumber) setWhatsappNumber(val);
                        }}
                        placeholder="10-digit primary phone"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>WhatsApp Number</label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="WhatsApp contact"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Official Email Address (Optional / Auto-Gen)</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="member@example.com"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Gender *</label>
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
                      <label style={labelStyle}>Date of Birth</label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Occupation / Business</label>
                      <input
                        type="text"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder="e.g. Salaried, Merchant, Farmer"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: RESIDENTIAL ADDRESS & NOMINEE DETAILS */}
            {currentStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Residential Address */}
                <div style={{
                  padding: '1.25rem',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 800 }}>2A</div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      Official Residential Address
                    </h3>
                  </div>

                  <div 
                    className="admin-modal-grid-step2"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.15rem' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Door No, Street & Area Address *</label>
                      <textarea
                        required
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House / Door No, Street name, Colony, Landmark..."
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>City / Town</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Madanapalle, Tirupati"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>State</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="State"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Pincode</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                        placeholder="6-digit pincode"
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Admin Internal Notes / Remarks (Optional)</label>
                      <input
                        type="text"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Internal comments or referral details"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>

                {/* Nominee Details (Optional / Flexible) */}
                <div style={{
                  padding: '1.25rem',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 800 }}>2B</div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                        Nominee Details (Optional)
                      </h3>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Can be updated anytime later</span>
                  </div>

                  <div 
                    className="admin-modal-grid-step2"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.15rem' }}>
                    <div>
                      <label style={labelStyle}>Nominee Name</label>
                      <input
                        type="text"
                        value={nomineeName}
                        onChange={(e) => setNomineeName(e.target.value)}
                        placeholder="Full name of nominee"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Relationship</label>
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
                        type="tel"
                        maxLength={10}
                        value={nomineePhone}
                        onChange={(e) => setNomineePhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="Nominee contact number"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Nominee Address</label>
                      <input
                        type="text"
                        value={nomineeAddress}
                        onChange={(e) => setNomineeAddress(e.target.value)}
                        placeholder="Same as member or specific"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: KYC PROOFS & USER PHOTO (AADHAAR MANDATORY, PAN OPTIONAL, PHOTO UPLOAD OR LIVE CAPTURE) */}
            {currentStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{
                  padding: '1.25rem',
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 800 }}>3</div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                          KYC Proofs & User Photograph
                        </h3>
                        <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                          Upload from device or capture directly using the device camera. All uploads are stored securely on Cloudinary.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3 Upload/Capture Cards */}
                  <div 
                    className="admin-modal-kyc-grid"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.35rem' }}>
                    
                    {/* 1. USER PROFILE PHOTO (Upload or Live Camera) */}
                    <div style={proofCardStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Camera size={18} color="#2563eb" />
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Member Photograph</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          Live / File
                        </span>
                      </div>

                      {photoPreview ? (
                        <div style={{ position: 'relative', width: '100%', height: '170px', borderRadius: '0.75rem', overflow: 'hidden', border: '1.5px solid #2563eb', backgroundColor: '#0f172a' }}>
                          <img src={photoPreview} alt="User Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => { setPhotoFile(null); setPhotoPreview(''); }}
                            style={removeBtnStyle}
                            title="Remove Photo"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{
                          border: '2px dashed #cbd5e1',
                          borderRadius: '0.75rem',
                          height: '170px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f8fafc',
                          padding: '1rem',
                          textAlign: 'center'
                        }}>
                          <User size={36} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Take portrait or upload image</span>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
                            <button
                              type="button"
                              onClick={() => startCamera('photo', 'user')}
                              style={actionBtnStyle}
                            >
                              <Camera size={14} />
                              <span>Live Capture</span>
                            </button>
                            <label style={{ ...actionBtnStyle, cursor: 'pointer', backgroundColor: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                              <Upload size={14} />
                              <span>Upload</span>
                              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} style={{ display: 'none' }} />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. AADHAAR CARD (MANDATORY) */}
                    <div style={{ ...proofCardStyle, borderColor: '#bfdbfe', backgroundColor: '#f0f7ff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <ShieldCheck size={18} color="#1d4ed8" />
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e3a8a' }}>Aadhaar Card Proof *</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ffffff', backgroundColor: '#dc2626', padding: '0.2rem 0.55rem', borderRadius: '4px' }}>
                          MANDATORY
                        </span>
                      </div>

                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ ...labelStyle, fontSize: '0.78rem', color: '#1e40af' }}>12-Digit Aadhaar Number *</label>
                        <input
                          type="text"
                          required
                          maxLength={12}
                          value={aadharNumber}
                          onChange={(e) => setAadharNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 548912345678"
                          style={{ ...inputStyle, backgroundColor: '#ffffff', borderColor: '#93c5fd' }}
                        />
                      </div>

                      {aadharPreview ? (
                        <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '0.75rem', overflow: 'hidden', border: '1.5px solid #2563eb' }}>
                          <img src={aadharPreview} alt="Aadhaar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => { setAadharFile(null); setAadharPreview(''); }}
                            style={removeBtnStyle}
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{
                          border: '2px dashed #93c5fd',
                          borderRadius: '0.75rem',
                          height: '140px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#ffffff',
                          padding: '0.75rem',
                          textAlign: 'center'
                        }}>
                          <FileText size={32} color="#3b5bdb" style={{ marginBottom: '0.35rem' }} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d4ed8' }}>Aadhaar Image / Scan</span>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                            <button
                              type="button"
                              onClick={() => startCamera('aadhar', 'environment')}
                              style={actionBtnStyle}
                            >
                              <Camera size={14} />
                              <span>Live Scan</span>
                            </button>
                            <label style={{ ...actionBtnStyle, cursor: 'pointer', backgroundColor: '#ffffff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                              <Upload size={14} />
                              <span>Upload File</span>
                              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'aadhar')} style={{ display: 'none' }} />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. PAN CARD (OPTIONAL) */}
                    <div style={proofCardStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <FileText size={18} color="#059669" />
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>PAN Card</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          OPTIONAL
                        </span>
                      </div>

                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ ...labelStyle, fontSize: '0.78rem' }}>10-Digit PAN Number (Optional)</label>
                        <input
                          type="text"
                          maxLength={10}
                          value={panNumber}
                          onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. ABCDE1234F"
                          style={inputStyle}
                        />
                      </div>

                      {panPreview ? (
                        <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '0.75rem', overflow: 'hidden', border: '1.5px solid #059669' }}>
                          <img src={panPreview} alt="PAN Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => { setPanFile(null); setPanPreview(''); }}
                            style={removeBtnStyle}
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{
                          border: '2px dashed #cbd5e1',
                          borderRadius: '0.75rem',
                          height: '140px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f8fafc',
                          padding: '0.75rem',
                          textAlign: 'center'
                        }}>
                          <ImageIcon size={30} color="#94a3b8" style={{ marginBottom: '0.35rem' }} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>PAN document (if available)</span>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                            <button
                              type="button"
                              onClick={() => startCamera('pan', 'environment')}
                              style={{ ...actionBtnStyle, backgroundColor: '#059669' }}
                            >
                              <Camera size={14} />
                              <span>Scan</span>
                            </button>
                            <label style={{ ...actionBtnStyle, cursor: 'pointer', backgroundColor: '#ffffff', color: '#059669', border: '1px solid #a7f3d0' }}>
                              <Upload size={14} />
                              <span>Upload</span>
                              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'pan')} style={{ display: 'none' }} />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: MEMBER PORTAL PASSWORD & ACTIVATION */}
            {currentStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Temporary Password & Account Activation */}
                <div style={{
                  padding: '1.35rem',
                  borderRadius: '1rem',
                  border: '1.5px solid #fde047',
                  backgroundColor: '#fefce8'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    <Lock size={18} color="#ca8a04" />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#854d0e' }}>
                      Initial Member Portal Password *
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#713f12', margin: '0 0 1rem 0' }}>
                    Assign a temporary password for this new account. Member can sign in and change their password anytime.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px', maxWidth: '100%' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={temporaryPassword}
                        onChange={(e) => setTemporaryPassword(e.target.value)}
                        placeholder="Enter password"
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
                      <span>{copiedPass ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Modal Bottom Actions Footer */}
          <div 
            className="admin-modal-footer"
            style={{
              padding: '1.15rem 2rem',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '0.6rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Previous</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => { stopCamera(); onClose(); }}
                disabled={loading}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '0.6rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.6rem',
                    borderRadius: '0.6rem',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  <span>Continue</span>
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
                    padding: '0.65rem 1.85rem',
                    borderRadius: '0.6rem',
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)'
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Saving & Uploading to Cloudinary...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Complete & Activate Member</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Live Camera Stream Overlay Modal */}
        {cameraActiveTarget && (
          <div 
            className="admin-modal-camera-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.88)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '0.5rem',
              boxSizing: 'border-box'
            }}>
            <div style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#111827',
              borderRadius: '1.25rem',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxHeight: '92vh'
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#1f2937',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#ffffff',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Camera size={18} color="#60a5fa" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {cameraActiveTarget === 'photo' ? 'Capture Member Live Photo' : (cameraActiveTarget === 'aadhar' ? 'Scan Aadhaar Document' : 'Scan PAN Document')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ position: 'relative', width: '100%', height: 'min(300px, 45vh)', backgroundColor: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {cameraError ? (
                  <div style={{ color: '#ef4444', padding: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    <AlertCircle size={32} style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                    {cameraError}
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: cameraFacingMode === 'user' && cameraActiveTarget === 'photo' ? 'scaleX(-1)' : 'none'
                    }}
                  />
                )}
              </div>

              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#1f2937',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={() => startCamera(cameraActiveTarget, cameraFacingMode === 'user' ? 'environment' : 'user')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <RotateCw size={14} />
                  <span>Switch</span>
                </button>

                <button
                  type="button"
                  onClick={captureSnapshot}
                  disabled={Boolean(cameraError)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '9999px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: cameraError ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
                  }}
                >
                  <Camera size={16} />
                  <span>Capture Photo</span>
                </button>

                <button
                  type="button"
                  onClick={stopCamera}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0.4rem 0.6rem'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const labelStyle = {
  display: 'block',
  fontSize: '0.84rem',
  fontWeight: 700,
  color: '#334155',
  marginBottom: '0.35rem'
};

const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.85rem',
  borderRadius: '0.55rem',
  border: '1.5px solid #cbd5e1',
  fontSize: '0.9rem',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#f8fafc',
  transition: 'border-color 0.2s, background-color 0.2s'
};

const proofCardStyle = {
  border: '1.5px solid #e2e8f0',
  borderRadius: '0.85rem',
  padding: '1rem',
  backgroundColor: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
};

const actionBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.45rem 0.85rem',
  borderRadius: '0.5rem',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.78rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background 0.2s'
};

const removeBtnStyle = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  backgroundColor: 'rgba(239, 68, 68, 0.9)',
  color: '#ffffff',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
};

export default AdminUserRegistrationModal;
