import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Mail, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  ShieldAlert, 
  RefreshCw,
  Check
} from 'lucide-react';
import logoImg from '../assets/logo.jpeg';

const ForgotPassword = () => {
  const { API_URL } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');

  const loginUrl = from === 'admin' ? '/admin/login' : from === 'staff' ? '/staff-login' : '/login';
  const loginLabel = from === 'admin' ? 'Admin Login' : from === 'staff' ? 'Staff Portal Login' : 'Login';

  const [step, setStep] = useState(1); // 1 = Enter Email, 2 = Enter OTP, 3 = New Password, 4 = Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setInfoMessage(data.message || 'OTP verification code sent to your email.');
        setStep(2);
      } else {
        setError(data.message || 'Failed to send OTP code.');
      }
    } catch (err) {
      console.error('Error sending reset OTP:', err);
      setError('Connection error sending verification email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code sent to your email.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setError('');
        setStep(3);
      } else {
        setError(data.message || 'Invalid or expired OTP code.');
      }
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('Connection error verifying OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.trim().length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your new password.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword: newPassword.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setInfoMessage(data.message || 'Your password has been reset successfully!');
        setStep(4);
      } else {
        setError(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setError('Connection error updating password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      backgroundColor: '#fbfcf9',
      background: 'radial-gradient(circle at 50% 20%, #f0f0ff 0%, #fbfcf9 100%)'
    }}>
      <div className="glass-panel card-premium" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '2.5rem 2rem',
        borderRadius: '1.25rem',
        border: '1px solid rgba(10, 30, 59, 0.12)',
        backgroundColor: '#ffffff',
        boxShadow: '0 12px 36px rgba(37, 99, 235, 0.06)'
      }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          {(from === 'admin' || from === 'staff') && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{
                display: 'inline-block',
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid #bfdbfe'
              }}>
                {from === 'admin' ? 'Admin Portal' : 'Staff Portal'}
              </span>
            </div>
          )}

          <Link to={loginUrl} style={{ display: 'inline-block', marginBottom: '1rem' }}>
            <img 
              src={logoImg} 
              alt="InaVolu Chit Funds Private Limited" 
              onError={(e) => { e.currentTarget.src = '/logo.png'; }}
              style={{ height: '100px', width: 'auto', maxHeight: '110px', objectFit: 'contain' }} 
            />
          </Link>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary-green)', margin: 0 }}>
            {step === 4 
              ? 'Password Reset Complete' 
              : (from === 'admin' || from === 'staff') 
                ? 'Admin & Staff Password Reset' 
                : 'Forgot Password?'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#6b7280', marginTop: '0.35rem' }}>
            {step === 1 && `Enter your registered ${from ? 'administrator / staff' : ''} email address to receive an OTP.`}
            {step === 2 && `Enter the 6-digit OTP code sent to ${email}`}
            {step === 3 && 'Create a new secure password for your account.'}
            {step === 4 && 'Your password has been updated successfully.'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            color: '#dc2626',
            fontSize: '0.85rem'
          }}>
            <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: ENTER EMAIL */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="email"
                  required
                  placeholder="e.g. member@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    height: '48px',
                    paddingLeft: '2.75rem',
                    paddingRight: '1rem',
                    borderRadius: '10px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="spin" />
                  <span>Sending Verification Email...</span>
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  <span>Send Reset OTP</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: ENTER OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem', textAlign: 'center' }}>
                6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                required
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{
                  width: '100%',
                  height: '52px',
                  textAlign: 'center',
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  letterSpacing: '0.4em',
                  borderRadius: '10px',
                  border: '2px solid var(--color-primary-green)',
                  backgroundColor: '#f0f0ff',
                  color: 'var(--color-primary-green)',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginTop: '0.4rem', textAlign: 'center' }}>
                Didn't get the email? Check spam folder or{' '}
                <button
                  type="button"
                  onClick={handleSendOtp}
                  style={{ color: 'var(--color-primary-green)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Resend Code
                </button>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? 'Verifying OTP...' : 'Verify Code & Proceed'}
            </button>
          </form>
        )}

        {/* STEP 3: RESET NEW PASSWORD */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: '48px',
                    paddingLeft: '2.75rem',
                    paddingRight: '3rem',
                    borderRadius: '10px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: '48px',
                    paddingLeft: '2.75rem',
                    paddingRight: '3rem',
                    borderRadius: '10px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
              }}
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#dbeafe',
              color: '#3b5bdb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #a5b4fc'
            }}>
              <CheckCircle size={36} color="#3b5bdb" />
            </div>

            <p style={{ fontSize: '0.95rem', color: '#374151', margin: 0, fontWeight: 600 }}>
              {infoMessage || 'Your password has been reset successfully. You can now log in with your new credentials.'}
            </p>

            <button
              type="button"
              onClick={() => navigate(loginUrl)}
              className="btn-primary"
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span>Return to {loginLabel}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Back Link */}
        {step !== 4 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
            <Link to={loginUrl} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4b5563', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ArrowLeft size={16} />
              <span>Return to {loginLabel}</span>
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;
