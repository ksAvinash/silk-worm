"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

function QuickActionIcon({ href }: { href: string }) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (href) {
    case "/dashboard":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="8" height="8" rx="2" {...shared} />
          <rect x="13" y="3" width="8" height="5" rx="2" {...shared} />
          <rect x="13" y="10" width="8" height="11" rx="2" {...shared} />
          <rect x="3" y="13" width="8" height="8" rx="2" {...shared} />
        </svg>
      );
    case "/slots":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="2" {...shared} />
          <path d="M8 2v4M16 2v4M3 10h18" {...shared} />
          <path d="M8 14h3M8 17h6" {...shared} />
        </svg>
      );
    case "/bookings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h10M4 17h8" {...shared} />
          <circle cx="18" cy="17" r="3" {...shared} />
        </svg>
      );
    case "/inventory":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7h18l-2 11H5z" {...shared} />
          <path d="M8 7V4h8v3" {...shared} />
          <path d="M9 12h6" {...shared} />
        </svg>
      );
    case "/billing":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" {...shared} />
          <path d="M3 9h18" {...shared} />
          <path d="M7 14h4M7 17h6" {...shared} />
        </svg>
      );
    case "/farmers":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="3" {...shared} />
          <path d="M3 19a6 6 0 0 1 12 0" {...shared} />
          <path d="M16 9h5M18.5 6.5v5" {...shared} />
        </svg>
      );
    case "/reports":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20V10M10 20V4M16 20v-8M22 20h-20" {...shared} />
        </svg>
      );
    case "/settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" {...shared} />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2h.1a1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9h.1a1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6z" {...shared} />
        </svg>
      );
    default:
      return null;
  }
}

const links = [
  ["/dashboard", "Dashboard", "Overview and today highlights"],
  ["/slots", "Slots", "Plan weekly or custom batches"],
  ["/bookings", "Bookings", "Manage farmer quantity bookings"],
  ["/inventory", "Inventory", "Track stock and dispatch status"],
  ["/billing", "Billing", "Bills, collections, and dues"],
  ["/farmers", "Farmers", "Farmer profiles and history"],
  ["/reports", "Reports", "Performance and pending collections"],
  ["/settings", "Settings", "Business and defaults"]
] as const;

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { business, profile, logout } = useAuth();
  const isActive = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));

  return (
    <div className="workspace-page">
      <header className="workspace-topbar">
        <div>
          <p className="workspace-eyebrow">Silk Worm Ops</p>
          <h1>{business?.name || "My Workspace"}</h1>
          <p className="workspace-role">Role: {profile?.role || "-"}</p>
        </div>
        <button className="workspace-logout" onClick={logout}>
          Logout
        </button>
      </header>

      <section className="workspace-quick-actions">
        <div className="workspace-quick-head">
          <h2>Quick Actions</h2>
          <p>Jump to the section you need.</p>
        </div>
        <nav className="workspace-actions-grid">
          {links.map(([href, label, description]) => (
            <Link key={href} href={href} className={`workspace-action-card ${isActive(href) ? "active" : ""}`}>
              <span className="workspace-action-icon">
                <QuickActionIcon href={href} />
              </span>
              <span className="workspace-action-body">
                <span className="workspace-action-title">{label}</span>
                <span className="workspace-action-desc">{description}</span>
              </span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="main workspace-main">{children}</section>
    </div>
  );
}
