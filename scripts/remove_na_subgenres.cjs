const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Updating releases...');
    await db.query('UPDATE releases SET subgenre_id = NULL WHERE subgenre_id IN (SELECT id FROM subgenres WHERE name = ?)', ['NA']);
    
    console.log('Updating tracks...');
    await db.query('UPDATE tracks SET subgenre_id = NULL WHERE subgenre_id IN (SELECT id FROM subgenres WHERE name = ?)', ['NA']);
    
    console.log('Deleting NA from subgenres...');
    const [result] = await db.query('DELETE FROM subgenres WHERE name = ?', ['NA']);
    console.log('Deleted rows:', result.affectedRows);
  } catch (e) {
    console.error('Error:', e);
  }
  
  await db.end();
}

run();
