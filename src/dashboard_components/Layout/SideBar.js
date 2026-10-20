"use client";
import Link from "next/link";
import { HiOutlineLogout } from "react-icons/hi";
import { signOut, useSession } from "next-auth/react";
// import bootstrap from "bootstrap/dist/js/bootstrap.bundle";
import {
  FaTachometerAlt,
  FaHotel,
  FaPlane,
  FaCar,
  FaMoneyBill,
  FaBook,
  FaKaaba,
} from "react-icons/fa";
import { MdAttractions } from "react-icons/md";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { IoBed, IoCard } from "react-icons/io5";
import Image from "next/image";
export default function SideBar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    // Clear any stale OTP data
    localStorage.removeItem("otp_verification");
    await signOut({ callbackUrl: "/login" });
  };
  const isActive = (path) => (pathname === path ? "active" : "");

  useEffect(() => {
    const offcanvasEl = document.getElementById("sidebarOffcanvas");
    if (offcanvasEl && offcanvasEl.classList.contains("show")) {
      offcanvasEl.classList.remove("show");
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      const backdrop = document.querySelector(".offcanvas-backdrop");
      if (backdrop) backdrop.remove();
    }
  }, [pathname]);

  return (
    <>
      {/* Offcanvas Sidebar for mobile */}

      <div
        className="offcanvas offcanvas-start d-block d-md-none"
        tabIndex="-1"
        id="sidebarOffcanvas"
        aria-labelledby="sidebarOffcanvasLabel"
      >
        <div className="offcanvas-header">
          <Image
            src="/images/logo.png"
            alt="Logo"
            className="w-auto"
            width={100}
            quality={100}
            height={32}
          />
          <button
            type="button"
            className="btn-close text-white"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          ></button>
        </div>
        <div className="offcanvas-body p-0">
          <aside className="sidebar">
            <ul className="sidebar-nav mt-2">
              <Link
                className={`decoration-non ${isActive("/dashboard")}`}
                href="/dashboard"
              >
                <li>
                  <FaTachometerAlt /> Dashboard
                </li>
              </Link>
              <Link
                className={`decoration-non ${isActive("/my-payments")}`}
                href="/my-payments"
              >
                <li>
                  <IoCard /> My Payments
                </li>
              </Link>
              <Link
                className={`decoration-non ${isActive("/hotel-bookings")}`}
                href="/hotel-bookings"
              >
                <li>
                  <IoBed /> Hotel Bookings
                </li>
              </Link>
              <Link
                className={`decoration-non ${isActive("/flight-bookings")}`}
                href="/flight-bookings"
              >
                <li>
                  <FaPlane /> Flight Bookings
                </li>
              </Link>
              <Link
                className={`decoration-non ${isActive("/package-bookings")}`}
                href="/package-bookings"
              >
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" width='22px' height='22px' fill="none" viewBox="0 0 33 33" focusable="false" aria-hidden="true" role="img"><g clipPath="url(#PackagesGrey_tsx__a)"><path fill='#ffffff' d="M3.197 28.105h-1.9v1.135h1.9zM15.72 28.105h-2.356v.87h2.355z"></path><path stroke='#ffffff' strokeMiterlimit="10" strokeWidth="1.25" d="M8.509 27.687H1.14"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M2.979 20.694H1.648a.509.509 0 0 0 0 1.015h13.726a.509.509 0 0 0 0-1.015H14.03"></path><path stroke='#ffffff' strokeMiterlimit="10" strokeWidth="1.25" d="M8.509 27.687h7.368"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M3.713 27.687v1.647H1.14v-5.06c0-.828.316-1.622.887-2.219l.338-.354 1.6-2.675a1.56 1.56 0 0 1 1.429-.935h6.178c.61 0 1.17.359 1.42.913l1.652 2.697.495.52c.405.427.738 1.255.738 1.844v5.269h-2.573v-1.647"></path><path fill='#ffffff' d="m5.347 27.687.559-1.114c.162-.324.546-.537.977-.537h3.238c.423 0 .807.209.969.525l.584 1.122M11.628 24.93c.102-.4.96-1.365 2.12-1.365.273 0 .55.086.644.35.094.265.145.606.06 1.067a.52.52 0 0 1-.427.414 6.3 6.3 0 0 1-2.073 0c-.218-.039-.371-.248-.32-.461zM5.39 24.93c-.103-.4-.96-1.365-2.12-1.365-.274 0-.551.086-.645.35-.094.265-.145.606-.06 1.067.038.213.213.38.427.414.426.072 1.203.15 2.073 0 .218-.039.372-.248.32-.461zM10.24 24.257H6.777a.39.39 0 0 0-.388.388v.444c0 .214.174.388.388.388h3.465a.39.39 0 0 0 .388-.388v-.444a.39.39 0 0 0-.388-.388"></path><path fill='#ffffff' stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="m14.985 8.295-10.423 2.13a1.79 1.79 0 0 1-1.899-.841L1.14 7.019l1.075-.537 1.596 1.365L14.422 5.68a2.96 2.96 0 0 1 1.677.145l.073.03a.983.983 0 0 1 .345 1.6 2.96 2.96 0 0 1-1.532.84Z"></path><path fill='#ffffff' d="m7.847 9.72-2.022 4.463h1.8l5.342-5.53"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="m7.847 9.72-2.022 4.463h1.8l5.342-5.53"></path><path fill='#ffffff' d="M8.21 6.947 5.64 3.66h2.18l3.623 2.624"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="M8.21 6.947 5.64 3.66h2.18l3.623 2.624"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M19.354 11.026h9.212000000000002M20.195 11.026v18.312M27.73 11.026v18.312"></path><path fill='#ffffff' d="M23.348 29.338v-3.157h1.446v3.157"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M23.348 29.338v-3.157h1.446v3.157"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M31.86 29.338v-8.076h-4.13"></path><path fill='#ffffff' d="M23.066 13.453h-.814a.324.324 0 0 0-.325.325v.806c0 .18.145.324.325.324h.814c.18 0 .325-.145.325-.324v-.806a.324.324 0 0 0-.325-.325M25.89 13.453h-.814a.324.324 0 0 0-.324.325v.806c0 .18.145.324.324.324h.815c.179 0 .324-.145.324-.324v-.806a.324.324 0 0 0-.324-.325M23.066 16.338h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.146.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 16.338h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.146.324-.325v-.806a.324.324 0 0 0-.324-.324M23.066 19.299h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.145.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 19.299h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.145.324-.325v-.806a.324.324 0 0 0-.324-.324M23.066 22.26h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.145.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 22.26h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.145.324-.325v-.806a.324.324 0 0 0-.324-.324"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M31.86 29.338H20.195"></path></g><defs><clipPath id="PackagesGrey_tsx__a"><path fill="#fff" d="M.5 3.021h32v26.957H.5z"></path></clipPath></defs></svg>
                  Package Bookings
                </li>
              </Link>
              <Link
                className={`decoration-non ${isActive("/transfer-bookings")}`}
                href="/transfer-bookings"
              >
                <li>
                  <FaCar /> Transfer Bookings
                </li>
              </Link>
              <Link
                className={`decoration-non ${isActive("/activity-bookings")}`}
                href="/activity-bookings"
              >
                <li>
                  <MdAttractions /> Activity Bookings
                </li>
              </Link>
              <Link
                className={`decoration-non ${isActive("/umrah-getaway-bookings")}`}
                href="/umrah-getaway-bookings"
              >
                <li>
                  <FaKaaba /> Umrah Getaway 
                </li>
              </Link>
              <Link
                className={`decoration-non ${isActive("/holiday-package-bookings")}`}
                href="/holiday-package-bookings"
              >
                <li>
                  <MdAttractions /> Holiday Packages 
                </li>
              </Link>
              <Link
                className={`decoration-non ${isActive("/make-payments")}`}
                href="/make-payments"
              >
                <li>
                  <FaMoneyBill /> Make Payment
                </li>
              </Link>
              <div className="sidebar-divider" />

              <li className="decoration-non" onClick={handleLogout} style={{ cursor: "pointer" }}>
                <HiOutlineLogout /> Logout
              </li>
            </ul>
          </aside>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="sidebar d-none d-md-block">
        {/* <div className="sidebar-brand">
          
        </div> */}
        <ul className="sidebar-nav mt-2">
          <Link
            className={`decoration-non ${isActive("/dashboard")}`}
            href="/dashboard"
          >
            <li data-label="Dashboard">
              <FaTachometerAlt /> <span className="sidebar-text">Dashboard</span>
            </li>
          </Link>
          <Link
            className={`decoration-non ${isActive("/my-payments")}`}
            href="/my-payments"
          >
            <li data-label="My Payments">
              <IoCard /> <span className="sidebar-text">My Payments</span>
            </li>
          </Link>
          <Link
            className={`decoration-non ${isActive("/hotel-bookings")}`}
            href="/hotel-bookings"
          >
            <li data-label="Hotel Bookings">
              <FaHotel /> <span className="sidebar-text">Hotel Bookings</span>
            </li>
          </Link>
          <Link
            className={`decoration-non ${isActive("/transfer-bookings")}`}
            href="/transfer-bookings"
          >
            <li data-label="Transfer Bookings">
              <FaCar /> <span className="sidebar-text">Transfer Bookings</span>
            </li>
          </Link>
          <Link
            className={`decoration-non ${isActive("/flight-bookings")}`}
            href="/flight-bookings"
          >
            <li data-label=" Bookings">
              <FaPlane /> <span className="sidebar-text">Flight Bookings</span>
            </li>
          </Link>

          <Link
            className={`decoration-non ${isActive("/umrah-getaway-bookings")}`}
            href="/umrah-getaway-bookings"
          >
            <li data-label="Umrah Getaway Bookings">
              <FaKaaba /> <span className="sidebar-text">Umrah Getaway </span>
            </li>
          </Link>
          <Link
            className={`decoration-non ${isActive("/holiday-package-bookings")}`}
            href="/holiday-package-bookings"
          >
            <li data-label="Holiday Packages Bookings">
              <MdAttractions /> <span className="sidebar-text">Holiday Packages </span>
            </li>
          </Link>
          <Link
            className={`decoration-non ${isActive("/package-bookings")}`}
            href="/package-bookings"
          >
            <li data-label="Group Packages Bookings">
              <svg xmlns="http://www.w3.org/2000/svg" width='22' height='22' fill="none" viewBox="0 0 33 33" aria-hidden="true" style={{ display: 'block', width: 18, height: 18, flexShrink: 0 }}><path fill='#ffffff' d="M3.197 28.105h-1.9v1.135h1.9zM15.72 28.105h-2.356v.87h2.355z"></path><path stroke='#ffffff' strokeMiterlimit="10" strokeWidth="1.25" d="M8.509 27.687H1.14"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M2.979 20.694H1.648a.509.509 0 0 0 0 1.015h13.726a.509.509 0 0 0 0-1.015H14.03"></path><path stroke='#ffffff' strokeMiterlimit="10" strokeWidth="1.25" d="M8.509 27.687h7.368"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M3.713 27.687v1.647H1.14v-5.06c0-.828.316-1.622.887-2.219l.338-.354 1.6-2.675a1.56 1.56 0 0 1 1.429-.935h6.178c.61 0 1.17.359 1.42.913l1.652 2.697.495.52c.405.427.738 1.255.738 1.844v5.269h-2.573v-1.647"></path><path fill='#ffffff' d="m5.347 27.687.559-1.114c.162-.324.546-.537.977-.537h3.238c.423 0 .807.209.969.525l.584 1.122M11.628 24.93c.102-.4.96-1.365 2.12-1.365.273 0 .55.086.644.35.094.265.145.606.06 1.067a.52.52 0 0 1-.427.414 6.3 6.3 0 0 1-2.073 0c-.218-.039-.371-.248-.32-.461zM5.39 24.93c-.103-.4-.96-1.365-2.12-1.365-.274 0-.551.086-.645.35-.094.265-.145.606-.06 1.067.038.213.213.38.427.414.426.072 1.203.15 2.073 0 .218-.039.372-.248.32-.461zM10.24 24.257H6.777a.39.39 0 0 0-.388.388v.444c0 .214.174.388.388.388h3.465a.39.39 0 0 0 .388-.388v-.444a.39.39 0 0 0-.388-.388"></path><path fill='#ffffff' stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="m14.985 8.295-10.423 2.13a1.79 1.79 0 0 1-1.899-.841L1.14 7.019l1.075-.537 1.596 1.365L14.422 5.68a2.96 2.96 0 0 1 1.677.145l.073.03a.983.983 0 0 1 .345 1.6 2.96 2.96 0 0 1-1.532.84Z"></path><path fill='#ffffff' d="m7.847 9.72-2.022 4.463h1.8l5.342-5.53"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="m7.847 9.72-2.022 4.463h1.8l5.342-5.53"></path><path fill='#ffffff' d="M8.21 6.947 5.64 3.66h2.18l3.623 2.624"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="M8.21 6.947 5.64 3.66h2.18l3.623 2.624"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M19.354 11.026h9.212M20.195 11.026v18.312M27.73 11.026v18.312"></path><path fill='#ffffff' d="M23.348 29.338v-3.157h1.446v3.157"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M23.348 29.338v-3.157h1.446v3.157"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M31.86 29.338v-8.076h-4.13"></path><path fill='#ffffff' d="M23.066 13.453h-.814a.324.324 0 0 0-.325.325v.806c0 .18.145.324.325.324h.814c.18 0 .325-.145.325-.324v-.806a.324.324 0 0 0-.325-.325M25.89 13.453h-.814a.324.324 0 0 0-.324.325v.806c0 .18.145.324.324.324h.815c.179 0 .324-.145.324-.324v-.806a.324.324 0 0 0-.324-.325M23.066 16.338h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.146.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 16.338h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.146.324-.325v-.806a.324.324 0 0 0-.324-.324M23.066 19.299h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.145.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 19.299h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.145.324-.325v-.806a.324.324 0 0 0-.324-.324M23.066 22.26h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.145.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 22.26h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.145.324-.325v-.806a.324.324 0 0 0-.324-.324"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M31.86 29.338H20.195"></path></svg>
              <span className="sidebar-text">Package Bookings</span>
            </li>
          </Link>
          <Link
            className={`decoration-non ${isActive("/activity-bookings")}`}
            href="/activity-bookings"
          >
            <li data-label="Activity Bookings">
              <MdAttractions /> <span className="sidebar-text">Activity Bookings</span>
            </li>
          </Link>
 
          <Link
            className={`decoration-non ${isActive("/make-payments")}`}
            href="/make-payments"
          >
            <li data-label="Make Payment">
              <FaBook /> <span className="sidebar-text">Make Payment</span>
            </li>
          </Link>
          <div className="sidebar-divider" />
          <li className="decoration-non" onClick={handleLogout} style={{ cursor: "pointer" }} data-label="Logout">
            <HiOutlineLogout /> <span className="sidebar-text">Logout</span>
          </li>
        </ul>
      </aside>
    </>
  );
}
