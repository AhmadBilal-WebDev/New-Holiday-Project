"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/hotel-bookings", label: "Hotel Bookings" },
  { href: "/activity-bookings", label: "Activity Bookings" },
  { href: "/flight-bookings", label: "Flight Bookings" },
  { href: "/transfer-bookings", label: "Transfer Bookings" },
  { href: "/package-bookings", label: "Package Bookings" },
  // { href: "/umrah-getaway-bookings", label: "Umrah Getaway" },
  // { href: "/holiday-package-bookings", label: "Holiday Packages" },
  { href: "/my-payments", label: "My Payments" },
  { href: "/make-payments", label: "Make Payments" },
];

export default function SideBar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    localStorage.removeItem("otp_verification");
    await signOut({ callbackUrl: "/login" });
  };

  const isActive = (path) =>
    pathname === path || pathname?.startsWith(`${path}/`);

  return (
    <nav className="dash-nav" aria-label="Dashboard navigation">
      <div className="dash-nav-scroll">
        <ul className="dash-nav-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`dash-nav-link${isActive(item.href) ? " active" : ""}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="dash-nav-link dash-nav-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
