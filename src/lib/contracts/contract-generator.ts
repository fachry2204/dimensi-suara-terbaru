import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import { sanitizeFileSegment } from "./contract-paths";
import { numberToIndonesianWords } from "./number-to-indonesian-words";

export type ContractUserData = {
  id: number;
  username: string | null;
  email: string | null;
  account_type: string | null;
  company_name: string | null;
  full_name: string | null;
  director_name?: string | null;
  nik: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  subdistrict: string | null;
  postal_code: string | null;
  pic_name: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  npwp_doc_path?: string | null;
  aggregator_percentage: number | string | null;
  publishing_percentage: number | string | null;
};

export type TemplateInfo = {
  id: number;
  version: number;
  file_path: string;
};

export type GeneratedContractResult = {
  buffer: Buffer;
  fileName: string;
  fileSize: number;
  checksum: string;
  snapshot: Record<string, unknown>;
  generatedAt: Date;
  unknownPlaceholders: string[];
};

export function normalizePlaceholder(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function required(value: string | number | null | undefined) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function formatJakartaDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatJakartaDay(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
  }).format(date);
}

function formatJakartaTime(date: Date) {
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date)} WIB`;
}

function jakartaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function contractNumberTime(date: Date) {
  const parts = jakartaDateParts(date);
  return `${parts.hour}${parts.minute}${parts.second}`;
}

function contractNumberDate(date: Date) {
  const parts = jakartaDateParts(date);
  return `${parts.day}${parts.month}${parts.year}`;
}

function aggregatorContractNumber(date: Date) {
  return `AGR-${contractNumberTime(date)}-${contractNumberDate(date)}`;
}

function timestampForFile(date: Date) {
  const parts = jakartaDateParts(date);
  return `${parts.year}${parts.month}${parts.day}_${parts.hour}${parts.minute}${parts.second}`;
}

function normalizePercentage(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NaN;
}

function providerShare(userShare: number) {
  return Number.isFinite(userShare) ? 100 - userShare : NaN;
}

export function validateContractUserData(user: ContractUserData) {
  const missing: string[] = [];
  const add = (label: string, value: unknown) => {
    if (!required(value as string | number | null | undefined)) missing.push(label);
  };

  add("Nama Lengkap", user.full_name || user.company_name || user.username);
  add("NIK KTP", user.nik);
  add("Alamat", user.address);
  add("Kelurahan/Desa", user.subdistrict);
  add("Kecamatan", user.district);
  add("Kota/Kabupaten", user.city);
  add("Provinsi", user.province);
  add("Kode Pos", user.postal_code);
  add("Nomor HP", user.phone);
  add("Nama Bank", user.bank_name);
  add("Nomor Rekening", user.bank_account_number);
  add("Atas Nama Rekening", user.bank_account_name);
  add("Persentase Aggregator User", user.aggregator_percentage);
  add("Persentase Publishing User", user.publishing_percentage);

  const aggregatorUserPct = normalizePercentage(user.aggregator_percentage);
  const publishingUserPct = normalizePercentage(user.publishing_percentage);
  const percentageValid =
    Number.isFinite(aggregatorUserPct) &&
    Number.isFinite(publishingUserPct) &&
    aggregatorUserPct >= 0 &&
    aggregatorUserPct <= 100 &&
    publishingUserPct >= 0 &&
    publishingUserPct <= 100;

  return {
    missing,
    aggregatorUserPct,
    aggregatorProviderPct: providerShare(aggregatorUserPct),
    publishingUserPct,
    publishingProviderPct: providerShare(publishingUserPct),
    percentageValid,
  };
}

function buildPlaceholderMap(user: ContractUserData, generatedAt: Date, template: TemplateInfo) {
  const displayName = user.full_name || user.company_name || user.username || "";
  const picOrName = user.pic_name || displayName;
  const aggregatorUserPct = normalizePercentage(user.aggregator_percentage);
  const aggregatorProviderPct = providerShare(aggregatorUserPct);
  const publishingUserPct = normalizePercentage(user.publishing_percentage);
  const publishingProviderPct = providerShare(publishingUserPct);
  const tanggalGenerate = formatJakartaDate(generatedAt);
  const jamGenerate = formatJakartaTime(generatedAt);
  const hariGenerate = formatJakartaDay(generatedAt);
  const nomorKontrakAggregator = aggregatorContractNumber(generatedAt);
  const jamNomorKontrak = `AGR-${contractNumberTime(generatedAt)}`;
  const tanggalNomorKontrak = contractNumberDate(generatedAt);

  const canonical: Record<string, string> = {
    "nama user": displayName,
    "nik ktp user": String(user.nik || ""),
    "alamat user": String(user.address || ""),
    "kelurahan/desa user": String(user.subdistrict || ""),
    "kecamatan user": String(user.district || ""),
    "kota user": String(user.city || ""),
    "provinsi user": String(user.province || ""),
    "kode pos user": String(user.postal_code || ""),
    "email user": String(user.email || ""),
    "no hp user": String(user.phone || ""),
    "nama user / pic user": picOrName,
    "nama bank user": String(user.bank_name || ""),
    "kantor cabang bank user": "",
    "no rekening user": String(user.bank_account_number || ""),
    "atas nama rening user": String(user.bank_account_name || ""),
    "atas nama rekening user": String(user.bank_account_name || ""),
    "no npwp user": "",
    "presentase user": String(aggregatorUserPct),
    "terbilang presentase user": numberToIndonesianWords(aggregatorUserPct),
    "presentase admin": String(aggregatorProviderPct),
    "terbilang presentase admin": numberToIndonesianWords(aggregatorProviderPct),
    "presentase aggregator user": String(aggregatorUserPct),
    "terbilang presentase aggregator user": numberToIndonesianWords(aggregatorUserPct),
    "presentase aggregator admin": String(aggregatorProviderPct),
    "terbilang presentase aggregator admin": numberToIndonesianWords(aggregatorProviderPct),
    "presentase aggregator penyedia": String(aggregatorProviderPct),
    "terbilang presentase aggregator penyedia": numberToIndonesianWords(aggregatorProviderPct),
    "presentase aggregator perusahaan": String(aggregatorProviderPct),
    "terbilang presentase aggregator perusahaan": numberToIndonesianWords(aggregatorProviderPct),
    "presentase publishing user": String(publishingUserPct),
    "terbilang presentase publishing user": numberToIndonesianWords(publishingUserPct),
    "presentase publishing admin": String(publishingProviderPct),
    "terbilang presentase publishing admin": numberToIndonesianWords(publishingProviderPct),
    "presentase publishing penyedia": String(publishingProviderPct),
    "terbilang presentase publishing penyedia": numberToIndonesianWords(publishingProviderPct),
    "presentase publishing perusahaan": String(publishingProviderPct),
    "terbilang presentase publishing perusahaan": numberToIndonesianWords(publishingProviderPct),
    "nomor kontrak aggregator": nomorKontrakAggregator,
    "nomor kontrak agr": nomorKontrakAggregator,
    "jam generat": jamNomorKontrak,
    "tanggal generat": tanggalNomorKontrak,
    "jam generat panjang": jamGenerate,
    "tanggal generat panjang": tanggalGenerate,
    "hari generat": hariGenerate,
  };

  return {
    canonical,
    snapshot: {
      nama_user: displayName,
      nik: String(user.nik || ""),
      alamat: String(user.address || ""),
      email: String(user.email || ""),
      no_hp: String(user.phone || ""),
      persentase_aggregator_user: aggregatorUserPct,
      persentase_aggregator_penyedia: aggregatorProviderPct,
      persentase_publishing_user: publishingUserPct,
      persentase_publishing_penyedia: publishingProviderPct,
      nomor_kontrak_aggregator: nomorKontrakAggregator,
      tanggal_generate: tanggalGenerate,
      tanggal_nomor_kontrak: tanggalNomorKontrak,
      jam_generate: jamGenerate,
      jam_nomor_kontrak: jamNomorKontrak,
      hari_generate: hariGenerate,
      template_version: template.version,
    },
  };
}

export async function generateContractDocx(input: {
  user: ContractUserData;
  template: TemplateInfo;
  templateAbsolutePath: string;
}) {
  const generatedAt = new Date();
  const templateBuffer = await fs.readFile(input.templateAbsolutePath);
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    delimiters: { start: "<", end: ">" },
    paragraphLoop: true,
    linebreaks: true,
    parser(tag) {
      return {
        get(scope: Record<string, string>) {
          return scope[normalizePlaceholder(tag)];
        },
      };
    },
  });

  const { canonical, snapshot } = buildPlaceholderMap(input.user, generatedAt, input.template);
  const fullText = doc.getFullText();
  const placeholders = Array.from(new Set(fullText.match(/<[^<>]+>/g) || []));
  const unknownPlaceholders = placeholders.filter((placeholder) => {
    const key = normalizePlaceholder(placeholder.slice(1, -1));
    return canonical[key] === undefined;
  });

  if (unknownPlaceholders.length > 0) {
    return {
      buffer: Buffer.alloc(0),
      fileName: "",
      fileSize: 0,
      checksum: "",
      snapshot,
      generatedAt,
      unknownPlaceholders,
    } satisfies GeneratedContractResult;
  }

  doc.render(canonical);
  const buffer = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
  const renderedText = new Docxtemplater(new PizZip(buffer), {
    delimiters: { start: "<", end: ">" },
  }).getFullText();
  const remaining = Array.from(new Set(renderedText.match(/<[^<>]+>/g) || []));

  const fileName = `Kontrak_Dimensi_Suara_${sanitizeFileSegment(String(snapshot.nama_user))}_${timestampForFile(generatedAt)}.docx`;

  return {
    buffer,
    fileName,
    fileSize: buffer.length,
    checksum: crypto.createHash("sha256").update(buffer).digest("hex"),
    snapshot,
    generatedAt,
    unknownPlaceholders: remaining,
  } satisfies GeneratedContractResult;
}
