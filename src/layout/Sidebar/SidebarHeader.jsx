import Link from 'next/link';
import { Music4 } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';
import { assetUrl } from '@/utils/url';

const SidebarHeader = () => {
    const { branding } = useBranding();
    const logoValue = branding?.logo || branding?.systemLogo || branding?.logo_url || branding?.logoUrl || branding?.system_logo;
    const logo = logoValue ? assetUrl(logoValue) : '';
    const title = branding?.login_title || 'Dimensi Suara';

    return (
        <div className="menu-header bg-black">
            <span>
                <Link className="navbar-brand d-flex align-items-center gap-2" href="/">
                    {logo ? (
                        <img src={logo} alt={title} className="sidebar-brand-logo" />
                    ) : (
                        <>
                            <div className="sidebar-brand-icon">
                                <Music4 size={20} />
                            </div>
                            <div className="fw-bold fs-4 text-dark">{title}</div>
                        </>
                    )}
                </Link>

            </span>
        </div>
    )
}

export default SidebarHeader
