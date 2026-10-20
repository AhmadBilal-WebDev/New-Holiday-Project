import React from 'react'
import './dashboard.css'
import "@mantine/core/styles.css";
import SideBar from '../../dashboard_components/Layout/SideBar';
import { MantineProvider } from "@mantine/core";
import { Philosopher } from "next/font/google";
import { ProfileProvider } from '../../contexts/ProfileContext';
import OtpGuard from "@/components/Auth/OtpGuard";

// Prevent iOS Safari auto-zoom on input focus
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const philosopher = Philosopher({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-philosopher",
  display: "swap",
});
export default function layout({ children }) {

  return (
    <div className={`dashboard d-flex ${philosopher.variable}`}>
      <OtpGuard>
        <SideBar />
        <div className="main flex-grow-1">
          {/* Mobile hamburger toggle — only visible on small screens */}
          <div className="d-flex justify-content-between d-md-none align-items-center px-3 py-2 mobile-menu-bar">
            <h6>Dashboard</h6>
            <button
              className="btn btn-sm border-0 fw-bold p-1"
              data-bs-toggle="offcanvas"
              data-bs-target="#sidebarOffcanvas"
              aria-controls="sidebarOffcanvas"
              aria-label="Open navigation menu"
              style={{ color: "#E7247A", fontSize: ".9rem", lineHeight: 1 }}
            >
              Menu
            </button>
          </div>
          <MantineProvider>
            <div className="content m-3">
              <ProfileProvider>
                {children}
              </ProfileProvider>
            </div>
          </MantineProvider>
        </div>
      </OtpGuard>
    </div>
  )
}
