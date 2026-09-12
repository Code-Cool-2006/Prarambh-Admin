const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS so the React Native app can communicate with the server
app.use(cors());
app.use(express.json());

// Initialize Database Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

// Middleware to authenticate JWT and verify Admin Role
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin role required' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. POST /auth/login - Admin Login
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM admin_users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify role is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Not an admin account' });
    }

    // Generate JWT Token (valid for 30 days)
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. POST /scan - Log attendee check in / check out
app.post('/scan', authenticateAdmin, async (req, res) => {
  const { qrData, scanType, scannedBy, location } = req.body;

  if (!qrData || !scanType) {
    return res.status(400).json({ error: 'qrData and scanType (IN/OUT) required' });
  }

  try {
    const trimmed = String(qrData).trim();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);

    let regRes;
    if (isUUID) {
      regRes = await pool.query(
        `SELECT * FROM registrations WHERE id = $1 OR LOWER(attendance_code) = LOWER($2)`,
        [trimmed, trimmed]
      );
    } else {
      regRes = await pool.query(
        `SELECT * FROM registrations 
         WHERE LOWER(attendance_code) = LOWER($1) 
            OR LOWER(usn) = LOWER($1) 
            OR LOWER(email) = LOWER($1)`,
        [trimmed]
      );
    }

    if (regRes.rows.length === 0) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    const reg = regRes.rows[0];

    // Insert record into the attendance table
    await pool.query(
      `INSERT INTO attendance (registration_id, scan_type, scanned_by, location, scanned_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [reg.id, scanType, scannedBy || req.user.name, location || 'Main Entrance']
    );

    res.json({
      message: `Checked ${scanType} user ${reg.name} successfully!`,
      user: {
        id: reg.id,
        name: reg.name,
        usn: reg.usn,
        college: reg.college,
        attendance_code: reg.attendance_code,
      },
    });
  } catch (err) {
    console.error('Scan logging error:', err);
    res.status(500).json({ error: 'Database logging error' });
  }
});

// 3. GET /attendance/report/today - Daily Attendance Summary & Logs
app.get('/attendance/report/today', authenticateAdmin, async (req, res) => {
  try {
    // SQL query returns stats for registered attendees: total check-ins, last IN, last OUT for today
    const query = `
      SELECT 
        r.id, 
        r.name,
        r.usn,
        r.college,
        r.attendance_code,
        COALESCE(COUNT(CASE WHEN a.scan_type = 'IN' THEN 1 END), 0)::int AS check_ins,
        MAX(CASE WHEN a.scan_type = 'IN' THEN a.scanned_at END) AS last_in,
        MAX(CASE WHEN a.scan_type = 'OUT' THEN a.scanned_at END) AS last_out
      FROM registrations r
      LEFT JOIN attendance a ON r.id = a.registration_id AND a.scanned_at >= CURRENT_DATE
      GROUP BY r.id, r.name, r.usn, r.college, r.attendance_code
      ORDER BY r.name ASC;
    `;

    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Report fetch error:', err);
    res.status(500).json({ error: 'Failed to compile today\'s report' });
  }
});

// Start Server
const server = app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${port} is already in use! The server is likely already running in another terminal.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

