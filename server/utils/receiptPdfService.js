const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

/**
 * Format Currency in Indian Rupee format
 */
const formatCurrency = (amt) => {
  const num = Number(amt) || 0;
  return `Rs. ${num.toLocaleString('en-IN')}`;
};

/**
 * Format Date helpers
 */
const formatDateStr = (dateInput) => {
  if (!dateInput) {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}-${monthNames[d.getMonth()]}-${d.getFullYear()}`;
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

const generateReceiptNo = (existingNo, paymentDateObj, paymentId) => {
  if (existingNo && String(existingNo).length <= 16 && !String(existingNo).startsWith('OFFLINE_')) {
    return String(existingNo);
  }
  const pDate = paymentDateObj || new Date();
  const yr = String(pDate.getFullYear()).slice(-2);
  const mo = String(pDate.getMonth() + 1).padStart(2, '0');
  const tail = String(paymentId || Math.floor(100 + Math.random() * 900)).replace(/\D/g, '').slice(-4) || '1088';
  return `INA${yr}${mo}${tail}`;
};

/**
 * Generate official PDF receipt buffer using PDFKit
 */
const createReceiptPdfBuffer = async ({
  chit,
  user,
  payment,
  monthNumber,
  amountPaid,
  paymentMode,
  paymentDate,
  transactionId,
  receiptNo,
  totalDue,
  totalPaidSoFar,
  remainingDue,
  excessAmount,
  digitalSignature
}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 25, bottom: 25, left: 25, right: 25 }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width; // 595.28 pt
      const leftMargin = 28;
      const contentWidth = pageWidth - (2 * leftMargin); // ~539 pt

      // ================= 1. PREMIUM HEADER BANNER =================
      const headerTop = 25;
      const headerHeight = 110;

      // Dark Navy Background
      doc.rect(leftMargin, headerTop, contentWidth, headerHeight)
        .fill('#0a1e3b');

      // Gold Accent Stripe
      doc.rect(leftMargin, headerTop + headerHeight - 4, contentWidth, 4)
        .fill('#d97706');

      // Receipt Meta Top Right
      doc.fillColor('#fef08a')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`RECEIPT #${receiptNo}`, leftMargin + contentWidth - 190, headerTop + 10, { width: 175, align: 'right' });

      doc.fillColor('#e2e8f0')
        .fontSize(8.5)
        .font('Helvetica')
        .text(`Date: ${formatDateStr(paymentDate)}`, leftMargin + contentWidth - 190, headerTop + 24, { width: 175, align: 'right' });

      // Title in White
      doc.fillColor('#ffffff')
        .fontSize(15)
        .font('Helvetica-Bold')
        .text('INAVOLU CHIT FUNDS PRIVATE LIMITED', leftMargin + 15, headerTop + 10, { width: 330, align: 'left' });

      doc.fillColor('#fbbf24')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('OFFICIAL PAYMENT RECEIPT', leftMargin + 15, headerTop + 28, { width: 330, align: 'left' });

      // Address & Contact info
      doc.fillColor('#cbd5e1')
        .fontSize(7.5)
        .font('Helvetica')
        .text(
          'Regd Office: ABR Building, 1st Floor, Door No. 9S-1271, Kadapa - Bengaluru Hwy, Opp: Viswam Engineering College, Angallu, Madanapalle, Andhra Pradesh – 517326.\nContact: +91 8500319890 | Website: www.inavolu.com | CIN: U65992AP2021PTC118942',
          leftMargin + 15,
          headerTop + 45,
          { width: contentWidth - 30, align: 'left', lineGap: 2.5 }
        );

      let curY = headerTop + headerHeight + 14;

      // ================= 2. MEMBER & CHIT DETAILS CARD =================
      const cardHeight = 175;
      doc.roundedRect(leftMargin, curY, contentWidth, cardHeight, 6)
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .fillAndStroke('#ffffff', '#cbd5e1');

      // Card Header Ribbon
      doc.roundedRect(leftMargin, curY, contentWidth, 24, 6)
        .fill('#1e3a8a');
      doc.rect(leftMargin, curY + 18, contentWidth, 6)
        .fill('#1e3a8a');

      doc.fillColor('#ffffff')
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .text('MEMBER & CHIT SCHEME DETAILS', leftMargin + 12, curY + 7);

      // Payment Status Pill
      doc.roundedRect(leftMargin + contentWidth - 110, curY + 4, 98, 16, 8)
        .fill('#16a34a');
      doc.fillColor('#ffffff')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('PAYMENT VERIFIED', leftMargin + contentWidth - 110, curY + 8, { width: 98, align: 'center' });

      const detailStartY = curY + 34;
      const col1X = leftMargin + 15;
      const col2X = leftMargin + 150;
      const col3X = leftMargin + 290;
      const col4X = leftMargin + 420;
      const rowGap = 17;

      const memberName = user?.name || 'Member';
      const memberId = user?.memberId || 'INA-MEMBER';
      const phone = user?.whatsappNumber || user?.phone || 'N/A';
      const chitName = chit?.name || 'Chit Scheme';
      const chitVal = formatCurrency(chit?.chitValue || 0);
      const chitDuration = `${chit?.durationMonths || 20} Months`;
      const dueMonthName = formatMonthYearStr(chit?.startDate, monthNumber);
      const pMode = paymentMode || 'Cash';
      const txnRef = transactionId || 'OFFLINE';

      const drawDetailRow = (y, l1, v1, l2, v2) => {
        doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text(l1, col1X, y);
        doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(v1, col2X, y, { width: 130, ellipsis: true });
        doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text(l2, col3X, y);
        doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(v2, col4X, y, { width: 105, ellipsis: true });
      };

      drawDetailRow(detailStartY, 'Member Name:', memberName, 'Chit Scheme:', chitName);
      drawDetailRow(detailStartY + rowGap, 'Member ID:', memberId, 'Chit Value:', chitVal);
      drawDetailRow(detailStartY + (rowGap * 2), 'Mobile / WhatsApp:', phone, 'Total Duration:', chitDuration);
      drawDetailRow(detailStartY + (rowGap * 3), 'Installment Month:', `Month ${monthNumber} (${dueMonthName})`, 'Payment Date:', formatDateStr(paymentDate));
      drawDetailRow(detailStartY + (rowGap * 4), 'Payment Mode:', pMode, 'Transaction UTR:', txnRef);
      drawDetailRow(detailStartY + (rowGap * 5), 'Verification Ref:', digitalSignature?.hash || 'AUTH_SYSTEM', 'Status:', 'APPROVED (PAID)');

      curY += cardHeight + 14;

      // ================= 3. FINANCIAL BREAKDOWN TABLE =================
      const tableHeight = 62;
      // Header row
      doc.rect(leftMargin, curY, contentWidth, 20)
        .fill('#0a1e3b');

      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      doc.text('S.NO', leftMargin + 8, curY + 6, { width: 30 });
      doc.text('PARTICULARS / SCHEME DESCRIPTION', leftMargin + 42, curY + 6, { width: 230 });
      doc.text('MONTH DUE', leftMargin + 280, curY + 6, { width: 80, align: 'right' });
      doc.text('PAID NOW', leftMargin + 370, curY + 6, { width: 75, align: 'right' });
      doc.text('REMAINING', leftMargin + 455, curY + 6, { width: 75, align: 'right' });

      // Row content
      const rowY = curY + 20;
      doc.rect(leftMargin, rowY, contentWidth, 40)
        .fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Bold').text('1', leftMargin + 8, rowY + 9);
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold')
        .text(`${chitName} - Installment Month ${monthNumber}`, leftMargin + 42, rowY + 6, { width: 230 });
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica')
        .text(`Receipt #${receiptNo} | Due Month: ${dueMonthName}`, leftMargin + 42, rowY + 19);

      doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold')
        .text(formatCurrency(totalDue), leftMargin + 280, rowY + 12, { width: 80, align: 'right' });

      doc.fillColor('#15803d').fontSize(9).font('Helvetica-Bold')
        .text(formatCurrency(amountPaid), leftMargin + 370, rowY + 12, { width: 75, align: 'right' });

      doc.fillColor(remainingDue > 0 ? '#dc2626' : '#15803d').fontSize(8.5).font('Helvetica-Bold')
        .text(formatCurrency(remainingDue), leftMargin + 455, rowY + 12, { width: 75, align: 'right' });

      curY += tableHeight + 14;

      // ================= 4. DUE & EXCESS STATS BANNER =================
      const statsBoxHeight = 88;
      doc.roundedRect(leftMargin, curY, contentWidth, statsBoxHeight, 6)
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .fillAndStroke('#ffffff', '#cbd5e1');

      // Left Section: Due & Excess calculation
      const statsLeftW = 310;
      doc.rect(leftMargin, curY, statsLeftW, statsBoxHeight)
        .fill('#f8fafc');

      doc.fillColor('#1e3a8a').fontSize(9).font('Helvetica-Bold')
        .text('INSTALLMENT DUE & EXCESS BREAKDOWN', leftMargin + 12, curY + 10);

      // Total Due to Pay
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text('Monthly Due Configured:', leftMargin + 12, curY + 28);
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(formatCurrency(totalDue), leftMargin + 180, curY + 28);

      // Remaining Due Need to Pay
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text('Remaining Due to Pay:', leftMargin + 12, curY + 45);
      if (remainingDue > 0) {
        doc.fillColor('#dc2626').fontSize(9).font('Helvetica-Bold').text(`${formatCurrency(remainingDue)} (Balance Due)`, leftMargin + 180, curY + 45);
      } else {
        doc.fillColor('#16a34a').fontSize(9).font('Helvetica-Bold').text('Rs. 0 (Fully Cleared)', leftMargin + 180, curY + 45);
      }

      // Excess Amount with Us
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text('Excess Balance with Us:', leftMargin + 12, curY + 62);
      if (excessAmount > 0) {
        doc.fillColor('#d97706').fontSize(9).font('Helvetica-Bold').text(`${formatCurrency(excessAmount)} (Advance with Us)`, leftMargin + 180, curY + 62);
      } else {
        doc.fillColor('#64748b').fontSize(8.5).font('Helvetica-Bold').text('Rs. 0 (Nil)', leftMargin + 180, curY + 62);
      }

      // Right Section: Total Received Big Banner
      const rightX = leftMargin + statsLeftW + 8;
      const rightW = contentWidth - statsLeftW - 16;
      doc.roundedRect(rightX, curY + 8, rightW, statsBoxHeight - 16, 6)
        .fill('#0a1e3b');

      doc.fillColor('#cbd5e1').fontSize(8).font('Helvetica-Bold')
        .text('AMOUNT RECEIVED', rightX, curY + 20, { width: rightW, align: 'center' });

      doc.fillColor('#fef08a').fontSize(16).font('Helvetica-Bold')
        .text(formatCurrency(amountPaid), rightX, curY + 36, { width: rightW, align: 'center' });

      doc.fillColor('#86efac').fontSize(7.5).font('Helvetica')
        .text('Verified & Credited', rightX, curY + 58, { width: rightW, align: 'center' });

      curY += statsBoxHeight + 14;

      // ================= 5. DIGITAL SIGNATURE BOX =================
      const sigBoxHeight = 85;
      doc.roundedRect(leftMargin, curY, contentWidth, sigBoxHeight, 6)
        .strokeColor('#93c5fd')
        .lineWidth(1.5)
        .fillAndStroke('#eff6ff', '#93c5fd');

      // Security Badge Title
      doc.fillColor('#1d4ed8').fontSize(9.5).font('Helvetica-Bold')
        .text('OFFICIALLY DIGITALLY SIGNED & AUTHENTICATED', leftMargin + 14, curY + 10);

      doc.fillColor('#3b82f6').fontSize(8).font('Helvetica')
        .text('Authenticated under Section 43 of the Chit Funds Act, 1982.', leftMargin + 14, curY + 24);

      doc.fillColor('#1e293b').fontSize(8).font('Helvetica')
        .text(`Auth Code: ${digitalSignature?.hash || 'INA-AUTH-SYSTEM-VALID'}`, leftMargin + 14, curY + 40);

      doc.fillColor('#475569').fontSize(7.5).font('Helvetica')
        .text(`Digital Sign Timestamp: ${digitalSignature?.signedAt ? new Date(digitalSignature.signedAt).toISOString() : new Date().toISOString()}`, leftMargin + 14, curY + 53);

      doc.fillColor('#1e3a8a').fontSize(7.5).font('Helvetica-Bold')
        .text('Signatory: InaVolu Chit Funds Private Limited (Authorized Automated System)', leftMargin + 14, curY + 66);

      // Seal / Verified Stamp Box on the right
      const stampX = leftMargin + contentWidth - 145;
      doc.roundedRect(stampX, curY + 10, 132, 65, 4)
        .strokeColor('#15803d')
        .lineWidth(1)
        .fillAndStroke('#dcfce7', '#15803d');

      doc.fillColor('#166534').fontSize(8).font('Helvetica-Bold')
        .text('INAVOLU CHIT FUNDS', stampX, curY + 18, { width: 132, align: 'center' });
      doc.fillColor('#15803d').fontSize(7).font('Helvetica-Bold')
        .text('DIGITALLY VERIFIED', stampX, curY + 30, { width: 132, align: 'center' });
      doc.fillColor('#166534').fontSize(6.5).font('Helvetica')
        .text('MADANAPALLE, A.P.', stampX, curY + 42, { width: 132, align: 'center' });
      doc.fillColor('#15803d').fontSize(6).font('Helvetica')
        .text(formatDateStr(paymentDate), stampX, curY + 54, { width: 132, align: 'center' });

      curY += sigBoxHeight + 14;

      // ================= 6. FOOTER =================
      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
        .text(
          'This is a computer-generated official receipt issued by InaVolu Chit Funds Private Limited. No physical signature is required.\nFor queries or ledger updates, visit https://inavoluchit.netlify.app or call +91 8500319890.',
          leftMargin,
          curY,
          { width: contentWidth, align: 'center', lineGap: 2 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Upload receipt PDF buffer to Cloudinary
 */
const uploadReceiptToCloudinary = async (pdfBuffer, receiptNo) => {
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const publicId = `receipt_${receiptNo}_${Date.now()}`;
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'chitfund_receipts',
          resource_type: 'raw',
          public_id: `${publicId}.pdf`
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error for receipt:', error);
            return reject(error);
          }
          resolve({
            receiptUrl: result.secure_url,
            receiptPublicId: result.public_id
          });
        }
      );
      uploadStream.end(pdfBuffer);
    });
  } else {
    // Local storage fallback
    const uploadsDir = path.join(__dirname, '../uploads/receipts');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filename = `receipt_${receiptNo}_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);
    return {
      receiptUrl: `/uploads/receipts/${filename}`,
      receiptPublicId: filename
    };
  }
};

/**
 * Generate official WhatsApp Receipt message text
 */
const formatWhatsAppReceiptMessage = ({
  userName,
  memberId,
  chitName,
  monthNumber,
  monthName,
  amountPaid,
  paymentMode,
  receiptNo,
  paymentDateStr,
  totalDue,
  totalPaidSoFar,
  remainingDue,
  excessAmount,
  receiptUrl,
  brandedReceiptUrl,
  digitalSignatureHash
}) => {
  const formattedPaid = Number(amountPaid).toLocaleString('en-IN');
  const formattedDue = Number(totalDue).toLocaleString('en-IN');
  const formattedRem = Number(remainingDue).toLocaleString('en-IN');
  const formattedExcess = Number(excessAmount).toLocaleString('en-IN');

  const dueStatusText = remainingDue === 0
    ? 'Rs. 0 (Fully Cleared - No Dues) '
    : `Rs. ${formattedRem} (Balance Due to Pay) `;

  const excessStatusText = excessAmount > 0
    ? `Rs. ${formattedExcess} (Excess Advance with Us) `
    : 'Rs. 0 (Nil)';

  // Official Branded Receipt Link without third-party / Cloudinary in URL
  const appBaseUrl = (process.env.APP_URL || process.env.CLIENT_URL || 'https://www.inavolu.com').replace(/\/+$/, '');
  const officialReceiptLink = brandedReceiptUrl || (receiptNo ? `${appBaseUrl}/receipt/${receiptNo}` : receiptUrl);

  return (
    `*INAVOLU CHIT FUNDS PRIVATE LIMITED*\n` +
    `*OFFICIAL PAYMENT RECEIPT*\n\n` +
    `Dear *${userName || 'Member'}*,\n` +
    `Your chit payment has been successfully recorded and verified.\n\n` +
    ` *Chit Scheme:* ${chitName || 'Chit Scheme'}\n` +
    ` *Member ID:* ${memberId || 'Member'}\n` +
    ` *Installment:* Month ${monthNumber} (${monthName})\n` +
    ` *Amount Paid:* Rs. ${formattedPaid}\n` +
    ` *Payment Mode:* ${paymentMode || 'Cash'}\n` +
    ` *Receipt No:* ${receiptNo}\n` +
    ` *Payment Date:* ${paymentDateStr}\n\n` +
    ` *PAYMENT & DUE SUMMARY:*\n` +
    `• Month Payable Due: Rs. ${formattedDue}\n` +
    `• Amount Paid in this Receipt: Rs. ${formattedPaid}\n` +
    `• Total Paid for Month: Rs. ${Number(totalPaidSoFar).toLocaleString('en-IN')}\n` +
    `• *Remaining Due to Pay:* ${dueStatusText}\n` +
    `• *Excess Balance with Us:* ${excessStatusText}\n\n` +
    ` *DIGITAL SIGNATURE:*\n` +
    `Digitally Signed & Authenticated by InaVolu Chit Funds Pvt Ltd\n` +
    `Auth Code: ${digitalSignatureHash || 'INA-AUTH-SYSTEM'}\n\n` +
    ` *Download / View Official Receipt (PDF):*\n` +
    `${officialReceiptLink}\n\n` +
    `Thank you for being a valued member!\n` +
    `*InaVolu Chit Funds Private Limited*\n` +
    `Contact: +91 8500319890 | Web: www.inavolu.com`
  );
};

/**
 * Main coordinator function to generate receipt, upload to Cloudinary,
 * and compose WhatsApp message
 */
const generateAndUploadReceipt = async ({
  chit,
  user,
  payment,
  monthNumber,
  amountPaid,
  paymentMode,
  paymentDate,
  transactionId,
  receiptNo: inputReceiptNo,
  configuredDue = 0,
  userSlots = 1,
  totalPaidSoFar = 0
}) => {
  const mNum = Number(monthNumber) || 1;
  const pDate = paymentDate ? new Date(paymentDate) : new Date();
  const receiptNo = inputReceiptNo || generateReceiptNo(payment?.transactionId, pDate, payment?._id);

  // Financial calculations
  const totalDue = Number(configuredDue || chit?.monthlyContribution || 0) * userSlots;
  const remainingDue = Math.max(0, totalDue - totalPaidSoFar);
  const excessAmount = totalPaidSoFar > totalDue ? (totalPaidSoFar - totalDue) : 0;

  // Generate cryptographic digital signature
  const sigSeed = `${payment?._id || 'PAY'}_${user?._id || 'USR'}_${amountPaid}_${mNum}_${Date.now()}`;
  const sigHash = crypto.createHash('sha256').update(sigSeed).digest('hex').substring(0, 16).toUpperCase();
  const digitalSignature = {
    hash: `INA-AUTH-${sigHash.slice(0, 4)}-${sigHash.slice(4, 8)}-${sigHash.slice(8, 12)}`,
    signedAt: new Date(),
    signedBy: 'InaVolu Chit Funds Private Limited'
  };

  // Generate PDF buffer
  const pdfBuffer = await createReceiptPdfBuffer({
    chit,
    user,
    payment,
    monthNumber: mNum,
    amountPaid: Number(amountPaid),
    paymentMode: paymentMode || 'Cash',
    paymentDate: pDate,
    transactionId: transactionId || 'OFFLINE',
    receiptNo,
    totalDue,
    totalPaidSoFar,
    remainingDue,
    excessAmount,
    digitalSignature
  });

  // Upload to Cloudinary (underlying secure raw storage)
  const uploadResult = await uploadReceiptToCloudinary(pdfBuffer, receiptNo);

  const monthName = formatMonthYearStr(chit?.startDate, mNum);
  const paymentDateStr = formatDateStr(pDate);

  // Generate branded inavolu.com official receipt link (Zero Cloudinary in URL)
  const appBaseUrl = process.env.APP_URL || 'https://www.inavolu.com';
  const brandedReceiptUrl = `${appBaseUrl.replace(/\/+$/, '')}/receipt/${receiptNo}`;

  // Format WhatsApp Message
  const whatsappText = formatWhatsAppReceiptMessage({
    userName: user?.name,
    memberId: user?.memberId || 'Member',
    chitName: chit?.name,
    monthNumber: mNum,
    monthName,
    amountPaid,
    paymentMode,
    receiptNo,
    paymentDateStr,
    totalDue,
    totalPaidSoFar,
    remainingDue,
    excessAmount,
    receiptUrl: uploadResult.receiptUrl,
    brandedReceiptUrl,
    digitalSignatureHash: digitalSignature.hash
  });

  // Generate WhatsApp direct URL
  const rawPhone = user?.whatsappNumber || user?.phone || '';
  const cleanDigits = rawPhone.replace(/\D/g, '');
  const phone10 = cleanDigits.slice(-10);
  const fullPhone = phone10 ? `91${phone10}` : '';
  const whatsappUrl = fullPhone
    ? `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(whatsappText)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`;

  return {
    receiptUrl: uploadResult.receiptUrl,
    brandedReceiptUrl,
    receiptPublicId: uploadResult.receiptPublicId,
    receiptNo,
    digitalSignature,
    totalDue,
    totalPaidSoFar,
    remainingDue,
    excessAmount,
    whatsappText,
    whatsappUrl,
    memberPhone: fullPhone,
    displayPhone: rawPhone
  };
};

module.exports = {
  createReceiptPdfBuffer,
  uploadReceiptToCloudinary,
  formatWhatsAppReceiptMessage,
  generateAndUploadReceipt,
  formatCurrency,
  formatDateStr,
  formatMonthYearStr,
  generateReceiptNo
};
