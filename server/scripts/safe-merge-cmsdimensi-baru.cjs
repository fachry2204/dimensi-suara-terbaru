const fs = require("fs");
const mysql = require("mysql2/promise");

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function tableColumns(connection, schema, table) {
  const [rows] = await connection.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ?
     ORDER BY ordinal_position`,
    [schema, table]
  );
  return rows.map((row) => row.COLUMN_NAME || row.column_name);
}

async function cloneDatabase(connection, sourceDb, backupDb) {
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${backupDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const [tables] = await connection.query("SHOW FULL TABLES FROM `" + sourceDb + "` WHERE Table_type = 'BASE TABLE'");
  for (const row of tables) {
    const table = Object.values(row)[0];
    await connection.query(`CREATE TABLE IF NOT EXISTS \`${backupDb}\`.\`${table}\` LIKE \`${sourceDb}\`.\`${table}\``);
    const [[count]] = await connection.query(`SELECT COUNT(*) AS total FROM \`${backupDb}\`.\`${table}\``);
    if (Number(count.total) === 0) {
      await connection.query(`INSERT INTO \`${backupDb}\`.\`${table}\` SELECT * FROM \`${sourceDb}\`.\`${table}\``);
    }
  }
}

async function insertMissingById(connection, { sourceDb, targetDb, table, sourceWhere = "1=1" }) {
  const targetColumns = await tableColumns(connection, targetDb, table);
  const sourceColumns = await tableColumns(connection, sourceDb, table);
  const columns = targetColumns.filter((column) => sourceColumns.includes(column));
  const columnSql = columns.map((column) => `\`${column}\``).join(", ");
  const selectSql = columns.map((column) => `s.\`${column}\``).join(", ");
  const [result] = await connection.query(
    `INSERT INTO \`${targetDb}\`.\`${table}\` (${columnSql})
     SELECT ${selectSql}
     FROM \`${sourceDb}\`.\`${table}\` s
     LEFT JOIN \`${targetDb}\`.\`${table}\` t ON t.id = s.id
     WHERE t.id IS NULL AND ${sourceWhere}`
  );
  return result.affectedRows || 0;
}

async function main() {
  loadEnv(".env");
  const targetDb = process.env.DB_NAME;
  const sourceDb = process.env.MERGE_SOURCE_DB || "cmsdimensi_baru_staging_20260713";
  const backupDb = process.env.MERGE_BACKUP_DB || `${targetDb}_backup_before_merge_20260713`;

  if (!targetDb) throw new Error("DB_NAME belum diatur.");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  await connection.beginTransaction();
  try {
    await cloneDatabase(connection, targetDb, backupDb);

    const summary = {};
    summary.users = await insertMissingById(connection, {
      sourceDb,
      targetDb,
      table: "users",
      sourceWhere: "NOT EXISTS (SELECT 1 FROM `" + targetDb + "`.users u WHERE u.email = s.email)",
    });
    summary.releases = await insertMissingById(connection, { sourceDb, targetDb, table: "releases" });
    summary.tracks = await insertMissingById(connection, { sourceDb, targetDb, table: "tracks" });
    summary.writers = await insertMissingById(connection, { sourceDb, targetDb, table: "writers" });

    await connection.commit();
    console.log(JSON.stringify({ success: true, sourceDb, targetDb, backupDb, inserted: summary }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
