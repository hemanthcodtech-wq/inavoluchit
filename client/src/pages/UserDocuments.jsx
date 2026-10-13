import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ScrollAnimationWrapper from '../components/ScrollAnimationWrapper';
import { 
  FolderCheck, 
  Eye, 
  Download, 
  FileText, 
  X, 
  AlertCircle, 
  CheckCircle,
  File,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

const CATEGORIES = [
  'KYC Documents',
  'Other Documents'
];

const UserDocuments = () => {
  const { user, token, API_URL, SERVER_URL } = useAuth();
  const [categoriesData, setCategoriesData] = useState({
    'KYC Documents': [],
    'Other Documents': []
  });
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

  const getFullFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = SERVER_URL || (typeof window !== 'undefined' && window.location.hostname ? `http://${window.location.hostname}:5000` : 'http://localhost:5000');
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const isKycDoc = (doc) => {
    const cat = (doc.category || '').toLowerCase();
    const title = (doc.title || '').toLowerCase();
    return (
      cat.includes('kyc') ||
      cat.includes('identity') ||
      cat.includes('address') ||
      title.includes('kyc') ||
      title.includes('aadhaar') ||
      title.includes('aadhar') ||
      title.includes('pan') ||
      title.includes('voter') ||
      title.includes('license') ||
      title.includes('passport') ||
      title.includes('electricity') ||
      title.includes('bill')
    );
  };

  const fetchUserDocuments = async () => {
    setLoading(true);
    setError('');

    const baseCategorized = {
      'KYC Documents': [],
      'Other Documents': []
    };

    try {
      // 1. Fetch from server endpoint
      try {
        const res = await fetch(`${API_URL}/documents/my-documents`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success) {
            setCustomer(data.customer || user);
            const allServerDocs = data.documents || data.allDocuments || [];
            
            // Also collect from data.categories if present
            if (data.categories && typeof data.categories === 'object') {
              Object.values(data.categories).forEach(arr => {
                if (Array.isArray(arr)) {
                  arr.forEach(d => {
                    if (!allServerDocs.some(existing => existing.id === d.id)) {
                      allServerDocs.push(d);
                    }
                  });
                }
              });
            }

            allServerDocs.forEach(doc => {
              if (isKycDoc(doc)) {
                if (!baseCategorized['KYC Documents'].some(d => d.id === doc.id)) {
                  baseCategorized['KYC Documents'].push(doc);
                }
              } else {
                if (!baseCategorized['Other Documents'].some(d => d.id === doc.id)) {
                  baseCategorized['Other Documents'].push(doc);
                }
              }
            });
          }
        }
      } catch (e) {
        console.warn('Server endpoint /my-documents error:', e);
      }

      // 2. Also check local storage documents uploaded for this user if any
      if (user?.id) {
        try {
          const stored = localStorage.getItem(`inavolu_docs_${user.id}`) || localStorage.getItem(`vridi_docs_${user.id}`);
          if (stored) {
            const localDocs = JSON.parse(stored);
            localDocs.forEach(ld => {
              if (isKycDoc(ld)) {
                if (!baseCategorized['KYC Documents'].some(d => d.id === ld.id)) {
                  baseCategorized['KYC Documents'].push(ld);
                }
              } else {
                if (!baseCategorized['Other Documents'].some(d => d.id === ld.id)) {
                  baseCategorized['Other Documents'].push(ld);
                }
              }
            });
          }
        } catch (e) {}
      }

      // 3. Inject registration KYC documents into KYC Documents bucket
      if (user?.aadharImgUrl) {
        const alreadyHasAadhar = baseCategorized['KYC Documents'].some(
          d => d.title?.toLowerCase().includes('aadhaar') || d.title?.toLowerCase().includes('aadhar') || d.fileUrl === user.aadharImgUrl
        );
        if (!alreadyHasAadhar) {
          baseCategorized['KYC Documents'].unshift({
            id: `reg-aadhar-${user.id}`,
            userId: user.id,
            category: 'KYC Documents',
            title: 'Aadhaar Card (Registration KYC)',
            fileName: 'aadhaar_card.jpeg',
            fileUrl: user.aadharImgUrl,
            fileType: 'JPEG',
            fileSize: '512 KB',
            storageType: 'S3',
            remarks: user.aadharNumber ? `Aadhaar No: ${user.aadharNumber}` : 'Submitted during member registration',
            uploadedBy: 'System / User',
            createdAt: user.createdAt || new Date(),
            isSystemRegistrationDoc: true
          });
        }
      }

      if (user?.panImgUrl) {
        const alreadyHasPan = baseCategorized['KYC Documents'].some(
          d => d.title?.toLowerCase().includes('pan') || d.fileUrl === user.panImgUrl
        );
        if (!alreadyHasPan) {
          baseCategorized['KYC Documents'].push({
            id: `reg-pan-${user.id}`,
            userId: user.id,
            category: 'KYC Documents',
            title: 'PAN Card (Registration KYC)',
            fileName: 'pan_card.jpeg',
            fileUrl: user.panImgUrl,
            fileType: 'JPEG',
            fileSize: '480 KB',
            storageType: 'S3',
            remarks: user.panNumber ? `PAN No: ${user.panNumber}` : 'Submitted during member registration',
            uploadedBy: 'System / User',
            createdAt: user.createdAt || new Date(),
            isSystemRegistrationDoc: true
          });
        }
      }

      setCategoriesData(baseCategorized);
      setCustomer(user);
    } catch (err) {
      console.error('Error fetching user documents:', err);
      setError('Could not load documents from server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserDocuments();
    }
  }, [token, user?.id]);

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

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="user-page-container user-doc-page" style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Page Header */}
      <ScrollAnimationWrapper>
        <div className="user-doc-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-primary-green, #0a1e3b)',
              display: 'block',
              marginBottom: '0.2rem'
            }}>
              CUSTOMER PORTAL
            </span>
            <h1 style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 0.35rem 0',
              lineHeight: 1.2
            }}>
              Chit Documents
            </h1>
            <p style={{
              fontSize: '0.85rem',
              color: '#64748b',
              margin: 0,
              maxWidth: '750px',
              lineHeight: 1.45
            }}>
              Official customer files — KYC and other verification records securely stored under your Customer ID.
            </p>
          </div>

          {/* Customer ID Badge */}
          <div className="user-doc-id-badge" style={{
            backgroundColor: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '0.75rem',
            padding: '0.65rem 1.15rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.9rem',
              flexShrink: 0
            }}>
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>
                Customer ID:
              </span>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a', wordBreak: 'break-word', display: 'block' }}>
                {user.memberId || 'ID Pending'} · {user.name}
              </strong>
            </div>
          </div>
        </div>
      </ScrollAnimationWrapper>

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          border: '1px solid #fecaca',
          borderRadius: '0.75rem',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.88rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 6 Categories Grid - Responsive 2 columns on desktop, 1 on mobile */}
      <div 
        className="responsive-doc-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '1.25rem',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {CATEGORIES.map((catKey) => {
          const docs = categoriesData[catKey] || [];
          return (
            <ScrollAnimationWrapper key={catKey}>
              <div className="card-premium chit-card-responsive" style={{
                backgroundColor: '#ffffff',
                borderRadius: '1rem',
                border: '1px solid #e2e8f0',
                padding: '1.15rem 1.25rem',
                minHeight: '175px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                boxSizing: 'border-box'
              }}>
                {/* Category Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.85rem',
                  paddingBottom: '0.65rem',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: 0
                    }}>
                      {catKey}
                    </h3>
                    {docs.length > 0 && (
                      <span style={{
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        border: '1px solid #bfdbfe'
                      }}>
                        {docs.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content: Docs list or empty state */}
                {loading ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    Loading documents...
                  </div>
                ) : docs.length === 0 ? (
                  <div style={{
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}>
                    No documents uploaded yet
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {docs.map((doc) => (
                      <div
                        key={doc.id}
                        className="doc-item-card"
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.75rem',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          backgroundColor: '#fafafa',
                          transition: 'all 0.15s ease',
                          minWidth: 0,
                          gap: '0.65rem',
                          boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                      >
                        {/* File Details (No text truncation / No ellipsis cutting off!) */}
                        <div style={{ width: '100%', minWidth: 0 }}>
                          <h4 style={{
                            fontSize: '0.94rem',
                            fontWeight: 700,
                            color: '#1e293b',
                            margin: '0 0 0.35rem 0',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            lineHeight: 1.35
                          }}>
                            {doc.title}
                          </h4>

                          {/* Meta Tags - Wrap naturally on mobile */}
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            flexWrap: 'wrap',
                            lineHeight: 1.4
                          }}>
                            <span>{formatDate(doc.createdAt)}</span>
                            <span>•</span>
                            <span style={{
                              fontWeight: 700,
                              color: '#334155',
                              backgroundColor: '#f1f5f9',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem'
                            }}>
                              {doc.fileType || 'FILE'}
                            </span>
                            {doc.storageType && (
                              <>
                                <span>•</span>
                                <span style={{
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600
                                }}>
                                  {doc.storageType}
                                </span>
                              </>
                            )}
                            {doc.fileSize && (
                              <>
                                <span>•</span>
                                <span>{doc.fileSize}</span>
                              </>
                            )}
                          </div>

                          {/* Full Remarks - No cut off! */}
                          {doc.remarks && (
                            <p style={{
                              fontSize: '0.76rem',
                              color: '#475569',
                              backgroundColor: '#f8fafc',
                              borderLeft: '2.5px solid #2563eb',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '0 4px 4px 0',
                              margin: '0.45rem 0 0 0',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              lineHeight: 1.35
                            }}>
                              💬 {doc.remarks}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons: Full touch-friendly responsive row */}
                        <div 
                          className="doc-item-actions"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            width: '100%',
                            paddingTop: '0.45rem',
                            borderTop: '1px solid #f1f5f9'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            title="Preview Document"
                            style={{
                              flex: 1,
                              padding: '0.45rem 0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              cursor: 'pointer',
                              minHeight: '38px',
                              boxSizing: 'border-box'
                            }}
                          >
                            <Eye size={14} />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            title="Download File"
                            style={{
                              flex: 1,
                              padding: '0.45rem 0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid #bfdbfe',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              cursor: 'pointer',
                              minHeight: '38px',
                              boxSizing: 'border-box'
                            }}
                          >
                            <Download size={14} />
                            <span>Download</span>
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollAnimationWrapper>
          );
        })}
      </div>

      {/* -------------------- PREVIEW LIGHTBOX / VIEWER MODAL -------------------- */}
      {previewDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(5px)',
          zIndex: 100055, // Higher than mobile navbar (99999)
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          boxSizing: 'border-box'
        }}>
          {/* Top Bar */}
          <div style={{
            width: '100%',
            maxWidth: '900px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            color: '#ffffff',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {previewDoc.title}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {previewDoc.category} · {previewDoc.fileType} · {formatDate(previewDoc.createdAt)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleDownload(previewDoc)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.45rem 0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  minHeight: '38px'
                }}
              >
                <Download size={14} />
                <span>Download</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.45rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px'
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Viewer Container */}
          <div style={{
            width: '100%',
            maxWidth: '900px',
            height: '75vh',
            backgroundColor: '#0f172a',
            borderRadius: '1rem',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {previewDoc.fileUrl?.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={getFullFileUrl(previewDoc.fileUrl)}
                title={previewDoc.title}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <img
                src={getFullFileUrl(previewDoc.fileUrl)}
                alt={previewDoc.title}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Mobile Responsive Rules */}
      <style>{`
        @media (max-width: 768px) {
          .user-doc-page {
            padding-top: 0.5rem !important;
          }
          .responsive-doc-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .user-doc-header {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .user-doc-id-badge {
            width: 100% !important;
          }
        }
      `}</style>

    </div>
  );
};

export default UserDocuments;
