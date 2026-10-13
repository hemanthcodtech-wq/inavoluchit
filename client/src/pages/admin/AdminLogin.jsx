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
        navigate('/admin/chits'); // Direct to Chit Scheme Admin Manager
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
      background: 'radial-gradient(circle at 50% 20%, #0f291e 0%, #061a10 60%, #020b06 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Glow Accents */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '25%',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'rgba(34, 197, 94, 0.08)',
        filter: 'blur(80px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '25%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(29, 78, 216, 0.12)',
        filter: 'blur(100px)',
        pointerEvents: 'none'
      }} />

      <div 
        className="admin-login-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(15, 23, 18, 0.85)',
          backdropFilter: 'blur(16px)',
          borderRadius: '1.5rem',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(34, 197, 94, 0.1)',
          padding: '2.5rem 2rem',
          position: 'relative',
          zIndex: 10,
          boxSizing: 'border-box'
        }}
      >
        {/* Header with Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            padding: '0.75rem 1.35rem',
            borderRadius: '1.15rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            marginBottom: '1.25rem',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}>
            <img 
              src={logoImg} 
              alt="InaVolu Chit Funds Private Limited" 
              className="admin-login-logo"
              onError={(e) => { e.currentTarget.src = '/logo.png'; }}
              style={{ width: '100%', maxWidth: '320px', height: 'auto', maxHeight: '70px', objectFit: 'contain', display: 'block' }} 
            />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '0.35rem 0.85rem', borderRadius: '9999px', color: '#4ade80', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            <ShieldCheck size={14} /> Admin Security Portal
          </div>

          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Administrator Control Center
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            Authorized InaVolu personnel only
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#fca5a5',
            borderRadius: '0.75rem',
            fontSize: '0.85rem',
            marginBottom: '1.75rem',
            textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxSizing: 'border-box'
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <Mail size={14} color="#4ade80" /> Admin Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
                background: 'rgba(30, 41, 35, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
              placeholder="anandareddymundla1996@gmail.com"
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <Lock size={14} color="#4ade80" /> Master Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.85rem 3rem 0.85rem 1rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(30, 41, 35, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.375rem',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.25rem', marginBottom: '0.25rem' }}>
            <Link to="/forgot-password?from=admin" style={{ fontSize: '0.82rem', color: '#4ade80', fontWeight: 600, textDecoration: 'none' }}>
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.75rem',
              padding: '0.95rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(34, 197, 94, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {loading ? (
              <span>Authenticating Secure Session...</span>
            ) : (
              <>
                <KeyRound size={18} />
                <span>Access Admin Control Center</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>


        <style>{`
          @media (max-width: 480px) {
            .admin-login-card {
              padding: 1.75rem 1.15rem !important;
              border-radius: 1.25rem !important;
              width: 100% !important;
              max-width: 95vw !important;
            }
            .admin-login-logo {
              max-width: 260px !important;
              max-height: 68px !important;
            }
          }
          input:-webkit-autofill,
          input:-webkit-autofill:hover, 
          input:-webkit-autofill:focus {
            -webkit-text-fill-color: #ffffff !important;
            -webkit-box-shadow: 0 0 0px 1000px #13241b inset !important;
            transition: background-color 5000s ease-in-out 0s;
          }
        `}</style>
      </div>
    </div>
  );
};

export default AdminLogin;
