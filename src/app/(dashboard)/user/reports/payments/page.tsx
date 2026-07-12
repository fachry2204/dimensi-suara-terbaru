"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, Wallet } from "lucide-react";

export default function UserAggregatorPaymentsPage() {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/releases", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setReleases(Array.isArray(data) ? data : []))
      .catch(() => setReleases([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <header>
        <h1 className="flex items-center gap-3 text-2xl font-black text-slate-800">
          <CreditCard className="text-[#aa91cc]" /> Pembayaran Aggregator
        </h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan pembayaran royalti aggregator untuk katalog Anda.</p>
      </header>

      {loading ? (
        <div className="mt-8 flex items-center gap-3 rounded-lg bg-white p-8 text-slate-500">
          <Loader2 className="animate-spin" /> Memuat pembayaran...
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Total Rilis", releases.length],
              ["Estimasi Royalti", "Rp 0"],
              ["Status Pembayaran", "Belum tersedia"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                <Wallet size={20} className="text-[#aa91cc]" />
                <div className="mt-4 text-2xl font-black text-slate-900">{value}</div>
                <div className="text-xs font-bold uppercase text-slate-400">{label}</div>
              </div>
            ))}
          </section>
          <section className="mt-6 rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-800">Riwayat Pembayaran</h2>
            <div className="mt-5 rounded bg-slate-50 p-8 text-center text-sm text-slate-400">
              Data pembayaran aggregator akan tampil setelah laporan royalti diunggah oleh admin.
            </div>
          </section>
        </>
      )}
    </main>
  );
}
