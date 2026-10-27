import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  IndianRupee,
  Tag,
  User,
  Phone,
  RefreshCw,
  X,
  Trash2,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  CheckCheck,
  Sparkles,
  Receipt,
  ArrowUpDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { generatePaymentReceiptPDF } from '../../utils/receiptGenerator';
import ReceiptModal from '../../components/ReceiptModal';

const APP_BASE_URL = (import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://www.inavolu.com')).replace(/\/+$/, '');

const PaymentHistory = () => {

  const { token, API_URL } = useAuth();

  // Format currency helpers
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

  // Pagination & Lazy Loading States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filter States
  const [selectedChitId, setSelectedChitId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [receiptFilter, setReceiptFilter] = useState('all'); // 'all', 'with_receipt', 'without_receipt'
  const [paymentModeFilter, setPaymentModeFilter] = useState('all'); // 'all', 'Cash', 'UPI', 'Bank Transfer', 'Cheque'
  const [selectedMonth, setSelectedMonth] = useState('all'); // Installment Month
  const [selectedCalMonth, setSelectedCalMonth] = useState('all'); // Calendar Month
  const [dateFilterType, setDateFilterType] = useState('all'); // 'all', 'today', 'yesterday', 'this_week', 'this_month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc', 'date_asc', 'amount_desc', 'amount_asc', 'name_asc'
  const [searchQuery, setSearchQuery] = useState('');

  // Lightbox Modal for screenshot preview
  const [previewImg, setPreviewImg] = useState(null);

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record permanently?')) return;
    try {
      const response = await fetch(`${API_URL}/admin/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPayments(prev => prev.filter(p => (p.id !== paymentId && p._id !== paymentId)));
      } else {
        alert(data.message || 'Failed to delete payment record');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Error connecting to server while deleting payment record');
    }
  };

  const fetchHistoryData = async () => {
    try {
      setRefreshing(true);

      // 1. Fetch all chits for filter dropdown
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

  // Reset to first page whenever any filter or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedChitId, selectedStatus, receiptFilter, paymentModeFilter, selectedMonth, selectedCalMonth, dateFilterType, startDate, endDate, sortBy, searchQuery]);

  // Extract unique Calendar Months for Monthly-wise filter
  const availableCalMonths = useMemo(() => {
    const monthsMap = new Map();
    payments.forEach(p => {
      const dateVal = p.paymentDate || p.createdAt;
      if (dateVal) {
        const d = new Date(dateVal);
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

  // Filtered and Sorted Payments computation
  const filteredPayments = useMemo(() => {
    let result = payments.filter(p => {
      // 1. Chit Scheme Filter
      if (selectedChitId !== 'all') {
        const chitIdVal = p.chitId?._id || p.chitId?.id || p.chitId || p.chit?.id || p.chit?._id;
        if (chitIdVal?.toString() !== selectedChitId.toString()) return false;
      }

      // 2. Status Filter
      if (selectedStatus !== 'all' && p.status !== selectedStatus) {
        return false;
      }

      // 3. Receipt Filter
      if (receiptFilter === 'with_receipt') {
        if (!p.receiptNo && !p.receiptUrl) return false;
      } else if (receiptFilter === 'without_receipt') {
        if (p.receiptNo || p.receiptUrl) return false;
      }

      // 4. Payment Mode Filter
      if (paymentModeFilter !== 'all') {
        const mode = (p.paymentMode || 'Cash').toLowerCase();
        if (mode !== paymentModeFilter.toLowerCase()) return false;
      }

      // 5. Installment Month Filter
      if (selectedMonth !== 'all' && Number(p.monthNumber) !== Number(selectedMonth)) {
        return false;
      }

      // 6. Calendar Month Filter
      if (selectedCalMonth !== 'all') {
        const dateVal = p.paymentDate || p.createdAt;
        if (dateVal) {
          const d = new Date(dateVal);
          if (!isNaN(d.getTime())) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (key !== selectedCalMonth) return false;
          }
        }
      }

      // 7. Date Range Filter
      if (dateFilterType !== 'all') {
        const dateVal = p.paymentDate || p.createdAt;
        const paymentDate = dateVal ? new Date(dateVal) : null;
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

      // 8. Search Query Filter (Searches Name, Phone, Member ID, Receipt No, Txn ID, Chit Name, Signature Hash)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const userName = (p.user?.name || '').toLowerCase();
        const userPhone = (p.user?.phone || p.user?.whatsappNumber || '').toLowerCase();
        const userEmail = (p.user?.email || '').toLowerCase();
        const chitName = (p.chit?.name || '').toLowerCase();
        const ticketId = (p.ticketId || `MEMBER-${p.slotNumber || 1}`).toLowerCase();
        const memberId = (p.user?.memberId || '').toLowerCase();
        const receiptNo = (p.receiptNo || '').toLowerCase();
        const txnId = (p.transactionId || '').toLowerCase();
        const sigHash = (p.digitalSignature?.hash || '').toLowerCase();
        const monthStr = `month ${p.monthNumber}`.toLowerCase();
        const dateStr = p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-GB').toLowerCase() : '';

        return (
          userName.includes(query) ||
          userPhone.includes(query) ||
          userEmail.includes(query) ||
          chitName.includes(query) ||
          ticketId.includes(query) ||
          memberId.includes(query) ||
          receiptNo.includes(query) ||
          txnId.includes(query) ||
          sigHash.includes(query) ||
          monthStr.includes(query) ||
          dateStr.includes(query)
        );
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.paymentDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.paymentDate || b.createdAt || 0).getTime();
      const amtA = Number(a.amount || 0);
      const amtB = Number(b.amount || 0);

      switch (sortBy) {
        case 'date_asc':
          return dateA - dateB;
        case 'amount_desc':
          return amtB - amtA;
        case 'amount_asc':
          return amtA - amtB;
        case 'name_asc':
          return (a.user?.name || '').localeCompare(b.user?.name || '');
        case 'date_desc':
        default:
          return dateB - dateA;
      }
    });

    return result;
  }, [payments, selectedChitId, selectedStatus, receiptFilter, paymentModeFilter, selectedMonth, selectedCalMonth, dateFilterType, startDate, endDate, searchQuery, sortBy]);

  // Lazy Sliced Paginated Payments (Only renders visible rows for instant high performance)
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredPayments.length);
  const paginatedPayments = useMemo(() => {
    return filteredPayments.slice(startIndex, endIndex);
  }, [filteredPayments, startIndex, endIndex]);

  // Summary Metrics Computation
  const metrics = useMemo(() => {
    let totalCollected = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let withReceiptCount = 0;

    filteredPayments.forEach(p => {
      if (p.status === 'approved') {
        totalCollected += Number(p.amount || 0);
        approvedCount++;
      } else if (p.status === 'pending') {
        pendingCount++;
      } else if (p.status === 'rejected' || p.status === 'edit_requested') {
        rejectedCount++;
      }
      if (p.receiptNo || p.receiptUrl) {
        withReceiptCount++;
      }
    });

    return {
      totalCollected,
      approvedCount,
      pendingCount,
      rejectedCount,
      withReceiptCount,
      totalCount: filteredPayments.length
    };
  }, [filteredPayments]);

  // Export to Excel
  const exportToExcel = () => {
    const dataToExport = filteredPayments.map((p, idx) => ({
      'S.No': idx + 1,
      'Date': p.paymentDate || p.createdAt ? new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-GB') : 'N/A',
      'Receipt No': p.receiptNo || 'N/A',
      'Member Name': p.user?.name || 'N/A',
      'Member ID': p.user?.memberId || (p.ticketId || `MEMBER-${p.slotNumber || 1}`).replace(/^TICKET-/, 'MEMBER-'),
      'Phone': p.user?.phone || 'N/A',
      'Chit Scheme': p.chit?.name || 'N/A',
      'Installment': `Month ${p.monthNumber}`,
      'Amount (₹)': p.amount,
      'Payment Mode': p.paymentMode || 'Cash',
      'Transaction Ref ID': p.transactionId || 'N/A',
      'Due Amount': p.dueAmount || p.amount,
      'Remaining Due': p.remainingDue || 0,
      'Status': (p.status || 'PENDING').toUpperCase(),
      'Digital Signature': p.digitalSignature?.hash || 'N/A',
      'Receipt URL': p.receiptUrl || `${APP_BASE_URL}/receipt/${p.receiptNo || ''}`
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payment_Ledger');
    XLSX.writeFile(workbook, `InaVolu_Payment_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Safe helper to invoke autoTable across module bundlers
  const applyAutoTable = (doc, options) => {
    if (typeof autoTable === 'function') return autoTable(doc, options);
    if (autoTable && typeof autoTable.default === 'function') return autoTable.default(doc, options);
    if (doc && typeof doc.autoTable === 'function') return doc.autoTable(options);
    throw new Error('AutoTable function not available');
  };

  // Export & Open PDF Report
  const exportToPDF = () => {
    if (filteredPayments.length === 0) {
      alert('No payment transactions found for the selected filters.');
      return;
    }

    try {
      const doc = new jsPDF('landscape');

      doc.setFontSize(16);
      doc.setTextColor(10, 30, 59);
      doc.text('INAVOLU CHIT FUNDS - OFFICIAL PAYMENT & RECEIPT LEDGER', 14, 15);

      doc.setFontSize(9);
      doc.setTextColor(100);
      const schemeName = selectedChitId === 'all'
        ? 'All Schemes'
        : (chits.find(c => c.id === selectedChitId)?.name || 'Selected Scheme');
      const statusText = (selectedStatus || 'ALL').toUpperCase();
      const filterInfo = `Chit Scheme: ${schemeName} | Status: ${statusText} | Total Records: ${filteredPayments.length} | Generated on: ${new Date().toLocaleString('en-GB')}`;
      doc.text(filterInfo, 14, 22);

      const tableRows = filteredPayments.map((p, idx) => [
        idx + 1,
        p.paymentDate || p.createdAt ? new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-GB') : 'N/A',
        p.receiptNo || 'N/A',
        p.user?.name || 'N/A',
        p.user?.memberId || (p.ticketId || `MEMBER-${p.slotNumber || 1}`).replace(/^TICKET-/, 'MEMBER-'),
        p.chit?.name || 'N/A',
        `Month ${p.monthNumber || 1}`,
        'Rs. ' + Number(p.amount || 0).toLocaleString('en-IN'),
        p.paymentMode || 'Cash',
        p.transactionId || 'N/A',
        (p.status || 'PENDING').toUpperCase()
      ]);

      applyAutoTable(doc, {
        head: [['S.NO', 'Date', 'Receipt No', 'Member', 'Member ID', 'Chit Scheme', 'Month', 'Amount', 'Mode', 'Txn Ref', 'Status']],
        body: tableRows,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [10, 30, 59], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.5 }
      });

      const filename = `InaVolu_Payment_History_${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      try {
        window.open(blobUrl, '_blank');
      } catch (e) {
        console.warn('Popup blocked, opening inside preview modal', e);
      }

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
          <span style={{
            backgroundColor: '#dcfce7',
            color: '#15803d',
            padding: '0.28rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            border: '1px solid #bbf7d0',
            whiteSpace: 'nowrap'
          }}>
            <CheckCircle size={12} /> Paid & Verified
          </span>
        );
      case 'pending':
        return (
          <span style={{
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            padding: '0.28rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            border: '1px solid #bfdbfe',
            whiteSpace: 'nowrap'
          }}>
            <Clock size={12} /> Verifying
          </span>
        );
      case 'rejected':
        return (
          <span style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '0.28rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            border: '1px solid #fecaca',
            whiteSpace: 'nowrap'
          }}>
            <XCircle size={12} /> Rejected
          </span>
        );
      case 'edit_requested':
        return (
          <span style={{
            backgroundColor: '#fef3c7',
            color: '#b45309',
            padding: '0.28rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            border: '1px solid #fde68a',
            whiteSpace: 'nowrap'
          }}>
            <AlertCircle size={12} /> Edit Req
          </span>
        );
      default:
        return <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{status}</span>;
    }
  };

  const formatImgUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    return `${API_URL.replace('/api', '')}${url}`;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '65vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '3.5px solid #e2e8f0',
          borderTopColor: '#0a1e3b',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: '#0a1e3b', fontSize: '0.95rem', fontWeight: 700 }}>
          Loading Official Payment & Receipt Ledger...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="admin-page-container" style={{
      width: '100%',
      maxWidth: '1440px',
      margin: '0 auto',
      paddingBottom: '3.5rem',
      boxSizing: 'border-box'
    }}>

      {/* Official Executive Header Section with Glassmorphic Gradient */}
      <ScrollAnimationWrapper>
        <div style={{
          background: 'linear-gradient(135deg, rgba(10, 30, 59, 0.96) 0%, rgba(15, 45, 89, 0.94) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '1.25rem',
          padding: '1.5rem 1.75rem',
          color: '#ffffff',
          boxShadow: '0 12px 36px rgba(10, 30, 59, 0.16)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '1.5rem'
        }}>
          {/* Gold Accent Top Bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #d97706, #fbbf24, #d97706)'
          }} />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(251, 191, 36, 0.18)',
                color: '#fbbf24',
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.45rem',
                border: '1px solid rgba(251, 191, 36, 0.3)'
              }}>
                <ShieldCheck size={13} />
                <span>Government Registered Chit Fund Ledger</span>
              </div>
              <h1 style={{
                fontSize: '1.65rem',
                fontWeight: 900,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                Payment & Receipt <span style={{ color: '#fbbf24' }}>Audit Ledger</span>
              </h1>
              <p style={{
                color: '#cbd5e1',
                fontSize: '0.84rem',
                marginTop: '0.35rem',
                margin: '0.35rem 0 0 0',
                maxWidth: '680px',
                lineHeight: 1.45
              }}>
                Comprehensive record of chit monthly installment collections, digital receipts, official PDF links, and cryptographic authentication codes.
              </p>
            </div>

            {/* Action Buttons: Refresh, Excel, PDF */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                onClick={fetchHistoryData}
                disabled={refreshing}
                title="Refresh Ledger"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s'
                }}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              <button
                onClick={exportToExcel}
                title="Export Filtered Transactions to Excel"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1.05rem',
                  borderRadius: '10px',
                  border: '1px solid #86efac',
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.15)',
                  transition: 'all 0.2s'
                }}
              >
                <FileSpreadsheet size={15} color="#16a34a" />
                <span>Export Excel</span>
              </button>

              <button
                onClick={exportToPDF}
                title="View & Open PDF Payment History Report"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1.05rem',
                  borderRadius: '10px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.15)',
                  transition: 'all 0.2s'
                }}
              >
                <FileText size={15} color="#dc2626" />
                <span>PDF Ledger Report</span>
              </button>
            </div>
          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Glassmorphic KPI Summary Metric Cards */}
      <ScrollAnimationWrapper>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Card 1: Total Verified Collections */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderRadius: '1.1rem',
            padding: '1.25rem 1.35rem',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(16, 185, 129, 0.25)',
              flexShrink: 0
            }}>
              <IndianRupee size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Verified Collections
              </span>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: '0.15rem 0 0 0' }}>
                {formatCurrency(metrics.totalCollected)}
              </h3>
            </div>
          </div>

          {/* Card 2: Official Receipts Issued */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderRadius: '1.1rem',
            padding: '1.25rem 1.35rem',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0a1e3b 0%, #1e3a8a 100%)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(10, 30, 59, 0.25)',
              flexShrink: 0
            }}>
              <Receipt size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Official Receipts Issued
              </span>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0a1e3b', margin: '0.15rem 0 0 0' }}>
                {metrics.withReceiptCount} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>({metrics.totalCount > 0 ? Math.round((metrics.withReceiptCount / metrics.totalCount) * 100) : 0}%)</span>
              </h3>
            </div>
          </div>

          {/* Card 3: Pending Verifications */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderRadius: '1.1rem',
            padding: '1.25rem 1.35rem',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(245, 158, 11, 0.25)',
              flexShrink: 0
            }}>
              <Clock size={23} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pending Verifications
              </span>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#d97706', margin: '0.15rem 0 0 0' }}>
                {metrics.pendingCount}
              </h3>
            </div>
          </div>

          {/* Card 4: Total Filtered Records */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderRadius: '1.1rem',
            padding: '1.25rem 1.35rem',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(71, 85, 105, 0.25)',
              flexShrink: 0
            }}>
              <CheckCheck size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Filtered Records
              </span>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1e293b', margin: '0.15rem 0 0 0' }}>
                {metrics.totalCount}
              </h3>
            </div>
          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Glassmorphic Filter & Search Console */}
      <ScrollAnimationWrapper>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '1.25rem',
          padding: '1.35rem',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.04)',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem'
        }}>
          {/* Row 1: Search & Quick Presets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
            {/* Search Input */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                🔍 Search by Member, Receipt No (INA...), Phone, Txn Ref, Auth Code
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by Member Name, Phone, INA Receipt #, Auth Hash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: '#f1f5f9',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b'
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Receipt Status Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                🧾 Receipt Availability
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={receiptFilter}
                  onChange={(e) => setReceiptFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2rem 0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="all">🌟 All Payments</option>
                  <option value="with_receipt">✓ With Official Receipt (PDF)</option>
                  <option value="without_receipt">⏳ Without Receipt</option>
                </select>
                <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Sort Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                <ArrowUpDown size={12} style={{ display: 'inline', marginRight: '4px' }} /> Sort Ledger
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2rem 0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="date_desc">⏱️ Date: Newest First</option>
                  <option value="date_asc">⏱️ Date: Oldest First</option>
                  <option value="amount_desc">💰 Amount: High to Low</option>
                  <option value="amount_asc">💰 Amount: Low to High</option>
                  <option value="name_asc">👤 Member Name (A-Z)</option>
                </select>
                <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Row 2: Chit Scheme, Status, Month, Payment Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
            {/* Chit Scheme */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                Filter by Chit Scheme
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedChitId}
                  onChange={(e) => setSelectedChitId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2rem 0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="all">🌟 All Schemes ({chits.length})</option>
                  {chits.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (₹{(c.chitValue / 1000).toFixed(0)}K · {c.durationMonths}M)
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                Verification Status
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2rem 0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
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
                <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                Payment Mode
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={paymentModeFilter}
                  onChange={(e) => setPaymentModeFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2rem 0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="all">All Payment Modes</option>
                  <option value="Cash">💵 Cash</option>
                  <option value="UPI">📱 UPI</option>
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                  <option value="Cheque">📜 Cheque</option>
                </select>
                <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Date Preset */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                📅 Date Period
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={dateFilterType}
                  onChange={(e) => setDateFilterType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 2rem 0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
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
                  <option value="this_month">🗓️ Current Month</option>
                  <option value="custom">⚙️ Custom Range...</option>
                </select>
                <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Row 3: Custom Date Range (Conditional) */}
          {dateFilterType === 'custom' && (
            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                />
              </div>
            </div>
          )}

          {/* Active Filter Tags */}
          {(selectedChitId !== 'all' || selectedStatus !== 'all' || receiptFilter !== 'all' || paymentModeFilter !== 'all' || selectedMonth !== 'all' || selectedCalMonth !== 'all' || dateFilterType !== 'all' || searchQuery.trim() !== '') && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              paddingTop: '0.6rem',
              borderTop: '1px dashed #e2e8f0'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Active Filters:</span>

              {receiptFilter !== 'all' && (
                <span style={{ backgroundColor: '#ecfeff', color: '#0e7490', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '1rem', border: '1px solid #cffafe', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  Receipts: {receiptFilter === 'with_receipt' ? 'With PDF' : 'Without PDF'}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setReceiptFilter('all')} />
                </span>
              )}

              {paymentModeFilter !== 'all' && (
                <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '1rem', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  Mode: {paymentModeFilter}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setPaymentModeFilter('all')} />
                </span>
              )}

              {selectedChitId !== 'all' && (
                <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '1rem', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  Scheme: {chits.find(c => c.id === selectedChitId)?.name || 'Selected'}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSelectedChitId('all')} />
                </span>
              )}

              {selectedStatus !== 'all' && (
                <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '1rem', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  Status: {selectedStatus.toUpperCase()}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSelectedStatus('all')} />
                </span>
              )}

              {dateFilterType !== 'all' && (
                <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '1rem', border: '1px solid #ffedd5', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  Date: {dateFilterType === 'custom' ? `${startDate || 'Start'} to ${endDate || 'End'}` : dateFilterType.toUpperCase()}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => { setDateFilterType('all'); setStartDate(''); setEndDate(''); }} />
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
                  setReceiptFilter('all');
                  setPaymentModeFilter('all');
                  setSearchQuery('');
                  setSelectedMonth('all');
                  setSelectedCalMonth('all');
                  setDateFilterType('all');
                  setStartDate('');
                  setEndDate('');
                }}
                style={{
                  fontSize: '0.72rem',
                  color: '#dc2626',
                  background: 'none',
                  border: 'none',
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: '0.2rem 0.4rem'
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </ScrollAnimationWrapper>

      {/* Main Payment & Receipt Ledger Table Container (Glassmorphic) */}
      <ScrollAnimationWrapper>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 12px 35px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden'
        }}>
          {/* Table Header Bar showing active pagination range */}
          <div style={{
            padding: '0.9rem 1.35rem',
            backgroundColor: '#f8fafc',
            borderBottom: '1.5px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 700 }}>
              Showing <strong style={{ color: '#0a1e3b' }}>{filteredPayments.length === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of <strong style={{ color: '#0a1e3b' }}>{filteredPayments.length}</strong> transactions
              {filteredPayments.length !== payments.length && (
                <span style={{ color: '#64748b', fontWeight: 500 }}> (filtered from {payments.length} total)</span>
              )}
            </div>

            {/* Page Size Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#475569', fontWeight: 700 }}>
              <span>Show per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.1rem auto',
                color: '#2563eb'
              }}>
                <Receipt size={30} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                No Payment Transactions Found
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem', maxWidth: '380px', margin: '0.35rem auto 0 auto' }}>
                No payment or receipt records match your current filter parameters. Try clearing or relaxing search criteria.
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
                minWidth: '1380px',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.84rem'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#0a1e3b', color: '#ffffff' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '180px', whiteSpace: 'nowrap' }}>
                      Member / Account
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '230px', whiteSpace: 'nowrap' }}>
                      Chit Scheme
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '210px', whiteSpace: 'nowrap', backgroundColor: '#07152b' }}>
                      Official Receipt Data
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '110px', whiteSpace: 'nowrap' }}>
                      Installment
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '110px', whiteSpace: 'nowrap' }}>
                      Amount Paid
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '120px', whiteSpace: 'nowrap' }}>
                      Excess With Us
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '150px', whiteSpace: 'nowrap' }}>
                      Txn Ref / Mode
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '120px', whiteSpace: 'nowrap' }}>
                      Status
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '130px', whiteSpace: 'nowrap' }}>
                      Uploaded Proof
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '120px', whiteSpace: 'nowrap' }}>
                      Date / Time
                    </th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '145px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      Receipt Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((p, idx) => {
                    const rawTicketId = p.ticketId || `MEMBER-${p.slotNumber || 1}`;
                    const ticketId = rawTicketId.replace(/^TICKET-/, 'MEMBER-');
                    const memberIdVal = p.user?.memberId || ticketId;
                    const dateVal = p.paymentDate || p.createdAt;
                    const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                    const formattedTime = dateVal ? new Date(dateVal).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
                    const imgUrl = formatImgUrl(p.proofImgUrl);
                    const hasReceipt = Boolean(p.receiptNo || p.receiptUrl);

                    return (
                      <tr
                        key={p.id || p._id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* Member Details */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: '#0a1e3b',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              flexShrink: 0
                            }}>
                              {(p.user?.name || 'M')[0].toUpperCase()}
                            </div>
                            <div>
                              <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.86rem', whiteSpace: 'nowrap' }}>
                                {p.user?.name || 'Valued Member'}
                              </strong>
                              <span style={{ color: '#64748b', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
                                <Phone size={10} /> {p.user?.whatsappNumber || p.user?.phone || 'No phone'}
                              </span>
                              <span style={{ color: '#0a1e3b', fontSize: '0.72rem', fontWeight: 800 }}>
                                ID: {memberIdVal}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Chit Scheme */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', maxWidth: '240px' }}>
                          <strong style={{
                            color: '#0f172a',
                            display: 'block',
                            fontSize: '0.86rem',
                            fontWeight: 800,
                            lineHeight: 1.35
                          }}>
                            {p.chit?.name || 'Chit Scheme'}
                          </strong>
                          <span style={{
                            color: '#64748b',
                            fontSize: '0.73rem',
                            marginTop: '0.15rem',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>
                            Pool: ₹{p.chit ? (p.chit.chitValue / 1000).toFixed(0) : 0}K · {p.chit?.durationMonths || 20}M
                          </span>
                        </td>

                        {/* Official Receipt Data Column */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', backgroundColor: hasReceipt ? '#f0fdf4' : '#fafafa', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
                          {hasReceipt ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                <Link
                                  to={`/receipt/${p.receiptNo}`}
                                  target="_blank"
                                  title="Open Official Branded Receipt on inavolu.com"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    backgroundColor: '#0a1e3b',
                                    color: '#ffffff',
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '6px',
                                    fontSize: '0.76rem',
                                    fontFamily: 'monospace',
                                    fontWeight: 800,
                                    textDecoration: 'none',
                                    letterSpacing: '0.02em'
                                  }}
                                >
                                  <Receipt size={12} color="#fbbf24" />
                                  <span>{p.receiptNo || 'INA-RECEIPT'}</span>
                                  <ExternalLink size={10} />
                                </Link>
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <ShieldCheck size={11} />
                                <span>{p.digitalSignature?.hash ? p.digitalSignature.hash.slice(0, 16) : 'Verified & Signed'}</span>
                              </div>
                              {p.remainingDue !== undefined && (
                                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.15rem' }}>
                                  Rem Due: <strong style={{ color: p.remainingDue === 0 ? '#16a34a' : '#ea580c' }}>₹{Number(p.remainingDue).toLocaleString('en-IN')}</strong>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}>
                                ⏳ Pending Receipt
                              </span>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                Generated on Approval
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Installment Month */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '8px',
                            backgroundColor: '#f1f5f9',
                            color: '#0f172a',
                            fontWeight: 800,
                            fontSize: '0.82rem'
                          }}>
                            Month {p.monthNumber}
                          </span>
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <strong style={{ color: '#0a1e3b', fontSize: '0.94rem', fontWeight: 900 }}>
                            {formatCurrency(p.amount)}
                          </strong>
                        </td>

                        {/* Excess With Us */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {p.excessAmount > 0 ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 900,
                              fontSize: '0.82rem',
                              border: '1px solid #86efac'
                            }}>
                              +₹{Number(p.excessAmount).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>₹0</span>
                          )}
                        </td>

                        {/* Transaction ID / Mode */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#334155',
                            marginBottom: '0.2rem'
                          }}>
                            {p.paymentMode || 'Cash'}
                          </span>
                          {p.transactionId && p.transactionId !== 'OFFLINE' ? (
                            <div style={{
                              fontFamily: 'monospace',
                              fontSize: '0.73rem',
                              color: '#64748b',
                              wordBreak: 'break-all'
                            }}>
                              {p.transactionId}
                            </div>
                          ) : null}
                          {p.remarks && (
                            <div style={{ fontSize: '0.7rem', color: '#d97706', marginTop: '0.2rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.remarks}>
                              💬 {p.remarks}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {getStatusBadge(p.status)}
                        </td>

                        {/* Uploaded Proof / Slip */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {imgUrl && p.proofImgUrl !== 'MANUAL_ADMIN_ENTRY' && p.proofImgUrl !== 'MANUAL_ENTRY' ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImg({ url: imgUrl, title: `${p.user?.name} · Uploaded Proof (${ticketId})` })}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '0.5rem',
                                border: '1.5px solid #0a1e3b',
                                backgroundColor: '#0a1e3b',
                                color: '#ffffff',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Eye size={12} color="#fbbf24" />
                              <span>View Uploaded Proof</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              No Uploaded File
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ color: '#0f172a', fontSize: '0.82rem', fontWeight: 700 }}>{formattedDate}</div>
                          <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{formattedTime}</div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            {/* View Modal Receipt */}
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
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#0a1e3b',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Eye size={13} />
                            </button>

                            {/* Download PDF Receipt */}
                            <button
                              onClick={() => {
                                if (p.receiptUrl) {
                                  window.open(p.receiptUrl, '_blank');
                                } else {
                                  generatePaymentReceiptPDF(p, p.chit, p.user, {
                                    paidMonths: p.monthNumber,
                                    monthNumber: p.monthNumber,
                                    auctions: p.chit?.auctions,
                                    ticketId: p.ticketId
                                  });
                                }
                              }}
                              title="Download official PDF payment receipt"
                              style={{
                                padding: '0.35rem 0.55rem',
                                borderRadius: '6px',
                                border: '1px solid #bfdbfe',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Download size={13} />
                            </button>

                            {/* WhatsApp Receipt Notice */}
                            <button
                              onClick={() => {
                                const rawPhone = p.user?.whatsappNumber || p.user?.phone || '';
                                const cleanDigits = rawPhone.replace(/\D/g, '');
                                const phone10 = cleanDigits.slice(-10);
                                const fullPhone = phone10 ? `91${phone10}` : '';
                                const receiptLink = p.receiptNo ? `${APP_BASE_URL}/receipt/${p.receiptNo}` : p.receiptUrl;
                                const text = p.whatsappText || `*INAVOLU CHIT FUNDS - OFFICIAL RECEIPT*\nDear ${p.user?.name || 'Member'},\nPayment of ₹${Number(p.amount).toLocaleString('en-IN')} for Month ${p.monthNumber} is confirmed.\n${receiptLink ? `Download / View Official Receipt (PDF): ${receiptLink}` : ''}`;
                                const url = fullPhone ? `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                                window.open(url, '_blank');
                              }}
                              title="Send official receipt to member WhatsApp"
                              style={{
                                padding: '0.35rem 0.55rem',
                                borderRadius: '6px',
                                border: '1px solid #bbf7d0',
                                backgroundColor: '#f0fdf4',
                                color: '#16a34a',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <MessageCircle size={13} />
                            </button>

                            {/* View Branded Receipt Page */}
                            {p.receiptNo && (
                              <Link
                                to={`/receipt/${p.receiptNo}`}
                                target="_blank"
                                title="Open inavolu.com official receipt portal"
                                style={{
                                  padding: '0.35rem 0.55rem',
                                  borderRadius: '6px',
                                  border: '1px solid #c7d2fe',
                                  backgroundColor: '#eef2ff',
                                  color: '#4338ca',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textDecoration: 'none'
                                }}
                              >
                                <ExternalLink size={13} />
                              </Link>
                            )}

                            {/* Delete Payment Record */}
                            <button
                              onClick={() => handleDeletePayment(p.id || p._id)}
                              title="Delete this payment record"
                              style={{
                                padding: '0.35rem 0.55rem',
                                borderRadius: '6px',
                                border: '1px solid #fecaca',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Sleek Pagination & Table Footer */}
          <div style={{
            padding: '1rem 1.35rem',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.8rem',
            color: '#475569'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Showing <strong>{filteredPayments.length === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of <strong>{filteredPayments.length}</strong> total records</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ color: '#15803d', fontWeight: 700 }}>
                ✓ {metrics.withReceiptCount} Official Receipts Recorded
              </span>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {/* First Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: safeCurrentPage === 1 ? '#f1f5f9' : '#ffffff',
                    color: safeCurrentPage === 1 ? '#94a3b8' : '#0f172a',
                    cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="First Page"
                >
                  <ChevronsLeft size={14} />
                </button>

                {/* Previous Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  style={{
                    padding: '0.4rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: safeCurrentPage === 1 ? '#f1f5f9' : '#ffffff',
                    color: safeCurrentPage === 1 ? '#94a3b8' : '#0f172a',
                    cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    fontWeight: 700,
                    fontSize: '0.78rem'
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                {/* Page Numbers */}
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(pNum => {
                      if (totalPages <= 7) return true;
                      if (pNum === 1 || pNum === totalPages) return true;
                      if (Math.abs(pNum - safeCurrentPage) <= 1) return true;
                      return false;
                    })
                    .reduce((acc, pNum, index, arr) => {
                      if (index > 0 && pNum - arr[index - 1] > 1) {
                        acc.push(`ellipsis-${pNum}`);
                      }
                      acc.push(pNum);
                      return acc;
                    }, [])
                    .map((item) => {
                      if (typeof item === 'string') {
                        return <span key={item} style={{ padding: '0 0.25rem', color: '#94a3b8' }}>...</span>;
                      }
                      const isCurrent = item === safeCurrentPage;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCurrentPage(item)}
                          style={{
                            minWidth: '32px',
                            height: '32px',
                            padding: '0 0.4rem',
                            borderRadius: '8px',
                            border: isCurrent ? '1.5px solid #0a1e3b' : '1px solid #cbd5e1',
                            backgroundColor: isCurrent ? '#0a1e3b' : '#ffffff',
                            color: isCurrent ? '#ffffff' : '#334155',
                            fontWeight: isCurrent ? 800 : 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          {item}
                        </button>
                      );
                    })}
                </div>

                {/* Next Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  style={{
                    padding: '0.4rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: safeCurrentPage === totalPages ? '#f1f5f9' : '#ffffff',
                    color: safeCurrentPage === totalPages ? '#94a3b8' : '#0f172a',
                    cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    fontWeight: 700,
                    fontSize: '0.78rem'
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: safeCurrentPage === totalPages ? '#f1f5f9' : '#ffffff',
                    color: safeCurrentPage === totalPages ? '#94a3b8' : '#0f172a',
                    cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Last Page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            )}
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
              backgroundColor: '#0a1e3b',
              color: '#ffffff',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FileText size={20} color="#fbbf24" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                  Payment History Report (PDF Preview)
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <a
                  href={pdfPreviewModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    textDecoration: 'none',
                    fontWeight: 700,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    color: '#ffffff'
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Open Fullscreen</span>
                </a>
                <button
                  onClick={() => pdfPreviewModal.doc?.save(pdfPreviewModal.filename)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    backgroundColor: '#fbbf24',
                    color: '#0a1e3b',
                    border: 'none'
                  }}
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setPdfPreviewModal(null)}
                  style={{
                    border: 'none',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff'
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
