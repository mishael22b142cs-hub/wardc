const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

// Hosted Postgres (Vercel Postgres / Neon / Supabase) exposes a single
// connection string. Prefer it; fall back to discrete DB_* vars for local dev.
const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    null;

// Enable SSL for hosted databases (required by Neon/Supabase/Vercel PG).
const useSsl =
    process.env.DB_SSL === 'true' ||
    (connectionString && !/localhost|127\.0\.0\.1/.test(connectionString));

const common = {
    dialect: 'postgres',
    logging: false, // Set to true to see SQL queries
    dialectOptions: useSsl
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
    pool: { max: 5, min: 0, idle: 10000, acquire: 30000 },
};

const sequelize = connectionString
    ? new Sequelize(connectionString, common)
    : new Sequelize(
        process.env.DB_NAME || 'wardconnect',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || process.env.DB_PASS || 'postgres',
        {
            host: process.env.DB_HOST || 'localhost',
            ...common,
        }
    );

module.exports = { sequelize };
