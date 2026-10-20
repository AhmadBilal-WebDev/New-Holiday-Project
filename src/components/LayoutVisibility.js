"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer/Footer";
import IslamicHeader from "./Header/IslamicHeader";

const HOLIDAY_LAYOUT_SEGMENTS = new Set(["hotels", "checkout", "voucher", "invoice"]);

export default function LayoutVisibility({ children }) {
  const pathname = usePathname();
  const segments = pathname?.split("/").filter(Boolean) || [];

  const isHolidayStatusPage =
    segments[0] === "holiday-packages" &&
    segments.length >= 2 &&
    !HOLIDAY_LAYOUT_SEGMENTS.has(segments[1]);

  const isUmrahStatusPage =
    segments[0] === "umrah-getaway" && segments.length >= 3;

  // hide layout on voucher, invoice, and booking status loader pages
  const hideLayout =
    segments.includes("voucher") ||
    segments.includes("invoice") ||
    isUmrahStatusPage ||
    isHolidayStatusPage;

  return (
    <>
      {!hideLayout && <IslamicHeader />}
      {children}
      {!hideLayout && <Footer />}
    </>
  );
}
