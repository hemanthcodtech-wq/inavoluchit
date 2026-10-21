import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Briefcase, 
  IndianRupee, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Check, 
  X, 
  Eye, 
  Download, 
  FileText, 
  FileSpreadsheet,
  Upload,
  Search,
  Lock,
  ShieldCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ProofUploader from '../../components/ProofUploader';
import { formatChitMonthYear, formatChitMonthFull } from '../../utils/chitDateUtils';

const UserDetailedRecords = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { token, API_URL, SERVER_URL } = useAuth();

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Lightbox Preview State
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Selected Chit Scheme View State
  const [selectedChitId, setSelectedChitId] = useState(null);
  const [allAuctions, setAllAuctions] = useState([]);
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Upload / Mark Paid Modal State
  const [uploadModal, setUploadModal] = useState({ 
    isOpen: false, 
    chitId: null, 
    slotNumber: 1,
    chitName: '', 
    amount: null, 
    monthNumber: null 
  });
  const [uploadData, setUploadData] = useState({ file: null, text: '' });
  const [uploadLoading, setUploadLoading] = useState(false);

  const fetchUserRecord = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/users-records/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setUserData(data.data);
      } else {
        // Fallback: fetch all and find
        const allRes = await fetch(`${API_URL}/admin/users-records`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const allData = await allRes.json();
        if (allData.success) {
          const match = allData.data.find(r => r.user.id === userId);
          if (match) {
            setUserData(match);
          } else {
            setError('Member records not found');
          }
        } else {
          setError(data.message || 'Failed to load member records');
        }
      }

      // Fetch all recorded auctions for accurate dividend adjustments
      try {
        const aucRes = await fetch(`${API_URL}/auctions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const aucData = await aucRes.json();
        if (aucData.success && Array.isArray(aucData.data)) {
          setAllAuctions(aucData.data);
        }
      } catch (aucErr) {
        console.warn('Auctions fetch notice:', aucErr);
      }
    } catch (err) {
      console.error('Error fetching detailed user records:', err);
      setError('Connection error loading member records');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserRecord();
    }
  }, [userId, token, API_URL]);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = event => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 800;
          let { width, height } = img;
          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(blob => {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          }, 'image/jpeg', 0.7);
        };
      };
    });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadLoading(true);

    try {
      let compressedFile = null;
      if (uploadData.file) {
        compressedFile = await compressImage(uploadData.file);
      }

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('amount', uploadModal.amount);
      formData.append('monthNumber', uploadModal.monthNumber);
      formData.append('slotNumber', uploadModal.slotNumber || 1);
      if (uploadData.text) formData.append('transactionId', uploadData.text);
      if (compressedFile) formData.append('proof', compressedFile);

      const response = await fetch(`${API_URL}/admin/chits/${uploadModal.chitId}/mark-paid`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage(`Month ${uploadModal.monthNumber} payment marked as paid successfully!`);
        setTimeout(() => setSuccessMessage(''), 4000);
        setUploadModal({ isOpen: false, chitId: null, slotNumber: 1, chitName: '', amount: null, monthNumber: null });
        setUploadData({ file: null, text: '' });
        fetchUserRecord(false);
      } else {
        alert(data.message || 'Failed to record payment');
      }
    } catch (err) {
      console.error('Error submitting payment:', err);
      alert('Connection error marking payment');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleMarkAsUnpaid = async (paymentId, monthNumber) => {
    if (!window.confirm(`Reset Month ${monthNumber} payment to unpaid? It will re-enter the verification queue.`)) return;
    try {
      const response = await fetch(`${API_URL}/admin/payments/${paymentId}/mark-unpaid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage(`Month ${monthNumber} reset to unpaid.`);
        setTimeout(() => setSuccessMessage(''), 4000);
        fetchUserRecord(false);
      } else {
        alert(data.message || 'Failed to reset payment');
      }
    } catch (err) {
      console.error('Error resetting payment:', err);
      alert('Connection error resetting payment');
    }
  };

  const getFullImgUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = SERVER_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'));
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--color-primary-green)' }}>
        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>Loading member payment records...</p>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div style={{ padding: '3rem 1rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <AlertCircle size={48} color="#dc2626" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>Member Record Not Found</h3>
        <p style={{ color: '#6b7280', margin: '0.5rem 0 1.5rem 0' }}>{error || 'Unable to locate details for this member.'}</p>
        <button
          onClick={() => navigate('/admin/records')}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '9999px', padding: '0.6rem 1.4rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to System Records</span>
        </button>
      </div>
    );
  }

  const { user, chits = [], payments = [] } = userData;

  // Global calculations across all enrolled chits
  const totalEnrolledChits = chits.length;

  let totalMonthsPaidAll = 0;
  let totalMonthsDueAll = 0;
  let totalAmountPaidAll = 0;
  let totalAmountDueAll = 0;

  // Sort chits sequentially by name and ticket number
  const sortedRawChits = [...chits].sort((a, b) => {
    const nameA = a.baseName || a.name || '';
    const nameB = b.baseName || b.name || '';
    const nameComp = nameA.localeCompare(nameB);
    if (nameComp !== 0) return nameComp;
    const numA = parseInt(String(a.ticketId || '').match(/\d+/)?.[0] || a.slotNumber || 0, 10);
    const numB = parseInt(String(b.ticketId || '').match(/\d+/)?.[0] || b.slotNumber || 0, 10);
    return numA - numB;
  });

  // Per-chit enriched data
  const enrichedChits = sortedRawChits.map(chit => {
    const rawChitId = chit.chitId || chit.id;
    const slotNum = chit.slotNumber || 1;
    const chitAuctions = (chit.auctions && chit.auctions.length > 0)
      ? chit.auctions
      : (allAuctions || []).filter(a => a.chitId === rawChitId);

    const chitPayments = payments.filter(p => p.chitId === rawChitId && (p.slotNumber || 1) === slotNum);
    const approvedPayments = chitPayments.filter(p => p.status === 'approved');
    const pendingPayments = chitPayments.filter(p => p.status === 'pending');

    const paidMonthsCount = approvedPayments.length;
    const duration = chit.durationMonths || 20;
    const nominal = Number(chit.monthlyContribution || 0);

    const chitAuctionList = chitAuctions || [];
    const maxAuctionMonth = chitAuctionList.reduce((max, a) => Math.max(max, Number(a.monthNumber || 0)), 0);
    const auctionedMonthsSet = new Set(chitAuctionList.map(a => Number(a.monthNumber)));

    // Map month numbers to payment records with dynamic dividend calculations
    const fullMonthLedger = [];
    let totalDividendSaved = 0;

    for (let m = 1; m <= duration; m++) {
      const paymentRecord = approvedPayments.find(p => p.monthNumber === m) 
        || pendingPayments.find(p => p.monthNumber === m)
        || null;

      const isPaid = !!(paymentRecord && paymentRecord.status === 'approved');
      const isPending = !!(paymentRecord && paymentRecord.status === 'pending');

      // Month 1 is always unlocked and payable from scheme inception (no auction required for 1st installment).
      // For Month M > 1, it unlocks after the Month M - 1 auction is completed (or if payment exists / chit completed).
      const isAuctionCompleted = m === 1 ? true : (auctionedMonthsSet.has(m - 1) || (m - 1) <= maxAuctionMonth);
      const isUnlocked = isAuctionCompleted || isPaid || isPending || chit.status === 'completed';

      // Check if admin explicitly configured monthly due for this month
      const customDueEntry = (chit.monthlyDues || []).find(d => Number(d.monthNumber) === m);
      let expectedAmount = customDueEntry ? Number(customDueEntry.dueAmount) : nominal;
      let dividend = 0;

      if (!customDueEntry && m > 1) {
        const prevAuction = chitAuctionList.find(a => Number(a.monthNumber) === m - 1);
        if (prevAuction) {
          if (prevAuction.nextPayableAmount !== undefined && prevAuction.nextPayableAmount !== null) {
            expectedAmount = Number(prevAuction.nextPayableAmount);
          } else if (prevAuction.dividendPerMember !== undefined && prevAuction.dividendPerMember !== null && Number(prevAuction.dividendPerMember) > 0) {
            expectedAmount = Math.max(0, nominal - Number(prevAuction.dividendPerMember));
          }
          dividend = Math.max(0, nominal - expectedAmount);
        } else if (paymentRecord && isPaid && Number(paymentRecord.amount) > 0) {
          expectedAmount = Number(paymentRecord.amount);
          dividend = Math.max(0, nominal - expectedAmount);
        }
      } else if (!customDueEntry) {
        if (paymentRecord && isPaid && Number(paymentRecord.amount) > 0) {
          expectedAmount = Number(paymentRecord.amount);
        }
      }

      const paidAmount = isPaid ? (Number(paymentRecord?.amount) || expectedAmount) : 0;
      if (isPaid && paidAmount > 0) {
        totalDividendSaved += Math.max(0, nominal - paidAmount);
      }

      fullMonthLedger.push({
        monthNumber: m,
        expectedAmount,
        dividend,
        paidAmount,
        payment: paymentRecord,
        isPaid,
        isPending,
        isAuctionCompleted,
        isUnlocked
      });
    }

    // Active ledger only includes unlocked / auctioned months (or months with payment)
    const monthLedger = fullMonthLedger.filter(row => row.isUnlocked);
    const unlockedMonthsCount = monthLedger.length;

    // Months Due is the count of unlocked/auctioned months that haven't been paid
    const monthsDue = monthLedger.filter(row => !row.isPaid).length;
    const amountPaid = approvedPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const amountDue = monthLedger.reduce((acc, item) => acc + (item.isPaid ? 0 : item.expectedAmount), 0);

    totalMonthsPaidAll += paidMonthsCount;
    totalMonthsDueAll += monthsDue;
    totalAmountPaidAll += amountPaid;
    totalAmountDueAll += amountDue;

    const percentPaid = Math.min(100, Math.round((paidMonthsCount / duration) * 100));

    return {
      ...chit,
      paidMonthsCount,
      unlockedMonthsCount,
      maxAuctionMonth,
      monthsDue,
      amountPaid,
      amountDue,
      totalDividendSaved,
      percentPaid,
      monthLedger,
      fullMonthLedger,
      approvedPayments,
      pendingPayments
    };
  });

  const activeChitId = selectedChitId || (enrichedChits[0]?.id || null);
  const activeChit = enrichedChits.find(c => c.id === activeChitId) || enrichedChits[0] || null;

  const exportStatementPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('en-GB');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INAVOLU CHIT FUNDS — Member Ledger Statement', 14, 18);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Member: ${user.name} | Phone: ${user.phone || 'N/A'} | Email: ${user.email}`, 14, 25);
    doc.text(`Enrolled Chits: ${totalEnrolledChits} | Total Months Paid: ${totalMonthsPaidAll} | Months Due: ${totalMonthsDueAll}`, 14, 30);
    doc.text(`Statement Generated on: ${today}`, 14, 35);

    let startY = 42;

    enrichedChits.forEach((chit, idx) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${chit.name} (Value: Rs.${chit.chitValue.toLocaleString()} | EMI: Rs.${chit.monthlyContribution.toLocaleString()})`, 14, startY);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Status: ${chit.status.toUpperCase()} | Paid: ${chit.paidMonthsCount}/${chit.durationMonths} Months | Due: ${chit.monthsDue} Months | Paid Amt: Rs.${chit.amountPaid.toLocaleString()} | Due Amt: Rs.${chit.amountDue.toLocaleString()}`, 14, startY + 5);

      const tableRows = chit.monthLedger.map(item => [
        `${formatChitMonthYear(chit, item.monthNumber)} (M${item.monthNumber})`,
        `Rs.${item.expectedAmount.toLocaleString()}`,
        item.isPaid ? 'PAID' : (item.isPending ? 'PENDING' : 'DUE'),
        item.payment?.transactionId || (item.isPaid ? 'Cash/Verified' : '—'),
        item.payment?.createdAt ? new Date(item.payment.createdAt).toLocaleDateString('en-GB') : '—'
      ]);

      autoTable(doc, {
        startY: startY + 8,
        head: [['Month & Year', 'Amount', 'Payment Status', 'Transaction ID / Mode', 'Paid Date']],
        body: tableRows,
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [22, 101, 52], textColor: 255 },
        margin: { left: 14, right: 14 }
      });

      startY = doc.lastAutoTable.finalY + 12;
    });

    doc.save(`${user.name.replace(/ /g, '_')}_Chit_Ledger_${today.replace(/\//g, '-')}.pdf`);
  };

  const exportStatementExcel = () => {
    const wb = XLSX.utils.book_new();

    const summaryRow = [{
      'Member Name': user.name,
      'Phone': user.phone || '',
      'Email': user.email || '',
      'Enrolled Chits': totalEnrolledChits,
      'Total Months Paid': totalMonthsPaidAll,
      'Total Months Due': totalMonthsDueAll,
      'Total Amount Paid (Rs)': totalAmountPaidAll,
      'Total Amount Due (Rs)': totalAmountDueAll
    }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRow), 'Member Summary');

    enrichedChits.forEach(chit => {
      const rows = chit.monthLedger.map(item => ({
        'Month & Year': `${formatChitMonthYear(chit, item.monthNumber)} (Month ${item.monthNumber})`,
        'Installment (Rs)': item.expectedAmount,
        'Status': item.isPaid ? 'PAID' : (item.isPending ? 'PENDING' : 'DUE'),
        'Transaction ID': item.payment?.transactionId || '',
        'Paid Date': item.payment?.createdAt ? new Date(item.payment.createdAt).toLocaleDateString('en-GB') : ''
      }));
      const sheetName = chit.name.substring(0, 28).replace(/[\\/?*[\]]/g, '_');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
    });

    XLSX.writeFile(wb, `${user.name.replace(/ /g, '_')}_Chit_Ledger.xlsx`);
  };

  return (
    <div className="admin-page-container" style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Top Navigation & Back Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#fff',
            border: '1px solid #d1d5db',
            padding: '0.5rem 1.1rem',
            borderRadius: '9999px',
            fontSize: '0.88rem',
            fontWeight: 700,
            color: '#374151',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
        >
          <ArrowLeft size={16} />
          <span>Back to Users</span>
        </button>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={exportStatementPDF}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Download size={15} />
            <span>Export PDF</span>
          </button>
          <button
            onClick={exportStatementExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #a5b4fc',
              color: '#2563eb',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          backgroundColor: '#eff6ff',
          border: '1px solid #a5b4fc',
          color: '#2563eb',
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Check size={18} color="#2563eb" />
            <span>{successMessage}</span>
          </div>
          <button 
            type="button"
            onClick={() => setSuccessMessage('')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Member Profile Overview Card */}
      <ScrollAnimationWrapper>
        <div className="glass-panel card-premium" style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          border: '1px solid rgba(10, 30, 59, 0.12)',
          padding: '1.75rem',
          marginBottom: '1.75rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#dbeafe',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800,
                border: '2px solid #a5b4fc'
              }}>
                {(user.name || 'User').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                    {user.name}
                  </h2>
                  <span className="badge badge-approved" style={{ fontSize: '0.75rem', backgroundColor: '#dbeafe', color: '#2563eb' }}>
                    Verified Member
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.4rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#4b5563' }}>
                  {user.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Phone size={15} color="#2563eb" />
                      <strong>{user.phone}</strong>
                    </span>
                  )}
                  {user.email && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Mail size={15} color="#2563eb" />
                      <span>{user.email}</span>
                    </span>
                  )}
                  {user.createdAt && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={15} color="#9ca3af" />
                      <span>Joined {new Date(user.createdAt).toLocaleDateString('en-GB')}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KYC Documents Links */}
            {(user.aadharImgUrl || user.panImgUrl) && (
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                {user.aadharImgUrl && (
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(getFullImgUrl(user.aadharImgUrl))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#f9fafb',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={14} color="#2563eb" />
                    <span>View Aadhaar</span>
                  </button>
                )}
                {user.panImgUrl && (
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(getFullImgUrl(user.panImgUrl))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#f9fafb',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={14} color="#2563eb" />
                    <span>View PAN</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Member Registration Profile Details Breakdown */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Personal & Address */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.15rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                👤 Personal & Address
              </div>
              <div style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div><strong>Member ID:</strong> {user.memberId || 'N/A'}</div>
                <div><strong>WhatsApp:</strong> {user.whatsappNumber || user.phone || 'N/A'}</div>
                <div><strong>Gender / DOB:</strong> {user.gender || 'N/A'} {user.dob ? `(${user.dob})` : ''}</div>
                <div><strong>Occupation:</strong> {user.occupation || 'N/A'}</div>
                <div><strong>Address:</strong> {[user.address, user.city, user.state, user.pincode].filter(Boolean).join(', ') || 'N/A'}</div>
                {user.remarks && <div><strong>Remarks:</strong> {user.remarks}</div>}
              </div>
            </div>

            {/* Nominee Details */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.15rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                👥 Nominee Details
              </div>
              <div style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div><strong>Nominee Name:</strong> {user.nomineeName || 'N/A'}</div>
                <div><strong>Relationship:</strong> {user.nomineeRelationship || 'N/A'}</div>
                <div><strong>Mobile:</strong> {user.nomineePhone || 'N/A'}</div>
                <div><strong>Type / DOB:</strong> {user.nomineeType || 'Primary'} {user.nomineeDob ? `(${user.nomineeDob})` : ''}</div>
                <div><strong>Address:</strong> {user.nomineeAddress || 'N/A'}</div>
                {user.nomineeRemarks && <div><strong>Remarks:</strong> {user.nomineeRemarks}</div>}
              </div>
            </div>

            {/* KYC & Guarantor Details */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.15rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                🛡️ KYC & Guarantor Details
              </div>
              <div style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div><strong>Aadhaar Number:</strong> {user.aadharNumber || 'N/A'}</div>
                <div><strong>PAN Number:</strong> {user.panNumber || 'N/A'}</div>
                <div><strong>Guarantor Required:</strong> {user.guarantorRequired || 'No'}</div>
                {user.guarantorRequired === 'Yes' && (
                  <>
                    <div><strong>Guarantor:</strong> {user.guarantorName || 'N/A'} ({user.guarantorRelationship || 'N/A'})</div>
                    <div><strong>Phone:</strong> {user.guarantorPhone || 'N/A'}</div>
                    <div><strong>Security Type:</strong> {user.securityType || 'N/A'} {user.securityValue ? `(₹${user.securityValue})` : ''}</div>
                    <div><strong>Verification:</strong> {user.securityVerificationStatus || 'Pending'}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Summary Metrics Cards (Dynamically Reflects Selected Chit Scheme) */}
      <ScrollAnimationWrapper>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {/* 1. Enrolled Chits / Selected Scheme */}
          <div className="card-premium" style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Enrolled Chits
              </span>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
                <Briefcase size={18} />
              </div>
            </div>
            <strong style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827' }}>
              {totalEnrolledChits}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={activeChit ? activeChit.name : ''}>
              Selected: <strong style={{ color: 'var(--color-primary-green)' }}>{activeChit ? activeChit.name : 'None'}</strong>
            </span>
          </div>

          {/* 2. Months Paid (For Selected Chit) */}
          <div className="card-premium" style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Months Paid
              </span>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <CheckCircle size={18} />
              </div>
            </div>
            <strong style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>
              {activeChit ? `${activeChit.paidMonthsCount} / ${activeChit.durationMonths}` : 0}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#2563eb', display: 'block', marginTop: '0.2rem', fontWeight: 600 }}>
              ₹{activeChit ? activeChit.amountPaid.toLocaleString() : 0} Cleared
            </span>
          </div>

          {/* 3. Months Due (For Selected Chit) */}
          <div className="card-premium" style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Months Due
              </span>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
                <Clock size={18} />
              </div>
            </div>
            <strong style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706' }}>
              {activeChit ? activeChit.monthsDue : 0}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#b45309', display: 'block', marginTop: '0.2rem', fontWeight: 600 }}>
              ₹{activeChit ? activeChit.amountDue.toLocaleString() : 0} Outstanding
            </span>
          </div>

          {/* 4. Total Paid Amount (For Selected Chit) */}
          <div className="card-premium" style={{ backgroundColor: '#fff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Paid Amount
              </span>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827' }}>
                <IndianRupee size={18} />
              </div>
            </div>
            <strong style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>
              ₹{activeChit ? activeChit.amountPaid.toLocaleString() : 0}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginTop: '0.2rem' }}>
              EMI: ₹{activeChit ? Number(activeChit.monthlyContribution || 0).toLocaleString() : 0}/mo
            </span>
          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Detailed Breakdown For Every Enrolled Chit */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary-green)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={22} color="var(--color-primary-green)" />
              <span>Chit Scheme Breakdown & Installment Ledger</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>
              Payment status, months completed, and pending dues for each enrolled chit scheme.
            </p>
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, backgroundColor: '#dbeafe', color: '#2563eb', padding: '0.3rem 0.8rem', borderRadius: '9999px' }}>
            {enrichedChits.length} {enrichedChits.length === 1 ? 'Chit Enrolled' : 'Chits Enrolled'}
          </span>
        </div>

        {enrichedChits.length === 0 ? (
          <div className="card-premium" style={{ backgroundColor: '#fff', textAlign: 'center', padding: '3.5rem 1rem', borderRadius: '16px' }}>
            <Briefcase size={40} color="#9ca3af" style={{ margin: '0 auto 1rem auto' }} />
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#374151' }}>No Enrolled Chits Found</h4>
            <p style={{ color: '#6b7280', fontSize: '0.88rem' }}>This member has not yet enrolled in any chit schemes.</p>
          </div>
        ) : (
          <>
            {/* Chit Scheme Selector Tabs / Cards */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
                  Select Chit Scheme to View Ledger:
                </span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Viewing: <strong style={{ color: 'var(--color-primary-green)' }}>{activeChit?.name}</strong>
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                {enrichedChits.map((c) => {
                  const isSelected = c.id === activeChit?.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedChitId(c.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        textAlign: 'left',
                        padding: '1.1rem 1.25rem',
                        borderRadius: '14px',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        border: isSelected ? '2px solid var(--color-primary-green)' : '1px solid #e5e7eb',
                        boxShadow: isSelected ? '0 4px 16px rgba(37, 99, 235, 0.12)' : '0 1px 4px rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#a5b4fc';
                          e.currentTarget.style.backgroundColor = '#fcfdfd';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '0.4rem' }}>
                        <span style={{
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          color: isSelected ? 'var(--color-primary-green)' : '#111827'
                        }}>
                          {c.name}
                        </span>
                        {isSelected ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: 'var(--color-primary-green)',
                            color: '#fff',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px'
                          }}>
                            <Check size={12} />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            backgroundColor: '#f3f4f6',
                            color: '#4b5563',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px'
                          }}>
                            Click to View
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: '0.82rem', color: '#4b5563', marginTop: '0.2rem' }}>
                        <span>Value: <strong style={{ color: '#111827' }}>₹{Number(c.chitValue || 0).toLocaleString()}</strong></span>
                        <span>EMI: <strong style={{ color: '#111827' }}>₹{Number(c.monthlyContribution || 0).toLocaleString()}/mo</strong></span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: '#dbeafe',
                          color: '#1d4ed8',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px'
                        }}>
                          {c.paidMonthsCount}/{c.durationMonths} Mos Paid
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: c.monthsDue > 0 ? '#fef3c7' : '#f3f4f6',
                          color: c.monthsDue > 0 ? '#b45309' : '#6b7280',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px'
                        }}>
                          {c.monthsDue} Mos Due
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Chit Scheme Details & Ledger */}
            {activeChit && (
              <ScrollAnimationWrapper key={activeChit.id}>
                <div className="glass-panel card-premium" style={{
                  backgroundColor: '#fff',
                  borderRadius: '16px',
                  border: '1px solid rgba(10, 30, 59, 0.12)',
                  padding: '1.75rem',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.03)'
                }}>
                  {/* Chit Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary-green)', margin: 0 }}>
                          {activeChit.name}
                        </h4>
                        <span className={`badge ${activeChit.status === 'active' ? 'badge-active' : activeChit.status === 'completed' ? 'badge-approved' : 'badge-pending'}`} style={{ fontSize: '0.75rem' }}>
                          {activeChit.status === 'active' ? `Active (Month ${activeChit.currentMonth || 1}/${activeChit.durationMonths})` : activeChit.status}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', display: 'block' }}>
                        {activeChit.termsAndConditions || 'Standard InaVolu Chit Pool'}
                      </span>
                    </div>

                    {/* Summary Badges on Top Right */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ backgroundColor: '#eff6ff', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.8rem', color: '#2563eb' }}>
                        Paid: <strong>{activeChit.paidMonthsCount} of {activeChit.durationMonths} Mos</strong>
                      </div>
                      <div style={{ backgroundColor: '#fffbeb', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.8rem', color: '#92400e' }}>
                        Due: <strong>{activeChit.monthsDue} {activeChit.monthsDue === 1 ? 'Month' : 'Months'}</strong>
                        {activeChit.unlockedMonthsCount < activeChit.durationMonths && (
                          <span style={{ fontSize: '0.72rem', color: '#b45309', marginLeft: '0.35rem' }}>
                            ({activeChit.unlockedMonthsCount} Auctioned)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chit Detail Stats Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem',
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    marginBottom: '1.25rem',
                    border: '1px solid #f3f4f6'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#6b7280', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chit Value</span>
                      <strong style={{ fontSize: '1.1rem', color: '#111827' }}>₹{Number(activeChit.chitValue || 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#6b7280', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly EMI</span>
                      <strong style={{ fontSize: '1.1rem', color: '#111827' }}>₹{Number(activeChit.monthlyContribution || 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#6b7280', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount Cleared</span>
                      <strong style={{ fontSize: '1.1rem', color: '#2563eb' }}>₹{activeChit.amountPaid.toLocaleString()}</strong>
                      {activeChit.totalDividendSaved > 0 && (
                        <span style={{ fontSize: '0.7rem', color: '#2563eb', display: 'block', fontWeight: 600 }}>
                          +₹{activeChit.totalDividendSaved.toLocaleString()} Saved via Dividend
                        </span>
                      )}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#6b7280', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {activeChit.unlockedMonthsCount < activeChit.durationMonths ? 'Current Due (Auctioned)' : 'Remaining Due'}
                      </span>
                      <strong style={{ fontSize: '1.1rem', color: '#dc2626' }}>₹{activeChit.amountDue.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.35rem' }}>
                      <span>Payment Progress ({activeChit.paidMonthsCount}/{activeChit.durationMonths} Months)</span>
                      <strong style={{ color: activeChit.percentPaid === 100 ? '#2563eb' : 'var(--color-primary-green)' }}>{activeChit.percentPaid}% Cleared</strong>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${activeChit.percentPaid}%`,
                        height: '100%',
                        backgroundColor: activeChit.percentPaid === 100 ? '#2563eb' : 'var(--color-primary-green)',
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* Month-by-Month Installment Ledger Table */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.85rem' }}>
                      <h5 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1f2937', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={16} color="var(--color-primary-green)" />
                        <span>Monthly Payment Schedule & Status ({activeChit.name})</span>
                      </h5>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setShowAllMonths(prev => !prev)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            backgroundColor: showAllMonths ? '#eff6ff' : '#ffffff',
                            color: showAllMonths ? '#2563eb' : '#4b5563',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title={showAllMonths ? 'Switch to showing only auctioned months' : 'Preview all future scheme months'}
                        >
                          {showAllMonths ? (
                            <>
                              <Check size={14} color="#2563eb" />
                              <span>Showing All {activeChit.durationMonths} Mos</span>
                            </>
                          ) : (
                            <>
                              <Eye size={14} />
                              <span>Preview All {activeChit.durationMonths} Months</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            <th style={{ padding: '0.65rem 1rem' }}>Month</th>
                            <th style={{ padding: '0.65rem 1rem' }}>Expected Amount</th>
                            <th style={{ padding: '0.65rem 1rem' }}>Payment Status</th>
                            <th style={{ padding: '0.65rem 1rem' }}>Transaction Ref / ID</th>
                            <th style={{ padding: '0.65rem 1rem' }}>Date Paid</th>
                            <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Admin Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const rowsToDisplay = showAllMonths ? activeChit.fullMonthLedger : activeChit.monthLedger;

                            if (rowsToDisplay.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#6b7280' }}>
                                    <Clock size={28} color="#d97706" style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                                    <strong style={{ fontSize: '0.95rem', color: '#111827', display: 'block' }}>No Auctions Conducted Yet</strong>
                                    <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                                      Monthly payment installments will appear here after the Month 1 auction is completed.
                                    </span>
                                  </td>
                                </tr>
                              );
                            }

                            return rowsToDisplay.map((row) => {
                              const isRowLocked = !row.isUnlocked;

                              return (
                                <tr 
                                  key={row.monthNumber} 
                                  style={{ 
                                    borderBottom: '1px solid #f3f4f6',
                                    backgroundColor: isRowLocked
                                      ? '#fbfbfb'
                                      : (row.isPaid ? '#ffffff' : (row.isPending ? '#fffbeb' : '#fafafa')),
                                    opacity: isRowLocked ? 0.65 : 1
                                  }}
                                >
                                  {/* Month */}
                                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: isRowLocked ? '#6b7280' : '#111827' }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isRowLocked ? '#6b7280' : '#111827' }}>
                                      {formatChitMonthYear(activeChit, row.monthNumber)}
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: 600 }}>
                                      Month {row.monthNumber}
                                    </div>
                                    {isRowLocked && (
                                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', fontWeight: 500 }}>
                                        (Auction Pending)
                                      </span>
                                    )}
                                  </td>

                                  {/* Amount */}
                                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                                    <div>
                                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isRowLocked ? '#6b7280' : '#111827' }}>
                                        ₹{Number(row.expectedAmount || 0).toLocaleString()}
                                      </span>
                                      {row.dividend > 0 && (
                                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#2563eb', fontWeight: 600 }}>
                                          (₹{row.dividend.toLocaleString()} dividend deducted)
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td style={{ padding: '0.75rem 1rem' }}>
                                    {isRowLocked ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        backgroundColor: '#f3f4f6',
                                        color: '#6b7280',
                                        padding: '0.2rem 0.65rem',
                                        borderRadius: '9999px'
                                      }}>
                                        <Lock size={12} />
                                        <span>Pending Auction</span>
                                      </span>
                                    ) : row.isPaid ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        backgroundColor: '#dbeafe',
                                        color: '#2563eb',
                                        padding: '0.2rem 0.65rem',
                                        borderRadius: '9999px'
                                      }}>
                                        <Check size={13} />
                                        <span>Paid</span>
                                      </span>
                                    ) : row.isPending ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        backgroundColor: '#fef3c7',
                                        color: '#92400e',
                                        padding: '0.2rem 0.65rem',
                                        borderRadius: '9999px'
                                      }}>
                                        <Clock size={13} />
                                        <span>Pending Approval</span>
                                      </span>
                                    ) : (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        backgroundColor: '#fee2e2',
                                        color: '#dc2626',
                                        padding: '0.2rem 0.65rem',
                                        borderRadius: '9999px'
                                      }}>
                                        <AlertCircle size={13} />
                                        <span>Due</span>
                                      </span>
                                    )}
                                  </td>

                                  {/* Transaction ID */}
                                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.8rem' }}>
                                    {row.payment?.transactionId ? (
                                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#374151' }}>
                                        {row.payment.transactionId}
                                      </span>
                                    ) : (
                                      row.isPaid ? <span style={{ color: '#2563eb' }}>Cash/Admin Verified</span> : '—'
                                    )}
                                  </td>

                                  {/* Date Paid */}
                                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.8rem' }}>
                                    {row.payment?.createdAt ? new Date(row.payment.createdAt).toLocaleDateString('en-GB') : '—'}
                                  </td>

                                  {/* Actions */}
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                      {isRowLocked ? (
                                        <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <Lock size={12} />
                                          <span>Awaiting Auction</span>
                                        </span>
                                      ) : row.isPaid ? (
                                        <>
                                          {row.payment?.receiptImgUrl && (
                                            <button
                                              type="button"
                                              onClick={() => setLightboxUrl(getFullImgUrl(row.payment.receiptImgUrl))}
                                              title="View Payment Receipt"
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                padding: '0.35rem 0.65rem',
                                                borderRadius: '6px',
                                                border: '1px solid #d1d5db',
                                                backgroundColor: '#fff',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: '#2563eb',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              <Eye size={12} />
                                              <span>Receipt</span>
                                            </button>
                                          )}
                                          <span
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '0.3rem',
                                              padding: '0.35rem 0.75rem',
                                              borderRadius: '6px',
                                              border: '1px solid #a5b4fc',
                                              backgroundColor: '#eff6ff',
                                              color: '#2563eb',
                                              fontSize: '0.75rem',
                                              fontWeight: 700
                                            }}
                                          >
                                            <Check size={13} />
                                            <span>Marked Paid</span>
                                          </span>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setUploadModal({
                                            isOpen: true,
                                            chitId: activeChit.chitId || activeChit.id,
                                            slotNumber: activeChit.slotNumber || 1,
                                            chitName: activeChit.name,
                                            amount: row.expectedAmount,
                                            monthNumber: row.monthNumber
                                          })}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            padding: '0.35rem 0.75rem',
                                            borderRadius: '6px',
                                            border: '1px solid #a5b4fc',
                                            backgroundColor: '#eff6ff',
                                            color: '#2563eb',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                          }}
                                        >
                                          <Check size={13} />
                                          <span>Mark Paid</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Locked notice for future months */}
                    {activeChit.unlockedMonthsCount < activeChit.durationMonths && !showAllMonths && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.85rem 1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px dashed #cbd5e1',
                        marginTop: '0.85rem',
                        fontSize: '0.82rem',
                        color: '#64748b'
                      }}>
                        <Lock size={15} color="#94a3b8" />
                        <span>
                          Months {activeChit.unlockedMonthsCount + 1} to {activeChit.durationMonths} will appear after their respective monthly auctions are conducted.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollAnimationWrapper>
            )}
          </>
        )}
      </div>

      {/* Mark As Paid Modal */}
      {uploadModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setUploadModal({ isOpen: false, chitId: null, chitName: '', amount: null, monthNumber: null }); }}
        >
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            padding: '1.75rem',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary-green)', margin: 0 }}>
                  Mark Month {uploadModal.monthNumber} Paid
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>
                  {uploadModal.chitName} — Member: {user.name}
                </p>
              </div>
              <button 
                onClick={() => setUploadModal({ isOpen: false, chitId: null, slotNumber: 1, chitName: '', amount: null, monthNumber: null })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>Amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={uploadModal.amount ?? ''}
                  onChange={(e) => setUploadModal({ ...uploadModal, amount: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', marginTop: '0.2rem' }}>
                  Auto-calculated from scheme & auction dividend. Can be adjusted if needed.
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>Transaction ID / Note (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. Cash collected / UPI Ref ID"
                  value={uploadData.text}
                  onChange={(e) => setUploadData({ ...uploadData, text: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <ProofUploader
                  label="Receipt Image / Proof"
                  description="Upload file or snap live camera photo"
                  required={false}
                  onFileSelected={(file) => setUploadData({ ...uploadData, file })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setUploadModal({ isOpen: false, chitId: null, slotNumber: 1, chitName: '', amount: null, monthNumber: null })}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '9999px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="btn-primary"
                  style={{ flex: 2, padding: '0.6rem', borderRadius: '9999px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  {uploadLoading ? 'Recording...' : (<><Check size={16} /> Confirm Paid</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Receipts & KYC */}
      {lightboxUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '2rem'
        }}
          onClick={() => setLightboxUrl(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img 
              src={lightboxUrl} 
              alt="Receipt Preview" 
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }} 
            />
            <button
              onClick={() => setLightboxUrl(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                backgroundColor: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetailedRecords;
