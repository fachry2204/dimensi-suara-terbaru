/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useState } from 'react';
import { Button, Card, Nav, NavLink } from 'react-bootstrap';
import SimpleBar from 'simplebar-react';
import SidebarHeader from './SidebarHeader';
import { SidebarMenu } from './SidebarMenu';
import classNames from 'classnames';
import Link from 'next/link';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { usePathname } from 'next/navigation';
import { useTheme } from '../theme-provider/theme-provider';

const Sidebar = () => {
    const { dispatch } = useGlobalStateContext();
    const [activeMenu, setActiveMenu] = useState();
    const [activeSubMenu, setActiveSubMenu] = useState();
    const pathname = usePathname();
    const { theme } = useTheme();
    const [userRole, setUserRole] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('cms_role') || 'User';
        }
        return 'User';
    });

    useEffect(() => {
        require("bootstrap/js/dist/collapse");
        
        const role = typeof window !== 'undefined' ? localStorage.getItem('cms_role') : 'User';
        setUserRole(role || 'User');
        
        fetch('/api/auth/me', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                const nextRole = data?.user?.role || data?.role;
                if (nextRole) {
                    setUserRole(nextRole);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('cms_role', nextRole);
                    }
                }
            })
            .catch(err => console.warn("Failed to fetch user role:", err));
    }, []);

    const handleClick = (menuName) => {
        setActiveMenu(menuName);
    }

    const filteredMenu = SidebarMenu.filter(routes => {
        if (userRole?.toLowerCase() === 'user') {
            const isPublishingRoute = pathname.startsWith('/user/publishing');
            if (isPublishingRoute) {
                return routes.id === 'utama_publishing' || routes.group === 'Publishing' || routes.group === 'Laporan Publishing' || routes.id === 'switch_service_aggregator';
            } else {
                return (routes.group === 'Utama' && routes.id === 'utama_user_aggregator') || routes.group === 'Aggregator' || routes.group === 'Laporan Aggregator' || routes.id === 'switch_service_publishing';
            }
        }
        return false;
    });

    useEffect(() => {
        for (const routes of filteredMenu) {
            const matchedMenu = routes.contents.find((menu) => menu.childrens && pathname.startsWith(menu.path));
            if (matchedMenu) {
                setActiveMenu(matchedMenu.name);
                return;
            }
        }
    }, [pathname, filteredMenu]);


    return (
        <>
            <div className="hk-menu">
                {/* Brand */}
                <SidebarHeader />
                {/* Main Menu */}
                <SimpleBar className="nicescroll-bar">
                    <div className="menu-content-wrap">
                        {filteredMenu.map((routes, index) => (
                            <React.Fragment key={index}>
                                <div className="menu-group" >
                                    {routes.group && <div className="nav-header" >
                                        <span>{routes.group}</span>
                                    </div>}
                                    {routes.contents.map((menus, idx) => (
                                        <Nav bsPrefix="navbar-nav" className="flex-column" key={idx}>
                                            <Nav.Item className={classNames({ "active": pathname === menus.path || pathname.startsWith(`${menus.path}/`) })}>
                                                {
                                                    menus.childrens
                                                        ?
                                                        <>
                                                            {(() => {
                                                                const isOpen = activeMenu === menus.name || pathname.startsWith(menus.path);
                                                                return (
                                                                <>
                                                            <Nav.Link aria-expanded={isOpen ? "true" : "false"} onClick={() => setActiveMenu(prev => prev === menus.name ? undefined : menus.name)} >
                                                                <span className={classNames("nav-icon-wrap", { "position-relative": menus.iconBadge })}>
                                                                    {menus.iconBadge && menus.iconBadge}
                                                                    <span className="svg-icon">
                                                                        {menus.icon}
                                                                    </span>
                                                                </span>
                                                                <span className={classNames("nav-link-text", { "position-relative": menus.badgeIndicator })} >
                                                                    {menus.name}
                                                                    {menus.badgeIndicator && menus.badgeIndicator}
                                                                </span>
                                                                {menus.badge && menus.badge}
                                                            </Nav.Link>

                                                            {/* <Collapse in={open}> */}
                                                            <ul id={menus.id} className={classNames("nav flex-column nav-children", { "collapse": !isOpen, "show": isOpen })}>
                                                                <li className="nav-item">
                                                                    <ul className="nav flex-column">
                                                                        {menus.childrens.map((subMenu, indx) => (
                                                                            subMenu.childrens
                                                                                ?
                                                                                <li className="nav-item" key={indx} >
                                                                                    <Nav.Link as={Link} href={subMenu.path} className="nav-link" data-bs-toggle="collapse" data-bs-target={`#${subMenu.id}`} aria-expanded={activeSubMenu === subMenu.name ? "true" : "false"} onClick={() => setActiveSubMenu(subMenu.name)}>
                                                                                        <span className="nav-link-text">
                                                                                            {subMenu.name}
                                                                                        </span>
                                                                                    </Nav.Link>

                                                                                    {subMenu.childrens.map((childrenPath, i) => (
                                                                                        <ul id={subMenu.id} className={classNames("nav flex-column nav-children", { "collapse": activeSubMenu !== subMenu.name })} key={i}>
                                                                                            <li className="nav-item">
                                                                                                <ul className="nav flex-column">
                                                                                                    <li className="nav-item">
                                                                                                        <Link href={childrenPath.path} onClick={handleClick} className={classNames("nav-link", { "active": pathname === childrenPath.path })}>
                                                                                                            <span className="nav-link-text">
                                                                                                                {childrenPath.name}
                                                                                                            </span>
                                                                                                        </Link>
                                                                                                    </li>
                                                                                                </ul>
                                                                                            </li>
                                                                                        </ul>
                                                                                    ))}

                                                                                </li>
                                                                                :
                                                                                <li className="nav-item" key={indx}>
                                                                                    <Link href={subMenu.path} onClick={() => handleClick(menus.name)} className={classNames("nav-link", { "active": pathname === subMenu.path })}>
                                                                                        <span className="nav-link-text">
                                                                                            {subMenu.name}
                                                                                        </span>
                                                                                    </Link>
                                                                                </li>
                                                                        ))}
                                                                    </ul>
                                                                </li>
                                                            </ul>
                                                            {/* </Collapse> */}
                                                                </>
                                                                );
                                                            })()}

                                                        </>
                                                        :
                                                        <>
                                                            {
                                                                (routes.group === "Documentation")
                                                                    ?
                                                                    <a className="nav-link" href={menus.path} >
                                                                        <span className="nav-icon-wrap">
                                                                            <span className="svg-icon">
                                                                                {menus.icon}
                                                                            </span>
                                                                        </span>
                                                                        <span className="nav-link-text">{menus.name}</span>
                                                                        {menus.badge && menus.badge}
                                                                    </a>
                                                                    :
                                                                    <Link href={menus.path} onClick={() => handleClick(menus.name)} className={classNames("nav-link", { "active": pathname === menus.path })} >
                                                                        <span className="nav-icon-wrap">
                                                                            <span className="svg-icon">
                                                                                {menus.icon}
                                                                            </span>
                                                                        </span>
                                                                        <span className="nav-link-text">{menus.name}</span>
                                                                        {menus.badge && menus.badge}
                                                                    </Link>
                                                            }
                                                        </>
                                                }
                                            </Nav.Item>
                                        </Nav>
                                    ))}
                                </div>
                                <div className="menu-gap" />
                            </React.Fragment>
                        ))}

                        {/* <Card bg='orange-light-5' className="callout card-flush  text-center w-220p mx-auto">
                            <Card.Body>
                                <h5 className="h5">Quickly Build Applications</h5>
                                <Card.Text className="p-sm">Exclusively for webapps Based on Bootstrap</Card.Text>
                                <Button variant="primary" href="https://jampack.hencework.com/documentation/introduction?ref=https://next-jampack-classic.vercel.app/" rel="https://next-jampack-classic.vercel.app/" className="btn-block">Go Jampack Doc</Button>
                            </Card.Body>
                        </Card> */}


                    </div>
                </SimpleBar>
                {/* /Main Menu */}
            </div >
            <div onClick={() => dispatch({ type: 'sidebar_toggle' })} className="hk-menu-backdrop" />
        </>
    )
}



export default Sidebar;
