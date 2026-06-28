'use client';
import { useGlobalStateContext } from "@/context/GolobalStateProvider";
import TopNav from "../Header/TopNav";
import PageFooter from "../Footer/PageFooter";
import classNames from "classnames";
import { usePathname } from "next/navigation";
import HorizontalNav from '@/layout/HorizontalNavbar/HorizontalNav'

const MainLayout = ({ children }) => {
    const { states } = useGlobalStateContext();
    const pathName = usePathname();
    const appRoutes = pathName.match('/apps/');

    return (
        <>
            <div
                className={classNames("hk-wrapper", { "hk__email__backdrop": states.emailState.maximize }, { "hk-pg-auth": pathName === "/error-404" })}
                data-layout="horizontal"
                data-navbar-style={states.layoutState.topNavCollapse ? "collapsed" : ""}
                data-layout-style={states.layoutState.isSidebarCollapsed ? "collapsed" : "default"}
                data-hover={states.layoutState.isSidebarCollapsed ? "active" : ""}
                data-menu="light"
                data-footer="simple"
            >
                {/* Top Navbar */}
                <TopNav />
                {/* <VerticalNav /> */}
                <HorizontalNav />
                <div className={classNames("hk-pg-wrapper", { "pb-0": appRoutes })} >
                    {children}
                    {!appRoutes && <PageFooter />}
                </div>
            </div>
        </>
    )
}

export default MainLayout
