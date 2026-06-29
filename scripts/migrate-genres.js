import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const markdownPath = path.join(__dirname, '../genre.md');

async function main() {
    console.log('Reading genre.md...');
    const mdContent = fs.readFileSync(markdownPath, 'utf8');
    
    // Parse markdown
    const lines = mdContent.split('\n');
    const genres = [];
    let currentGenre = null;

    let inList = false;
    for (const line of lines) {
        if (line.startsWith('## Daftar Genre dan Subgenre')) {
            inList = true;
            continue;
        }
        if (inList && line.startsWith('## Checklist')) {
            break;
        }

        if (inList) {
            if (line.startsWith('### ')) {
                currentGenre = {
                    name: line.replace('### ', '').trim(),
                    subgenres: []
                };
                genres.push(currentGenre);
            } else if (line.startsWith('- ') && currentGenre) {
                currentGenre.subgenres.push(line.replace('- ', '').trim());
            }
        }
    }

    console.log(`Found ${genres.length} genres and ${genres.reduce((acc, g) => acc + g.subgenres.length, 0)} subgenres.`);
    
    // Save to JSON just in case
    fs.writeFileSync(path.join(__dirname, '../genre-subgenre-dimensisuara.json'), JSON.stringify(genres, null, 2));

    const dbName = process.env.DB_NAME || 'dimensi_suara_db';
    console.log('Connecting to database:', dbName);
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
        multipleStatements: true
    });

    console.log('Connected to MySQL. Creating tables...');

    await connection.query(`
        CREATE TABLE IF NOT EXISTS genres (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL UNIQUE,
            sort_order INT DEFAULT 0,
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS subgenres (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            genre_id BIGINT UNSIGNED NOT NULL,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL,
            sort_order INT DEFAULT 0,
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE,
            UNIQUE KEY unique_genre_subgenre (genre_id, slug)
        );
    `);

    console.log('Tables created. Inserting data...');
    
    // Insert data
    let sortOrder = 1;
    for (const genre of genres) {
        const slug = genre.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        // Insert or update genre
        await connection.query(`
            INSERT INTO genres (name, slug, sort_order) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)
        `, [genre.name, slug, sortOrder]);
        
        const [genreRows] = await connection.query('SELECT id FROM genres WHERE slug = ?', [slug]);
        const genreId = genreRows[0].id;
        
        let subSortOrder = 1;
        for (const sub of genre.subgenres) {
            const subSlug = sub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            await connection.query(`
                INSERT INTO subgenres (genre_id, name, slug, sort_order) 
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)
            `, [genreId, sub, subSlug, subSortOrder]);
            subSortOrder++;
        }
        sortOrder++;
    }

    console.log('Data inserted successfully.');

    // Add columns to releases table if not exist
    console.log('Checking releases table...');
    try {
        await connection.query('SELECT genre_id FROM releases LIMIT 1');
        console.log('Column genre_id already exists in releases table.');
    } catch (e) {
        if (e.code === 'ER_BAD_FIELD_ERROR') {
            console.log('Adding genre_id and subgenre_id to releases table...');
            await connection.query(`
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
        } else {
            console.error('Error checking releases table:', e);
        }
    }

    // Mapping existing data
    console.log('Mapping existing data...');
    const [result] = await connection.query(`
        UPDATE releases r
        JOIN genres g ON LOWER(TRIM(g.name)) = LOWER(TRIM(r.genre))
        JOIN subgenres sg
          ON sg.genre_id = g.id
         AND LOWER(TRIM(sg.name)) = LOWER(TRIM(r.sub_genre))
        SET r.genre_id = g.id,
            r.subgenre_id = sg.id
        WHERE r.genre_id IS NULL OR r.subgenre_id IS NULL;
    `);
    console.log(`Mapped ${result.affectedRows} releases.`);

    await connection.end();
    console.log('Migration completed successfully.');
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
