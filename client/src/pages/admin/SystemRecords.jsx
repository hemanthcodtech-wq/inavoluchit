import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import { 
  Users, 
  Briefcase, 
  Search, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  CreditCard,
  Calendar,
  CheckCircle,
  Hourglass,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  LogOut
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import XLSX from 'xlsx-js-style';

// Center-align every cell (Excel right-aligns numbers by default) and bold the header row
const centerSheet = (sheet) => {
  if (!sheet['!ref']) return sheet;
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell) continue;
      cell.s = {
        alignment: { horizontal: 'center', vertical: 'center' },
        ...(R === 0 ? { font: { bold: true } } : {})
      };
    }
  }
  return sheet;
};

const SystemRecords = () => {
  const navigate = useNavigate();
  const { token, API_URL, SERVER_URL, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'chits'
  
  // Data State
  const [usersRecords, setUsersRecords] = useState([]);
  const [chitsRecords, setChitsRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLedgerMonths, setSelectedLedgerMonths] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  
  // Search Filters
  const [searchQuery, setSearchQuery] = useState('');
  
  // Expanded Accordion State
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [expandedChitId, setExpandedChitId] = useState(null);

  // Lightbox Preview State
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Upload Modal State
  const [uploadModal, setUploadModal] = useState({ isOpen: false, chitId: null, userId: null, amount: null, monthNumber: null });
  const [uploadData, setUploadData] = useState({ file: null, text: '' });
  const [uploadLoading, setUploadLoading] = useState(false);

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
    if (!uploadData.file) return alert('Please select an image file');
    setUploadLoading(true);

    try {
      const compressedFile = await compressImage(uploadData.file);

      const formData = new FormData();
      formData.append('userId', uploadModal.userId);
      formData.append('amount', uploadModal.amount);
      formData.append('monthNumber', uploadModal.monthNumber);
      if (uploadData.text) formData.append('transactionId', uploadData.text);
      formData.append('proof', compressedFile);

      const response = await fetch(`${API_URL}/admin/chits/${uploadModal.chitId}/mark-paid`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Payment marked with proof successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        setUploadModal({ isOpen: false, chitId: null, userId: null, amount: null, monthNumber: null });
        setUploadData({ file: null, text: '' });
        fetchRecords(false);
      } else {
        alert(data.message || 'Failed to mark payment');
      }
    } catch (error) {
      console.error('Error marking with proof:', error);
      alert('Connection error');
    } finally {
      setUploadLoading(false);
    }
  };

  const fetchRecords = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Fetch users database with history
      const usersRes = await fetch(`${API_URL}/admin/users-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const usersData = await usersRes.json();

      // Fetch chits database with history
      const chitsRes = await fetch(`${API_URL}/admin/chits-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const chitsData = await chitsRes.json();

      if (usersData.success && chitsData.success) {
        setUsersRecords(usersData.data);
        setChitsRecords(chitsData.data);
      }
    } catch (error) {
      console.error('Error fetching records database:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [token, API_URL]);

  const handleUserToggle = (id) => {
    setExpandedUserId(expandedUserId === id ? null : id);
  };

  const handleChitToggle = (id) => {
    setExpandedChitId(expandedChitId === id ? null : id);
  };

  const handleMarkAsPaid = async (chitId, userId, amount, monthNumber) => {
    try {
      const response = await fetch(`${API_URL}/admin/chits/${chitId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId, amount, monthNumber })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Payment marked successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchRecords(false); // Silent refresh in background to avoid loading spinner
      } else {
        setSuccessMessage(data.message || 'Failed to mark payment');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      setSuccessMessage('Connection error while marking payment');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleMarkAsUnpaid = async (paymentId) => {
    if (!window.confirm('Reset this payment to pending (unpaid)? It will re-enter the verification queue.')) return;
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
        setSuccessMessage('Payment marked as unpaid and returned to verification queue.');
        setTimeout(() => setSuccessMessage(''), 3500);
        fetchRecords(false);
      } else {
        setSuccessMessage(data.message || 'Failed to mark as unpaid');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error marking as unpaid:', error);
      setSuccessMessage('Connection error while marking as unpaid');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const getFullImgUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const base = SERVER_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'));
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  // Filters
  const filteredUsers = usersRecords.filter(record => 
    record.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.user.phone.includes(searchQuery)
  );

  const filteredChits = chitsRecords.filter(record => 
    record.chit.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Export Helpers ───────────────────────────────────────────────
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const exportUsersPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INAVOLU CHIT FUNDS — Users Records', 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Exported on ${today}`, 14, 26);

    const rows = filteredUsers.map(({ user, chits, payments }, idx) => [
      idx + 1,
      user.name || '—',
      user.email || '—',
      user.phone || '—',
      chits.length.toString(),
      payments.filter(p => p.status === 'approved').length.toString(),
      `Rs.${payments.filter(p => p.status === 'approved').reduce((s, p) => s + (p.amount || 0), 0)}`
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['S.NO', 'Name', 'Email', 'Phone', 'Chits Joined', 'Paid Months', 'Total Paid']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { left: 14, right: 14 }
    });

    // Installment details sub-table for each user
    filteredUsers.forEach(({ user, payments }) => {
      if (payments.length === 0) return;
      const prevY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Installments — ${user.name}`, 14, prevY);
      autoTable(doc, {
        startY: prevY + 4,
        head: [['S.NO', 'Chit', 'Month', 'Amount', 'Transaction ID', 'Status']],
        body: payments.map((p, pIdx) => [
          pIdx + 1,
          p.chit?.name || '—',
          `Month ${p.monthNumber}`,
          `Rs.${p.amount || 0}`,
          p.transactionId || '—',
          p.status
        ]),
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        margin: { left: 14, right: 14 }
      });
    });

    doc.save(`Users_Records_${today.replace(/ /g, '_')}.pdf`);
  };

  const exportUsersExcel = () => {
    const wb = XLSX.utils.book_new();

    // Users summary sheet
    const userRows = filteredUsers.map(({ user, chits, payments }, idx) => ({
      'S.No': idx + 1,
      Name: user.name || '—',
      Email: user.email || '—',
      Phone: user.phone ? String(user.phone) : '—',
      'Chits Joined': chits.length,
      'Paid Installments': payments.filter(p => p.status === 'approved').length,
      'Total Paid (Rs)': payments.filter(p => p.status === 'approved').reduce((s, p) => s + (p.amount || 0), 0),
      'Pending Installments': payments.filter(p => p.status === 'pending').length,
      'Joined On': user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : '—'
    }));
    const userSheet = XLSX.utils.json_to_sheet(userRows);
    userSheet['!cols'] = [
      { wch: 8 },   // S.No
      { wch: 26 },  // Name
      { wch: 34 },  // Email
      { wch: 18 },  // Phone
      { wch: 16 },  // Chits Joined
      { wch: 18 },  // Paid Installments
      { wch: 20 },  // Total Paid (Rs)
      { wch: 22 },  // Pending Installments
      { wch: 18 }   // Joined On
    ];
    XLSX.utils.book_append_sheet(wb, centerSheet(userSheet), 'Users Summary');

    // Installments detail sheet
    const payRows = filteredUsers.flatMap(({ user, payments }) =>
      payments.map((p, pIdx) => ({
        'S.No': pIdx + 1,
        'User Name': user.name || '—',
        Email: user.email || '—',
        Phone: user.phone ? String(user.phone) : '—',
        Chit: p.chit?.name || '—',
        Month: `Month ${p.monthNumber}`,
        'Amount (Rs)': p.amount || 0,
        'Transaction ID': p.transactionId || '—',
        Status: p.status ? p.status.toUpperCase() : '—',
        'Submitted On': p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '—'
      }))
    );
    const paySheet = XLSX.utils.json_to_sheet(payRows);
    paySheet['!cols'] = [
      { wch: 8 },   // S.No
      { wch: 26 },  // User Name
      { wch: 34 },  // Email
      { wch: 18 },  // Phone
      { wch: 26 },  // Chit
      { wch: 14 },  // Month
      { wch: 16 },  // Amount (Rs)
      { wch: 24 },  // Transaction ID
      { wch: 16 },  // Status
      { wch: 18 }   // Submitted On
    ];
    XLSX.utils.book_append_sheet(wb, centerSheet(paySheet), 'Installments');

    XLSX.writeFile(wb, `Users_Records_${today.replace(/ /g, '_')}.xlsx`);
  };

  const exportChitsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INAVOLU CHIT FUNDS — Chit Pool Records', 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Exported on ${today}`, 14, 26);

    autoTable(doc, {
      startY: 32,
      head: [['S.NO', 'Chit Name', 'Status', 'Pool Value', 'EMI', 'Duration', 'Members', 'Collected']],
      body: filteredChits.map(({ chit, payments }, idx) => [
        idx + 1,
        chit.name,
        chit.status,
        `Rs.${chit.chitValue || 0}`,
        `Rs.${chit.monthlyContribution || 0}`,
        `${chit.durationMonths} months`,
        (chit.members || []).filter(m => m.status === 'approved').length.toString(),
        `Rs.${payments.filter(p => p.status === 'approved').reduce((s, p) => s + (p.amount || 0), 0)}`
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { left: 14, right: 14 }
    });

    // Payment breakdown per chit
    filteredChits.forEach(({ chit, payments }) => {
      if (payments.length === 0) return;
      const prevY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Payments \u2014 ${chit.name}`, 14, prevY);
      autoTable(doc, {
        startY: prevY + 4,
        head: [['S.NO', 'Member', 'Month', 'Amount', 'Transaction ID', 'Status']],
        body: payments.map((p, pIdx) => [
          pIdx + 1,
          p.user?.name || '\u2014',
          `Month ${p.monthNumber}`,
          `Rs.${p.amount || 0}`,
          p.transactionId || '\u2014',
          p.status
        ]),
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        headStyles: { fillColor: [124, 58, 237], textColor: 255 },
        margin: { left: 14, right: 14 }
      });
    });

    doc.save(`Chit_Records_${today.replace(/ /g, '_')}.pdf`);
  };

  const exportChitsExcel = () => {
    const wb = XLSX.utils.book_new();

    // Chits summary
    const chitRows = filteredChits.map(({ chit, payments }, idx) => ({
      'S.No': idx + 1,
      'Chit Name': chit.name,
      Status: chit.status ? chit.status.toUpperCase() : '—',
      'Pool Value (Rs)': chit.chitValue || 0,
      'Monthly EMI (Rs)': chit.monthlyContribution || 0,
      'Duration (Months)': chit.durationMonths,
      'Approved Members': (chit.members || []).filter(m => m.status === 'approved').length,
      'Total Members Configured': chit.totalMembers || 0,
      'Total Collected (Rs)': payments.filter(p => p.status === 'approved').reduce((s, p) => s + (p.amount || 0), 0),
      'Managed By': chit.creator?.name || 'Superadmin'
    }));
    const chitSheet = XLSX.utils.json_to_sheet(chitRows);
    chitSheet['!cols'] = [
      { wch: 8 },   // S.No
      { wch: 28 },  // Chit Name
      { wch: 14 },  // Status
      { wch: 18 },  // Pool Value (Rs)
      { wch: 18 },  // Monthly EMI (Rs)
      { wch: 18 },  // Duration (Months)
      { wch: 18 },  // Approved Members
      { wch: 24 },  // Total Members Configured
      { wch: 22 },  // Total Collected (Rs)
      { wch: 22 }   // Managed By
    ];
    XLSX.utils.book_append_sheet(wb, centerSheet(chitSheet), 'Chits Summary');

    // Payments per chit
    const payRows = filteredChits.flatMap(({ chit, payments }) =>
      payments.map((p, pIdx) => ({
        'S.No': pIdx + 1,
        'Chit Name': chit.name,
        'Member Name': p.user?.name || '\u2014',
        Month: `Month ${p.monthNumber}`,
        'Amount (Rs)': p.amount || 0,
        'Transaction ID': p.transactionId || '',
        Status: p.status ? p.status.toUpperCase() : '—',
        'Submitted On': p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : ''
      }))
    );
    const paySheet = XLSX.utils.json_to_sheet(payRows);
    paySheet['!cols'] = [
      { wch: 8 },   // S.No
      { wch: 28 },  // Chit Name
      { wch: 26 },  // Member Name
      { wch: 14 },  // Month
      { wch: 16 },  // Amount (Rs)
      { wch: 24 },  // Transaction ID
      { wch: 16 },  // Status
      { wch: 18 }   // Submitted On
    ];
    XLSX.utils.book_append_sheet(wb, centerSheet(paySheet), 'Chit Payments');

    XLSX.writeFile(wb, `Chit_Records_${today.replace(/ /g, '_')}.xlsx`);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading system logs database...</div>;
  }

  return (
    <div className="admin-page-container" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', boxSizing: 'border-box' }}>
      <ScrollAnimationWrapper>
        <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800 }}>
              System <span style={{ color: 'var(--accent-yellow-dark)' }}>Ledger Records</span>
            </h1>
            <p style={{ color: 'var(--color-secondary)', marginTop: '0.25rem', fontSize: '0.9rem', lineHeight: 1.4 }}>
              Comprehensive records repository to track verified members, active savings chits, and cash collections logs.
            </p>
          </div>

          <div className="admin-page-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => fetchRecords()}
              disabled={loading}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.1rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                borderRadius: '0.5rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                border: '1px solid var(--border-subtle)',
                backgroundColor: '#fff'
              }}
            >
              <RefreshCw size={16} className={loading ? "spin" : ""} />
              <span>Refresh Data</span>
            </button>

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.1rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                backgroundColor: '#fff',
                color: '#dc2626',
                boxShadow: '0 1px 3px rgba(220, 38, 38, 0.08)',
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
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Tabs Selector & Search */}
      <ScrollAnimationWrapper>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {/* Tabs */}
          <div className="glass-panel" style={{ display: 'flex', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                backgroundColor: activeTab === 'users' ? 'var(--accent-yellow)' : 'transparent',
                color: 'var(--color-primary)',
                transition: 'var(--transition-fast)'
              }}
            >
              <Users size={18} />
              <span>Users Database</span>
            </button>
            <button
              onClick={() => { setActiveTab('chits'); setSearchQuery(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                backgroundColor: activeTab === 'chits' ? 'var(--accent-yellow)' : 'transparent',
                color: 'var(--color-primary)',
                transition: 'var(--transition-fast)'
              }}
            >
              <Briefcase size={18} />
              <span>Chit Pools</span>
            </button>
          </div>

          {/* Right: Search + Export Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div style={{ position: 'relative', minWidth: '200px', maxWidth: '280px' }}>
              <Search size={16} style={{
                position: 'absolute', left: '0.85rem', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--color-secondary)'
              }} />
              <input
                type="text"
                placeholder={activeTab === 'users' ? 'Search users...' : 'Search chits...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '2.25rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontSize: '0.85rem' }}
              />
            </div>


          </div>
        </div>
      </ScrollAnimationWrapper>

      {successMessage && (
        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: '#dbeafe', border: '1px solid var(--color-success)', color: '#2563eb', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>
          {successMessage}
        </div>
      )}

      {/* Main content lists */}
      {activeTab === 'users' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredUsers.length === 0 ? (
            <div className="card-premium" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--color-secondary)' }}>No user records match your search filter.</p>
            </div>
          ) : (
            filteredUsers.map((record) => {
              return (
                <ScrollAnimationWrapper key={record.user.id}>
                  <div 
                    onClick={() => navigate(`/admin/records/user/${record.user.id}`)}
                    className="glass-panel card-premium" 
                    style={{ 
                      backgroundColor: '#fff',
                      border: '1px solid rgba(10, 30, 59, 0.12)',
                      borderRadius: '14px',
                      padding: '1.25rem 1.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary-green)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(10, 30, 59, 0.12)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.03)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          backgroundColor: '#dbeafe',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          border: '2px solid #a5b4fc'
                        }}>
                          {(record.user.name || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                            {record.user.name}
                          </h3>
                          <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>
                            Email: {record.user.email} | Phone: {record.user.phone || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <span className="badge badge-approved" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', fontWeight: 700 }}>
                          Joined Chits: {record.chits.length}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/records/user/${record.user.id}`);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            borderRadius: '9999px',
                            padding: '0.5rem 1.1rem',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(29, 78, 216, 0.1)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                        >
                          <Eye size={15} />
                          <span>View Records</span>
                          <span>&rarr;</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </ScrollAnimationWrapper>
              );
            })
          )}
        </div>
      ) : (
        /* Chits Database tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredChits.length === 0 ? (
            <div className="card-premium" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--color-secondary)' }}>No chit records match your search filter.</p>
            </div>
          ) : (
            filteredChits.map((record) => {
              const isExpanded = expandedChitId === record.chit.id;
              const approvedCount = record.chit.members.filter(m => m.status === 'approved').length;
              
              return (
                <ScrollAnimationWrapper key={record.chit.id}>
                  <div className="glass-panel card-premium" style={{ border: '1px solid rgba(255, 255, 255, 0.6)' }}>
                    {/* Header Row */}
                    <div 
                      onClick={() => handleChitToggle(record.chit.id)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{record.chit.name}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-secondary)' }}>
                          Pool Pool: ₹{record.chit.chitValue.toLocaleString()} | EMI: ₹{record.chit.monthlyContribution.toLocaleString()} | Duration: {record.chit.durationMonths} Months
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {record.chit.status === 'active' ? (
                          <span className="badge badge-active">Active (Month {record.chit.currentMonth}/{record.chit.durationMonths})</span>
                        ) : record.chit.status === 'completed' ? (
                          <span className="badge badge-approved">Completed</span>
                        ) : (
                          <span className="badge badge-pending">Upcoming ({approvedCount}/{record.chit.totalMembers} Enrolled)</span>
                        )}
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                          {/* Core specifications */}
                          <div>
                            <h4 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar size={16} />
                              <span>Pool Specifications</span>
                            </h4>
                            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <p>Chit Status: <strong style={{ textTransform: 'capitalize' }}>{record.chit.status}</strong></p>
                              {record.chit.startDate && <p>Start Date: <strong>{new Date(record.chit.startDate).toLocaleDateString()}</strong></p>}
                              {record.chit.endDate && <p>End Date: <strong>{new Date(record.chit.endDate).toLocaleDateString()}</strong></p>}
                              <p>Configured Members Required: <strong>{record.chit.totalMembers}</strong></p>
                              <p>Approved Enrolments Count: <strong>{approvedCount}</strong></p>
                              <p>Managed By: <strong style={{ color: 'var(--color-primary-green)' }}>
                                {record.chit.creator ? `${record.chit.creator.name} (${record.chit.creator.role})` : 'Superadmin'}
                              </strong></p>
                            </div>
                          </div>

                          {/* Member List */}
                          <div>
                            <h4 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Users size={16} />
                              <span>Approved Enrolled Members ({approvedCount})</span>
                            </h4>
                            {approvedCount === 0 ? (
                              <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', fontStyle: 'italic' }}>No approved members yet.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                                {record.chit.members.filter(m => m.status === 'approved').map(member => (
                                  <div key={member.user?.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                                    <span style={{ fontWeight: 600 }}>{member.user?.name || 'Deleted Account'}</span>
                                    <span style={{ color: 'var(--color-secondary)' }}>{member.user?.phone}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {record.chit.status === 'active' && (
                          <div style={{ gridColumn: '1 / -1', marginBottom: '1.5rem' }}>
                            <h4 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <CheckCircle size={16} />
                              <span>Month {record.chit.currentMonth} Payment Status</span>
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                              {record.chit.members.filter(m => m.status === 'approved').map(member => {
                                const hasPaidCurrentMonth = record.payments.some(p => 
                                  p.userId === member.userId && 
                                  p.monthNumber === record.chit.currentMonth && 
                                  p.status === 'approved'
                                );
                                const freeze = record.chit.freezes?.find(f => f.monthNumber === record.chit.currentMonth);
                                const isFrozenByMember = freeze?.userId === member.userId;
                                
                                return (
                                  <div key={member.user?.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                                    <div>
                                      <span style={{ fontWeight: 600, display: 'block' }}>{member.user?.name}</span>
                                      <span style={{ color: 'var(--color-secondary)', fontSize: '0.75rem' }}>{member.user?.phone}</span>
                                    </div>
                                    {isFrozenByMember ? (
                                      <span className="badge" style={{ fontSize: '0.7rem', backgroundColor: '#dbeafe', color: '#2563eb', border: '1px solid #2563eb22' }}>Taken Payment</span>
                                    ) : hasPaidCurrentMonth ? (
                                      <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>Paid</span>
                                    ) : (
                                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <button
                                          onClick={() => handleMarkAsPaid(record.chit.id, member.userId, record.chit.monthlyContribution, record.chit.currentMonth)}
                                          className="btn-primary"
                                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)' }}
                                        >
                                          Mark as Paid
                                        </button>
                                        <button
                                          onClick={() => setUploadModal({
                                            isOpen: true,
                                            chitId: record.chit.id,
                                            userId: member.userId,
                                            amount: record.chit.monthlyContribution,
                                            monthNumber: record.chit.currentMonth
                                          })}
                                          className="btn-secondary"
                                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary)' }}
                                        >
                                          Upload Proof
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Payment log database for this chit */}
                        <div>
                          <h4 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CreditCard size={16} />
                            <span>Chit Contributions Ledger</span>
                          </h4>
                          {record.payments.length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', fontStyle: 'italic' }}>No contributions verified for this chit pool.</p>
                          ) : (
                            <div>
                              {(() => {
                                const uniqueMonths = [...new Set(record.payments.map(p => p.monthNumber))].sort((a, b) => a - b);
                                const activeMonth = selectedLedgerMonths[record.chit.id] || uniqueMonths[0];
                                const filteredPayments = record.payments.filter(p => p.monthNumber === activeMonth);

                                return (
                                  <>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                                      {uniqueMonths.map(month => (
                                        <button
                                          key={month}
                                          onClick={() => setSelectedLedgerMonths(prev => ({ ...prev, [record.chit.id]: month }))}
                                          style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '2rem',
                                            border: activeMonth === month ? 'none' : '1px solid #e5e7eb',
                                            backgroundColor: activeMonth === month ? '#2563eb' : '#f9fafb',
                                            color: activeMonth === month ? '#fff' : '#4b5563',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.2s'
                                          }}
                                        >
                                          Month {month}
                                        </button>
                                      ))}
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                        <thead>
                                          <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--color-secondary)' }}>
                                            <th style={{ padding: '0.5rem' }}>Member Name</th>
                                            <th style={{ padding: '0.5rem' }}>Amount</th>
                                            <th style={{ padding: '0.5rem' }}>Transaction ID</th>
                                            <th style={{ padding: '0.5rem' }}>Receipt Photo</th>
                                            <th style={{ padding: '0.5rem' }}>Verification</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {filteredPayments.map(p => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                              <td style={{ padding: '0.5rem', fontWeight: 600 }}>{p.user?.name || 'Deleted Account'}</td>
                                              <td style={{ padding: '0.5rem', fontWeight: 600 }}>₹{p.amount.toLocaleString()}</td>
                                              <td style={{ padding: '0.5rem' }}><code>{p.transactionId}</code></td>
                                              <td style={{ padding: '0.5rem' }}>
                                                <button 
                                                  onClick={() => setLightboxUrl(getFullImgUrl(p.proofImgUrl))}
                                                  className="btn-secondary" 
                                                  style={{ padding: '2px 6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}
                                                >
                                                  <Eye size={10} />
                                                  <span>View</span>
                                                </button>
                                              </td>
                                              <td style={{ padding: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                  <span className={`badge ${p.status === 'approved' ? 'badge-approved' : p.status === 'pending' ? 'badge-pending' : 'badge-rejected'}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                                    {p.status === 'approved' ? 'Paid' : p.status}
                                                  </span>
                                                  
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Frozen Months database for this chit */}
                        <div style={{ marginTop: '2rem' }}>
                          <h4 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Lock size={16} />
                            <span>Taken Payments (Frozen Months)</span>
                          </h4>
                          {!record.chit.freezes || record.chit.freezes.length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', fontStyle: 'italic' }}>No months have been taken/frozen yet.</p>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                              {record.chit.freezes.map(freeze => (
                                <div key={freeze.id} style={{ padding: '0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563eb' }}>Month {freeze.monthNumber}</span>
                                  <span style={{ fontSize: '0.8rem', color: '#0a1e3b' }}>Taken by: <strong>{freeze.user?.name || 'Unknown User'}</strong></span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollAnimationWrapper>
              );
            })
          )}
        </div>
      )}

      {/* Image Preview Lightbox */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 150,
            padding: '1rem',
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={lightboxUrl} 
            alt="Ledger Document Preview" 
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)' }}
          />
        </div>
      )}

      {/* Upload Proof Modal */}
      {uploadModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card-premium" style={{ width: '100%', maxWidth: '400px', backgroundColor: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Upload Proof & Mark Paid</h3>
            <form onSubmit={handleUploadSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Transaction ID / Notes</label>
                <input
                  type="text"
                  placeholder="Enter notes or Txn ID"
                  className="input-field"
                  value={uploadData.text}
                  onChange={e => setUploadData({ ...uploadData, text: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Payment Proof Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setUploadData({ ...uploadData, file: e.target.files[0] })}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setUploadModal({ isOpen: false, chitId: null, userId: null, amount: null, monthNumber: null }); setUploadData({ file: null, text: '' }); }}
                  className="btn-secondary"
                  disabled={uploadLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={uploadLoading || !uploadData.file}>
                  {uploadLoading ? 'Uploading...' : 'Submit & Mark Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemRecords;
