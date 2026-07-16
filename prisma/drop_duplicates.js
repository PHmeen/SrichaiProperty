const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL is not set in .env file');
  process.exit(1);
}

const client = new Client({
  connectionString: connectionString,
});

async function main() {
  console.log('🔄 Connecting to the database...');
  await client.connect();
  console.log('✅ Connected.');

  console.log('🗑️ Dropping duplicate tables (User, Property, Appointment, Message)...');
  
  // Use double quotes for capitalized table names in PostgreSQL
  await client.query(`
    DROP TABLE IF EXISTS "User" CASCADE;
    DROP TABLE IF EXISTS "Property" CASCADE;
    DROP TABLE IF EXISTS "Appointment" CASCADE;
    DROP TABLE IF EXISTS "Message" CASCADE;
  `);

  console.log('✅ Duplicate tables dropped successfully.');

  // List remaining tables
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  
  console.log('\n📊 Remaining tables in database:');
  console.log(res.rows.map(r => r.table_name));
}

main()
  .catch((err) => {
    console.error('❌ Error executing drop script:', err);
  })
  .finally(() => {
    client.end();
  });
