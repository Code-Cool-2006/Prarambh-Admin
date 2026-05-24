const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const artifactsDir = '/home/rishab/.gemini/antigravity/brain/c1d1cc02-4eaa-427c-aa14-3d14ff241a29';

const users = [
  { name: 'Aarav Sharma', token: '11111111-1111-1111-1111-111111111111', file: 'aarav.png' },
  { name: 'Isha Patel', token: '22222222-2222-2222-2222-222222222222', file: 'isha.png' },
  { name: 'Neha Gupta', token: '33333333-3333-3333-3333-333333333333', file: 'neha.png' },
  { name: 'Siddharth Roy', token: '44444444-4444-4444-4444-444444444444', file: 'siddharth.png' },
  { name: 'Priya Sharma', token: '55555555-5555-5555-5555-555555555555', file: 'priya.png' }
];

async function generate() {
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  for (const user of users) {
    const dest = path.join(artifactsDir, user.file);
    await QRCode.toFile(dest, user.token, {
      color: {
        dark: '#0F172A', // Slate 900 dark squares
        light: '#FFFFFF' // Clean white background
      },
      width: 300,
      margin: 2
    });
    console.log(`Generated QR code for ${user.name} -> ${dest}`);
  }
  console.log('All QR codes generated successfully!');
}

generate().catch(err => {
  console.error('Error generating QR codes:', err);
  process.exit(1);
});
