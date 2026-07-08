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

    useEffect(() => {
        require("bootstrap/js/dist/collapse");
    }, []);

    const handleClick = (menuName) => {
        setActiveMenu(menuName);
    }

    useEffect(() => {
        for (const routes of SidebarMenu) {
            const matchedMenu = routes.contents.find((menu) => menu.childrens && pathname.startsWith(menu.path));
            if (matchedMenu) {
                setActiveMenu(matchedMenu.name);
                return;
            }
        }
    }, [pathname]);


    return (
        <>
            <div className="hk-menu">
                {/* Brand */}
                <SidebarHeader />
                {/* Main Menu */}
                <SimpleBar className="nicescroll-bar">
                    <div className="menu-content-wrap">
                        {SidebarMenu.map((routes, index) => (
                            <React.Fragment key={index}>
                                <div className="menu-group" >
                                    {routes.group && <div className="nav-header" >
                                        <span>{routes.group}</span>
                                    </div>}
                                    {routes.contents.map((menus, idx) => (
                                        <Nav bsPrefix="navbar-nav" className="flex-column" key={idx}>
                                            <Nav.Item className={classNames({ "active": pathname.startsWith(menus.path) })}>
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
