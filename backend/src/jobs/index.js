/**
 * Background job logic, extracted so it can run either from node-cron
 * (local / long-running server) or from Vercel Cron HTTP endpoints
 * (serverless deployment, where it runs once per day on the Hobby plan).
 */
const { Op } = require('sequelize');
const webpush = require('web-push');

const Booking = require('../models/booking.model');
const Vehicle = require('../models/vehicle.model');
const MedicineReminder = require('../models/MedicineReminder');
const PushSubscription = require('../models/PushSubscription');
const { scrapeJobs } = require('../services/jobScraper.service');

/**
 * Send medicine reminder push notifications.
 * @param {object} opts
 * @param {boolean} opts.matchExactTime  when true, only fire for reminders whose
 *   scheduledTimes includes the current HH:MM (per-minute cron behaviour).
 *   When false (daily serverless cron), fire for every active reminder.
 */
async function runMedicineReminders({ matchExactTime = true } = {}) {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTimeString = `${hh}:${mm}`;

  const activeReminders = await MedicineReminder.findAll({ where: { isActive: true } });
  let sent = 0;

  for (const reminder of activeReminders) {
    let times = reminder.scheduledTimes || [];
    if (typeof times === 'string') {
      try { times = JSON.parse(times); } catch (e) { times = []; }
    }

    if (matchExactTime && !times.includes(currentTimeString)) continue;

    const subs = await PushSubscription.findAll({ where: { user_id: reminder.userId } });
    if (subs.length === 0) continue;

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn('[jobs] VAPID keys missing, skipping medicine reminder push');
      continue;
    }
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@wardconnect.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const payload = JSON.stringify({
      notification: {
        title: 'Time for Medicine',
        body: `It's time to take ${reminder.medicineName} (${reminder.dosage || 'prescribed dose'})`,
        icon: '/assets/icons/icon-192x192.png',
        data: { url: '/dashboard/health/medicine-reminder' }
      }
    });

    for (const sub of subs) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: { auth: sub.keys_auth, p256dh: sub.keys_p256dh }
      };
      try {
        await webpush.sendNotification(pushConfig, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await sub.destroy();
        } else {
          console.error('[jobs] Error sending push notification:', err.message);
        }
      }
    }
  }
  return { activeReminders: activeReminders.length, sent };
}

/**
 * Time out vehicle booking requests that have been pending too long and
 * release the vehicle back to the available pool.
 */
async function runBookingTimeouts({ timeoutMs = 2 * 60 * 1000 } = {}) {
  const timeoutLimit = new Date(Date.now() - timeoutMs);
  const expiredBookings = await Booking.findAll({
    where: { status: 'Pending', createdAt: { [Op.lt]: timeoutLimit } }
  });

  for (const booking of expiredBookings) {
    booking.status = 'Timeout';
    await booking.save();
    const vehicle = await Vehicle.findByPk(booking.vehicleId);
    if (vehicle) {
      vehicle.isAvailable = true;
      await vehicle.save();
    }
  }
  return { timedOut: expiredBookings.length };
}

async function runJobScrape() {
  return scrapeJobs();
}

module.exports = { runMedicineReminders, runBookingTimeouts, runJobScrape };
