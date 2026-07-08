import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      message: "Update otomatis dinonaktifkan di mode lokal. Jalankan deployment/update dari server secara manual.",
      status: "DISABLED",
    },
    { status: 400 }
  );
}
