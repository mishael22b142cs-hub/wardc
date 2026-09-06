/**
 * One-shot schema sync for the hosted database.
 *
 * The serverless app never runs sequelize.sync(), so tables must be created
 * out-of-band. Run this locally (or from CI) against the target DB:
 *
 *   POSTGRES_URL="postgres://..." node scripts/db-sync.js
 *   POSTGRES_URL="postgres://..." node scripts/db-sync.js --force   # DROPS & recreates
 *
 * It loads every model + associations exactly the way server.js does.
 */
require('dotenv').config();
const { sequelize } = require('../src/config/database');

// Load all models and associations (same set server.js pulls in transitively).
const fs = require('fs');
const path = require('path');
const modelsDir = path.join(__dirname, '../src/models');
for (const file of fs.readdirSync(modelsDir)) {
  if (file.endsWith('.js') && file !== 'associations.js') {
    require(path.join(modelsDir, file));
  }
}
require('../src/models/associations');

const force = process.argv.includes('--force');
const alter = !force;

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected. Running sync', force ? '{ force: true }' : '{ alter: true }');
    await sequelize.sync({ force, alter });
    console.log('Schema sync complete.');
    process.exit(0);
  } catch (err) {
    console.error('Schema sync failed:', err);
    process.exit(1);
  }
})();
