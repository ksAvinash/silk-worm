"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const mobileLinks = [
  ["/dashboard", "Home"],
  ["/slots", "Slots"],
  ["/bookings", "Orders"],
  ["/farmers", "Farmers"]
] as const;

function DockIcon({ href }: { href: string }) {
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
          <path d="M3 12 12 4l9 8" {...shared} />
          <path d="M6 10v10h12V10" {...shared} />
        </svg>
      );
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
    case "/farmers":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="3" {...shared} />
          <path d="M3 19a6 6 0 0 1 12 0" {...shared} />
        </svg>
      );
    default:
      return null;
  }
}

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
          <Link
            key={href}
            href={href}
            className={`mobile-dock-item ${isActive(href) ? "active" : ""}`}
            aria-label={label}
            title={label}
          >
            <DockIcon href={href} />
          </Link>
        ))}
      </nav>
    </div>
  );
}
