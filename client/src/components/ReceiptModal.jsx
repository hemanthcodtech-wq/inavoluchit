import React, { useRef } from 'react';
import OfficialPaymentReceipt from './OfficialReceipt';
import { generatePaymentReceiptPDF } from '../utils/receiptGenerator';

export const ReceiptModal = ({ isOpen, onClose, payment = {}, chit = {}, user = {}, extraData = {} }) => {
  const receiptRef = useRef(null);

  if (!isOpen) return null;

  const targetChit = (chit && chit.name) ? chit : (payment?.chit || {});
  const targetUser = (user && user.name) ? user : (payment?.user || {});

  const formatReceiptNo = (rawNo, pDateObj, pId) => {
    if (rawNo && String(rawNo).length <= 14) return String(rawNo);
    const yr = String(pDateObj.getFullYear()).slice(-2);
    const mo = String(pDateObj.getMonth() + 1).padStart(2, '0');
    const tail = String(pId || Math.floor(100 + Math.random() * 900)).replace(/\D/g, '').slice(-3) || '610';
    return `ANR${yr}${mo}${tail}`;
  };

  const paymentDateObj = payment?.createdAt ? new Date(payment.createdAt) : new Date();
  const receiptNo = formatReceiptNo(payment?.receiptNo || extraData?.receiptNo, paymentDateObj, payment?.id);

  const handleDownloadPDF = async () => {
    try {
      await generatePaymentReceiptPDF(payment, targetChit, targetUser, extraData);
    } catch (err) {
      console.error('Error generating receipt PDF:', err);
      alert('Could not download receipt: ' + err.message);
    }
  };

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${receiptNo}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${receiptRef.current.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div
      className="receipt-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100050, // Higher than mobile navbar (99999)
        padding: '0.75rem',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}
    >
      <div
        className="receipt-modal-container"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          maxWidth: '620px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {/* Controls Bar */}
        <div
          className="receipt-modal-controls"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: '1 1 auto' }}>
            <span style={{ fontSize: '1rem' }}>🧾</span>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Receipt #{receiptNo}
            </h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handlePrint}
              className="receipt-btn-print"
              style={{
                padding: '0.4rem 0.65rem',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                minHeight: '32px'
              }}
            >
              <span>🖨️</span>
              <span className="receipt-btn-text">Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="receipt-btn-download"
              style={{
                padding: '0.4rem 0.75rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                minHeight: '32px',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
              }}
            >
              <span>⬇️</span>
              <span className="receipt-btn-text">PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.35rem',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px'
              }}
              title="Close Receipt"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div
          className="receipt-scroll-viewport"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '0.75rem',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            boxSizing: 'border-box'
          }}
        >
          {/* Receipt Wrapper Card */}
          <div
            className="receipt-inner-wrapper"
            style={{
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              borderRadius: '8px',
              padding: '4px',
              width: '100%',
              maxWidth: '560px',
              boxSizing: 'border-box'
            }}
          >
            <OfficialPaymentReceipt
              innerRef={receiptRef}
              payment={payment}
              chit={targetChit}
              user={targetUser}
              extraData={extraData}
            />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .receipt-modal-overlay {
            padding: 0 !important;
            align-items: flex-end !important;
          }
          .receipt-modal-container {
            max-height: 96vh !important;
            border-radius: 16px 16px 0 0 !important;
            width: 100% !important;
            max-width: 100vw !important;
          }
          .receipt-scroll-viewport {
            padding: 0.4rem !important;
          }
          .receipt-inner-wrapper {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceiptModal;
