"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";

type Announcement = {
  id: number;
  title: string;
  body: string;
  start_date: string;
  end_date: string;
};

export function UserAnnouncementPopup() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/announcements/active", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const nextAnnouncement = data?.announcement || null;
        if (!nextAnnouncement?.id) return;

        const storageKey = `dimensi_announcement_seen_${nextAnnouncement.id}`;
        if (typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "1") {
          return;
        }

        setAnnouncement(nextAnnouncement);
        setIsOpen(true);
      })
      .catch(() => {});
  }, []);

  if (!announcement || !isOpen) return null;

  const closePopup = () => {
    window.localStorage.setItem(`dimensi_announcement_seen_${announcement.id}`, "1");
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-white text-slate-900 shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-500" />
        <button
          type="button"
          onClick={closePopup}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
          aria-label="Tutup pengumuman"
        >
          <X size={18} />
        </button>

        <div className="p-7">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-200">
            <BellRing size={25} />
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-fuchsia-600">Pengumuman</p>
          <h2 className="mt-2 pr-10 text-2xl font-black leading-tight text-slate-950">{announcement.title}</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-600">{announcement.body}</p>

          <button
            type="button"
            onClick={closePopup}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-fuchsia-600"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
