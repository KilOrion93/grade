const { Client } = require('pg');

async function test() {
  const connectionString = "postgresql://postgres.nsguzbgnhszglgxcceki:GradeClap93@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require";
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected successfully!");
    const res = await client.query('SELECT NOW()');
    console.log("Result:", res.rows[0]);
  } catch (err) {
    console.error("Connection error:", err.message);
  } finally {
    await client.end();
  }
}

test();
