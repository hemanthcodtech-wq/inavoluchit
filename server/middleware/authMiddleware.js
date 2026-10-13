const jwt = require('jsonwebtoken');
const { User } = require('../models');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey123');

      // Get user from the token (excluding password)
      const user = await User.findById(decoded.id).select('-password').lean();
      if (user) {
        user.id = user._id ? user._id.toString() : user.id;
        req.user = user;
      }

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as superadmin' });
  }
};

// Allows both superadmin and employee roles
const staff = (req, res, next) => {
  if (req.user && (req.user.role === 'superadmin' || req.user.role === 'employee')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as staff' });
  }
};

module.exports = { protect, admin, staff };
