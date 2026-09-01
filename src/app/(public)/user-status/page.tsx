import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";

type UserStatusPageProps = {
  searchParams: Promise<{ username?: string; status?: string }>;
};

export default async function UserStatusPage({ searchParams }: UserStatusPageProps) {
  const params = await searchParams;
  const email = String(params.username || "").trim();

  return (
    <main className="min-h-screen bg-[#050713] px-4 py-10 text-slate-900 flex items-center justify-center">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/40">
        <div className="bg-gradient-to-r from-[#ff3d8f] to-[#8b5cf6] px-6 py-8 text-center text-white">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
            <CheckCircle2 size={36} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold">Pendaftaran Berhasil Dikirim</h1>
          <p className="mt-2 text-sm text-white/85">Data Anda sudah diterima oleh Dimensi Suara.</p>
        </div>

        <div className="space-y-5 px-6 py-7">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <Clock3 size={18} aria-hidden="true" />
              Status: Menunggu Persetujuan
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-700">
              Admin akan memeriksa data dan dokumen pendaftaran Anda. Silakan tunggu pemberitahuan berikutnya.
            </p>
          </div>

          {email ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="text-slate-500">Email pendaftaran</p>
              <p className="mt-1 break-all font-semibold text-slate-800">{email}</p>
            </div>
          ) : null}

          <Link
            href="/login"
            className="block rounded-xl bg-gradient-to-r from-[#ff3d8f] to-[#8b5cf6] px-5 py-3 text-center text-sm font-bold text-white transition hover:brightness-110"
          >
            Kembali ke Login
          </Link>
        </div>
      </section>
    </main>
  );
}
