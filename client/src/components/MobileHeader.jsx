import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Users, 
  FolderCheck, 
  Briefcase, 
  Gavel, 
  CheckSquare, 
  History, 
  FolderOpen, 
  FileText, 
  LogOut, 
  User,
  ShieldCheck,
  ChevronRight,
  Coins
} from 'lucide-react';
import logoImg from '../assets/logo.png';

const MobileHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const isStaffOrAdmin = user.role === 'superadmin' || user.role === 'employee';

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    if (isStaffOrAdmin) {
      navigate('/admin/login');
    } else {
      navigate('/login');
    }
  };

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { to: '/admin/all-users', label: 'All Users', icon: <Users size={20} /> },
    { to: '/admin/documents', label: 'Chit Documents', icon: <FolderCheck size={20} /> },
    { to: '/admin/chit-plans', label: 'Chit Plans', icon: <Coins size={20} /> },
    { to: '/admin/chits', label: 'Chit Schemes', icon: <Briefcase size={20} /> },
    { to: '/admin/auctions', label: 'Auctions', icon: <Gavel size={20} /> },
    { to: '/profile', label: 'My Profile', icon: <User size={20} /> }
  ];

  const staffLinks = [
    { to: '/admin/dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { to: '/admin/all-users', label: 'All Users', icon: <Users size={20} /> },
    { to: '/admin/documents', label: 'Chit Documents', icon: <FolderCheck size={20} /> },
    { to: '/admin/chit-plans', label: 'Chit Plans', icon: <Coins size={20} /> },
    { to: '/admin/chits', label: 'Chit Schemes', icon: <Briefcase size={20} /> },
    { to: '/admin/auctions', label: 'Auctions', icon: <Gavel size={20} /> },
    { to: '/profile', label: 'My Profile', icon: <User size={20} /> }
  ];

  const navLinks = user.role === 'superadmin' ? adminLinks : staffLinks;

  return (
    <>
      {/* Top Mobile Bar - Fixed permanently at top so it NEVER moves when scrolling */}
      <header className="mobile-admin-topbar" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '56px',
        backgroundColor: '#ffffff',
        borderBottom: '1.5px solid rgba(37, 99, 235, 0.12)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 0.85rem',
        zIndex: 99999,
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        willChange: 'transform',
        boxSizing: 'border-box'
      }}>
        {/* Brand Logo & Role */}
        <Link 
          to="/admin/dashboard" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.45rem', 
            minWidth: 0, 
            textDecoration: 'none' 
          }}
        >
          <img 
            src={logoImg} 
            alt="InaVolu Chit Funds" 
            onError={(e) => { e.currentTarget.src = '/logo.png'; }}
            style={{ 
              height: '34px', 
              width: 'auto',
              maxWidth: '145px', 
              objectFit: 'contain', 
              display: 'block', 
              flexShrink: 0
            }}
          />
          <span style={{
            fontSize: '0.62rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            background: user.role === 'superadmin' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            color: user.role === 'superadmin' ? '#2563eb' : '#059669',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            border: user.role === 'superadmin' ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)'
          }}>
            {user.role === 'superadmin' ? 'Admin' : 'Staff'}
          </span>
        </Link>

        {/* Right Actions: Sign Out & Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid #fee2e2',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <LogOut size={17} />
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation menu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: isOpen ? '#f1f5f9' : '#ffffff',
              color: '#1e293b',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {isOpen ? <X size={22} color="#0f172a" /> : <Menu size={22} color="#0f172a" />}
          </button>
        </div>
      </header>

      {/* Slide-out Drawer Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 1050,
            animation: 'fadeIn 0.2s ease'
          }}
        />
      )}

      {/* Slide-out Drawer Panel */}
      <aside 
        className={`mobile-admin-drawer ${isOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: 0,
          width: '82%',
          maxWidth: '320px',
          backgroundColor: '#ffffff',
          boxShadow: '-4px 0 25px rgba(0, 0, 0, 0.15)',
          zIndex: 1100,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing: 'border-box'
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '1rem 1.15rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <img 
              src={logoImg} 
              alt="InaVolu Chit Funds" 
              onError={(e) => { e.currentTarget.src = '/logo.png'; }}
              style={{ 
                height: '32px', 
                width: 'auto', 
                maxWidth: '165px', 
                objectFit: 'contain', 
                display: 'block' 
              }} 
            />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '6px'
              }}
            >
              <X size={20} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #124d2a 0%, #3b5bdb 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.9rem',
              flexShrink: 0
            }}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name || 'System Admin'}
              </p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links Scroll Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem 0.65rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem'
        }}>
          <div style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#94a3b8',
            padding: '0.4rem 0.65rem'
          }}>
            ADMINISTRATION
          </div>

          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/admin/dashboard'}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive ? '#3b5bdb' : '#334155',
                backgroundColor: isActive ? 'rgba(30, 107, 62, 0.08)' : 'transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.88rem',
                borderLeft: isActive ? '3px solid #f59e0b' : '3px solid transparent',
                transition: 'all 0.15s ease'
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: location.pathname === item.to ? '#3b5bdb' : '#64748b' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              <ChevronRight size={15} color="#cbd5e1" />
            </NavLink>
          ))}
        </div>

        {/* Drawer Footer with Sign Out */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid #f1f5f9',
          backgroundColor: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <style>{`
        @media (min-width: 769px) {
          .mobile-admin-topbar,
          .mobile-admin-drawer {
            display: none !important;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default MobileHeader;
