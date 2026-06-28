"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ReleaseTypeSelection } from '../../../../screens/ReleaseTypeSelection';

export default function NewReleasePage() {
    const router = useRouter();

    const handleSelectType = (type: string) => {
        const targetPath = type === 'SINGLE' 
            ? '/new-release/single' 
            : '/new-release/album';
        router.push(targetPath);
    };

    return (
        <div className="w-full">
            <ReleaseTypeSelection onSelect={handleSelectType as any} />
        </div>
    );
}
