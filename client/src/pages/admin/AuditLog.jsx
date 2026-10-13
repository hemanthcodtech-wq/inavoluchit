import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ScrollAnimationWrapper from '../../components/ScrollAnimationWrapper';
import { 
  Search, 
  Download, 
  RefreshCw, 
  FileText, 
  User, 
  Calendar, 
  Clock, 
  ChevronDown, 
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const AuditLog = () => {
  const { user, token, API_URL } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [exporting, setExporting] = useState(false);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());
      if (severityFilter && severityFilter !== 'All') queryParams.append('severity', severityFilter);
      if (moduleFilter && moduleFilter !== 'All') queryParams.append('module', moduleFilter);

      const res = await fetch(`${API_URL}/admin/audit-logs?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [searchQuery, severityFilter, moduleFilter]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_URL}/admin/audit-logs/export`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  const formatDateDesktop = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timePart = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return (
      <div style={{ lineHeight: '1.3' }}>
        <div style={{ fontWeight: 600, color: '#1e293b' }}>{datePart}</div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{timePart}</div>
      </div>
    );
  };

  const formatDateMobile = (dateString) => {
    if (!dateString) return 'Recent';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' · ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return 'Recent';
    }
  };

  const formatAction = (act) => {
    if (!act) return 'Activity Logged';
    if (act === 'Delete Group Document') return 'Deleted Chit Scheme';
    if (act === 'Create Chit Group') return 'Created Chit Scheme';
    if (act === 'Update Chit Scheme') return 'Updated Chit Scheme';
    return act;
  };

  const formatModule = (mod) => {
    switch (mod) {
      case 'system': return 'Tab Navigation';
      case 'chit_groups':
      case 'chits':
      case 'chit_schemes': return 'Chit Schemes';
      case 'members': return 'Members & Users';
      case 'payments':
      case 'receipts': return 'Payments & Receipts';
      case 'auctions': return 'Auctions';
      case 'auth': return 'Authentication';
      default: return mod || 'System';
    }
  };

  const getSeverityBadgeStyle = (sev) => {
    switch (sev) {
      case 'Critical':
        return { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' };
      case 'Warning':
        return { bg: '#fffbeb', color: '#92400e', border: '#fde68a' };
      default:
        return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    }
  };

  const getResultBadgeStyle = (res) => {
    if (res === 'Failed') {
      return { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' };
    }
    return { bg: '#dbeafe', color: '#1d4ed8', border: '#a5b4fc' };
  };

  const getModuleBadgeStyle = (mod) => {
    switch (mod) {
      case 'chit_groups':
      case 'chits':
      case 'chit_schemes':
        return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
      case 'members':
        return { bg: '#fdf2f8', color: '#9d174d', border: '#fbcfe8' };
      case 'payments':
      case 'receipts':
        return { bg: '#fefce8', color: '#854d0e', border: '#fef08a' };
      case 'auctions':
        return { bg: '#faf5ff', color: '#6b21a8', border: '#e9d5ff' };
      case 'auth':
        return { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' };
      default:
        return { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' };
    }
  };

  const categoryPills = [
    { label: 'All Categories', value: 'All' },
    { label: 'Tab Navigation', value: 'system' },
    { label: 'Chit Schemes', value: 'chit_groups' },
    { label: 'Members & Users', value: 'members' },
    { label: 'Payments & Receipts', value: 'payments' },
    { label: 'Auctions', value: 'auctions' },
    { label: 'Authentication', value: 'auth' }
  ];

  return (
    <ScrollAnimationWrapper>
      <div className="admin-page-container" style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* Desktop Top Header Bar (Hidden on Mobile) */}
        <div className="audit-desktop-top-bar" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '380px'
          }}>
            <Search size={17} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search members, payments, groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem 0.55rem 2.3rem',
                borderRadius: '0.6rem',
                border: '1px solid #e2e8f0',
                fontSize: '0.85rem',
                outline: 'none',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: '#ffffff',
              padding: '0.35rem 0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.82rem'
              }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div style={{ lineHeight: '1.2' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{user?.name || 'Super Admin'}</p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b' }}>{user?.role === 'superadmin' ? 'Super Admin' : (user?.role === 'employee' ? 'Employee' : 'Admin')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Title & Export Action Header */}
        <div className="audit-header-section" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.25rem'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: 'var(--color-primary-green, #0a1e3b)',
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '0.25rem'
            }}>
              <FileText size={14} />
              <span>ADMIN PORTAL</span>
            </div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              margin: '0 0 0.25rem 0',
              lineHeight: 1.2
            }}>
              Audit Log
            </h1>
            <p style={{
              fontSize: '0.85rem',
              color: '#64748b',
              margin: 0,
              lineHeight: 1.45,
              maxWidth: '650px'
            }}>
              Immutable, centralized audit history of all system activities.
            </p>
          </div>


        </div>

        {/* Category Quick Filter Pills Bar (Swipable on mobile) */}
        <div 
          className="audit-pills-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '1rem',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            padding: '0.55rem 0.75rem',
            borderRadius: '0.75rem',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', marginRight: '0.2rem', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Filter:
          </span>
          {categoryPills.map((pill) => {
            const isActive = moduleFilter === pill.value;
            return (
              <button
                key={pill.value}
                type="button"
                onClick={() => setModuleFilter(pill.value)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: isActive ? 700 : 500,
                  border: '1px solid',
                  borderColor: isActive ? '#2563eb' : '#cbd5e1',
                  backgroundColor: isActive ? '#2563eb' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Main Content Container Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
          overflow: 'hidden'
        }}>
          {/* Card Toolbar */}
          <div 
            className="audit-card-toolbar"
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search actions, emails, IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 2.2rem 0.6rem 2.4rem',
                  borderRadius: '0.6rem',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '16px', // 16px prevents iOS auto-zoom
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                  minHeight: '42px',
                  color: '#0f172a'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '0.2rem'
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Controls Row (Category, Severity, Refresh) */}
            <div className="audit-controls-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              
              {/* Category Dropdown */}
              <div style={{ position: 'relative', minWidth: '150px', flex: '1 1 auto' }}>
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 2.2rem 0.6rem 0.75rem',
                    borderRadius: '0.6rem',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '16px', // 16px prevents iOS auto-zoom
                    fontWeight: 600,
                    color: '#1e293b',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer',
                    minHeight: '42px',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    WebkitAppearance: 'none'
                  }}
                >
                  <option value="All">All Categories</option>
                  <option value="system">Tab Navigation</option>
                  <option value="chit_groups">Chit Schemes</option>
                  <option value="members">Members & Users</option>
                  <option value="payments">Payments & Receipts</option>
                  <option value="auctions">Auctions</option>
                  <option value="auth">Authentication</option>
                </select>
                <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>

              {/* Severity Dropdown */}
              <div style={{ position: 'relative', minWidth: '135px', flex: '1 1 auto' }}>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 2.2rem 0.6rem 0.75rem',
                    borderRadius: '0.6rem',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '16px', // 16px prevents iOS auto-zoom
                    fontWeight: 600,
                    color: '#1e293b',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer',
                    minHeight: '42px',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    WebkitAppearance: 'none'
                  }}
                >
                  <option value="All">All Severities</option>
                  <option value="Info">Info</option>
                  <option value="Warning">Warning</option>
                  <option value="Critical">Critical</option>
                </select>
                <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => fetchAuditLogs()}
                disabled={loading}
                title="Refresh Logs"
                style={{
                  padding: '0.6rem 0.95rem',
                  borderRadius: '0.6rem',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  minHeight: '42px',
                  boxSizing: 'border-box',
                  flexShrink: 0
                }}
              >
                <RefreshCw size={15} className={loading ? "spin" : ""} />
                <span>Refresh</span>
              </button>

            </div>
          </div>

          {/* ========================================================= */}
          {/* 1. MOBILE LOG CARDS VIEW (Only visible on max-width 768px) */}
          {/* ========================================================= */}
          <div className="audit-mobile-cards-view">
            {loading ? (
              <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={26} className="spin" style={{ margin: '0 auto 0.5rem', display: 'block', color: '#2563eb' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Fetching audit logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                <FileText size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
                <p style={{ fontWeight: 700, margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#334155' }}>
                  No audit logs found matching criteria
                </p>
                {(severityFilter !== 'All' || moduleFilter !== 'All' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => { setSeverityFilter('All'); setModuleFilter('All'); setSearchQuery(''); }}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      marginTop: '0.35rem'
                    }}
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.85rem' }}>
                {logs.map((log, index) => {
                  const severityStyle = getSeverityBadgeStyle(log.severity);
                  const resultStyle = getResultBadgeStyle(log.result);
                  const moduleStyle = getModuleBadgeStyle(log.module);

                  return (
                    <div
                      key={log.id || index}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        padding: '0.95rem 1rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Top Row: Action Title + Badges */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0f172a', lineHeight: 1.25 }}>
                          {formatAction(log.action)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            backgroundColor: severityStyle.bg,
                            color: severityStyle.color,
                            border: `1px solid ${severityStyle.border}`
                          }}>
                            {log.severity || 'Info'}
                          </span>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            backgroundColor: resultStyle.bg,
                            color: resultStyle.color,
                            border: `1px solid ${resultStyle.border}`
                          }}>
                            {log.result || 'Success'}
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Module Tag + Record ID */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '0.35rem',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          backgroundColor: moduleStyle.bg,
                          color: moduleStyle.color,
                          border: `1px solid ${moduleStyle.border}`
                        }}>
                          {formatModule(log.module)}
                        </span>

                        {log.recordId && (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.74rem',
                            color: '#475569',
                            backgroundColor: '#f1f5f9',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '0.3rem',
                            border: '1px solid #e2e8f0',
                            maxWidth: '180px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            ID: {log.recordId}
                          </span>
                        )}
                      </div>

                      {/* Details Note if available */}
                      {log.details && (
                        <div style={{
                          fontSize: '0.78rem',
                          color: '#475569',
                          backgroundColor: '#f8fafc',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '0.4rem',
                          borderLeft: '2.5px solid #2563eb',
                          wordBreak: 'break-word',
                          lineHeight: 1.35
                        }}>
                          {log.details}
                        </div>
                      )}

                      {/* Footer Row: User Email, Role, and Date */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '0.55rem',
                        fontSize: '0.76rem',
                        color: '#64748b',
                        flexWrap: 'wrap',
                        gap: '0.4rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                          <User size={13} color="#94a3b8" />
                          <span style={{ fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                            {log.userEmail || 'admin@inavolu.com'}
                          </span>
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '0.25rem',
                            flexShrink: 0
                          }}>
                            {log.userRole || 'Admin'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, color: '#64748b', flexShrink: 0 }}>
                          <Clock size={12} color="#94a3b8" />
                          <span>{formatDateMobile(log.createdAt)}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 2. DESKTOP FULL TABLE VIEW (Only visible on min-width 769px) */}
          {/* ========================================================= */}
          <div className="audit-desktop-table-view" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.9rem 1.25rem' }}>DATE / TIME</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>USER</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>ROLE</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>MODULE</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>ACTION</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>RECORD</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>RESULT</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>SEVERITY</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                      <RefreshCw size={22} className="spin" style={{ margin: '0 auto 0.5rem', display: 'block', color: '#2563eb' }} />
                      <span>Fetching audit history logs...</span>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: '#475569' }}>
                          No audit logs found matching selected criteria.
                        </p>
                        {(severityFilter !== 'All' || moduleFilter !== 'All' || searchQuery) && (
                          <button
                            type="button"
                            onClick={() => { setSeverityFilter('All'); setModuleFilter('All'); setSearchQuery(''); }}
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.45rem 1rem',
                              borderRadius: '0.4rem',
                              border: 'none',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              fontWeight: 600,
                              fontSize: '0.82rem',
                              cursor: 'pointer'
                            }}
                          >
                            Reset All Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log, index) => {
                    const severityStyle = getSeverityBadgeStyle(log.severity);
                    const resultStyle = getResultBadgeStyle(log.result);
                    const moduleStyle = getModuleBadgeStyle(log.module);

                    return (
                      <tr 
                        key={log.id || index}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* DATE / TIME */}
                        <td style={{ padding: '1rem 1.25rem', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {formatDateDesktop(log.createdAt)}
                        </td>

                        {/* USER */}
                        <td style={{ padding: '1rem 1.25rem', color: '#0f172a', fontWeight: 600 }}>
                          {log.userEmail || 'admin@inavolu.com'}
                        </td>

                        {/* ROLE */}
                        <td style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          <span style={{
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '0.35rem',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}>
                            {log.userRole || 'Admin'}
                          </span>
                        </td>

                        {/* MODULE */}
                        <td style={{ padding: '1rem 1.25rem', color: '#334155', fontWeight: 500 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '0.4rem',
                            backgroundColor: moduleStyle.bg,
                            color: moduleStyle.color,
                            border: `1px solid ${moduleStyle.border}`,
                            fontWeight: 700,
                            fontSize: '0.78rem'
                          }}>
                            {formatModule(log.module)}
                          </span>
                        </td>

                        {/* ACTION */}
                        <td style={{ padding: '1rem 1.25rem', color: '#0f172a', fontWeight: 700 }}>
                          {formatAction(log.action)}
                        </td>

                        {/* RECORD */}
                        <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', color: '#475569', fontSize: '0.82rem' }}>
                          {log.recordId || '--'}
                        </td>

                        {/* RESULT */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            backgroundColor: resultStyle.bg,
                            color: resultStyle.color,
                            border: `1px solid ${resultStyle.border}`,
                            fontWeight: 700,
                            fontSize: '0.76rem'
                          }}>
                            {log.result || 'Success'}
                          </span>
                        </td>

                        {/* SEVERITY */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            backgroundColor: severityStyle.bg,
                            color: severityStyle.color,
                            border: `1px solid ${severityStyle.border}`,
                            fontWeight: 700,
                            fontSize: '0.76rem'
                          }}>
                            {log.severity || 'Info'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Responsive Layout CSS */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }

        /* Mobile Viewport Rules (<= 768px) */
        @media (max-width: 768px) {
          .audit-desktop-top-bar {
            display: none !important;
          }
          .audit-desktop-table-view {
            display: none !important;
          }
          .audit-mobile-cards-view {
            display: block !important;
          }
          .audit-header-section {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .audit-export-btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .audit-card-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .audit-controls-row {
            width: 100% !important;
          }
          .audit-controls-row > div {
            flex: 1 1 calc(50% - 0.25rem) !important;
          }
          .audit-controls-row button {
            width: 100% !important;
            justify-content: center !important;
          }
        }

        /* Desktop Viewport Rules (> 768px) */
        @media (min-width: 769px) {
          .audit-mobile-cards-view {
            display: none !important;
          }
          .audit-desktop-table-view {
            display: block !important;
          }
        }
      `}</style>
    </ScrollAnimationWrapper>
  );
};

export default AuditLog;
