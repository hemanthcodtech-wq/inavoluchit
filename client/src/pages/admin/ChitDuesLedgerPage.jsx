import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  Calendar,
  IndianRupee,
  CreditCard,
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  TrendingUp,
  Clock,
  Pencil,
  Trash2,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  FileSpreadsheet,
  ExternalLink,
  Phone,
  Receipt
} from 'lucide-react';
import * as XLSX from 'xlsx';
import SetMonthlyDueModal from '../../components/SetMonthlyDueModal';
import RecordChitPaymentModal from '../../components/RecordChitPaymentModal';
import { formatChitMonthYear, formatChitMonthFull, formatChitMonthWithNum } from '../../utils/chitDateUtils';

const ChitDuesLedgerPage = () => {
  const { chitId } = useParams();
  const navigate = useNavigate();
  const { token, API_URL, SERVER_URL } = useAuth();

  // Core Data States
  const [duesData, setDuesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(1);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, paid, partial, unpaid
  const [slotsFilter, setSlotsFilter] = useState('all'); // all, single, multi
  const [proofFilter, setProofFilter] = useState('all'); // all, with_proof, cash, none
  const [sortBy, setSortBy] = useState('name-asc'); // name-asc, name-desc, due-desc, due-asc, remaining-desc, paid-desc

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10, 25, 50, 100

  // Sub-modal States
  const [isSetDueOpen, setIsSetDueOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentTargetUser, setPaymentTargetUser] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);

  // Lightbox Preview for Receipts
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Month Carousel Reference
  const monthsListRef = useRef(null);

  // Fetch Ledger Summary
  const fetchDuesSummary = useCallback(async (options = {}) => {
    if (!chitId) return;
    if (options.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const res = await fetch(`${API_URL}/admin/chits/${chitId}/dues-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDuesData(data.data);
        if (!options.preserveMonth && !selectedMonth && data.data.chit?.currentMonth) {
          setSelectedMonth(data.data.chit.currentMonth);
        }
      } else {
        setError(data.message || 'Failed to load chit dues summary.');
      }
    } catch (err) {
      console.error('Error fetching dues summary:', err);
      setError('Connection error loading chit dues summary. Please check your network.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [chitId, token, API_URL]);

  useEffect(() => {
    fetchDuesSummary();
  }, [fetchDuesSummary]);

  // When dues data loads initially, set to active chit month if not set
  useEffect(() => {
    if (duesData?.chit?.currentMonth && (!selectedMonth || selectedMonth === 1)) {
      setSelectedMonth(duesData.chit.currentMonth);
    }
  }, [duesData?.chit?.currentMonth]);

  // Delete Payment Record
  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record? The user monthly due balance will be restored.')) return;
    try {
      const res = await fetch(`${API_URL}/admin/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchDuesSummary({ preserveMonth: true, silent: true });
      } else {
        alert(data.message || 'Failed to delete payment');
      }
    } catch (err) {
      console.error('Error deleting payment:', err);
      alert('Connection error deleting payment');
    }
  };

  const chit = duesData?.chit;
  const members = duesData?.members || [];
  const duration = chit?.durationMonths || 20;

  // Selected Month Calculations
  const monthConfig = (chit?.monthlyDues || []).find((d) => d.monthNumber === selectedMonth);
  const isMonthConfigured = Boolean(monthConfig);
  const baseDueForMonth = isMonthConfigured ? Number(monthConfig.dueAmount || 0) : 0;

  // Compute Overall Month Metrics
  const monthMetrics = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let fullyPaid = 0;
    let partiallyPaid = 0;
    let unpaid = 0;
    let totalPaymentsCount = 0;

    members.forEach((m) => {
      const mData = m.months?.find((x) => x.monthNumber === selectedMonth);
      const slots = m.slotsCount || 1;
      const due = isMonthConfigured ? (mData?.totalDue ?? (slots * baseDueForMonth)) : 0;
      const paid = mData?.amountPaid ?? 0;
      const payments = mData?.payments || [];
      totalPaymentsCount += payments.length;

      totalExpected += due;
      totalCollected += paid;

      if (isMonthConfigured) {
        if (mData?.isPaid) {
          fullyPaid++;
        } else if (mData?.isPartial) {
          partiallyPaid++;
        } else {
          unpaid++;
        }
      } else {
        if (paid > 0) {
          partiallyPaid++;
        } else {
          unpaid++;
        }
      }
    });

    const totalOutstanding = isMonthConfigured ? Math.max(0, totalExpected - totalCollected) : 0;
    const collectionPercentage = totalExpected > 0 ? Math.min(100, Math.round((totalCollected / totalExpected) * 100)) : 0;

    return {
      totalExpected,
      totalCollected,
      totalOutstanding,
      collectionPercentage,
      fullyPaid,
      partiallyPaid,
      unpaid,
      totalPaymentsCount,
      totalMembers: members.length
    };
  }, [members, selectedMonth, isMonthConfigured, baseDueForMonth]);

  // Filtered & Sorted Members List
  const filteredAndSortedMembers = useMemo(() => {
    return members
      .filter((m) => {
        const u = m.user || {};
        const mData = m.months?.find((x) => x.monthNumber === selectedMonth) || {};
        const payments = mData.payments || [];

        // 1. Search Query Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matches =
            (u.name && u.name.toLowerCase().includes(q)) ||
            (u.email && u.email.toLowerCase().includes(q)) ||
            (u.phone && u.phone.toLowerCase().includes(q)) ||
            (u.memberId && u.memberId.toLowerCase().includes(q)) ||
            (m.ticketIds && m.ticketIds.some((t) => t.toLowerCase().includes(q)));
          if (!matches) return false;
        }

        // 2. Status Filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'paid' && !mData.isPaid) return false;
          if (statusFilter === 'partial' && !mData.isPartial) return false;
          if (statusFilter === 'unpaid') {
            const hasPaid = (mData.amountPaid || 0) > 0;
            if (hasPaid) return false;
          }
        }

        // 3. Slots Filter
        if (slotsFilter === 'single' && (m.slotsCount || 1) !== 1) return false;
        if (slotsFilter === 'multi' && (m.slotsCount || 1) <= 1) return false;

        // 4. Proof Filter
        if (proofFilter === 'with_proof') {
          const hasProof = payments.some((p) => p.proofImgUrl && p.proofImgUrl !== 'MANUAL_ENTRY');
          if (!hasProof) return false;
        } else if (proofFilter === 'cash') {
          const hasCashOrManual = payments.some((p) => !p.proofImgUrl || p.proofImgUrl === 'MANUAL_ENTRY' || p.paymentMode === 'Cash');
          if (!hasCashOrManual) return false;
        } else if (proofFilter === 'none') {
          if (payments.length > 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aUser = a.user || {};
        const bUser = b.user || {};
        const aMonth = a.months?.find((x) => x.monthNumber === selectedMonth) || {};
        const bMonth = b.months?.find((x) => x.monthNumber === selectedMonth) || {};

        switch (sortBy) {
          case 'name-asc':
            return (aUser.name || '').localeCompare(bUser.name || '');
          case 'name-desc':
            return (bUser.name || '').localeCompare(aUser.name || '');
          case 'due-desc':
            return (bMonth.totalDue || 0) - (aMonth.totalDue || 0);
          case 'due-asc':
            return (aMonth.totalDue || 0) - (bMonth.totalDue || 0);
          case 'remaining-desc':
            return (bMonth.remainingDue || 0) - (aMonth.remainingDue || 0);
          case 'paid-desc':
            return (bMonth.amountPaid || 0) - (aMonth.amountPaid || 0);
          case 'slots-desc':
            return (b.slotsCount || 1) - (a.slotsCount || 1);
          default:
            return 0;
        }
      });
  }, [members, selectedMonth, searchQuery, statusFilter, slotsFilter, proofFilter, sortBy]);

  // Reset page to 1 whenever filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, slotsFilter, proofFilter, sortBy, selectedMonth]);

  // Pagination Calculations
  const totalItems = filteredAndSortedMembers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedMembers = filteredAndSortedMembers.slice(startIndex, startIndex + pageSize);

  // Month navigation scroll helpers
  const scrollMonths = (direction) => {
    if (monthsListRef.current) {
      const scrollAmt = direction === 'left' ? -220 : 220;
      monthsListRef.current.scrollBy({ left: scrollAmt, behavior: 'smooth' });
    }
  };

  const scrollToActiveMonth = () => {
    if (monthsListRef.current) {
      const activeEl = monthsListRef.current.querySelector('.chit-page-month-chip.active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  useEffect(() => {
    scrollToActiveMonth();
  }, [selectedMonth]);

  // Image URL Helper
  const getFullImgUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${SERVER_URL}${cleanPath}`;
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (!chit || members.length === 0) {
      alert('No data available to export.');
      return;
    }

    const rows = filteredAndSortedMembers.map((m, index) => {
      const u = m.user || {};
      const mData = m.months?.find((x) => x.monthNumber === selectedMonth) || {};
      const payments = mData.payments || [];
      const paymentDetails = payments
        .map((p) => `₹${p.amount} (${p.paymentMode || 'Cash'}, ${p.transactionId ? 'Tx: ' + p.transactionId : 'Manual'})`)
        .join('; ');

      let statusLabel = 'Unpaid';
      if (mData.isPaid) statusLabel = 'Fully Paid';
      else if (mData.isPartial) statusLabel = 'Partially Paid';
      else if (!isMonthConfigured) statusLabel = 'Due Not Scheduled';

      return {
        'S.No': index + 1,
        'Member Name': u.name || 'Member',
        'Member ID': u.memberId || '--',
        'Phone': u.phone || '--',
        'Email': u.email || '--',
        'Slots Count': m.slotsCount || 1,
        'Ticket IDs': (m.ticketIds || []).join(', ') || '--',
        'Installment Due (₹)': mData.totalDue || 0,
        'Amount Paid (₹)': mData.amountPaid || 0,
        'Remaining Due (₹)': mData.remainingDue || 0,
        'Payment Status': statusLabel,
        'Receipts / Transactions': paymentDetails || 'None'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    const sheetName = `Month_${selectedMonth}_Dues`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

    const fileName = `${chit.name || 'Chit'}_Month_${selectedMonth}_Dues_Ledger.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Print Official Ledger
  const handlePrint = () => {
    window.print();
  };

  // Clear all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSlotsFilter('all');
    setProofFilter('all');
    setSortBy('name-asc');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || slotsFilter !== 'all' || proofFilter !== 'all' || sortBy !== 'name-asc';

  return (
    <div className="chit-ledger-root">

      {/* Top Breadcrumb & Back Navigation */}
      <div className="chit-top-nav no-print">
        <div className="chit-breadcrumbs">
          <Link to="/admin/chits" className="crumb-link">
            <ArrowLeft size={14} />
            <span>Chit Schemes</span>
          </Link>
          <span className="crumb-sep">/</span>
          <span className="crumb-scheme">{chit?.name || 'Scheme'}</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">Monthly Dues Ledger</span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin/chits')}
          className="btn-back-schemes"
          title="Return to Chit Schemes"
        >
          <ArrowLeft size={13} />
          <span>Back to Schemes</span>
        </button>
      </div>

      {/* Formal Executive Header Bar */}
      <div className="chit-executive-header">
        <div className="header-left-col">
          <div className="header-badge-row">
            <span className="badge-name">{chit?.name || 'Chit Scheme'}</span>
            <span className="badge-pill pool">Pool: ₹{Number(chit?.chitValue || 0).toLocaleString()}</span>
            <span className={`badge-pill status status-${chit?.status || 'active'}`}>
              ● {chit?.status ? chit.status.toUpperCase() : 'ACTIVE'}
            </span>
            <span className="badge-pill cycle">
              {formatChitMonthYear(chit, selectedMonth)} • Month {selectedMonth}/{duration}
            </span>
            <span className="badge-pill members">
              <Users size={11} />
              <span>{members.length} Enrolled</span>
            </span>
          </div>
          <h1 className="header-title">Monthly Dues & Member Collections Ledger</h1>
          <p className="header-subtitle">
            Audited installment dues, member slot balances, verified receipt proofs, and collection clearance ledger.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="header-actions-col no-print">
          <button
            type="button"
            className="btn-header-due"
            onClick={() => setIsSetDueOpen(true)}
            title="Configure monthly due payable by members"
          >
            <Sliders size={13} />
            <span>Set Month Due</span>
          </button>

          <button
            type="button"
            className="btn-header-record"
            onClick={() => {
              setPaymentTargetUser(null);
              setEditingPayment(null);
              setIsRecordPaymentOpen(true);
            }}
            title="Record member payment"
          >
            <Plus size={14} />
            <span>Record Payment</span>
          </button>

          <button
            type="button"
            className="btn-header-tool"
            onClick={handleExportExcel}
            title="Export to Excel"
          >
            <FileSpreadsheet size={13} />
            <span>Export</span>
          </button>

          <button
            type="button"
            className="btn-header-tool"
            onClick={handlePrint}
            title="Print Ledger"
          >
            <Printer size={13} />
            <span>Print</span>
          </button>

          <button
            type="button"
            className="btn-header-tool"
            onClick={() => fetchDuesSummary({ preserveMonth: true, silent: true })}
            disabled={loading || refreshing}
            title="Refresh Ledger"
          >
            <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? '...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Months Strip */}
      <div className="chit-months-strip no-print">
        <div className="months-strip-tag">
          <Calendar size={13} />
          <span>Months:</span>
        </div>

        <button
          type="button"
          className="btn-month-scroll"
          onClick={() => scrollMonths('left')}
          title="Scroll Left"
        >
          <ChevronLeft size={15} />
        </button>

        <div className="months-scroll-container" ref={monthsListRef}>
          {Array.from({ length: duration }, (_, i) => i + 1).map((m) => {
            const isSelected = selectedMonth === m;
            const config = (chit?.monthlyDues || []).find((d) => d.monthNumber === m);
            const isConfigured = Boolean(config);
            const isChitCurrentMonth = chit?.currentMonth === m;

            return (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMonth(m)}
                className={`chit-page-month-chip ${isSelected ? 'active' : ''} ${isConfigured ? 'configured' : 'unconfigured'}`}
                title={`Month ${m}: ${formatChitMonthFull(chit, m)}`}
              >
                <div className="chip-top">
                  <span className="chip-name">{formatChitMonthYear(chit, m)}</span>
                  <span className="chip-idx">M{m}</span>
                </div>
                <div className="chip-bottom">
                  {isConfigured ? (
                    <span className="chip-rate">₹{Number(config.dueAmount).toLocaleString()}</span>
                  ) : (
                    <span className="chip-not-set">Not Set</span>
                  )}
                  {isChitCurrentMonth && <span className="chip-dot" title="Current Active Month" />}
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="btn-month-scroll"
          onClick={() => scrollMonths('right')}
          title="Scroll Right"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* 4 Compact Formal Financial KPI Cards */}
      <div className="chit-kpi-grid">

        {/* Card 1: Due Rate */}
        <div className="kpi-card border-blue">
          <div className="kpi-header-row">
            <span className="kpi-label">
              {formatChitMonthYear(chit, selectedMonth)} Due Rate
            </span>
            <div className="kpi-icon-pill icon-blue">
              <IndianRupee size={12} />
            </div>
          </div>
          <div className="kpi-main-row">
            <span className="kpi-num">
              {isMonthConfigured ? `₹${baseDueForMonth.toLocaleString()}` : 'Not Set'}
            </span>
            {isMonthConfigured && <span className="kpi-tag tag-green">Configured</span>}
          </div>
          <div className="kpi-caption">
            {isMonthConfigured ? (
              <span>₹{baseDueForMonth.toLocaleString()} per ticket/slot</span>
            ) : (
              <span className="text-amber">Installment rate not scheduled</span>
            )}
          </div>
        </div>

        {/* Card 2: Total Collected */}
        <div className="kpi-card border-green">
          <div className="kpi-header-row">
            <span className="kpi-label text-green">Total Collected</span>
            <div className="kpi-icon-pill icon-green">
              <TrendingUp size={12} />
            </div>
          </div>
          <div className="kpi-main-row">
            <span className="kpi-num text-green">
              ₹{monthMetrics.totalCollected.toLocaleString()}
            </span>
            <span className="kpi-tag tag-green">{monthMetrics.collectionPercentage}%</span>
          </div>
          <div className="kpi-progress">
            <div className="kpi-fill" style={{ width: `${monthMetrics.collectionPercentage}%` }} />
          </div>
          <div className="kpi-caption flex-between">
            <span>{monthMetrics.fullyPaid} of {monthMetrics.totalMembers} paid</span>
            <span className="font-bold">{monthMetrics.collectionPercentage}% Clearance</span>
          </div>
        </div>

        {/* Card 3: Remaining Due */}
        <div className="kpi-card border-red">
          <div className="kpi-header-row">
            <span className="kpi-label text-red">Remaining Due</span>
            <div className="kpi-icon-pill icon-red">
              <Clock size={12} />
            </div>
          </div>
          <div className="kpi-main-row">
            <span className={`kpi-num ${monthMetrics.totalOutstanding > 0 ? 'text-red' : 'text-slate'}`}>
              ₹{monthMetrics.totalOutstanding.toLocaleString()}
            </span>
            {monthMetrics.totalOutstanding === 0 && isMonthConfigured && (
              <span className="kpi-tag tag-green">Cleared</span>
            )}
          </div>
          <div className="kpi-caption">
            {isMonthConfigured ? (
              <span>Expected: <strong>₹{monthMetrics.totalExpected.toLocaleString()}</strong></span>
            ) : (
              <span className="text-slate">Schedule rate to calculate</span>
            )}
          </div>
        </div>

        {/* Card 4: Health & Receipts */}
        <div className="kpi-card border-purple">
          <div className="kpi-header-row">
            <span className="kpi-label text-purple">Ledger Receipts</span>
            <div className="kpi-icon-pill icon-purple">
              <CreditCard size={12} />
            </div>
          </div>
          <div className="kpi-main-row">
            <span className="kpi-num text-purple">
              {monthMetrics.totalPaymentsCount} Receipts
            </span>
            {monthMetrics.partiallyPaid > 0 && (
              <span className="kpi-tag tag-amber">{monthMetrics.partiallyPaid} Partial</span>
            )}
          </div>
          <div className="kpi-caption">
            <span>{monthMetrics.unpaid} pending • {members.length} members total</span>
          </div>
        </div>

      </div>

      {/* Unconfigured Alert Banner */}
      {!isMonthConfigured && (
        <div className="chit-alert-bar no-print">
          <div className="alert-content">
            <AlertCircle size={16} className="alert-icon" />
            <span>
              Due rate is <strong>not scheduled</strong> for <strong>{formatChitMonthYear(chit, selectedMonth)} (Month {selectedMonth})</strong>. Member balances show ₹0 until scheduled.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsSetDueOpen(true)}
            className="btn-alert-action"
          >
            <Sliders size={12} />
            <span>Set Month {selectedMonth} Due</span>
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="chit-table-card">

        {/* Compact Formal Filter Toolbar */}
        <div className="chit-table-toolbar no-print">
          
          {/* Left: Title + Search */}
          <div className="toolbar-left-group">
            <div className="toolbar-heading">
              <Users size={15} color="#2563eb" />
              <span>Enrolled Members</span>
              <span className="badge-count">{filteredAndSortedMembers.length}</span>
            </div>

            <div className="search-wrap">
              <Search size={13} className="search-icon" />
              <input
                type="text"
                placeholder="Search member, ID, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-field"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="search-clear"
                  title="Clear"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Right: Inline Formal Filters */}
          <div className="toolbar-filters-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-dropdown"
              title="Filter by Payment Status"
            >
              <option value="all">All Members</option>
              <option value="paid">Fully Paid</option>
              <option value="partial">Partially Paid</option>
              <option value="unpaid">Unpaid / Due Pending</option>
            </select>

            <select
              value={slotsFilter}
              onChange={(e) => setSlotsFilter(e.target.value)}
              className="filter-dropdown"
              title="Filter by Slots"
            >
              <option value="all">All Slots</option>
              <option value="single">1 Slot</option>
              <option value="multi">2+ Slots</option>
            </select>

            <select
              value={proofFilter}
              onChange={(e) => setProofFilter(e.target.value)}
              className="filter-dropdown"
              title="Filter by Proof"
            >
              <option value="all">All Proofs</option>
              <option value="with_proof">With Photo</option>
              <option value="cash">Cash / Offline</option>
              <option value="none">No Receipts</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-dropdown"
              title="Sort By"
            >
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
              <option value="due-desc">Due (High → Low)</option>
              <option value="remaining-desc">Remaining Due (High)</option>
              <option value="paid-desc">Paid (High → Low)</option>
              <option value="slots-desc">Most Slots</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="filter-dropdown per-page-dropdown"
              title="Rows per page"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-clear-filters"
                title="Reset all filters"
              >
                <X size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>

        </div>

        {/* Table Content */}
        {loading ? (
          <div className="ledger-loading-state">
            <RefreshCw size={22} className="spin text-blue" />
            <span>Loading ledger dues...</span>
          </div>
        ) : filteredAndSortedMembers.length === 0 ? (
          <div className="ledger-empty-state">
            <Users size={32} color="#94a3b8" />
            <h4>No Members Found</h4>
            <p>
              {hasActiveFilters
                ? 'No member records match the filter criteria.'
                : 'No approved members enrolled in this chit scheme yet.'}
            </p>
            {hasActiveFilters && (
              <button type="button" onClick={handleResetFilters} className="btn-empty-reset">
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* DESKTOP FORMAL COMPACT TABLE */}
            <div className="table-wrapper">
              <table className="formal-ledger-table">
                <thead>
                  <tr>
                    <th className="col-center" style={{ width: '38px' }}>#</th>
                    <th style={{ width: '220px' }}>MEMBER INFO</th>
                    <th style={{ width: '115px' }}>SLOTS / TICKETS</th>
                    <th className="col-right" style={{ width: '110px' }}>
                      {formatChitMonthYear(chit, selectedMonth)} DUE
                    </th>
                    <th className="col-right" style={{ width: '110px' }}>AMOUNT PAID</th>
                    <th className="col-center" style={{ width: '125px' }}>REMAINING DUE</th>
                    <th className="col-right" style={{ width: '130px' }}>EXCESS WITH US</th>
                    <th>RECEIPT PROOFS</th>
                    <th className="col-right" style={{ width: '100px' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.map((m, idx) => {
                    const u = m.user || {};
                    const mData = m.months?.find((x) => x.monthNumber === selectedMonth) || {};
                    const isFullyPaid = mData.isPaid;
                    const isPartial = mData.isPartial;
                    const payments = mData.payments || [];
                    const serialNum = startIndex + idx + 1;
                    const slots = m.slotsCount || 1;

                    return (
                      <tr key={u._id || u.id || idx} className={isFullyPaid ? 'tr-paid' : ''}>

                        {/* S.No */}
                        <td className="col-center cell-num">{serialNum}</td>

                        {/* Member Info */}
                        <td>
                          <div className="member-cell">
                            <div className="member-avatar">
                              {(u.name || 'M').charAt(0).toUpperCase()}
                            </div>
                            <div className="member-text">
                              <span className="member-name">{u.name || 'Member'}</span>
                              <div className="member-sub">
                                {u.memberId && <span className="member-id">ID: {u.memberId}</span>}
                                {u.phone && (
                                  <span className="member-phone">
                                    <Phone size={9} />
                                    {u.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Slots */}
                        <td>
                          <div className="slots-cell">
                            <span className={`slot-tag ${slots > 1 ? 'multi' : 'single'}`}>
                              {slots} {slots === 1 ? 'Slot' : 'Slots'}
                            </span>
                            <div className="ticket-text" title={(m.ticketIds || []).join(', ')}>
                              {(m.ticketIds || []).join(', ') || `TICKET-${slots}`}
                            </div>
                          </div>
                        </td>

                        {/* Month Due */}
                        <td className="col-right">
                          {isMonthConfigured ? (
                            <div className="due-stack">
                              <span className="cell-amt bold">
                                ₹{(mData.totalDue || 0).toLocaleString()}
                              </span>
                              {slots > 1 && (
                                <span className="cell-calc">
                                  {slots} × ₹{baseDueForMonth.toLocaleString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="cell-muted">Not Set</span>
                          )}
                        </td>

                        {/* Amount Paid */}
                        <td className="col-right">
                          <span className="cell-amt bold text-green">
                            ₹{(mData.amountPaid || 0).toLocaleString()}
                          </span>
                          {mData.excessApplied > 0 && (
                            <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 800, marginTop: '0.1rem' }}>
                              {mData.directPaid > 0
                                ? `(₹${mData.directPaid.toLocaleString()} paid + ₹${mData.excessApplied.toLocaleString()} adv)`
                                : `(₹${mData.excessApplied.toLocaleString()} Adv Credit)`}
                            </div>
                          )}
                        </td>

                        {/* Remaining Due / Status */}
                        <td className="col-center">
                          {isMonthConfigured ? (
                            isFullyPaid ? (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                                <span className="status-badge badge-cleared">
                                  <CheckCircle2 size={11} />
                                  <span>Fully Paid</span>
                                </span>
                                {mData.monthSurplus > 0 && (
                                  <span style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 800, backgroundColor: '#dcfce7', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #86efac' }}>
                                    +₹{mData.monthSurplus.toLocaleString()} Advance
                                  </span>
                                )}
                                {mData.excessApplied > 0 && mData.directPaid === 0 && (
                                  <span style={{ fontSize: '0.65rem', color: '#1d4ed8', fontWeight: 800, backgroundColor: '#eff6ff', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                                    Adv Credit Settled
                                  </span>
                                )}
                              </div>
                            ) : isPartial ? (
                              <span className="status-badge badge-partial">
                                <span>₹{(mData.remainingDue || 0).toLocaleString()} Due</span>
                              </span>
                            ) : (
                              <span className="status-badge badge-unpaid">
                                <span>₹{(mData.remainingDue || 0).toLocaleString()} Due</span>
                              </span>
                            )
                          ) : (
                            (mData.amountPaid || 0) > 0 ? (
                              <span className="status-badge badge-cleared">
                                <span>Adv: ₹{(mData.amountPaid || 0).toLocaleString()}</span>
                              </span>
                            ) : (
                              <span className="status-badge badge-not-set">
                                <span>Due Not Set</span>
                              </span>
                            )
                          )}
                        </td>

                        {/* Excess with Us */}
                        <td className="col-right">
                          {(mData.excessCarriedOver > 0 || mData.monthSurplus > 0) ? (
                            <div>
                              <span className="cell-amt bold text-green" style={{ display: 'block' }}>
                                +₹{(mData.excessCarriedOver || mData.monthSurplus || 0).toLocaleString()}
                              </span>
                              <span style={{
                                display: 'inline-block',
                                fontSize: '0.65rem',
                                color: '#15803d',
                                fontWeight: 800,
                                backgroundColor: '#dcfce7',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                border: '1px solid #86efac',
                                marginTop: '0.15rem'
                              }}>
                                Advance Balance
                              </span>
                            </div>
                          ) : (
                            <span className="cell-muted">₹0</span>
                          )}
                        </td>

                        {/* Receipts */}
                        <td>
                          {payments.length === 0 ? (
                            mData.excessApplied > 0 ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.25rem 0.55rem',
                                borderRadius: '6px',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                border: '1px solid #bfdbfe'
                              }}>
                                <span>⚖️ Settled via ₹{mData.excessApplied.toLocaleString()} Prev Month Credit</span>
                              </span>
                            ) : (
                              <span className="cell-muted italic">No payments</span>
                            )
                          ) : (
                            <div className="receipt-chips-wrap">
                              {payments.map((p, pIdx) => {
                                const hasProof = p.proofImgUrl && p.proofImgUrl !== 'MANUAL_ENTRY' && p.proofImgUrl !== 'MANUAL_ADMIN_ENTRY';
                                const hasReceiptNo = Boolean(p.receiptNo);
                                const isOnline = String(p.paymentMode || '').toLowerCase().includes('online') || String(p.paymentMode || '').toLowerCase().includes('upi');
                                return (
                                  <div key={p.id || pIdx} className="receipt-chip">
                                    <div className="receipt-chip-main">
                                      <span className="receipt-amt">₹{p.amount.toLocaleString()}</span>
                                      <span className={`receipt-mode-pill ${isOnline ? 'mode-upi' : 'mode-cash'}`}>
                                        {p.paymentMode || 'Cash'}
                                      </span>
                                    </div>
                                    <div className="receipt-chip-actions">
                                      {hasReceiptNo && (
                                        <Link
                                          to={`/receipt/${p.receiptNo}`}
                                          target="_blank"
                                          className="btn-chip-action official-doc"
                                          title={`Official Receipt: ${p.receiptNo}`}
                                        >
                                          <Receipt size={11} />
                                        </Link>
                                      )}
                                      {hasProof && (
                                        <button
                                          type="button"
                                          onClick={() => setLightboxUrl(getFullImgUrl(p.proofImgUrl))}
                                          className="btn-chip-action eye"
                                          title="View Uploaded Proof"
                                        >
                                          <Eye size={11} />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingPayment({
                                            id: p.id,
                                            userId: u._id || u.id,
                                            userName: u.name,
                                            monthNumber: selectedMonth,
                                            amount: p.amount,
                                            paidDate: p.paidDate,
                                            paymentMode: p.paymentMode,
                                            transactionId: p.transactionId,
                                            remarks: p.remarks,
                                            proofImgUrl: p.proofImgUrl
                                          });
                                          setPaymentTargetUser(u);
                                          setIsRecordPaymentOpen(true);
                                        }}
                                        className="btn-chip-action edit"
                                        title="Edit Payment"
                                      >
                                        <Pencil size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePayment(p.id)}
                                        className="btn-chip-action del"
                                        title="Delete Payment"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* Action */}
                        <td className="col-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPayment(null);
                              setPaymentTargetUser(u);
                              setIsRecordPaymentOpen(true);
                            }}
                            className={`btn-row-action ${isFullyPaid ? 'outline' : 'primary'}`}
                            title={`Record payment for ${u.name || 'member'}`}
                          >
                            <CreditCard size={11} />
                            <span>{isFullyPaid ? '+ Add More' : 'Record'}</span>
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS VIEW (<= 768px) */}
            <div className="mobile-cards-container no-print">
              {paginatedMembers.map((m, idx) => {
                const u = m.user || {};
                const mData = m.months?.find((x) => x.monthNumber === selectedMonth) || {};
                const isFullyPaid = mData.isPaid;
                const isPartial = mData.isPartial;
                const payments = mData.payments || [];
                const slots = m.slotsCount || 1;

                return (
                  <div key={u._id || u.id || idx} className="mobile-member-card">
                    <div className="m-card-top">
                      <div className="m-card-user">
                        <div className="member-avatar">{(u.name || 'M').charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="m-user-name">{u.name || 'Member'}</div>
                          <div className="m-user-sub">
                            {u.memberId && <span className="member-id">ID: {u.memberId}</span>}
                            {u.phone && <span className="member-phone">📞 {u.phone}</span>}
                          </div>
                        </div>
                      </div>
                      <span className={`status-badge ${isFullyPaid ? 'badge-cleared' : isPartial ? 'badge-partial' : 'badge-unpaid'}`}>
                        {isFullyPaid ? 'Fully Paid' : isPartial ? 'Partial' : 'Unpaid'}
                      </span>
                    </div>

                    <div className="m-card-slots">
                      <span className="slot-tag single">{slots} {slots === 1 ? 'Slot' : 'Slots'}</span>
                      <span className="ticket-text">{(m.ticketIds || []).join(', ') || `TICKET-${slots}`}</span>
                    </div>

                    <div className="m-stats-row">
                      <div className="m-stat-box">
                        <span className="m-stat-lbl">Due</span>
                        <span className="m-stat-val">
                          {isMonthConfigured ? `₹${(mData.totalDue || 0).toLocaleString()}` : 'Not Set'}
                        </span>
                      </div>
                      <div className="m-stat-box">
                        <span className="m-stat-lbl">Paid</span>
                        <span className="m-stat-val text-green">₹{(mData.amountPaid || 0).toLocaleString()}</span>
                      </div>
                      <div className="m-stat-box">
                        <span className="m-stat-lbl">Remaining</span>
                        <span className={`m-stat-val ${(mData.remainingDue || 0) > 0 ? 'text-red' : 'text-slate'}`}>
                          {isMonthConfigured ? `₹${(mData.remainingDue || 0).toLocaleString()}` : '₹0'}
                        </span>
                      </div>
                      <div className="m-stat-box">
                        <span className="m-stat-lbl">Excess With Us</span>
                        <span className={`m-stat-val ${(mData.excessCarriedOver || mData.monthSurplus || 0) > 0 ? 'text-green' : 'text-slate'}`}>
                          {(mData.excessCarriedOver || mData.monthSurplus || 0) > 0
                            ? `+₹${(mData.excessCarriedOver || mData.monthSurplus || 0).toLocaleString()}`
                            : '₹0'}
                        </span>
                      </div>
                    </div>

                    {payments.length > 0 && (
                      <div className="m-receipts-row">
                        <span className="m-receipts-lbl">Receipts ({payments.length}):</span>
                        <div className="receipt-chips-wrap">
                          {payments.map((p, pIdx) => {
                            const hasProof = p.proofImgUrl && p.proofImgUrl !== 'MANUAL_ENTRY' && p.proofImgUrl !== 'MANUAL_ADMIN_ENTRY';
                            const hasReceiptNo = Boolean(p.receiptNo);
                            const isOnline = String(p.paymentMode || '').toLowerCase().includes('online') || String(p.paymentMode || '').toLowerCase().includes('upi');
                            return (
                              <div key={p.id || pIdx} className="receipt-chip">
                                <div className="receipt-chip-main">
                                  <span className="receipt-amt">₹{p.amount.toLocaleString()}</span>
                                  <span className={`receipt-mode-pill ${isOnline ? 'mode-upi' : 'mode-cash'}`}>
                                    {p.paymentMode || 'Cash'}
                                  </span>
                                </div>
                                <div className="receipt-chip-actions">
                                  {hasReceiptNo && (
                                    <Link
                                      to={`/receipt/${p.receiptNo}`}
                                      target="_blank"
                                      className="btn-chip-action official-doc"
                                      title={`Official Receipt: ${p.receiptNo}`}
                                    >
                                      <Receipt size={11} />
                                    </Link>
                                  )}
                                  {hasProof && (
                                    <button type="button" onClick={() => setLightboxUrl(getFullImgUrl(p.proofImgUrl))} className="btn-chip-action eye" title="View Proof">
                                      <Eye size={11} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPayment({
                                        id: p.id,
                                        userId: u._id || u.id,
                                        userName: u.name,
                                        monthNumber: selectedMonth,
                                        amount: p.amount,
                                        paidDate: p.paidDate,
                                        paymentMode: p.paymentMode,
                                        transactionId: p.transactionId,
                                        remarks: p.remarks,
                                        proofImgUrl: p.proofImgUrl
                                      });
                                      setPaymentTargetUser(u);
                                      setIsRecordPaymentOpen(true);
                                    }}
                                    className="btn-chip-action edit"
                                    title="Edit"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button type="button" onClick={() => handleDeletePayment(p.id)} className="btn-chip-action del" title="Delete">
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEditingPayment(null);
                        setPaymentTargetUser(u);
                        setIsRecordPaymentOpen(true);
                      }}
                      className={`btn-m-action ${isFullyPaid ? 'outline' : 'primary'}`}
                    >
                      <CreditCard size={12} />
                      <span>{isFullyPaid ? '+ Add More' : 'Record Payment'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Compact Formal Pagination Bar */}
            <div className="chit-pagination no-print">
              <div className="page-summary">
                Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, totalItems)}</strong> of <strong>{totalItems}</strong> members
              </div>

              <div className="page-btns">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="page-nav-btn"
                  title="First Page"
                >
                  <ChevronsLeft size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="page-nav-btn"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>

                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                    .map((p, i, arr) => {
                      const prev = arr[i - 1];
                      return (
                        <React.Fragment key={p}>
                          {prev && p - prev > 1 && <span className="page-dots">...</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={`page-num-btn ${p === safeCurrentPage ? 'active' : ''}`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="page-nav-btn"
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="page-nav-btn"
                  title="Last Page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>

          </>
        )}

      </div>

      {/* Sub-modal: Set Monthly Due (mounted via createPortal to body) */}
      {isSetDueOpen && (
        <SetMonthlyDueModal
          isOpen={isSetDueOpen}
          onClose={() => setIsSetDueOpen(false)}
          chit={chit}
          initialMonth={selectedMonth}
          members={members}
          onDueUpdated={() => {
            fetchDuesSummary({ preserveMonth: true, silent: true });
          }}
        />
      )}

      {/* Sub-modal: Record Payment (mounted via createPortal to body) */}
      {isRecordPaymentOpen && (
        <RecordChitPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => {
            setIsRecordPaymentOpen(false);
            setEditingPayment(null);
            setPaymentTargetUser(null);
          }}
          chit={chit}
          members={members}
          editingPayment={editingPayment}
          initialUserId={editingPayment?.userId?._id || editingPayment?.userId || paymentTargetUser?.id || paymentTargetUser?._id}
          initialMonth={editingPayment?.monthNumber || selectedMonth}
          onPaymentRecorded={() => {
            fetchDuesSummary({ preserveMonth: true, silent: true });
          }}
        />
      )}

      {/* Full-screen Receipt Lightbox */}
      {lightboxUrl && (
        <div className="receipt-lightbox-overlay" onClick={() => setLightboxUrl(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <span className="lightbox-title">Receipt Proof Preview</span>
              <div className="lightbox-btns">
                <a href={lightboxUrl} target="_blank" rel="noopener noreferrer" className="btn-lightbox" title="Open full image in new tab">
                  <ExternalLink size={14} />
                </a>
                <button type="button" onClick={() => setLightboxUrl(null)} className="btn-lightbox close" title="Close">
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="lightbox-body">
              <img src={lightboxUrl} alt="Receipt Proof" className="lightbox-img" loading="lazy" />
            </div>
          </div>
        </div>
      )}

      {/* Formal, Compact, Executive Styling */}
      <style>{`
        .chit-ledger-root {
          width: 100%;
          max-width: 1360px;
          margin: 0 auto;
          padding-bottom: 2.5rem;
          box-sizing: border-box;
          font-family: inherit;
          color: #0f172a;
        }

        /* Top Nav */
        .chit-top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .chit-breadcrumbs {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          font-weight: 600;
          flex-wrap: wrap;
        }

        .crumb-link {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          color: #2563eb;
          text-decoration: none;
        }

        .crumb-link:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }

        .crumb-sep {
          color: #cbd5e1;
        }

        .crumb-scheme {
          color: #334155;
          font-weight: 700;
        }

        .crumb-current {
          background-color: #f1f5f9;
          color: #1e293b;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-size: 0.74rem;
          font-weight: 700;
          border: 1px solid #e2e8f0;
        }

        .btn-back-schemes {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-back-schemes:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }

        /* Formal Executive Header */
        .chit-executive-header {
          background: #0a1e3b;
          border-radius: 10px;
          padding: 1rem 1.25rem;
          color: #ffffff;
          margin-bottom: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          box-shadow: 0 4px 12px rgba(10, 30, 59, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .header-left-col {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
          flex: 1;
        }

        .header-badge-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }

        .badge-name {
          font-size: 0.95rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.01em;
          padding-right: 0.25rem;
        }

        .badge-pill {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.15rem 0.55rem;
          border-radius: 4px;
          letter-spacing: 0.02em;
        }

        .badge-pill.pool {
          background: rgba(56, 189, 248, 0.18);
          border: 1px solid rgba(56, 189, 248, 0.4);
          color: #38bdf8;
        }

        .badge-pill.status {
          background: rgba(34, 197, 94, 0.18);
          border: 1px solid rgba(74, 222, 128, 0.4);
          color: #4ade80;
        }

        .badge-pill.cycle {
          background: rgba(168, 85, 247, 0.18);
          border: 1px solid rgba(192, 132, 252, 0.4);
          color: #d8b4fe;
        }

        .badge-pill.members {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #e2e8f0;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .header-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0.15rem 0 0 0;
          letter-spacing: -0.01em;
        }

        .header-subtitle {
          font-size: 0.76rem;
          color: #94a3b8;
          margin: 0;
          line-height: 1.35;
        }

        /* Header Action Buttons */
        .header-actions-col {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }

        .btn-header-due {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #d97706;
          color: #ffffff;
          border: none;
          padding: 0.45rem 0.85rem;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-header-due:hover {
          background: #b45309;
        }

        .btn-header-record {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #16a34a;
          color: #ffffff;
          border: none;
          padding: 0.45rem 0.85rem;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-header-record:hover {
          background: #15803d;
        }

        .btn-header-tool {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #e2e8f0;
          padding: 0.45rem 0.75rem;
          border-radius: 6px;
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-header-tool:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        /* Horizontal Months Strip */
        .chit-months-strip {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: #ffffff;
          padding: 0.45rem 0.65rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 0.85rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
        }

        .months-strip-tag {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #64748b;
          font-size: 0.76rem;
          font-weight: 700;
          padding-left: 0.25rem;
          white-space: nowrap;
        }

        .btn-month-scroll {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .btn-month-scroll:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .months-scroll-container {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          overflow-x: auto;
          scroll-behavior: smooth;
          scrollbar-width: none;
          flex: 1;
        }

        .months-scroll-container::-webkit-scrollbar {
          display: none;
        }

        .chit-page-month-chip {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          padding: 0.35rem 0.65rem;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          min-width: 88px;
          flex-shrink: 0;
          text-align: left;
        }

        .chit-page-month-chip:hover {
          border-color: #93c5fd;
          background: #eff6ff;
        }

        .chit-page-month-chip.active {
          background: #2563eb;
          border-color: #2563eb;
          color: #ffffff;
        }

        .chip-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.74rem;
          font-weight: 700;
        }

        .chip-idx {
          font-size: 0.65rem;
          opacity: 0.8;
        }

        .chip-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.68rem;
        }

        .chip-rate {
          color: #15803d;
          font-weight: 700;
        }

        .chit-page-month-chip.active .chip-rate {
          color: #a7f3d0;
        }

        .chip-not-set {
          color: #94a3b8;
        }

        .chit-page-month-chip.active .chip-not-set {
          color: #e2e8f0;
        }

        .chip-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #22c55e;
          display: inline-block;
        }

        /* 4 KPI Cards Grid */
        .chit-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          margin-bottom: 0.85rem;
        }

        .kpi-card {
          background: #ffffff;
          border-radius: 8px;
          padding: 0.75rem 0.95rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .border-blue { border-top: 3px solid #2563eb; }
        .border-green { border-top: 3px solid #16a34a; }
        .border-red { border-top: 3px solid #dc2626; }
        .border-purple { border-top: 3px solid #7c3aed; }

        .kpi-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .kpi-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .kpi-icon-pill {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-blue { background: #dbeafe; color: #2563eb; }
        .icon-green { background: #dcfce7; color: #16a34a; }
        .icon-red { background: #fee2e2; color: #dc2626; }
        .icon-purple { background: #ede9fe; color: #7c3aed; }

        .kpi-main-row {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .kpi-num {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
          font-variant-numeric: tabular-nums;
        }

        .kpi-tag {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.1rem 0.4rem;
          border-radius: 3px;
        }

        .tag-green { background: #dcfce7; color: #15803d; }
        .tag-amber { background: #fef3c7; color: #b45309; }

        .kpi-progress {
          width: 100%;
          height: 4px;
          background: #e2e8f0;
          border-radius: 2px;
          overflow: hidden;
          margin: 0.1rem 0;
        }

        .kpi-fill {
          height: 100%;
          background: #16a34a;
          border-radius: 2px;
        }

        .kpi-caption {
          font-size: 0.72rem;
          color: #64748b;
        }

        /* Alert Bar */
        .chit-alert-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 6px;
          padding: 0.6rem 0.85rem;
          margin-bottom: 0.85rem;
        }

        .alert-content {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.78rem;
          color: #92400e;
        }

        .alert-icon {
          color: #d97706;
          flex-shrink: 0;
        }

        .btn-alert-action {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #d97706;
          color: #ffffff;
          border: none;
          padding: 0.35rem 0.75rem;
          border-radius: 5px;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
        }

        /* Table Card Container */
        .chit-table-card {
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          overflow: hidden;
        }

        /* Unified Filter Toolbar */
        .chit-table-toolbar {
          padding: 0.65rem 0.85rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.65rem;
        }

        .toolbar-left-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .toolbar-heading {
          font-size: 0.88rem;
          font-weight: 800;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          white-space: nowrap;
        }

        .badge-count {
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 0.1rem 0.4rem;
          border-radius: 9999px;
        }

        .search-wrap {
          position: relative;
          width: 220px;
        }

        .search-icon {
          position: absolute;
          left: 0.65rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .search-field {
          width: 100%;
          height: 32px;
          padding: 0 1.8rem 0 1.9rem;
          border-radius: 5px;
          border: 1px solid #cbd5e1;
          font-size: 0.78rem;
          color: #0f172a;
          outline: none;
          background: #ffffff;
          box-sizing: border-box;
        }

        .search-field:focus {
          border-color: #2563eb;
        }

        .search-clear {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: #e2e8f0;
          border: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          cursor: pointer;
        }

        .toolbar-filters-group {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }

        .filter-dropdown {
          height: 32px;
          padding: 0 0.6rem;
          border-radius: 5px;
          border: 1px solid #cbd5e1;
          font-size: 0.78rem;
          font-weight: 600;
          color: #1e293b;
          background: #ffffff;
          outline: none;
          cursor: pointer;
        }

        .filter-dropdown:focus {
          border-color: #2563eb;
        }

        .per-page-dropdown {
          padding-right: 0.4rem;
        }

        .btn-clear-filters {
          height: 32px;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fca5a5;
          padding: 0 0.6rem;
          border-radius: 5px;
          font-size: 0.74rem;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-clear-filters:hover {
          background: #fecaca;
        }

        /* Table Wrapper & Formal Table */
        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .formal-ledger-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem; /* 13px */
          line-height: 1.4;
        }

        .formal-ledger-table thead {
          background: #f8fafc;
          border-bottom: 1.5px solid #cbd5e1;
        }

        .formal-ledger-table th {
          padding: 0.6rem 0.75rem;
          font-size: 0.7rem;
          font-weight: 800;
          color: #475569;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
          text-align: left;
        }

        .formal-ledger-table tbody tr {
          border-bottom: 1px solid #e2e8f0;
          transition: background-color 0.1s ease;
        }

        .formal-ledger-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .formal-ledger-table tbody tr.tr-paid {
          background-color: rgba(240, 253, 244, 0.45);
        }

        .formal-ledger-table td {
          padding: 0.55rem 0.75rem;
          vertical-align: middle;
        }

        .col-center { text-align: center !important; }
        .col-right { text-align: right !important; }

        .cell-num {
          font-size: 0.74rem;
          font-weight: 700;
          color: #94a3b8;
        }

        /* Member Cell */
        .member-cell {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }

        .member-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #dbeafe;
          color: #1d4ed8;
          font-weight: 800;
          font-size: 0.78rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid #bfdbfe;
        }

        .member-text {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          min-width: 0;
        }

        .member-name {
          font-weight: 700;
          color: #0f172a;
          font-size: 0.8125rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .member-sub {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
        }

        .member-id {
          background: #f1f5f9;
          color: #475569;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.05rem 0.35rem;
          border-radius: 3px;
          font-family: monospace;
        }

        .member-phone {
          display: inline-flex;
          align-items: center;
          gap: 0.15rem;
          font-size: 0.7rem;
          color: #64748b;
        }

        /* Slots Cell */
        .slots-cell {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .slot-tag {
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.1rem 0.45rem;
          border-radius: 3px;
          width: fit-content;
        }

        .slot-tag.single {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
        }

        .slot-tag.multi {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .ticket-text {
          font-size: 0.68rem;
          color: #64748b;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Amounts */
        .due-stack {
          display: flex;
          flex-direction: column;
          gap: 0.05rem;
        }

        .cell-amt {
          font-size: 0.82rem;
          font-variant-numeric: tabular-nums;
        }

        .cell-amt.bold {
          font-weight: 700;
        }

        .cell-calc {
          font-size: 0.66rem;
          color: #94a3b8;
          font-weight: 600;
        }

        .cell-muted {
          font-size: 0.74rem;
          color: #94a3b8;
        }

        /* Status Badges */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.2rem 0.55rem;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .badge-cleared {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
        }

        .badge-partial {
          background: #fef3c7;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        .badge-unpaid {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fca5a5;
        }

        .badge-not-set {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #cbd5e1;
        }

        /* Receipt Chips - Official Executive Styling */
        .receipt-chips-wrap {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
        }

        .receipt-chip {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.45rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          padding: 0.22rem 0.45rem;
          border-radius: 6px;
          font-size: 0.74rem;
          transition: all 0.15s ease;
        }

        .receipt-chip:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.07);
          background: #f8fafc;
        }

        .receipt-chip-main {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .receipt-amt {
          font-weight: 800;
          color: #0f172a;
          font-variant-numeric: tabular-nums;
          font-size: 0.78rem;
          letter-spacing: -0.01em;
        }

        .receipt-mode-pill {
          font-size: 0.63rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 1px 5px;
          border-radius: 4px;
        }

        .receipt-mode-pill.mode-cash {
          background-color: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .receipt-mode-pill.mode-upi {
          background-color: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
        }

        .receipt-chip-actions {
          display: inline-flex;
          align-items: center;
          gap: 0.15rem;
        }

        .btn-chip-action {
          background: transparent;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          transition: all 0.12s ease;
          text-decoration: none;
        }

        .btn-chip-action.official-doc { color: #d97706; }
        .btn-chip-action.official-doc:hover { background: #fef3c7; color: #b45309; }
        .btn-chip-action.eye { color: #2563eb; }
        .btn-chip-action.eye:hover { background: #eff6ff; color: #1d4ed8; }
        .btn-chip-action.edit { color: #64748b; }
        .btn-chip-action.edit:hover { background: #f1f5f9; color: #0f172a; }
        .btn-chip-action.del { color: #94a3b8; }
        .btn-chip-action.del:hover { background: #fef2f2; color: #ef4444; }

        /* Action Buttons */
        .btn-row-action {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.35rem 0.65rem;
          border-radius: 5px;
          font-size: 0.74rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .btn-row-action.primary {
          background: #2563eb;
          color: #ffffff;
          border: 1px solid #1d4ed8;
        }

        .btn-row-action.primary:hover {
          background: #1d4ed8;
        }

        .btn-row-action.outline {
          background: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
        }

        .btn-row-action.outline:hover {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1d4ed8;
        }

        /* Pagination */
        .chit-pagination {
          padding: 0.55rem 0.85rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .page-summary {
          font-size: 0.76rem;
          color: #64748b;
        }

        .page-btns {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .page-nav-btn {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .page-nav-btn:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #94a3b8;
        }

        .page-nav-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .page-numbers {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .page-num-btn {
          min-width: 28px;
          height: 28px;
          padding: 0 0.4rem;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
        }

        .page-num-btn.active {
          background: #2563eb;
          border-color: #2563eb;
          color: #ffffff;
        }

        .page-dots {
          color: #94a3b8;
          font-size: 0.75rem;
          padding: 0 0.15rem;
        }

        /* Mobile Cards (<= 768px) */
        .mobile-cards-container {
          display: none;
          padding: 0.75rem;
          flex-direction: column;
          gap: 0.65rem;
        }

        .mobile-member-card {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .m-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.45rem;
        }

        .m-card-user {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .m-user-name {
          font-size: 0.84rem;
          font-weight: 700;
          color: #0f172a;
        }

        .m-user-sub {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 0.1rem;
        }

        .m-card-slots {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.3rem 0.5rem;
          background: #f8fafc;
          border-radius: 4px;
          font-size: 0.72rem;
        }

        .m-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.4rem;
          background: #f8fafc;
          padding: 0.5rem;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .m-stat-box {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .m-stat-lbl {
          font-size: 0.65rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }

        .m-stat-val {
          font-size: 0.8rem;
          font-weight: 700;
          color: #0f172a;
          font-variant-numeric: tabular-nums;
        }

        .m-receipts-row {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .m-receipts-lbl {
          font-size: 0.68rem;
          font-weight: 700;
          color: #64748b;
        }

        .btn-m-action {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.5rem;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-m-action.primary {
          background: #2563eb;
          color: #ffffff;
          border: 1px solid #1d4ed8;
        }

        .btn-m-action.outline {
          background: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
        }

        /* Lightbox Preview */
        .receipt-lightbox-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(8px);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          box-sizing: border-box;
        }

        .lightbox-content {
          background: #ffffff;
          border-radius: 10px;
          width: 100%;
          max-width: 580px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.35);
        }

        .lightbox-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .lightbox-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
        }

        .lightbox-btns {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .btn-lightbox {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          text-decoration: none;
        }

        .btn-lightbox.close:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .lightbox-body {
          padding: 0.75rem;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
        }

        .lightbox-img {
          max-width: 100%;
          max-height: 72vh;
          object-fit: contain;
          border-radius: 4px;
        }

        /* States */
        .ledger-loading-state,
        .ledger-empty-state {
          padding: 3rem 1rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #64748b;
          font-size: 0.84rem;
        }

        .ledger-empty-state h4 {
          margin: 0;
          color: #1e293b;
          font-size: 1rem;
          font-weight: 700;
        }

        .btn-empty-reset {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 0.45rem 1rem;
          border-radius: 5px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }

        /* Helpers */
        .text-green { color: #16a34a; }
        .text-red { color: #dc2626; }
        .text-amber { color: #d97706; }
        .text-purple { color: #7c3aed; }
        .text-slate { color: #64748b; }
        .text-blue { color: #2563eb; }
        .font-bold { font-weight: 700; }
        .flex-between { display: flex; align-items: center; justify-content: space-between; }
        .italic { font-style: italic; }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spin { animation: spin 1s linear infinite; }

        /* Media Queries */
        @media (max-width: 1024px) {
          .chit-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .chit-kpi-grid {
            grid-template-columns: 1fr;
          }

          .table-wrapper {
            display: none;
          }

          .mobile-cards-container {
            display: flex;
          }

          .chit-executive-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions-col {
            width: 100%;
          }

          .btn-header-due,
          .btn-header-record,
          .btn-header-tool {
            flex: 1;
            justify-content: center;
          }

          .search-wrap {
            width: 100%;
          }

          .toolbar-left-group,
          .toolbar-filters-group {
            width: 100%;
          }

          .filter-dropdown {
            flex: 1;
          }

          .chit-pagination {
            flex-direction: column;
            align-items: center;
          }
        }

        /* Print Media */
        @media print {
          .no-print { display: none !important; }
          body { background: #ffffff !important; }
          .chit-executive-header {
            background: #ffffff !important;
            color: #000000 !important;
            border: 1px solid #000000 !important;
            box-shadow: none !important;
          }
          .header-title { color: #000000 !important; }
          .header-subtitle { color: #333333 !important; }
          .badge-name { color: #000000 !important; }
          .table-wrapper { display: block !important; }
          .mobile-cards-container { display: none !important; }
          .formal-ledger-table { border: 1px solid #000000 !important; }
          .formal-ledger-table th,
          .formal-ledger-table td {
            border: 1px solid #cccccc !important;
            color: #000000 !important;
          }
        }
      `}</style>

    </div>
  );
};

export default ChitDuesLedgerPage;
