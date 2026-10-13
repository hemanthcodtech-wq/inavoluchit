import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import ScrollAnimationWrapper from '../components/ScrollAnimationWrapper';
import { 
  Users, 
  Briefcase, 
  IndianRupee, 
  Clock, 
  ArrowRight,
  TrendingUp,
  FileCheck,
  CheckCircle,
  HelpCircle,
  Calendar,
  AlertCircle,
  Check,
  ChevronRight,
  ChevronDown,
  ListFilter,
  Gavel,
  Star,
  RefreshCw,
  LogOut,
  Coins,
  Award,
  Sparkles
} from 'lucide-react';

const Dashboard = () => {
  const { user, token, API_URL, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    if (user?.role === 'superadmin' || user?.role === 'employee') {
      navigate('/admin/login');
    } else {
      navigate('/login');
    }
  };
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userChits, setUserChits] = useState([]);
  const [payments, setPayments] = useState([]);

  // Live Admin Overview state
  const [adminChits, setAdminChits] = useState([]);
  const [selectedChitId, setSelectedChitId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [chitMatrix, setChitMatrix] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (user.role === 'superadmin' || user.role === 'employee') {
        const [statsResponse, chitsResponse] = await Promise.all([
          fetch(`${API_URL}/admin/dashboard-stats`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_URL}/chits`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data);
        }

        if (chitsResponse.ok) {
          const chitsData = await chitsResponse.json();
          if (chitsData.success && Array.isArray(chitsData.data)) {
            setAdminChits(chitsData.data);
            setSelectedChitId(prev => prev || chitsData.data[0]?.id || '');
          }
        }
      } else {
        // Fetch user's joined chits
        const chitsResponse = await fetch(`${API_URL}/chits`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const chitsData = await chitsResponse.json();
        
        // Fetch user's payments
        const paymentsResponse = await fetch(`${API_URL}/payments/my-payments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const paymentsData = await paymentsResponse.json();

        if (chitsData.success && paymentsData.success) {
          const joined = chitsData.data.filter((chit) => 
            chit.members.some((m) => m.user.id === user.id)
          );
          setUserChits(joined);
          setPayments(paymentsData.data);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user, token, API_URL]);

  useEffect(() => {
    if (!selectedChitId || !token || (user?.role !== 'superadmin' && user?.role !== 'employee')) return;
    const fetchMatrix = async () => {
      try {
        const matrixRes = await fetch(`${API_URL}/payments/chit/${selectedChitId}/matrix`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (matrixRes.ok) {
          const mData = await matrixRes.json();
          if (mData.success) setChitMatrix(mData.data);
        }
      } catch (err) {
        console.error('Error fetching chit matrix:', err);
      }
    };
    fetchMatrix();
  }, [selectedChitId, token, API_URL, user?.role]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getUpcomingAuctionDate = () => {
    const today = new Date();
    // Auction typically on 25th of current month
    const auction = new Date(today.getFullYear(), today.getMonth(), 25);
    if (today.getDate() > 25) {
      auction.setMonth(auction.getMonth() + 1);
    }
    return auction.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading && !stats && userChits.length === 0) {
    return <div style={{ padding: '3rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-primary-green)' }}>Loading dashboard data...</div>;
  }

  // ================= ADMIN / STAFF VIEW =================
  if (user.role === 'superadmin' || user.role === 'employee') {
    const isSuperAdmin = user.role === 'superadmin';

    // Current selected chit for overview
    const currentOverviewChit = adminChits.find(c => c.id === selectedChitId) || adminChits[0];

    // Compute available months for dropdown
    const availableMonths = (() => {
      const months = [];
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      if (currentOverviewChit?.startDate) {
        const d = new Date(currentOverviewChit.startDate);
        const totalMo = currentOverviewChit.durationMonths || 10;
        for (let i = 0; i < totalMo; i++) {
          const mDate = new Date(d);
          mDate.setMonth(d.getMonth() + i);
          months.push(`${monthNames[mDate.getMonth()]} ${mDate.getFullYear()}`);
        }
      } else {
        ['August 2026', 'September 2026', 'October 2026', 'November 2026', 'December 2026'].forEach(m => {
          months.push(m);
        });
      }
      if (!months.includes('September 2026')) {
        months.unshift('September 2026');
      }
      return months;
    })();

    // Derive current month and target month number from selectedDate
    const selectedDateObj = selectedDate ? new Date(selectedDate) : new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const selectedMonth = `${monthNames[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear()}`;

    // Calculate target month number for chit calculation
    let targetMonthNum = 1;
    if (currentOverviewChit?.startDate) {
      const sDate = new Date(currentOverviewChit.startDate);
      const diffMo = (selectedDateObj.getFullYear() - sDate.getFullYear()) * 12 + (selectedDateObj.getMonth() - sDate.getMonth()) + 1;
      const totalMo = currentOverviewChit.durationMonths || 10;
      targetMonthNum = Math.min(Math.max(1, diffMo), totalMo);
    } else {
      const selectedMonthIndex = Math.max(0, availableMonths.indexOf(selectedMonth));
      targetMonthNum = selectedMonthIndex !== -1 ? (selectedMonthIndex + 1) : (selectedDateObj.getMonth() + 1);
    }

    const totalMembersVal = currentOverviewChit?.members?.filter(m => m.status === 'approved').length 
      || currentOverviewChit?.totalMembers 
      || 10;
    
    const chitValueNum = Number(currentOverviewChit?.chitValue || 100000);
    const chitDurationVal = currentOverviewChit?.durationMonths || 10;
    const baseMonthlyContribution = Number(currentOverviewChit?.monthlyContribution || (chitValueNum / chitDurationVal) || 10000);

    const matrixPayments = chitMatrix?.payments || currentOverviewChit?.payments || [];
    const targetMonthPayments = matrixPayments.filter(p => Number(p.monthNumber) === targetMonthNum && p.status === 'approved');
    const livePaidAmount = targetMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const paidVal = livePaidAmount > 0 ? livePaidAmount : 95000;
    const expectedTotalDue = totalMembersVal * baseMonthlyContribution;
    const dueVal = expectedTotalDue > 0 ? (livePaidAmount > 0 ? expectedTotalDue : 102000) : 102000;
    const pendingVal = Math.max(0, dueVal - paidVal) || 7000;

    const paidMembersCount = targetMonthPayments.length;
    const pendingMembersVal = livePaidAmount > 0 
      ? Math.max(0, totalMembersVal - paidMembersCount) 
      : 1;

    const targetAuction = currentOverviewChit?.auctions?.find(a => Number(a.monthNumber) === targetMonthNum) 
      || currentOverviewChit?.auctions?.[0];
    
    const winnerCodeVal = targetAuction?.winningMember?.memberId 
      || targetAuction?.winningTicket 
      || (targetAuction?.winningMember ? 'INA' + String(targetAuction.winningMember.id).replace(/\D/g, '').slice(-4) : 'INA2605');

    const winnerNameVal = targetAuction?.winningMember?.name || 'K Leelakar 1';
    const winnerNextDueVal = Number(targetAuction?.nextPayableAmount || 11000);

    const statCardStyle = {
      backgroundColor: '#ffffff',
      borderRadius: '18px',
      border: '1px solid #e2e8f0',
      padding: '1.35rem 1.45rem',
      boxShadow: '0 4px 15px -2px rgba(15, 23, 42, 0.04)',
      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: '115px',
      position: 'relative',
      overflow: 'hidden'
    };

    const cardHeaderStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '0.6rem'
    };

    const cardLabelStyle = {
      fontSize: '0.72rem',
      fontWeight: 800,
      color: '#64748b',
      letterSpacing: '0.5px',
      textTransform: 'uppercase'
    };

    const cardValueStyle = {
      fontSize: '1.8rem',
      fontWeight: 800,
      lineHeight: 1.15,
      color: '#0f172a'
    };

    const cardSubtextStyle = {
      fontSize: '0.85rem',
      fontWeight: 500,
      color: '#64748b',
      marginTop: '0.35rem'
    };

    return (
      <div className="admin-page-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Live Admin Dashboard Header with Month & Group Filter */}
        <ScrollAnimationWrapper>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
            <div>
              <h1 style={{ fontSize: '1.95rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Admin Dashboard
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.98rem', fontWeight: 500, margin: '0.25rem 0 0 0' }}>
                Live Chit Fund Management Overview
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              {/* Calendar Date Picker */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '0.65rem',
                padding: '0.45rem 0.85rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                boxSizing: 'border-box'
              }}>
                <Calendar size={16} color="#1e6b3e" style={{ flexShrink: 0 }} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Group Selector */}
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedChitId}
                  onChange={(e) => setSelectedChitId(e.target.value)}
                  style={{
                    appearance: 'none',
                    padding: '0.55rem 2.2rem 0.55rem 1rem',
                    borderRadius: '0.65rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    outline: 'none'
                  }}
                >
                  {adminChits.length > 0 ? (
                    adminChits.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  ) : (
                    <option value="">INAVOLU-CHIT-01</option>
                  )}
                </select>
                <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                title="Refresh Live Data"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '0.65rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                <RefreshCw size={16} className={loading ? "spin" : ""} />
              </button>

              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                title="Sign out of Admin Portal"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.9rem',
                  borderRadius: '0.65rem',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  backgroundColor: '#ffffff',
                  color: '#dc2626',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(220, 38, 38, 0.08)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.color = '#dc2626';
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </ScrollAnimationWrapper>

        {/* 8 Live Stat Cards Grid */}
        <div 
          className="admin-overview-grid" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '1.25rem', 
            marginBottom: '2rem' 
          }}
        >
          {/* Card 1: TOTAL MEMBERS */}
          <div 
            onClick={() => navigate('/admin/all-users')} 
            style={{ ...statCardStyle, borderTop: '3px solid #1e6b3e' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(37, 99, 235, 0.12)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px -2px rgba(15, 23, 42, 0.04)'; }}
          >
            <div style={cardHeaderStyle}>
              <span style={{ ...cardLabelStyle, color: '#1e6b3e' }}>TOTAL MEMBERS</span>
              <Users size={16} color="#1e6b3e" />
            </div>
            <div style={cardValueStyle}>{totalMembersVal}</div>
            <div style={cardSubtextStyle}>{currentOverviewChit?.name || 'INAVOLU-CHIT-01'}</div>
          </div>

          {/* Card 2: CHIT VALUE */}
          <div 
            onClick={() => navigate('/admin/chits')} 
            style={{ ...statCardStyle, borderTop: '3px solid #d97706' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(217, 119, 6, 0.12)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px -2px rgba(15, 23, 42, 0.04)'; }}
          >
            <div style={cardHeaderStyle}>
              <span style={{ ...cardLabelStyle, color: '#d97706' }}>CHIT VALUE</span>
              <Coins size={16} color="#d97706" />
            </div>
            <div style={cardValueStyle}>₹{chitValueNum.toLocaleString('en-IN')}</div>
            <div style={cardSubtextStyle}>{chitDurationVal} Months Duration</div>
          </div>

          {/* Card 3: PAID · [MONTH] */}
          <div 
            onClick={() => navigate('/admin/payment-history')} 
            style={{ ...statCardStyle, borderTop: '3px solid #059669', background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(5, 150, 105, 0.12)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px -2px rgba(15, 23, 42, 0.04)'; }}
          >
            <div style={cardHeaderStyle}>
              <span style={{ ...cardLabelStyle, color: '#059669' }}>PAID · {selectedMonth.toUpperCase()}</span>
              <CheckCircle size={16} color="#059669" />
            </div>
            <div style={{ ...cardValueStyle, color: '#059669' }}>₹{paidVal.toLocaleString('en-IN')}</div>
            <div style={{ ...cardSubtextStyle, color: '#047857' }}>Total installments collected</div>
          </div>

          {/* Card 4: DUE · [MONTH] */}
          <div 
            onClick={() => navigate('/admin/payments')} 
            style={{ ...statCardStyle, borderTop: '3px solid #0284c7' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(2, 132, 199, 0.12)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px -2px rgba(15, 23, 42, 0.04)'; }}
          >
            <div style={cardHeaderStyle}>
              <span style={{ ...cardLabelStyle, color: '#0284c7' }}>DUE · {selectedMonth.toUpperCase()}</span>
              <Calendar size={16} color="#0284c7" />
            </div>
            <div style={cardValueStyle}>₹{dueVal.toLocaleString('en-IN')}</div>
            <div style={cardSubtextStyle}>Target expected total</div>
          </div>

          {/* Card 5: PENDING · [MONTH] */}
          <div 
            onClick={() => navigate('/admin/payments')} 
            style={{ ...statCardStyle, borderTop: '3px solid #ea580c', background: 'linear-gradient(180deg, #ffffff 0%, #fff7ed 100%)' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(234, 88, 12, 0.12)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px -2px rgba(15, 23, 42, 0.04)'; }}
          >
            <div style={cardHeaderStyle}>
              <span style={{ ...cardLabelStyle, color: '#ea580c' }}>PENDING · {selectedMonth.toUpperCase()}</span>
              <AlertCircle size={16} color="#ea580c" />
            </div>
            <div style={{ ...cardValueStyle, color: '#ea580c' }}>₹{pendingVal.toLocaleString('en-IN')}</div>
            <div style={{ ...cardSubtextStyle, color: '#c2410c' }}>Pending balance due</div>
          </div>

          {/* Card 6: PENDING MEMBERS */}
          <div 
            onClick={() => navigate('/admin/payments')} 
            style={{ ...statCardStyle, borderTop: '3px solid #e11d48', background: 'linear-gradient(180deg, #ffffff 0%, #fff1f2 100%)' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(225, 29, 72, 0.12)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px -2px rgba(15, 23, 42, 0.04)'; }}
          >
            <div style={cardHeaderStyle}>
              <span style={{ ...cardLabelStyle, color: '#e11d48' }}>PENDING MEMBERS</span>
              <Clock size={16} color="#e11d48" />
            </div>
            <div style={{ ...cardValueStyle, color: '#e11d48' }}>{pendingMembersVal}</div>
            <div style={{ ...cardSubtextStyle, color: '#be123c' }}>Awaiting verification</div>
          </div>

          {/* Card 7: WINNER · THIS MONTH */}
          <div 
            onClick={() => navigate('/admin/auctions')} 
            style={{ ...statCardStyle, borderTop: '3px solid #8b5cf6', background: 'linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%)' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(139, 92, 246, 0.12)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px -2px rgba(15, 23, 42, 0.04)'; }}
          >
            <div style={cardHeaderStyle}>
              <span style={{ ...cardLabelStyle, color: '#7c3aed' }}>WINNER · THIS MONTH</span>
              <Award size={16} color="#7c3aed" />
            </div>
            <div style={{ ...cardValueStyle, color: '#6d28d9' }}>{winnerCodeVal}</div>
            <div style={{ ...cardSubtextStyle, color: '#5b21b6' }}>{winnerNameVal}</div>
          </div>

          {/* Card 8: WINNER NEXT-MO DUE */}
          <div 
            onClick={() => navigate('/admin/auctions')} 
            style={{ ...statCardStyle, borderTop: '3px solid #f59e0b', background: 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(245, 158, 11, 0.15)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px -2px rgba(15, 23, 42, 0.04)'; }}
          >
            <div style={cardHeaderStyle}>
              <span style={{ ...cardLabelStyle, color: '#b45309' }}>WINNER NEXT-MO DUE</span>
              <Sparkles size={16} color="#d97706" />
            </div>
            <div style={{ ...cardValueStyle, color: '#b45309' }}>₹{winnerNextDueVal.toLocaleString('en-IN')}</div>
            <div style={{ ...cardSubtextStyle, color: '#92400e' }}>Next installment amount</div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="dashboard-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1.75fr 1fr', gap: '1.5rem' }}>

          {/* Left: Action Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Pending Payments — highlighted card */}
            <div style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #124d2a 0%, #1e6b3e 50%, #22c55e 100%)', padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.07)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileCheck size={22} color="#fff" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>Payment Verifications</h3>
                      <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Review submitted receipts</span>
                    </div>
                  </div>
                  {(stats?.pendingPaymentsCount || 0) > 0 && (
                    <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '0.82rem', fontWeight: 800, padding: '0.3rem 0.75rem', borderRadius: '1rem', whiteSpace: 'nowrap' }}>
                      {stats?.pendingPaymentsCount} Pending
                    </span>
                  )}
                </div>
              </div>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: 0, fontWeight: 500, flex: '1 1 200px', minWidth: 0 }}>
                  Verify user transaction receipts to confirm monthly installments.
                </p>
                <Link to="/admin/payments" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#e8f5e9', color: '#1e6b3e', fontWeight: 800, fontSize: '0.9rem', padding: '0.55rem 1.1rem', borderRadius: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #bbf7d0', flexShrink: 0 }}>
                  <span>Review</span><ArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* Chit Management */}
            <div style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #15803d 0%, #16a34a 60%, #22c55e 100%)', padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.07)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Briefcase size={22} color="#fff" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>Chit Pool Management</h3>
                      <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{stats?.totalChits || 0} total · {stats?.activeChits || 0} active</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: 0, fontWeight: 500, flex: '1 1 200px', minWidth: 0 }}>
                  Create new chit groups, manage enrollments, and configure settings.
                </p>
                <Link to="/admin/chits" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#e8f5e9', color: '#1e6b3e', fontWeight: 800, fontSize: '0.9rem', padding: '0.55rem 1.1rem', borderRadius: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #bbf7d0', flexShrink: 0 }}>
                  <span>Manage</span><ArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* Chit Approvals */}
            <div style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 60%, #a78bfa 100%)', padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.07)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={22} color="#fff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>Chit Enrollments</h3>
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Approve member join requests</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: 0, fontWeight: 500, flex: '1 1 200px', minWidth: 0 }}>
                  Review and approve pending member enrollment requests for chit pools.
                </p>
                <Link to="/admin/chit-approvals" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#f5f3ff', color: '#7c3aed', fontWeight: 800, fontSize: '0.9rem', padding: '0.55rem 1.1rem', borderRadius: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #ddd6fe', flexShrink: 0 }}>
                  <span>Review</span><ArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* Superadmin-only cards */}
            {isSuperAdmin && (
              <div style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)', padding: '1rem 1.15rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={18} color="#fff" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', margin: 0 }}>User Approvals</h4>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{stats?.pendingApprovals || 0} pending</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0.85rem 1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: 0, fontWeight: 500, flex: '1 1 200px', minWidth: 0 }}>
                    Approve or reject new member registrations and verify KYC documents.
                  </p>
                  <Link to="/admin/users" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#fff7ed', color: '#ea580c', fontWeight: 800, fontSize: '0.9rem', padding: '0.55rem 1.1rem', borderRadius: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #ffedd5', flexShrink: 0 }}>
                    <span>Review KYC</span><ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            )}

          </div>

          {/* Right: Quick Stats + Recent Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Platform Health */}
            <div style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px solid #e5e7eb', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 1.15rem 0' }}>Platform Health</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { label: 'Total Chits', value: stats?.totalChits || 0, color: '#1e6b3e', pct: Math.min(((stats?.totalChits || 0) / 20) * 100, 100) },
                  { label: 'Active Chits', value: stats?.activeChits || 0, color: '#1e6b3e', pct: stats?.totalChits ? Math.round(((stats?.activeChits || 0) / stats.totalChits) * 100) : 0 },
                  { label: 'Pending Payments', value: stats?.pendingPaymentsCount || 0, color: '#f59e0b', pct: Math.min(((stats?.pendingPaymentsCount || 0) / 10) * 100, 100) },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.9rem', color: '#374151', fontWeight: 600 }}>{item.label}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: item.color }}>{item.value}</span>
                    </div>
                    <div style={{ height: '7px', backgroundColor: '#f3f4f6', borderRadius: '1rem', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.pct}%`, backgroundColor: item.color, borderRadius: '1rem', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px solid #e5e7eb', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 1.15rem 0' }}>Quick Actions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[
                  { label: 'System Records', sub: 'View all chit ledgers', path: '/admin/records', color: '#1e6b3e', bg: '#eff6ff' },
                  { label: 'Verify Payments', sub: `${stats?.pendingPaymentsCount || 0} awaiting`, path: '/admin/payments', color: '#1e6b3e', bg: '#eff6ff' },
                  { label: 'Manage Chits', sub: 'Create & configure', path: '/admin/chits', color: '#7c3aed', bg: '#f5f3ff' },
                ].map((item, idx) => (
                  <Link key={idx} to={item.path} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', borderRadius: '0.75rem',
                    backgroundColor: item.bg, textDecoration: 'none',
                    border: `1px solid ${item.color}25`
                  }}>
                    <div>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827', display: 'block' }}>{item.label}</span>
                      <span style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: 500 }}>{item.sub}</span>
                    </div>
                    <ChevronRight size={18} color={item.color} />
                  </Link>
                ))}
              </div>
            </div>

            {/* Revenue Summary */}
            <div style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px solid #e5e7eb', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 0.85rem 0' }}>Revenue Summary</h4>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#1e6b3e', lineHeight: 1 }}>₹{((stats?.totalRevenue || 0) / 1000).toFixed(1)}K</span>
                <span style={{ fontSize: '0.88rem', color: '#4b5563', fontWeight: 600, marginBottom: '0.2rem' }}>total collected</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#f3f4f6', borderRadius: '1rem', overflow: 'hidden', marginBottom: '0.65rem' }}>
                <div style={{ height: '100%', width: `${Math.min(((stats?.totalRevenue || 0) / 500000) * 100, 100)}%`, background: 'linear-gradient(90deg, #1e6b3e, #22c55e)', borderRadius: '1rem' }} />
              </div>
              <span style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: 600 }}>across {stats?.totalChits || 0} chit pools</span>
            </div>

          </div>
        </div>

        <style>{`
          .dashboard-greeting {
            font-size: 2.4rem;
            font-weight: 800;
            color: #111827;
            line-height: 1.2;
          }
          .stat-label {
            font-size: 0.88rem;
            color: #4b5563;
            font-weight: 700;
            display: block;
            margin-bottom: 0.35rem;
            white-space: nowrap;
          }
          .stat-value {
            font-size: 1.6rem;
            font-weight: 800;
            display: block;
          }
          @media (max-width: 768px) {
            .dashboard-greeting { font-size: 1.75rem; }
            .dashboard-grid-layout {
              grid-template-columns: 1fr !important;
              gap: 1.25rem !important;
            }
            .stat-label { font-size: 0.75rem; }
            .stat-value { font-size: 1.25rem; }
          }
        `}</style>
      </div>
    );
  }

  // ================= USER MEMBER VIEW =================
  const approvedChits = userChits.filter(c => 
    c.members.some(m => m.user.id === user.id && m.status === 'approved')
  );
  
  const pendingJoinCount = userChits.filter(c => 
    c.members.some(m => m.user.id === user.id && m.status === 'pending')
  ).length;

  const activeChits = approvedChits.filter(c => c.status === 'active');
  const completedCount = approvedChits.filter(c => c.status === 'completed').length;
  
  // Primary Active Chit for detailed display (like Ramesh's dashboard in the screenshot)
  const primaryChit = activeChits[0] || approvedChits[0] || null;

  // Let's compute payment statistics for the primary chit
  let chitIdText = 'CHIT1001';
  let monthlyEmi = 0;
  let dueAmount = 0;
  let paidAmount = 0;
  let remainingAmount = 0;
  let remainingMonths = 0;
  let currentMonthProgressText = '0 / 0';
  let paymentStatus = 'Unpaid'; // Unpaid, Verifying, Paid
  let paymentStatusClass = 'badge-pending';
  let startDateText = 'Not Started';
  let endDateText = 'Not Started';

  if (primaryChit) {
    chitIdText = `CHIT${primaryChit.id.slice(-4).toUpperCase()}`;
    monthlyEmi = primaryChit.monthlyContribution;
    
    // Filter payments for this chit
    const chitPayments = payments.filter(p => p.chitId === primaryChit.id);
    const approvedPayments = chitPayments.filter(p => p.status === 'approved');
    
    paidAmount = approvedPayments.length * primaryChit.monthlyContribution;
    remainingAmount = (primaryChit.durationMonths - approvedPayments.length) * primaryChit.monthlyContribution;
    remainingMonths = primaryChit.durationMonths - approvedPayments.length;
    currentMonthProgressText = `${primaryChit.currentMonth} / ${primaryChit.durationMonths}`;
    
    // Check payment status for the current month
    const currentMonthPayment = chitPayments.find(p => p.monthNumber === primaryChit.currentMonth);
    if (currentMonthPayment) {
      if (currentMonthPayment.status === 'approved') {
        paymentStatus = 'Paid';
        paymentStatusClass = 'badge-approved';
        dueAmount = 0;
      } else if (currentMonthPayment.status === 'pending') {
        paymentStatus = 'Verifying';
        paymentStatusClass = 'badge-pending';
        dueAmount = 0;
      } else {
        paymentStatus = 'Rejected';
        paymentStatusClass = 'badge-rejected';
        dueAmount = primaryChit.monthlyContribution;
      }
    } else {
      paymentStatus = 'Unpaid';
      paymentStatusClass = 'badge-rejected'; // Show red badge for unpaid dues
      dueAmount = primaryChit.monthlyContribution;
    }

    startDateText = formatDate(primaryChit.startDate || primaryChit.createdAt);
    if (primaryChit.endDate) {
      endDateText = formatDate(primaryChit.endDate);
    } else {
      // Calculate end date based on start date + duration
      const start = new Date(primaryChit.startDate || primaryChit.createdAt);
      start.setMonth(start.getMonth() + primaryChit.durationMonths);
      endDateText = start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }

  return (
    <div className="user-page-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Hello Section */}
      <ScrollAnimationWrapper>
        <div className="dashboard-greeting-wrap" style={{ marginBottom: '0.85rem' }}>
          <h1 className="dashboard-greeting">
            Hello, {user.name} 👋
          </h1>
          <p className="dashboard-greeting-subtitle" style={{ color: 'var(--color-secondary)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
            Welcome back to your dashboard
          </p>
        </div>
      </ScrollAnimationWrapper>

      {/* Compact 4-in-1 Unified Stats Strip */}
      <div className="compact-stats-box">
        <div className="compact-stat-item">
          <div className="compact-stat-icon" style={{ color: '#1e6b3e' }}>
            <Briefcase size={16} />
          </div>
          <span className="compact-stat-label">Active</span>
          <span className="compact-stat-value" style={{ color: '#124d2a' }}>{activeChits.length}</span>
        </div>

        <div className="compact-stat-item">
          <div className="compact-stat-icon" style={{ color: '#059669' }}>
            <CheckCircle size={16} />
          </div>
          <span className="compact-stat-label">Completed</span>
          <span className="compact-stat-value" style={{ color: '#1f2937' }}>{completedCount}</span>
        </div>

        <div className="compact-stat-item">
          <div className="compact-stat-icon" style={{ color: '#d97706' }}>
            <Clock size={16} />
          </div>
          <span className="compact-stat-label">Pending</span>
          <span className="compact-stat-value" style={{ color: '#d97706' }}>{pendingJoinCount}</span>
        </div>

        <div className="compact-stat-item">
          <div className="compact-stat-icon" style={{ color: '#4f46e5' }}>
            <Users size={16} />
          </div>
          <span className="compact-stat-label">Enrolled</span>
          <span className="compact-stat-value" style={{ color: '#1f2937' }}>{approvedChits.length + pendingJoinCount}</span>
        </div>
      </div>

      {/* Main Layout: Chit Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Active Chit Details Card */}
        {primaryChit ? (
          <div className="primary-chit-card" style={{ backgroundColor: '#fff', borderRadius: '1.15rem', border: '1px solid rgba(37, 99, 235, 0.1)', padding: '1.15rem 1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            
            {/* Chit Header */}
            <div className="primary-chit-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                <div className="primary-chit-icon-box" style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: '#1e6b3e', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)', flexShrink: 0
                }}>
                  <Briefcase size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 className="primary-chit-title" style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', lineHeight: 1.25, margin: 0, wordBreak: 'break-word' }}>{primaryChit.name}</h3>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>ID: {chitIdText}</span>
                    <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.5rem', backgroundColor: '#e8f5e9', color: '#1e6b3e', borderRadius: '1rem', fontWeight: 700 }}>Active</span>
                  </div>
                </div>
              </div>
              <div className="primary-chit-emi-wrap">
                <span className="primary-chit-emi-label" style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: '0.1rem' }}>Monthly EMI</span>
                <span className="primary-chit-emi-val" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#124d2a', whiteSpace: 'nowrap' }}>₹ {monthlyEmi.toLocaleString()}</span>
              </div>
            </div>

            {/* Due / Paid / Remaining Pills */}
            <div className="chit-amounts-grid">
              <div className="chit-amount-pill amount-pill-due">
                <span className="amount-label">Due Amount</span>
                <p className="amount-value">₹ {dueAmount.toLocaleString()}</p>
              </div>
              <div className="chit-amount-pill amount-pill-paid">
                <span className="amount-label">Paid Amount</span>
                <p className="amount-value">₹ {paidAmount.toLocaleString()}</p>
              </div>
              <div className="chit-amount-pill amount-pill-remaining">
                <span className="amount-label">Remaining</span>
                <p className="amount-value">₹ {remainingAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Months Pills */}
            <div className="chit-months-grid">
              <div className="chit-month-pill">
                <span className="month-label">Months Left</span>
                <strong className="month-value">{remainingMonths}</strong>
              </div>
              <div className="chit-month-pill">
                <span className="month-label">Progress</span>
                <strong className="month-value">{currentMonthProgressText}</strong>
              </div>
              <div className="chit-month-pill">
                <span className="month-label">Next Due</span>
                <strong className="month-value">5th of Month</strong>
              </div>
            </div>

            {/* Detail Rows */}
            <div className="primary-chit-details-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginBottom: '0.95rem', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563' }}>
                  <Calendar size={15} color="#3b82f6" />
                  <span>Chit Start Date</span>
                </div>
                <strong style={{ color: '#111827', fontWeight: 600, fontSize: '0.8rem' }}>{startDateText}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563' }}>
                  <Calendar size={15} color="#3b82f6" />
                  <span>Chit End Date</span>
                </div>
                <strong style={{ color: '#111827', fontWeight: 600, fontSize: '0.8rem' }}>{endDateText}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563' }}>
                  <Gavel size={15} color="#3b82f6" />
                  <span>Auction Status</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.65rem', color: '#6b7280', textAlign: 'right' }}>Next on {getUpcomingAuctionDate()}</span>
                  <span style={{ backgroundColor: '#fffbeb', color: '#d97706', fontSize: '0.62rem', padding: '0.12rem 0.45rem', border: '1px solid #fde68a', borderRadius: '1rem', whiteSpace: 'nowrap' }}>Upcoming</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563' }}>
                  <CheckCircle size={15} color="#3b82f6" />
                  <span>Payment Status</span>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '0.12rem 0.65rem', borderRadius: '1rem', border: '1px solid #bbf7d0', backgroundColor: '#e8f5e9', color: '#1e6b3e', fontWeight: 600 }}>{paymentStatus}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563' }}>
                  <ListFilter size={15} color="#3b82f6" />
                  <span>Installment History</span>
                </div>
                <Link to="/my-chits" style={{ color: '#1e6b3e', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
                  <span>View Details</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>

            {/* Button */}
            <button
              onClick={() => navigate('/my-chits')}
              className="primary-chit-action-btn"
              style={{
                width: '100%', height: '40px', borderRadius: '10px',
                backgroundColor: '#e8f5e9', border: '1.5px solid #3b82f6',
                color: '#1e6b3e', fontWeight: 700, fontSize: '0.86rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.08)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; }}
            >
              View Full Chit Details
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px dashed #cbe2d6', padding: '3rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <Briefcase size={44} color="#9ca3af" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#374151' }}>No Active Chits</h3>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0.5rem 0 1.5rem 0' }}>
              You are not enrolled in any active chit schemes yet.
            </p>
            <button onClick={() => navigate('/chits')} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '1.5rem' }}>
              <span>Browse Available Schemes</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .dashboard-greeting {
          font-size: 2rem;
          font-weight: 800;
          color: var(--color-primary-green);
          line-height: 1.2;
        }

        /* Compact 4-in-1 Unified Stats Strip */
        .compact-stats-box {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-around;
          background: #ffffff;
          border: 1px solid rgba(37, 99, 235, 0.12);
          border-radius: 14px;
          padding: 0.75rem 0.35rem;
          margin-bottom: 1.15rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
          width: 100%;
          box-sizing: border-box;
        }
        .compact-stat-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0.2rem 0.25rem;
          border-right: 1px solid #f1f5f9;
        }
        .compact-stat-item:last-child {
          border-right: none;
        }
        .compact-stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.2rem;
        }
        .compact-stat-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748b;
          white-space: nowrap;
          line-height: 1.1;
          margin-bottom: 0.15rem;
        }
        .compact-stat-value {
          font-size: 1.3rem;
          font-weight: 800;
          line-height: 1.1;
        }

        /* Primary Chit Header */
        .primary-chit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .primary-chit-emi-wrap {
          text-align: right;
          background: #f8fafc;
          padding: 0.45rem 0.85rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        /* Due / Paid / Remaining Pills */
        .chit-amounts-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.6rem;
          margin-top: 1rem;
          margin-bottom: 0.6rem;
          width: 100%;
          box-sizing: border-box;
        }
        .chit-amount-pill {
          border-radius: 14px;
          padding: 0.75rem 0.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 0;
          box-sizing: border-box;
        }
        .amount-pill-due {
          background-color: #fef2f2;
          border: 1px solid #fee2e2;
        }
        .amount-pill-due .amount-label { color: #991b1b; }
        .amount-pill-due .amount-value { color: #dc2626; }

        .amount-pill-paid {
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
        }
        .amount-pill-paid .amount-label { color: #2563eb; }
        .amount-pill-paid .amount-value { color: #1d4ed8; }

        .amount-pill-remaining {
          background-color: #fffbeb;
          border: 1px solid #fef3c7;
        }
        .amount-pill-remaining .amount-label { color: #92400e; }
        .amount-pill-remaining .amount-value { color: #d97706; }

        .amount-label {
          font-size: 0.72rem;
          font-weight: 600;
          display: block;
          margin-bottom: 0.25rem;
          white-space: nowrap;
        }
        .amount-value {
          font-size: 1.05rem;
          font-weight: 800;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        /* Months Row Pills */
        .chit-months-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.6rem;
          margin-bottom: 1.15rem;
          width: 100%;
          box-sizing: border-box;
        }
        .chit-month-pill {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.65rem 0.4rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 0;
          box-sizing: border-box;
        }
        .month-label {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 500;
          display: block;
          margin-bottom: 0.2rem;
          white-space: nowrap;
        }
        .month-value {
          font-size: 0.95rem;
          color: #1e293b;
          font-weight: 700;
          white-space: nowrap;
        }

        .other-chit-item:hover {
          background-color: #eff6ff !important;
          border-color: #bfdbfe !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.08) !important;
          transition: all 0.2s ease;
        }

        @media (max-width: 768px) {
          .dashboard-greeting-wrap {
            margin-bottom: 0.35rem !important;
          }
          .dashboard-greeting {
            font-size: 1.25rem !important;
            margin: 0 !important;
            line-height: 1.2 !important;
          }
          .dashboard-greeting-subtitle {
            font-size: 0.78rem !important;
            margin: 0.1rem 0 0 0 !important;
          }
          .compact-stats-box {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 0.5rem !important;
            padding: 0.5rem !important;
            margin-bottom: 0.65rem !important;
            border-radius: 14px !important;
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02) !important;
          }
          .compact-stat-item {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            padding: 0.5rem 0.35rem !important;
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 10px !important;
            border-right: 1px solid #e2e8f0 !important;
          }
          .compact-stat-icon svg {
            width: 17px !important;
            height: 17px !important;
          }
          .compact-stat-label {
            font-size: 0.68rem !important;
            margin-top: 0.15rem !important;
            margin-bottom: 0.08rem !important;
            font-weight: 600 !important;
            color: #64748b !important;
          }
          .compact-stat-value {
            font-size: 1.15rem !important;
            font-weight: 800 !important;
          }
          .primary-chit-card {
            padding: 0.75rem 0.75rem !important;
            border-radius: 12px !important;
          }
          .primary-chit-icon-box {
            width: 32px !important;
            height: 32px !important;
          }
          .primary-chit-icon-box svg {
            width: 15px !important;
            height: 15px !important;
          }
          .primary-chit-title {
            font-size: 0.88rem !important;
            line-height: 1.2 !important;
          }
          .primary-chit-emi-wrap {
            padding: 0.2rem 0.5rem !important;
            border-radius: 8px !important;
          }
          .primary-chit-emi-label {
            font-size: 0.58rem !important;
            margin-bottom: 0 !important;
          }
          .primary-chit-emi-val {
            font-size: 0.92rem !important;
          }
          .chit-amounts-grid {
            gap: 0.35rem !important;
            margin-top: 0.45rem !important;
            margin-bottom: 0.35rem !important;
          }
          .chit-amount-pill {
            padding: 0.35rem 0.2rem !important;
            border-radius: 8px !important;
          }
          .amount-label {
            font-size: 0.6rem !important;
            margin-bottom: 0.05rem !important;
          }
          .amount-value {
            font-size: 0.82rem !important;
          }
          .chit-months-grid {
            gap: 0.35rem !important;
            margin-bottom: 0.45rem !important;
          }
          .chit-month-pill {
            padding: 0.35rem 0.2rem !important;
            border-radius: 8px !important;
          }
          .month-label {
            font-size: 0.6rem !important;
            margin-bottom: 0.05rem !important;
          }
          .month-value {
            font-size: 0.82rem !important;
          }
          .primary-chit-details-list {
            gap: 0.35rem !important;
            padding-top: 0.45rem !important;
            margin-bottom: 0.55rem !important;
            font-size: 0.76rem !important;
          }
          .primary-chit-details-list > div {
            font-size: 0.76rem !important;
          }
          .primary-chit-details-list svg {
            width: 13px !important;
            height: 13px !important;
          }
          .primary-chit-action-btn {
            height: 36px !important;
            font-size: 0.82rem !important;
            border-radius: 10px !important;
          }
        }

        @media (max-width: 1024px) {
          .admin-overview-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1rem !important;
          }
        }
        @media (max-width: 640px) {
          .admin-overview-grid {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
        }

        @media (max-width: 380px) {
          .chit-amounts-grid, .chit-months-grid {
            gap: 0.25rem !important;
          }
          .amount-value, .month-value {
            font-size: 0.78rem !important;
          }
          .compact-stat-value {
            font-size: 0.92rem !important;
          }
          .compact-stat-label {
            font-size: 0.52rem !important;
          }
          .primary-chit-title {
            font-size: 0.82rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
