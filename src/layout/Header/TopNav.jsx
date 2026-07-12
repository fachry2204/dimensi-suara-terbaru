import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import SimpleBar from 'simplebar-react';
import { AlignLeft, Bell, Calendar, CheckSquare, Clock, CreditCard, Plus, Search, Settings, Tag, Disc, Edit, AlertCircle, Shield } from 'react-feather';
import { Button, Container, Dropdown, Form, InputGroup, Nav, Navbar } from 'react-bootstrap';
import classNames from 'classnames';
import { motion } from 'framer-motion';
import HkBadge from '@/components/@hk-badge/@hk-badge';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import React from 'react';
import { API_BASE_URL } from '@/utils/api';

const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
};

//Images
import avatar2 from '@/assets/img/avatar2.jpg';
import avatar3 from '@/assets/img/avatar3.jpg';
import avatar4 from '@/assets/img/avatar4.jpg';
import avatar10 from '@/assets/img/avatar10.jpg';
import avatar12 from '@/assets/img/avatar12.jpg';
import { ThemeSwitcher } from '../theme-provider/theme-switcher';


const CustomMotionMenu = React.forwardRef(({ show, renderOnMount, align, flip, ...props }, ref) => (
    <motion.div ref={ref} {...props} />
));
CustomMotionMenu.displayName = "CustomMotionMenu";

const TopNav = () => {
    const router = useRouter();
    const { states, dispatch } = useGlobalStateContext();
    const [notifications, setNotifications] = useState([]);
    const [currentUser, setCurrentUser] = useState({
        name: 'Administrator',
        email: 'admin@dimensisuara.id',
    });
    const [isImpersonating, setIsImpersonating] = useState(false);

    useEffect(() => {
        setIsImpersonating(document.cookie.split(';').some((cookie) => cookie.trim() === 'dimensi_impersonating=1'));

        const fetchCurrentUser = async () => {
            try {
                const res = await fetch('/api/auth/me', { credentials: 'include' });
                if (!res.ok) return;
                const data = await res.json().catch(() => null);
                if (data?.user) {
                    setCurrentUser({
                        name: data.user.name || data.user.email || 'Administrator',
                        email: data.user.email || 'admin@dimensisuara.id',
                    });
                }
            } catch (err) {
                // Keep fallback user label.
            }
        };

        fetchCurrentUser();
    }, []);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                // Get token from local storage or cookie, depending on auth strategy
                // Since this component is client-side, we may have the token in localStorage
                const token = typeof window !== 'undefined' ? localStorage.getItem('cms_token') : null;
                const res = await fetch(`${API_BASE_URL}/notifications`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    credentials: 'include',
                });
                if (!res.ok) {
                    setNotifications([]);
                    return;
                }
                const data = await res.json().catch(() => []);
                if (Array.isArray(data)) {
                    setNotifications(data);
                }
            } catch (err) {
                setNotifications([]);
            }
        };

        fetchNotifications();
        
        // Optional: poll every minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleMarkAsRead = async () => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('cms_token') : null;
            await fetch(`${API_BASE_URL}/notifications/mark-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({}),
                credentials: 'include',
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            // Notification status is non-blocking for navigation.
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (e) {
            console.error('Logout error', e);
        }
    };

    const handleBackToAdmin = async () => {
        try {
            const res = await fetch('/api/admin/impersonate/stop', {
                method: 'POST',
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data?.error || 'Gagal kembali ke admin');
            }

            router.push(data?.redirectTo || '/admin/users');
        } catch (error) {
            alert(error?.message || 'Gagal kembali ke admin');
        }
    };

    const pageVariants = {
        initial: { opacity: 0, y: 10 },
        open: { opacity: 1, y: 0 },
        close: { opacity: 0, y: 10 }
    };

    const getIconForType = (type) => {
        switch(type) {
            case 'UPLOAD': return <Disc />;
            case 'EDIT': return <Edit />;
            case 'ADMIN_ALERT': return <AlertCircle />;
            default: return <Bell />;
        }
    };

    const getColorForType = (type) => {
        switch(type) {
            case 'UPLOAD': return 'bg-success';
            case 'EDIT': return 'bg-primary';
            case 'ADMIN_ALERT': return 'bg-warning';
            default: return 'bg-secondary';
        }
    };

    return (
        <Navbar expand="xl" className="hk-navbar navbar-light fixed-top" >
            <Container fluid>
                {/* Start Nav */}
                <div className="nav-start-wrap">
                    <Button variant="flush-dark" onClick={() => dispatch({ type: 'sidebar_toggle', sidebarCollapse: !states.sidebarCollapse })} className="btn-icon btn-rounded flush-soft-hover navbar-toggle d-xl-none">
                        <span className="icon">
                            <span className="feather-icon"><AlignLeft /></span>
                        </span>
                    </Button>
                    {/* Search removed as requested */}
                </div>
                {/* /Start Nav */}
                {/* End Nav */}
                <div className="nav-end-wrap">
                    <Nav className="navbar-nav flex-row">
                        {isImpersonating && (
                            <Nav.Item className="d-flex align-items-center me-2">
                                <button
                                    type="button"
                                    onClick={handleBackToAdmin}
                                    className="btn btn-warning fw-bold d-flex align-items-center gap-2 rounded-pill px-3 py-2"
                                >
                                    <Shield size={16} />
                                    Kembali ke Admin
                                </button>
                            </Nav.Item>
                        )}
                        <Nav.Item className='ms-2'>
                            <ThemeSwitcher />
                        </Nav.Item>
                        <Nav.Item>
                            <Dropdown className="dropdown-notifications">
                                <Dropdown.Toggle variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover no-caret" onClick={handleMarkAsRead}>
                                    <span className="icon">
                                        <span className="position-relative">
                                            <span className="feather-icon"><Bell /></span>
                                            {unreadCount > 0 && (
                                                <HkBadge bg="danger" indicator className="position-top-end-overflow-1" />
                                            )}
                                        </span>
                                    </span>
                                </Dropdown.Toggle>
                                <Dropdown.Menu align="end" className="p-0">
                                    <Dropdown.Header className="px-4 fs-6">
                                        Notifikasi
                                    </Dropdown.Header>
                                    <SimpleBar className="dropdown-body p-2" style={{ maxHeight: '400px' }}>
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-muted">Belum ada notifikasi baru</div>
                                        ) : (
                                            notifications.map((notif, index) => (
                                                <Dropdown.Item key={index}>
                                                    <div className="media">
                                                        <div className="media-head">
                                                            <div className={`avatar avatar-icon avatar-sm ${getColorForType(notif.type)} avatar-rounded`}>
                                                                <span className="initial-wrap">
                                                                    <span className="feather-icon">{getIconForType(notif.type)}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="media-body">
                                                            <div>
                                                                <div className={`notifications-text ${!notif.is_read ? 'fw-bold' : ''}`}>
                                                                    {notif.message}
                                                                </div>
                                                                <div className="notifications-info">
                                                                    <div className="notifications-time">
                                                                        {timeAgo(notif.created_at)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Dropdown.Item>
                                            ))
                                        )}
                                    </SimpleBar>
                                    <div className="dropdown-footer">
                                        <Link href="#"><u>Lihat semua notifikasi</u>
                                        </Link>
                                    </div>
                                </Dropdown.Menu>
                            </Dropdown>
                        </Nav.Item>
                        <Nav.Item>
                            <Dropdown className="ps-2">
                                <Dropdown.Toggle as={Link} href="#" className="no-caret d-flex align-items-center gap-3 topnav-profile-toggle">
                                    <div className="topnav-welcome text-end d-none d-md-block">
                                        <div className="topnav-welcome-label">Selamat Datang</div>
                                        <div className="topnav-welcome-name">{currentUser.name}</div>
                                    </div>
                                    <div className="avatar topnav-profile-avatar">
                                        <Image src={avatar12} alt={currentUser.name || 'user'} className="avatar-img" />
                                    </div>
                                </Dropdown.Toggle>
                                <Dropdown.Menu align="end">
                                    <div className="p-2">
                                        <div className="media">
                                            <div className="media-head me-2">
                                                <div className="avatar avatar-primary avatar-sm avatar-rounded">
                                                    <span className="initial-wrap">DS</span>
                                                </div>
                                            </div>
                                            <div className="media-body">
                                                <div className="fs-7 fw-bold text-dark">{currentUser.name}</div>
                                                <div className="fs-7 text-muted">{currentUser.email}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <Dropdown.Divider as="div" />
                                    <Dropdown.Item as={Link} href="/profile" >Profil</Dropdown.Item>
                                    <Dropdown.Item>Pengaturan</Dropdown.Item>
                                    <div className="px-3 pb-3 pt-2">
                                        <button
                                            onClick={handleLogout}
                                            className="btn btn-danger w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                                            type="button"
                                        >
                                            Keluar
                                        </button>
                                    </div>
                                </Dropdown.Menu>
                            </Dropdown>
                        </Nav.Item>
                    </Nav>
                </div>
                {/* /End Nav */}
            </Container>
        </Navbar>
    )
}

export default TopNav;
