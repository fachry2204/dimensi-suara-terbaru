"use client";

import React, { useEffect } from 'react';
import { useRouter, notFound } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DashboardPageRedirect() {
    const router = useRouter();

    useEffect(() => {
        const checkRoleAndRedirect = async () => {
            try {
                const res = await fetch('/api/auth/me', { credentials: 'include' });
                if (!res.ok) {
                    router.replace('/login');
                    return;
                }
                const profile = await res.json();
                const role = profile?.user?.role || profile?.role || '';

                if (role.toLowerCase() === 'user') {
                    notFound();
                    return;
                }
                
                // If admin/operator, redirect to new /admin endpoint
                router.replace('/admin');
            } catch {
                notFound();
            }
        };
        checkRoleAndRedirect();
    }, [router]);

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50/50">
            <Loader2 size={36} className="animate-spin text-slate-400" />
            <span className="mt-3 text-slate-500 font-medium text-sm">Mengalihkan...</span>
        </div>
    );
}
