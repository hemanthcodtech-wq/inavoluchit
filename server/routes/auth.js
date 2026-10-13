const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { User, AuditLog } = require('../models');
const { protect } = require('../middleware/authMiddleware');
const { upload, isCloudinaryConfigured } = require('../config/cloudinary');
const { logAuditEvent } = require('../utils/auditLogger');
const { sendPasswordResetOtpEmail } = require('../utils/mailer');

const { generateNextMemberId } = require('../utils/memberIdHelper');

// Configure nodemailer transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secretkey123', {
    expiresIn: '30d',
  });
};

const getFileUrl = (file) => {
  if (!file) return null;
  // Cloudinary storage sets file.path to the hosted URL.
  // Multer local storage sets file.filename.
  if (isCloudinaryConfigured) {
    return file.path;
  } else {
    return `/uploads/${file.filename}`;
  }
};

const getPublicId = (file) => {
  if (!file) return null;
  return file.filename;
};

// @route   GET /api/auth/next-member-id
// @desc    Get the next auto-generated member ID for preview
// @access  Public
router.get('/next-member-id', async (req, res) => {
  try {
    const nextMemberId = await generateNextMemberId();
    res.json({ success: true, memberId: nextMemberId });
  } catch (error) {
    console.error('Error getting next member ID:', error);
    res.status(500).json({ success: false, message: 'Error generating member ID' });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user with comprehensive details (auto-approved)
// @access  Public
router.post(
  '/register',
  upload.fields([
    { name: 'aadhar', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        memberId: requestedMemberId,
        name,
        email,
        password,
        phone,
        whatsappNumber,
        gender,
        dob,
        occupation,
        address,
        city,
        state,
        pincode,
        remarks,
        panNumber,
        aadharNumber,
        nomineeName,
        nomineeRelationship,
        nomineePhone,
        nomineeDob,
        nomineeType,
        nomineeAddress,
        nomineeRemarks,
        guarantorRequired,
        guarantorName,
        guarantorRelationship,
        guarantorPhone,
        guarantorAddress,
        guarantorKycStatus,
        securityType,
        securityValue,
        securityVerificationStatus,
        securityRemarks,
      } = req.body;

      // Mandatory validation for all registration details
      if (
        !name?.trim() ||
        !phone?.trim() ||
        !whatsappNumber?.trim() ||
        !email?.trim() ||
        !password ||
        !gender ||
        !dob ||
        !occupation?.trim() ||
        !address?.trim() ||
        !city?.trim() ||
        !state?.trim() ||
        !pincode?.trim() ||
        !aadharNumber?.trim() ||
        !panNumber?.trim() ||
        !nomineeName?.trim() ||
        !nomineeRelationship?.trim() ||
        !nomineePhone?.trim() ||
        !nomineeDob ||
        !nomineeAddress?.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'All registration details (Personal, KYC, and Nominee Information) are strictly mandatory. Please fill in all required fields.'
        });
      }

      if (!req.files?.aadhar?.[0] || !req.files?.pan?.[0]) {
        return res.status(400).json({
          success: false,
          message: 'Both Aadhaar and PAN card document uploads are mandatory.'
        });
      }

      if (guarantorRequired === 'Yes') {
        if (!guarantorName?.trim() || !guarantorRelationship?.trim() || !guarantorPhone?.trim() || !guarantorAddress?.trim() || !securityValue?.trim()) {
          return res.status(400).json({
            success: false,
            message: 'All guarantor and security details are mandatory when Guarantor Required is set to Yes.'
          });
        }
      }

      const cleanPhone = phone.trim();
      const cleanEmail = (email && email.trim()) 
        ? email.trim().toLowerCase() 
        : `${cleanPhone.replace(/\D/g, '')}@inavoluchits.com`;

      // Check if user already exists with email
      const userExists = await User.findOne({ email: cleanEmail });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'A user already exists with this email address.' });
      }

      // Check phone duplication
      const phoneExists = await User.findOne({ phone: cleanPhone });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: 'A user already exists with this mobile number.' });
      }

      const aadharFile = req.files?.aadhar?.[0];
      const panFile = req.files?.pan?.[0];

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      let memberId = (requestedMemberId && requestedMemberId.trim()) 
        ? requestedMemberId.trim() 
        : await generateNextMemberId();
      if (/^ANR/i.test(memberId)) {
        memberId = memberId.replace(/^ANR/i, 'INA');
      }

      // Create new user (automatically approved!)
      const user = await User.create({
          memberId,
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          phone: cleanPhone,
          whatsappNumber: whatsappNumber ? whatsappNumber.trim() : cleanPhone,
          role: 'user',
          isApproved: true,
          gender: gender || null,
          dob: dob || null,
          occupation: occupation || null,
          address: address || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
          remarks: remarks || null,
          panNumber: panNumber ? panNumber.trim().toUpperCase() : null,
          aadharNumber: aadharNumber ? aadharNumber.trim() : null,
          aadharImgUrl: getFileUrl(aadharFile),
          aadharPublicId: getPublicId(aadharFile),
          panImgUrl: getFileUrl(panFile),
          panPublicId: getPublicId(panFile),
          nomineeName: nomineeName ? nomineeName.trim() : null,
          nomineeRelationship: nomineeRelationship ? nomineeRelationship.trim() : null,
          nomineePhone: nomineePhone ? nomineePhone.trim() : null,
          nomineeDob: nomineeDob || null,
          nomineeType: nomineeType || 'Primary',
          nomineeAddress: nomineeAddress || null,
          nomineeRemarks: nomineeRemarks || null,
          guarantorRequired: guarantorRequired || 'No',
          guarantorName: guarantorName || null,
          guarantorRelationship: guarantorRelationship || null,
          guarantorPhone: guarantorPhone || null,
          guarantorAddress: guarantorAddress || null,
          guarantorKycStatus: guarantorKycStatus || null,
          securityType: securityType || null,
          securityValue: securityValue || null,
          securityVerificationStatus: securityVerificationStatus || null,
          securityRemarks: securityRemarks || null,
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful! Your account is active. You can now log in.',
        token: generateToken(user.id),
        user: {
          id: user.id,
          memberId: user.memberId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        }
      });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter all fields' });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    // Check for user (case-insensitive email matching)
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    let isMatch = await bcrypt.compare(cleanPassword, user.password);

    // Support standard superadmin passwords (adminpassword, admin123, admin)
    if (!isMatch && (user.role === 'superadmin' || cleanEmail === 'admin@gmail.com' || cleanEmail === 'anandareddymundla1996@gmail.com')) {
      if (cleanPassword === 'adminpassword' || cleanPassword === 'admin123' || cleanPassword === 'admin') {
        isMatch = true;
      }
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Auto-approve user if not already approved
    if (!user.isApproved) {
      await User.findByIdAndUpdate(user.id, { isApproved: true });
    }

    // Authentication successful
    if (user.role === 'superadmin' || user.role === 'employee') {
      await logAuditEvent({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role === 'superadmin' ? 'Super Admin' : 'Employee',
        module: 'auth',
        action: 'Login',
        result: 'Success',
        severity: 'Info'
      });
    }

    res.json({
      success: true,
      token: generateToken(user.id),
      user: {
        id: user.id,
        memberId: user.memberId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and record audit log
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    if (req.user && (req.user.role === 'superadmin' || req.user.role === 'employee')) {
      await logAuditEvent({
        req,
        module: 'auth',
        action: 'Logout',
        result: 'Success',
        severity: 'Info'
      });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ success: false, message: 'Server error during logout' });
  }
});


// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      res.json({
        success: true,
        user: {
          id: user.id,
          memberId: user.memberId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isApproved: user.isApproved,
          aadharImgUrl: user.aadharImgUrl,
          panImgUrl: user.panImgUrl,
        },
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error fetching profile' });
  }
});

// @route   PUT /api/auth/update-profile
// @desc    User updates their own profile details
// @access  Private
router.put('/update-profile', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name, phone, whatsappNumber,
      gender, dob, occupation,
      address, city, state, pincode,
      nomineeName, nomineeRelationship, nomineePhone, nomineeAddress
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }

    // Check phone uniqueness if changed
    if (phone && phone.trim()) {
      const existingUser = await User.findById(userId);
      if (existingUser && phone.trim() !== existingUser.phone) {
        const phoneTaken = await User.findOne({ phone: phone.trim(), _id: { $ne: userId } });
        if (phoneTaken) {
          return res.status(400).json({ success: false, message: `Phone "${phone.trim()}" is already used by another account.` });
        }
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber.trim() || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (dob !== undefined) updateData.dob = dob || null;
    if (occupation !== undefined) updateData.occupation = occupation || null;
    if (address !== undefined) updateData.address = address || null;
    if (city !== undefined) updateData.city = city || null;
    if (state !== undefined) updateData.state = state || null;
    if (pincode !== undefined) updateData.pincode = pincode || null;
    if (nomineeName !== undefined) updateData.nomineeName = nomineeName ? nomineeName.trim() : null;
    if (nomineeRelationship !== undefined) updateData.nomineeRelationship = nomineeRelationship ? nomineeRelationship.trim() : null;
    if (nomineePhone !== undefined) updateData.nomineePhone = nomineePhone ? nomineePhone.trim() : null;
    if (nomineeAddress !== undefined) updateData.nomineeAddress = nomineeAddress || null;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        memberId: updatedUser.memberId,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        whatsappNumber: updatedUser.whatsappNumber,
        role: updatedUser.role,
        isApproved: updatedUser.isApproved,
        gender: updatedUser.gender,
        dob: updatedUser.dob,
        occupation: updatedUser.occupation,
        address: updatedUser.address,
        city: updatedUser.city,
        state: updatedUser.state,
        pincode: updatedUser.pincode,
        aadharImgUrl: updatedUser.aadharImgUrl,
        panImgUrl: updatedUser.panImgUrl,
        nomineeName: updatedUser.nomineeName,
        nomineeRelationship: updatedUser.nomineeRelationship,
        nomineePhone: updatedUser.nomineePhone,
        nomineeAddress: updatedUser.nomineeAddress,
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
});

// @route   PUT /api/auth/update-documents
// @desc    Update user Aadhar and/or PAN card proof documents
// @access  Private
router.put(
  '/update-documents',
  protect,
  upload.fields([
    { name: 'aadhar', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const updateData = {};
      if (req.files && req.files.aadhar && req.files.aadhar[0]) {
        updateData.aadharImgUrl = getFileUrl(req.files.aadhar[0]);
        updateData.aadharPublicId = getPublicId(req.files.aadhar[0]);
      }
      if (req.files && req.files.pan && req.files.pan[0]) {
        updateData.panImgUrl = getFileUrl(req.files.pan[0]);
        updateData.panPublicId = getPublicId(req.files.pan[0]);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'Please select an Aadhar or PAN image to upload.' });
      }

      const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, { new: true });

      res.json({
        success: true,
        message: 'Documents updated successfully',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          isApproved: updatedUser.isApproved,
          aadharImgUrl: updatedUser.aadharImgUrl,
          panImgUrl: updatedUser.panImgUrl,
        }
      });
    } catch (error) {
      console.error('Error updating user documents:', error);
      res.status(500).json({ success: false, message: 'Failed to update documents' });
    }
  }
);

// @route   POST /api/auth/request-otp
// @desc    Request Email OTP for login
// @access  Public
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Your registration has not been approved by the Superadmin yet.',
      });
    }

    // Generate 6-digit OTP to match hor functionality
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to user
    await User.findOneAndUpdate({ email }, { otp, otpExpires });

    // Send branded email
    const from = process.env.SMTP_FROM || `"InaVolu Chit Funds" <${process.env.SMTP_EMAIL || 'anandareddymundla1996@gmail.com'}>`;
    const mailOptions = {
      from,
      to: email,
      subject: 'Your Login OTP - InaVolu Chit Funds',
      text: `Your OTP for login is ${otp}. It is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #166534; margin: 0;">INAVOLU CHIT FUNDS</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Secure Portal Login Verification</p>
          </div>
          <div style="padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Hello,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.5;">
              Use the 6-digit one-time password (OTP) below to securely log in to your <strong>InaVolu Chit Funds</strong> account:
            </p>
            <div style="text-align: center; margin: 25px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #166534; background: #ffffff; padding: 10px 24px; border-radius: 8px; border: 2px dashed #22c55e; display: inline-block;">
                ${otp}
              </span>
            </div>
            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
              ⏰ This code is valid for <strong>10 minutes</strong>. Never share your OTP with anyone.
            </p>
          </div>
          <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0;">© ${new Date().getFullYear()} InaVolu Chit Funds Private Limited. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
      }
      res.json({ success: true, message: 'OTP sent successfully' });
    });
  } catch (error) {
    console.error('Error in request-otp:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify Email OTP and login
// @access  Public
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide email and OTP' });
    }

    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Clear OTP
    await User.findOneAndUpdate({ email }, { otp: null, otpExpires: null });

    // Authentication successful
    res.json({
      success: true,
      token: generateToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Initiate password reset: generate OTP and send via Nodemailer SMTP
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your registered email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save OTP & expiry to user record
    await User.findByIdAndUpdate(user.id, { otp, otpExpires });

    // Send email using Nodemailer utility
    try {
      await sendPasswordResetOtpEmail({
        toEmail: user.email,
        userName: user.name,
        otp
      });
    } catch (mailError) {
      console.error('Failed to send OTP email via SMTP:', mailError);
      return res.status(500).json({
        success: false,
        message: 'Could not send verification email. Please check server SMTP configuration.'
      });
    }

    res.json({
      success: true,
      message: `Verification code sent to ${user.email}. Please check your inbox or spam folder.`
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({ success: false, message: 'Server error sending password reset OTP' });
  }
});

// @route   POST /api/auth/verify-reset-otp
// @desc    Verify password reset OTP
// @access  Public
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide email and verification OTP code.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const user = await User.findOne({ email: cleanEmail });

    if (!user || user.otp !== cleanOtp || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification OTP code.' });
    }

    res.json({
      success: true,
      message: 'OTP code verified successfully. You may now enter your new password.'
    });
  } catch (error) {
    console.error('Error verifying reset OTP:', error);
    res.status(500).json({ success: false, message: 'Server error verifying OTP' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Set new password after OTP verification
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please enter all required fields.' });
    }

    if (newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const user = await User.findOne({ email: cleanEmail });

    if (!user || user.otp !== cleanOtp || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP session. Please request a new password reset.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword.trim(), salt);

    await User.findByIdAndUpdate(user.id, { password: hashedPassword, otp: null, otpExpires: null });

    await logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role === 'superadmin' ? 'Super Admin' : (user.role === 'employee' ? 'Employee' : 'User'),
      module: 'auth',
      action: 'Password Reset',
      result: 'Success',
      severity: 'Info',
      details: `Password reset successfully via email OTP for ${user.name}`
    });

    res.json({
      success: true,
      message: 'Your password has been reset successfully! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
});

module.exports = router;

