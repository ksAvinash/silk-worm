"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/firebase/dashboard";
import styles from "./dashboard.module.css";

const quickActions = [
  { href: "/slots", title: "Slots", description: "Plan and update batch slots", accent: "#2f6b3c", bg: "#e9f5e7" },
  { href: "/bookings", title: "Bookings", description: "Add farmer bookings quickly", accent: "#6b4a2f", bg: "#f7eee4" },
  { href: "/inventory", title: "Inventory", description: "Check stock and balance", accent: "#2b6470", bg: "#e7f4f7" },
  { href: "/billing", title: "Billing", description: "Track dues and collections", accent: "#5b4a92", bg: "#eeeafe" },
  { href: "/farmers", title: "Farmers", description: "View farmer records", accent: "#7a4f2f", bg: "#f8efe6" },
  { href: "/reports", title: "Reports", description: "See trends and summaries", accent: "#5d5b24", bg: "#f3f4df" }
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
    case "/inventory":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7h18l-2 11H5z" {...shared} />
          <path d="M8 7V4h8v3" {...shared} />
        </svg>
      );
    case "/billing":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" {...shared} />
          <path d="M3 9h18" {...shared} />
        </svg>
      );
    case "/farmers":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="3" {...shared} />
          <path d="M3 19a6 6 0 0 1 12 0" {...shared} />
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
  const { business, profile } = useAuth();
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
          <p>Total capacity</p>
          <h2>{formatNumber(metrics?.totalCapacity || 0)}</h2>
          <span>{metrics?.utilizationPercent || 0}% utilized</span>
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
