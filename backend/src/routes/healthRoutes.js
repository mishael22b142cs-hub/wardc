const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const { authenticate } = require('../middleware/auth'); // Assuming this exists
const multer = require('multer');

// In-memory upload; the buffer is pushed to Vercel Blob in the controller.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Apply auth middleware to all routes
router.use(authenticate);

// Donation Routes
router.post('/donations', healthController.createDonationRequest);
router.get('/donations', healthController.getAllDonationRequests);
router.get('/donations/my', healthController.getUserDonationRequests);
router.post('/donations/:id/pledge', healthController.pledgeBloodDonation);
router.patch('/donations/:id/cancel', healthController.cancelDonationRequest);

// Medicine Reminder Routes
router.post('/medicines', healthController.addMedicineReminder);
router.get('/medicines', healthController.getMedicineReminders);
router.delete('/medicines/:id', healthController.deleteMedicineReminder);

// Health Record Routes
router.post('/records', upload.single('file'), healthController.addHealthRecord);
router.get('/records', healthController.getHealthRecords);
router.delete('/records/:id', healthController.deleteHealthRecord);

// OP Booking Routes
router.post('/op-bookings', healthController.createOpBooking);
router.get('/op-bookings/user', healthController.getUserOpBookings);
router.delete('/op-bookings/:id', healthController.cancelOpBooking);
router.get('/op-bookings/all', healthController.getAllOpBookings);
router.put('/op-bookings/:id/status', healthController.updateOpBookingStatus);

// Community Stats Routes
router.get('/community-stats', healthController.getCommunityStats);
router.post('/community-stats', healthController.updateCommunityStats);

// Insurance Scheme Routes
router.get('/insurance-schemes', healthController.getInsuranceSchemes);
router.post('/insurance-schemes', healthController.addInsuranceScheme);

module.exports = router;
