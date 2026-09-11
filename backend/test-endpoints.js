const http = require('http');

const PORT = 3000;
const HOST = 'localhost';

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

async function verify() {
  console.log('=== STARTING BACKEND INTEGRATION VERIFICATION ===\n');

  // 1. Health check
  console.log('1. Testing Health Endpoint...');
  const healthRes = await request('GET', '/health');
  if (healthRes.status !== 200) {
    throw new Error(`Health check failed: ${JSON.stringify(healthRes.body)}`);
  }
  console.log('✅ Health check passed!');

  // 2. Admin Login
  console.log('\n2. Testing Admin Login...');
  const loginRes = await request('POST', '/auth/login', {
    username: 'admin',
    password: 'admin123'
  });

  if (loginRes.status !== 200 || !loginRes.body.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(loginRes.body)}`);
  }
  console.log('✅ Admin login succeeded!');
  const token = loginRes.body.token;
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  // 3. Scan Check In
  console.log('\n3. Testing Attendee Check-In Scan...');
  // QR code for attendee RISHAB.CHAVADAR
  const scanInRes = await request('POST', '/scan', {
    qrData: 'PRB-2GI24CS119',
    scanType: 'IN',
    scannedBy: 'System Admin',
    location: 'Main Entrance'
  }, authHeaders);

  if (scanInRes.status !== 200) {
    throw new Error(`Scan IN failed: ${JSON.stringify(scanInRes.body)}`);
  }
  console.log(`✅ Scan IN succeeded: ${scanInRes.body.message}`);

  // 4. Scan Check Out
  console.log('\n4. Testing Attendee Check-Out Scan...');
  const scanOutRes = await request('POST', '/scan', {
    qrData: 'PRB-2GI24CS119',
    scanType: 'OUT',
    scannedBy: 'System Admin',
    location: 'Main Entrance'
  }, authHeaders);

  if (scanOutRes.status !== 200) {
    throw new Error(`Scan OUT failed: ${JSON.stringify(scanOutRes.body)}`);
  }
  console.log(`✅ Scan OUT succeeded: ${scanOutRes.body.message}`);

  // 5. Fetch Attendance Report
  console.log('\n5. Fetching Today\'s Attendance Report...');
  const reportRes = await request('GET', '/attendance/report/today', null, authHeaders);

  if (reportRes.status !== 200) {
    throw new Error(`Report fetch failed: ${JSON.stringify(reportRes.body)}`);
  }

  console.log('✅ Attendance report fetched successfully!');
  console.table(reportRes.body);

  console.log('\n=== ALL ENDPOINT VERIFICATIONS PASSED SUCCESSFULLY ===');
}


verify().catch((err) => {
  console.error('\n❌ Verification Failed:', err.message);
  process.exit(1);
});
