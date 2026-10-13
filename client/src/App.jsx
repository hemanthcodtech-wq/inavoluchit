import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center', background: '#f8fafc', color: '#1f2937' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626', marginBottom: '1rem' }}>Something went wrong</h2>
          <p style={{ color: '#4b5563', marginBottom: '1.5rem', maxWidth: '500px' }}>{this.state.error?.message || 'An unexpected error occurred while rendering this page.'}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '0.75rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import MobileHeader from './components/MobileHeader';

// Public Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import StaffLogin from './pages/StaffLogin';

import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import SkyPilot from './pages/SkyPilot';

// Protected Pages (Shared / Users)
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import BrowseChits from './pages/BrowseChits';
import MyActiveChits from './pages/MyActiveChits';
import UserPayments from './pages/UserPayments';
import UserDocuments from './pages/UserDocuments';
import AuctionManager from './pages/AuctionManager';

// Admin Pages
import UserApprovals from './pages/admin/UserApprovals';
import ChitApprovals from './pages/admin/ChitApprovals';
import ChitManager from './pages/admin/ChitManager';
import VerifyPayments from './pages/admin/VerifyPayments';
import SystemRecords from './pages/admin/SystemRecords';
import UserDetailedRecords from './pages/admin/UserDetailedRecords';
import AllUsers from './pages/admin/AllUsers';
import EmployeeManager from './pages/admin/EmployeeManager';
import PaymentHistory from './pages/admin/PaymentHistory';
import AdminLogin from './pages/admin/AdminLogin';
import AuditLog from './pages/admin/AuditLog';
import AdminDocuments from './pages/admin/AdminDocuments';
import ChitPlansManager from './pages/admin/ChitPlansManager';



// Layout containing Navbar and Sidebar (conditionally)
const MainLayout = () => {
  const { user, token, API_URL } = useAuth();
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/staff-login', '/admin/login', '/admin'].includes(location.pathname);
  const isAdminOrStaff = user && (user.role === 'superadmin' || user.role === 'employee');
  const showNavbar = !isAuthPage && !isAdminOrStaff;
  
  React.useEffect(() => {
    if (user && token && (user.role === 'superadmin' || user.role === 'employee')) {
      const tabNameMap = {
        '/': 'Overview',
        '/admin/all-users': 'All Users',
        '/admin/documents': 'Chit Documents',
        '/admin/chit-plans': 'Chit Plans',
        '/admin/chits': 'Chit Schemes',
        '/admin/auctions': 'Auction',
        '/admin/users': 'User Approvals',
        '/admin/employees': 'Employee Management',
        '/admin/chit-approvals': 'Chit Approvals',
        '/admin/payments': 'Verify Payments',
        '/admin/payment-history': 'Payment History',
        '/admin/records': 'System Records',
        '/admin/audit-log': 'Audit Log',
        '/profile': 'My Profile'
      };

      const moduleMap = {
        '/': 'system',
        '/admin/all-users': 'members',
        '/admin/documents': 'members',
        '/admin/chit-plans': 'chit_groups',
        '/admin/chits': 'chit_groups',
        '/admin/auctions': 'auctions',
        '/admin/users': 'members',
        '/admin/employees': 'members',
        '/admin/chit-approvals': 'chit_groups',
        '/admin/payments': 'payments',
        '/admin/payment-history': 'payments',
        '/admin/records': 'system',
        '/admin/audit-log': 'system',
        '/profile': 'auth'
      };

      const tabName = tabNameMap[location.pathname];
      if (tabName) {
        fetch(`${API_URL}/admin/audit-logs/page-view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            tabName,
            module: moduleMap[location.pathname] || 'system'
          })
        }).catch(() => {});
      }
    }
  }, [location.pathname, user?.id, token]);

  const mainRef = React.useRef(null);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  return (
    <>
      {user && !isAuthPage && isAdminOrStaff && <MobileHeader />}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh', 
          background: isAdminOrStaff ? '#f8fafc' : 'transparent' 
        }} 
        className={user && !isAuthPage ? "main-app-wrapper" : ""}
      >
        {showNavbar && <Navbar />}
        <div 
        style={{ 
          display: 'flex', 
          flex: 1,
          minHeight: 0
        }} 
        className="main-layout-container"
      >
        {user && !isAuthPage && <Sidebar />}
        <main 
          ref={mainRef}
          style={{ 
            flex: 1, 
            padding: isAuthPage ? '0' : (isAdminOrStaff ? '2rem' : '1.5rem')
          }}
          className={isAuthPage ? "main-content-scroll is-auth-page" : "main-content-scroll"}
        >
          <Outlet />
        </main>
      </div>
    </div>
    <style>{`
        @media (min-width: 769px) {
          .main-app-wrapper {
            height: 100vh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
          }
          .main-layout-container {
            height: 100% !important;
            max-height: 100% !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
          .main-content-scroll {
            height: 100% !important;
            max-height: 100% !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
          }
          .main-content-scroll::-webkit-scrollbar {
            width: 7px;
          }
          .main-content-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .main-content-scroll::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.15);
            border-radius: 9999px;
          }
          .main-content-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.28);
          }
        }
        @media (max-width: 768px) {
          html, body {
            overflow-x: hidden !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            width: 100% !important;
            max-width: 100vw !important;
            min-height: 100vh !important;
            height: auto !important;
          }
          .main-app-wrapper {
            height: auto !important;
            min-height: 100vh !important;
            max-height: none !important;
            overflow-x: hidden !important;
            overflow-y: visible !important;
            width: 100% !important;
            max-width: 100vw !important;
            padding-bottom: 0 !important;
            box-sizing: border-box !important;
          }
          .main-layout-container {
            flex-direction: column !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
          }
          .main-content-scroll {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
            padding: 86px 0.75rem 1.25rem 0.75rem !important;
          }
          .main-content-scroll.is-auth-page {
            padding: 0 !important;
          }
        }
      `}</style>
    </>
  );
};

// Route protection for signed-in users
const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Validating authorization status...</p>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};

// Route protection for superadmins
const AdminRoute = () => {
  const { user } = useAuth();
  
  if (user?.role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};

// Route protection for staff (superadmin or employee)
const StaffRoute = () => {
  const { user } = useAuth();
  
  if (user?.role !== 'superadmin' && user?.role !== 'employee') {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};

// Route blocking for guests (e.g. login/register)
const GuestRoute = () => {
  const { loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 500, color: '#2563eb' }}>Loading session...</p>
      </div>
    );
  }
  
  // Always render login/register pages so users and admins can switch accounts freely
  return <Outlet />;
};

// Dedicated Admin Portal Entry (Independent from customer login)
const AdminEntry = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f3922' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 500, color: '#4ade80' }}>Loading Admin Portal...</p>
      </div>
    );
  }

  // Only redirect /admin to /admin/chits if already logged in as admin/staff
  // When explicitly visiting /admin/login or /staff-login, always show the login screen
  if (location.pathname === '/admin' && user && (user.role === 'superadmin' || user.role === 'employee')) {
    return <Navigate to="/admin/chits" replace />;
  }
  
  return <AdminLogin />;
};

// Landing page for visitors, Member Dashboard for logged in users, or Live Admin Overview for Admin/Staff
const HomeOrDashboard = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 500, color: '#2563eb' }}>Loading session...</p>
      </div>
    );
  }

  // If logged in (admin, staff, or member), render Dashboard (contains Admin Overview for staff/admin)
  if (user) {
    return <Dashboard />;
  }

  // Unauthenticated visitors see the Home landing page
  return <Home />;
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
        <Routes>
          {/* Dedicated Independent Admin Portal Login */}
          <Route path="/admin" element={<AdminEntry />} />
          <Route path="/admin/login" element={<AdminEntry />} />
          <Route path="/staff-login" element={<AdminEntry />} />

          {/* Customer / Member Auth Routes */}
          <Route element={<GuestRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>
          </Route>

          {/* Publicly Informative Routes (Available to anyone, logged in or out) */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomeOrDashboard />} />
            <Route path="/home" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/chits" element={<BrowseChits />} />
            <Route path="/chit-plans" element={<BrowseChits />} />
            <Route path="/auctions" element={<AuctionManager />} />
            <Route path="/skypilot" element={<SkyPilot />} />
          </Route>

          {/* Secure Member / Shared Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              
              {/* User Only Paths */}
              <Route path="/my-chits" element={<MyActiveChits />} />
              <Route path="/payments" element={<UserPayments />} />
              <Route path="/documents" element={<UserDocuments />} />

              {/* Staff & Admin Shared Paths */}
              <Route element={<StaffRoute />}>
                <Route path="/admin/overview" element={<Dashboard />} />
                <Route path="/admin/chit-plans" element={<ChitPlansManager />} />
                <Route path="/admin/chit-approvals" element={<ChitApprovals />} />
                <Route path="/admin/chits" element={<ChitManager />} />
                <Route path="/admin/auctions" element={<AuctionManager />} />
                <Route path="/admin/payments" element={<VerifyPayments />} />
                <Route path="/admin/payment-history" element={<PaymentHistory />} />
                <Route path="/admin/frozen-months" element={<Navigate to="/admin/payment-history" replace />} />
                <Route path="/admin/records" element={<SystemRecords />} />
                <Route path="/admin/all-users" element={<AllUsers />} />
                <Route path="/admin/documents" element={<AdminDocuments />} />
                <Route path="/admin/records/user/:userId" element={<UserDetailedRecords />} />
                <Route path="/admin/audit-log" element={<AuditLog />} />
              </Route>


              {/* Admin Only Paths */}
              <Route element={<AdminRoute />}>
                <Route path="/admin/users" element={<UserApprovals />} />
                <Route path="/admin/employees" element={<EmployeeManager />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  </ErrorBoundary>
  );
}

export default App;
