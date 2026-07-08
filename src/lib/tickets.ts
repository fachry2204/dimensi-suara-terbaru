import { db, type RowDataPacket } from "@/lib/db";

let initialized = false;

export async function ensureTicketTables() {
  if (initialized) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      subject VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'Lainnya',
      status VARCHAR(30) NOT NULL DEFAULT 'Open',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tickets_user_id (user_id),
      INDEX idx_tickets_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ticket_replies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      sender_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ticket_replies_ticket_id (ticket_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [ticketColumns] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM tickets");
  const columnNames = new Set(ticketColumns.map((column) => String(column.Field)));

  if (!columnNames.has("category")) {
    await db.query(`
      ALTER TABLE tickets
      ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT 'Lainnya'
      AFTER subject
    `);
  }

  await db.query(`
    ALTER TABLE tickets
    MODIFY COLUMN status ENUM('Open', 'Pending', 'Replied', 'Closed') NOT NULL DEFAULT 'Open'
  `);

  await db.query(`
    ALTER TABLE tickets
    MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  `).catch(() => null);

  initialized = true;
}

export function normalizeTicketStatus(status?: string) {
  const normalized = String(status || "Open").toLowerCase();
  if (normalized === "closed") return "Closed";
  if (normalized === "pending" || normalized === "replied") return "Pending";
  return "Open";
}
