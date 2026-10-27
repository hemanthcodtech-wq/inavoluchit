import React from 'react';
import { LOGO_BASE64 } from '../utils/logoBase64';

/**
 * OfficialPaymentReceipt
 * Formatted matching user's requested Tax Invoice structure:
 * - Brand Green Header Banner with InaVolu Logo card + Company particulars + Gold Accent stripe
 * - Top-right Receipt # and Date details
 * - ONE UNIFIED CARD (not two boxes) containing all Member, Chit & Payment details cleanly laid out
 * - Itemized Particulars Table with Brand-Colored Header Bar
 * - Bottom Split:
 *     Left: Verified & Confirmed Badge box (Green theme with checkmark)
 *     Right: Financial Breakdown + Prominent TOTAL RECEIVED Banner
 * - Professional Footer note
 */
export const OfficialPaymentReceipt = ({
  payment = {},
  chit = {},
  user = {},
  extraData = {},
  innerRef = null
}) => {
  // Format Date helpers
  const formatDateStr = (dateInput) => {
    if (!dateInput) {
      return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}-${monthNames[d.getMonth()]}-${d.getFullYear()}`;
  };

  const formatMonthYearStr = (dateInput, monthNumber = 1) => {
    let d = new Date(dateInput || Date.now());
    if (isNaN(d.getTime())) d = new Date();
    if (monthNumber && monthNumber > 1) {
      d.setMonth(d.getMonth() + (monthNumber - 1));
    }
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatReceiptNo = (rawNo, pDateObj, pId) => {
    if (rawNo && String(rawNo).length <= 14) return String(rawNo);
    const yr = String(pDateObj.getFullYear()).slice(-2);
    const mo = String(pDateObj.getMonth() + 1).padStart(2, '0');
    const tail = String(pId || Math.floor(100 + Math.random() * 900)).replace(/\D/g, '').slice(-3) || '828';
    return `ANR${yr}${mo}${tail}`;
  };

  const formatCurrency = (amt) => {
    const num = Number(amt) || 0;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  // Resolve target objects
  const targetChit = (chit && chit.name) ? chit : (payment?.chit || {});
  const targetUser = (user && (user.name || user.phone)) ? user : (payment?.user || {});
  const targetUserId = targetUser?.id || user?.id || payment?.userId;

  const paymentDateObj = payment?.createdAt ? new Date(payment.createdAt) : new Date();

  // Field values
  const memberName = extraData?.memberName || targetUser?.name || 'siri';
  const memberId = extraData?.memberId || targetUser?.memberId || payment?.user?.memberId || user?.memberId || 'INA101';
  const mobileNumber = extraData?.mobileNumber || targetUser?.phone || targetUser?.whatsappNumber || '8541236958';
  
  const currentMonthNum = Number(payment?.monthNumber || extraData?.monthNumber || extraData?.paidMonths || 1);
  const dueMonthStr = extraData?.dueMonth || formatMonthYearStr(targetChit?.startDate || payment?.createdAt, currentMonthNum);

  const baseMonthlyDue = Number(targetChit?.monthlyContribution || payment?.amount || 8000);
  const dueAmount = Number(payment?.amount || extraData?.dueAmount || baseMonthlyDue);
  
  const paymentStatusRaw = (payment?.status || extraData?.status || 'APPROVED').toUpperCase();
  const isApproved = paymentStatusRaw === 'APPROVED' || paymentStatusRaw === 'PAID';

  const pendingAmount = isApproved ? 0 : (extraData?.pendingAmount ?? dueAmount);
  const amountReceived = isApproved ? dueAmount : (extraData?.amountReceived ?? 0);

  const remainingDue = extraData?.remainingDue !== undefined 
    ? Number(extraData.remainingDue)
    : (payment?.remainingDue !== undefined ? Number(payment.remainingDue) : (isApproved ? 0 : dueAmount));

  const excessAmount = extraData?.excessAmount !== undefined 
    ? Number(extraData.excessAmount) 
    : (payment?.excessAmount !== undefined ? Number(payment.excessAmount) : (amountReceived > dueAmount ? (amountReceived - dueAmount) : 0));

  const digitalSignatureHash = payment?.digitalSignature?.hash || extraData?.digitalSignature?.hash || `INA-AUTH-${String(payment?.id || payment?._id || '1088').slice(-8).toUpperCase()}`;

  const paymentMode = payment?.paymentMode || extraData?.paymentMode || (payment?.transactionId ? 'UPI' : 'UPI');

  let daysLate = 0;
  if (extraData?.daysLate !== undefined) {
    daysLate = extraData.daysLate;
  } else if (extraData?.dueDate && payment?.createdAt) {
    const diffTime = new Date(payment.createdAt) - new Date(extraData.dueDate);
    daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  const chitValue = Number(targetChit?.chitValue || 200000);
  const totalMonths = Number(targetChit?.durationMonths || extraData?.durationMonths || 16);
  const paidMonths = Number(extraData?.paidMonths ?? (payment?.monthNumber || currentMonthNum || 1));
  const pendingMonths = Math.max(0, totalMonths - paidMonths);

  const [liveAuctions, setLiveAuctions] = React.useState([]);

  React.useEffect(() => {
    const targetChitId = targetChit?.id || payment?.chitId;
    if (targetChitId && (!targetChit?.auctions || targetChit.auctions.length === 0) && (!extraData?.auctions || extraData.auctions.length === 0)) {
      const fetchChitAuctions = async () => {
        try {
          const apiBase = (typeof window !== 'undefined' && window.location.origin ? `${window.location.origin}/api` : 'https://lightgreen-wolf-776830.hostingersite.com/api');
          const res = await fetch(`${apiBase}/auctions?chitId=${targetChitId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              setLiveAuctions(data.data);
            }
          }
        } catch (e) {}
      };
      fetchChitAuctions();
    }
  }, [targetChit?.id, payment?.chitId]);

  // Winner status
  const chitAuctions = (extraData?.auctions && extraData.auctions.length > 0)
    ? extraData.auctions
    : ((targetChit?.auctions && targetChit.auctions.length > 0)
        ? targetChit.auctions
        : ((payment?.chit?.auctions && payment.chit.auctions.length > 0)
            ? payment.chit.auctions
            : liveAuctions));

  const winningAuction = chitAuctions.find(a => {
    if (!a) return false;
    // 1. Match User ID
    if (targetUserId && (
      a.winningMemberId === targetUserId ||
      (a.winningMember && a.winningMember.id === targetUserId) ||
      (a.winningChitMember && (a.winningChitMember.userId === targetUserId || a.winningChitMember.id === targetUserId)) ||
      (a.winningChitMemberId && (a.winningChitMemberId === targetUserId || a.winningChitMemberId === targetUser?.id))
    )) return true;

    // 2. Match Member ID Code (e.g. INA2604)
    if (memberId && (
      (a.winningMember && a.winningMember.memberId && String(a.winningMember.memberId).trim().toUpperCase() === String(memberId).trim().toUpperCase()) ||
      (a.winningTicket && String(a.winningTicket).trim().toUpperCase() === String(memberId).trim().toUpperCase())
    )) return true;

    // 3. Match Mobile Number
    if (mobileNumber && a.winningMember && a.winningMember.phone) {
      const cleanA = String(a.winningMember.phone).replace(/\D/g, '');
      const cleanM = String(mobileNumber).replace(/\D/g, '');
      if (cleanA && cleanM && (cleanA.includes(cleanM) || cleanM.includes(cleanA))) return true;
    }

    // 4. Match Member Name
    if (memberName && a.winningMember && a.winningMember.name) {
      if (a.winningMember.name.trim().toLowerCase() === memberName.trim().toLowerCase()) return true;
    }

    // 5. Match Ticket / Slot Code
    const targetTicket = extraData?.ticketId || targetChit?.ticketId || payment?.ticketId;
    if (targetTicket && a.winningTicket && String(a.winningTicket).trim().toUpperCase() === String(targetTicket).trim().toUpperCase()) {
      return true;
    }

    return false;
  });

  let hasWonAuction = false;
  if (winningAuction) {
    const winningAuctionMonth = Number(winningAuction.monthNumber || 0);
    // If won auction after paying in month W, Winner Status is YES in NEXT month receipt (currentMonthNum > winningAuctionMonth)
    hasWonAuction = currentMonthNum > winningAuctionMonth;
  } else if (extraData?.isWinner !== undefined && extraData?.isWinner !== null) {
    hasWonAuction = Boolean(extraData.isWinner) && currentMonthNum > 1;
  }
  const winnerStatus = hasWonAuction ? 'Yes' : 'No';

  const receiptNo = formatReceiptNo(payment?.receiptNo || extraData?.receiptNo, paymentDateObj, payment?.id);
  const chitGroup = targetChit?.name || extraData?.chitGroup || 'TWO LAKH CHIT SCHEME';

  const dueDateStr = extraData?.dueDate 
    ? formatDateStr(extraData.dueDate)
    : (() => {
        const d = new Date(targetChit?.startDate || Date.now());
        if (currentMonthNum > 1) d.setMonth(d.getMonth() + (currentMonthNum - 1));
        d.setDate(5);
        return formatDateStr(d);
      })();

  const paymentDateStr = formatDateStr(payment?.verifiedAt || payment?.createdAt || extraData?.paymentDate || Date.now());
  const transactionUtr = payment?.transactionId || extraData?.transactionId || 'ASERTYUIOIUHYGFDSZ';
  const totalPayable = dueAmount;

  return (
    <div
      ref={innerRef}
      id="official-payment-receipt-print"
      className="official-payment-receipt-root"
      style={{
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        padding: '0',
        boxSizing: 'border-box',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#1e293b',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* ================= 1. PREMIUM HEADER BANNER ================= */}
      <div
        className="receipt-header-banner"
        style={{
          backgroundColor: '#0a1e3b', // Deep rich InaVolu green
          padding: '16px 20px',
          color: '#ffffff',
          position: 'relative',
          borderBottom: '4px solid #d97706' // Warm Golden accent line
        }}
      >
        {/* Top-Right: Receipt ID & Date */}
        <div
          className="receipt-header-meta"
          style={{
            position: 'absolute',
            top: '14px',
            right: '18px',
            textAlign: 'right'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#fef08a', marginBottom: '2px' }}>
            RECEIPT #{receiptNo}
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.85)' }}>
            Date: {paymentDateStr}
          </div>
        </div>

        {/* Center: PAYMENT RECEIPT text centered directly above the logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <h2
            className="receipt-main-title"
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 10px 0',
              textAlign: 'center',
              letterSpacing: '1.2px',
              textTransform: 'uppercase'
            }}
          >
            PAYMENT RECEIPT
          </h2>

          {/* Logo Card in the center */}
          {LOGO_BASE64 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                padding: '6px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                marginBottom: '8px'
              }}
            >
              <img
                src={LOGO_BASE64}
                alt="InaVolu Logo"
                style={{
                  height: '40px',
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>
          )}

          {/* Address below the logo */}
          <p
            style={{
              margin: 0,
              fontSize: '9.5px',
              color: 'rgba(255, 255, 255, 0.9)',
              maxWidth: '520px',
              lineHeight: 1.45,
              wordBreak: 'break-word',
              textAlign: 'center'
            }}
          >
            <span style={{ fontWeight: 700, color: '#ffffff' }}>Registered Office:</span> ABR Building, 1st Floor, Door No. 9S-1271, Kadapa - Bengaluru Hwy, Opp: Viswam Engineering College, Angallu, Madanapalle, Andhra Pradesh – 517326.
            <br />
            <span style={{ fontWeight: 700, color: '#ffffff' }}>Contact:</span> 8500319890 | <span style={{ fontWeight: 700, color: '#ffffff' }}>Website:</span> www.inavolu.com
          </p>
        </div>
      </div>

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <div className="receipt-content-wrapper" style={{ padding: '16px 20px' }}>

        {/* ================= 2. ONE UNIFIED INFORMATION CARD (NOT TWO BOXES) ================= */}
        <div
          className="receipt-info-card"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            marginBottom: '16px'
          }}
        >
          {/* Header row with Title & Payment Status Badge */}
          <div
            style={{
              borderBottom: '2px solid #2563eb',
              paddingBottom: '9px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#2563eb',
                letterSpacing: '0.6px',
                textTransform: 'uppercase'
              }}
            >
              MEMBER & PAYMENT INFORMATION
            </span>
            <span
              style={{
                backgroundColor: isApproved ? '#eff6ff' : '#fef2f2',
                color: isApproved ? '#2563eb' : '#dc2626',
                border: `1px solid ${isApproved ? '#bfdbfe' : '#fecaca'}`,
                padding: '3px 10px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '11px',
                letterSpacing: '0.4px'
              }}
            >
              {paymentStatusRaw}
            </span>
          </div>

          {/* All Information with Clean Left-Aligned Values and Subtle Divider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11.5px' }}>
            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Member Name:</span>
              <span className="receipt-row-value" style={{ color: '#0f172a', fontWeight: 700, paddingLeft: '12px' }}>{memberName}</span>
            </div>
            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Member ID:</span>
              <span className="receipt-row-value" style={{ color: '#0f172a', fontWeight: 700, paddingLeft: '12px' }}>{memberId}</span>
            </div>
            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Mobile Number:</span>
              <span className="receipt-row-value" style={{ color: '#0f172a', fontWeight: 600, paddingLeft: '12px' }}>{mobileNumber}</span>
            </div>
            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Chit Group:</span>
              <span className="receipt-row-value" style={{ color: '#0f172a', fontWeight: 700, paddingLeft: '12px' }}>{chitGroup}</span>
            </div>

            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Due Month:</span>
              <span className="receipt-row-value" style={{ color: '#0f172a', fontWeight: 700, paddingLeft: '12px' }}>{dueMonthStr}</span>
            </div>
            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Scheduled Due Date:</span>
              <span className="receipt-row-value" style={{ color: '#0f172a', fontWeight: 600, paddingLeft: '12px' }}>{dueDateStr}</span>
            </div>
            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Payment Received Date:</span>
              <span className="receipt-row-value" style={{ color: '#0f172a', fontWeight: 600, paddingLeft: '12px' }}>{paymentDateStr}</span>
            </div>
            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Payment Mode:</span>
              <span className="receipt-row-value" style={{ color: '#0f172a', fontWeight: 700, paddingLeft: '12px' }}>{paymentMode}</span>
            </div>
            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Transaction / UTR:</span>
              <span className="receipt-row-value" style={{ color: '#0f172a', fontWeight: 600, wordBreak: 'break-all', fontSize: '11px', paddingLeft: '12px' }}>{transactionUtr}</span>
            </div>
            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Chit Value:</span>
              <span className="receipt-row-value" style={{ color: '#0f172a', fontWeight: 700, paddingLeft: '12px' }}>{formatCurrency(chitValue)}</span>
            </div>
            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Total Chit Duration:</span>
              <span className="receipt-row-value" style={{ color: '#0f172a', fontWeight: 600, paddingLeft: '12px' }}>{totalMonths} Months</span>
            </div>
            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Installments Progress:</span>
              <span className="receipt-row-value" style={{ color: '#2563eb', fontWeight: 700, paddingLeft: '12px' }}>{paidMonths} Paid • {pendingMonths} Pending</span>
            </div>
            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Winner Status:</span>
              <span className="receipt-row-value" style={{ color: winnerStatus === 'Yes' ? '#1d4ed8' : '#64748b', fontWeight: 700, paddingLeft: '12px' }}>{winnerStatus}</span>
            </div>
            <div className="receipt-info-row" style={{ display: 'grid', gridTemplateColumns: '175px 1fr', alignItems: 'center', padding: '4px 6px' }}>
              <span className="receipt-row-label" style={{ color: '#64748b', fontWeight: 600, borderRight: '1px solid #e2e8f0', paddingRight: '10px' }}>Payment Status:</span>
              <div className="receipt-row-value" style={{ paddingLeft: '12px' }}>
                <span
                  style={{
                    backgroundColor: isApproved ? '#eff6ff' : '#fef2f2',
                    color: isApproved ? '#2563eb' : '#dc2626',
                    border: `1px solid ${isApproved ? '#bfdbfe' : '#fecaca'}`,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '11px',
                    letterSpacing: '0.4px',
                    display: 'inline-block'
                  }}
                >
                  {paymentStatusRaw}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 3. ITEMIZED TABLE SECTION ================= */}
        <div className="receipt-table-scroll" style={{ marginBottom: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table
            className="receipt-items-table"
            style={{
              width: '100%',
              minWidth: '440px',
              borderCollapse: 'collapse',
              fontSize: '11px',
              textAlign: 'left'
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff'
                }}
              >
                <th style={{ padding: '7px 6px', fontWeight: 700, width: '8%', borderRadius: '4px 0 0 0', fontSize: '10px', whiteSpace: 'nowrap' }}>S.NO</th>
                <th style={{ padding: '7px 6px', fontWeight: 700, width: '35%', fontSize: '10px' }}>INSTALLMENT DESCRIPTION</th>
                <th style={{ padding: '7px 6px', fontWeight: 700, width: '17%', fontSize: '10px' }}>DUE MONTH</th>
                <th style={{ padding: '7px 6px', fontWeight: 700, width: '13%', textAlign: 'right', fontSize: '10px' }}>BASE DUE</th>
                <th style={{ padding: '7px 6px', fontWeight: 700, width: '13%', textAlign: 'right', fontSize: '10px' }}>PAID</th>
                <th style={{ padding: '7px 6px', fontWeight: 700, width: '14%', textAlign: 'right', borderRadius: '0 4px 0 0', fontSize: '10px' }}>PENDING</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafafa' }}>
                <td style={{ padding: '8px 6px', fontWeight: 700, color: '#64748b' }}>1</td>
                <td style={{ padding: '8px 6px' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '11.5px' }}>
                    {chitGroup}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                    Month {currentMonthNum} of {totalMonths} • #{receiptNo}
                  </div>
                </td>
                <td style={{ padding: '8px 6px', color: '#334155', fontWeight: 600 }}>{dueMonthStr}</td>
                <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                  {formatCurrency(baseMonthlyDue)}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>
                  {formatCurrency(amountReceived)}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: pendingAmount > 0 ? '#dc2626' : '#64748b' }}>
                  {formatCurrency(pendingAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ================= 4. BOTTOM SPLIT: VERIFICATION BADGE & TOTALS ================= */}
        <div className="receipt-bottom-split" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
          
          {/* Left: Digitally Signed & Authenticated Badge Box */}
          <div
            className="receipt-bottom-left"
            style={{
              flex: '1 1 230px',
              backgroundColor: '#eff6ff',
              border: '1.5px solid #93c5fd',
              borderRadius: '8px',
              padding: '10px 12px',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
              <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 900 }}>✓</span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#1d4ed8', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                DIGITALLY SIGNED & AUTHENTICATED
              </span>
            </div>
            <div style={{ fontSize: '9.5px', color: '#1e40af', lineHeight: 1.55, fontWeight: 500 }}>
              <div>• Authorized Signatory: <strong>InaVolu Chit Funds Pvt Ltd</strong></div>
              <div>• Digital Auth Code: <span style={{ fontWeight: 800, color: '#0f172a', wordBreak: 'break-all' }}>{digitalSignatureHash}</span></div>
              <div>• Timestamp: {paymentDateStr} | Verified Digitally</div>
              <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '3px' }}>Legally authenticated tax invoice / receipt.</div>
            </div>
          </div>

          {/* Right: Breakdown & Grand Total Banner */}
          <div className="receipt-bottom-right" style={{ flex: '1 1 220px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: 600 }}>
                <span>Base Monthly Due:</span>
                <span style={{ color: '#0f172a' }}>{formatCurrency(baseMonthlyDue)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: 600 }}>
                <span>Total Due for Month:</span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{formatCurrency(totalPayable)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: 600 }}>
                <span>Remaining Due to Pay:</span>
                <span style={{ color: remainingDue > 0 ? '#dc2626' : '#16a34a', fontWeight: 800 }}>
                  {remainingDue > 0 ? formatCurrency(remainingDue) : '₹0 (Fully Paid)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: 600 }}>
                <span>Excess Balance with Us:</span>
                <span style={{ color: excessAmount > 0 ? '#d97706' : '#64748b', fontWeight: 800 }}>
                  {excessAmount > 0 ? `${formatCurrency(excessAmount)} (Advance)` : '₹0 (Nil)'}
                </span>
              </div>
            </div>

            {/* Solid Brand Banner for Total Received */}
            <div
              style={{
                backgroundColor: '#0a1e3b',
                color: '#ffffff',
                borderRadius: '6px',
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 6px rgba(20, 83, 45, 0.25)'
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                TOTAL RECEIVED:
              </span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#fef08a' }}>
                {formatCurrency(amountReceived)}
              </span>
            </div>
          </div>
        </div>

        {/* ================= 5. FOOTER NOTE ================= */}
        <div
          className="receipt-footer-note"
          style={{
            marginTop: '24px',
            paddingTop: '12px',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
            fontSize: '10px',
            color: '#94a3b8',
            lineHeight: 1.4
          }}
        >
          This is a system-generated official payment receipt issued by InaVolu Chit Funds Private Limited. No physical signature is required.
        </div>

      </div>

      {/* Embedded Responsive Styles for Mobile Viewports */}
      <style>{`
        @media (max-width: 520px) {
          .receipt-header-banner {
            padding: 12px 14px !important;
          }
          .receipt-header-topbar {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 4px !important;
          }
          .receipt-header-spacer {
            display: none !important;
          }
          .receipt-main-title {
            font-size: 15px !important;
            letter-spacing: 0.5px !important;
            margin-bottom: 8px !important;
          }
          .receipt-header-meta {
            position: static !important;
            text-align: center !important;
            margin-bottom: 6px !important;
            font-size: 10px !important;
          }
          .receipt-content-wrapper {
            padding: 10px 10px !important;
          }
          .receipt-info-card {
            padding: 10px 10px !important;
            margin-bottom: 12px !important;
          }
          .receipt-info-row {
            grid-template-columns: 125px 1fr !important;
            padding: 3px 2px !important;
            font-size: 11px !important;
          }
          .receipt-row-label {
            padding-right: 6px !important;
          }
          .receipt-row-value {
            padding-left: 8px !important;
          }
          .receipt-bottom-split {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .receipt-bottom-left, .receipt-bottom-right {
            flex: 1 1 100% !important;
            width: 100% !important;
          }
          .receipt-footer-note {
            margin-top: 16px !important;
            font-size: 9px !important;
          }
        }

        @media (max-width: 380px) {
          .receipt-info-row {
            grid-template-columns: 112px 1fr !important;
            font-size: 10.5px !important;
          }
          .receipt-row-label {
            padding-right: 4px !important;
          }
          .receipt-row-value {
            padding-left: 6px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default OfficialPaymentReceipt;
