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

export async function GET(_request: Request, context: { params: Promise<{ provinceCode: string }> }) {
  try {
    const { provinceCode } = await context.params;
    if (!/^\d+(\.\d+)?$/.test(provinceCode)) {
      return NextResponse.json({ data: [], error: "Kode provinsi tidak valid" }, { status: 400 });
    }

    const res = await fetch(`https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${provinceCode}.json`, {
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!res.ok) throw new Error("Gagal memuat kota/kabupaten");

    const data = await res.json();
    return NextResponse.json({ data: normalize(Array.isArray(data) ? data : []) });
  } catch (error: any) {
    return NextResponse.json({ data: [], error: error?.message || "Gagal memuat kota/kabupaten" }, { status: 502 });
  }
}
