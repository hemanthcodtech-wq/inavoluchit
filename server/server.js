const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connectDB } = require('./config/db');
const { seedSuperadmin } = require('./utils/seedAdmin');
const { backfillMissingMemberIds } = require('./utils/memberIdHelper');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to Database
connectDB();

const app = express();

// Middleware - Robust CORS headers for Vercel, Production Custom Domains & Local Dev
const corsOptions = {
  origin: true, // Dynamically reflect the request origin (supports https://inavolu.in, *.vercel.app, localhost)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
};
app.use(cors(corsOptions));
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

// Direct Public PDF Download / Redirect Route (e.g. /receipts/:receiptNo.pdf)
app.get(['/receipts/:receiptNo', '/receipts/:receiptNo.pdf', '/receipt/:receiptNo.pdf'], async (req, res) => {
  try {
    const { receiptNo } = req.params;
    const cleanReceiptNo = (receiptNo || '').replace(/\.pdf$/i, '').trim();
    const Payment = require('./models/Payment');
    const payment = await Payment.findOne({
      $or: [
        { receiptNo: cleanReceiptNo },
        { receiptNo: { $regex: new RegExp(`^${cleanReceiptNo}$`, 'i') } },
        { 'digitalSignature.hash': cleanReceiptNo }
      ]
    }).lean();

    if (!payment || !payment.receiptUrl) {
      return res.status(404).send('Official receipt PDF not found');
    }
    return res.redirect(payment.receiptUrl);
  } catch (err) {
    return res.status(500).send('Error loading receipt');
  }
});

// Health Check & Base Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the InaVolu ChitFund API Platform', status: 'online' });
});

// Start Server after seeding
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  await seedSuperadmin();
  await backfillMissingMemberIds();
});
