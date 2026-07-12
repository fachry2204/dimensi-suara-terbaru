export type ReportColumn =
  | "reporting_month"
  | "sales_month"
  | "platform"
  | "country_region"
  | "label_name"
  | "artist_name"
  | "release_title"
  | "track_title"
  | "upc"
  | "isrc"
  | "streaming_subscription_type"
  | "release_type"
  | "sales_type"
  | "quantity"
  | "client_payment_currency"
  | "net_revenue";

export const REQUIRED_REPORT_COLUMNS: ReportColumn[] = [
  "reporting_month",
  "sales_month",
  "platform",
  "country_region",
  "label_name",
  "artist_name",
  "release_title",
  "track_title",
  "upc",
  "isrc",
  "streaming_subscription_type",
  "release_type",
  "sales_type",
  "quantity",
  "client_payment_currency",
  "net_revenue",
];

const HEADER_ALIASES: Record<string, ReportColumn> = {
  reportingmonth: "reporting_month",
  salesmonth: "sales_month",
  platform: "platform",
  countryregion: "country_region",
  labelname: "label_name",
  artistname: "artist_name",
  releasetitle: "release_title",
  tracktitle: "track_title",
  upc: "upc",
  isrc: "isrc",
  streamingsubscriptiontype: "streaming_subscription_type",
  releasetype: "release_type",
  salestype: "sales_type",
  quantity: "quantity",
  clientpaymentcurrency: "client_payment_currency",
  netrevenue: "net_revenue",
};

export function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\n\r/]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function canonicalHeader(value: unknown): ReportColumn | null {
  return HEADER_ALIASES[normalizeHeader(value)] || null;
}

export function normalizeIsrc(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "");
}

export function normalizeUpc(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\D/g, "");
}

export function parseDecimal(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value.toString();

  let raw = String(value).trim().replace(/\s/g, "");
  const negative = raw.startsWith("(") && raw.endsWith(")") ? true : raw.startsWith("-");
  raw = raw.replace(/[()]/g, "").replace(/^-/, "");

  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");
  if (comma > -1 && dot > -1) {
    raw = comma > dot ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  } else if (comma > -1) {
    const decimals = raw.length - comma - 1;
    raw = decimals <= 2 ? raw.replace(",", ".") : raw.replace(/,/g, "");
  } else {
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts.join("");
  }

  if (!/^\d+(\.\d+)?$/.test(raw)) return null;
  return `${negative ? "-" : ""}${raw}`;
}

export function normalizeCurrency(value: unknown) {
  return String(value ?? "IDR").trim().toUpperCase() || "IDR";
}

export function parseReportPeriod(value: string) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2})[\/-](\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const year = Number(match[2]);
  if (month < 1 || month > 12 || year < 1900) return null;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function roundHalfUp(value: number) {
  return Math.round(value);
}

export function formatIdr(value: number | string | null | undefined) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

export function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
