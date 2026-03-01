"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const links = [
  ["/dashboard", "Dashboard"],
  ["/slots", "Slots"],
  ["/bookings", "Bookings"],
  ["/inventory", "Inventory"],
  ["/billing", "Billing"],
  ["/farmers", "Farmers"],
  ["/reports", "Reports"],
  ["/settings", "Settings"]
] as const;

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { business, profile, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <h1>Silk Worm Ops</h1>
        <p className="tenant-name">{business?.name || "Breeder Workspace"}</p>
        <p className="tenant-meta">Role: {profile?.role || "-"}</p>
        <nav>
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? "active" : ""}>
              {label}
            </Link>
          ))}
        </nav>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>
      <section className="main">{children}</section>
    </div>
  );
}
