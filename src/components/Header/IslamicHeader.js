'use client'
import Image from "next/image";
import React, { useState, useEffect } from "react";
import styles from "./islamicheader.module.css";
import { usePackageCategories } from "@/contexts/PackageCategoriesContext";
import Link from "next/link";
import { FaPhoneAlt, FaChevronDown, FaArrowRight } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { usePathname } from "next/navigation";
import CurrencySelector from "./CurrencySelector";
import moment from "moment";

const DASHBOARD_PATHS = [
    "/dashboard",
    "/my-payments",
    "/hotel-bookings",
    "/flight-bookings",
    "/package-bookings",
    "/transfer-bookings",
    "/activity-bookings",
    "/umrah-getaway-bookings",
    "/holiday-package-bookings",
    "/make-payments",
    "/account-statement",
];

export default function IslamicHeader() {
    const pathname = usePathname();
    const { categories: packageCategoryList } = usePackageCategories();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isPackagesDropdownOpen, setIsPackagesDropdownOpen] = useState(false);
    const [isMobilePackagesOpen, setIsMobilePackagesOpen] = useState(false);

    // Always go to dashboard; middleware redirects to /login if not authenticated
    const myBookingsHref = "/dashboard";

    const isDashboardPage = DASHBOARD_PATHS.some(
        (path) => pathname === path || pathname?.startsWith(`${path}/`)
    );

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    useEffect(() => {
        if (!isMobileMenuOpen) return;

        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.overflow = '';
            window.scrollTo(0, scrollY);
        };
    }, [isMobileMenuOpen]);

    return (
        <header className={styles.islamicHeader}>
            <div className={styles.islamicHeaderBar}>
                <div className={styles.islamicHeaderInner}>
                    {/* Logo */}
                    <Link className={styles.islamicNavbarBrand} href="/">
                        <div className={styles.islamicLogoWrapper}>
                            <Image
                                className={styles.islamicLogo}
                                height={36}
                                width={36}
                                src="/updatedImages/Main-Logo.svg"
                                alt="Voyara"
                                priority
                                unoptimized
                            />
                            <span className={styles.islamicBrandName}>Voyara</span>
                        </div>
                    </Link>

                    {/* Desktop Center Nav */}
                    <nav className={styles.islamicDesktopNav} aria-label="Main navigation">
                        <ul className={styles.islamicNavMenu}>
                            <li className={styles.islamicNavItem}>
                                <Link
                                    className={`${styles.islamicNavLink} ${pathname === '/' ? styles.islamicNavLinkActive : ''}`}
                                    href="/"
                                >
                                    Home
                                </Link>
                            </li>
                            <li
                                className={`${styles.islamicNavItem} ${styles.islamicDropdownItem}`}
                                onMouseEnter={() => setIsPackagesDropdownOpen(true)}
                                onMouseLeave={() => setIsPackagesDropdownOpen(false)}
                            >
                                <div className={`${styles.islamicNavLink} cursor-pointer`}>
                                    Umrah Packages
                                    <FaChevronDown className={`${styles.islamicDropdownIcon} ${isPackagesDropdownOpen ? styles.islamicDropdownIconOpen : ''}`} />
                                </div>
                                {packageCategoryList.length > 0 && (
                                    <ul className={`${styles.islamicDropdownMenu} ${isPackagesDropdownOpen ? styles.islamicDropdownMenuOpen : ''}`}>
                                        {packageCategoryList.map((category, index) => (
                                            <li key={index} className={styles.islamicDropdownMenuItem}>
                                                <Link href={`/${category.slug}?date=${moment().format('YYYY-MM-DD')}`} className={styles.islamicDropdownLink}>
                                                    {category.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                            {/* <li className={styles.islamicNavItem}>
                                <Link
                                    className={`${styles.islamicNavLink} ${pathname === '/hajj-package' ? styles.islamicNavLinkActive : ''}`}
                                    href="/hajj-package"
                                >
                                    Hajj Package
                                </Link>
                            </li> */}
                            <li className={styles.islamicNavItem}>
                                <Link
                                    className={`${styles.islamicNavLink} ${pathname === '/about-us' ? styles.islamicNavLinkActive : ''}`}
                                    href="/about-us"
                                >
                                    About us
                                </Link>
                            </li>
                            {/* <li className={styles.islamicNavItem}>
                                <Link
                                    className={`${styles.islamicNavLink} ${pathname === '/blogs' ? styles.islamicNavLinkActive : ''}`}
                                    href="/blogs"
                                >
                                    Blogs
                                </Link>
                            </li> */}
                            <li className={styles.islamicNavItem}>
                                <Link
                                    className={`${styles.islamicNavLink} ${pathname === '/contact-us' ? styles.islamicNavLinkActive : ''}`}
                                    href="/contact-us"
                                >
                                    Contact Us
                                </Link>
                            </li>
                        </ul>
                    </nav>

                    {/* Right Actions — image flow: text link + pink pill (existing names) */}
                    <div className={styles.islamicNavActions}>

                        <Link
                            href={myBookingsHref}
                            className={styles.islamicSignInLink}
                        >
                            Sign In
                        </Link>
                        {!isDashboardPage && (
                            <div className={styles.islamicCurrencyDesktop}>
                                <CurrencySelector width="w-auto" />
                            </div>
                        )}


                        {/* Mobile Menu Toggle */}
                        <button
                            className={styles.islamicMobileToggle}
                            onClick={toggleMobileMenu}
                            aria-label="Toggle menu"
                            aria-expanded={isMobileMenuOpen}
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <div className={`${styles.islamicMobileMenu} ${isMobileMenuOpen ? styles.islamicMobileMenuOpen : ''}`}>
                <div className={styles.islamicMobileMenuHeader}>
                    <Link className={styles.islamicMobileMenuLogo} href="/" onClick={closeMobileMenu}>
                        <div className={styles.islamicLogoWrapper}>
                            <Image
                                height={36}
                                width={36}
                                src="/updatedImages/Main-Logo.svg"
                                alt="Voyara"
                                unoptimized
                            />
                            <span className={styles.islamicBrandName}>Voyara</span>
                        </div>
                    </Link>
                    <button
                        className={styles.islamicMobileMenuClose}
                        onClick={closeMobileMenu}
                        aria-label="Close menu"
                    >
                        <IoMdClose />
                    </button>
                </div>

                <div className={styles.islamicMobileMenuBody}>
                    <ul className={styles.islamicMobileMenuList}>
                        <li className={styles.islamicMobileMenuItem}>
                            <Link
                                className={`${styles.islamicMobileMenuLink} ${pathname === '/' ? styles.islamicMobileMenuLinkActive : ''}`}
                                href="/"
                                onClick={closeMobileMenu}
                            >
                                Home
                            </Link>
                        </li>
                        <li className={styles.islamicMobileMenuItem}>
                            <button
                                type="button"
                                className={`${styles.islamicMobileMenuLink} ${isMobilePackagesOpen ? styles.islamicMobileMenuLinkExpanded : ''}`}
                                onClick={() => setIsMobilePackagesOpen(!isMobilePackagesOpen)}
                            >
                                Umrah Packages
                                <FaChevronDown className={`${styles.islamicMobileDropdownIcon} ${isMobilePackagesOpen ? styles.islamicMobileDropdownIconOpen : ''}`} />
                            </button>
                            <ul className={`${styles.islamicMobileDropdownMenu} ${isMobilePackagesOpen ? styles.islamicMobileDropdownMenuOpen : ''}`}>
                                {packageCategoryList.map((category, index) => (
                                    <li key={index} className={styles.islamicMobileDropdownItem}>
                                        <Link href={`/${category.slug}`} className={styles.islamicMobileDropdownLink} onClick={closeMobileMenu}>
                                            {category.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </li>
                        {/* <li className={styles.islamicMobileMenuItem}>
                            <Link
                                className={`${styles.islamicMobileMenuLink} ${pathname === '/hajj-package' ? styles.islamicMobileMenuLinkActive : ''}`}
                                href="/hajj-package"
                                onClick={closeMobileMenu}
                            >
                                Hajj Package
                            </Link>
                        </li> */}
                        <li className={styles.islamicMobileMenuItem}>
                            <Link
                                className={`${styles.islamicMobileMenuLink} ${pathname === '/about-us' ? styles.islamicMobileMenuLinkActive : ''}`}
                                href="/about-us"
                                onClick={closeMobileMenu}
                            >
                                About us
                            </Link>
                        </li>
                        <li className={styles.islamicMobileMenuItem}>
                            <Link
                                className={`${styles.islamicMobileMenuLink} ${pathname === '/contact-us' ? styles.islamicMobileMenuLinkActive : ''}`}
                                href="/contact-us"
                                onClick={closeMobileMenu}
                            >
                                Contact Us
                            </Link>
                        </li>
                        {/* <li className={styles.islamicMobileMenuItem}>
                            <Link
                                className={`${styles.islamicMobileMenuLink} ${pathname === '/blogs' ? styles.islamicMobileMenuLinkActive : ''}`}
                                href="/blogs"
                                onClick={closeMobileMenu}
                            >
                                Blogs
                            </Link>
                        </li> */}
                        <li className={styles.islamicMobileMenuItem}>
                            <Link
                                className={`${styles.islamicMobileMenuLink} ${pathname === myBookingsHref ? styles.islamicMobileMenuLinkActive : ''}`}
                                href={myBookingsHref}
                                onClick={closeMobileMenu}
                            >
                                My Bookings
                            </Link>
                        </li>
                    </ul>
                </div>

                <div className={styles.islamicMobileMenuFooter}>
                    {!isDashboardPage && (
                        <div className={styles.islamicMobileCurrency}>
                            <span className={styles.islamicMobileCurrencyLabel}>Currency</span>
                            <CurrencySelector width={styles.islamicMobileCurrencySelect} />
                        </div>
                    )}
                    <Link
                        href="/contact-us"
                        className={styles.islamicMobileCtaBtn}
                        onClick={closeMobileMenu}
                    >
                        Contact Us
                        <FaArrowRight size={12} aria-hidden="true" />
                    </Link>
                    <a href="tel:01217772522" className={styles.islamicMobileCallBtn} onClick={closeMobileMenu}>
                        <FaPhoneAlt size={14} />
                        0121 777 2522
                    </a>
                </div>
            </div>

            {/* Mobile Menu Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className={styles.islamicMobileBackdrop}
                    onClick={closeMobileMenu}
                ></div>
            )}
        </header>
    );
}
