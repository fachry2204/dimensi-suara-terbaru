const fs = require('fs');
const path = require('path');
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

  const [rows] = await connection.query("SELECT id, title, cover_art FROM releases ORDER BY id DESC LIMIT 20");
  
  const uploadRoots = [
    process.env.UPLOADS_DIR,
    path.join(process.cwd(), "uploads"),
    path.join(process.cwd(), "public", "uploads"),
  ].filter(Boolean);

  console.log("Checking disk paths for cover_art:");
  for (const r of rows) {
    if (!r.cover_art || r.cover_art === "null") continue;

    const relPath = r.cover_art.replace(/^\\?\/uploads\\?\/|^uploads\\?\//, '');
    let foundOnDisk = false;
    let diskLocation = '';

    for (const root of uploadRoots) {
      const fullPath = path.join(root, relPath);
      if (fs.existsSync(fullPath)) {
        foundOnDisk = true;
        diskLocation = fullPath;
        break;
      }
    }

    console.log(`[${foundOnDisk ? 'EXISTS' : 'MISSING'}] ID: ${r.id} | ${r.title}`);
    if (foundOnDisk) {
      console.log(`   -> Found at: ${diskLocation}`);
    } else {
      console.log(`   -> Checked relPath: ${relPath}`);
      for (const root of uploadRoots) {
        console.log(`      Checked: ${path.join(root, relPath)}`);
      }
    }
  }

  await connection.end();
}

check().catch(console.error);
