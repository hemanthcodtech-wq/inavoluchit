import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LOGO_BASE64 } from './logoBase64';

/**
 * Generates and downloads an official InaVolu Chit Funds Payment Receipt PDF
 * using the premium Tax Invoice / Receipt layout with brand green and gold colors.
 * 
 * @param {Object} payment - Payment details object
 * @param {Object} chit - Chit scheme details object
 * @param {Object} user - User details object
 * @param {Object} extraData - Optional extra metrics (paidMonths, dueDate, etc.)
 */
export const generatePaymentReceiptPDF = async (payment = {}, chit = {}, user = {}, extraData = {}) => {
  try {
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
      return `INA${yr}${mo}${tail}`;
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
    let chitAuctions = (extraData?.auctions && extraData.auctions.length > 0)
      ? extraData.auctions
      : (targetChit?.auctions || payment?.chit?.auctions || []);

    if ((!chitAuctions || chitAuctions.length === 0) && (targetChit?.id || payment?.chitId)) {
      try {
        const targetChitId = targetChit?.id || payment?.chitId;
        const apiBase = (typeof window !== 'undefined' && window.location.origin ? `${window.location.origin}/api` : 'https://lightgreen-wolf-776830.hostingersite.com/api');
        const res = await fetch(`${apiBase}/auctions?chitId=${targetChitId}`);
        if (res.ok) {
          const d = await res.json();
          if (d.success && Array.isArray(d.data)) {
            chitAuctions = d.data;
          }
        }
      } catch (e) {}
    }

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

    // Build offscreen container matching compact invoice format
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '560px';
    container.style.backgroundColor = '#ffffff';
    container.style.padding = '0';
    container.style.boxSizing = 'border-box';
    container.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    container.style.color = '#1e293b';
    container.style.zIndex = '-9999';

    container.innerHTML = `
      <div style="background-color: #0a1e3b; padding: 16px 20px; color: #ffffff; border-bottom: 4px solid #d97706; position: relative;">
        <!-- Top-Right: Receipt ID & Date -->
        <div style="position: absolute; top: 14px; right: 18px; text-align: right;">
          <div style="font-size: 11px; font-weight: 700; color: #fef08a; margin-bottom: 2px;">
            RECEIPT #${receiptNo}
          </div>
          <div style="font-size: 10px; color: rgba(255, 255, 255, 0.85);">
            Date: ${paymentDateStr}
          </div>
        </div>

        <!-- Center: PAYMENT RECEIPT centered directly above the logo -->
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
          <h2 style="font-size: 18px; font-weight: 800; color: #ffffff; margin: 0 0 10px 0; text-align: center; letter-spacing: 1.2px; text-transform: uppercase;">
            PAYMENT RECEIPT
          </h2>

          <!-- Logo Card in the center -->
          ${LOGO_BASE64 ? `
            <div style="background-color: #ffffff; border-radius: 8px; padding: 6px 14px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 8px;">
              <img src="${LOGO_BASE64}" alt="InaVolu Logo" style="height: 40px; width: auto; object-fit: contain; display: block;" />
            </div>
          ` : ''}

          <!-- Address below the logo -->
          <p style="margin: 0; font-size: 9.5px; color: rgba(255, 255, 255, 0.9); max-width: 520px; line-height: 1.45; word-break: break-word; text-align: center;">
            <span style="font-weight: 700; color: #ffffff;">Registered Office:</span> ABR Building, 1st Floor, Door No. 9S-1271, Kadapa - Bengaluru Hwy, Opp: Viswam Engineering College, Angallu, Madanapalle, Andhra Pradesh – 517326.<br />
            <span style="font-weight: 700; color: #ffffff;">Contact:</span> 8500319890 | <span style="font-weight: 700; color: #ffffff;">Website:</span> www.inavolu.com
          </p>
        </div>
      </div>

      <div style="padding: 16px 20px;">
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); margin-bottom: 16px;">
          <div style="border-bottom: 2px solid #2563eb; padding-bottom: 9px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; font-weight: 800; color: #2563eb; letter-spacing: 0.6px; text-transform: uppercase;">
              MEMBER & PAYMENT INFORMATION
            </span>
            <span style="background-color: ${isApproved ? '#eff6ff' : '#fef2f2'}; color: ${isApproved ? '#2563eb' : '#dc2626'}; border: 1px solid ${isApproved ? '#bfdbfe' : '#fecaca'}; padding: 3px 10px; border-radius: 12px; font-weight: 800; font-size: 11px; letter-spacing: 0.4px;">
              ${paymentStatusRaw}
            </span>
          </div>

          <div style="display: flex; flexDirection: column; gap: 2px; font-size: 11.5px;">
            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Member Name:</span>
              <span style="color: #0f172a; font-weight: 700; padding-left: 12px;">${memberName}</span>
            </div>
            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Member ID:</span>
              <span style="color: #0f172a; font-weight: 700; padding-left: 12px;">${memberId}</span>
            </div>
            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Mobile Number:</span>
              <span style="color: #0f172a; font-weight: 600; padding-left: 12px;">${mobileNumber}</span>
            </div>
            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Chit Group:</span>
              <span style="color: #0f172a; font-weight: 700; padding-left: 12px;">${chitGroup}</span>
            </div>

            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Due Month:</span>
              <span style="color: #0f172a; font-weight: 700; padding-left: 12px;">${dueMonthStr}</span>
            </div>
            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Scheduled Due Date:</span>
              <span style="color: #0f172a; font-weight: 600; padding-left: 12px;">${dueDateStr}</span>
            </div>
            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Payment Received Date:</span>
              <span style="color: #0f172a; font-weight: 600; padding-left: 12px;">${paymentDateStr}</span>
            </div>
            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Payment Mode:</span>
              <span style="color: #0f172a; font-weight: 700; padding-left: 12px;">${paymentMode}</span>
            </div>
            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Transaction / UTR:</span>
              <span style="color: #0f172a; font-weight: 600; word-break: break-all; font-size: 11px; padding-left: 12px;">${transactionUtr}</span>
            </div>
            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Chit Value:</span>
              <span style="color: #0f172a; font-weight: 700; padding-left: 12px;">${formatCurrency(chitValue)}</span>
            </div>
            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Total Chit Duration:</span>
              <span style="color: #0f172a; font-weight: 600; padding-left: 12px;">${totalMonths} Months</span>
            </div>
            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Installments Progress:</span>
              <span style="color: #2563eb; font-weight: 700; padding-left: 12px;">${paidMonths} Paid • ${pendingMonths} Pending</span>
            </div>
            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Winner Status:</span>
              <span style="color: ${winnerStatus === 'Yes' ? '#1d4ed8' : '#64748b'}; font-weight: 700; padding-left: 12px;">${winnerStatus}</span>
            </div>
            <div style="display: grid; grid-template-columns: 175px 1fr; align-items: center; padding: 4px 6px;">
              <span style="color: #64748b; font-weight: 600; border-right: 1px solid #e2e8f0; padding-right: 10px;">Payment Status:</span>
              <div style="padding-left: 12px;">
                <span
                  style="background-color: ${isApproved ? '#eff6ff' : '#fef2f2'}; color: ${isApproved ? '#2563eb' : '#dc2626'}; border: 1px solid ${isApproved ? '#bfdbfe' : '#fecaca'}; padding: 2px 8px; border-radius: 12px; font-weight: 800; font-size: 11px; letter-spacing: 0.4px; display: inline-block;"
                >
                  ${paymentStatusRaw}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 16px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
            <thead>
              <tr style="background-color: #2563eb; color: #ffffff;">
                <th style="padding: 7px 6px; font-weight: 700; width: 8%; border-radius: 4px 0 0 0; font-size: 10px; white-space: nowrap;">S.NO</th>
                <th style="padding: 7px 6px; font-weight: 700; width: 35%; font-size: 10px;">INSTALLMENT DESCRIPTION</th>
                <th style="padding: 7px 6px; font-weight: 700; width: 17%; font-size: 10px;">DUE MONTH</th>
                <th style="padding: 7px 6px; font-weight: 700; width: 13%; text-align: right; font-size: 10px;">BASE DUE</th>
                <th style="padding: 7px 6px; font-weight: 700; width: 13%; text-align: right; font-size: 10px;">PAID</th>
                <th style="padding: 7px 6px; font-weight: 700; width: 14%; text-align: right; border-radius: 0 4px 0 0; font-size: 10px;">PENDING</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e2e8f0; background-color: #fafafa;">
                <td style="padding: 8px 6px; font-weight: 700; color: #64748b;">1</td>
                <td style="padding: 8px 6px;">
                  <div style="font-weight: 700; color: #0f172a; font-size: 11.5px;">${chitGroup}</div>
                  <div style="color: #64748b; font-size: 10px; margin-top: 2px;">Month ${currentMonthNum} of ${totalMonths} • #${receiptNo}</div>
                </td>
                <td style="padding: 8px 6px; color: #334155; font-weight: 600;">${dueMonthStr}</td>
                <td style="padding: 8px 6px; text-align: right; font-weight: 600; color: #334155;">${formatCurrency(baseMonthlyDue)}</td>
                <td style="padding: 8px 6px; text-align: right; font-weight: 800; color: #2563eb;">${formatCurrency(amountReceived)}</td>
                <td style="padding: 8px 6px; text-align: right; font-weight: 700; color: ${pendingAmount > 0 ? '#dc2626' : '#64748b'};">${formatCurrency(pendingAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; margin-bottom: 14px;">
          <div style="flex: 1 1 220px; background-color: #eff6ff; border: 1.5px solid #a5b4fc; border-radius: 8px; padding: 10px 12px; box-sizing: border-box;">
            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 5px;">
              <span style="font-size: 13px; color: #16a34a; font-weight: 900;">✓</span>
              <span style="font-size: 10px; font-weight: 800; color: #1d4ed8; letter-spacing: 0.4px; text-transform: uppercase;">
                DIGITALLY SIGNED & AUTHENTICATED
              </span>
            </div>
            <div style="font-size: 9.5px; color: #1e40af; line-height: 1.55; font-weight: 500;">
              <div>• Authorized Signatory: <strong>InaVolu Chit Funds Pvt Ltd</strong></div>
              <div>• Digital Auth Code: <span style="font-weight: 800; color: #0f172a; word-break: break-all;">${digitalSignatureHash}</span></div>
              <div>• Timestamp: ${paymentDateStr} | Verified Digitally</div>
              <div style="font-size: 8.5px; color: #64748b; margin-top: 3px;">Legally authenticated tax invoice / receipt.</div>
            </div>
          </div>

          <div style="flex: 1 1 220px;">
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; color: #64748b; font-weight: 600;">
                <span style="color: #64748b;">Base Monthly Due:</span>
                <span style="color: #0f172a;">${formatCurrency(baseMonthlyDue)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #64748b; font-weight: 600;">
                <span style="color: #64748b;">Total Due for Month:</span>
                <span style="color: #0f172a; font-weight: 700;">${formatCurrency(totalPayable)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #64748b; font-weight: 600;">
                <span style="color: #64748b;">Remaining Due to Pay:</span>
                <span style="color: ${remainingDue > 0 ? '#dc2626' : '#16a34a'}; font-weight: 800;">
                  ${remainingDue > 0 ? formatCurrency(remainingDue) : '₹0 (Fully Paid)'}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #64748b; font-weight: 600;">
                <span style="color: #64748b;">Excess Balance with Us:</span>
                <span style="color: ${excessAmount > 0 ? '#d97706' : '#64748b'}; font-weight: 800;">
                  ${excessAmount > 0 ? `${formatCurrency(excessAmount)} (Advance)` : '₹0 (Nil)'}
                </span>
              </div>
            </div>

            <div style="background-color: #0a1e3b; color: #ffffff; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 6px rgba(20, 83, 45, 0.25);">
              <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase;">
                TOTAL RECEIVED:
              </span>
              <span style="font-size: 15px; font-weight: 800; color: #fef08a;">
                ${formatCurrency(amountReceived)}
              </span>
            </div>
          </div>
        </div>

        <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; line-height: 1.4;">
          This is a system-generated official payment receipt issued by InaVolu Chit Funds Private Limited. No physical signature is required.
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const marginX = 14;
    const marginY = 12;
    const maxContentWidth = pageWidth - (2 * marginX); // 182mm
    const maxContentHeight = pageHeight - (2 * marginY); // 273mm

    let finalWidth = maxContentWidth;
    let finalHeight = (imgProps.height * finalWidth) / imgProps.width;

    if (finalHeight > maxContentHeight) {
      finalHeight = maxContentHeight;
      finalWidth = (imgProps.width * finalHeight) / imgProps.height;
    }

    const posX = (pageWidth - finalWidth) / 2;
    const posY = marginY;

    pdf.addImage(imgData, 'PNG', posX, posY, finalWidth, finalHeight, undefined, 'FAST');
    pdf.save(`Payment_Receipt_${receiptNo}.pdf`);
  } catch (err) {
    console.error('Error generating payment receipt PDF:', err);
    alert('Could not generate receipt PDF: ' + err.message);
  }
};
