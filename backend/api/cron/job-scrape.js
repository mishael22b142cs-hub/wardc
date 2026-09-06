const runCron = require('../../src/cron/run');
const { runJobScrape } = require('../../src/jobs');

module.exports = runCron('job-scrape', () => runJobScrape());
