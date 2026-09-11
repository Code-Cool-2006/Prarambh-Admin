require('dotenv').config();
const { Client } = require('pg');
const { initDB } = require('./init-db');

const connectionString = process.env.DATABASE_URL;

async function seed() {
  console.log('--- Initializing database schema & admin account ---');
  await initDB();

  const client = new Client({ connectionString });
  await client.connect();

  const regCount = await client.query('SELECT COUNT(*) FROM registrations;');
  console.log(`Total registrations in database: ${regCount.rows[0].count}`);

  const sample = await client.query('SELECT id, name, usn, college, attendance_code FROM registrations LIMIT 5;');
  console.log('Current attendee registrations:');
  console.table(sample.rows);

  await client.end();
  console.log('Seed check complete!');
}

seed().catch((err) => {
  console.error('Error in seed process:', err);
  process.exit(1);
});

