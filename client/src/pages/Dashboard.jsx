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
  Coins,
  Award,
  Sparkles,
  LogOut
} from 'lucide-react';
import { 
  getChitMonthDate, 
  formatChitMonthFull, 
  formatChitMonthWithNum 
} from '../utils/chitDateUtils';

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
  const [selectedMonthNum, setSelectedMonthNum] = useState(1);
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
    const activeChit = chitMatrix && (chitMatrix.id === currentOverviewChit?.id || chitMatrix._id === currentOverviewChit?.id) 
      ? chitMatrix 
      : currentOverviewChit;

    // List of months for this scheme
    const chitMonthsList = (() => {
      if (!currentOverviewChit) return [];
      const totalMo = currentOverviewChit.durationMonths || 10;
      const list = [];
      for (let m = 1; m <= totalMo; m++) {
        list.push({
          monthNumber: m,
          label: formatChitMonthWithNum(currentOverviewChit, m)
        });
      }
      return list;
    })();

    const targetMonthNum = selectedMonthNum || currentOverviewChit?.currentMonth || 1;
    const selectedMonth = formatChitMonthFull(currentOverviewChit, targetMonthNum);

    const approvedMembers = (activeChit?.members || []).filter(m => m.status === 'approved' || !m.status);
    const totalMembersVal = approvedMembers.length || activeChit?.totalMembers || 0;
    
    const chitValueNum = Number(activeChit?.chitValue || 0);
    const chitDurationVal = activeChit?.durationMonths || 10;
    const baseMonthlyContribution = Number(activeChit?.monthlyContribution || (chitDurationVal > 0 ? Math.round(chitValueNum / chitDurationVal) : 0));

    // Configured monthly due for this target month if set by admin
    const configuredDueObj = (activeChit?.monthlyDues || []).find(d => Number(d.monthNumber) === targetMonthNum);
    const duePerMember = configuredDueObj?.dueAmount != null 
      ? Number(configuredDueObj.dueAmount) 
      : baseMonthlyContribution;

    // Payments for this target month
    const allPayments = activeChit?.payments || [];
    const targetMonthPayments = allPayments.filter(p => Number(p.monthNumber) === targetMonthNum && p.status === 'approved');
    const livePaidAmount = targetMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const paidVal = livePaidAmount;

    // Total expected due for this month
    const dueVal = totalMembersVal * duePerMember;

    // Pending collection
    const pendingVal = Math.max(0, dueVal - paidVal);

    // Paid members count (unique approved users)
    const paidUserIds = new Set(
      targetMonthPayments
        .map(p => p.userId?.id || p.userId?._id || p.userId || p.user?.id || p.user?._id)
        .filter(Boolean)
    );
    const paidMembersCount = paidUserIds.size;
    const pendingMembersVal = Math.max(0, totalMembersVal - paidMembersCount);

    // Target month auction
    const targetAuction = (activeChit?.auctions || []).find(a => Number(a.monthNumber) === targetMonthNum);
    
    const hasWinner = Boolean(targetAuction?.winningMember || targetAuction?.winningMemberId || targetAuction?.winningTicket);
    const winnerCodeVal = hasWinner 
      ? (targetAuction.winningMember?.memberId || targetAuction.winningTicket || ('MEMBER-' + (targetAuction.winningChitMember?.slotNumber || 1)))
      : 'Not Held';

    const winnerNameVal = hasWinner
      ? (targetAuction.winningMember?.name || 'Prize Winner')
      : `Auction pending for ${selectedMonth}`;

    const winnerNextDueVal = targetAuction?.nextPayableAmount != null
      ? Number(targetAuction.nextPayableAmount)
      : (targetAuction?.winningBidAmount != null ? Number(targetAuction.winningBidAmount) : duePerMember);

    const handleDateChange = (newDateStr) => {
      setSelectedDate(newDateStr);
      if (currentOverviewChit?.startDate && newDateStr) {
        const d = new Date(newDateStr);
        const s = new Date(currentOverviewChit.startDate);
        const diffMo = (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth()) + 1;
        const totalMo = currentOverviewChit.durationMonths || 10;
        setSelectedMonthNum(Math.min(Math.max(1, diffMo), totalMo));
      }
    };

    const handleMonthNumChange = (newMonthNum) => {
      const mNum = Number(newMonthNum);
      setSelectedMonthNum(mNum);
      const d = getChitMonthDate(currentOverviewChit, mNum);
      if (d) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(Math.min(new Date(selectedDate).getDate() || 1, 28)).padStart(2, '0');
        setSelectedDate(`${yyyy}-${mm}-${dd}`);
      }
    };

    return (
      <div className="admin-page-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Live Admin Dashboard Header with Month & Group Filter */}
        <ScrollAnimationWrapper>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Admin Dashboard
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.92rem', fontWeight: 500, margin: '0.2rem 0 0 0' }}>
                Live Chit Fund Management Overview
              </p>
            </div>

            <div className="admin-dashboard-filters" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
              {/* Group / Scheme Selector */}
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedChitId}
                  onChange={(e) => {
                    setSelectedChitId(e.target.value);
                    setSelectedMonthNum(1);
                  }}
                  className="filter-select"
                  style={{
                    appearance: 'none',
                    padding: '0.55rem 2.2rem 0.55rem 0.95rem',
                    borderRadius: '0.65rem',
                    border: '1.5px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    outline: 'none',
                    minWidth: '135px'
                  }}
                >
                  {adminChits.length > 0 ? (
                    adminChits.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  ) : (
                    <option value="">No schemes available</option>
                  )}
                </select>
                <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>

              {/* Month & Year Scheme Dropdown */}
              <div style={{ position: 'relative' }}>
                <select
                  value={targetMonthNum}
                  onChange={(e) => handleMonthNumChange(e.target.value)}
                  className="filter-select"
                  style={{
                    appearance: 'none',
                    padding: '0.55rem 2.2rem 0.55rem 0.95rem',
                    borderRadius: '0.65rem',
                    border: '1.5px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    outline: 'none',
                    minWidth: '165px'
                  }}
                >
                  {chitMonthsList.map(m => (
                    <option key={m.monthNumber} value={m.monthNumber}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>

              {/* Calendar Date Picker */}
              <div className="date-picker-wrap" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '0.65rem',
                padding: '0.45rem 0.75rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                boxSizing: 'border-box'
              }}>
                <Calendar size={15} color="#3b5bdb" style={{ flexShrink: 0 }} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                />
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
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
              >
                <RefreshCw size={16} className={loading ? "spin" : ""} />
              </button>
            </div>
          </div>
        </ScrollAnimationWrapper>

        {/* 8 Live Stat Cards Grid */}
        <div className="admin-overview-grid">
          {/* Card 1: TOTAL MEMBERS */}
          <div 
            onClick={() => navigate('/admin/all-users')} 
            className="admin-stat-card"
            style={{ borderTop: '3.5px solid #3b5bdb' }}
          >
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label" style={{ color: '#3b5bdb' }}>TOTAL MEMBERS</span>
              <Users size={17} color="#3b5bdb" />
            </div>
            <div className="admin-stat-card-value">{totalMembersVal}</div>
            <div className="admin-stat-card-subtext">{currentOverviewChit?.name || 'Chit Scheme'}</div>
          </div>

          {/* Card 2: CHIT VALUE */}
          <div 
            onClick={() => navigate('/admin/chits')} 
            className="admin-stat-card"
            style={{ borderTop: '3.5px solid #d97706' }}
          >
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label" style={{ color: '#d97706' }}>CHIT VALUE</span>
              <Coins size={17} color="#d97706" />
            </div>
            <div className="admin-stat-card-value">₹{chitValueNum.toLocaleString('en-IN')}</div>
            <div className="admin-stat-card-subtext">{chitDurationVal} Months Duration</div>
          </div>

          {/* Card 3: PAID · [MONTH] */}
          <div 
            onClick={() => navigate('/admin/chits')} 
            className="admin-stat-card"
            style={{ borderTop: '3px solid #3b5bdb', background: 'linear-gradient(180deg, #ffffff 0%, #f0f0ff 100%)' }}
          >
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label" style={{ color: '#3b5bdb' }}>PAID · {selectedMonth.toUpperCase()}</span>
              <CheckCircle size={15} color="#3b5bdb" />
            </div>
            <div className="admin-stat-card-value" style={{ color: '#3b5bdb' }}>₹{paidVal.toLocaleString('en-IN')}</div>
            <div className="admin-stat-card-subtext" style={{ color: '#1e3a8a' }}>
              {paidMembersCount} of {totalMembersVal} members paid
            </div>
          </div>

          {/* Card 4: DUE · [MONTH] */}
          <div 
            onClick={() => navigate('/admin/chits')} 
            className="admin-stat-card"
            style={{ borderTop: '3px solid #0284c7' }}
          >
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label" style={{ color: '#0284c7' }}>DUE · {selectedMonth.toUpperCase()}</span>
              <Calendar size={15} color="#0284c7" />
            </div>
            <div className="admin-stat-card-value">₹{dueVal.toLocaleString('en-IN')}</div>
            <div className="admin-stat-card-subtext">₹{duePerMember.toLocaleString('en-IN')} / member due</div>
          </div>

          {/* Card 5: PENDING · [MONTH] */}
          <div 
            onClick={() => navigate('/admin/chits')} 
            className="admin-stat-card"
            style={{ borderTop: '3px solid #ea580c', background: 'linear-gradient(180deg, #ffffff 0%, #fff7ed 100%)' }}
          >
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label" style={{ color: '#ea580c' }}>PENDING · {selectedMonth.toUpperCase()}</span>
              <AlertCircle size={15} color="#ea580c" />
            </div>
            <div className="admin-stat-card-value" style={{ color: '#ea580c' }}>₹{pendingVal.toLocaleString('en-IN')}</div>
            <div className="admin-stat-card-subtext" style={{ color: '#c2410c' }}>
              {pendingVal === 0 ? 'All dues collected' : 'Pending balance due'}
            </div>
          </div>

          {/* Card 6: PENDING MEMBERS */}
          <div 
            onClick={() => navigate('/admin/chits')} 
            className="admin-stat-card"
            style={{ borderTop: '3px solid #e11d48', background: 'linear-gradient(180deg, #ffffff 0%, #fff1f2 100%)' }}
          >
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label" style={{ color: '#e11d48' }}>PENDING MEMBERS</span>
              <Clock size={15} color="#e11d48" />
            </div>
            <div className="admin-stat-card-value" style={{ color: '#e11d48' }}>{pendingMembersVal}</div>
            <div className="admin-stat-card-subtext" style={{ color: '#be123c' }}>
              {pendingMembersVal === 0 ? 'Fully paid for month' : `${pendingMembersVal} awaiting payment`}
            </div>
          </div>

          {/* Card 7: WINNER · THIS MONTH */}
          <div 
            onClick={() => navigate('/admin/auctions')} 
            className="admin-stat-card"
            style={{ borderTop: '3px solid #8b5cf6', background: 'linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%)' }}
          >
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label" style={{ color: '#7c3aed' }}>WINNER · {hasWinner ? 'THIS MONTH' : 'AUCTION'}</span>
              <Award size={15} color="#7c3aed" />
            </div>
            <div className="admin-stat-card-value" style={{ color: '#6d28d9', fontSize: hasWinner ? undefined : '1.18rem' }}>{winnerCodeVal}</div>
            <div className="admin-stat-card-subtext" style={{ color: '#5b21b6' }}>{winnerNameVal}</div>
          </div>

          {/* Card 8: WINNER NEXT-MO DUE */}
          <div 
            onClick={() => navigate('/admin/auctions')} 
            className="admin-stat-card"
            style={{ borderTop: '3px solid #f59e0b', background: 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)' }}
          >
            <div className="admin-stat-card-header">
              <span className="admin-stat-card-label" style={{ color: '#b45309' }}>WINNER NEXT-MO DUE</span>
              <Sparkles size={15} color="#d97706" />
            </div>
            <div className="admin-stat-card-value" style={{ color: '#b45309' }}>₹{winnerNextDueVal.toLocaleString('en-IN')}</div>
            <div className="admin-stat-card-subtext" style={{ color: '#92400e' }}>
              {targetAuction?.dividendPerMember ? `Dividend: ₹${Number(targetAuction.dividendPerMember).toLocaleString('en-IN')}` : 'Installment amount'}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="dashboard-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1.75fr 1fr', gap: '1.5rem' }}>

          {/* Left: Action Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Pending Payments — highlighted card */}
            <div style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px -4px rgba(59, 91, 219, 0.1)', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #172554 0%, #3b5bdb 60%, #1e3a8a 100%)', padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.07)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileCheck size={22} color="#fff" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>Monthly Dues & Payments</h3>
                      <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Record member payments & reduce dues</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: 0, fontWeight: 500, flex: '1 1 200px', minWidth: 0 }}>
                  Manage monthly due amounts and record payments with uploaded receipt proofs.
                </p>
                <Link to="/admin/chits" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#eef2ff', color: '#1e3a8a', fontWeight: 800, fontSize: '0.9rem', padding: '0.55rem 1.1rem', borderRadius: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid rgba(59, 91, 219, 0.32)', flexShrink: 0, boxShadow: '0 2px 8px rgba(59, 91, 219, 0.16)' }}>
                  <span>View Schemes</span><ArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* Chit Management */}
            <div style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px -4px rgba(59, 91, 219, 0.1)', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #1e3a8a 60%, #172554 100%)', padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
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
                <Link to="/admin/chits" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#eef2ff', color: '#3b5bdb', fontWeight: 800, fontSize: '0.9rem', padding: '0.55rem 1.1rem', borderRadius: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #c7d2fe', flexShrink: 0 }}>
                  <span>Manage</span><ArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* Chit Auctions */}
            <div style={{ backgroundColor: '#fff', borderRadius: '1.25rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)', padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.07)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Gavel size={22} color="#fff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>Chit Auctions</h3>
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Conduct monthly auctions & payouts</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: 0, fontWeight: 500, flex: '1 1 200px', minWidth: 0 }}>
                  Award monthly prize payouts to winning members and save receipt records.
                </p>
                <Link to="/admin/auctions" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '0.9rem', padding: '0.55rem 1.1rem', borderRadius: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #bfdbfe', flexShrink: 0 }}>
                  <span>Open Auctions</span><ArrowRight size={15} />
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
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', margin: 0 }}>All Members Directory</h4>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{stats?.totalUsers || 0} registered members</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0.85rem 1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: 0, fontWeight: 500, flex: '1 1 200px', minWidth: 0 }}>
                    Manage member profiles, view KYC documents, and monitor customer ledgers.
                  </p>
                  <Link to="/admin/all-users" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#fff7ed', color: '#ea580c', fontWeight: 800, fontSize: '0.9rem', padding: '0.55rem 1.1rem', borderRadius: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #ffedd5', flexShrink: 0 }}>
                    <span>All Users</span><ArrowRight size={15} />
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
                  { label: 'Total Chits', value: stats?.totalChits || 0, color: '#3b5bdb', pct: Math.min(((stats?.totalChits || 0) / 20) * 100, 100) },
                  { label: 'Active Chits', value: stats?.activeChits || 0, color: '#3b5bdb', pct: stats?.totalChits ? Math.round(((stats?.activeChits || 0) / stats.totalChits) * 100) : 0 },
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
                  { label: 'Chit Schemes & Dues', sub: 'Manage chits & monthly dues', path: '/admin/chits', color: '#3b5bdb', bg: '#eff6ff' },
                  { label: 'All Users', sub: 'Registered members & profiles', path: '/admin/all-users', color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'Chit Auctions', sub: 'Award payouts & proof', path: '/admin/auctions', color: '#7c3aed', bg: '#f5f3ff' },
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
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#3b5bdb', lineHeight: 1 }}>₹{((stats?.totalRevenue || 0) / 1000).toFixed(1)}K</span>
                <span style={{ fontSize: '0.88rem', color: '#4b5563', fontWeight: 600, marginBottom: '0.2rem' }}>total collected</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#f3f4f6', borderRadius: '1rem', overflow: 'hidden', marginBottom: '0.65rem' }}>
                <div style={{ height: '100%', width: `${Math.min(((stats?.totalRevenue || 0) / 500000) * 100, 100)}%`, background: 'linear-gradient(90deg, #3b5bdb, #3b5bdb)', borderRadius: '1rem' }} />
              </div>
              <span style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: 600 }}>across {stats?.totalChits || 0} chit pools</span>
            </div>

          </div>
        </div>

        <style>{`
          .admin-overview-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.15rem;
            margin-bottom: 2rem;
          }

          .admin-stat-card {
            background-color: #ffffff;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            padding: 1.25rem 1.35rem;
            box-shadow: 0 4px 15px -2px rgba(15, 23, 42, 0.04);
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            justifyContent: space-between;
            min-height: 115px;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
          }

          .admin-stat-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px -3px rgba(15, 23, 42, 0.1);
          }

          .admin-stat-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
          }

          .admin-stat-card-label {
            font-size: 0.72rem;
            font-weight: 800;
            color: #64748b;
            letter-spacing: 0.4px;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .admin-stat-card-value {
            font-size: 1.65rem;
            font-weight: 800;
            line-height: 1.15;
            color: #0f172a;
            word-break: break-word;
          }

          .admin-stat-card-subtext {
            font-size: 0.78rem;
            font-weight: 600;
            color: #64748b;
            margin-top: 0.35rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          @media (max-width: 1024px) {
            .admin-overview-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 1rem !important;
            }
          }

          @media (max-width: 640px) {
            .admin-overview-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 0.65rem !important;
              margin-bottom: 1.5rem !important;
            }
            .admin-stat-card {
              padding: 0.85rem 0.9rem !important;
              border-radius: 14px !important;
              min-height: 100px !important;
            }
            .admin-stat-card-label {
              font-size: 0.63rem !important;
              letter-spacing: 0.2px !important;
            }
            .admin-stat-card-value {
              font-size: 1.25rem !important;
            }
            .admin-stat-card-subtext {
              font-size: 0.72rem !important;
            }
            .admin-dashboard-filters {
              width: 100% !important;
              display: grid !important;
              grid-template-columns: 1fr 1fr auto !important;
              gap: 0.5rem !important;
            }
            .admin-dashboard-filters .filter-select {
              width: 100% !important;
              min-width: 0 !important;
              padding: 0.5rem 1.6rem 0.5rem 0.65rem !important;
              font-size: 0.8rem !important;
            }
            .admin-dashboard-filters .date-picker-wrap {
              grid-column: span 2 !important;
              width: 100% !important;
              justify-content: center !important;
            }
            .dashboard-grid-layout {
              grid-template-columns: 1fr !important;
              gap: 1.25rem !important;
            }
          }

          @media (max-width: 380px) {
            .admin-stat-card-value {
              font-size: 1.12rem !important;
            }
            .admin-stat-card-label {
              font-size: 0.58rem !important;
            }
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
          <div className="compact-stat-icon" style={{ color: '#3b5bdb' }}>
            <Briefcase size={16} />
          </div>
          <span className="compact-stat-label">Active</span>
          <span className="compact-stat-value" style={{ color: '#124d2a' }}>{activeChits.length}</span>
        </div>

        <div className="compact-stat-item">
          <div className="compact-stat-icon" style={{ color: '#3b5bdb' }}>
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
                  backgroundColor: '#3b5bdb', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)', flexShrink: 0
                }}>
                  <Briefcase size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 className="primary-chit-title" style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', lineHeight: 1.25, margin: 0, wordBreak: 'break-word' }}>{primaryChit.name}</h3>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>ID: {chitIdText}</span>
                    <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.5rem', backgroundColor: '#eef2ff', color: '#3b5bdb', borderRadius: '1rem', fontWeight: 700 }}>Active</span>
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
                <span style={{ fontSize: '0.7rem', padding: '0.12rem 0.65rem', borderRadius: '1rem', border: '1px solid #c7d2fe', backgroundColor: '#eef2ff', color: '#3b5bdb', fontWeight: 600 }}>{paymentStatus}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563' }}>
                  <ListFilter size={15} color="#3b82f6" />
                  <span>Installment History</span>
                </div>
                <Link to="/my-chits" style={{ color: '#3b5bdb', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
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
                backgroundColor: '#eef2ff', border: '1.5px solid #3b82f6',
                color: '#3b5bdb', fontWeight: 700, fontSize: '0.86rem',
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
