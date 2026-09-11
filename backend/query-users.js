require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_zTDa4jZl9VSE@ep-shy-fog-b3c0a8px.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  // Check if users or registrations exist
  const tableCheck = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('users', 'registrations');
  `);
  const tables = tableCheck.rows.map(r => r.table_name);

  if (tables.includes('registrations')) {
    const res = await client.query('SELECT id, name, email, usn, college, payment_status, attendance_code FROM registrations LIMIT 10;');
    console.log('Sample registrations from database:');
    console.table(res.rows);
  }

  if (tables.includes('users')) {
    const res = await client.query('SELECT id, name, email, website_user, role, qr_token FROM users LIMIT 10;');
    console.log('Sample users from database:');
    console.table(res.rows);
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
