'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, Music4, SearchX } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';
import { assetUrl } from '@/utils/url';

export default function NotFound() {
  const router = useRouter();
  const { branding } = useBranding();
  const logoValue = branding?.logo || branding?.systemLogo || branding?.logo_url || branding?.logoUrl || branding?.system_logo;
  const logo = logoValue ? assetUrl(logoValue) : '';
  const title = branding?.login_title || 'Dimensi Suara';

  return (
    <main className="h-screen overflow-hidden bg-[#f3f3f5] text-[#343a40]">
      <div className="relative flex h-screen items-center justify-center px-6 py-6">
        <div className="absolute inset-x-0 top-0 h-36 bg-[#353556]" />
        <div className="absolute inset-x-0 top-0 h-2 bg-[#ae5af3]" />
        <div className="absolute right-[-120px] top-24 h-80 w-80 rounded-full bg-[#f158d0]/10 blur-3xl" />
        <div className="absolute left-[-120px] bottom-10 h-80 w-80 rounded-full bg-[#ae5af3]/10 blur-3xl" />

        <section className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-[8px] border border-black/10 bg-white shadow-[0_18px_55px_rgba(53,53,86,0.16)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-between bg-[#353556] p-6 text-white md:p-8">
            <div>
              <div className="inline-flex items-center gap-3">
                {logo ? (
                  <img src={logo} alt={title} className="max-h-11 max-w-[170px] object-contain drop-shadow-lg" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#ae5af3] shadow-lg shadow-black/15">
                    <Music4 size={21} />
                  </div>
                )}
                <div>
                  <p className="text-lg font-extrabold leading-none">{title}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/55">CMS Terlindungi</p>
                </div>
              </div>

              <div className="mt-10">
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#f158d0]">Halaman Tidak Ditemukan</p>
                <h1 className="mt-3 text-4xl font-black leading-tight text-white md:text-5xl">Halaman tidak ditemukan</h1>
                <p className="mt-4 max-w-sm text-sm leading-6 text-white/72">
                  Link yang kamu buka tidak tersedia atau sudah dipindahkan. Silakan kembali ke dashboard untuk melanjutkan pekerjaan.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-[6px] border border-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <ArrowLeft size={18} />
              Kembali
            </button>
          </div>

          <div className="relative flex min-h-[360px] flex-col items-center justify-center p-6 text-center md:p-9">
            <div className="absolute right-7 top-7 flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#f158d0]/10 text-[#f158d0]">
              <SearchX size={20} />
            </div>

            <div className="relative">
              <div className="absolute inset-0 translate-y-6 rounded-full bg-[#353556]/10 blur-2xl" />
              <div className="relative text-[92px] font-black leading-none tracking-tight text-[#353556] md:text-[128px]">
                404
              </div>
            </div>

            <h2 className="mt-1 text-xl font-black text-[#343a40]">Oops, alamatnya kosong.</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#777]">
              Halaman ini tidak ada di sistem CMS {title}. Periksa kembali URL atau gunakan tombol di bawah.
            </p>

            <button
              type="button"
              onClick={() => router.push('/dashboard-aggregator')}
              className="mt-6 inline-flex items-center gap-2 rounded-[6px] bg-[#f158d0] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(241,88,208,0.28)] transition hover:bg-[#d93ab9]"
            >
              <Home size={18} />
              Ke Dashboard
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
