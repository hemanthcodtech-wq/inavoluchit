import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Download,
  Printer,
  Share2,
  CheckCircle2,
  Calendar,
  CreditCard,
  User,
  Layers,
  ArrowLeft,
  Building,
  Phone,
  Globe,
  ExternalLink,
  Sparkles,
  FileCheck
} from 'lucide-react';

const PublicReceiptPage = () => {
  const { receiptNo } = useParams();
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const cleanNo = (receiptNo || '').replace(/\.pdf$/i, '').trim();

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        setLoading(true);
        setError(null);
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const res = await fetch(`${API_URL}/payments/receipt/verify/${encodeURIComponent(cleanNo)}`);
        const data = await res.json();
        if (res.ok && data?.success && data?.receipt) {
          setReceipt(data.receipt);
        } else {
          setError(data?.message || 'Receipt could not be verified.');
        }
      } catch (err) {
        console.error('Error verifying receipt:', err);
        setError('Receipt record not found. Please verify the receipt number.');
      } finally {
        setLoading(false);
      }
    };

    if (cleanNo) {
      fetchReceipt();
    } else {
      setError('Invalid receipt number.');
      setLoading(false);
    }
  }, [cleanNo]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (receipt?.receiptUrl) {
      window.open(receipt.receiptUrl, '_blank');
    } else {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      window.open(`${API_URL}/payments/receipt/download/${encodeURIComponent(cleanNo)}`, '_blank');
    }
  };

  const handleShare = () => {
    const pageUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Official Receipt - ${receipt?.receiptNo || cleanNo}`,
        text: `Official Payment Receipt for ${receipt?.userName || 'Member'} - InaVolu Chit Funds Pvt Ltd`,
        url: pageUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(pageUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const formatDateStr = (dateInput) => {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}-${monthNames[d.getMonth()]}-${d.getFullYear()}`;
  };

  const formatMonthYearStr = (dateInput, mNum = 1) => {
    let d = new Date(dateInput || Date.now());
    if (isNaN(d.getTime())) d = new Date();
    if (mNum && mNum > 1) {
      d.setMonth(d.getMonth() + (mNum - 1));
    }
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatCurrency = (amt) => {
    const n = Number(amt) || 0;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '75vh',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e2e8f0',
          borderTopColor: '#0a1e3b',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '1.25rem'
        }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0a1e3b', marginBottom: '0.4rem' }}>
          Verifying Official Receipt
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
          Authenticating receipt <strong>{cleanNo}</strong> against InaVolu Chit Funds digital records...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div style={{
        maxWidth: '560px',
        margin: '3rem auto',
        padding: '2.5rem 2rem',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
        border: '1.5px solid #fee2e2',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#fef2f2',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem'
        }}>
          <FileCheck size={32} />
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
          Receipt Verification Failed
        </h2>
        <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {error || `We could not locate an official receipt for "${cleanNo}". It may be invalid or pending approval.`}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/"
            style={{
              padding: '0.65rem 1.4rem',
              borderRadius: '10px',
              backgroundColor: '#0a1e3b',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none'
            }}
          >
            Go to Home
          </Link>
          <a
            href="tel:+918500319890"
            style={{
              padding: '0.65rem 1.4rem',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none'
            }}
          >
            Contact Helpline: +91 8500319890
          </a>
        </div>
      </div>
    );
  }

  const monthYearStr = formatMonthYearStr(receipt.startDate, receipt.monthNumber);
  const paymentDateStr = formatDateStr(receipt.paymentDate);
  const remainingDue = Number(receipt.remainingDue || 0);
  const excessAmount = Number(receipt.excessAmount || 0);

  return (
    <div style={{
      maxWidth: '860px',
      margin: '1.5rem auto 3.5rem',
      padding: '0 1rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Top Controls Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#475569',
              textDecoration: 'none',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              backgroundColor: '#f1f5f9'
            }}
          >
            <ArrowLeft size={15} />
            <span>Home</span>
          </Link>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '9999px',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            fontSize: '0.82rem',
            fontWeight: 800
          }}>
            <ShieldCheck size={16} />
            <span>Digitally Authenticated Receipt</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} className="no-print">
          <button
            type="button"
            onClick={handleDownloadPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1.1rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#0a1e3b',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(10, 30, 59, 0.25)',
              transition: 'all 0.15s'
            }}
          >
            <Download size={15} />
            <span>Download Official PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Printer size={15} />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <Share2 size={15} />
            <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Certificate Card */}
      <div
        id="receipt-print-area"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 12px 35px rgba(15, 23, 42, 0.08)',
          border: '1.5px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Header Ribbon */}
        <div style={{
          background: 'linear-gradient(135deg, #0a1e3b 0%, #112d59 100%)',
          color: '#ffffff',
          padding: '1.75rem 2rem',
          position: 'relative'
        }}>
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
            alignItems: 'flex-start',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div>
              <div style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#fbbf24',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '0.25rem'
              }}>
                Government Registered Chit Fund Company
              </div>
              <h1 style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: '#ffffff',
                margin: '0 0 0.35rem 0',
                letterSpacing: '-0.02em'
              }}>
                INAVOLU CHIT FUNDS PRIVATE LIMITED
              </h1>
              <p style={{
                fontSize: '0.8rem',
                color: '#cbd5e1',
                lineHeight: 1.45,
                margin: 0,
                maxWidth: '560px'
              }}>
                Regd Office: ABR Building, Kadapa - Bengaluru Hwy, Angallu, Madanapalle, AP – 517326.<br />
                CIN: U65992AP2021PTC118942 • Helpline: +91 8500319890 • Web: www.inavolu.com
              </p>
            </div>

            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(6px)',
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              textAlign: 'right',
              minWidth: '170px'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Official Tax Receipt
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace', margin: '0.15rem 0' }}>
                {receipt.receiptNo}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                Date: {paymentDateStr}
              </div>
            </div>
          </div>
        </div>

        {/* Verification Strip */}
        <div style={{
          backgroundColor: '#f0fdf4',
          borderBottom: '1px solid #bbf7d0',
          padding: '0.75rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          fontSize: '0.82rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontWeight: 700 }}>
            <CheckCircle2 size={16} color="#16a34a" />
            <span>Payment Verified & Confirmed in InaVolu Central Ledger</span>
          </div>
          <div style={{ color: '#15803d', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.8rem' }}>
            AUTH: {receipt.digitalSignature?.hash || 'INA-AUTH-AUTHENTIC'}
          </div>
        </div>

        {/* Receipt Content Body */}
        <div style={{ padding: '2rem' }}>
          {/* Member & Scheme Information Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            padding: '1.25rem 1.5rem',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '1.75rem'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                Member Name
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {receipt.userName}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.15rem' }}>
                Member ID: <strong style={{ color: '#0a1e3b' }}>{receipt.memberId}</strong>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                Chit Scheme
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {receipt.chitName}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.15rem' }}>
                Installment: <strong style={{ color: '#0a1e3b' }}>Month {receipt.monthNumber} ({monthYearStr})</strong>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                Payment Method & Ref
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                {receipt.paymentMode || 'Cash'}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                TXN: {receipt.transactionId || 'OFFLINE-RECORD'}
              </div>
            </div>
          </div>

          {/* Financial Particulars Breakdown Table */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#0a1e3b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <Layers size={16} />
              <span>Payment & Due Summary</span>
            </div>

            <div style={{
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0a1e3b', color: '#ffffff' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>Particulars</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.8rem 1rem', color: '#334155' }}>
                      <strong>Month Payable Due ({monthYearStr})</strong>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      {formatCurrency(receipt.dueAmount)}
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f0fdf4' }}>
                    <td style={{ padding: '0.8rem 1rem', color: '#166534' }}>
                      <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle2 size={15} color="#16a34a" />
                        Amount Paid in this Receipt
                      </strong>
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 900, fontSize: '1rem', color: '#15803d' }}>
                      {formatCurrency(receipt.amount)}
                    </td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.8rem 1rem', color: '#475569' }}>
                      Remaining Balance Due for this Month
                    </td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 800, color: remainingDue === 0 ? '#16a34a' : '#ea580c' }}>
                      {remainingDue === 0 ? '₹0 (Fully Cleared - No Dues)' : formatCurrency(remainingDue)}
                    </td>
                  </tr>

                  {excessAmount > 0 && (
                    <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#ecfeff' }}>
                      <td style={{ padding: '0.8rem 1rem', color: '#0e7490' }}>
                        Excess Advance Balance with InaVolu
                      </td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 800, color: '#0e7490' }}>
                        {formatCurrency(excessAmount)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Digital Signature & Stamp Box */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
            padding: '1.25rem 1.5rem',
            borderRadius: '12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            marginTop: '1.5rem'
          }}>
            <div style={{ maxWidth: '420px' }}>
              <div style={{ fontSize: '0.76rem', color: '#0a1e3b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Digital Authentication
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5, marginTop: '0.2rem' }}>
                This is an official system-generated payment receipt digitally validated and recorded by <strong>InaVolu Chit Funds Private Limited</strong>. No physical signature is required.
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: '1.5px dashed #16a34a',
              backgroundColor: '#f0fdf4'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>
                ★ INAVOLU OFFICIAL SEAL ★
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#15803d', margin: '0.2rem 0' }}>
                PAYMENT VERIFIED
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>
                {receipt.digitalSignature?.hash || cleanNo}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div style={{
          backgroundColor: '#f1f5f9',
          borderTop: '1px solid #e2e8f0',
          padding: '1rem 2rem',
          textAlign: 'center',
          fontSize: '0.76rem',
          color: '#64748b'
        }}>
          Thank you for being a valued member of InaVolu Chit Funds Private Limited • Official Portal: www.inavolu.com • Helpline: +91 8500319890
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print, header, nav, footer, .main-layout-container > aside {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #receipt-print-area {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            margin: 0 auto !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PublicReceiptPage;
