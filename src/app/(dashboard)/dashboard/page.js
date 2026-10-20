"use client";
import React, { useState, useEffect } from "react";
import { LuHotel } from "react-icons/lu";
import { FaArrowRight, FaCar, FaCalendarCheck } from "react-icons/fa";
import { MdAttractions } from "react-icons/md";
import { HiOutlineSparkles } from "react-icons/hi2";
import Link from "next/link";
import { FaPlane } from "react-icons/fa";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
export default function page() {
  const { data: session } = useSession();
  const [dashboardCount, setDashboardCount] = useState({});
  const router = useRouter();
  useEffect(() => {
    const { email, otp } = session.user;
    if (!email || !otp) return;
    fetchDashboardCount();
  }, []);

  async function fetchDashboardCount() {
    const { email, otp } = session.user;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/bookings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, otp }),
        },
      );
      const data = await response.json();

      if (!data?.success && data?.message?.toLowerCase().includes('otp')) {
        router.push(`/verify-otp?email=${encodeURIComponent(session?.user?.email || '')}`);
        return;
      }

      setDashboardCount(data.data || {});
    } catch (error) {
      console.log(error);
    }
  }

  const statCards = [
    {
      title: "Hotel Bookings",
      count: dashboardCount?.hotel || 0,
      href: "/hotel-bookings",
      icon: <LuHotel size={20} />,
      accent: "rgb(0 76 76)",
      label: "Hotels",
    },
    {
      title: "Transfer Bookings",
      count: dashboardCount?.transfers || 0,
      href: "/transfer-bookings",
      icon: <FaCar size={18} />,
      accent: "rgb(0 76 76)",
      label: "Transfers",
    },
    {
      title: "Activity Bookings",
      count: dashboardCount?.activities || 0,
      href: "/activity-bookings",
      icon: <MdAttractions size={20} />,
      accent: "rgb(0 76 76)",
      label: "Activities",
    },
    {
      title: "Flight Bookings",
      count: dashboardCount?.flights || 0,
      href: "/flight-bookings",
      icon: <FaPlane size={18} />,
      accent: "rgb(0 76 76)",
      label: "Flights",
    },
    {
      title: "Group Package Bookings",
      count: dashboardCount?.packages || 0,
      href: "/package-bookings",
      icon: <HiOutlineSparkles size={20} />,
      accent: "rgb(0 76 76)",
      label: "Group Packages",
    },
  ];


  return (
    <div className="py-4" style={{ minHeight: "100vh" }}>

      {/* ── Welcome Banner ── */}
      <div
        className="rounded-4 mb-4 px-4 py-4 d-flex align-items-center justify-content-between flex-wrap gap-3"
        style={{
          background: "linear-gradient(120deg, rgb(0 76 76) 0%, rgb(31, 59, 66) 55%, rgb(0 76 76) 100%)",
          boxShadow: "0 8px 32px rgba(0,43,43,0.22)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -30, right: 120, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="d-flex align-items-center gap-2 mb-1">
            <HiOutlineSparkles color="#e8b84b" size={18} />
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 600 }}>
              Dashboard
            </span>
          </div>
          <h4 className="mb-1 fw-bold" style={{ color: "#fff", fontSize: "22px" }}>
            Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}!
          </h4>
          <p className="mb-0" style={{ color: "rgba(255,255,255,0.55)", fontSize: "13.5px" }}>
            Here’s a quick look at your latest bookings and travel updates.
          </p>
        </div>

        {/* Total bookings pill */}
        <div
          className="d-flex align-items-center gap-3 px-4 py-3 rounded-3"
          style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.14)", position: "relative", zIndex: 1 }}
        >
          <FaCalendarCheck size={22} color="#e8b84b" />
          <div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Total Bookings</div>
            <div style={{ color: "#fff", fontSize: "28px", fontWeight: 800, lineHeight: 1.1 }}>{dashboardCount?.total || 0}</div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="row g-3 mb-4">
        {statCards.map((card) => (
          <div className="col-12 col-sm-6 col-lg-4" key={card.title}>
            <Link href={card.href} style={{ textDecoration: "none" }}>
              <div
                className="h-100 d-flex"
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.19), 0 4px 16px rgba(0, 0, 0, 0.17)",
                  minHeight: 130,
                  transition: "box-shadow 0.2s, transform 0.2s",
                  cursor: "pointer",
                }}
              >
                {/* Left accent strip + icon */}
                <div
                  className="d-flex flex-column align-items-center justify-content-center"
                  style={{ width: 72, background: `${card.accent}12`, borderRight: `1px solid ${card.accent}22`, flexShrink: 0, gap: 8 }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{ width: 42, height: 42, background: card.accent, color: "#fff", boxShadow: `0 4px 14px ${card.accent}55` }}
                  >
                    {card.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="d-flex flex-column justify-content-between flex-grow-1 px-3 py-3">
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: card.accent, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                      {card.title}
                    </span>
                  </div>

                  <div className="d-flex align-items-end justify-content-between">
                    <div style={{ color: "#0f172a", fontSize: "40px", fontWeight: 700, lineHeight: 1, letterSpacing: "-2px" }}>
                      {card.count}
                    </div>
                    <div
                      className="d-flex align-items-center gap-1"
                      style={{ color: card.accent, fontSize: "11.5px", fontWeight: 700, paddingBottom: 4 }}
                    >
                      View all <FaArrowRight size={9} />
                    </div>
                  </div>

                  {/* Bottom accent bar */}
                  <div style={{ height: 3, borderRadius: 99, background: `${card.accent}22`, marginTop: 10 }}>
                    <div style={{ height: "100%", width: card.count > 0 ? "60%" : "8%", borderRadius: 99, background: card.accent, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

    </div>
  );
}
