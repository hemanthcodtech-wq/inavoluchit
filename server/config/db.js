const mongoose = require('mongoose');
const dns = require('dns');

// Configure reliable DNS resolvers (Google DNS & Cloudflare DNS)
// This resolves the MongoDB Atlas SRV record querySrv EREFUSED error common on local routers/ISPs.
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  console.warn('Note: Using default DNS resolvers:', dnsErr.message);
}

const connectDB = async (retryCount = 0) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      family: 4
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    if (retryCount < 5) {
      const waitTime = 3000;
      console.log(`Retrying MongoDB connection in ${waitTime / 1000}s... (Attempt ${retryCount + 1} of 5)`);
      setTimeout(() => connectDB(retryCount + 1), waitTime);
    } else {
      console.error('Fatal: Could not connect to MongoDB after 5 attempts.');
      process.exit(1);
    }
  }
};

module.exports = { connectDB };
