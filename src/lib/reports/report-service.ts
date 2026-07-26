import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";

import { db, withTransaction } from "@/lib/db";
import { ensureReportTables } from "@/lib/reports/report-schema";
import {
  REQUIRED_REPORT_COLUMNS,
  canonicalHeader,
  chunkArray,
  normalizeCurrency,
  normalizeIsrc,
  normalizeUpc,
  parseDecimal,
  parseReportPeriod,
  roundHalfUp,
  type ReportColumn,
} from "@/lib/reports/report-utils";

type ParsedRow = Record<ReportColumn, unknown> & {
  row_number: number;
  quantity_decimal: string | null;
  net_revenue_decimal: string | null;
  upc_normalized: string;
  isrc_normalized: string;
  status: "INVALID" | "NO_ACCOUNT";
  error_message: string | null;
};

type CatalogMatch = {
  user_id: number;
  owner_name: string | null;
  owner_email: string | null;
  release_id: number | null;
  track_id: number | null;
  release_title: string | null;
  track_title: string | null;
  artist_name: string | null;
  label_name: string | null;
};

function placeholders(length: number) {
  return Array.from({ length }, () => "?").join(",");
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function titleContainsDifferent(reportValue: unknown, catalogValue: string | null | undefined) {
  const report = String(reportValue || "").trim().toLowerCase();
  const catalog = String(catalogValue || "").trim().toLowerCase();
  return report && catalog && report !== catalog;
}

export async function readReportFile(buffer: Buffer, fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".csv") {
    return XLSX.read(buffer, { type: "buffer", raw: false });
  }
  return XLSX.read(buffer, { type: "buffer", cellDates: false, raw: false });
}

export function parseWorkbookRows(workbook: XLSX.WorkBook) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headerRow = (matrix[0] || []) as unknown[];
  const headerMap = new Map<ReportColumn, number>();
  headerRow.forEach((header, index) => {
    const canonical = canonicalHeader(header);
    if (canonical && !headerMap.has(canonical)) headerMap.set(canonical, index);
  });

  const missingHeaders = REQUIRED_REPORT_COLUMNS.filter((column) => !headerMap.has(column));
  if (missingHeaders.length > 0) {
    return { sheetName, rows: [] as ParsedRow[], missingHeaders };
  }

  const rows = matrix.slice(1).map((rawRow, index) => {
    const row = rawRow as unknown[];
    const parsed: Partial<ParsedRow> = { row_number: index + 2 };
    for (const column of REQUIRED_REPORT_COLUMNS) {
      parsed[column] = row[headerMap.get(column)!];
    }
    parsed.upc_normalized = normalizeUpc(parsed.upc);
    parsed.isrc_normalized = normalizeIsrc(parsed.isrc);
    parsed.quantity_decimal = parseDecimal(parsed.quantity);
    parsed.net_revenue_decimal = parseDecimal(parsed.net_revenue);
    parsed.status = "NO_ACCOUNT";
    parsed.error_message = null;
    if (!parsed.quantity_decimal || !parsed.net_revenue_decimal) {
      parsed.status = "INVALID";
      parsed.error_message = "Quantity atau Net Revenue tidak valid.";
    }
    if (!parsed.upc_normalized && !parsed.isrc_normalized) {
      parsed.status = "INVALID";
      parsed.error_message = "UPC dan ISRC kosong.";
    }
    return parsed as ParsedRow;
  }).filter((row) => {
    return REQUIRED_REPORT_COLUMNS.some((column) => String(row[column] ?? "").trim() !== "");
  });

  return { sheetName, rows, missingHeaders };
}

export async function createReportBatch(input: {
  file: File;
  aggregatorName: string;
  reportPeriod: string;
  uploadedBy: number;
}) {
  await ensureReportTables();
  const buffer = Buffer.from(await input.file.arrayBuffer());
  if (buffer.length === 0) throw new Error("File report kosong.");

  const ext = path.extname(input.file.name).toLowerCase();
  if (![".xlsx", ".xls", ".csv"].includes(ext)) throw new Error("Format file report harus .xlsx, .xls, atau .csv.");
  const reportPeriod = parseReportPeriod(input.reportPeriod);
  if (!reportPeriod) throw new Error("Periode report harus format MM/YYYY.");

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const [existing]: any = await db.query("SELECT id FROM report_batches WHERE file_sha256 = ? LIMIT 1", [hash]);
  if (existing?.length) throw new Error("File report yang sama sudah pernah diupload.");

  const workbook = await readReportFile(buffer, input.file.name);
  const { sheetName, rows, missingHeaders } = parseWorkbookRows(workbook);
  if (missingHeaders.length) {
    throw new Error(`File report tidak dapat diproses karena terdapat kolom wajib yang belum tersedia: ${missingHeaders.join(", ")}`);
  }

  const year = reportPeriod.slice(0, 4);
  const month = reportPeriod.slice(5, 7);
  const relativeBase = path.join("storage", "private", "reports", year, month).replace(/\\/g, "/");
  const absoluteBase = path.join(process.cwd(), relativeBase);
  await fs.mkdir(absoluteBase, { recursive: true });

  const [insertBatch]: any = await db.query(
    `INSERT INTO report_batches
     (aggregator_name, report_period, original_file_name, stored_file_path, file_mime_type, file_size, file_sha256, sheet_name, status, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PROCESSING', ?)`,
    [input.aggregatorName, reportPeriod, input.file.name, "", input.file.type || null, buffer.length, hash, sheetName, input.uploadedBy]
  );
  const batchId = Number(insertBatch.insertId);
  const safeName = `${batchId}_${Date.now()}_${input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const relativePath = path.join(relativeBase, String(batchId), safeName).replace(/\\/g, "/");
  const absolutePath = path.join(process.cwd(), relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  await db.query("UPDATE report_batches SET stored_file_path = ? WHERE id = ?", [relativePath, batchId]);

  await insertReportRows(batchId, rows);
  await matchReportBatch(batchId);
  await updateBatchSummary(batchId);
  await db.query("UPDATE report_batches SET status = 'READY_FOR_REVIEW', error_message = NULL WHERE id = ?", [batchId]);
  return { batchId };
}

async function insertReportRows(batchId: number, rows: ParsedRow[]) {
  const columns = [
    "report_batch_id", "row_number", "reporting_month", "sales_month", "platform", "country_region", "label_name",
    "artist_name", "release_title", "track_title", "upc_original", "upc_normalized", "isrc_original", "isrc_normalized",
    "streaming_subscription_type", "release_type", "sales_type", "quantity", "client_payment_currency", "net_revenue",
    "status", "error_message",
  ];
  for (const chunk of chunkArray(rows, 1000)) {
    const values = chunk.map((row) => [
      batchId,
      row.row_number,
      row.reporting_month || null,
      row.sales_month || null,
      row.platform || null,
      row.country_region || null,
      row.label_name || null,
      row.artist_name || null,
      row.release_title || null,
      row.track_title || null,
      row.upc || null,
      row.upc_normalized || null,
      row.isrc || null,
      row.isrc_normalized || null,
      row.streaming_subscription_type || null,
      row.release_type || null,
      row.sales_type || null,
      row.quantity_decimal,
      normalizeCurrency(row.client_payment_currency),
      row.net_revenue_decimal,
      row.status,
      row.error_message,
    ]);
    await db.query(
      `INSERT INTO report_rows (${columns.join(",")}) VALUES ${values.map(() => `(${placeholders(columns.length)})`).join(",")}`,
      values.flat()
    );
  }
}

async function lookupCatalog(rows: any[]) {
  const isrcs = unique(rows.map((row) => row.isrc_normalized));
  const upcs = unique(rows.map((row) => row.upc_normalized));
  const isrcMap = new Map<string, CatalogMatch[]>();
  const upcMap = new Map<string, CatalogMatch[]>();

  for (const chunk of chunkArray(isrcs, 1000)) {
    if (!chunk.length) continue;
    const [found]: any = await db.query(
      `SELECT t.isrc, t.id AS track_id, t.title AS track_title, t.primary_artists AS track_artists,
              r.id AS release_id, r.user_id, r.title AS release_title, r.primary_artists, r.label,
              u.full_name, u.company_name, u.username, u.email
       FROM tracks t
       JOIN releases r ON r.id = t.release_id
       LEFT JOIN users u ON u.id = r.user_id
       WHERE REPLACE(REPLACE(UPPER(t.isrc), '-', ''), ' ', '') IN (${placeholders(chunk.length)})`,
      chunk
    );
    for (const item of found || []) {
      const key = normalizeIsrc(item.isrc);
      if (!isrcMap.has(key)) isrcMap.set(key, []);
      isrcMap.get(key)!.push({
        user_id: Number(item.user_id),
        owner_name: item.full_name || item.company_name || item.username || item.email || null,
        owner_email: item.email || null,
        release_id: Number(item.release_id),
        track_id: Number(item.track_id),
        release_title: item.release_title,
        track_title: item.track_title,
        artist_name: item.track_artists || item.primary_artists,
        label_name: item.label,
      });
    }
  }

  for (const chunk of chunkArray(upcs, 1000)) {
    if (!chunk.length) continue;
    const [found]: any = await db.query(
      `SELECT r.upc, r.id AS release_id, r.user_id, r.title AS release_title, r.primary_artists, r.label,
              u.full_name, u.company_name, u.username, u.email
       FROM releases r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE REPLACE(REPLACE(REPLACE(r.upc, '-', ''), ' ', ''), '.', '') IN (${placeholders(chunk.length)})`,
      chunk
    );
    for (const item of found || []) {
      const key = normalizeUpc(item.upc);
      if (!upcMap.has(key)) upcMap.set(key, []);
      upcMap.get(key)!.push({
        user_id: Number(item.user_id),
        owner_name: item.full_name || item.company_name || item.username || item.email || null,
        owner_email: item.email || null,
        release_id: Number(item.release_id),
        track_id: null,
        release_title: item.release_title,
        track_title: null,
        artist_name: item.primary_artists,
        label_name: item.label,
      });
    }
  }

  return { isrcMap, upcMap };
}

function uniqueUsers(matches: CatalogMatch[] | undefined) {
  return unique((matches || []).map((match) => match.user_id));
}

function ownershipEvidence(matches: CatalogMatch[]) {
  const byUser = new Map<number, CatalogMatch>();
  for (const match of matches) {
    if (!byUser.has(match.user_id)) byUser.set(match.user_id, match);
  }
  return Array.from(byUser.values()).map((match) => ({
    userId: match.user_id,
    ownerName: match.owner_name,
    ownerEmail: match.owner_email,
    releaseId: match.release_id,
    releaseTitle: match.release_title,
    trackId: match.track_id,
    trackTitle: match.track_title,
  }));
}

export async function matchReportBatch(batchId: number, onlyUnresolved = false) {
  await ensureReportTables();
  const [rows]: any = await db.query(
    `SELECT * FROM report_rows
     WHERE report_batch_id = ? ${onlyUnresolved ? "AND status IN ('NO_ACCOUNT','CONFLICT')" : ""}
     ORDER BY id ASC`,
    [batchId]
  );
  const candidates = (rows || []).filter((row: any) => row.status !== "INVALID");
  const { isrcMap, upcMap } = await lookupCatalog(candidates);

  for (const row of candidates) {
    const isrcMatches = isrcMap.get(row.isrc_normalized) || [];
    const upcMatches = upcMap.get(row.upc_normalized) || [];
    const isrcUsers = uniqueUsers(isrcMatches);
    const upcUsers = uniqueUsers(upcMatches);
    const matchDetails = {
      isrc: ownershipEvidence(isrcMatches),
      upc: ownershipEvidence(upcMatches),
    };

    let status = "NO_ACCOUNT";
    let method: string | null = null;
    let selected: CatalogMatch | null = null;
    let error: string | null = "Tidak ada akun yang memiliki UPC atau ISRC ini.";

    if (isrcUsers.length > 1 || upcUsers.length > 1) {
      status = "CONFLICT";
      error = "UPC atau ISRC dimiliki lebih dari satu akun.";
    } else if (isrcUsers.length === 1 && upcUsers.length === 1 && isrcUsers[0] !== upcUsers[0]) {
      status = "CONFLICT";
      error = "ISRC dan UPC terdeteksi dimiliki oleh akun yang berbeda.";
    } else if (isrcUsers.length === 1 && upcUsers.length === 1) {
      status = "MATCHED";
      method = "ISRC_UPC";
      selected = isrcMatches[0] || upcMatches[0];
      error = null;
    } else if (isrcUsers.length === 1) {
      status = "MATCHED";
      method = "ISRC";
      selected = isrcMatches[0];
      error = null;
    } else if (upcUsers.length === 1) {
      status = "MATCHED";
      method = "UPC";
      selected = upcMatches[0];
      error = null;
    }

    const warnings: string[] = [];
    if (selected) {
      if (titleContainsDifferent(row.release_title, selected.release_title)) warnings.push("Metadata report berbeda dengan metadata katalog.");
      if (selected.track_title && titleContainsDifferent(row.track_title, selected.track_title)) warnings.push("Metadata report berbeda dengan metadata katalog.");
    }

    await db.query(
      `UPDATE report_rows
       SET status = ?, match_method = ?, matched_user_id = ?, matched_release_id = ?, matched_track_id = ?,
           match_details = ?, warning_message = ?, error_message = ?
       WHERE id = ?`,
      [
        status,
        method,
        selected?.user_id || null,
        selected?.release_id || null,
        selected?.track_id || null,
        JSON.stringify(matchDetails),
        warnings.length ? Array.from(new Set(warnings)).join(" ") : null,
        error,
        row.id,
      ]
    );
  }
  await updateBatchSummary(batchId);
}

export async function updateBatchSummary(batchId: number) {
  const [summary]: any = await db.query(
    `SELECT
      COUNT(*) AS total_rows,
      SUM(status = 'MATCHED') AS matched_rows,
      SUM(status = 'NO_ACCOUNT') AS no_account_rows,
      SUM(status = 'CONFLICT') AS conflict_rows,
      SUM(status = 'INVALID') AS invalid_rows
     FROM report_rows WHERE report_batch_id = ?`,
    [batchId]
  );
  const [currencyRows]: any = await db.query(
    `SELECT client_payment_currency AS currency, SUM(net_revenue) AS total
     FROM report_rows WHERE report_batch_id = ? AND net_revenue IS NOT NULL
     GROUP BY client_payment_currency`,
    [batchId]
  );
  const data = summary?.[0] || {};
  await db.query(
    `UPDATE report_batches
     SET total_rows = ?, matched_rows = ?, no_account_rows = ?, conflict_rows = ?, invalid_rows = ?,
         gross_revenue_summary = ?
     WHERE id = ?`,
    [
      Number(data.total_rows || 0),
      Number(data.matched_rows || 0),
      Number(data.no_account_rows || 0),
      Number(data.conflict_rows || 0),
      Number(data.invalid_rows || 0),
      JSON.stringify(currencyRows || []),
      batchId,
    ]
  );
}

type Queryable = {
  query: (sql: string, values?: any[]) => Promise<any>;
};

export async function recalculateRowsForBatch(batchId: number, connection: Queryable = db) {
  const [batchRows]: any = await connection.query("SELECT currency_rates_snapshot FROM report_batches WHERE id = ?", [batchId]);
  const rates = JSON.parse(batchRows?.[0]?.currency_rates_snapshot || "{}");
  const [rows]: any = await connection.query(
    `SELECT r.*, u.aggregator_percentage AS user_default_percentage
     FROM report_rows r
     LEFT JOIN users u ON u.id = r.matched_user_id
     WHERE r.report_batch_id = ?`,
    [batchId]
  );

  for (const row of rows || []) {
    if (row.status !== "MATCHED") continue;
    const currency = normalizeCurrency(row.client_payment_currency);
    const rate = Number(rates[currency]);
    const userPct = Number(row.user_percentage ?? row.user_default_percentage ?? 70);
    const aggregatorPct = 100 - userPct;
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(userPct) || Math.abs(userPct + aggregatorPct - 100) > 0.001) {
      await connection.query(
        "UPDATE report_rows SET status = 'INVALID', error_message = ? WHERE id = ?",
        [!Number.isFinite(rate) || rate <= 0 ? `Kurs untuk ${currency} belum diisi.` : "Total persentase pembagian tidak sama dengan 100%.", row.id]
      );
      continue;
    }
    const gross = Number(row.net_revenue || 0) * rate;
    const grossFinal = roundHalfUp(gross);
    const userRevenue = roundHalfUp(gross * userPct / 100);
    const aggregatorRevenue = roundHalfUp(gross * aggregatorPct / 100);
    await connection.query(
      `UPDATE report_rows
       SET exchange_rate = ?, gross_idr_decimal = ?, gross_idr_final = ?, user_percentage = ?, aggregator_percentage = ?,
           user_revenue = ?, aggregator_revenue = ?, error_message = NULL
       WHERE id = ?`,
      [rate, gross.toFixed(8), grossFinal, userPct, aggregatorPct, userRevenue, aggregatorRevenue, row.id]
    );
  }
}

export async function finalizeReportBatch(batchId: number, adminId: number, confirmUnresolved: boolean) {
  await ensureReportTables();
  return withTransaction(async (connection) => {
    const [batches]: any = await connection.query("SELECT * FROM report_batches WHERE id = ? FOR UPDATE", [batchId]);
    const batch = batches?.[0];
    if (!batch) throw new Error("Report tidak ditemukan.");
    if (batch.status === "FINALIZED") {
      const error = new Error("Report sudah pernah difinalisasi.");
      (error as any).status = 409;
      throw error;
    }
    if (batch.status !== "READY_FOR_REVIEW") throw new Error("Report belum siap difinalisasi.");

    const [currencyRows]: any = await connection.query(
      "SELECT DISTINCT client_payment_currency AS currency FROM report_rows WHERE report_batch_id = ? AND status = 'MATCHED'",
      [batchId]
    );
    const rates = JSON.parse(batch.currency_rates_snapshot || "{}");
    for (const row of currencyRows || []) {
      const currency = normalizeCurrency(row.currency);
      if (!rates[currency]) throw new Error(`Kurs untuk ${currency} belum diisi.`);
    }

    const [unresolved]: any = await connection.query(
      "SELECT COUNT(*) AS total FROM report_rows WHERE report_batch_id = ? AND status IN ('NO_ACCOUNT','CONFLICT','INVALID')",
      [batchId]
    );
    if (Number(unresolved?.[0]?.total || 0) > 0 && !confirmUnresolved) {
      const error = new Error(`Terdapat ${unresolved[0].total} baris yang belum dapat didistribusikan kepada user.`);
      (error as any).status = 409;
      throw error;
    }

    await connection.query("UPDATE report_batches SET status = 'FINALIZING' WHERE id = ?", [batchId]);
    await recalculateRowsForBatch(batchId, connection);

    const [matchedRows]: any = await connection.query(
      "SELECT * FROM report_rows WHERE report_batch_id = ? AND status = 'MATCHED' AND matched_user_id IS NOT NULL",
      [batchId]
    );
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    for (const row of matchedRows || []) {
      await connection.query(
        `INSERT INTO user_revenue_ledger
         (user_id, report_batch_id, report_row_id, ledger_type, sales_month, platform, country_region,
          artist_name, release_title, track_title, upc, isrc, quantity, original_currency, original_net_revenue,
          exchange_rate_snapshot, gross_idr_snapshot, user_percentage_snapshot, aggregator_percentage_snapshot,
          user_revenue_idr, aggregator_revenue_idr, finalized_at)
         VALUES (?, ?, ?, 'ROYALTY', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = id`,
        [
          row.matched_user_id,
          batchId,
          row.id,
          row.sales_month,
          row.platform,
          row.country_region,
          row.artist_name,
          row.release_title,
          row.track_title,
          row.upc_normalized,
          row.isrc_normalized,
          row.quantity,
          row.client_payment_currency,
          row.net_revenue,
          row.exchange_rate,
          row.gross_idr_final,
          row.user_percentage,
          row.aggregator_percentage,
          row.user_revenue,
          row.aggregator_revenue,
          now,
        ]
      );
    }

    const [totals]: any = await connection.query(
      `SELECT COALESCE(SUM(gross_idr_final),0) AS gross, COALESCE(SUM(user_revenue),0) AS user_total,
              COALESCE(SUM(aggregator_revenue),0) AS aggregator_total
       FROM report_rows WHERE report_batch_id = ? AND status = 'MATCHED'`,
      [batchId]
    );
    await connection.query(
      `UPDATE report_batches
       SET status = 'FINALIZED', finalized_by = ?, finalized_at = ?, gross_idr_total = ?,
           user_revenue_total = ?, aggregator_revenue_total = ?
       WHERE id = ?`,
      [adminId, now, totals[0].gross || 0, totals[0].user_total || 0, totals[0].aggregator_total || 0, batchId]
    );
    return { finalizedRows: matchedRows.length };
  });
}
