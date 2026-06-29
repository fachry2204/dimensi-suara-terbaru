"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function GlobalLoading() {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-slate-50 gap-4">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat halaman...</p>
    </div>
  );
}
