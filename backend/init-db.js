require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const connectionString = process.env.DATABASE_URL;

async function initDB() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to Neon PostgreSQL database.');

  // 1. Create admin_users table
  console.log('Ensuring admin_users table exists...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      role VARCHAR(20) DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('admin_users table verified.');

  // 2. Create attendance table linked to registrations
  console.log('Ensuring attendance table exists...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
      scan_type VARCHAR(10) NOT NULL DEFAULT 'IN',
      scanned_by VARCHAR(100),
      location VARCHAR(100) DEFAULT 'Main Entrance',
      scanned_at TIMESTAMPTZ DEFAULT NOW(),
      notes TEXT
    );
  `);

  // Create index for fast lookups on attendance
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_attendance_reg_id ON attendance(registration_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_scanned_at ON attendance(scanned_at);
  `);
  console.log('attendance table and indexes verified.');


  // 4. Seed default admin user (admin / admin123)
  const existingAdmin = await client.query(`
    SELECT id FROM admin_users WHERE username = 'admin';
  `);

  if (existingAdmin.rows.length === 0) {
    console.log('Seeding default admin user...');
    const hash = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO admin_users (username, password_hash, name, email, role)
      VALUES ('admin', $1, 'System Admin', 'admin@prarambh.com', 'admin');
    `, [hash]);
    console.log('Default admin user (admin / admin123) created successfully.');
  } else {
    console.log('Default admin user already exists.');
  }

  console.log('Database initialization complete!');
  await client.end();
}

if (require.main === module) {
  initDB().catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
}

module.exports = { initDB };
