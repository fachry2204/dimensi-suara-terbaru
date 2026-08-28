import { NextResponse } from "next/server";

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^(?:kabupaten|kab\.?|kota administratif|kota|kecamatan|kelurahan|desa)\s+/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeCompact(value: string) {
  return normalizeText(value).replace(/\s+/g, "");
}

function getPostalCodeFromRow(row: any) {
  return row?.postalcode || row?.postal_code || row?.kodepos || row?.kode_pos || row?.code || row?.zip;
}

async function searchPostalCodes(query: string) {
  const res = await fetch(`https://kodepos.vercel.app/search?q=${encodeURIComponent(query)}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) return [];

  const payload = await res.json();
  return Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload)
        ? payload
        : [];
}

function findMatchingRow(rows: any[], location: { province: string; city: string; district: string; village: string }) {
  const expected = {
    province: normalizeCompact(location.province),
    city: normalizeCompact(location.city),
    district: normalizeCompact(location.district),
    village: normalizeCompact(location.village),
  };

  return rows.find((row: any) => {
    const actual = {
      village: normalizeCompact(String(row?.village || row?.kelurahan || row?.urban || "")),
      district: normalizeCompact(String(row?.district || row?.kecamatan || row?.subdistrict || "")),
      city: normalizeCompact(String(row?.regency || row?.city || row?.kabupaten || "")),
      province: normalizeCompact(String(row?.province || row?.provinsi || "")),
    };

    return (!expected.village || actual.village === expected.village) &&
      (!expected.district || !actual.district || actual.district === expected.district) &&
      (!expected.city || !actual.city || actual.city === expected.city) &&
      (!expected.province || !actual.province || actual.province === expected.province);
  }) || null;
}

function findUniqueAreaPostalRow(rows: any[], location: { province: string; city: string; district: string }) {
  const expected = {
    province: normalizeCompact(location.province),
    city: normalizeCompact(location.city),
    district: normalizeCompact(location.district),
  };
  const areaRows = rows.filter((row: any) => {
    const actualDistrict = normalizeCompact(String(row?.district || row?.kecamatan || row?.subdistrict || ""));
    const actualCity = normalizeCompact(String(row?.regency || row?.city || row?.kabupaten || ""));
    const actualProvince = normalizeCompact(String(row?.province || row?.provinsi || ""));
    return (!expected.district || actualDistrict === expected.district) &&
      (!expected.city || !actualCity || actualCity === expected.city) &&
      (!expected.province || !actualProvince || actualProvince === expected.province);
  });

  const codes = new Set(
    areaRows
      .map((row: any) => String(getPostalCodeFromRow(row) || "").trim())
      .filter(Boolean),
  );
  return codes.size === 1 ? areaRows.find((row: any) => getPostalCodeFromRow(row)) || null : null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const province = url.searchParams.get("province") || "";
    const city = url.searchParams.get("city") || "";
    const district = url.searchParams.get("district") || "";
    const village = url.searchParams.get("village") || "";

    const queries = [
      [village, district, city, province],
      [village, district, city],
      [village, district],
      [district, city, province],
      [village],
    ]
      .map((parts) => parts.map((part) => normalizeText(part)).filter(Boolean).join(" "))
      .filter((query, index, all) => query && all.indexOf(query) === index);

    if (!queries.length) {
      return NextResponse.json({ code: "" });
    }

    const allRows: any[] = [];
    let matched: any = null;
    for (const query of queries) {
      const rows = await searchPostalCodes(query);
      allRows.push(...rows);
      matched = findMatchingRow(rows, { province, city, district, village });
      if (matched) break;
    }

    if (!matched && allRows.length) {
      matched = findMatchingRow(allRows, { province, city, district, village });
    }
    if (!matched && allRows.length) {
      matched = findUniqueAreaPostalRow(allRows, { province, city, district });
    }

    return NextResponse.json({ code: matched ? String(getPostalCodeFromRow(matched) || "") : "" });
  } catch {
    return NextResponse.json({ code: "" });
  }
}
