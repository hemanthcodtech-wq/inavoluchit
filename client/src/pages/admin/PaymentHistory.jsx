import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import {
  CreditCard,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Download,
  ExternalLink,
  ChevronDown,
  Calendar,
  DollarSign,
  Tag,
  User,
  Phone,
  RefreshCw,
  X,
  Trash2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { generatePaymentReceiptPDF } from '../../utils/receiptGenerator';
import ReceiptModal from '../../components/ReceiptModal';

const PaymentHistory = () => {
  const { token, API_URL } = useAuth();

  // Format amount with ₹ symbol and Indian comma style (e.g. ₹1,00,000)
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN');
  };

  // Data States
  const [payments, setPayments] = useState([]);
  const [chits, setChits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewReceiptData, setViewReceiptData] = useState(null);
  const [pdfPreviewModal, setPdfPreviewModal] = useState(null);

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record permanently?')) return;
    try {
      const response = await fetch(`${API_URL}/admin/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPayments(prev => prev.filter(p => p.id !== paymentId));
      } else {
        alert(data.message || 'Failed to delete payment record');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Error connecting to server while deleting payment record');
    }
  };

  // Filter States
  const [selectedChitId, setSelectedChitId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all'); // Installment Month
  const [selectedCalMonth, setSelectedCalMonth] = useState('all'); // Calendar Month (Monthly-wise)
  const [dateFilterType, setDateFilterType] = useState('all'); // 'all', 'today', 'yesterday', 'this_week', 'this_month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Lightbox Modal for screenshot preview
  const [previewImg, setPreviewImg] = useState(null);

  const fetchHistoryData = async () => {
    try {
      setRefreshing(true);

      // 1. Fetch all chits for the filter dropdown
      const chitsRes = await fetch(`${API_URL}/chits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const chitsData = await chitsRes.json();
      if (chitsData.success) {
        setChits(chitsData.data || []);
      }

      // 2. Fetch all payments history
      const paymentsRes = await fetch(`${API_URL}/payments/all-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const paymentsData = await paymentsRes.json();
      if (paymentsData.success) {
        setPayments(paymentsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching payment history data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [token, API_URL]);

  // Extract unique Calendar Months from payments for Monthly-wise filter
  const availableCalMonths = useMemo(() => {
    const monthsMap = new Map();
    payments.forEach(p => {
      if (p.createdAt) {
        const d = new Date(p.createdAt);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          if (!monthsMap.has(key)) {
            monthsMap.set(key, label);
          }
        }
      }
    });
    return Array.from(monthsMap.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [payments]);

  // Extract unique Installment Months from payments
  const availableInstallmentMonths = useMemo(() => {
    const set = new Set();
    payments.forEach(p => {
      if (p.monthNumber) set.add(p.monthNumber);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [payments]);

  // Filtered Payments computation
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // 1. Filter by Chit Scheme
      if (selectedChitId !== 'all' && p.chitId !== selectedChitId) {
        return false;
      }

      // 2. Filter by Status
      if (selectedStatus !== 'all' && p.status !== selectedStatus) {
        return false;
      }

      // 3. Filter by Installment Month
      if (selectedMonth !== 'all' && p.monthNumber !== Number(selectedMonth)) {
        return false;
      }

      // 4. Filter by Calendar Month (Monthly-wise)
      if (selectedCalMonth !== 'all' && p.createdAt) {
        const d = new Date(p.createdAt);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (key !== selectedCalMonth) return false;
        }
      }

      // 5. Filter by Date-wise / Day-wise (created date)
      if (dateFilterType !== 'all') {
        const paymentDate = p.createdAt ? new Date(p.createdAt) : null;
        if (!paymentDate || isNaN(paymentDate.getTime())) return false;

        const today = new Date();
        const paymentYMD = paymentDate.toISOString().split('T')[0];
        const todayYMD = today.toISOString().split('T')[0];

        if (dateFilterType === 'today') {
          if (paymentYMD !== todayYMD) return false;
        } else if (dateFilterType === 'yesterday') {
          const yest = new Date(today);
          yest.setDate(today.getDate() - 1);
          const yestYMD = yest.toISOString().split('T')[0];
          if (paymentYMD !== yestYMD) return false;
        } else if (dateFilterType === 'this_week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          if (paymentDate < weekAgo) return false;
        } else if (dateFilterType === 'this_month') {
          if (paymentDate.getMonth() !== today.getMonth() || paymentDate.getFullYear() !== today.getFullYear()) {
            return false;
          }
        } else if (dateFilterType === 'custom') {
          if (startDate) {
            const sDate = new Date(startDate);
            sDate.setHours(0, 0, 0, 0);
            if (paymentDate < sDate) return false;
          }
          if (endDate) {
            const eDate = new Date(endDate);
            eDate.setHours(23, 59, 59, 999);
            if (paymentDate > eDate) return false;
          }
        }
      }

      // 6. Filter by Search query (User Name, Phone, Ticket ID, Txn ID, Chit Name, Date)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const userName = (p.user?.name || '').toLowerCase();
        const userPhone = (p.user?.phone || '').toLowerCase();
        const userEmail = (p.user?.email || '').toLowerCase();
        const chitName = (p.chit?.name || '').toLowerCase();
        const ticketId = (p.ticketId || `TICKET-${p.slotNumber || 1}`).toLowerCase();
        const txnId = (p.transactionId || '').toLowerCase();
        const monthStr = `month ${p.monthNumber}`.toLowerCase();
        const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB').toLowerCase() : '';

        return (
          userName.includes(query) ||
          userPhone.includes(query) ||
          userEmail.includes(query) ||
          chitName.includes(query) ||
          ticketId.includes(query) ||
          txnId.includes(query) ||
          monthStr.includes(query) ||
          dateStr.includes(query)
        );
      }

      return true;
    });
  }, [payments, selectedChitId, selectedStatus, selectedMonth, selectedCalMonth, dateFilterType, startDate, endDate, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalCollected = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    filteredPayments.forEach(p => {
      if (p.status === 'approved') {
        totalCollected += Number(p.amount || 0);
        approvedCount++;
      } else if (p.status === 'pending') {
        pendingCount++;
      } else if (p.status === 'rejected' || p.status === 'edit_requested') {
        rejectedCount++;
      }
    });

    return {
      totalCollected,
      approvedCount,
      pendingCount,
      rejectedCount,
      totalCount: filteredPayments.length
    };
  }, [filteredPayments]);

  // Export to Excel
  const exportToExcel = () => {
    const dataToExport = filteredPayments.map((p, idx) => ({
      'S.No': idx + 1,
      'Date': p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : 'N/A',
      'Member Name': p.user?.name || 'N/A',
      'Phone': p.user?.phone || 'N/A',
      'Chit Scheme': p.chit?.name || 'N/A',
      'Member ID': (p.ticketId || `MEMBER-${p.slotNumber || 1}`).replace(/^TICKET-/, 'MEMBER-'),
      'Month': `Month ${p.monthNumber}`,
      'Amount (₹)': p.amount,
      'Transaction Ref ID': p.transactionId || 'N/A',
      'Status': p.status.toUpperCase(),
      'Admin Remarks': p.remarks || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payment_History');
    XLSX.writeFile(workbook, `InaVolu_Payment_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Safe helper to invoke autoTable across different module bundlers
  const applyAutoTable = (doc, options) => {
    if (typeof autoTable === 'function') {
      return autoTable(doc, options);
    }
    if (autoTable && typeof autoTable.default === 'function') {
      return autoTable.default(doc, options);
    }
    if (doc && typeof doc.autoTable === 'function') {
      return doc.autoTable(options);
    }
    throw new Error('AutoTable function not available');
  };

  // Export & Open PDF Report
  const exportToPDF = () => {
    if (filteredPayments.length === 0) {
      alert('No payment transactions found for the selected filters. Please adjust the filters or ensure payments have been submitted.');
      return;
    }

    try {
      const doc = new jsPDF('landscape');

      doc.setFontSize(16);
      doc.setTextColor(22, 101, 52);
      doc.text('INAVOLU CHIT FUNDS - ALL PAYMENT TRANSACTIONS', 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(100);
      const schemeName = selectedChitId === 'all'
        ? 'All Schemes'
        : (chits.find(c => c.id === selectedChitId)?.name || 'Selected Scheme');
      const statusText = (selectedStatus || 'ALL').toUpperCase();
      const filterInfo = `Chit Scheme: ${schemeName} | Status: ${statusText} | Total Records: ${filteredPayments.length} | Generated on: ${new Date().toLocaleString('en-GB')}`;
      doc.text(filterInfo, 14, 22);

      const tableRows = filteredPayments.map((p, idx) => [
        idx + 1,
        p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : 'N/A',
        p.user?.name || 'N/A',
        p.user?.phone || 'N/A',
        p.chit?.name || 'N/A',
        (p.ticketId || `MEMBER-${p.slotNumber || 1}`).replace(/^TICKET-/, 'MEMBER-'),
        `Month ${p.monthNumber || 1}`,
        'Rs. ' + Number(p.amount || 0).toLocaleString('en-IN'),
        p.transactionId || 'N/A',
        (p.status || 'PENDING').toUpperCase()
      ]);

      applyAutoTable(doc, {
        head: [['S.NO', 'Date', 'Member', 'Phone', 'Chit Scheme', 'Member ID', 'Month', 'Amount', 'Txn Ref', 'Status']],
        body: tableRows,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.5 }
      });

      const filename = `InaVolu_Payment_History_${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      // Attempt to open in a new browser tab directly
      try {
        window.open(blobUrl, '_blank');
      } catch (e) {
        console.warn('Popup blocked, opening inside embedded preview modal', e);
      }

      // Also open inside the in-app PDF preview modal
      setPdfPreviewModal({
        url: blobUrl,
        filename,
        doc
      });
    } catch (err) {
      console.error('Error generating PDF report:', err);
      alert('Could not generate PDF report: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '0.25rem 0.65rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', border: '1px solid #bfdbfe' }}>
            <CheckCircle size={12} /> Paid
          </span>
        );
      case 'pending':
        return (
          <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.65rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', border: '1px solid #bfdbfe' }}>
            <Clock size={12} /> Verifying
          </span>
        );
      case 'rejected':
        return (
          <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.25rem 0.65rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', border: '1px solid #fecaca' }}>
            <XCircle size={12} /> Rejected
          </span>
        );
      case 'edit_requested':
        return (
          <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '0.25rem 0.65rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', border: '1px solid #fde68a' }}>
            <AlertCircle size={12} /> Edit Req
          </span>
        );
      default:
        return <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>{status}</span>;
    }
  };

  const formatImgUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    return `${API_URL.replace('/api', '')}${url}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: 500 }}>Loading payment transactions...</p>
      </div>
    );
  }

  return (
    <div className="admin-page-container" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem', boxSizing: 'border-box' }}>

      {/* Header Section */}
      <ScrollAnimationWrapper>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(22,163,74,0.25)' }}>
                <CreditCard size={20} />
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Payment <span style={{ color: '#2563eb' }}>History</span>
              </h1>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.35rem' }}>
              Comprehensive log of all chit monthly installment payments, transaction IDs, receipts, and verification status.
            </p>
          </div>

          {/* Action Buttons: Refresh, Excel, PDF */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              onClick={fetchHistoryData}
              disabled={refreshing}
              title="Refresh Data"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 0.9rem', borderRadius: '0.65rem',
                border: '1px solid #e5e7eb', backgroundColor: '#fff',
                color: '#374151', fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={exportToPDF}
              title="View & Open PDF Payment History Report"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1rem', borderRadius: '0.65rem',
                border: '1px solid #fecaca', backgroundColor: '#fef2f2',
                color: '#b91c1c', fontSize: '0.82rem', fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(239,68,68,0.08)'
              }}
            >
              <FileText size={15} color="#dc2626" />
              <span>PDF Report</span>
            </button>
          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Summary KPI Cards */}
      <ScrollAnimationWrapper>
        <div className="dashboard-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>

          <div style={{ backgroundColor: '#fff', borderRadius: '1rem', padding: '1.15rem 1.25rem', border: '1px solid #f3f4f6', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Verified</span>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1d4ed8', margin: 0 }}>{formatCurrency(metrics.totalCollected)}</h3>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '1rem', padding: '1.15rem 1.25rem', border: '1px solid #f3f4f6', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <CreditCard size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Records</span>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{metrics.totalCount}</h3>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '1rem', padding: '1.15rem 1.25rem', border: '1px solid #f3f4f6', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Clock size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Verifications</span>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb', margin: 0 }}>{metrics.pendingCount}</h3>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '1rem', padding: '1.15rem 1.25rem', border: '1px solid #f3f4f6', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b5bdb' }}>
              <CheckCircle size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Approved Payments</span>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#3b5bdb', margin: 0 }}>{metrics.approvedCount}</h3>
            </div>
          </div>

        </div>
      </ScrollAnimationWrapper>

      {/* Filter & Search Bar */}
      <ScrollAnimationWrapper>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '1.25rem',
          padding: '1.25rem',
          border: '1px solid #f3f4f6',
          boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Row 1: Date & Time Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

            {/* Date-wise / Day-wise Range Presets */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                📅 Filter by Date / Day
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={dateFilterType}
                  onChange={(e) => setDateFilterType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2rem 0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid #e5e7eb',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    backgroundColor: '#fafafa',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="all">📅 All Dates</option>
                  <option value="today">☀️ Today</option>
                  <option value="yesterday">⏪ Yesterday</option>
                  <option value="this_week">📆 Last 7 Days</option>
                  <option value="this_month">🗓️ This Current Month</option>
                  <option value="custom">⚙️ Custom Date Range...</option>
                </select>
                <ChevronDown size={16} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Monthly-wise (Calendar Month) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                🗓️ Monthly-Wise Filter
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedCalMonth}
                  onChange={(e) => setSelectedCalMonth(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2rem 0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid #e5e7eb',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    backgroundColor: '#fafafa',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="all">🗓️ All Calendar Months</option>
                  {availableCalMonths.map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Custom From Date */}
            {dateFilterType === 'custom' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid #e5e7eb',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    backgroundColor: '#fafafa',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            {/* Custom To Date */}
            {dateFilterType === 'custom' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid #e5e7eb',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    backgroundColor: '#fafafa',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

          </div>

          {/* Row 2: Scheme, Status, Installment Month, Search */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

            {/* Chit Scheme Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                Filter by Chit Scheme
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedChitId}
                  onChange={(e) => setSelectedChitId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2rem 0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid #e5e7eb',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    backgroundColor: '#fafafa',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="all">🌟 All Chit Schemes ({chits.length})</option>
                  {chits.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (₹{(c.chitValue / 1000).toFixed(0)}K · {c.durationMonths}M)
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                Filter by Status
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2rem 0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid #e5e7eb',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    backgroundColor: '#fafafa',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="approved">✅ Paid (Approved)</option>
                  <option value="pending">⏳ Verifying (Pending)</option>
                  <option value="rejected">❌ Rejected</option>
                  <option value="edit_requested">⚠️ Edit Requested</option>
                </select>
                <ChevronDown size={16} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Installment Month Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                Installment Month
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2rem 0.65rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid #e5e7eb',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    backgroundColor: '#fafafa',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="all">All Installment Months</option>
                  {availableInstallmentMonths.map(m => (
                    <option key={m} value={m}>Month {m}</option>
                  ))}
                </select>
                <ChevronDown size={16} color="#6b7280" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Search Query */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>
                Search Transactions
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search user, mobile, member ID, UTR..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid #e5e7eb',
                    fontSize: '0.85rem',
                    color: '#1f2937',
                    backgroundColor: '#fafafa',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Active Filter Badges */}
          {(selectedChitId !== 'all' || selectedStatus !== 'all' || selectedMonth !== 'all' || selectedCalMonth !== 'all' || dateFilterType !== 'all' || searchQuery.trim() !== '') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px dashed #f3f4f6' }}>
              <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>Active Filters:</span>

              {dateFilterType !== 'all' && (
                <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '1rem', border: '1px solid #ffedd5', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  Date: {dateFilterType === 'custom' ? `${startDate || 'Start'} to ${endDate || 'End'}` : dateFilterType.replace('_', ' ').toUpperCase()}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => { setDateFilterType('all'); setStartDate(''); setEndDate(''); }} />
                </span>
              )}

              {selectedCalMonth !== 'all' && (
                <span style={{ backgroundColor: '#fefce8', color: '#a16207', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '1rem', border: '1px solid #fef08a', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  Month: {availableCalMonths.find(m => m.key === selectedCalMonth)?.label || selectedCalMonth}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSelectedCalMonth('all')} />
                </span>
              )}

              {selectedChitId !== 'all' && (
                <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '1rem', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  Chit: {chits.find(c => c.id === selectedChitId)?.name || 'Selected'}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSelectedChitId('all')} />
                </span>
              )}

              {selectedStatus !== 'all' && (
                <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '1rem', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  Status: {selectedStatus.toUpperCase()}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSelectedStatus('all')} />
                </span>
              )}

              {selectedMonth !== 'all' && (
                <span style={{ backgroundColor: '#faf5ff', color: '#7e22ce', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '1rem', border: '1px solid #e9d5ff', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  Installment: Month {selectedMonth}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSelectedMonth('all')} />
                </span>
              )}

              {searchQuery && (
                <span style={{ backgroundColor: '#fdf2f8', color: '#db2777', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '1rem', border: '1px solid #fbcfe8', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  Query: "{searchQuery}"
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
                </span>
              )}

              <button
                onClick={() => {
                  setSelectedChitId('all');
                  setSelectedStatus('all');
                  setSearchQuery('');
                  setSelectedMonth('all');
                  setSelectedCalMonth('all');
                  setDateFilterType('all');
                  setStartDate('');
                  setEndDate('');
                }}
                style={{ fontSize: '0.72rem', color: '#dc2626', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', padding: '0.2rem 0.4rem' }}
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </ScrollAnimationWrapper>

      {/* Transactions Table / List */}
      <ScrollAnimationWrapper>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '1.25rem',
          border: '1px solid #f3f4f6',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          overflow: 'hidden'
        }}>
          {filteredPayments.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', color: '#2563eb' }}>
                <CreditCard size={28} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#374151', margin: 0 }}>No Payment Transactions Found</h3>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.35rem', maxWidth: '360px', margin: '0.35rem auto 0 auto' }}>
                No payment records match your current filter criteria. Try adjusting the Chit Scheme filter or search query.
              </p>
            </div>
          ) : (
            <div style={{
              overflowX: 'auto',
              width: '100%',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin'
            }}>
              <table style={{
                width: '100%',
                minWidth: '1360px',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.85rem'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '180px', width: '180px', whiteSpace: 'nowrap' }}>Member</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '240px', width: '250px', whiteSpace: 'nowrap' }}>Chit Scheme</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '120px', width: '120px', whiteSpace: 'nowrap' }}>Member ID</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '110px', width: '110px', whiteSpace: 'nowrap' }}>Installment</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '110px', width: '110px', whiteSpace: 'nowrap' }}>Amount</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '170px', width: '180px', whiteSpace: 'nowrap' }}>Txn Reference</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '105px', width: '105px', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '125px', width: '125px', whiteSpace: 'nowrap' }}>Screenshot</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '125px', width: '125px', whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '95px', width: '95px', textAlign: 'center', whiteSpace: 'nowrap' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p, idx) => {
                    const rawTicketId = p.ticketId || `MEMBER-${p.slotNumber || 1}`;
                    const ticketId = rawTicketId.replace(/^TICKET-/, 'MEMBER-');
                    const formattedDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                    const formattedTime = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
                    const imgUrl = formatImgUrl(p.proofImgUrl);

                    return (
                      <tr
                        key={p.id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fbfcfd'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* Member Details */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', minWidth: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                              {(p.user?.name || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <strong style={{ color: '#1f2937', display: 'block', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{p.user?.name || 'Unknown Member'}</strong>
                              <span style={{ color: '#6b7280', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
                                <Phone size={10} /> {p.user?.phone || 'No phone'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Chit Scheme */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', minWidth: '240px', maxWidth: '300px' }}>
                          <strong style={{
                            color: '#1f2937',
                            display: 'block',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            lineHeight: 1.35,
                            wordBreak: 'normal',
                            overflowWrap: 'break-word'
                          }}>
                            {p.chit?.name}
                          </strong>
                          <span style={{
                            color: '#6b7280',
                            fontSize: '0.73rem',
                            marginTop: '0.15rem',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>
                            Pool: ₹{p.chit ? (p.chit.chitValue / 1000).toFixed(0) : 0}K · {p.chit?.durationMonths} Months
                          </span>
                        </td>

                        {/* Ticket ID */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', minWidth: '120px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            backgroundColor: '#f3f4f6',
                            color: '#1f2937',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: '1px solid #e5e7eb',
                            display: 'inline-block'
                          }}>
                            {ticketId}
                          </span>
                        </td>

                        {/* Installment Month */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', minWidth: '110px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, color: '#374151' }}>Month {p.monthNumber}</span>
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', minWidth: '110px', whiteSpace: 'nowrap' }}>
                          <strong style={{ color: '#2563eb', fontSize: '0.92rem', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(p.amount)}
                          </strong>
                        </td>

                        {/* Transaction ID */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', minWidth: '170px' }}>
                          {p.transactionId ? (
                            <code style={{
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: '#334155',
                              fontWeight: 600,
                              wordBreak: 'break-all'
                            }}>
                              {p.transactionId}
                            </code>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>-</span>
                          )}
                          {p.remarks && (
                            <div style={{ fontSize: '0.7rem', color: '#d97706', marginTop: '0.2rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.remarks}>
                              💬 {p.remarks}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', minWidth: '105px', whiteSpace: 'nowrap' }}>
                          {getStatusBadge(p.status)}
                        </td>

                        {/* Screenshot / Proof */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', minWidth: '125px', whiteSpace: 'nowrap' }}>
                          {imgUrl && p.proofImgUrl !== 'MANUAL_ADMIN_ENTRY' ? (
                            <button
                              onClick={() => setPreviewImg({ url: imgUrl, title: `${p.user?.name} · Month ${p.monthNumber} (${ticketId})` })}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #bfdbfe',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              <Eye size={12} /> View Proof
                            </button>
                          ) : p.proofImgUrl === 'MANUAL_ADMIN_ENTRY' ? (
                            <span style={{ fontSize: '0.72rem', color: '#6b7280', fontStyle: 'italic' }}>Admin Entry</span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>No file</span>
                          )}
                        </td>

                        {/* Date */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', minWidth: '125px', whiteSpace: 'nowrap' }}>
                          <div style={{ color: '#374151', fontSize: '0.8rem', fontWeight: 500 }}>{formattedDate}</div>
                          <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>{formattedTime}</div>
                        </td>

                        {/* Actions: View Receipt, Download Receipt & Delete */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', textAlign: 'center', minWidth: '115px', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => setViewReceiptData({ 
                              payment: p, 
                              chit: p.chit, 
                              user: p.user, 
                              extraData: { 
                                paidMonths: p.monthNumber,
                                monthNumber: p.monthNumber,
                                auctions: p.chit?.auctions,
                                ticketId: p.ticketId
                              } 
                            })}
                            title="View official payment receipt on screen"
                            style={{
                              padding: '0.35rem 0.55rem',
                              borderRadius: '0.4rem',
                              border: '1px solid #bfdbfe',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '0.35rem',
                              transition: 'all 0.15s'
                            }}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => generatePaymentReceiptPDF(p, p.chit, p.user, { 
                              paidMonths: p.monthNumber,
                              monthNumber: p.monthNumber,
                              auctions: p.chit?.auctions,
                              ticketId: p.ticketId
                            })}
                            title="Download official PDF payment receipt"
                            style={{
                              padding: '0.35rem 0.55rem',
                              borderRadius: '0.4rem',
                              border: '1px solid #bfdbfe',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '0.35rem',
                              transition: 'all 0.15s'
                            }}
                          >
                            <Download size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(p.id)}
                            title="Delete this payment record"
                            style={{
                              padding: '0.35rem 0.55rem',
                              borderRadius: '0.4rem',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          <div style={{ padding: '0.75rem 1.25rem', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748b' }}>
            <span>Showing <strong>{filteredPayments.length}</strong> of <strong>{payments.length}</strong> total transactions</span>
            <span>INAVOLU CHIT FUNDS · Secured Payment Ledger</span>
          </div>

        </div>
      </ScrollAnimationWrapper>

      {/* Lightbox Modal for Receipt Screenshot */}
      {previewImg && (
        <div
          onClick={() => setPreviewImg(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '1rem',
              maxWidth: '560px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>Payment Screenshot Proof</h3>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{previewImg.title}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <a
                  href={previewImg.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '0.4rem',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#fff',
                    color: '#374151',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <ExternalLink size={12} /> Open Full
                </a>
                <button
                  onClick={() => setPreviewImg(null)}
                  style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={16} color="#374151" />
                </button>
              </div>
            </div>

            {/* Image Box */}
            <div style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#fafafa', maxHeight: '70vh', overflowY: 'auto' }}>
              <img
                src={previewImg.url}
                alt="Payment Proof Receipt"
                style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '0.5rem', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {viewReceiptData && (
        <ReceiptModal
          isOpen={Boolean(viewReceiptData)}
          onClose={() => setViewReceiptData(null)}
          {...viewReceiptData}
        />
      )}

      {/* Full-Screen In-App PDF Report Preview Modal */}
      {pdfPreviewModal && (
        <div
          onClick={() => setPdfPreviewModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '1100px',
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.5rem',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FileText size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                  Payment History Report (PDF Preview)
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <a
                  href={pdfPreviewModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Open Fullscreen</span>
                </a>
                <button
                  onClick={() => pdfPreviewModal.doc?.save(pdfPreviewModal.filename)}
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setPdfPreviewModal(null)}
                  style={{
                    border: 'none',
                    background: '#e2e8f0',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#475569'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body with embedded iframe preview */}
            <div style={{ flex: 1, backgroundColor: '#525659', position: 'relative' }}>
              <iframe
                src={pdfPreviewModal.url}
                title="Payment History PDF Report"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PaymentHistory;
