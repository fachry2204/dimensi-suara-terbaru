"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReleaseWizard } from '../../../../../screens/ReleaseWizard';
import { ReleaseData } from '@/types';

export default function SingleReleasePage() {
    const router = useRouter();
    const [userRole, setUserRole] = useState('User');

    useEffect(() => {
        // Safe check for browser environment
        if (typeof window !== 'undefined') {
            const role = localStorage.getItem('cms_role') || 'User';
            setUserRole(role);
        }
    }, []);

    const handleBack = () => {
        router.push('/new-release');
    };

    const handleSave = (data: ReleaseData) => {
        router.push('/releases');
    };

    return (
        <div className="w-full relative z-10">
            <ReleaseWizard 
                type="SINGLE"
                onBack={handleBack}
                onSave={handleSave}
                userRole={userRole}
            />
        </div>
    );
}
