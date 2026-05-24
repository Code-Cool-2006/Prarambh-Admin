require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const connectionString = process.env.DATABASE_URL;

async function seed() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to Neon PostgreSQL database.');

  // 1. Check if the 'role' column exists in 'users', and add it if not
  const checkRoleRes = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role';
  `);

  if (checkRoleRes.rows.length === 0) {
    console.log("Altering 'users' table to add 'role' column...");
    await client.query(`
      ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
    `);
    console.log("'role' column added successfully.");
  } else {
    console.log("'role' column already exists in 'users' table.");
  }

  // 2. Clear out any old test data if present to make seeding clean and repeatable
  // Warning: in production, you would only seed once. We'll do it safely.
  console.log('Cleaning up old test users...');
  await client.query(`
    DELETE FROM users 
    WHERE website_user IN ('admin', 'aarav', 'isha', 'neha', 'siddharth', 'priya');
  `);

  // 3. Create Admin User
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  console.log('Inserting Admin User...');
  await client.query(`
    INSERT INTO users (name, email, website_user, website_pass, role)
    VALUES ('System Admin', 'admin@prarambh.com', 'admin', $1, 'admin');
  `, [adminPasswordHash]);

  // 4. Create Mock Attendees (Users)
  const dummyPasswordHash = await bcrypt.hash('password123', 10);
  const mockUsers = [
    {
      name: 'Aarav Sharma',
      email: 'aarav@prarambh.com',
      website_user: 'aarav',
      qr_token: '11111111-1111-1111-1111-111111111111',
    },
    {
      name: 'Isha Patel',
      email: 'isha@prarambh.com',
      website_user: 'isha',
      qr_token: '22222222-2222-2222-2222-222222222222',
    },
    {
      name: 'Neha Gupta',
      email: 'neha@prarambh.com',
      website_user: 'neha',
      qr_token: '33333333-3333-3333-3333-333333333333',
    },
    {
      name: 'Siddharth Roy',
      email: 'siddharth@prarambh.com',
      website_user: 'siddharth',
      qr_token: '44444444-4444-4444-4444-444444444444',
    },
    {
      name: 'Priya Sharma',
      email: 'priya@prarambh.com',
      website_user: 'priya',
      qr_token: '55555555-5555-5555-5555-555555555555',
    },
  ];

  console.log('Inserting mock attendees...');
  for (const user of mockUsers) {
    await client.query(`
      INSERT INTO users (name, email, website_user, website_pass, role, qr_token)
      VALUES ($1, $2, $3, $4, 'user', $5);
    `, [user.name, user.email, user.website_user, dummyPasswordHash, user.qr_token]);
  }

  console.log('Database seeded successfully!');
  await client.end();
}

seed().catch((err) => {
  console.error('Error seeding database:', err);
  process.exit(1);
});
