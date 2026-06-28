import { ArrowBarToLeft } from 'tabler-icons-react';
import { Button } from 'react-bootstrap';
import Link from 'next/link';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';

const SidebarHeader = () => {
    const { states, dispatch } = useGlobalStateContext();

    const toggleSidebar = () => {
        dispatch({ type: 'sidebar_toggle' });
    }

    return (
        <div className="menu-header">
            <span>
                <Link className="navbar-brand d-flex align-items-center gap-2" href="/">
                    <div className="fw-bold fs-4 text-dark">Dimensi Suara</div>
                </Link>

            </span>
        </div>
    )
}

export default SidebarHeader
