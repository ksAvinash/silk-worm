"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mobileLinks = [
  ["/dashboard", "Home"],
  ["/slots", "Slots"],
  ["/bookings", "Orders"],
  ["/billing", "Billing"],
  ["/farmers", "Farmers"]
] as const;

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const normalizedPath = (path || "/").replace(/\/+$/, "") || "/";
  const isActive = (href: string) =>
    href === "/dashboard" ? normalizedPath === href : normalizedPath.startsWith(href);

  return (
    <div className="workspace-page">
      {normalizedPath !== "/dashboard" ? (
        <Link href="/dashboard" className="workspace-back-link">
          ← Back
        </Link>
      ) : null}

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
