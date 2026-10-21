import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, ShieldCheck, ArrowRight, KeyRound, Eye, EyeOff } from 'lucide-react';
import logoImg from '../../assets/logo.png';

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const email = (formData.email || '').trim();
      const password = (formData.password || '').trim();
      const user = await login(email, password);
      if (user.role === 'superadmin' || user.role === 'employee') {
        navigate('/admin/dashboard');
      } else {
        localStorage.removeItem('token');
        setError('Access Denied: This portal is restricted to authorized Administrators & Staff.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify administrator credentials.');
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
      background: 'radial-gradient(ellipse at 20% 20%, #0f1729 0%, #0a0f1e 50%, #060b18 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Glow Orbs — Sapphire + Violet + Amber */}
      <div style={{
        position: 'absolute', top: '-5%', left: '10%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'rgba(59, 91, 219, 0.14)',
        filter: 'blur(90px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-8%', right: '5%',
        width: '480px', height: '480px', borderRadius: '50%',
        background: 'rgba(79, 70, 229, 0.12)',
        filter: 'blur(100px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', top: '60%', left: '-5%',
        width: '320px', height: '320px', borderRadius: '50%',
        background: 'rgba(245, 158, 11, 0.06)',
        filter: 'blur(80px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', top: '15%', right: '15%',
        width: '200px', height: '200px', borderRadius: '50%',
        background: 'rgba(99, 102, 241, 0.10)',
        filter: 'blur(60px)', pointerEvents: 'none'
      }} />

      {/* Login Card */}
      <div
        className="admin-login-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(10, 15, 35, 0.80)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '1.75rem',
          border: '1px solid rgba(59, 91, 219, 0.28)',
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(59, 91, 219, 0.12), 0 0 50px rgba(59, 91, 219, 0.08)',
          padding: '2.5rem 2rem',
          position: 'relative',
          zIndex: 10,
          boxSizing: 'border-box'
        }}
      >
        {/* Subtle top shimmer line */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.6), rgba(245, 158, 11, 0.4), transparent)',
          borderRadius: '9999px'
        }} />

        {/* Header with Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.96)',
            padding: '0.75rem 1.35rem',
            borderRadius: '1.15rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(59, 91, 219, 0.15)',
            marginBottom: '1.4rem',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}>
            <img
              src={logoImg}
              alt="InaVolu Chit Funds Private Limited"
              className="admin-login-logo"
              onError={(e) => { e.currentTarget.src = '/logo.png'; }}
              style={{ width: '100%', maxWidth: '300px', height: 'auto', maxHeight: '68px', objectFit: 'contain', display: 'block' }}
            />
          </div>

          {/* Security Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
            background: 'linear-gradient(135deg, rgba(59, 91, 219, 0.18) 0%, rgba(79, 70, 229, 0.12) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            padding: '0.38rem 1rem', borderRadius: '9999px',
            color: '#a5b4fc', fontSize: '0.74rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem',
            boxShadow: '0 0 16px rgba(99, 102, 241, 0.15)'
          }}>
            <ShieldCheck size={14} color="#a5b4fc" />
            Admin Security Portal
          </div>

          <h1 style={{
            fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.4rem 0',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #e2e8f8 0%, #c7d2fe 60%, #fde68a 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            display: 'block'
          }}>
            Administrator Control Center
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Authorized InaVolu personnel only
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: '#fca5a5',
            borderRadius: '0.85rem',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem', boxSizing: 'border-box'
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%', boxSizing: 'border-box' }}>
          {/* Email Field */}
          <div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              color: '#94a3b8', fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.5rem'
            }}>
              <Mail size={14} color="#818cf8" /> Admin Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%', padding: '0.88rem 1rem',
                borderRadius: '0.85rem',
                background: 'rgba(15, 23, 48, 0.75)',
                border: '1px solid rgba(99, 102, 241, 0.20)',
                color: '#e2e8f0', fontSize: '0.95rem', outline: 'none',
                boxSizing: 'border-box', transition: 'all 0.22s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(99, 102, 241, 0.55)';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.12), 0 0 16px rgba(59, 91, 219, 0.10)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(99, 102, 241, 0.20)';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="admin@inavolu.com"
            />
          </div>

          {/* Password Field */}
          <div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              color: '#94a3b8', fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.5rem'
            }}>
              <Lock size={14} color="#818cf8" /> Master Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                style={{
                  width: '100%', padding: '0.88rem 3rem 0.88rem 1rem',
                  borderRadius: '0.85rem',
                  background: 'rgba(15, 23, 48, 0.75)',
                  border: '1px solid rgba(99, 102, 241, 0.20)',
                  color: '#e2e8f0', fontSize: '0.95rem', outline: 'none',
                  boxSizing: 'border-box', transition: 'all 0.22s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(99, 102, 241, 0.55)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.12), 0 0 16px rgba(59, 91, 219, 0.10)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(99, 102, 241, 0.20)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '0.85rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'transparent',
                  border: 'none', color: '#64748b', cursor: 'pointer',
                  padding: '0.35rem', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', borderRadius: '0.375rem',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#a5b4fc'}
                onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.3rem' }}>
            <Link to="/forgot-password?from=admin" style={{
              fontSize: '0.82rem', color: '#818cf8', fontWeight: 600, textDecoration: 'none',
              transition: 'color 0.2s'
            }}
              onMouseOver={(e) => e.currentTarget.style.color = '#a5b4fc'}
              onMouseOut={(e) => e.currentTarget.style.color = '#818cf8'}
            >
              Forgot Password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.95rem',
              borderRadius: '0.9rem',
              background: loading
                ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)'
                : 'linear-gradient(135deg, #3b5bdb 0%, #1e3a8a 60%, #312e81 100%)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontWeight: 700,
              fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 8px 24px rgba(59, 91, 219, 0.45), 0 0 0 1px rgba(99, 102, 241, 0.15)',
              transition: 'all 0.25s ease',
              position: 'relative', overflow: 'hidden'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 14px 32px rgba(59, 91, 219, 0.55), 0 0 0 1px rgba(99, 102, 241, 0.25)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 91, 219, 0.45), 0 0 0 1px rgba(99, 102, 241, 0.15)';
              }
            }}
          >
            {loading ? (
              <>
                <span className="animate-spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />
                <span>Authenticating Secure Session...</span>
              </>
            ) : (
              <>
                <KeyRound size={18} />
                <span>Access Admin Control Center</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: '0.76rem', color: '#334155', marginTop: '1.75rem', marginBottom: 0 }}>
          🔒 Secured by 256-bit SSL encryption &nbsp;·&nbsp; InaVolu Chit Funds Pvt. Ltd.
        </p>

        <style>{`
          @media (max-width: 480px) {
            .admin-login-card {
              padding: 1.75rem 1.15rem !important;
              border-radius: 1.25rem !important;
              width: 100% !important;
              max-width: 95vw !important;
            }
            .admin-login-logo {
              max-width: 240px !important;
              max-height: 60px !important;
            }
          }
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus {
            -webkit-text-fill-color: #e2e8f0 !important;
            -webkit-box-shadow: 0 0 0px 1000px #0f1730 inset !important;
            transition: background-color 5000s ease-in-out 0s;
          }
        `}</style>
      </div>
    </div>
  );
};

export default AdminLogin;
