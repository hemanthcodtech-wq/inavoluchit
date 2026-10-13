const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connectDB } = require('./config/db');
const { AuditLog } = require('./models');
const { seedSuperadmin } = require('./utils/seedAdmin');
const { backfillMissingMemberIds } = require('./utils/memberIdHelper');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to Database
connectDB();

const app = express();

// Middleware - Explicit CORS headers for Hostinger CDN & Cross-Origin Requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local upload files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes (supporting both /api/... and root /...)
app.use('/api/auth', require('./routes/auth'));
app.use('/auth', require('./routes/auth'));

app.use('/api/chits', require('./routes/chits'));
app.use('/chits', require('./routes/chits'));

app.use('/api/payments', require('./routes/payments'));
app.use('/payments', require('./routes/payments'));

app.use('/api/admin', require('./routes/admin'));
app.use('/admin', require('./routes/admin'));

app.use('/api/auctions', require('./routes/auctions'));
app.use('/auctions', require('./routes/auctions'));

app.use('/api/documents', require('./routes/documents'));
app.use('/documents', require('./routes/documents'));

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the ChitFund Management Platform API' });
});

const updateLegacyAuditLogs = async () => {
  try {
    await AuditLog.updateMany({ action: 'Delete Group Document' }, { action: 'Deleted Chit Scheme' });
    await AuditLog.updateMany({ action: 'Create Chit Group' }, { action: 'Created Chit Scheme' });
  } catch (err) {
    console.error('Error updating legacy audit log action names:', err);
  }
};

// Start Server after seeding and audit log migration
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await seedSuperadmin();
  await updateLegacyAuditLogs();
  await backfillMissingMemberIds();
});
