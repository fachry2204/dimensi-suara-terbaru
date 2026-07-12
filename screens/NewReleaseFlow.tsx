import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReleaseTypeSelection } from './ReleaseTypeSelection';
import { ReleaseType, ReleaseData } from '@/types';

interface NewReleaseFlowProps {
    editingRelease: ReleaseData | null;
    setEditingRelease: (release: ReleaseData | null) => void;
    onSaveRelease: (data: ReleaseData) => void;
    userRole?: string;
}

export const NewReleaseFlow: React.FC<NewReleaseFlowProps> = ({ 
    editingRelease, 
    setEditingRelease, 
    onSaveRelease,
    userRole
}) => {
    const navigate = useNavigate();
    const rolePath = (path: string) => userRole === 'User' ? `/user${path}` : path;

    useEffect(() => {
        setEditingRelease(null);
    }, [setEditingRelease]);

    const handleSelectType = (type: ReleaseType) => {
        const targetPath = type === 'SINGLE' 
            ? rolePath('/new-release/single') 
            : rolePath('/new-release/album');
        navigate(targetPath);
    };

    return <ReleaseTypeSelection onSelect={handleSelectType} />;
};
