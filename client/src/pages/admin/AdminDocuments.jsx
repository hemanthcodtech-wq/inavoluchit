import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import { 
  FolderCheck, 
  Upload, 
  Trash2, 
  Eye, 
  Download, 
  Plus, 
  FileText, 
  FileImage,
  File,
  X, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown, 
  RefreshCw, 
  ShieldCheck, 
  Cloud,
  Search,
  Filter,
  LayoutGrid,
  List,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

const AdminDocuments = () => {
  const { token, API_URL, SERVER_URL } = useAuth();
  const [searchParams] = useSearchParams();
  const urlCustomerParam = searchParams.get('customer') || searchParams.get('customerId') || searchParams.get('userId');

  // Customer List State
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');

  // Unified Documents State
  const [allDocuments, setAllDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL'); // 'ALL' | 'KYC Documents' | 'Surety Documents' | 'Other Documents'
  const [selectedFileTypeFilter, setSelectedFileTypeFilter] = useState('ALL'); // 'ALL' | 'PDF' | 'IMAGE'
  const [viewMode, setViewMode] = useState('columns'); // 'columns' | 'grid'

  // Pagination State for Unified View
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Pagination State for Column View (per category)
  const [categoryPages, setCategoryPages] = useState({
    'KYC Documents': 1,
    'Surety Documents': 1,
    'Other Documents': 1
  });
  const columnPageSize = 4;

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadCustomerId, setUploadCustomerId] = useState('');
  const [uploadCategory, setUploadCategory] = useState('KYC Documents');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadRemarks, setUploadRemarks] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Preview / Lightbox Modal State
  const [previewDoc, setPreviewDoc] = useState(null);

  const showToast = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback({ text: '', type: '' }), 4500);
  };

  // Helper: Get Full File URL
  const getFullFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = SERVER_URL || (typeof window !== 'undefined' && window.location.hostname ? `http://${window.location.hostname}:5000` : 'http://localhost:5000');
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  // 1. Fetch Customers List
  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      let custList = [];
      try {
        const res = await fetch(`${API_URL}/documents/customers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            custList = data.data;
          }
        }
      } catch (err) {
        console.warn('Error fetching /documents/customers:', err);
      }

      if (custList.length === 0) {
        try {
          const res = await fetch(`${API_URL}/admin/users-records`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              custList = data.data
                .map(item => item.user || item)
                .filter(u => u && u.role === 'user');
            }
          }
        } catch (err) {
          console.warn('Error fetching /admin/users-records:', err);
        }
      }

      if (custList.length > 0) {
        const normalized = custList.map(c => {
          const idStr = String(c._id || c.id || '');
          return {
            ...c,
            id: idStr,
            _id: idStr
          };
        });
        setCustomers(normalized);
        const matchCustomer = urlCustomerParam 
          ? normalized.find(c => String(c.id) === String(urlCustomerParam) || String(c._id) === String(urlCustomerParam) || String(c.memberId).toLowerCase() === String(urlCustomerParam).toLowerCase())
          : null;
        const initialCust = matchCustomer || normalized[0];

        if (!selectedCustomerId && initialCust) {
          const custId = String(initialCust.id || initialCust._id);
          setSelectedCustomerId(custId);
          setSelectedCustomer(initialCust);
          fetchCustomerDocuments(custId, initialCust);
        }
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.error('Error in fetchCustomers:', err);
      showToast('Could not load members list.', 'error');
    } finally {
      setLoadingCustomers(false);
    }
  };

  // 2. Fetch All Documents for Selected Customer
  const fetchCustomerDocuments = async (userId, userObj = null) => {
    if (!userId) return;
    setLoadingDocs(true);
    try {
      const res = await fetch(`${API_URL}/documents/customer/${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const rawDocs = data.allDocuments || data.documents || [];
          const docs = rawDocs.map((d, idx) => {
            const docId = String(d._id || d.id || `doc-${Date.now()}-${idx}`);
            return {
              ...d,
              id: docId,
              _id: docId
            };
          });
          setAllDocuments(docs);
        }
      }
    } catch (err) {
      console.error('Error fetching customer documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCustomers();
    }
  }, [token]);

  // Handle customer selection
  const handleSelectCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    if (customerId) {
      const found = customers.find(c => String(c.id || c._id) === String(customerId));
      setSelectedCustomer(found || null);
      fetchCustomerDocuments(customerId, found);
    } else {
      setSelectedCustomer(null);
      setAllDocuments([]);
    }
  };

  // Filtered Customers by search text
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(c => 
      (c.name || '').toLowerCase().includes(q) ||
      (c.memberId || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // Categorize helper
  const categorizeDoc = (doc) => {
    const cat = (doc.category || '').toLowerCase();
    const title = (doc.title || '').toLowerCase();

    const isSurety = cat.includes('surety') || cat.includes('surity') || cat.includes('guarantor') ||
                     title.includes('surety') || title.includes('surity') || title.includes('guarantor') ||
                     title.includes('promissory') || title.includes('security') || title.includes('deed') ||
                     title.includes('cheque') || title.includes('bond');

    const isKyc = (cat.includes('kyc') || cat.includes('identity') || cat.includes('address') || 
                   title.includes('kyc') || title.includes('aadhar') || title.includes('aadhaar') || title.includes('pan')) && !isSurety;

    if (isSurety) return 'Surety Documents';
    if (isKyc) return 'KYC Documents';
    return 'Other Documents';
  };

  // Category summary counts
  const categoryCounts = useMemo(() => {
    let kyc = 0;
    let surety = 0;
    let other = 0;
    allDocuments.forEach(d => {
      const cat = categorizeDoc(d);
      if (cat === 'KYC Documents') kyc++;
      else if (cat === 'Surety Documents') surety++;
      else other++;
    });
    return {
      all: allDocuments.length,
      kyc,
      surety,
      other
    };
  }, [allDocuments]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter(doc => {
      const docCat = categorizeDoc(doc);

      // 1. Category Filter
      if (selectedCategoryFilter !== 'ALL' && docCat !== selectedCategoryFilter) {
        return false;
      }

      // 2. File Type Filter
      const isPdf = doc.fileType === 'PDF' || (doc.fileUrl || '').toLowerCase().endsWith('.pdf');
      if (selectedFileTypeFilter === 'PDF' && !isPdf) return false;
      if (selectedFileTypeFilter === 'IMAGE' && isPdf) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (doc.title || '').toLowerCase().includes(q);
        const remarksMatch = (doc.remarks || '').toLowerCase().includes(q);
        const fileNameMatch = (doc.fileName || '').toLowerCase().includes(q);
        const catMatch = (doc.category || '').toLowerCase().includes(q);
        if (!titleMatch && !remarksMatch && !fileNameMatch && !catMatch) return false;
      }

      return true;
    });
  }, [allDocuments, selectedCategoryFilter, selectedFileTypeFilter, searchQuery]);

  // Reset page when filters or customer changes
  useEffect(() => {
    setCurrentPage(1);
    setCategoryPages({
      'KYC Documents': 1,
      'Surety Documents': 1,
      'Other Documents': 1
    });
  }, [searchQuery, selectedCategoryFilter, selectedFileTypeFilter, selectedCustomerId]);

  // Pagination calculation for unified grid view
  const totalItems = filteredDocuments.length;
  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedDocuments = useMemo(() => {
    if (pageSize === 'ALL') return filteredDocuments;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, safeCurrentPage, pageSize]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategoryFilter('ALL');
    setSelectedFileTypeFilter('ALL');
    setCurrentPage(1);
  };

  const isFilterActive = searchQuery.trim() !== '' || selectedCategoryFilter !== 'ALL' || selectedFileTypeFilter !== 'ALL';

  // Open Direct Upload Modal
  const openUploadModal = (targetCategory = 'KYC Documents') => {
    const targetId = selectedCustomerId || (customers.length > 0 ? String(customers[0].id || customers[0]._id) : '');
    setUploadCustomerId(targetId);
    setUploadCategory(targetCategory);
    setUploadTitle('');
    setUploadRemarks('');
    setUploadFile(null);
    setUploadModalOpen(true);
  };

  // Submit Direct Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadCustomerId) {
      showToast('Please select a customer / member.', 'error');
      return;
    }
    if (!uploadTitle.trim()) {
      showToast('Please enter document title.', 'error');
      return;
    }
    if (!uploadFile) {
      showToast('Please select a file to upload.', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('userId', uploadCustomerId);
      formData.append('title', uploadTitle.trim());
      formData.append('category', uploadCategory);
      formData.append('remarks', uploadRemarks.trim());
      formData.append('document', uploadFile);
      formData.append('file', uploadFile);

      const res = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server response (HTTP ${res.status}): ${text.slice(0, 100)}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      showToast('Document uploaded successfully to Cloudinary!', 'success');
      setUploadModalOpen(false);

      if (uploadCustomerId === selectedCustomerId) {
        await fetchCustomerDocuments(selectedCustomerId, selectedCustomer);
      } else {
        handleSelectCustomer(uploadCustomerId);
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast(err.message || 'Error uploading document', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Delete Document
  const handleDeleteDoc = async (doc) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${doc.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/documents/${doc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server response (HTTP ${res.status}): ${text.slice(0, 100)}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete document');
      }

      showToast('Document deleted successfully', 'success');
      await fetchCustomerDocuments(selectedCustomerId, selectedCustomer);
    } catch (err) {
      console.error('Delete error:', err);
      showToast(err.message || 'Error deleting document', 'error');
    }
  };

  // Download Helper
  const handleDownload = (doc) => {
    const url = getFullFileUrl(doc.fileUrl);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.fileName || doc.title || 'document';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format Display Date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const categories = [
    { 
      title: 'KYC Documents', 
      type: 'KYC Documents',
      badge: 'Identity & Address',
      color: '#2563eb',
      bgColor: '#eff6ff',
      icon: FolderCheck,
      desc: 'Aadhaar, PAN & address proofs'
    },
    { 
      title: 'Surety Documents', 
      type: 'Surety Documents',
      badge: 'Guarantor & Security',
      color: '#7c3aed',
      bgColor: '#f5f3ff',
      icon: ShieldCheck,
      desc: 'Guarantor KYC, Promissory Notes, Income Slips & Bonds'
    },
    { 
      title: 'Other Documents', 
      type: 'Other Documents',
      badge: 'Agreements & Files',
      color: '#059669',
      bgColor: '#ecfdf5',
      icon: FileText,
      desc: 'Passbooks, signed agreements & general records'
    }
  ];

  // Render Single Document Card
  const renderDocCard = (doc, showCategoryPill = false) => {
    const docId = String(doc.id || doc._id || `doc-${Math.random()}`);
    const isPdf = doc.fileType === 'PDF' || (doc.fileUrl || '').toLowerCase().endsWith('.pdf');
    const isCloudinary = (doc.fileUrl && doc.fileUrl.includes('cloudinary.com')) || doc.storageType === 'Cloudinary';
    const docCat = categorizeDoc(doc);

    return (
      <div key={docId} className="admin-doc-card-item">
        {/* Upper Section: File Icon + Title + Meta */}
        <div className="admin-doc-item-upper">
          <div 
            className="admin-doc-type-icon"
            style={{
              backgroundColor: isPdf ? '#fef2f2' : '#eff6ff',
              color: isPdf ? '#dc2626' : '#2563eb'
            }}
          >
            {isPdf ? <FileText size={20} /> : <FileImage size={20} />}
          </div>

          <div className="admin-doc-item-content">
            {showCategoryPill && (
              <span className={`admin-doc-cat-tag cat-${docCat.replace(/\s+/g, '-').toLowerCase()}`}>
                {docCat}
              </span>
            )}
            <h4 className="admin-doc-card-title">
              {doc.title}
            </h4>

            <div className="admin-doc-card-meta">
              <span>{formatDate(doc.createdAt)}</span>
              <span className="admin-doc-dot">•</span>
              <span className="admin-doc-type-pill">
                {doc.fileType || (isPdf ? 'PDF' : 'JPEG')}
              </span>
              {doc.fileSize && (
                <>
                  <span className="admin-doc-dot">•</span>
                  <span>{doc.fileSize}</span>
                </>
              )}
              <span className="admin-doc-dot">•</span>
              <span 
                className="admin-doc-storage-badge"
                style={{
                  backgroundColor: isCloudinary ? '#ecfdf5' : '#f1f5f9',
                  color: isCloudinary ? '#047857' : '#475569',
                  border: `1px solid ${isCloudinary ? '#a7f3d0' : '#e2e8f0'}`
                }}
              >
                {isCloudinary ? (
                  <>
                    <Cloud size={11} />
                    <span>Cloudinary</span>
                  </>
                ) : (
                  <span>{doc.storageType || 'Cloud'}</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Optional Remarks Note */}
        {doc.remarks && (
          <div className="admin-doc-remarks-note">
            💬 {doc.remarks}
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="admin-doc-card-actions">
          <button
            type="button"
            onClick={() => setPreviewDoc(doc)}
            title="Preview Document"
            className="admin-doc-btn btn-preview"
          >
            <Eye size={13} strokeWidth={2.3} />
            <span>Preview</span>
          </button>

          <button
            type="button"
            onClick={() => handleDownload(doc)}
            title="Download Document"
            className="admin-doc-btn btn-download"
          >
            <Download size={13} strokeWidth={2.3} />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={() => handleDeleteDoc(doc)}
            title="Delete Document"
            className="admin-doc-btn btn-delete"
          >
            <Trash2 size={13} strokeWidth={2.3} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-page-container admin-docs-page">

      {/* Toast Feedback */}
      {feedback.text && (
        <div style={{
          position: 'fixed',
          top: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '460px',
          zIndex: 100060,
          padding: '0.85rem 1.25rem',
          borderRadius: '0.75rem',
          backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#eff6ff',
          color: feedback.type === 'error' ? '#991b1b' : '#2563eb',
          border: `1.5px solid ${feedback.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
          boxShadow: '0 12px 30px -5px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.88rem',
          fontWeight: 700,
          boxSizing: 'border-box'
        }}>
          {feedback.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span style={{ flex: 1 }}>{feedback.text}</span>
          <button 
            type="button" 
            onClick={() => setFeedback({ text: '', type: '' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0.2rem' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <ScrollAnimationWrapper>
        <div className="admin-docs-header">
          <div>
            <h1 className="admin-docs-heading">
              Documents
            </h1>
            <p className="admin-docs-subheading">
              Private customer files — KYC, identity, and surety records. Stored securely in Cloudinary under each Customer ID.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openUploadModal()}
            className="admin-docs-header-btn"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Upload Document</span>
          </button>
        </div>
      </ScrollAnimationWrapper>

      {/* Customer Selector Panel with Member Search Filter */}
      <ScrollAnimationWrapper>
        <div className="admin-doc-selector-card">
          <div className="admin-doc-selector-grid">
            
            {/* Box 1: Customer Select & Search */}
            <div className="admin-doc-select-col">
              <div className="admin-doc-field-label">
                <span>Select Member</span>
                <span className="admin-doc-count-pill">
                  {filteredCustomers.length} of {customers.length} Members
                </span>
              </div>

              {/* Quick Customer Search Input */}
              <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Filter members by name, ID, phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="admin-customer-search-input"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Customer Dropdown */}
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  disabled={loadingCustomers}
                  className="admin-doc-select-input"
                >
                  <option value="">
                    {loadingCustomers ? '-- Loading Members... --' : '-- Choose Customer --'}
                  </option>
                  {filteredCustomers.map((c) => {
                    const custId = String(c.id || c._id);
                    return (
                      <option key={custId} value={custId}>
                        {c.name ? `${c.name} (${c.memberId || 'ID Pending'})` : (c.memberId || 'Member')}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown 
                  size={18} 
                  color="#64748b" 
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} 
                />
              </div>
            </div>

            {/* Box 2: Customer ID & Profile Display */}
            <div className="admin-doc-select-col">
              <label className="admin-doc-field-label">
                <span>Customer ID & Profile</span>
                {selectedCustomer && (
                  <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                    ● Active Member
                  </span>
                )}
              </label>
              <div className="admin-doc-id-badge">
                {selectedCustomer ? (
                  <div className="admin-doc-id-content">
                    <div className="admin-doc-id-left">
                      <div className="admin-doc-avatar">
                        {selectedCustomer.name ? selectedCustomer.name[0].toUpperCase() : 'M'}
                      </div>
                      <div className="admin-doc-id-text">
                        <strong className="admin-doc-member-id">
                          {selectedCustomer.memberId || 'INA Member'}
                        </strong>
                        <span className="admin-doc-member-name">
                          {selectedCustomer.name} {selectedCustomer.phone ? `• ${selectedCustomer.phone}` : ''}
                        </span>
                      </div>
                    </div>
                    <span className="admin-doc-total-badge">
                      {allDocuments.length} {allDocuments.length === 1 ? 'doc' : 'docs'}
                    </span>
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '0.9rem' }}>
                    Select a customer to view ID & files
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Comprehensive Filter & Search Toolbar */}
      <ScrollAnimationWrapper>
        <div className="admin-doc-filter-toolbar">
          
          {/* Top Row: Search Input & Format Filter & View Mode */}
          <div className="admin-toolbar-row-top">
            
            {/* Search Input */}
            <div className="admin-search-box-wrap">
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                placeholder="Search documents by title, remarks, or file name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-doc-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="admin-search-clear-btn"
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Right Controls: Format Filter & View Switcher */}
            <div className="admin-toolbar-right-controls">
              
              {/* File Type Filter */}
              <div className="admin-filter-select-wrap">
                <Filter size={14} color="#64748b" />
                <select
                  value={selectedFileTypeFilter}
                  onChange={(e) => setSelectedFileTypeFilter(e.target.value)}
                  className="admin-filter-dropdown"
                >
                  <option value="ALL">All Formats</option>
                  <option value="PDF">PDF Only</option>
                  <option value="IMAGE">Images Only</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="admin-view-toggle-wrap">
                <button
                  type="button"
                  onClick={() => setViewMode('columns')}
                  className={`admin-view-toggle-btn ${viewMode === 'columns' ? 'active' : ''}`}
                  title="3-Column Category View"
                >
                  <LayoutGrid size={15} />
                  <span className="view-toggle-label">Categories</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`admin-view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  title="Unified Grid View"
                >
                  <List size={15} />
                  <span className="view-toggle-label">All Docs</span>
                </button>
              </div>

              {/* Reset Filter Button */}
              {isFilterActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="admin-filter-reset-btn"
                  title="Reset all filters"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Category Quick Filter Pills */}
          <div className="admin-category-pills-row">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('ALL')}
              className={`admin-cat-pill ${selectedCategoryFilter === 'ALL' ? 'active all' : ''}`}
            >
              <span>All Documents</span>
              <span className="admin-cat-pill-count">{categoryCounts.all}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('KYC Documents')}
              className={`admin-cat-pill ${selectedCategoryFilter === 'KYC Documents' ? 'active kyc' : ''}`}
            >
              <span>KYC Documents</span>
              <span className="admin-cat-pill-count">{categoryCounts.kyc}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('Surety Documents')}
              className={`admin-cat-pill ${selectedCategoryFilter === 'Surety Documents' ? 'active surety' : ''}`}
            >
              <span>Surety Documents</span>
              <span className="admin-cat-pill-count">{categoryCounts.surety}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('Other Documents')}
              className={`admin-cat-pill ${selectedCategoryFilter === 'Other Documents' ? 'active other' : ''}`}
            >
              <span>Other Documents</span>
              <span className="admin-cat-pill-count">{categoryCounts.other}</span>
            </button>

            {/* Filter Summary Text */}
            <div className="admin-filter-status-text">
              Showing <strong>{filteredDocuments.length}</strong> of <strong>{allDocuments.length}</strong> files
            </div>
          </div>

        </div>
      </ScrollAnimationWrapper>

      {/* Main Content Area: Column View OR Grid View */}
      <ScrollAnimationWrapper>
        {loadingDocs ? (
          <div className="admin-docs-loading-card">
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem', display: 'block', color: '#2563eb' }} />
            <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#475569', margin: 0 }}>
              Loading member documents...
            </p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="admin-no-results-card">
            <div className="admin-no-results-icon">
              <Search size={28} strokeWidth={1.8} color="#94a3b8" />
            </div>
            <h3 className="admin-no-results-title">No documents found</h3>
            <p className="admin-no-results-desc">
              {isFilterActive 
                ? 'No documents match your active search or filter criteria. Try clearing filters.' 
                : 'No documents have been uploaded for this member yet.'}
            </p>
            {isFilterActive ? (
              <button
                type="button"
                onClick={resetFilters}
                className="admin-no-results-btn"
              >
                <RotateCcw size={14} />
                <span>Reset Filters</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openUploadModal('KYC Documents')}
                className="admin-no-results-btn"
                style={{ backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#2563eb' }}
              >
                <Plus size={14} />
                <span>Upload First Document</span>
              </button>
            )}
          </div>
        ) : viewMode === 'columns' && selectedCategoryFilter === 'ALL' ? (
          
          /* MODE 1: Category Columns View (3-Column Layout) */
          <div className="admin-doc-category-grid">
            {categories.map((cat) => {
              const categoryDocs = filteredDocuments.filter(d => categorizeDoc(d) === cat.type);
              const catTotal = categoryDocs.length;
              const catTotalPages = Math.ceil(catTotal / columnPageSize) || 1;
              const catPage = Math.min(Math.max(1, categoryPages[cat.type] || 1), catTotalPages);
              const catPaginatedDocs = categoryDocs.slice((catPage - 1) * columnPageSize, catPage * columnPageSize);

              return (
                <div key={cat.type} className="admin-category-card">
                  {/* Category Card Header */}
                  <div className="admin-category-header">
                    <div className="admin-category-header-top">
                      <div className="admin-category-title-wrap">
                        <div 
                          className="admin-category-icon-box"
                          style={{ backgroundColor: cat.bgColor, color: cat.color }}
                        >
                          <cat.icon size={20} strokeWidth={2.4} />
                        </div>
                        <div className="admin-category-title-group">
                          <h3 className="admin-category-title">
                            {cat.title}
                          </h3>
                          {catTotal > 0 && (
                            <span 
                              className="admin-category-count-badge"
                              style={{
                                backgroundColor: cat.bgColor,
                                color: cat.color,
                                border: `1px solid ${cat.color}35`
                              }}
                            >
                              {catTotal}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openUploadModal(cat.type)}
                        className="admin-category-upload-btn"
                        style={{
                          backgroundColor: cat.bgColor,
                          color: cat.color,
                          border: `1.5px solid ${cat.color}45`
                        }}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                        <span>Upload</span>
                      </button>
                    </div>

                    <p className="admin-category-desc">
                      {cat.desc}
                    </p>
                  </div>

                  {/* Document Items List or Empty State */}
                  {catTotal === 0 ? (
                    <div className="admin-category-empty-state">
                      <div 
                        className="admin-empty-icon"
                        style={{ backgroundColor: cat.bgColor, color: cat.color }}
                      >
                        <cat.icon size={24} strokeWidth={2} />
                      </div>
                      <p className="admin-empty-title">No documents uploaded yet</p>
                      <p className="admin-empty-desc">
                        {cat.type === 'KYC Documents' && 'Upload Aadhaar, PAN card, or voter ID.'}
                        {cat.type === 'Surety Documents' && 'Upload promissory notes, guarantor ID, or security bonds.'}
                        {cat.type === 'Other Documents' && 'Upload passbooks, agreements, or signed records.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => openUploadModal(cat.type)}
                        className="admin-empty-btn"
                        style={{ color: cat.color, borderColor: `${cat.color}45` }}
                      >
                        <Plus size={13} strokeWidth={2.5} />
                        <span>Upload to {cat.title.replace(' Documents', '')}</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="admin-doc-list">
                        {catPaginatedDocs.map((doc) => renderDocCard(doc, false))}
                      </div>

                      {/* Column Mini Pagination Footer if more than columnPageSize */}
                      {catTotal > columnPageSize && (
                        <div className="admin-col-pagination-bar">
                          <span className="admin-col-page-info">
                            {(catPage - 1) * columnPageSize + 1}–{Math.min(catPage * columnPageSize, catTotal)} of {catTotal}
                          </span>
                          <div className="admin-col-page-btns">
                            <button
                              type="button"
                              disabled={catPage <= 1}
                              onClick={() => setCategoryPages(prev => ({ ...prev, [cat.type]: Math.max(1, catPage - 1) }))}
                              className="admin-col-nav-btn"
                              title="Previous"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="admin-col-page-current">
                              {catPage} / {catTotalPages}
                            </span>
                            <button
                              type="button"
                              disabled={catPage >= catTotalPages}
                              onClick={() => setCategoryPages(prev => ({ ...prev, [cat.type]: Math.min(catTotalPages, catPage + 1) }))}
                              className="admin-col-nav-btn"
                              title="Next"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

        ) : (

          /* MODE 2: Unified Paginated Grid View */
          <div>
            <div className="admin-unified-doc-grid">
              {paginatedDocuments.map((doc) => renderDocCard(doc, true))}
            </div>

            {/* Comprehensive Main Pagination Bar */}
            <div className="admin-pagination-bar">
              <div className="admin-pagination-info">
                Showing <strong>{totalItems === 0 ? 0 : (safeCurrentPage - 1) * (pageSize === 'ALL' ? totalItems : pageSize) + 1}</strong> to <strong>{pageSize === 'ALL' ? totalItems : Math.min(safeCurrentPage * pageSize, totalItems)}</strong> of <strong>{totalItems}</strong> documents
                {isFilterActive && (
                  <span className="admin-pagination-filter-note"> (filtered from {allDocuments.length} total)</span>
                )}
              </div>

              <div className="admin-pagination-controls">
                
                {/* Page Size Selector */}
                <div className="admin-page-size-wrap">
                  <span>Show per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="admin-page-size-select"
                  >
                    <option value={6}>6</option>
                    <option value={9}>9</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value="ALL">All</option>
                  </select>
                </div>

                {/* Page Navigation Buttons */}
                {pageSize !== 'ALL' && totalPages > 1 && (
                  <div className="admin-page-nav-btns">
                    <button
                      type="button"
                      disabled={safeCurrentPage <= 1}
                      onClick={() => setCurrentPage(1)}
                      className="admin-page-btn"
                      title="First Page"
                    >
                      <ChevronsLeft size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={safeCurrentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="admin-page-btn"
                      title="Previous Page"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        return (
                          <React.Fragment key={p}>
                            {prev && p - prev > 1 && (
                              <span className="admin-page-ellipsis">...</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`admin-page-btn ${safeCurrentPage === p ? 'active' : ''}`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}

                    <button
                      type="button"
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="admin-page-btn"
                      title="Next Page"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className="admin-page-btn"
                      title="Last Page"
                    >
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </ScrollAnimationWrapper>

      {/* -------------------- UPLOAD MODAL -------------------- */}
      {uploadModalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card">
            {/* Modal Header */}
            <div className="admin-modal-header">
              <div>
                <h3 className="admin-modal-title">
                  Upload Document
                </h3>
                <p className="admin-modal-subtitle">
                  Upload KYC, surety, or general document for a member to Cloudinary.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="admin-modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUploadSubmit} className="admin-modal-body">

              {/* Target Customer */}
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Target Customer / Member *
                </label>
                <select
                  value={uploadCustomerId}
                  onChange={(e) => setUploadCustomerId(e.target.value)}
                  required
                  className="admin-form-input"
                >
                  <option value="">-- Choose Member --</option>
                  {customers.map((c) => {
                    const custId = String(c.id || c._id);
                    return (
                      <option key={custId} value={custId}>
                        {c.name ? `${c.name} (${c.memberId || 'ID Pending'})` : (c.memberId || 'Member')}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Document Category */}
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Document Category *
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  required
                  className="admin-form-input"
                >
                  <option value="KYC Documents">KYC Documents (Identity / Address Proofs)</option>
                  <option value="Surety Documents">Surety Documents (Guarantor / Promissory Notes / Bonds)</option>
                  <option value="Other Documents">Other Documents (Agreements / General Records)</option>
                </select>
              </div>

              {/* Quick Preset Pills for Surety Documents */}
              {uploadCategory === 'Surety Documents' && (
                <div className="admin-surety-pills-box">
                  <span className="admin-surety-pills-label">
                    Quick Surety Document Titles (Click to autofill):
                  </span>
                  <div className="admin-surety-pills-wrap">
                    {[
                      'Guarantor Aadhaar Card',
                      'Guarantor PAN Card',
                      'Promissory Note',
                      'Surety Agreement Bond',
                      'Guarantor Salary / Income Proof',
                      'Security Cheque / Property Deed'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setUploadTitle(preset)}
                        className={`admin-surety-pill ${uploadTitle === preset ? 'active' : ''}`}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Document Title *
                </label>
                <input
                  type="text"
                  placeholder={uploadCategory === 'Surety Documents' ? "e.g. Promissory Note, Guarantor Aadhaar" : "e.g. Aadhaar Card, Shop Photo, Passbook"}
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                  className="admin-form-input"
                />
              </div>

              {/* Remarks (Optional) */}
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified original on 02-Nov-2026, Signed copy"
                  value={uploadRemarks}
                  onChange={(e) => setUploadRemarks(e.target.value)}
                  className="admin-form-input"
                />
              </div>

              {/* File Input */}
              <div className="admin-form-group">
                <label className="admin-form-label">
                  Select File (Image or PDF) *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  required
                  onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  className="admin-form-file-input"
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
                  Supported formats: JPG, PNG, WEBP, PDF (Max: 10MB)
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="admin-modal-footer">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="admin-modal-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="admin-modal-submit-btn"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Uploading to Cloudinary...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Upload Document</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- PREVIEW LIGHTBOX MODAL -------------------- */}
      {previewDoc && (
        <div
          onClick={() => setPreviewDoc(null)}
          className="admin-lightbox-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="admin-lightbox-card"
          >
            <div className="admin-lightbox-header">
              <div>
                <h4 className="admin-lightbox-title">{previewDoc.title}</h4>
                <p className="admin-lightbox-meta">
                  {formatDate(previewDoc.createdAt)} • {previewDoc.fileType || 'Document'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="admin-lightbox-close"
              >
                <X size={22} />
              </button>
            </div>

            <div className="admin-lightbox-body">
              {previewDoc.fileType === 'PDF' || (previewDoc.fileUrl || '').toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={getFullFileUrl(previewDoc.fileUrl)}
                  title={previewDoc.title}
                  className="admin-lightbox-iframe"
                />
              ) : (
                <img
                  src={getFullFileUrl(previewDoc.fileUrl)}
                  alt={previewDoc.title}
                  className="admin-lightbox-img"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Responsive Stylesheet */}
      <style>{`
        .admin-docs-page {
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          box-sizing: border-box;
          padding: 0.5rem 0.25rem;
        }

        /* Header */
        .admin-docs-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }
        .admin-docs-heading {
          font-size: 1.75rem;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0 0 0.35rem 0;
          line-height: 1.2;
        }
        .admin-docs-subheading {
          font-size: 0.86rem;
          color: #64748b;
          margin: 0;
          max-width: 850px;
          line-height: 1.45;
        }
        .admin-docs-header-btn {
          background-color: #2563eb;
          color: #ffffff;
          padding: 0.65rem 1.25rem;
          border-radius: 0.6rem;
          font-weight: 700;
          font-size: 0.88rem;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .admin-docs-header-btn:hover {
          background-color: #1d4ed8;
          box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35);
          transform: translateY(-1px);
        }

        /* Customer Selector Card */
        .admin-doc-selector-card {
          background-color: #ffffff;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          padding: 1.15rem 1.25rem;
          margin-bottom: 1.25rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        }
        .admin-doc-selector-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.25rem;
          align-items: flex-start;
        }
        .admin-doc-select-col {
          display: flex;
          flex-direction: column;
        }
        .admin-doc-field-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.82rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 0.45rem;
        }
        .admin-doc-count-pill {
          font-size: 0.72rem;
          font-weight: 700;
          color: #2563eb;
          background-color: #eff6ff;
          padding: 0.1rem 0.45rem;
          border-radius: 9999px;
        }
        .admin-customer-search-input {
          width: 100%;
          padding: 0.55rem 1.8rem 0.55rem 2rem;
          border-radius: 0.5rem;
          border: 1.5px solid #e2e8f0;
          font-size: 0.84rem;
          color: #0f172a;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s ease;
          background-color: #f8fafc;
        }
        .admin-customer-search-input:focus {
          border-color: #2563eb;
          background-color: #ffffff;
        }
        .admin-doc-select-input {
          width: 100%;
          padding: 0.65rem 2.5rem 0.65rem 0.95rem;
          border-radius: 0.6rem;
          border: 1.5px solid #cbd5e1;
          font-size: 0.9rem;
          font-weight: 600;
          color: #0f172a;
          background-color: #ffffff;
          outline: none;
          cursor: pointer;
          box-sizing: border-box;
          min-height: 44px;
          transition: border-color 0.15s ease;
        }
        .admin-doc-select-input:focus {
          border-color: #2563eb;
        }
        .admin-doc-id-badge {
          width: 100%;
          padding: 0.75rem 0.95rem;
          border-radius: 0.6rem;
          background-color: #f8fafc;
          border: 1.5px solid #e2e8f0;
          min-height: 80px;
          display: flex;
          align-items: center;
          box-sizing: border-box;
        }
        .admin-doc-id-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 0.75rem;
        }
        .admin-doc-id-left {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          min-width: 0;
        }
        .admin-doc-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.92rem;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
        }
        .admin-doc-id-text {
          min-width: 0;
        }
        .admin-doc-member-id {
          display: block;
          font-size: 0.96rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
        }
        .admin-doc-member-name {
          display: block;
          font-size: 0.76rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admin-doc-total-badge {
          background-color: #eff6ff;
          color: #2563eb;
          font-size: 0.76rem;
          font-weight: 800;
          padding: 0.22rem 0.7rem;
          border-radius: 9999px;
          border: 1px solid #bfdbfe;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* ---------------- Filter Toolbar ---------------- */
        .admin-doc-filter-toolbar {
          background-color: #ffffff;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .admin-toolbar-row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .admin-search-box-wrap {
          position: relative;
          flex: 1 1 320px;
          min-width: 240px;
        }
        .admin-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }
        .admin-doc-search-input {
          width: 100%;
          padding: 0.65rem 2rem 0.65rem 2.25rem;
          border-radius: 0.55rem;
          border: 1.5px solid #cbd5e1;
          font-size: 0.88rem;
          color: #0f172a;
          outline: none;
          box-sizing: border-box;
          transition: all 0.15s ease;
        }
        .admin-doc-search-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .admin-search-clear-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.2rem;
          display: flex;
          align-items: center;
        }
        .admin-search-clear-btn:hover {
          color: #0f172a;
        }
        .admin-toolbar-right-controls {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }
        .admin-filter-select-wrap {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background-color: #f8fafc;
          border: 1.5px solid #cbd5e1;
          border-radius: 0.55rem;
          padding: 0.35rem 0.65rem;
        }
        .admin-filter-dropdown {
          background: none;
          border: none;
          font-size: 0.82rem;
          font-weight: 700;
          color: #334155;
          outline: none;
          cursor: pointer;
        }
        .admin-view-toggle-wrap {
          display: inline-flex;
          align-items: center;
          background-color: #f1f5f9;
          border-radius: 0.55rem;
          padding: 0.2rem;
          border: 1px solid #e2e8f0;
        }
        .admin-view-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.38rem 0.65rem;
          border-radius: 0.45rem;
          border: none;
          background: none;
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .admin-view-toggle-btn.active {
          background-color: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        }
        .admin-filter-reset-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.42rem 0.75rem;
          border-radius: 0.55rem;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .admin-filter-reset-btn:hover {
          background-color: #f1f5f9;
          color: #0f172a;
        }

        /* Category Filter Pills */
        .admin-category-pills-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          padding-top: 0.55rem;
          border-top: 1px solid #f1f5f9;
        }
        .admin-cat-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          border: 1.5px solid #e2e8f0;
          background-color: #f8fafc;
          font-size: 0.8rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .admin-cat-pill:hover {
          background-color: #f1f5f9;
          border-color: #cbd5e1;
        }
        .admin-cat-pill-count {
          font-size: 0.7rem;
          font-weight: 800;
          padding: 0.08rem 0.4rem;
          border-radius: 9999px;
          background-color: #ffffff;
          color: #64748b;
          border: 1px solid #cbd5e1;
        }
        .admin-cat-pill.active.all {
          background-color: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
        .admin-cat-pill.active.all .admin-cat-pill-count {
          background-color: #334155;
          color: #ffffff;
          border-color: #475569;
        }
        .admin-cat-pill.active.kyc {
          background-color: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }
        .admin-cat-pill.active.kyc .admin-cat-pill-count {
          background-color: #ffffff;
          color: #2563eb;
          border-color: #ffffff;
        }
        .admin-cat-pill.active.surety {
          background-color: #7c3aed;
          color: #ffffff;
          border-color: #7c3aed;
        }
        .admin-cat-pill.active.surety .admin-cat-pill-count {
          background-color: #ffffff;
          color: #7c3aed;
          border-color: #ffffff;
        }
        .admin-cat-pill.active.other {
          background-color: #059669;
          color: #ffffff;
          border-color: #059669;
        }
        .admin-cat-pill.active.other .admin-cat-pill-count {
          background-color: #ffffff;
          color: #059669;
          border-color: #ffffff;
        }
        .admin-filter-status-text {
          margin-left: auto;
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 500;
        }

        /* No Results Empty State */
        .admin-no-results-card {
          padding: 3.5rem 1.5rem;
          text-align: center;
          background-color: #ffffff;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }
        .admin-no-results-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background-color: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem auto;
        }
        .admin-no-results-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.35rem 0;
        }
        .admin-no-results-desc {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0 0 1.25rem 0;
          max-width: 420px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.45;
        }
        .admin-no-results-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1.15rem;
          border-radius: 0.55rem;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          border: 1.5px solid #cbd5e1;
          background-color: #ffffff;
          color: #334155;
          transition: all 0.15s ease;
        }
        .admin-no-results-btn:hover {
          background-color: #f1f5f9;
        }

        /* Category Columns Grid */
        .admin-doc-category-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.25rem;
          width: 100%;
          box-sizing: border-box;
          align-items: stretch;
        }
        .admin-category-card {
          background-color: #ffffff;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          padding: 1.15rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          min-height: 260px;
          box-sizing: border-box;
        }

        /* Category Header */
        .admin-category-header {
          margin-bottom: 0.95rem;
          padding-bottom: 0.85rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .admin-category-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }
        .admin-category-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          min-width: 0;
        }
        .admin-category-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 0.55rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .admin-category-title-group {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          min-width: 0;
        }
        .admin-category-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admin-category-count-badge {
          font-size: 0.72rem;
          font-weight: 800;
          padding: 0.1rem 0.45rem;
          border-radius: 9999px;
          line-height: 1.4;
          flex-shrink: 0;
        }
        .admin-category-upload-btn {
          border-radius: 0.5rem;
          padding: 0.38rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .admin-category-upload-btn:hover {
          filter: brightness(0.95);
          transform: translateY(-1px);
        }
        .admin-category-desc {
          font-size: 0.76rem;
          color: #64748b;
          margin: 0.45rem 0 0 0;
          line-height: 1.4;
        }

        /* Empty State */
        .admin-category-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2.25rem 1rem;
          border-radius: 0.75rem;
          border: 1.5px dashed #e2e8f0;
          background-color: #fafbfc;
          margin: auto 0;
          box-sizing: border-box;
        }
        .admin-empty-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.65rem;
        }
        .admin-empty-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #334155;
          margin: 0 0 0.25rem 0;
        }
        .admin-empty-desc {
          font-size: 0.75rem;
          color: #64748b;
          margin: 0 0 0.85rem 0;
          max-width: 250px;
          line-height: 1.4;
        }
        .admin-empty-btn {
          background-color: #ffffff;
          border: 1px solid;
          border-radius: 0.5rem;
          padding: 0.35rem 0.75rem;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          transition: all 0.15s ease;
        }
        .admin-empty-btn:hover {
          background-color: #f8fafc;
        }

        /* Document Items List */
        .admin-doc-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          flex: 1;
        }

        /* Unified Grid Layout */
        .admin-unified-doc-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.25rem;
          width: 100%;
          box-sizing: border-box;
          margin-bottom: 1.25rem;
        }

        /* Document Card Item */
        .admin-doc-card-item {
          display: flex;
          flex-direction: column;
          padding: 0.9rem 1rem;
          border-radius: 0.75rem;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          gap: 0.65rem;
          box-sizing: border-box;
          transition: all 0.15s ease;
          width: 100%;
        }
        .admin-doc-card-item:hover {
          background-color: #ffffff;
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .admin-doc-item-upper {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          width: 100%;
        }
        .admin-doc-type-icon {
          width: 36px;
          height: 36px;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }
        .admin-doc-item-content {
          flex: 1 1 0%;
          min-width: 0;
        }
        .admin-doc-cat-tag {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.08rem 0.45rem;
          border-radius: 4px;
          margin-bottom: 0.25rem;
        }
        .admin-doc-cat-tag.cat-kyc-documents {
          background-color: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
        }
        .admin-doc-cat-tag.cat-surety-documents {
          background-color: #f5f3ff;
          color: #7c3aed;
          border: 1px solid #ddd6fe;
        }
        .admin-doc-cat-tag.cat-other-documents {
          background-color: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }
        .admin-doc-card-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.3rem 0;
          line-height: 1.35;
          word-break: normal;
          overflow-wrap: break-word;
          white-space: normal;
        }
        .admin-doc-card-meta {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.74rem;
          color: #64748b;
          flex-wrap: wrap;
          line-height: 1.4;
        }
        .admin-doc-dot {
          color: #cbd5e1;
        }
        .admin-doc-type-pill {
          font-weight: 700;
          color: #334155;
          background-color: #e2e8f0;
          padding: 0.08rem 0.35rem;
          border-radius: 4px;
          font-size: 0.68rem;
        }
        .admin-doc-storage-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.08rem 0.4rem;
          border-radius: 4px;
          font-size: 0.68rem;
          font-weight: 700;
        }
        .admin-doc-remarks-note {
          font-size: 0.76rem;
          color: #475569;
          background-color: #eff6ff;
          border-left: 2.5px solid #2563eb;
          padding: 0.35rem 0.65rem;
          border-radius: 0 4px 4px 0;
          line-height: 1.35;
          word-break: break-word;
        }

        /* Action Buttons: 3 equal slots spanning 100% width */
        .admin-doc-card-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.45rem;
          width: 100%;
          padding-top: 0.55rem;
          border-top: 1px solid #f1f5f9;
        }
        .admin-doc-btn {
          padding: 0.42rem 0.4rem;
          border-radius: 0.45rem;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          transition: all 0.15s ease;
          white-space: nowrap;
          box-sizing: border-box;
        }
        .admin-doc-btn.btn-preview,
        .admin-doc-btn.btn-download {
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #334155;
        }
        .admin-doc-btn.btn-preview:hover,
        .admin-doc-btn.btn-download:hover {
          background-color: #f1f5f9;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .admin-doc-btn.btn-delete {
          border: 1px solid #fecaca;
          background-color: #ffffff;
          color: #dc2626;
        }
        .admin-doc-btn.btn-delete:hover {
          background-color: #fee2e2;
          border-color: #f87171;
        }

        /* Column Mini Pagination */
        .admin-col-pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.75rem;
          margin-top: 0.75rem;
          border-top: 1px solid #f1f5f9;
          font-size: 0.75rem;
          color: #64748b;
        }
        .admin-col-page-btns {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .admin-col-nav-btn {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .admin-col-nav-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .admin-col-page-current {
          font-size: 0.74rem;
          font-weight: 700;
          color: #0f172a;
          padding: 0 0.2rem;
        }

        /* ---------------- Main Pagination Bar ---------------- */
        .admin-pagination-bar {
          background-color: #ffffff;
          border-radius: 0.85rem;
          border: 1px solid #e2e8f0;
          padding: 0.85rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }
        .admin-pagination-info {
          font-size: 0.82rem;
          color: #475569;
        }
        .admin-pagination-filter-note {
          font-size: 0.76rem;
          color: #64748b;
        }
        .admin-pagination-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .admin-page-size-wrap {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
        }
        .admin-page-size-select {
          padding: 0.35rem 0.6rem;
          border-radius: 6px;
          border: 1.5px solid #cbd5e1;
          background-color: #ffffff;
          font-size: 0.8rem;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
        }
        .admin-page-nav-btns {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .admin-page-btn {
          min-width: 30px;
          height: 30px;
          padding: 0 0.45rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .admin-page-btn:hover:not(:disabled) {
          background-color: #f1f5f9;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .admin-page-btn.active {
          background-color: #2563eb;
          border-color: #2563eb;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
        }
        .admin-page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .admin-page-ellipsis {
          color: #94a3b8;
          font-size: 0.8rem;
          padding: 0 0.2rem;
        }

        /* Loading Card */
        .admin-docs-loading-card {
          padding: 3.5rem 1rem;
          text-align: center;
          background-color: #ffffff;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
        }

        /* Upload Modal */
        .admin-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 100050;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          box-sizing: border-box;
        }
        .admin-modal-card {
          background-color: #ffffff;
          border-radius: 1.25rem;
          width: 100%;
          max-width: 540px;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }
        .admin-modal-header {
          padding: 1.15rem 1.25rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #f8fafc;
        }
        .admin-modal-title {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
        }
        .admin-modal-subtitle {
          margin: 0.15rem 0 0 0;
          font-size: 0.78rem;
          color: #64748b;
        }
        .admin-modal-close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.4rem;
          border-radius: 0.4rem;
        }
        .admin-modal-close-btn:hover {
          background-color: #f1f5f9;
          color: #0f172a;
        }
        .admin-modal-body {
          padding: 1.25rem;
          overflow-y: auto;
          flex: 1;
        }
        .admin-form-group {
          margin-bottom: 1.1rem;
        }
        .admin-form-label {
          display: block;
          font-size: 0.82rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 0.35rem;
        }
        .admin-form-input {
          width: 100%;
          padding: 0.7rem 0.85rem;
          border-radius: 0.6rem;
          border: 1.5px solid #cbd5e1;
          font-size: 0.9rem;
          color: #0f172a;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s ease;
        }
        .admin-form-input:focus {
          border-color: #2563eb;
        }
        .admin-form-file-input {
          width: 100%;
          padding: 0.65rem 0.75rem;
          border-radius: 0.6rem;
          border: 1.5px dashed #cbd5e1;
          font-size: 0.85rem;
          background-color: #fafafa;
          box-sizing: border-box;
        }
        .admin-surety-pills-box {
          margin-bottom: 1rem;
          padding: 0.65rem 0.85rem;
          background-color: #f5f3ff;
          border-radius: 0.65rem;
          border: 1px solid #ddd6fe;
        }
        .admin-surety-pills-label {
          font-size: 0.74rem;
          font-weight: 800;
          color: #6d28d9;
          display: block;
          margin-bottom: 0.35rem;
        }
        .admin-surety-pills-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .admin-surety-pill {
          padding: 0.22rem 0.6rem;
          font-size: 0.72rem;
          font-weight: 700;
          border-radius: 9999px;
          background-color: #ffffff;
          color: #6d28d9;
          border: 1px solid #c4b5fd;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .admin-surety-pill.active {
          background-color: #7c3aed;
          color: #ffffff;
          border-color: #7c3aed;
        }
        .admin-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 0.5rem;
        }
        .admin-modal-cancel-btn {
          padding: 0.65rem 1.25rem;
          border-radius: 0.6rem;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #475569;
          font-weight: 600;
          cursor: pointer;
        }
        .admin-modal-submit-btn {
          padding: 0.65rem 1.4rem;
          border-radius: 0.6rem;
          border: none;
          background-color: #2563eb;
          color: #ffffff;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }
        .admin-modal-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Lightbox Preview */
        .admin-lightbox-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(5px);
          z-index: 100070;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          box-sizing: border-box;
        }
        .admin-lightbox-card {
          background-color: #ffffff;
          border-radius: 1rem;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .admin-lightbox-header {
          padding: 1rem 1.25rem;
          background-color: #0f172a;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .admin-lightbox-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
        }
        .admin-lightbox-meta {
          margin: 0.15rem 0 0 0;
          font-size: 0.78rem;
          color: #94a3b8;
        }
        .admin-lightbox-close {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          padding: 0.4rem;
        }
        .admin-lightbox-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem;
          text-align: center;
          background-color: #f8fafc;
        }
        .admin-lightbox-iframe {
          width: 100%;
          height: 65vh;
          border: none;
          border-radius: 0.5rem;
        }
        .admin-lightbox-img {
          max-width: 100%;
          max-height: 70vh;
          object-fit: contain;
          border-radius: 0.5rem;
        }

        /* ---------------- Responsive Breakpoints ---------------- */
        @media (max-width: 1180px) {
          .admin-doc-category-grid,
          .admin-unified-doc-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1.15rem;
          }
        }

        @media (max-width: 820px) {
          .admin-toolbar-row-top {
            flex-direction: column;
            align-items: stretch;
          }
          .admin-toolbar-right-controls {
            justify-content: space-between;
            width: 100%;
          }
        }

        @media (max-width: 768px) {
          .admin-doc-category-grid,
          .admin-unified-doc-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .admin-doc-selector-grid {
            grid-template-columns: 1fr;
            gap: 0.85rem;
          }
          .admin-docs-header {
            flex-direction: column;
            align-items: stretch;
          }
          .admin-docs-header-btn {
            width: 100%;
            justify-content: center;
          }
          .admin-category-pills-row {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 0.35rem;
          }
          .admin-cat-pill {
            white-space: nowrap;
          }
          .admin-filter-status-text {
            width: 100%;
            text-align: left;
            margin-left: 0;
            padding-top: 0.35rem;
          }
          .admin-pagination-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .admin-pagination-controls {
            justify-content: space-between;
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .admin-pagination-controls {
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
          }
          .admin-page-nav-btns {
            flex-wrap: wrap;
            justify-content: center;
          }
          .admin-toolbar-right-controls {
            flex-wrap: wrap;
          }
          .admin-filter-select-wrap,
          .admin-view-toggle-wrap {
            flex: 1 1 auto;
            justify-content: center;
          }
          .view-toggle-label {
            display: none;
          }
          .admin-doc-card-actions {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.35rem;
          }
          .admin-doc-btn {
            padding: 0.45rem 0.2rem;
            font-size: 0.72rem;
          }
          .admin-doc-btn span {
            font-size: 0.7rem;
          }
          .admin-category-card {
            padding: 1rem;
          }
        }
      `}</style>

    </div>
  );
};

export default AdminDocuments;
