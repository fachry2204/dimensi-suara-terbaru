const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dimensisuaracms',
  });

  const [rows] = await connection.query("SELECT id, title, cover_art FROM releases ORDER BY id DESC LIMIT 15");
  console.log("Releases cover_art in DB:");
  rows.forEach(r => {
    console.log(`ID: ${r.id} | Title: ${r.title} | CoverArt: "${r.cover_art}"`);
  });

  await connection.end();
}

check().catch(console.error);
