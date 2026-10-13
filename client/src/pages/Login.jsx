import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogIn,
  Mail,
  Lock,
  Smartphone,
  Eye,
  EyeOff,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  LockKeyhole,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  X,
  Check,
  Download
} from 'lucide-react';
import logoImg from '../assets/logo.jpeg';
import heroImg from '../assets/hero-illustration.png';
// Premium SVG Illustration matching the screenshot details
const ChitIllustration = () => (
  <svg viewBox="0 0 500 400" width="100%" height="100%" style={{ maxHeight: '320px' }} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Background Building / Bank */}
    <path d="M220 180h160v100H220z" fill="#f0f7f4" />
    <path d="M210 180l80-50 80 50v10h-160v-10z" fill="#e2efe8" />
    <path d="M250 190h15v90h-15zm40 0h15v90h-15zm40 0h15v90h-15z" fill="#cbe2d6" />
    <circle cx="300" cy="155" r="10" fill="#0a1e3b" />
    <polygon points="300,148 295,157 305,157" fill="#facc15" />

    {/* Big Green Piggy Bank */}
    <circle cx="330" cy="270" r="50" fill="#2e7d32" opacity="0.15" />
    <path d="M370 260c0-25-20-45-45-45s-50 20-50 45c0 15 8 28 20 36l-5 19h15l5-15h20l5 15h15l-5-19c12-8 20-21 20-36z" fill="#66bb6a" />
    {/* Piggy nose & ears */}
    <rect x="365" y="250" width="15" height="20" rx="7" fill="#4caf50" />
    <path d="M280 220l-10-20 20 10-10 10z" fill="#4caf50" />
    {/* Piggy eye */}
    <circle cx="345" cy="245" r="4" fill="#1b5e20" />
    {/* Piggy coin slot */}
    <rect x="310" y="210" width="20" height="6" rx="3" fill="#388e3c" />

    {/* Coin stacks */}
    <g transform="translate(390, 260)">
      <rect x="0" y="30" width="40" height="12" rx="6" fill="#facc15" />
      <rect x="0" y="24" width="40" height="12" rx="6" fill="#ca8a04" />
      <rect x="0" y="18" width="40" height="12" rx="6" fill="#facc15" />
      <rect x="0" y="12" width="40" height="12" rx="6" fill="#eab308" />
      <rect x="0" y="6" width="40" height="12" rx="6" fill="#ca8a04" />
      <rect x="0" y="0" width="40" height="12" rx="6" fill="#facc15" />
    </g>

    {/* Man placing coin */}
    <g transform="translate(180, 160)">
      {/* Body */}
      <rect x="25" y="50" width="25" height="80" rx="10" fill="#2e7d32" />
      <rect x="20" y="120" width="10" height="40" fill="#1f2937" />
      <rect x="40" y="120" width="10" height="40" fill="#1f2937" />
      {/* Head */}
      <circle cx="37" cy="35" r="12" fill="#ffcc80" />
      <path d="M30 28c5-5 12-2 15 2s0 10-5 10-10-9-10-12z" fill="#374151" />
      {/* Arms & Coin */}
      <path d="M48 60l35 15-5 10-30-15z" fill="#ffcc80" />
      <path d="M25 60l-15 35 10 5 15-30z" fill="#2e7d32" />
      {/* Golden Rupee Coin */}
      <circle cx="90" cy="80" r="14" fill="#facc15" />
      <circle cx="90" cy="80" r="10" fill="#ca8a04" />
      <text x="86" y="85" fill="#fff" fontSize="14" fontWeight="bold">₹</text>
    </g>

    {/* Woman sitting on coins */}
    <g transform="translate(380, 200)">
      {/* Stack she is sitting on */}
      <rect x="-10" y="90" width="50" height="15" rx="7" fill="#ca8a04" />
      <rect x="-10" y="78" width="50" height="15" rx="7" fill="#facc15" />
      <rect x="-10" y="66" width="50" height="15" rx="7" fill="#ca8a04" />
      <rect x="-10" y="54" width="50" height="15" rx="7" fill="#facc15" />
      <rect x="-10" y="42" width="50" height="15" rx="7" fill="#eab308" />
      <rect x="-10" y="30" width="50" height="15" rx="7" fill="#ca8a04" />

      {/* Woman Body */}
      <path d="M10 20c0-10 15-10 15 0v35H10V20z" fill="#facc15" />
      <path d="M15 50l-15 30h15l10-30z" fill="#1f2937" />
      <circle cx="17" cy="8" r="10" fill="#ffcc80" />
      <path d="M10 2c3-4 12-2 14 3s-2 10-7 10-7-9-7-13z" fill="#374151" />
      {/* Arm holding laptop */}
      <path d="M12 25l-20 15 5 5 15-15z" fill="#ffcc80" />
      {/* Laptop */}
      <rect x="-22" y="35" width="22" height="15" rx="2" fill="#374151" />
      <rect x="-20" y="48" width="20" height="4" fill="#9ca3af" />
    </g>

    {/* Security Badges floating */}
    <g transform="translate(390, 80)">
      <circle cx="20" cy="20" r="20" fill="#fff" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
      <path d="M14 18l4 4 8-8" stroke="#3b5bdb" strokeWidth="2.5" strokeLinecap="round" />
    </g>
    <g transform="translate(130, 220)">
      <circle cx="20" cy="20" r="20" fill="#fff" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
      <path d="M20 10l9 5v7c0 5-4 10-9 12-5-2-9-7-9-12v-7l9-5z" fill="#3b5bdb" opacity="0.2" />
      <path d="M20 12l7 4v6c0 4-3 8-7 10-4-2-7-6-7-10v-6l7-4z" fill="#3b5bdb" />
      <path d="M17 20l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);

const Login = () => {
  const { login, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const noticeMsg = location.state?.notice;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [loginMode, setLoginMode] = useState('password'); // 'password' or 'otp'
  const [otpStep, setOtpStep] = useState(1); // 1 = enter email, 2 = enter otp
  const [otpVal, setOtpVal] = useState('');
  const [otpSentTo, setOtpSentTo] = useState('');

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // We've used the prompt, and can't use it again, throw it away
      setDeferredPrompt(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(email, password);
      if (loggedUser && (loggedUser.role === 'superadmin' || loggedUser.role === 'employee')) {
        navigate('/admin/chits');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid credentials or connection issue.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerOtpFlow = async () => {
    if (!email) {
      setError('Please enter your email to receive an OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestOtp(email);
      setOtpSentTo(email);
      setOtpVal('');
      setOtpStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await verifyOtp(email, otpVal);
      if (res?.user && (res.user.role === 'superadmin' || res.user.role === 'employee')) {
        navigate('/admin/chits');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#fbfcf9',
    }} className="login-page-container">

      {/* Desktop Left Column - Hero Illustration Banner */}
      <div style={{
        flex: 1.2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem 4rem',
        background: '#ffffff',
        borderRight: '1px solid rgba(10, 30, 59, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }} className="login-hero-section">
        
        {/* Header Logo */}
        <div className="animate-fade-in-up delay-100" style={{ display: 'flex', alignItems: 'center', marginBottom: '3.5rem', zIndex: 10 }}>
          <img src={logoImg} alt="InaVolu Chit Funds Private Limited" onError={(e) => { e.currentTarget.src = '/logo.png'; }} style={{ height: '64px', width: 'auto', maxHeight: '70px', maxWidth: '280px', objectFit: 'contain' }} />
        </div>

        {/* Content & Image Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, position: 'relative', zIndex: 10, gap: '2rem' }}>
          
          {/* Text Content */}
          <div style={{ flex: 1, maxWidth: '400px', zIndex: 10 }}>
            <h1 className="animate-fade-in-up delay-200" style={{ fontSize: '3rem', fontWeight: 800, color: '#3b5bdb', lineHeight: 1.15, marginBottom: '1.25rem', textShadow: '0 2px 10px rgba(37, 99, 235, 0.05)' }}>
              Secure Chit <br /> Management
            </h1>
            <p className="animate-fade-in-up delay-300" style={{ color: '#4b5563', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: '300px', fontWeight: 500 }}>
              Simple. Secure. Transparent. <br /> Manage your chit funds <br /> with confidence.
            </p>

            <div className="animate-fade-in-up delay-400" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: '#dbeafe',
              border: '1px solid rgba(37, 99, 235, 0.1)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-full)',
              color: '#3b5bdb',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: '0 4px 15px rgba(37, 99, 235, 0.1)',
              transition: 'all 0.3s ease',
              cursor: 'default'
            }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#3b5bdb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Check size={12} strokeWidth={3.5} />
              </div>
              <span>Trusted by 1000+ Users</span>
            </div>
          </div>

          {/* Hero Image */}
          <div style={{ flex: 1.2, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 0, pointerEvents: 'none' }}>
            <img src={heroImg} alt="Hero Illustration" onError={(e) => { e.currentTarget.src = '/hero-illustration.png'; }} className="animate-fade-in-up delay-500 animate-float" style={{ width: '100%', maxWidth: '500px', height: 'auto', objectFit: 'contain' }} />
          </div>
        </div>
      </div>

      {/* Right Column - Login Box */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        overflowY: 'auto'
      }}>
        {/* Mobile Header Hero (Visible only on mobile) */}
        <div className="mobile-login-logo" style={{ display: 'none', flexDirection: 'column', width: '100%', padding: '0.25rem 0', marginBottom: '1.25rem', overflow: 'hidden', position: 'relative' }}>
          
          {/* Header Logo */}
          <div className="animate-fade-in-up delay-100" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: '1.25rem', width: '100%' }}>
            <img 
              src={logoImg} 
              alt="InaVolu Chit Funds Private Limited" 
              onError={(e) => { e.currentTarget.src = '/logo.png'; }} 
              style={{ width: '100%', maxWidth: '350px', height: 'auto', maxHeight: '90px', objectFit: 'contain', display: 'block' }} 
            />
          </div>

          {/* Content & Image Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', position: 'relative', minHeight: '135px' }}>
            
            {/* Text Content (Left) */}
            <div style={{ flex: 1, zIndex: 10, minWidth: 0 }}>
              <h1 className="animate-fade-in-up delay-200" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b5bdb', lineHeight: 1.2, margin: '0 0 0.4rem 0' }}>
                Secure Chit Management
              </h1>
              <p className="animate-fade-in-up delay-300" style={{ color: '#4b5563', fontSize: '0.78rem', lineHeight: 1.35, margin: '0 0 0.65rem 0', fontWeight: 500 }}>
                Simple. Secure. Transparent. Manage chit funds with confidence.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: '#dbeafe',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '9999px',
                  color: '#3b5bdb',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)'
                }}>
                  <Check size={12} strokeWidth={3} />
                  <span>Trusted by 1000+</span>
                </div>
              </div>
            </div>

            {/* Hero Image (Right) - contained cleanly without overlapping */}
            <div style={{ width: '105px', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img src={heroImg} alt="Hero Illustration" className="animate-fade-in-up delay-500 animate-float" style={{ width: '100%', height: 'auto', maxHeight: '115px', objectFit: 'contain', mixBlendMode: 'darken' }} />
            </div>
          </div>
        </div>

        {/* Outer Card wrapping the Form */}
        <div className="glass-panel card-premium" style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.25rem 2.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(10, 30, 59, 0.08)',
          backgroundColor: '#ffffff',
          boxShadow: '0 10px 30px rgba(10, 30, 59, 0.04)',
          position: 'relative'
        }}>
          {/* Back to Home Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1.25rem',
            paddingBottom: '0.85rem',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: '#3b5bdb',
                fontSize: '0.88rem',
                fontWeight: 600,
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '0.45rem 0.95rem',
                borderRadius: '10px',
                textDecoration: 'none',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#dbeafe';
                e.currentTarget.style.borderColor = '#a5b4fc';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#eff6ff';
                e.currentTarget.style.borderColor = '#bfdbfe';
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </Link>
          </div>

          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#3b5bdb',
            marginBottom: '0.5rem',
            textAlign: 'center'
          }}>
            Welcome Back
          </h2>
          <p style={{
            color: '#6b7280',
            fontSize: '0.95rem',
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            Please enter your details to sign in
          </p>

          {noticeMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #a5b4fc',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem',
              color: '#3b5bdb',
              fontSize: '0.88rem',
              lineHeight: 1.4,
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.05)'
            }}>
              <ShieldCheck size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#3b5bdb' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>Member Sign In Required</strong>
                <span>{noticeMsg}</span>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              color: '#b91c1c',
              fontSize: '0.85rem'
            }}>
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Login Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => { setLoginMode('password'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: loginMode === 'password' ? '#3b5bdb' : '#6b7280',
                borderBottom: loginMode === 'password' ? '2px solid #3b5bdb' : '2px solid transparent',
                transition: 'all 0.2s ease',
              }}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('otp'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: loginMode === 'otp' ? '#3b5bdb' : '#6b7280',
                borderBottom: loginMode === 'otp' ? '2px solid #3b5bdb' : '2px solid transparent',
                transition: 'all 0.2s ease',
              }}
            >
              OTP Login
            </button>
          </div>

          {/* Form Area */}
          {loginMode === 'password' && (
            <>
              <form onSubmit={handleSubmit}>
                <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input id="email-password" type="email" required placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" style={{ paddingLeft: '2.75rem', height: '48px', fontSize: '0.95rem' }} />
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: '1rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input id="password" type={showPassword ? 'text' : 'password'} required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" style={{ paddingLeft: '2.75rem', paddingRight: '3rem', height: '48px', fontSize: '0.95rem' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', padding: '0.5rem' }}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                  <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: '#3b5bdb', fontWeight: 600 }}>Forgot Password?</Link>
                </div>

                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', height: '48px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', fontSize: '1rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(10, 30, 59, 0.2)' }}>
                  <span>{loading ? 'Logging in...' : 'Login securely'}</span>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowRight size={16} />
                  </div>
                </button>
              </form>

              <Link to="/register" className="btn-gold-outline" style={{ width: '100%', height: '48px', borderRadius: 'var(--radius-full)', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserPlus size={18} />
                  <span>Register New Account</span>
                </div>
                <ChevronRight size={16} />
              </Link>
            </>
          )}

          {loginMode === 'otp' && otpStep === 1 && (
            <>
              <form onSubmit={(e) => { e.preventDefault(); handleTriggerOtpFlow(); }}>
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input id="email-otp" type="email" required placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" style={{ paddingLeft: '2.75rem', height: '48px', fontSize: '0.95rem' }} />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', height: '48px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', fontSize: '1rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(10, 30, 59, 0.2)' }}>
                  <span>{loading ? 'Sending...' : 'Login with Email + OTP'}</span>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowRight size={16} />
                  </div>
                </button>
              </form>

              <Link to="/register" className="btn-gold-outline" style={{ width: '100%', height: '48px', borderRadius: 'var(--radius-full)', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserPlus size={18} />
                  <span>Register New Account</span>
                </div>
                <ChevronRight size={16} />
              </Link>
            </>
          )}

          {loginMode === 'otp' && otpStep === 2 && (
            <>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem', textAlign: 'center' }}>
                Please enter the 6-digit code sent to <br /><strong>{otpSentTo}</strong>
              </p>
              <form onSubmit={handleOtpVerify}>
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="Enter 6-digit OTP"
                    value={otpVal}
                    onChange={(e) => setOtpVal(e.target.value)}
                    className="input-field"
                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', height: '52px' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#ca8a04', display: 'block', marginTop: '0.5rem', textAlign: 'center', fontWeight: 600 }}>
                    Check your email inbox for the code
                  </span>
                </div>

                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', height: '48px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1.5rem', fontSize: '1rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(10, 30, 59, 0.2)' }}>
                  {loading ? 'Verifying...' : 'Verify & Log In'}
                </button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                <button onClick={() => setOtpStep(1)} type="button" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3b5bdb', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Change Email Address
                </button>
              </div>
            </>
          )}

          {/* Bottom Back to Home Link */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #f1f5f9'
          }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: '#64748b',
                fontSize: '0.88rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'color 0.15s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = '#3b5bdb'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; }}
            >
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </Link>
          </div>

        </div>
      </div>



      {/* Styled JSX for Responsiveness */}
      <style>{`
        .quick-otp-btn:hover {
          background-color: #f3f4f6 !important;
          border-color: #d1d5db !important;
        }
        @media (max-width: 768px) {
          .login-page-container {
            flex-direction: column !important;
          }
          .login-hero-section {
            display: none !important; /* Hide hero on mobile just like clean native login screen */
          }
          .mobile-login-logo {
            display: flex !important;
          }
          .glass-panel.card-premium {
            padding: 1.5rem 1.15rem !important;
            box-shadow: none !important;
            border: 1px solid rgba(37, 99, 235, 0.1) !important;
            border-radius: 1.25rem !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
