"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Headphones,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  MoreVertical,
  Phone,
  ShieldCheck,
  TrendingUp,
  Upload,
  User,
  Zap,
} from "lucide-react";
import { assetUrl } from "@/utils/url";

const navItems = ["Home", "Layanan", "Rilis", "Royalti", "Kontak"];

const serviceCards = [
  {
    icon: Upload,
    title: "Distribusi Digital",
    copy: "Distribusikan musik Anda ke Spotify, Apple Music, YouTube Music, TikTok, dan 150+ platform lainnya.",
    color: "pink",
  },
  {
    icon: DollarSign,
    title: "Publishing Royalti",
    copy: "Kelola hak cipta lagu dan kumpulkan royalti dari seluruh dunia dengan transparan.",
    color: "purple",
  },
  {
    icon: BarChart3,
    title: "Analitik Rilis",
    copy: "Pantau performa rilis Anda dengan data real-time dan laporan yang mudah dipahami.",
    color: "blue",
  },
];

const streamingRows = [
  ["Spotify", "1.24M", "bg-[#22c55e]", "w-[92%]"],
  ["Apple Music", "560K", "bg-[#ff4fb8]", "w-[58%]"],
  ["YouTube Music", "320K", "bg-[#ef4444]", "w-[38%]"],
  ["TikTok", "180K", "bg-[#8b5cf6]", "w-[28%]"],
  ["Deezer", "95K", "bg-[#38bdf8]", "w-[18%]"],
];

const topTracks = [
  ["Langit Tak Bergerak", "842K"],
  ["Bersandar Sepi", "623K"],
  ["Jika Nanti", "512K"],
  ["Terus Berjalan", "418K"],
  ["Sisa Waktu", "302K"],
];

const upcoming = [
  ["Jejak Waktu", "Ardi Lurang", "Single", "15 Mei 2024", "from-[#4b3219] to-[#d7b66d]"],
  ["Berlayar", "Rangga Mutakhir", "Single", "22 Mei 2024", "from-[#264353] to-[#c7e7ef]"],
  ["Diam Tanpa Kata", "Mawar Simanjuntak", "EP", "5 Jun 2024", "from-[#22120c] to-[#d9894e]"],
  ["Harapan Baru", "Udhin Leaders", "Single", "12 Jun 2024", "from-[#354b6d] to-[#c8e4ff]"],
];

type UpcomingRelease = {
  id: string | number;
  title: string;
  artist: string;
  type: string;
  status?: string;
  date: string;
  coverArt?: string;
  gradient?: string;
};

function formatReleaseDate(value: string | null | undefined) {
  if (!value) return "Tanggal belum diatur";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LandingPage() {
  const [branding, setBranding] = useState<any>(null);
  const logoValue =
    branding?.logo ||
    branding?.systemLogo ||
    branding?.logo_url ||
    branding?.logoUrl ||
    branding?.system_logo;
  const logo = logoValue ? assetUrl(logoValue) : "";
  const [processingReleases, setProcessingReleases] = useState<UpcomingRelease[]>([]);
  const [releaseStartIndex, setReleaseStartIndex] = useState(0);

  // Session state — check if user already logged in
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; role: string; avatar?: string } | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    fetch("/api/settings/branding", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const nextBranding = data?.branding || data;
        setBranding(nextBranding);
      })
      .catch(() => setBranding(null));
  }, []);

  // Check active session
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Not logged in");
        return res.json();
      })
      .then((data) => {
        // Response is wrapped: { success: true, user: { ... } }
        const u = data.user || data;
        const avatarPath = u.profile_picture || "";
        const avatarUrl = avatarPath
          ? avatarPath.startsWith("http")
            ? avatarPath
            : `/api/uploads/${avatarPath}`
          : "";
        setLoggedInUser({
          name: u.full_name || u.name || u.username || u.email || "User",
          role: u.role || "User",
          avatar: avatarUrl,
        });
      })
      .catch(() => setLoggedInUser(null))
      .finally(() => setSessionChecked(true));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setLoggedInUser(null);
    window.location.assign("/");
  };

  useEffect(() => {
    fetch("/api/public/processing-releases", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const releases = Array.isArray(data?.releases) ? data.releases : [];
        setProcessingReleases(
          releases.map((release: any) => ({
            id: release.id,
            title: release.title || "Untitled",
            artist: release.artist || "Unknown Artist",
            type: release.type || "Single",
            status: release.status || "Rilis",
            date: formatReleaseDate(release.releaseDate),
            coverArt: release.coverArt ? assetUrl(release.coverArt) : "",
          }))
        );
        setReleaseStartIndex(0);
      })
      .catch(() => setProcessingReleases([]));
  }, []);

  const fallbackReleases: UpcomingRelease[] = upcoming.map(([title, artist, type, date, gradient], index) => ({
    id: `fallback-${index}`,
    title,
    artist,
    type,
    status: "Rilis",
    date,
    gradient,
  }));
  const releaseItems = processingReleases.length > 0 ? processingReleases : fallbackReleases;
  const visibleReleases = Array.from({ length: Math.min(3, releaseItems.length) }, (_, index) => releaseItems[(releaseStartIndex + index) % releaseItems.length]).filter(Boolean);
  const canSlideReleases = releaseItems.length > visibleReleases.length;
  const showPrevRelease = () => {
    if (!releaseItems.length) return;
    setReleaseStartIndex((current) => (current - 1 + releaseItems.length) % releaseItems.length);
  };
  const showNextRelease = () => {
    if (!releaseItems.length) return;
    setReleaseStartIndex((current) => (current + 1) % releaseItems.length);
  };

  useEffect(() => {
    if (!canSlideReleases) return;
    const timer = window.setInterval(() => {
      setReleaseStartIndex((current) => (current + 1) % releaseItems.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [canSlideReleases, releaseItems.length]);

  const goToLogin = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.assign("/login");
  };

  const userRole = loggedInUser?.role?.toLowerCase();
  const isDashboardRole = userRole === 'admin' || userRole === 'user';
  const dashboardPath = userRole === 'admin' ? '/admin' : '/user/my-releases';

  return (
    <main className="min-h-screen overflow-hidden bg-[#030408] text-white">
      <section className="relative min-h-[auto] pb-10 px-6 py-6 sm:px-10 lg:px-16 xl:px-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_52%,rgba(112,51,255,0.35),transparent_26%),radial-gradient(circle_at_58%_36%,rgba(255,48,151,0.2),transparent_26%),linear-gradient(115deg,#030408_0%,#070812_38%,#050713_68%,#020307_100%)]" />
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(125deg,transparent_0%,transparent_62%,rgba(255,47,144,0.23)_63%,transparent_64%),linear-gradient(135deg,transparent_0%,transparent_56%,rgba(102,68,255,0.2)_57%,transparent_58%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black via-black/70 to-transparent" />
        <div className="absolute right-0 top-0 h-full w-[46vw] bg-[radial-gradient(circle_at_70%_45%,rgba(238,45,149,0.18),transparent_34%)]" />

        <header className="relative z-20 mx-auto flex max-w-[1740px] items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex h-[74px] w-[220px] shrink-0 items-center">
            {logo ? (
              <img src={logo} alt="Dimensi Suara" className="max-h-[70px] max-w-[220px] object-contain drop-shadow-[0_0_16px_rgba(73,225,255,0.35)]" />
            ) : (
              <span className="text-3xl font-black italic tracking-tight">DIMENSI SUARA</span>
            )}
          </Link>

          {/* Nav + Buttons in ONE row */}
          <div className="hidden flex-1 items-center justify-between lg:flex">
            {/* Nav links */}
            <nav className="flex items-center gap-10 text-[15px] font-black text-white/90">
              {navItems.map((item, index) => (
                <a
                  key={item}
                  href={index === 0 ? "#" : `#${item.toLowerCase()}`}
                  className={`relative pb-1 transition hover:text-[#ff3f8f] ${index === 0 ? "text-[#ff3f8f]" : ""}`}
                >
                  {item}
                  {index === 0 && <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-[#ff3f8f]" />}
                </a>
              ))}
            </nav>

            {/* Auth area — buttons OR logged-in profile */}
            {sessionChecked && (
              loggedInUser ? (
                /* Logged-in: show profile chip + go-to-dashboard + logout */
                <div className="flex items-center gap-3">
                  <a
                    href={isDashboardRole ? dashboardPath : '#'}
                    onClick={(event) => {
                      if (!isDashboardRole) event.preventDefault();
                    }}
                    className="flex items-center gap-2.5 rounded-[5px] border border-white/15 bg-white/8 px-4 py-2 text-[13px] font-black text-white/90 transition hover:border-[#ff3f8f]/50 hover:text-[#ff3f8f]"
                    title={isDashboardRole ? 'Buka dashboard' : 'Akun ini tidak memiliki halaman dashboard'}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#ff3f8f] to-[#7a35ff]">
                      {loggedInUser.avatar ? (
                        <img src={loggedInUser.avatar} alt={loggedInUser.name} className="h-full w-full object-cover" />
                      ) : (
                        <User size={14} />
                      )}
                    </div>
                    <span className="max-w-[120px] truncate">{loggedInUser.name}</span>
                    {isDashboardRole && <LayoutDashboard size={14} className="shrink-0 opacity-60" />}
                  </a>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 rounded-[5px] border border-red-500/30 bg-red-500/10 px-4 py-2 text-[13px] font-black text-red-400 transition hover:bg-red-500/20"
                  >
                    <LogOut size={13} />
                    Keluar
                  </button>
                </div>
              ) : (
                /* Not logged in: show Masuk + Daftar Gratis */
                <div className="flex items-center gap-3">
                  <a
                    href="/login"
                    onClick={goToLogin}
                    className="inline-flex rounded-[5px] border border-[#7bdcff]/45 bg-gradient-to-r from-[#37d5ff] to-[#467dff] px-5 py-2.5 text-[13px] font-black text-white shadow-[0_10px_26px_rgba(55,213,255,0.22)] transition hover:-translate-y-0.5 hover:from-[#56e0ff] hover:to-[#5b8dff]"
                  >
                    Masuk
                  </a>
                  <Link
                    href="/register"
                    className="rounded-[5px] bg-gradient-to-r from-[#ff3f8f] to-[#7a35ff] px-5 py-2.5 text-[13px] font-black text-white shadow-[0_10px_26px_rgba(255,63,143,0.22)] transition hover:-translate-y-0.5"
                  >
                    Daftar Gratis
                  </Link>
                </div>
              )
            )}
          </div>

          {/* Mobile: only show login button */}
          <div className="flex items-center gap-2 lg:hidden">
            {sessionChecked && !loggedInUser && (
              <a href="/login" onClick={goToLogin} className="rounded-[5px] bg-gradient-to-r from-[#ff3f8f] to-[#7a35ff] px-4 py-2 text-[12px] font-black text-white">
                Masuk
              </a>
            )}
            {sessionChecked && loggedInUser && (
              <a
                href={isDashboardRole ? dashboardPath : '#'}
                onClick={(event) => {
                  if (!isDashboardRole) event.preventDefault();
                }}
                className="flex items-center gap-2 rounded-[5px] border border-white/15 bg-white/8 px-3 py-2 text-[12px] font-black text-white"
                title={isDashboardRole ? 'Buka dashboard' : 'Akun ini tidak memiliki halaman dashboard'}
              >
                <User size={13} />
                {loggedInUser.name.split(" ")[0]}
              </a>
            )}
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-[1740px] grid-cols-1 gap-8 pt-8 lg:grid-cols-[0.88fr_1.12fr] lg:pt-10">
          <div className="relative z-10">
            <div className="mb-5 flex items-center gap-4 text-[15px] font-black uppercase tracking-[0.12em] text-[#ff3f70]">
              <span className="flex h-7 items-end gap-[3px]">
                {[18, 25, 14, 30, 20].map((height, index) => (
                  <span key={index} className="w-[3px] rounded-full bg-[#ff3f70]" style={{ height }} />
                ))}
              </span>
              Platform Distribusi Musik Modern
            </div>

            <h1 className="max-w-[660px] text-[48px] font-black leading-[1.03] tracking-[-0.045em] text-white sm:text-[62px] xl:text-[68px] 2xl:text-[74px]" style={{ color: "#ffffff" }}>
              Sebarkan Karya<br />
              <span className="bg-gradient-to-r from-[#ff3f8f] via-[#c63fff] to-[#4da3ff] bg-clip-text text-transparent">Musik Anda</span><br />
              ke Seluruh Dunia
            </h1>

            <p className="mt-8 max-w-[590px] text-[15px] leading-7 text-white/50">
              Kelola rilis, distribusikan musik ke seluruh platform digital, dan maksimalkan royalti Anda dengan data yang akurat dan transparan.
            </p>

            <div className="mt-7 flex flex-col gap-5 sm:flex-row">
              <a href="/login" onClick={goToLogin} className="inline-flex h-[54px] min-w-[230px] items-center justify-center gap-4 rounded-[5px] bg-gradient-to-r from-[#ff3f70] to-[#7c38ff] text-[15px] font-black text-white shadow-[0_18px_42px_rgba(255,63,143,0.22)] transition hover:-translate-y-0.5">
                Mulai Sekarang
                <ArrowRight size={20} />
              </a>
              <a href="#layanan" className="inline-flex h-[54px] min-w-[170px] items-center justify-center rounded-[5px] border border-[#9c35ff] bg-black/28 text-[15px] font-black text-white transition hover:border-[#ff3f8f] hover:text-[#ff3f8f]">
                Lihat Layanan
              </a>
            </div>

            <div className="mb-12 mt-7 grid max-w-[820px] grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                [Zap, "Distribusi Cepat", "Ke 150+ platform global"],
                [ShieldCheck, "Royalti Transparan", "Laporan real-time"],
                [TrendingUp, "Data Akurat", "Keputusan lebih cerdas"],
              ].map(([Icon, title, copy], index) => {
                const FeatureIcon = Icon as typeof Zap;
                return (
                  <div key={title as string} className={`flex min-w-0 items-center gap-4 ${index > 0 ? "sm:border-l sm:border-white/24 sm:pl-8" : ""}`}>
                    <FeatureIcon className="shrink-0 text-[#ff3f70]" size={34} />
                    <div className="min-w-0">
                      <div className="whitespace-nowrap text-[15px] font-black">{title as string}</div>
                      <div className="mt-1 whitespace-nowrap text-[13px] text-white/52">{copy as string}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative min-h-[420px] lg:min-h-[480px]">
            <div className="absolute left-0 top-[58px] hidden h-36 w-[560px] items-end gap-[5px] lg:flex">
              {[18, 44, 66, 92, 132, 98, 146, 172, 118, 82, 136, 190, 232, 174, 142, 96, 78, 112, 164, 206, 148, 104, 72].map((height, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-full bg-gradient-to-t from-[#ff3f70] via-[#e63fc5] to-[#3d7bff] shadow-[0_0_20px_rgba(255,63,143,0.45)]"
                  style={{ height }}
                />
              ))}
            </div>

            <div className="absolute left-[40px] top-[220px] hidden gap-4 lg:flex">
              {["Bersandar Sepi", "Nanti", "Terus Berjalan"].map((title, index) => (
                <div
                  key={title}
                  className={`h-32 w-24 rotate-[-8deg] rounded-[10px] border border-[#ff3f8f]/45 bg-gradient-to-br from-[#240716] to-[#4f2aff]/40 p-3 shadow-[0_24px_44px_rgba(0,0,0,0.45)] ${index === 1 ? "translate-y-8 rotate-[8deg]" : index === 2 ? "translate-y-24 rotate-[-10deg]" : ""}`}
                >
                  <div className="h-full rounded-[7px] bg-[radial-gradient(circle_at_50%_25%,rgba(255,74,165,0.75),transparent_35%),linear-gradient(180deg,#160b20,#050508)] p-2 text-center text-[10px] font-black uppercase tracking-wider text-white/85">
                    {title}
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute left-[265px] top-[218px] hidden h-[196px] w-[136px] -rotate-6 rounded-[16px] border border-[#ff4fd8]/60 bg-[#090d18] p-4 shadow-[0_0_42px_rgba(255,63,143,0.45)] lg:block">
              <div className="h-full rounded-[12px] bg-[radial-gradient(circle_at_50%_32%,rgba(255,69,166,0.72),transparent_36%),linear-gradient(180deg,#26133f,#050508)] p-3">
                <div className="mt-20 text-center text-2xl font-light tracking-[0.2em]">LANGIT</div>
                <div className="mt-1 text-center text-[10px] tracking-[0.28em] text-white/62">TAK BERJARAK</div>
                <div className="mt-8 h-1 rounded-full bg-white/20">
                  <div className="h-full w-2/3 rounded-full bg-[#ff3f8f]" />
                </div>
              </div>
            </div>

            <div className="relative ml-auto mt-1 w-full max-w-[560px] rotate-[-3deg] rounded-[22px] border border-[#b02cff]/60 bg-[#08101d]/92 p-4 shadow-[0_0_80px_rgba(135,48,255,0.28),0_30px_90px_rgba(0,0,0,0.72)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[13px] font-black text-white/86">Ringkasan Rilis</span>
                <MoreVertical size={17} className="text-white/50" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  ["Total Stream", "2.4M", "18.6%"],
                  ["Pendengar", "1.2M", "12.4%"],
                  ["Playlist", "3.6K", "9.7%"],
                  ["Royalti", "Rp 45.7M", "15.3%"],
                ].map(([label, value, growth]) => (
                  <div key={label} className="rounded-[8px] border border-white/8 bg-[#111a2b] p-3">
                    <div className="text-[10px] text-white/52">{label}</div>
                    <div className="mt-3 text-[17px] font-black">{value}</div>
                    <div className="mt-2 text-[10px] font-bold text-[#41e27e]">↑ {growth}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-[1.1fr_0.9fr] gap-4">
                <div className="rounded-[10px] border border-white/8 bg-[#111a2b] p-3">
                  <div className="mb-4 text-[12px] font-black text-white/78">Streaming Platform</div>
                  <div className="space-y-3">
                    {streamingRows.map(([name, value, color, width]) => (
                      <div key={name} className="grid grid-cols-[88px_1fr_45px] items-center gap-3 text-[11px] text-white/68">
                        <span>{name}</span>
                        <span className="h-[5px] rounded-full bg-white/8">
                          <span className={`block h-full rounded-full ${color} ${width}`} />
                        </span>
                        <span className="text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[10px] border border-white/8 bg-[#111a2b] p-3">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[12px] font-black text-white/78">Top Track</span>
                    <span className="rounded bg-white/5 px-2 py-1 text-[9px] text-white/50">Semua Platform</span>
                  </div>
                  <div className="space-y-3">
                    {topTracks.map(([title, value], index) => (
                      <div key={title} className="grid grid-cols-[28px_1fr_45px] items-center gap-2 text-[11px] text-white/72">
                        <span className="h-7 w-7 rounded bg-gradient-to-br from-[#251026] to-[#d39763]" />
                        <span className="truncate">{title}</span>
                        <span className="text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute right-[-28px] top-[225px] hidden h-[250px] w-[140px] rounded-full border-[18px] border-[#1b102a] shadow-[0_0_50px_rgba(255,63,143,0.28)] xl:block">
              <Headphones className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#ff3f8f]" size={72} />
            </div>
          </div>
        </div>

        <div id="layanan" className="relative z-10 mx-auto mt-0 grid max-w-[1740px] gap-5 lg:mt-[-42px] lg:grid-cols-3">
          {serviceCards.map((card) => {
            const Icon = card.icon;
            const accent =
              card.color === "pink"
                ? "bg-[#ff3f70]/28 text-[#ff6aa5]"
                : card.color === "purple"
                  ? "bg-[#7b35ff]/32 text-[#be73ff]"
                  : "bg-[#3c32ff]/28 text-[#8d7dff]";
            const border =
              card.color === "pink"
                ? "border-[#ff3f70]/25 shadow-[inset_0_0_34px_rgba(255,63,112,0.06)]"
                : card.color === "purple"
                  ? "border-[#9c35ff]/25 shadow-[inset_0_0_34px_rgba(156,53,255,0.07)]"
                  : "border-[#2f89ff]/25 shadow-[inset_0_0_34px_rgba(47,137,255,0.07)]";
            return (
              <article key={card.title} className={`group min-h-[140px] rounded-[4px] border bg-[#070a10]/82 p-5 transition hover:border-[#ff3f8f]/45 ${border}`}>
                <div className="flex h-full items-start gap-5">
                  <div className={`flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-[13px] ${accent}`}>
                    <Icon size={35} />
                  </div>
                  <div className="min-w-0 pt-1">
                    <h2 className="text-[18px] font-black text-white" style={{ color: "#ffffff" }}>{card.title}</h2>
                    <p className="mt-2 text-[13px] font-medium leading-5 text-white/56">{card.copy}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>


        {/* Rilis Mendatang — Section Header */}
        <div className="relative z-10 mx-auto mt-14 max-w-[1740px] mb-6 text-center">
          <h2 className="text-[32px] font-black leading-tight text-white sm:text-[40px]" style={{ color: "#ffffff" }}>
            Karya Terbaru{" "}
            <span className="bg-gradient-to-r from-[#ff3f8f] to-[#8a45ff] bg-clip-text text-transparent">
              Artist Kami
            </span>
          </h2>
        </div>

        <div id="rilis" className="relative z-10 mx-auto flex max-w-[1740px] items-center gap-8 overflow-hidden rounded-[5px] border border-white/10 bg-[#070a10]/86 px-5 py-4 shadow-[0_16px_70px_rgba(0,0,0,0.3)]">
          <span className="absolute left-0 top-4 h-8 w-[4px] rounded-r-full bg-[#ff3f70]" />
          <div className="grid flex-1 grid-cols-3 items-center gap-9 overflow-hidden pl-2">
            {visibleReleases.map((release) => (
              <div key={release.id} className="grid min-w-0 grid-cols-[72px_minmax(0,145px)_auto] items-center gap-4">
                <div className={`h-[66px] w-[72px] overflow-hidden rounded-[5px] border border-[#ffe06a]/55 bg-gradient-to-br ${release.gradient || "from-[#24122c] to-[#d94892]"}`}>
                  {release.coverArt && <img src={release.coverArt} alt={release.title} className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 max-w-[145px]">
                  <div className="truncate text-[14px] font-black leading-5 text-white" title={release.title}>{release.title}</div>
                  <div className="mt-1 truncate text-[13px] leading-5 text-white/44" title={release.artist}>{release.artist}</div>
                  <div className="mt-2 whitespace-nowrap text-[13px] text-white/44">{release.date}</div>
                </div>
                <span className="self-start whitespace-nowrap rounded-[5px] bg-emerald-400/15 px-3 py-1.5 text-[13px] font-bold uppercase text-emerald-300">
                  {release.status || "Rilis"}
                </span>
              </div>
            ))}
          </div>
          <div className="hidden shrink-0 gap-3 xl:flex">
            <button type="button" onClick={showPrevRelease} disabled={!canSlideReleases} aria-label="Rilis sebelumnya" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-white/10 text-white/80 shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition hover:bg-[#ff3f70]/25 disabled:cursor-not-allowed disabled:opacity-45">
              <ChevronLeft size={23} strokeWidth={2.5} />
            </button>
            <button type="button" onClick={showNextRelease} disabled={!canSlideReleases} aria-label="Rilis berikutnya" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-white/10 text-white/80 shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition hover:bg-[#ff3f70]/25 disabled:cursor-not-allowed disabled:opacity-45">
              <ChevronRight size={23} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Kontak Section ─── */}
      <section id="kontak" className="relative overflow-hidden bg-[#030408] px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,63,143,0.10),transparent_40%),radial-gradient(circle_at_80%_50%,rgba(74,119,255,0.10),transparent_40%)]" />

        <div className="relative mx-auto max-w-[1740px]">
          {/* Header */}
          <div className="mb-6 text-center">
            <h2 className="text-[32px] font-black leading-tight text-white sm:text-[40px]" style={{ color: "#ffffff" }}>
              Ada Pertanyaan?{" "}
              <span className="bg-gradient-to-r from-[#ff3f8f] to-[#8a45ff] bg-clip-text text-transparent">
                Kami Siap Membantu
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-7 text-white/50">
              Tim kami siap menjawab pertanyaan seputar distribusi musik, royalti, dan layanan Dimensi Suara.
            </p>
          </div>

          {/* 3 Contact Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">

            {/* Email */}
            <a
              href="mailto:info@dimensisuara.id"
              className="group relative flex flex-col items-center overflow-hidden rounded-[16px] border border-[#ff3f70]/25 bg-[#070a10]/90 px-8 py-10 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#ff3f70]/55 hover:shadow-[0_24px_60px_rgba(255,63,112,0.16)]"
            >
              <div className="absolute right-0 top-0 h-[160px] w-[160px] rounded-full bg-[radial-gradient(circle,rgba(255,63,112,0.12),transparent_70%)] blur-2xl" />
              {/* Icon */}
              <div className="mb-6 flex h-[68px] w-[68px] items-center justify-center rounded-[18px] bg-gradient-to-br from-[#ff3f70]/30 to-[#ff3f70]/10 ring-1 ring-[#ff3f70]/30 transition group-hover:scale-110">
                <Mail size={30} className="text-[#ff6a9f]" />
              </div>
              <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#ff3f70]">Email</div>
              <h3 className="mb-3 text-[18px] font-black text-white" style={{ color: "#ffffff" }}>Kirim Email</h3>
              <p className="mb-5 text-[13px] leading-6 text-white/55">
                Hubungi kami melalui email untuk pertanyaan umum, kerjasama, atau informasi layanan.
              </p>
              <span className="mt-auto inline-flex items-center gap-2 rounded-[6px] bg-[#ff3f70]/15 px-4 py-2 text-[13px] font-black text-[#ff6a9f] transition group-hover:bg-[#ff3f70]/25">
                info@dimensisuara.id
              </span>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col items-center overflow-hidden rounded-[16px] border border-[#22c55e]/25 bg-[#070a10]/90 px-8 py-10 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#22c55e]/55 hover:shadow-[0_24px_60px_rgba(34,197,94,0.14)]"
            >
              <div className="absolute right-0 top-0 h-[160px] w-[160px] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.10),transparent_70%)] blur-2xl" />
              {/* Icon */}
              <div className="mb-6 flex h-[68px] w-[68px] items-center justify-center rounded-[18px] bg-gradient-to-br from-[#22c55e]/30 to-[#22c55e]/10 ring-1 ring-[#22c55e]/30 transition group-hover:scale-110">
                <Phone size={30} className="text-[#4ade80]" />
              </div>
              <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#22c55e]">WhatsApp</div>
              <h3 className="mb-3 text-[18px] font-black text-white" style={{ color: "#ffffff" }}>Chat Langsung</h3>
              <p className="mb-5 text-[13px] leading-6 text-white/55">
                Respon cepat melalui WhatsApp. Tim kami aktif pada hari kerja pukul 09.00–17.00 WIB.
              </p>
              <span className="mt-auto inline-flex items-center gap-2 rounded-[6px] bg-[#22c55e]/12 px-4 py-2 text-[13px] font-black text-[#4ade80] transition group-hover:bg-[#22c55e]/22">
                +62 812-3456-7890
              </span>
            </a>

            {/* Alamat */}
            <a
              href="https://www.google.com/maps/place/Ruang+Dimensi+Records/data=!4m2!3m1!1s0x0:0xd85f4f5c6ab65de2?sa=X&ved=1t:2428&ictx=111"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col items-center overflow-hidden rounded-[16px] border border-[#4da3ff]/25 bg-[#070a10]/90 px-8 py-10 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#4da3ff]/55 hover:shadow-[0_24px_60px_rgba(77,163,255,0.14)]"
            >
              <div className="absolute right-0 top-0 h-[160px] w-[160px] rounded-full bg-[radial-gradient(circle,rgba(77,163,255,0.10),transparent_70%)] blur-2xl" />
              {/* Icon */}
              <div className="mb-6 flex h-[68px] w-[68px] items-center justify-center rounded-[18px] bg-gradient-to-br from-[#4da3ff]/30 to-[#4da3ff]/10 ring-1 ring-[#4da3ff]/30 transition group-hover:scale-110">
                <MapPin size={30} className="text-[#7dbfff]" />
              </div>
              <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#4da3ff]">Alamat</div>
              <h3 className="mb-3 text-[18px] font-black text-white" style={{ color: "#ffffff" }}>Kantor Kami</h3>
              <p className="mb-5 text-[13px] leading-6 text-white/55">
                Kunjungi kantor kami atau kirimkan surat resmi ke alamat berikut.
              </p>
              <span className="mt-auto inline-flex items-center gap-2 rounded-[6px] bg-[#4da3ff]/12 px-5 py-2.5 text-[13px] font-black text-[#7dbfff] transition group-hover:bg-[#4da3ff]/22 leading-relaxed text-center">
                Cluster Hanalei, Tangkil,<br />Kec. Citeureup, Kabupaten Bogor,<br />Jawa Barat 16810
              </span>
            </a>

          </div>

          {/* Bottom CTA strip */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-[10px] border border-white/8 bg-white/3 px-8 py-6 text-center">
            <p className="text-[14px] text-white/50">Jam operasional kami: <strong className="text-white/80">Senin – Jumat, 09.00 – 17.00 WIB</strong></p>
            <p className="text-[13px] text-white/35">Respons email biasanya dalam 1×24 jam kerja</p>
          </div>
        </div>
      </section>

      <footer className="relative overflow-hidden border-t border-white/10 bg-[#030408] px-6 pb-5 pt-3 text-white sm:px-10 lg:px-16 xl:px-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,63,143,0.16),transparent_28%),radial-gradient(circle_at_82%_0%,rgba(74,119,255,0.14),transparent_26%)]" />
        <div className="relative mx-auto grid max-w-[1740px] gap-6 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:items-start">
          <div>
            <div className="flex h-[62px] w-[220px] items-center">
              {logo ? (
                <img src={logo} alt="Dimensi Suara" className="max-h-[58px] max-w-[220px] object-contain drop-shadow-[0_0_16px_rgba(73,225,255,0.28)]" />
              ) : (
                <span className="text-2xl font-black italic tracking-tight">DIMENSI SUARA</span>
              )}
            </div>
            <p className="mt-4 max-w-[470px] text-[14px] leading-6 text-white/52">
              Platform distribusi musik dan publishing untuk membantu artis, label, dan tim aggregator mengelola rilis, metadata, dan royalti secara terpusat.
            </p>
          </div>

          <div>
            <h3 className="text-[13px] font-black uppercase tracking-[0.18em] text-[#ff3f8f]">Navigasi</h3>
            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-[14px] font-bold text-white/60">
              {navItems.map((item, index) => (
                <a key={item} href={index === 0 ? "#" : `#${item.toLowerCase()}`} className="transition hover:text-white">
                  {item}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[13px] font-black uppercase tracking-[0.18em] text-[#37d5ff]">Akses CMS</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href="/login" onClick={goToLogin} className="rounded-[5px] bg-gradient-to-r from-[#37d5ff] to-[#467dff] px-5 py-2.5 text-[13px] font-black text-white shadow-[0_10px_26px_rgba(55,213,255,0.18)]">
                Masuk
              </a>
              <Link href="/register" className="rounded-[5px] border border-white/14 px-5 py-2.5 text-[13px] font-black text-white/80 transition hover:border-[#ff3f8f] hover:text-[#ff3f8f]">
                Daftar Gratis
              </Link>
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-4 flex max-w-[1740px] flex-col gap-2 border-t border-white/10 pt-3 text-[13px] text-white/42 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Dimensi Suara. Semua hak dilindungi.</span>
          <span>{branding?.login_footer || "Protected CMS Area. Authorized personnel only."}</span>
        </div>
      </footer>
    </main>
  );
}
