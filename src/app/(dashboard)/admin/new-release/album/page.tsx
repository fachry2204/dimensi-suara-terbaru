"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ReleaseWizard } from '../../../../../../screens/ReleaseWizard';
import { ReleaseData } from '@/types';

export default function AlbumReleasePage() {
    const router = useRouter();
    const pathname = usePathname();
    const routePrefix = pathname?.startsWith('/user') ? '/user' : pathname?.startsWith('/admin') ? '/admin' : '';

    const handleBack = () => {
        router.push(`${routePrefix}/new-release`);
    };

    const handleSave = (data: ReleaseData) => {
        router.push(`${routePrefix}/releases`);
    };

    return (
        <div className="w-full relative z-10">
            <ReleaseWizard 
                type="ALBUM"
                onBack={handleBack}
                onSave={handleSave}
                userRole="Admin"
            />
        </div>
    );
}
