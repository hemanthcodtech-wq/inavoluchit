import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LOGO_BASE64 } from './logoBase64';

/**
 * Format Currency in Indian Rupee format
 */
export const formatCurrency = (amt) => {
  const num = Number(amt) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
};

/**
 * Format Date helpers
 */
export const formatDateStr = (dateInput) => {
  if (!dateInput) {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${monthNames[d.getMonth()]}-${d.getFullYear()}`;
};

export const formatMonthYearStr = (dateInput, monthNumber = 1) => {
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

export const formatReceiptNo = (rawNo, pDateObj, pId) => {
  if (rawNo && String(rawNo).length <= 14 && !String(rawNo).startsWith('OFFLINE_')) {
    return String(rawNo);
  }
  const d = pDateObj || new Date();
  const yr = String(d.getFullYear()).slice(-2);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const tail = String(pId || Math.floor(100 + Math.random() * 900)).replace(/\D/g, '').slice(-3) || '828';
  return `INA${yr}${mo}${tail}`;
};

/**
 * Format catchy, official, domain-free WhatsApp receipt message
 */
export const formatWhatsAppReceiptText = ({
  userName,
  memberId,
  chitName,
  monthNumber,
  monthName,
  amountPaid,
  paymentMode,
  receiptNo,
  paymentDateStr,
  remainingDue = 0,
  excessAmount = 0,
  digitalSignatureHash
}) => {
  const formattedPaid = Number(amountPaid || 0).toLocaleString('en-IN');
  const formattedRem = Number(remainingDue || 0).toLocaleString('en-IN');
  const formattedExcess = Number(excessAmount || 0).toLocaleString('en-IN');

  const dueStatusText = Number(remainingDue) === 0
    ? 'Rs. 0 (Cleared)'
    : `Rs. ${formattedRem} (Due)`;

  const excessStatusText = Number(excessAmount) > 0
    ? `Rs. ${formattedExcess} (Advance)`
    : 'Rs. 0 (Nil)';

  return (
    `*INAVOLU CHIT FUNDS PRIVATE LIMITED*\n` +
    `*OFFICIAL PAYMENT RECEIPT*\n\n` +
    `Dear *${userName || 'Member'}*,\n` +
    `Your chit installment payment has been successfully recorded.\n\n` +
    `Receipt No: ${receiptNo || 'INA-RECEIPT'}\n` +
    `Chit Group: ${chitName || 'Chit Scheme'}\n` +
    `Member ID: ${memberId || 'Member'}\n` +
    `Installment: Month ${monthNumber || 1}${monthName ? ` (${monthName})` : ''}\n` +
    `Amount Paid: Rs. ${formattedPaid}\n` +
    `Payment Mode: ${paymentMode || 'Cash'}\n` +
    `Payment Date: ${paymentDateStr || 'Today'}\n\n` +
    `Due Status:\n` +
    `• Remaining Due: ${dueStatusText}\n` +
    `• Excess Balance: ${excessStatusText}\n` +
    (digitalSignatureHash ? `Auth Code: ${digitalSignatureHash}\n\n` : '\n') +
    `Thank you for being a valued member!\n` +
    `*InaVolu Chit Funds Private Limited*\n` +
    `Helpline: +91 99480 74173`
  );
};

/**
 * Extract unified payment details for receipt generation
 */
const resolveReceiptData = async (payment = {}, chit = {}, user = {}, extraData = {}) => {
  const targetChit = (chit && chit.name) ? chit : (payment?.chit || {});
  const targetUser = (user && (user.name || user.phone)) ? user : (payment?.user || {});
  const targetUserId = targetUser?.id || targetUser?._id || user?.id || user?._id || payment?.userId;

  const paymentDateObj = payment?.createdAt ? new Date(payment.createdAt) : new Date();

  const memberName = extraData?.memberName || targetUser?.name || 'Member';
  const memberId = extraData?.memberId || targetUser?.memberId || payment?.user?.memberId || user?.memberId || 'INA101';
  const mobileNumber = extraData?.mobileNumber || targetUser?.phone || targetUser?.whatsappNumber || 'N/A';

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

  const paymentMode = payment?.paymentMode || extraData?.paymentMode || (payment?.transactionId ? 'UPI' : 'Cash');

  const chitValue = Number(targetChit?.chitValue || 200000);
  const totalMonths = Number(targetChit?.durationMonths || extraData?.durationMonths || 20);
  const paidMonths = Number(extraData?.paidMonths ?? (payment?.monthNumber || currentMonthNum || 1));
  const pendingMonths = Math.max(0, totalMonths - paidMonths);

  let chitAuctions = (extraData?.auctions && extraData.auctions.length > 0)
    ? extraData.auctions
    : (targetChit?.auctions || payment?.chit?.auctions || []);

  const winningAuction = chitAuctions.find(a => {
    if (!a) return false;
    if (targetUserId && (
      a.winningMemberId === targetUserId ||
      (a.winningMember && (a.winningMember.id === targetUserId || a.winningMember._id === targetUserId)) ||
      (a.winningChitMember && (a.winningChitMember.userId === targetUserId || a.winningChitMember.id === targetUserId))
    )) return true;
    if (memberId && (
      (a.winningMember && a.winningMember.memberId && String(a.winningMember.memberId).trim().toUpperCase() === String(memberId).trim().toUpperCase()) ||
      (a.winningTicket && String(a.winningTicket).trim().toUpperCase() === String(memberId).trim().toUpperCase())
    )) return true;
    return false;
  });

  let hasWonAuction = false;
  if (winningAuction) {
    const winningAuctionMonth = Number(winningAuction.monthNumber || 0);
    hasWonAuction = currentMonthNum > winningAuctionMonth;
  } else if (extraData?.isWinner !== undefined && extraData?.isWinner !== null) {
    hasWonAuction = Boolean(extraData.isWinner) && currentMonthNum > 1;
  }
  const winnerStatus = hasWonAuction ? 'Yes' : 'No';

  const receiptNo = formatReceiptNo(payment?.receiptNo || extraData?.receiptNo, paymentDateObj, payment?.id || payment?._id);
  const chitGroup = targetChit?.name || extraData?.chitGroup || 'TWO LAKH CHIT SCHEME';

  const dueDateStr = extraData?.dueDate 
    ? formatDateStr(extraData.dueDate)
    : (() => {
        const d = new Date(targetChit?.startDate || Date.now());
        if (currentMonthNum > 1) d.setMonth(d.getMonth() + (currentMonthNum - 1));
        d.setDate(5);
        return formatDateStr(d);
      })();

  const paymentDateStr = formatDateStr(payment?.verifiedAt || payment?.paymentDate || payment?.createdAt || extraData?.paymentDate || Date.now());
  const transactionUtr = payment?.transactionId || extraData?.transactionId || 'OFFLINE';

  return {
    memberName,
    memberId,
    mobileNumber,
    currentMonthNum,
    dueMonthStr,
    baseMonthlyDue,
    dueAmount,
    paymentStatusRaw,
    isApproved,
    pendingAmount,
    amountReceived,
    remainingDue,
    excessAmount,
    digitalSignatureHash,
    paymentMode,
    chitValue,
    totalMonths,
    paidMonths,
    pendingMonths,
    winnerStatus,
    receiptNo,
    chitGroup,
    dueDateStr,
    paymentDateStr,
    transactionUtr
  };
};

/**
 * Build clean, official, simple receipt container DOM element
 * (ZERO domain/website mentions)
 */
const createReceiptContainerElement = (data) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '620px';
  container.style.backgroundColor = '#ffffff';
  container.style.padding = '0';
  container.style.boxSizing = 'border-box';
  container.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  container.style.color = '#0f172a';
  container.style.zIndex = '-9999';

  container.innerHTML = `
    <div style="background-color: #0a1e3b; padding: 18px 22px; color: #ffffff; border-bottom: 4px solid #d97706; position: relative;">
      <!-- Top Meta: Receipt No & Date -->
      <div style="position: absolute; top: 16px; right: 20px; text-align: right;">
        <div style="font-size: 11.5px; font-weight: 800; color: #fef08a; letter-spacing: 0.5px;">
          RECEIPT #${data.receiptNo}
        </div>
        <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">
          Date: ${data.paymentDateStr}
        </div>
      </div>

      <!-- Center Branding Header -->
      <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
        <div style="font-size: 10px; font-weight: 800; color: #fbbf24; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;">
          OFFICIAL PAYMENT RECEIPT
        </div>

        ${LOGO_BASE64 ? `
          <div style="background-color: #ffffff; border-radius: 8px; padding: 6px 16px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.2); margin-bottom: 8px;">
            <img src="${LOGO_BASE64}" alt="InaVolu Logo" style="height: 38px; width: auto; object-fit: contain; display: block;" />
          </div>
        ` : ''}

        <h2 style="font-size: 16px; font-weight: 900; color: #ffffff; margin: 0 0 6px 0; letter-spacing: 0.8px; text-transform: uppercase;">
          INAVOLU CHIT FUNDS PRIVATE LIMITED
        </h2>

        <p style="margin: 0; font-size: 9px; color: #cbd5e1; max-width: 540px; line-height: 1.45; text-align: center;">
          Regd Office: ABR Building, 1st Floor, Door No. 9S-1271, Kadapa - Bengaluru Hwy, Opp: Viswam Engineering College, Angallu, Madanapalle, Andhra Pradesh – 517326.<br />
          Contact: +91 99480 74173 | CIN: U65992AP2021PTC118942
        </p>
      </div>
    </div>

    <div style="padding: 18px 22px; background-color: #ffffff;">
      <!-- Member & Scheme Details Box -->
      <div style="border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; background-color: #f8fafc; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 10px;">
          <span style="font-size: 11px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.5px; text-transform: uppercase;">
            MEMBER & CHIT SCHEME DETAILS
          </span>
          <span style="background-color: #16a34a; color: #ffffff; padding: 2px 9px; border-radius: 10px; font-weight: 800; font-size: 10px; letter-spacing: 0.4px;">
            ${data.isApproved ? 'VERIFIED & PAID' : data.paymentStatusRaw}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-weight: 600;">Member Name:</span>
            <span style="color: #0f172a; font-weight: 800;">${data.memberName}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-weight: 600;">Member ID:</span>
            <span style="color: #0f172a; font-weight: 800;">${data.memberId}</span>
          </div>

          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-weight: 600;">Chit Scheme:</span>
            <span style="color: #0f172a; font-weight: 700;">${data.chitGroup}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-weight: 600;">Chit Value:</span>
            <span style="color: #0f172a; font-weight: 700;">${formatCurrency(data.chitValue)}</span>
          </div>

          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-weight: 600;">Installment Month:</span>
            <span style="color: #1e3a8a; font-weight: 800;">Month ${data.currentMonthNum} (${data.dueMonthStr})</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-weight: 600;">Duration / Progress:</span>
            <span style="color: #0f172a; font-weight: 700;">${data.paidMonths} of ${data.totalMonths} Months</span>
          </div>

          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-weight: 600;">Payment Mode:</span>
            <span style="color: #0f172a; font-weight: 700;">${data.paymentMode}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b; font-weight: 600;">Payment Date:</span>
            <span style="color: #0f172a; font-weight: 700;">${data.paymentDateStr}</span>
          </div>

          <div style="display: flex; justify-content: space-between; grid-column: span 2; border-top: 1px dashed #e2e8f0; padding-top: 6px;">
            <span style="color: #64748b; font-weight: 600;">Transaction / UTR:</span>
            <span style="color: #334155; font-weight: 700; font-family: monospace; font-size: 10.5px;">${data.transactionUtr}</span>
          </div>
        </div>
      </div>

      <!-- Financial Breakdown Card -->
      <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 12px 16px; background-color: #ffffff; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11.5px;">
          <span style="color: #64748b; font-weight: 600;">Month Payable Due:</span>
          <span style="color: #0f172a; font-weight: 700;">${formatCurrency(data.baseMonthlyDue)}</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11.5px;">
          <span style="color: #64748b; font-weight: 600;">Remaining Due to Pay:</span>
          <span style="color: ${data.remainingDue > 0 ? '#dc2626' : '#16a34a'}; font-weight: 800;">
            ${data.remainingDue > 0 ? formatCurrency(data.remainingDue) : '₹0 (Fully Cleared - No Dues)'}
          </span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 11.5px;">
          <span style="color: #64748b; font-weight: 600;">Excess Balance with Us:</span>
          <span style="color: ${data.excessAmount > 0 ? '#d97706' : '#64748b'}; font-weight: 800;">
            ${data.excessAmount > 0 ? `${formatCurrency(data.excessAmount)} (Advance)` : '₹0 (Nil)'}
          </span>
        </div>

        <!-- Highlight Total Received -->
        <div style="background-color: #0a1e3b; color: #ffffff; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;">
            TOTAL RECEIVED:
          </span>
          <span style="font-size: 17px; font-weight: 900; color: #fef08a;">
            ${formatCurrency(data.amountReceived)}
          </span>
        </div>
      </div>

      <!-- Digital Signature Badge Box -->
      <div style="background-color: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="font-size: 13px; color: #16a34a; font-weight: 900;">✓</span>
          <span style="font-size: 10.5px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.4px; text-transform: uppercase;">
            DIGITALLY SIGNED & AUTHENTICATED
          </span>
        </div>
        <div style="font-size: 9.5px; color: #1e40af; line-height: 1.5;">
          <div>• Signatory: <strong>InaVolu Chit Funds Private Limited</strong> (Automated System)</div>
          <div>• Digital Auth Code: <span style="font-weight: 800; color: #0f172a; font-family: monospace;">${data.digitalSignatureHash}</span></div>
          <div>• Verified Timestamp: ${data.paymentDateStr} | Digitally Confirmed</div>
        </div>
      </div>

      <!-- Legal Footer -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 9.5px; color: #64748b; line-height: 1.45;">
        This is a system-generated official payment receipt issued by InaVolu Chit Funds Private Limited.<br />
        No physical signature is required. For ledger updates or queries, call <strong>+91 99480 74173</strong>.
      </div>
    </div>
  `;

  return container;
};

/**
 * Render receipt HTML to canvas
 */
const renderReceiptCanvas = async (container) => {
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });
    return canvas;
  } finally {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generates and downloads the Official Payment Receipt as an Image (PNG)
 */
export const generatePaymentReceiptImage = async (payment = {}, chit = {}, user = {}, extraData = {}) => {
  try {
    const data = await resolveReceiptData(payment, chit, user, extraData);
    const container = createReceiptContainerElement(data);
    const canvas = await renderReceiptCanvas(container);

    const imgData = canvas.toDataURL('image/png');
    const fileName = `Payment_Receipt_${data.receiptNo}.png`;

    // Download PNG
    const link = document.createElement('a');
    link.href = imgData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Convert to Blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    return {
      success: true,
      blob,
      dataUrl: imgData,
      receiptNo: data.receiptNo,
      fileName,
      data
    };
  } catch (err) {
    console.error('Error generating payment receipt image:', err);
    throw err;
  }
};

/**
 * Generates receipt image blob & dataUrl without automatically downloading
 */
export const getReceiptImageBlob = async (payment = {}, chit = {}, user = {}, extraData = {}) => {
  try {
    const data = await resolveReceiptData(payment, chit, user, extraData);
    const container = createReceiptContainerElement(data);
    const canvas = await renderReceiptCanvas(container);

    const imgData = canvas.toDataURL('image/png');
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const fileName = `Payment_Receipt_${data.receiptNo}.png`;

    return {
      success: true,
      blob,
      dataUrl: imgData,
      receiptNo: data.receiptNo,
      fileName,
      data
    };
  } catch (err) {
    console.error('Error getting receipt image blob:', err);
    throw err;
  }
};

/**
 * Copy receipt image PNG directly to clipboard for instant Ctrl+V into WhatsApp
 */
export const copyReceiptImageToClipboard = async (blobInput) => {
  try {
    if (!navigator.clipboard || !window.ClipboardItem) {
      return false;
    }
    const item = new ClipboardItem({ 'image/png': blobInput });
    await navigator.clipboard.write([item]);
    return true;
  } catch (err) {
    console.warn('Could not copy image to clipboard automatically:', err);
    return false;
  }
};

/**
 * Generates and downloads an official InaVolu Chit Funds Payment Receipt PDF
 */
export const generatePaymentReceiptPDF = async (payment = {}, chit = {}, user = {}, extraData = {}) => {
  try {
    const data = await resolveReceiptData(payment, chit, user, extraData);
    const container = createReceiptContainerElement(data);
    const canvas = await renderReceiptCanvas(container);

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
    pdf.save(`Payment_Receipt_${data.receiptNo}.pdf`);
  } catch (err) {
    console.error('Error generating payment receipt PDF:', err);
    alert('Could not generate receipt PDF: ' + (err.message || ''));
  }
};
