const runCron = require('../../src/cron/run');
const { runBookingTimeouts } = require('../../src/jobs');

module.exports = runCron('booking-timeout', () => runBookingTimeouts());
