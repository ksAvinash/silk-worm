"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/firebase/dashboard";
import styles from "./dashboard.module.css";

const quickActions = [
  { href: "/slots", title: "Slots", description: "Plan and update batch slots", accent: "#2f6b3c", bg: "#e9f5e7" },
  { href: "/farmers", title: "Farmers", description: "View farmer records", accent: "#7a4f2f", bg: "#f8efe6" },
  { href: "/bookings", title: "Bookings", description: "Add farmer bookings quickly", accent: "#6b4a2f", bg: "#f7eee4" },
  { href: "/invoices", title: "Invoices", description: "Track bills and payment status", accent: "#2b6470", bg: "#e7f4f7" },
  { href: "/reports", title: "Reports", description: "See trends and summaries", accent: "#5d5b24", bg: "#f3f4df" },
  { href: "/users", title: "Users", description: "Manage breeder team access", accent: "#4b5f2f", bg: "#edf4e3" },
  { href: "/settings", title: "Settings", description: "Configure workspace defaults", accent: "#4a4f6a", bg: "#eceefb" }
] as const;

function QuickIcon({ id }: { id: string }) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (id) {
    case "/slots":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="2" {...shared} />
          <path d="M8 2v4M16 2v4M3 10h18" {...shared} />
        </svg>
      );
    case "/bookings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h10M4 17h8" {...shared} />
        </svg>
      );
    case "/invoices":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h9l3 3v15H6z" {...shared} />
          <path d="M15 3v3h3M9 11h6M9 15h6" {...shared} />
        </svg>
      );
    case "/farmers":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="3" {...shared} />
          <path d="M3 19a6 6 0 0 1 12 0" {...shared} />
        </svg>
      );
    case "/users":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="3" {...shared} />
          <circle cx="17" cy="9" r="2.5" {...shared} />
          <path d="M2.8 19a6.2 6.2 0 0 1 12.4 0M13.8 19a4.6 4.6 0 0 1 7.4-3.7" {...shared} />
        </svg>
      );
    case "/settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" {...shared} />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2h.1a1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9h.1a1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.9.6Z" {...shared} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20V10M10 20V4M16 20v-8M22 20h-20" {...shared} />
        </svg>
      );
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatCurrency(value: number) {
  return `Rs ${formatNumber(Math.round(value))}`;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!profile?.businessId) return;

    const load = async () => {
      setStatus("loading");
      try {
        const data = await getDashboardMetrics(profile.businessId);
        setMetrics(data);
        setStatus("success");
      } catch {
        setStatus("error");
      }
    };

    void load();
  }, [profile?.businessId]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Dashboard</p>
          <h1>Operations Overview</h1>
          <p className={styles.lead}>Track slots, stock, farmer demand, and collections from one screen.</p>
        </div>
        <Link className={styles.primaryCta} href="/slots">
          New Slot
        </Link>
      </header>

      {status === "error" ? <div className={styles.notice}>Unable to load dashboard data right now.</div> : null}

      <section className={styles.stats}>
        <div className={styles.statCard}>
          <p>Slots this week</p>
          <h2>{formatNumber(metrics?.slotsThisWeek || 0)}</h2>
          <span>{formatNumber(metrics?.openSlots || 0)} open</span>
        </div>
        <div className={styles.statCard}>
          <p>Total bookings</p>
          <h2>{formatNumber(metrics?.activeSlotsBookedQty || 0)}</h2>
          <span>{formatNumber(metrics?.openSlots || 0)} Active Slots</span>
        </div>
        <div className={styles.statCard}>
          <p>Booked quantity</p>
          <h2>{formatNumber(metrics?.totalBooked || 0)}</h2>
          <span>Balance {formatNumber(metrics?.totalBalance || 0)}</span>
        </div>
        <div className={styles.statCard}>
          <p>Farmers</p>
          <h2>{formatNumber(metrics?.farmersCount || 0)}</h2>
          <span>{formatNumber(metrics?.bookingsCount || 0)} orders</span>
        </div>
        <div className={styles.statCard}>
          <p>Pending due</p>
          <h2>{formatCurrency(metrics?.pendingDue || 0)}</h2>
          <span>From {formatNumber(metrics?.invoicesCount || 0)} invoices</span>
        </div>
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Recent Bookings</h3>
            {status === "loading" ? <span className={styles.loading}>Loading...</span> : null}
          </div>

          {status === "success" && !metrics?.recentBookings.length ? <p>No bookings yet. Add your first booking.</p> : null}

          {metrics?.recentBookings.length ? (
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <span>Date</span>
                <span>Farmer</span>
                <span>Slot</span>
                <span>Qty</span>
                <span>Status</span>
              </div>
              {metrics.recentBookings.map((booking) => (
                <div key={booking.id} className={styles.tableRow}>
                  <span>{booking.bookingDate || "-"}</span>
                  <span>{booking.farmerName}</span>
                  <span>{booking.slotName}</span>
                  <span>{formatNumber(booking.qtyBooked)}</span>
                  <span>
                    <span className={styles.pill}>{booking.status}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Quick actions</h3>
          </div>
          <div className={styles.actions}>
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={styles.actionCard}
                style={{ "--action-accent": action.accent, "--action-bg": action.bg } as CSSProperties}
              >
                <span className={styles.actionIcon} aria-hidden="true">
                  <QuickIcon id={action.href} />
                </span>
                <span className={styles.actionBody}>
                  <span className={styles.actionTitle}>{action.title}</span>
                  <span className={styles.actionDescription}>{action.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
