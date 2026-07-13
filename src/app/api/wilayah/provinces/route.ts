import { NextResponse } from "next/server";

type WilayahSourceItem = {
  id?: string;
  code?: string;
  name?: string;
};

function normalize(items: WilayahSourceItem[]) {
  return items
    .map((item) => ({
      code: String(item.id || item.code || "").trim(),
      name: String(item.name || "").trim(),
    }))
    .filter((item) => item.code && item.name);
}

export async function GET() {
  try {
    const res = await fetch("https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json", {
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!res.ok) throw new Error("Gagal memuat provinsi");

    const data = await res.json();
    return NextResponse.json({ data: normalize(Array.isArray(data) ? data : []) });
  } catch (error: any) {
    return NextResponse.json({ data: [], error: error?.message || "Gagal memuat provinsi" }, { status: 502 });
  }
}
