import { NextResponse } from "next/server";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/^kabupaten\s+/i, "")
    .replace(/^kota\s+/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
      [village],
    ]
      .map((parts) => parts.filter(Boolean).join(" "))
      .filter((query, index, all) => query && all.indexOf(query) === index);

    if (!queries.length) {
      return NextResponse.json({ code: "" });
    }

    let rows: any[] = [];
    for (const query of queries) {
      rows = await searchPostalCodes(query);
      if (rows.length) break;
    }

    const villageKey = normalizeText(village);
    const districtKey = normalizeText(district);
    const cityKey = normalizeText(city);
    const provinceKey = normalizeText(province);

    const matched =
      rows.find((row: any) => {
        const rowVillage = normalizeText(String(row?.village || row?.kelurahan || row?.urban || ""));
        const rowDistrict = normalizeText(String(row?.district || row?.kecamatan || row?.subdistrict || ""));
        const rowCity = normalizeText(String(row?.regency || row?.city || row?.kabupaten || ""));
        const rowProvince = normalizeText(String(row?.province || row?.provinsi || ""));
        return (!villageKey || rowVillage === villageKey) &&
          (!districtKey || rowDistrict === districtKey) &&
          (!cityKey || rowCity === cityKey) &&
          (!provinceKey || !rowProvince || rowProvince === provinceKey);
      }) || null;

    return NextResponse.json({ code: matched ? String(getPostalCodeFromRow(matched) || "") : "" });
  } catch {
    return NextResponse.json({ code: "" });
  }
}
