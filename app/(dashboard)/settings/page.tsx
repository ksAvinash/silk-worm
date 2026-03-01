"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getTeamUserById, type ModulePermissions, type PermissionLevel } from "@/lib/firebase/users";
import styles from "./settings.module.css";

const MODULES = ["slots", "farmers", "bookings", "invoices", "reports", "users", "settings"] as const;
type ModuleKey = (typeof MODULES)[number];

const quickActions: Array<{
  href: string;
  title: string;
  description: string;
  module: ModuleKey;
  accent: string;
  bg: string;
}> = [
  {
    href: "/users",
    title: "Users & Permissions",
    description: "Manage team roles and module access.",
    module: "users",
    accent: "#4b5f2f",
    bg: "#edf4e3"
  },
  {
    href: "/slots",
    title: "Slot Management",
    description: "Configure slot lifecycle and capacity.",
    module: "slots",
    accent: "#2f6b3c",
    bg: "#e9f5e7"
  },
  {
    href: "/farmers",
    title: "Farmer Registry",
    description: "Maintain farmer records and rates.",
    module: "farmers",
    accent: "#7a4f2f",
    bg: "#f8efe6"
  },
  {
    href: "/bookings",
    title: "Booking Controls",
    description: "Track slot bookings and quantities.",
    module: "bookings",
    accent: "#6b4a2f",
    bg: "#f7eee4"
  },
  {
    href: "/invoices",
    title: "Invoice Operations",
    description: "Review invoices and payment status.",
    module: "invoices",
    accent: "#2b6470",
    bg: "#e7f4f7"
  },
  {
    href: "/reports",
    title: "Reports",
    description: "Analyze trends and monthly performance.",
    module: "reports",
    accent: "#5d5b24",
    bg: "#f3f4df"
  }
];

const EMPTY_PERMISSIONS: ModulePermissions = {
  slots: "none",
  farmers: "none",
  bookings: "none",
  invoices: "none",
  reports: "none",
  users: "none",
  settings: "none"
};

function levelLabel(level: PermissionLevel) {
  if (level === "edit") return "Edit";
  if (level === "read") return "Read";
  return "None";
}

function hasRead(level: PermissionLevel) {
  return level === "read" || level === "edit";
}

export default function SettingsPage() {
  const { profile, business } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [permissions, setPermissions] = useState<ModulePermissions>(EMPTY_PERMISSIONS);

  useEffect(() => {
    const load = async () => {
      if (!profile?.businessId || !profile?.uid) return;

      setLoading(true);
      setStatus("");

      if (profile.role === "owner") {
        setPermissions({
          slots: "edit",
          farmers: "edit",
          bookings: "edit",
          invoices: "edit",
          reports: "edit",
          users: "edit",
          settings: "edit"
        });
        setLoading(false);
        return;
      }

      try {
        const me = await getTeamUserById(profile.businessId, profile.uid);
        if (!me) {
          setStatus("Could not find your user profile in this business.");
          setPermissions(EMPTY_PERMISSIONS);
          return;
        }
        setPermissions({ ...EMPTY_PERMISSIONS, ...me.permissions });
      } catch {
        setStatus("Could not load settings permissions right now.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [profile?.businessId, profile?.role, profile?.uid]);

  const canViewSettings = useMemo(() => {
    if (profile?.role === "owner") return true;
    return hasRead((permissions.settings || "none") as PermissionLevel);
  }, [permissions.settings, profile?.role]);

  const visibleActions = useMemo(
    () => quickActions.filter((action) => hasRead((permissions[action.module] || "none") as PermissionLevel)),
    [permissions]
  );

  if (!loading && !canViewSettings) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Settings</p>
            <h1>Settings</h1>
          </div>
        </header>
        <div className={styles.notice}>You don’t have permission to access settings.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Settings</p>
          <h1>Workspace Settings</h1>
          <p className={styles.lead}>Use quick actions to manage permissions, slots, invoices, and reporting setup.</p>
        </div>
      </header>

      {status ? <div className={styles.notice}>{status}</div> : null}

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <p>Business</p>
          <h2>{business?.name || "-"}</h2>
          <span>Profile</span>
        </article>
        <article className={styles.statCard}>
          <p>Invoice Prefix</p>
          <h2>{business?.invoicePrefix || "-"}</h2>
          <span>Default prefix</span>
        </article>
        <article className={styles.statCard}>
          <p>Slot Frequency</p>
          <h2>{business?.slotFrequencyDays || 0} days</h2>
          <span>Scheduling cycle</span>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>Quick Actions</h3>
          {loading ? <span className={styles.muted}>Loading...</span> : null}
        </div>

        {!loading && visibleActions.length === 0 ? (
          <p className={styles.empty}>No quick actions available for your permission set.</p>
        ) : (
          <div className={styles.actions}>
            {visibleActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={styles.actionCard}
                style={{ "--action-accent": action.accent, "--action-bg": action.bg } as CSSProperties}
              >
                <span className={styles.actionDot} aria-hidden="true" />
                <span className={styles.actionBody}>
                  <span className={styles.actionTitle}>{action.title}</span>
                  <span className={styles.actionDescription}>{action.description}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>My Module Permissions</h3>
        </div>

        <div className={styles.permissionGrid}>
          {MODULES.map((moduleId) => (
            <div key={moduleId} className={styles.permissionItem}>
              <span className={styles.permissionName}>{moduleId}</span>
              <span className={styles.permissionValue}>{levelLabel((permissions[moduleId] || "none") as PermissionLevel)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
