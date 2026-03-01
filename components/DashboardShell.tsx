"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const { logout } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const normalizedPath = (path || "/").replace(/\/+$/, "") || "/";
  const isActive = (href: string) =>
    href === "/dashboard" ? normalizedPath === href : normalizedPath.startsWith(href);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      console.error("Failed to sign out", error);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-topbar">
        <div>
          {normalizedPath !== "/dashboard" ? (
            <Link href="/dashboard" className="workspace-back-link">
              ← Back
            </Link>
          ) : null}
        </div>

        <button type="button" className="secondary-cta workspace-logout" onClick={handleSignOut} disabled={isSigningOut} aria-label="Sign out" title="Sign out">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 16l5-4-5-4M20 12H9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

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
