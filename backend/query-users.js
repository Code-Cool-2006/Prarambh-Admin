const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_TMH3sdK0CFbR@ep-bold-flower-aoe5pbg5.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  const res = await client.query('SELECT id, name, email, website_user, qr_token FROM users LIMIT 10;');
  console.log('Sample users from database:');
  console.table(res.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
