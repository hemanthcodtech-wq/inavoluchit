import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import { 
  FolderCheck, 
  Upload, 
  Trash2, 
  Eye, 
  Download, 
  Edit3, 
  Plus, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown, 
  RefreshCw, 
  Search
} from 'lucide-react';

const AdminDocuments = () => {
  const { token, API_URL, SERVER_URL } = useAuth();

  // Customer List State
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Unified Documents State (All documents for the selected customer)
  const [allDocuments, setAllDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadCustomerId, setUploadCustomerId] = useState('');
  const [uploadCategory, setUploadCategory] = useState('KYC Documents');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadRemarks, setUploadRemarks] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('KYC Documents');
  const [editRemarks, setEditRemarks] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

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
        setCustomers(custList);
        // Select first customer by default if none selected
        if (!selectedCustomerId && custList[0]) {
          setSelectedCustomerId(custList[0].id);
          setSelectedCustomer(custList[0]);
          fetchCustomerDocuments(custList[0].id, custList[0]);
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
      const res = await fetch(`${API_URL}/documents/customer/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const docs = data.allDocuments || data.documents || [];
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
      const found = customers.find(c => c.id === customerId);
      setSelectedCustomer(found || null);
      fetchCustomerDocuments(customerId, found);
    } else {
      setSelectedCustomer(null);
      setAllDocuments([]);
    }
  };

  // Open Direct Upload Modal
  const openUploadModal = (targetCategory = 'KYC Documents') => {
    const targetId = selectedCustomerId || (customers.length > 0 ? customers[0].id : '');
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
      // Support both field keys for full server compatibility
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
        throw new Error(
          res.status === 404 
            ? 'Document upload endpoint not found. Please ensure backend is updated on Hostinger.' 
            : `Server response (HTTP ${res.status}): ${text.slice(0, 100)}`
        );
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      showToast('Document uploaded successfully!', 'success');
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

  // Open Edit Modal
  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setEditTitle(doc.title || '');
    setEditCategory(doc.category || 'KYC Documents');
    setEditRemarks(doc.remarks || '');
    setEditFile(null);
    setEditModalOpen(true);
  };

  // Submit Edit Document
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;
    if (!editTitle.trim()) {
      showToast('Document title is required.', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle.trim());
      formData.append('category', editCategory);
      formData.append('remarks', editRemarks.trim());
      if (editFile) {
        formData.append('document', editFile);
        formData.append('file', editFile);
      }

      const res = await fetch(`${API_URL}/documents/${editingDoc.id}`, {
        method: 'PUT',
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
        throw new Error(data.message || 'Failed to update document');
      }

      showToast('Document updated successfully', 'success');
      setEditModalOpen(false);
      setEditingDoc(null);
      await fetchCustomerDocuments(selectedCustomerId, selectedCustomer);
    } catch (err) {
      console.error('Edit error:', err);
      showToast(err.message || 'Error updating document', 'error');
    } finally {
      setSavingEdit(false);
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

  // ---------------- Categorization Logic ----------------
  const getCategoryDocs = (catType) => {
    return allDocuments.filter(doc => {
      const cat = (doc.category || '').toLowerCase();
      const title = (doc.title || '').toLowerCase();
      const isKyc = cat.includes('kyc') || title.includes('kyc') || title.includes('aadhar') || title.includes('aadhaar') || title.includes('pan');

      if (catType === 'KYC Documents') {
        return isKyc;
      }
      if (catType === 'Other Documents') {
        return !isKyc;
      }
      return false;
    });
  };

  const categories = [
    { title: 'KYC Documents', type: 'KYC Documents' },
    { title: 'Other Documents', type: 'Other Documents' }
  ];

  return (
    <div className="admin-page-container" style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', boxSizing: 'border-box' }}>

      {/* Toast Feedback */}
      {feedback.text && (
        <div style={{
          position: 'fixed',
          top: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '440px',
          zIndex: 100060,
          padding: '0.85rem 1.25rem',
          borderRadius: '0.75rem',
          backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#eff6ff',
          color: feedback.type === 'error' ? '#991b1b' : '#2563eb',
          border: `1.5.px solid ${feedback.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
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

      {/* Header Banner - Matching Image 2 */}
      <ScrollAnimationWrapper>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              margin: '0 0 0.35rem 0',
              lineHeight: 1.2
            }}>
              Documents
            </h1>
            <p style={{
              fontSize: '0.85rem',
              color: '#64748b',
              margin: 0,
              maxWidth: '850px',
              lineHeight: 1.45
            }}>
              Private customer files — KYC, identity, and other verification records. Stored securely under each Customer ID.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openUploadModal()}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.5rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Upload Document</span>
          </button>
        </div>
      </ScrollAnimationWrapper>

      {/* Customer Selector Panel - Matching Image 2 */}
      <ScrollAnimationWrapper>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            alignItems: 'center'
          }}>
            
            {/* Box 1: Customer Select */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '0.45rem'
              }}>
                Customer
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  disabled={loadingCustomers}
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.5rem 0.75rem 0.95rem',
                    borderRadius: '0.6rem',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: selectedCustomerId ? '#0f172a' : '#64748b',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    minHeight: '46px'
                  }}
                >
                  <option value="">
                    {loadingCustomers ? '-- Loading Members... --' : '-- Choose Customer --'}
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || 'Member'}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  size={18} 
                  color="#64748b" 
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} 
                />
              </div>
            </div>

            {/* Box 2: Customer ID Display */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '0.45rem'
              }}>
                Customer ID
              </label>
              <div style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '0.6rem',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                fontSize: '0.92rem',
                fontWeight: 700,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                minHeight: '46px',
                boxSizing: 'border-box'
              }}>
                {selectedCustomer ? (
                  <span style={{ color: '#0f172a', fontWeight: 800 }}>
                    {selectedCustomer.memberId || 'INA Member'}
                  </span>
                ) : (
                  <span style={{ color: '#94a3b8', fontWeight: 500 }}>Select a customer to view ID</span>
                )}
              </div>
            </div>

          </div>
        </div>
      </ScrollAnimationWrapper>

      {/* Categorized Document Section (2-Column Layout matching Image 2) */}
      <ScrollAnimationWrapper>
        {loadingDocs ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#ffffff', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem', display: 'block', color: '#2563eb' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading customer documents...</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.25rem'
          }}>
            {categories.map((cat) => {
              const categoryDocs = getCategoryDocs(cat.type);
              return (
                <div
                  key={cat.type}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0',
                    padding: '1.25rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '220px'
                  }}
                >
                  {/* Category Card Header */}
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem',
                      paddingBottom: '0.75rem',
                      borderBottom: '1px solid #f1f5f9'
                    }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {cat.title}
                      </h3>
                      <button
                        type="button"
                        onClick={() => openUploadModal(cat.type)}
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#2563eb',
                          border: '1.5px solid #2563eb',
                          borderRadius: '0.5rem',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                        <span>Upload Document</span>
                      </button>
                    </div>

                    {/* Document Items List */}
                    {categoryDocs.length === 0 ? (
                      <div style={{
                        padding: '1.75rem 0',
                        textAlign: 'left',
                        color: '#94a3b8',
                        fontSize: '0.88rem',
                        fontWeight: 500
                      }}>
                        No documents uploaded yet
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {categoryDocs.map((doc) => (
                          <div
                            key={doc.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.75rem 0.85rem',
                              borderRadius: '0.65rem',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              flexWrap: 'wrap',
                              gap: '0.6rem'
                            }}
                          >
                            {/* File Info */}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <strong style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'block', wordBreak: 'break-word' }}>
                                {doc.title}
                              </strong>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', color: '#64748b', marginTop: '0.2rem' }}>
                                <span>{formatDate(doc.createdAt)}</span>
                                <span>•</span>
                                <span style={{ fontWeight: 700, color: '#334155' }}>{doc.fileType || 'JPEG'}</span>
                                {doc.fileSize && <span>• {doc.fileSize}</span>}
                                <span style={{
                                  backgroundColor: '#e2e8f0',
                                  color: '#475569',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '0.05rem 0.35rem',
                                  borderRadius: '4px',
                                  marginLeft: '0.2rem'
                                }}>
                                  S3
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => setPreviewDoc(doc)}
                                title="Preview"
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '0.45rem',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#334155',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <Eye size={13} />
                                <span>Preview</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownload(doc)}
                                title="Download"
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '0.45rem',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#334155',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <Download size={13} />
                                <span>Download</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteDoc(doc)}
                                title="Delete"
                                style={{
                                  padding: '0.35rem 0.6rem',
                                  borderRadius: '0.45rem',
                                  border: '1px solid #fecaca',
                                  backgroundColor: '#ffffff',
                                  color: '#dc2626',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollAnimationWrapper>

      {/* -------------------- UPLOAD MODAL -------------------- */}
      {uploadModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 100050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '1.25rem',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.15rem 1.25rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Upload Document
                </h3>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Upload KYC, identity, or general document for a member.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.4rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUploadSubmit} style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>

              {/* Target Customer */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Target Customer / Member *
                </label>
                <select
                  value={uploadCustomerId}
                  onChange={(e) => setUploadCustomerId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '0.6rem',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">-- Choose Member --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || 'Member'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Category */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Document Category *
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '0.6rem',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="KYC Documents">KYC Documents</option>
                  <option value="Other Documents">Other Documents</option>
                </select>
              </div>

              {/* Title */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Document Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aadhaar Card, Shop Photo, Passbook"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.6rem',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* File Input */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Select File (Image or PDF) *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  required
                  onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '0.6rem',
                    border: '1.5px dashed #cbd5e1',
                    fontSize: '0.85rem',
                    backgroundColor: '#fafafa',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '0.6rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: '0.6rem',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: uploading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
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
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(5px)',
            zIndex: 100070,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            boxSizing: 'border-box'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1rem',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{previewDoc.title}</h4>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  {formatDate(previewDoc.createdAt)} • {previewDoc.fileType || 'Document'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.4rem' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', textAlign: 'center', backgroundColor: '#f8fafc' }}>
              {previewDoc.fileType === 'PDF' || (previewDoc.fileUrl || '').toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={getFullFileUrl(previewDoc.fileUrl)}
                  title={previewDoc.title}
                  style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '0.5rem' }}
                />
              ) : (
                <img
                  src={getFullFileUrl(previewDoc.fileUrl)}
                  alt={previewDoc.title}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '0.5rem' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDocuments;
