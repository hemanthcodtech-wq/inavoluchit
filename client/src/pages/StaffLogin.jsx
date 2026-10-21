import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail } from 'lucide-react';
import logoImg from '../assets/logo.png';

const StaffLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
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
      const user = await login(formData.email, formData.password);
      if (user.role === 'employee' || user.role === 'superadmin') {
        navigate('/admin/dashboard');
      } else {
        // Log them out if they aren't staff
        localStorage.removeItem('token');
        setError('Unauthorized. This portal is for staff only.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
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
      padding: '1rem',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
    }}>
      <div className="glass-panel card-premium" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src={logoImg} alt="InaVolu Chit Funds Private Limited" style={{ width: '100%', maxWidth: '280px', height: 'auto', maxHeight: '75px', objectFit: 'contain', margin: '0 auto 1.25rem', display: 'block' }} />
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary-green)' }}>Admin & Staff Portal</h2>
          <p style={{ color: 'var(--color-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Login with your administrator credentials</p>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#dc2626',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            border: '1px solid #f87171'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={14} /> Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input-field"
              placeholder="employee@domain.com"
            />
          </div>

          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={14} /> Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem', marginBottom: '0.25rem' }}>
            <Link to="/forgot-password?from=staff" style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ padding: '0.8rem', fontSize: '1rem', marginTop: '0.5rem', width: '100%' }}
          >
            {loading ? 'Authenticating...' : 'Access Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StaffLogin;
