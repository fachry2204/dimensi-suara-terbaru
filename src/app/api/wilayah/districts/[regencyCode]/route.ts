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

export async function GET(_request: Request, context: { params: Promise<{ regencyCode: string }> }) {
  try {
    const { regencyCode } = await context.params;
    if (!/^\d+(\.\d+)?$/.test(regencyCode)) {
      return NextResponse.json({ data: [], error: "Kode kota/kabupaten tidak valid" }, { status: 400 });
    }

    const res = await fetch(`https://emsifa.github.io/api-wilayah-indonesia/api/districts/${regencyCode}.json`, {
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!res.ok) throw new Error("Gagal memuat kecamatan");

    const data = await res.json();
    return NextResponse.json({ data: normalize(Array.isArray(data) ? data : []) });
  } catch (error: any) {
    return NextResponse.json({ data: [], error: error?.message || "Gagal memuat kecamatan" }, { status: 502 });
  }
}
