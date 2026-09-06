const runCron = require('../../src/cron/run');
const { runMedicineReminders } = require('../../src/jobs');

// Hobby-plan cron runs once/day, so we cannot match an exact HH:MM slot.
// Fire every active reminder once when the cron runs.
module.exports = runCron('medicine-reminders', () =>
  runMedicineReminders({ matchExactTime: false })
);
