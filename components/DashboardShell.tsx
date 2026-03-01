"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const mobileLinks = [
  ["/dashboard", "Home"],
  ["/slots", "Slots"],
  ["/bookings", "Orders"],
  ["/billing", "Billing"],
  ["/farmers", "Farmers"]
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

      <section className="main workspace-main">{children}</section>

      <nav className="mobile-dock" aria-label="Primary mobile navigation">
        {mobileLinks.map(([href, label]) => (
          <Link key={href} href={href} className={`mobile-dock-item ${isActive(href) ? "active" : ""}`}>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
