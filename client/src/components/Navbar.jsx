import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Menu, 
  X, 
  Home, 
  ClipboardList, 
  Plus, 
  CreditCard, 
  User as UserIcon, 
  HelpCircle, 
  PhoneCall, 
  FolderCheck, 
  LogOut, 
  Briefcase,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Coins,
  Award
} from 'lucide-react';
import logoImg from '../assets/logo.jpeg';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close drawer automatically on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  const userNavLinks = [
    { to: '/', label: 'Home / Dashboard', icon: <Home size={20} />, desc: 'Overview & your chit stats' },
    { to: '/my-chits', label: 'My Active Chits', icon: <ClipboardList size={20} />, desc: 'Installment schedule & dues' },
    { to: '/payments', label: 'Payment History', icon: <CreditCard size={20} />, desc: 'Ledgers, proofs & receipts' },
    { to: '/documents', label: 'Chit Documents', icon: <FolderCheck size={20} />, desc: 'Aadhaar, PAN & KYC files' },
    { to: '/profile', label: 'My Profile', icon: <UserIcon size={20} />, desc: 'Account details & settings' },
  ];

  return (
    <>
      <nav className="top-navbar-container" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0.65rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(59, 91, 219, 0.12)',
        boxShadow: '0 4px 24px -2px rgba(13, 27, 62, 0.07), 0 2px 8px -1px rgba(59, 91, 219, 0.08)'
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img 
            src={logoImg} 
            alt="InaVolu Chit Funds Private Limited" 
            className="nav-brand-logo"
            onError={(e) => { e.currentTarget.src = '/logo.png'; }}
            style={{ height: '48px', width: 'auto', maxHeight: '52px', objectFit: 'contain' }} 
          />
        </Link>

        {/* Desktop Navigation Links */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.35rem',
            marginRight: '2rem',
            fontSize: '0.94rem'
          }} 
          className="nav-links-desktop"
        >
          {!user && (
            <>
              <NavLink 
                to="/" 
                end
                className={({ isActive }) => `nav-hover desktop-nav-item ${isActive ? 'active' : ''}`}
                style={{ fontWeight: 600, transition: 'var(--transition-fast)' }}
              >
                Home
              </NavLink>
              <NavLink 
                to="/about" 
                className={({ isActive }) => `nav-hover desktop-nav-item ${isActive ? 'active' : ''}`}
                style={{ fontWeight: 600, transition: 'var(--transition-fast)' }}
              >
                About Us
              </NavLink>
              <a 
                href="/#chit-plans" 
                onClick={(e) => {
                  if (location.pathname === '/') {
                    e.preventDefault();
                    const el = document.getElementById('chit-plans');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                style={{ fontWeight: 600, transition: 'var(--transition-fast)' }} 
                className="nav-hover desktop-nav-item"
              >
                Chit Plans
              </a>
              <a 
                href="/#how-it-works" 
                onClick={(e) => {
                  if (location.pathname === '/') {
                    e.preventDefault();
                    const el = document.getElementById('how-it-works');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                style={{ fontWeight: 600, transition: 'var(--transition-fast)' }} 
                className="nav-hover desktop-nav-item"
              >
                How It Works
              </a>
              <a 
                href="/#benefits" 
                onClick={(e) => {
                  if (location.pathname === '/') {
                    e.preventDefault();
                    const el = document.getElementById('benefits');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                style={{ fontWeight: 600, transition: 'var(--transition-fast)' }} 
                className="nav-hover desktop-nav-item"
              >
                Benefits
              </a>
              <a 
                href="/#faq" 
                onClick={(e) => {
                  if (location.pathname === '/') {
                    e.preventDefault();
                    const el = document.getElementById('faq');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                style={{ fontWeight: 600, transition: 'var(--transition-fast)' }} 
                className="nav-hover desktop-nav-item"
              >
                FAQ
              </a>
              <NavLink 
                to="/contact" 
                className={({ isActive }) => `nav-hover desktop-nav-item ${isActive ? 'active' : ''}`}
                style={{ fontWeight: 600, transition: 'var(--transition-fast)' }}
              >
                Contact Us
              </NavLink>
            </>
          )}
          
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              {user.role === 'superadmin' && (
                <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>SUPERADMIN</span>
              )}
              <button onClick={handleLogout} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link
                to="/login"
                className="btn-secondary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: 700 }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-primary"
                style={{ padding: '0.5rem 1.35rem', fontSize: '0.9rem', fontWeight: 700 }}
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Hamburger Menu Icon */}
        <button 
          onClick={() => setIsOpen(true)} 
          aria-label="Open Navigation Menu"
          style={{ 
            display: 'none', 
            color: '#2563eb',
            background: '#eff6ff',
            border: '1.5px solid rgba(37, 99, 235, 0.2)',
            borderRadius: '12px',
            padding: '8px 10px',
            cursor: 'pointer'
          }} 
          className="hamburger-btn"
        >
          <Menu size={26} />
        </button>
      </nav>

      {/* Mobile Drawer Backdrop & Slide-out Menu */}
      {isOpen && (
        <div 
          className="mobile-drawer-backdrop"
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 100000,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            className="mobile-drawer-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '86%',
              maxWidth: '340px',
              height: '100%',
              backgroundColor: '#ffffff',
              boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 100001,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Drawer Header / User Banner */}
            <div style={{
              padding: '1.25rem 1.15rem',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.22)',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                  }}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={22} />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#ffffff', lineHeight: 1.2 }}>
                      {user ? user.name : 'Guest User'}
                    </h3>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      color: 'rgba(255, 255, 255, 0.9)', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.3rem',
                      marginTop: '0.2rem'
                    }}>
                      <ShieldCheck size={13} />
                      {user?.role === 'user' ? 'Chit Fund Member' : (user?.role ? user.role.toUpperCase() : 'Welcome')}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Navigation Menu"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {user?.email && (
                <div style={{ 
                  fontSize: '0.74rem', 
                  color: 'rgba(255, 255, 255, 0.85)', 
                  backgroundColor: 'rgba(0, 0, 0, 0.12)', 
                  padding: '0.35rem 0.65rem', 
                  borderRadius: '8px',
                  wordBreak: 'break-all'
                }}>
                  {user.email}
                </div>
              )}
            </div>

            {/* Navigation Body */}
            <div style={{ flex: 1, padding: '1rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {user ? (
                <>
                  <div style={{ 
                    fontSize: '0.68rem', 
                    fontWeight: 700, 
                    color: '#94a3b8', 
                    letterSpacing: '0.05em', 
                    textTransform: 'uppercase', 
                    padding: '0.25rem 0.65rem 0.4rem 0.65rem' 
                  }}>
                    User Account
                  </div>

                  {userNavLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/'}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''} ${link.isHighlight ? 'highlight' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0.85rem',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        color: '#1e293b',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <div className="drawer-icon-box" style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: link.isHighlight ? '#dbeafe' : '#f1f5f9',
                          color: link.isHighlight ? '#1d4ed8' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {link.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ 
                            fontSize: '0.92rem', 
                            fontWeight: 600, 
                            display: 'block',
                            color: link.isHighlight ? '#1d4ed8' : '#1e293b'
                          }}>
                            {link.label}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {link.desc}
                          </span>
                        </div>
                      </div>

                      {link.isHighlight ? (
                        <span style={{
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '1rem',
                          letterSpacing: '0.02em',
                          flexShrink: 0
                        }}>
                          JOIN
                        </span>
                      ) : (
                        <ChevronRight size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                      )}
                    </NavLink>
                  ))}

                  <div style={{ 
                    height: '1px', 
                    backgroundColor: '#e2e8f0', 
                    margin: '0.75rem 0.5rem' 
                  }} />

                  <div style={{ 
                    fontSize: '0.68rem', 
                    fontWeight: 700, 
                    color: '#94a3b8', 
                    letterSpacing: '0.05em', 
                    textTransform: 'uppercase', 
                    padding: '0.2rem 0.65rem 0.35rem 0.65rem' 
                  }}>
                    Support & Info
                  </div>

                  <NavLink
                    to="/about"
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: '#475569',
                      fontSize: '0.88rem',
                      fontWeight: 500
                    }}
                  >
                    <div className="drawer-icon-box" style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <HelpCircle size={18} />
                    </div>
                    <span>About Us</span>
                  </NavLink>

                  <NavLink
                    to="/contact"
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: '#475569',
                      fontSize: '0.88rem',
                      fontWeight: 500
                    }}
                  >
                    <div className="drawer-icon-box" style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <PhoneCall size={18} />
                    </div>
                    <span>Contact Support</span>
                  </NavLink>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem' }}>
                  <NavLink
                    to="/"
                    onClick={() => setIsOpen(false)}
                    style={{ padding: '0.75rem', borderRadius: '10px', textDecoration: 'none', color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Home size={18} color="#3b5bdb" />
                    <span>Home</span>
                  </NavLink>
                  <NavLink
                    to="/about"
                    onClick={() => setIsOpen(false)}
                    style={{ padding: '0.75rem', borderRadius: '10px', textDecoration: 'none', color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <HelpCircle size={18} color="#3b5bdb" />
                    <span>About Us</span>
                  </NavLink>
                  <a
                    href="/#chit-plans"
                    onClick={(e) => {
                      setIsOpen(false);
                      if (location.pathname === '/') {
                        e.preventDefault();
                        const el = document.getElementById('chit-plans');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    style={{ padding: '0.75rem', borderRadius: '10px', textDecoration: 'none', color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Coins size={18} color="#3b5bdb" />
                    <span>Chit Plans</span>
                  </a>
                  <a
                    href="/#how-it-works"
                    onClick={(e) => {
                      setIsOpen(false);
                      if (location.pathname === '/') {
                        e.preventDefault();
                        const el = document.getElementById('how-it-works');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    style={{ padding: '0.75rem', borderRadius: '10px', textDecoration: 'none', color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Sparkles size={18} color="#3b5bdb" />
                    <span>How It Works</span>
                  </a>
                  <a
                    href="/#benefits"
                    onClick={(e) => {
                      setIsOpen(false);
                      if (location.pathname === '/') {
                        e.preventDefault();
                        const el = document.getElementById('benefits');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    style={{ padding: '0.75rem', borderRadius: '10px', textDecoration: 'none', color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Award size={18} color="#3b5bdb" />
                    <span>Benefits</span>
                  </a>
                  <a
                    href="/#faq"
                    onClick={(e) => {
                      setIsOpen(false);
                      if (location.pathname === '/') {
                        e.preventDefault();
                        const el = document.getElementById('faq');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    style={{ padding: '0.75rem', borderRadius: '10px', textDecoration: 'none', color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <HelpCircle size={18} color="#3b5bdb" />
                    <span>FAQ</span>
                  </a>
                  <NavLink
                    to="/contact"
                    onClick={() => setIsOpen(false)}
                    style={{ padding: '0.75rem', borderRadius: '10px', textDecoration: 'none', color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <PhoneCall size={18} color="#3b5bdb" />
                    <span>Contact Us</span>
                  </NavLink>

                  <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <Link
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className="btn-secondary"
                      style={{ textAlign: 'center', padding: '0.75rem', borderRadius: '10px', fontWeight: 700 }}
                    >
                      Sign In to Portal
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsOpen(false)}
                      className="btn-primary"
                      style={{ textAlign: 'center', padding: '0.75rem', borderRadius: '10px', fontWeight: 700 }}
                    >
                      Register New Account
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer with Logout button */}
            {user && (
              <div style={{
                padding: '1rem',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.55rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fecaca'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                >
                  <LogOut size={18} />
                  <span>Logout Account</span>
                </button>

                <p style={{ 
                  margin: 0, 
                  textAlign: 'center', 
                  fontSize: '0.65rem', 
                  color: '#94a3b8' 
                }}>
                  InaVolu Chit Funds Private Limited
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline styles for responsive menu */}
      <style>{`
        .nav-hover {
          color: #334155;
          text-decoration: none;
          position: relative;
          padding: 0.35rem 0.2rem;
        }
        .nav-hover:hover {
          color: #3b5bdb;
          transform: translateY(-1px);
        }
        .desktop-nav-item.active {
          color: #3b5bdb !important;
          font-weight: 800 !important;
        }
        .desktop-nav-item.active::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          right: 0;
          height: 2.5px;
          background: linear-gradient(90deg, #3b5bdb 0%, #d97706 100%);
          border-radius: 9999px;
          box-shadow: 0 2px 8px rgba(59, 91, 219, 0.45);
        }
        .mobile-drawer-link:hover {
          background-color: #f1f5f9;
        }
        .mobile-drawer-link.active {
          background: linear-gradient(90deg, #eef2ff 0%, #f0f0ff 100%) !important;
          border-left: 4px solid #3b5bdb !important;
        }
        .mobile-drawer-link.active .drawer-icon-box {
          background-color: #3b5bdb !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(59, 91, 219, 0.38) !important;
        }
        .mobile-drawer-link.active span {
          color: #1e3a8a !important;
          font-weight: 700 !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 768px) {
          nav.top-navbar-container {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            height: 72px !important;
            max-height: 72px !important;
            padding: 0.35rem 1rem !important;
            z-index: 99999 !important;
            background-color: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            -webkit-transform: translateZ(0) !important;
            transform: translateZ(0) !important;
            will-change: transform !important;
            box-sizing: border-box !important;
            box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06) !important;
          }
          .nav-brand-logo {
            height: 48px !important;
            max-height: 52px !important;
            max-width: 220px !important;
            width: auto !important;
            object-fit: contain !important;
          }
          .nav-links-desktop {
            display: none !important;
          }
          .hamburger-btn {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;

