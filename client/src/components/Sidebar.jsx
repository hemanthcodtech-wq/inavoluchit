import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  UserCheck, 
  PlusSquare, 
  CheckSquare, 
  Search, 
  Briefcase, 
  History, 
  User, 
  FolderOpen, 
  FolderCheck,
  Lock,
  LogOut,
  ShieldCheck,
  Gavel,
  Users,
  FileText,
  Coins
} from 'lucide-react';
import logoImg from '../assets/logo.png';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const isStaffOrAdmin = user.role === 'superadmin' || user.role === 'employee';

  const handleLogout = async () => {
    await logout();
    if (isStaffOrAdmin) {
      navigate('/admin/login');
    } else {
      navigate('/login');
    }
  };


  const adminLinks = [
    { to: '/admin/dashboard', label: 'Overview', icon: <LayoutDashboard size={21} /> },
    { to: '/admin/all-users', label: 'All Users', icon: <Users size={21} /> },
    { to: '/admin/documents', label: 'Chit Documents', icon: <FolderCheck size={21} /> },
    { to: '/admin/chit-plans', label: 'Chit Plans', icon: <Coins size={21} /> },
    { to: '/admin/chits', label: 'Chit Schemes', icon: <Briefcase size={21} /> },
    { to: '/admin/auctions', label: 'Auction', icon: <Gavel size={21} /> },
  ];

  const staffLinks = [
    { to: '/admin/dashboard', label: 'Overview', icon: <LayoutDashboard size={21} /> },
    { to: '/admin/all-users', label: 'All Users', icon: <Users size={21} /> },
    { to: '/admin/documents', label: 'Chit Documents', icon: <FolderCheck size={21} /> },
    { to: '/admin/chit-plans', label: 'Chit Plans', icon: <Coins size={21} /> },
    { to: '/admin/chits', label: 'Chit Schemes', icon: <Briefcase size={21} /> },
    { to: '/admin/auctions', label: 'Auction', icon: <Gavel size={21} /> },
  ];


  const userLinks = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={21} /> },
    { to: '/chits', label: 'Browse Chits', icon: <Search size={21} /> },
    { to: '/my-chits', label: 'My Active Chits', icon: <Briefcase size={21} /> },
    { to: '/payments', label: 'Payment History', icon: <History size={21} /> },
    { to: '/documents', label: 'Chit Documents', icon: <FolderCheck size={21} /> },
    { to: '/profile', label: 'My Profile', icon: <User size={21} /> },
  ];

  const links = user.role === 'superadmin' ? adminLinks : (user.role === 'employee' ? staffLinks : userLinks);

  return (
    <aside className="glass-panel sidebar-container" style={{
      width: '350px',
      height: 'calc(100% - 2rem)',
      maxHeight: 'calc(100% - 2rem)',
      padding: '1.25rem 1rem',
      borderRadius: '1.25rem',
      margin: '1rem',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: isStaffOrAdmin ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
      border: '1px solid rgba(10, 30, 59, 0.1)',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
      overflowY: 'auto',
      overflowX: 'hidden',
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Brand Logo Header (Shown only in Admin/Staff portal) */}
        {isStaffOrAdmin && (
          <div style={{
            padding: '0.5rem 0.5rem 1.15rem 0.5rem',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            width: '100%',
            overflow: 'hidden'
          }}>
            <img 
              src={logoImg} 
              alt="InaVolu Chit Funds Private Limited" 
              onError={(e) => { e.currentTarget.src = '/logo.png'; }}
              style={{ 
                width: '100%', 
                maxWidth: '220px',
                height: 'auto',
                maxHeight: '62px', 
                objectFit: 'contain', 
                margin: '0.4rem 0 0.75rem 0',
                display: 'block',
                filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.03))'
              }} 
            />
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: user.role === 'superadmin' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(30, 58, 138, 0.08)',
              color: user.role === 'superadmin' ? '#2563eb' : '#1e40af',
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              border: user.role === 'superadmin' ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid rgba(30, 58, 138, 0.2)'
            }}>
              <ShieldCheck size={15} />
              {user.role === 'superadmin' ? 'Super Admin Portal' : 'Staff Portal'}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '1.15rem', marginBottom: '1.25rem' }}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/' || link.to === '/admin/dashboard'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                fontWeight: 700,
                fontSize: '1.02rem',
                color: '#374151',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* User Info Footer */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '0.85rem',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.75rem 0.5rem 0.25rem 0.5rem',
        flexShrink: 0
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b5bdb 0%, #1e3a8a 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(59, 91, 219, 0.38)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '0.92rem'
        }}>
          {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.name || 'System Admin'}
          </p>
          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
            {user.email}
          </p>
        </div>
      </div>

      <style>{`
        .sidebar-container {
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 91, 219, 0.22) transparent;
        }
        .sidebar-container::-webkit-scrollbar {
          width: 5px;
        }
        .sidebar-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-container::-webkit-scrollbar-thumb {
          background: rgba(59, 91, 219, 0.22);
          border-radius: 9999px;
        }
        .sidebar-container::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 91, 219, 0.42);
        }
        .sidebar-link:hover {
          background-color: rgba(59, 91, 219, 0.10);
          color: #3b5bdb;
          transform: translateX(3px);
        }
        .sidebar-link.active {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b5bdb 60%, #4f6ee8 100%) !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          box-shadow: 0 4px 16px rgba(59, 91, 219, 0.42) !important;
          border-left: 3.5px solid #f59e0b !important;
        }
        @media (max-width: 768px) {
          .sidebar-container {
            display: none !important;
          }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
