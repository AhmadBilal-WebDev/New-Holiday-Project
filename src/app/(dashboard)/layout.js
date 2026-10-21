import React from "react";
import "./dashboard.css";
import "@mantine/core/styles.css";
import SideBar from "../../dashboard_components/Layout/SideBar";
import { MantineProvider } from "@mantine/core";
import { Philosopher } from "next/font/google";
import { ProfileProvider } from "../../contexts/ProfileContext";
import OtpGuard from "@/components/Auth/OtpGuard";

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
    <div className={`dashboard ${philosopher.variable}`}>
      <OtpGuard>
        <SideBar />
        <div className="main">
          <MantineProvider>
            <div className="content m-3">
              <ProfileProvider>{children}</ProfileProvider>
            </div>
          </MantineProvider>
        </div>
      </OtpGuard>
    </div>
  );
}
