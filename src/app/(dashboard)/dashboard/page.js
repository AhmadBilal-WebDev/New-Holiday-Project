"use client";
import React, { useState, useEffect, useCallback } from "react";
import { LuHotel } from "react-icons/lu";
import { FaArrowRight, FaCar, FaCalendarCheck, FaPlane } from "react-icons/fa";
import { MdAttractions } from "react-icons/md";
import { HiOutlineSparkles } from "react-icons/hi2";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function page() {
  const { data: session } = useSession();
  const [dashboardCount, setDashboardCount] = useState({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchDashboardCount = useCallback(async () => {
    const email = session?.user?.email;
    const otp = session?.user?.otp;
    if (!email || !otp) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/b2c/dashboard/bookings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        },
      );
      const data = await response.json();

      if (!data?.success && data?.message?.toLowerCase().includes("otp")) {
        router.push(
          `/verify-otp?email=${encodeURIComponent(session?.user?.email || "")}`,
        );
        return;
      }

      setDashboardCount(data.data || {});
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [session, router]);

  useEffect(() => {
    if (!session?.user?.email || !session?.user?.otp) return;
    fetchDashboardCount();
  }, [session, fetchDashboardCount]);

  const accent = "#e7247a";

  const statCards = [
    {
      title: "Hotel Bookings",
      count: dashboardCount?.hotel || 0,
      href: "/hotel-bookings",
      icon: <LuHotel size={20} />,
      label: "Hotels",
    },
    {
      title: "Transfer Bookings",
      count: dashboardCount?.transfers || 0,
      href: "/transfer-bookings",
      icon: <FaCar size={18} />,
      label: "Transfers",
    },
    {
      title: "Activity Bookings",
      count: dashboardCount?.activities || 0,
      href: "/activity-bookings",
      icon: <MdAttractions size={20} />,
      label: "Activities",
    },
    {
      title: "Flight Bookings",
      count: dashboardCount?.flights || 0,
      href: "/flight-bookings",
      icon: <FaPlane size={18} />,
      label: "Flights",
    },
    {
      title: "Group Package Bookings",
      count: dashboardCount?.packages || 0,
      href: "/package-bookings",
      icon: <HiOutlineSparkles size={20} />,
      label: "Group Packages",
    },
  ];

  return (
    <div className="db-home">
      <section className="db-welcome" aria-label="Welcome">
        <div className="db-welcome-glow" aria-hidden="true" />
        <div className="db-welcome-copy">
          <div className="db-welcome-eyebrow">
            <HiOutlineSparkles size={16} />
            Dashboard
          </div>
          <h1 className="db-welcome-title">
            Welcome back
            {session?.user?.name ? `, ${session.user.name}` : ""}!
          </h1>
          <p className="db-welcome-sub">
            Here&apos;s a quick look at your latest bookings and travel updates.
          </p>
        </div>

        <div className="db-welcome-total">
          <span className="db-welcome-total-icon">
            <FaCalendarCheck size={20} />
          </span>
          <div>
            <span className="db-welcome-total-label">Total Bookings</span>
            <span className="db-welcome-total-value">
              {loading ? "—" : dashboardCount?.total || 0}
            </span>
          </div>
        </div>
      </section>

      <section className="db-stats" aria-label="Booking overview">
        <div className="row g-3">
          {statCards.map((card) => (
            <div className="col-12 col-sm-6 col-xl-4" key={card.title}>
              <Link href={card.href} className="db-stat-link">
                <article className="db-stat-card">
                  <div className="db-stat-rail">
                    <span className="db-stat-icon" style={{ background: accent }}>
                      {card.icon}
                    </span>
                  </div>

                  <div className="db-stat-body">
                    <span className="db-stat-title">{card.title}</span>

                    <div className="db-stat-meta">
                      <span className="db-stat-count">
                        {loading ? "—" : card.count}
                      </span>
                      <span className="db-stat-cta">
                        View all <FaArrowRight size={10} />
                      </span>
                    </div>

                    <div className="db-stat-bar">
                      <span
                        className="db-stat-bar-fill"
                        style={{
                          width: card.count > 0 ? "62%" : "10%",
                          background: accent,
                        }}
                      />
                    </div>
                  </div>
                </article>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
