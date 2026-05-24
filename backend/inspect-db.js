const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_TMH3sdK0CFbR@ep-bold-flower-aoe5pbg5.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('--- Connecting to Neon DB ---');

  // Query tables
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `);
  
  const tables = tablesRes.rows.map(r => r.table_name);
  console.log('Tables found in database:', tables);

  for (const table of tables) {
    console.log(`\nSchema for table: ${table}`);
    const columnsRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position;
    `, [table]);
    
    console.table(columnsRes.rows);
  }

  await client.end();
}

main().catch(err => {
  console.error('Error inspecting database:', err);
  process.exit(1);
});
