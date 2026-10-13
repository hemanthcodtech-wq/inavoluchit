const nodemailer = require('nodemailer');

const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_EMAIL || process.env.SMTP_USER || 'anandareddymundla1996@gmail.com';
  const pass = process.env.SMTP_PASSWORD || 'mpnxcvqfkoddwkcb';

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

const sendPasswordResetOtpEmail = async ({ toEmail, userName, otp }) => {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || `"InaVolu Chit Funds" <${process.env.SMTP_EMAIL || 'anandareddymundla1996@gmail.com'}>`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #166534; margin: 0;">INAVOLU CHIT FUNDS</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Password Reset Verification</p>
      </div>
      <div style="padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
        <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Hello <strong>${userName || 'Valued User'}</strong>,</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">
          We received a request to reset your password for your <strong>InaVolu Chit Funds</strong> account.
          Use the 6-digit OTP code below to verify your request and set a new password:
        </p>
        <div style="text-align: center; margin: 25px 0;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #166534; background: #ffffff; padding: 10px 24px; border-radius: 8px; border: 2px dashed #22c55e; display: inline-block;">
            ${otp}
          </span>
        </div>
        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
          ⏰ This code is valid for <strong>15 minutes</strong>. If you did not request this, please ignore this email.
        </p>
      </div>
      <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0;">© ${new Date().getFullYear()} InaVolu Chit Funds Private Limited. All rights reserved.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from,
    to: toEmail,
    subject: 'Password Reset Verification Code - InaVolu Chit Funds',
    text: `Your password reset OTP code is: ${otp}. Valid for 15 minutes.`,
    html: htmlContent,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  createTransporter,
  sendPasswordResetOtpEmail,
};
