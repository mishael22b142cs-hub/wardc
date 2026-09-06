const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const { sequelize } = require('./src/config/database');

// Import Models for Association
require('./src/models/vehicle.model');
require('./src/models/booking.model');
require('./src/models/User');
require('./src/models/PushSubscription');
require('./src/models/MedicineReminder');

// --- Shop Models & Associations ---
require('./src/models/Product');
require('./src/models/CartItem');
require('./src/models/WishlistItem');
require('./src/models/Order');
require('./src/models/OrderItem');
require('./src/models/associations');

// --- Associations handled centrally in src/models/associations.js ---

const authRoutes = require('./src/routes/authRoutes');
const jobRoutes = require('./src/routes/jobRoutes');
const meetingRoutes = require('./src/routes/meetingRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const loanRoutes = require('./src/routes/loanRoutes');
const financialRoutes = require('./src/routes/financialRoutes');
const memberRoutes = require('./src/routes/memberRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const wastePickupRoutes = require('./src/routes/wastePickupRoutes');
const wasteComplaintRoutes = require('./src/routes/wasteComplaintRoutes');
const wasteAiRoutes = require('./src/routes/wasteAiRoutes');
const houseMessageRoutes = require('./src/routes/houseMessageRoutes');
const userRoutes = require('./src/routes/userRoutes');
const vehicleRoutes = require('./src/routes/vehicleRoutes');
const { authenticate } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Public Routes
app.use('/auth', authRoutes);
app.use('/api/shop', require('./src/routes/shopRoutes')); // Shop Routes (Handling its own auth)

// Protected Routes
app.use('/api', authenticate); // Protect all OTHER API routes

// Core Routes
app.use('/api/users', userRoutes);
app.use('/api/vehicle', vehicleRoutes);
app.use('/api/job', jobRoutes);
app.use('/api/house-messages', houseMessageRoutes);
app.use('/api/bills', require('./src/routes/bill.routes'));
app.use('/api/civic-requests', require('./src/routes/civicRequest.routes'));

// Waste Management Routes
app.use('/api/waste/pickups', wastePickupRoutes);
app.use('/api/waste/complaints', wasteComplaintRoutes);
app.use('/api/waste/ai', wasteAiRoutes);

// Kudumbashree Routes
app.use('/api/kudumbashree/meeting', meetingRoutes);
app.use('/api/kudumbashree/attendance', attendanceRoutes);
app.use('/api/kudumbashree/loan', loanRoutes);
app.use('/api/kudumbashree/financial', financialRoutes);
app.use('/api/kudumbashree/member', memberRoutes);
app.use('/api/kudumbashree/report', reportRoutes);

// Health Service Routes
app.use('/api/health', require('./src/routes/healthRoutes'));
app.use('/api/push', authenticate, require('./src/routes/pushRoutes'));

// Test Route
app.get('/', (req, res) => {
  res.send('WardConnect Backend is Running');
});

// --- Long-running server only (local dev / non-serverless hosts) ---
// On Vercel the app is imported as a serverless handler: no persistent
// HTTP server, no WebSocket, no node-cron, no schema sync on cold start.
// Background jobs run there via Vercel Cron (see api/cron/*).
if (require.main === module) {
  const http = require('http');
  const cron = require('node-cron');
  const initializeWebSocket = require('./src/websocket');
  const { runMedicineReminders, runBookingTimeouts, runJobScrape } = require('./src/jobs');

  const server = http.createServer(app);
  initializeWebSocket(server);

  // Job scraping every 12 hours
  cron.schedule('0 0,12 * * *', () => {
    console.log('Running scheduled job scraping...');
    runJobScrape().catch((e) => console.error('job scrape error:', e));
  });

  // Medicine reminders every minute
  cron.schedule('* * * * *', () => {
    runMedicineReminders({ matchExactTime: true })
      .catch((e) => console.error('medicine reminder cron error:', e));
  });

  // Vehicle booking timeout every minute
  cron.schedule('* * * * *', () => {
    runBookingTimeouts()
      .catch((e) => console.error('vehicle booking timeout cron error:', e));
  });

  (async () => {
    try {
      await sequelize.authenticate();
      console.log('Database connected successfully.');
      await sequelize.sync({ alter: true });
      server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
    } catch (error) {
      console.error('Unable to connect to the database:', error);
    }
  })();
}

module.exports = app;
