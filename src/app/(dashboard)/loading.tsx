"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-[60vh] gap-4">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat halaman...</p>
    </div>
  );
}
