import React from "react";

export function SpotifyIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} className={className} fill="none">
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path d="M6.6 9.3c3.9-1.15 8.2-.86 11.56.82" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.25 12.5c3.34-.9 7.02-.64 9.9.72" stroke="white" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M7.85 15.45c2.8-.68 5.74-.47 8.25.65" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
