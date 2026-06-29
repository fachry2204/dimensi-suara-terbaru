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
    console.log('Migrating releases...');
    // Add columns if they don't exist
    try {
      await db.query(`ALTER TABLE releases ADD COLUMN current_step INT DEFAULT 1`);
    } catch (e) { /* ignore if exists */ }
    try {
      await db.query(`ALTER TABLE releases ADD COLUMN record_label_id BIGINT UNSIGNED NULL`);
    } catch (e) { /* ignore if exists */ }

    console.log('Creating release_uploads...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS release_uploads (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        release_id INT NULL,
        track_id INT NULL,
        upload_session_id VARCHAR(255) NOT NULL,
        file_purpose VARCHAR(100) NOT NULL,
        file_path VARCHAR(255) NULL,
        original_name VARCHAR(255) NULL,
        mime_type VARCHAR(100) NULL,
        file_size BIGINT UNSIGNED NULL,
        duration_seconds INT NULL,
        sample_rate INT NULL,
        bit_depth INT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_upload_session (upload_session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Creating track_artists...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS track_artists (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        track_id INT NOT NULL,
        artist_id BIGINT UNSIGNED NULL,
        role VARCHAR(100) NOT NULL DEFAULT 'PRIMARY',
        sequence_number INT DEFAULT 1,
        CONSTRAINT fk_track_artists_track FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Creating track_production_credits...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS track_production_credits (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        track_id INT NOT NULL,
        role_id BIGINT UNSIGNED NULL,
        role_name VARCHAR(255) NULL,
        name VARCHAR(255) NOT NULL,
        sequence_number INT DEFAULT 1,
        CONSTRAINT fk_track_prod_track FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Creating track_songwriters...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS track_songwriters (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        track_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        sequence_number INT DEFAULT 1,
        CONSTRAINT fk_track_songwriters_track FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Creating track_lyricists...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS track_lyricists (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        track_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        sequence_number INT DEFAULT 1,
        CONSTRAINT fk_track_lyricists_track FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Creating track_additional_writers...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS track_additional_writers (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        track_id INT NOT NULL,
        role_id BIGINT UNSIGNED NULL,
        role_name VARCHAR(255) NULL,
        name VARCHAR(255) NOT NULL,
        sequence_number INT DEFAULT 1,
        CONSTRAINT fk_track_addwriters_track FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Creating record_labels...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS record_labels (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('All migrations for step1.md applied successfully!');
  } catch(e) {
    console.error('Migration failed:', e);
  }
  await db.end();
}

run();
