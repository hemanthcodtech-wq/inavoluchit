const bcrypt = require('bcryptjs');
const { User } = require('../models');

/**
 * Seeds or synchronizes default superadmin accounts.
 */
const seedSuperadmin = async () => {
  try {
    const targetEmail = process.env.ADMIN_EMAIL || 'admin@chit.com';
    const targetPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(targetPassword, salt);

    const targetUser = await User.findOne({ email: targetEmail });

    if (!targetUser) {
      await User.create({
        name: 'InaVolu Admin',
        email: targetEmail,
        password: hashedPassword,
        phone: '9999999999',
        role: 'superadmin',
        isApproved: true,
        aadharImgUrl: 'https://res.cloudinary.com/demo/image/upload/v12345/mock-aadhar.png',
        aadharPublicId: 'mock-aadhar',
        panImgUrl: 'https://res.cloudinary.com/demo/image/upload/v12345/mock-pan.png',
        panPublicId: 'mock-pan',
      });
      console.log(`Superadmin created: ${targetEmail} / ${targetPassword}`);
    } else if (targetUser.role !== 'superadmin' || !targetUser.isApproved) {
      await User.findByIdAndUpdate(targetUser._id, { role: 'superadmin', isApproved: true });
      console.log(`User ${targetEmail} upgraded to superadmin role.`);
    } else {
      console.log(`Superadmin account ${targetEmail} ready.`);
    }

    // Secondary fallback admin@gmail.com
    const fallback = await User.findOne({ email: 'admin@gmail.com' });
    if (!fallback) {
      await User.create({
        name: 'System Superadmin',
        email: 'admin@gmail.com',
        password: hashedPassword,
        phone: '9999999999',
        role: 'superadmin',
        isApproved: true,
      });
      console.log('Fallback superadmin admin@gmail.com ready.');
    }
  } catch (error) {
    console.error('Error seeding Superadmin:', error);
  }
};

// Allow standalone execution: `node utils/seedAdmin.js`
if (require.main === module) {
  const dotenv = require('dotenv');
  const path = require('path');
  const { connectDB } = require('../config/db');

  dotenv.config({ path: path.join(__dirname, '..', '.env') });

  connectDB()
    .then(async () => {
      await seedSuperadmin();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database connection failed:', err);
      process.exit(1);
    });
}

module.exports = {
  seedSuperadmin,
};
