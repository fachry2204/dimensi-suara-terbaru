const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dimensisuara',
  });

  try {
    console.log('Creating genres table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS genres (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_genres_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Creating subgenres table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS subgenres (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        genre_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_subgenres_genre_slug (genre_id, slug),
        CONSTRAINT fk_subgenres_genre FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Adding columns to releases...');
    try {
      await connection.execute(`
        ALTER TABLE releases
          ADD COLUMN genre_id BIGINT UNSIGNED NULL,
          ADD COLUMN subgenre_id BIGINT UNSIGNED NULL,
          ADD KEY idx_releases_genre_id (genre_id),
          ADD KEY idx_releases_subgenre_id (subgenre_id),
          ADD CONSTRAINT fk_releases_genre FOREIGN KEY (genre_id)
            REFERENCES genres(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          ADD CONSTRAINT fk_releases_subgenre FOREIGN KEY (subgenre_id)
            REFERENCES subgenres(id) ON UPDATE CASCADE ON DELETE RESTRICT;
      `);
      console.log('Columns added successfully.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Columns already exist.');
      } else {
        console.log('Error adding columns, they might already exist:', e.message);
      }
    }

    console.log('Loading JSON data...');
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../genre-subgenre-dimensisuara.json'), 'utf8'));

    for (let i = 0; i < data.length; i++) {
      const genre = data[i];
      const genreSlug = genre.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      let [existingGenre] = await connection.execute('SELECT id FROM genres WHERE slug = ?', [genreSlug]);
      let genreId;
      if (existingGenre.length === 0) {
        const [result] = await connection.execute(
          'INSERT INTO genres (name, slug, sort_order) VALUES (?, ?, ?)',
          [genre.name, genreSlug, i + 1]
        );
        genreId = result.insertId;
      } else {
        genreId = existingGenre[0].id;
      }

      for (let j = 0; j < genre.subgenres.length; j++) {
        const subgenreName = genre.subgenres[j];
        const subgenreSlug = subgenreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        let [existingSub] = await connection.execute(
          'SELECT id FROM subgenres WHERE genre_id = ? AND slug = ?',
          [genreId, subgenreSlug]
        );
        if (existingSub.length === 0) {
          await connection.execute(
            'INSERT INTO subgenres (genre_id, name, slug, sort_order) VALUES (?, ?, ?, ?)',
            [genreId, subgenreName, subgenreSlug, j + 1]
          );
        }
      }
    }
    console.log('Data loaded successfully.');

    console.log('Mapping old data...');
    // We should only do this if releases table actually exists and has genre and subgenre columns
    // We can just try-catch this block
    try {
      await connection.execute(`
        UPDATE releases r
        JOIN genres g ON LOWER(TRIM(g.name)) = LOWER(TRIM(r.genre))
        JOIN subgenres sg
          ON sg.genre_id = g.id
         AND LOWER(TRIM(sg.name)) = LOWER(TRIM(r.subgenre))
        SET r.genre_id = g.id,
            r.subgenre_id = sg.id
        WHERE r.genre_id IS NULL OR r.subgenre_id IS NULL;
      `);
      console.log('Mapping complete.');
    } catch (e) {
      console.log('Mapping skipped or failed (possibly columns do not exist):', e.message);
    }

    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

run();
