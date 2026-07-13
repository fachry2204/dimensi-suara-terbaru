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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const province = url.searchParams.get("province") || "";
    const city = url.searchParams.get("city") || "";
    const district = url.searchParams.get("district") || "";
    const village = url.searchParams.get("village") || "";

    const query = [village, district, city, province].filter(Boolean).join(" ");
    if (!query) {
      return NextResponse.json({ code: "" });
    }

    const res = await fetch(`https://kodepos.vercel.app/search?q=${encodeURIComponent(query)}`, {
      next: { revalidate: 60 * 60 * 24 * 30 },
    });

    if (!res.ok) {
      return NextResponse.json({ code: "" });
    }

    const payload = await res.json();
    const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    const villageKey = normalizeText(village);
    const districtKey = normalizeText(district);
    const cityKey = normalizeText(city);

    const matched =
      rows.find((row: any) => {
        const rowVillage = normalizeText(String(row?.village || row?.kelurahan || row?.urban || ""));
        const rowDistrict = normalizeText(String(row?.district || row?.kecamatan || row?.subdistrict || ""));
        const rowCity = normalizeText(String(row?.regency || row?.city || row?.kabupaten || ""));
        return (!villageKey || rowVillage.includes(villageKey)) && (!districtKey || rowDistrict.includes(districtKey)) && (!cityKey || rowCity.includes(cityKey));
      }) || rows[0];

    return NextResponse.json({ code: matched ? String(getPostalCodeFromRow(matched) || "") : "" });
  } catch {
    return NextResponse.json({ code: "" });
  }
}
