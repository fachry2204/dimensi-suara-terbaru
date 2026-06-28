import Link from 'next/link';
import Image from 'next/image';
import { ArrowBarToLeft } from 'tabler-icons-react';
import { Button } from 'react-bootstrap';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { useTheme } from '../theme-provider/theme-provider';

//Images
import logo from '@/assets/img/brand-sm.svg';
import jampackImg from '@/assets/img/Jampack.svg';
import jampackImgDark from '@/assets/img/jampack-dark.svg';

const NavHeader = () => {

    const { dispatch } = useGlobalStateContext();
    const { theme } = useTheme();

    return (
        <div className="menu-header d-xl-none">
            <span>
                <Link className="navbar-brand" href="/">
                    <Image className="brand-img img-fluid" src={logo} alt="brand" />
                    {theme === "light" ? <Image className="brand-img img-fluid logo-light" src={jampackImg} alt="brand" /> : <Image className="brand-img img-fluid logo-dark" src={jampackImgDark} alt="brand" />}
                </Link>
                <Button id="tggl-btn" variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover navbar-toggle" onClick={() => dispatch({ type: "sidebar_toggle" })} >
                    <span className="icon">
                        <span className="svg-icon fs-5">
                            <ArrowBarToLeft />
                        </span>
                    </span>
                </Button>
            </span>
        </div>
    )
}

export default NavHeader;
