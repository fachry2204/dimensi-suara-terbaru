"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ReleaseTypeSelection } from '../../../../screens/ReleaseTypeSelection';

export default function NewReleasePage() {
    const router = useRouter();
    const pathname = usePathname();
    const routePrefix = pathname?.startsWith('/user') ? '/user' : pathname?.startsWith('/admin') ? '/admin' : '';

    const handleSelectType = (type: string) => {
        const targetPath = type === 'SINGLE' 
            ? `${routePrefix}/new-release/single` 
            : `${routePrefix}/new-release/album`;
        router.push(targetPath);
    };

    return (
        <div className="w-full p-4">
            {pathname?.startsWith('/admin') && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition-all shadow-md shadow-red-600/20 mb-6 w-fit"
              >
                ← Menuju Dashboard
              </Link>
            )}
            <ReleaseTypeSelection onSelect={handleSelectType as any} />
        </div>
    );
}
