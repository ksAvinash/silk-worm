"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getHomeRouteForRole, isRoleAllowedForRoute } from "@/lib/firebase/role-routing";
import { evaluateSessionAccess } from "@/lib/firebase/access-decision";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, logout } = useAuth();

  const access = evaluateSessionAccess({ user, profile });

  useEffect(() => {
    if (loading) return;

    if (access.decision === "deny") {
      if (access.reason === "session-expired") {
        void logout();
      }
      router.replace("/login");
      return;
    }

    if (profile && pathname && !isRoleAllowedForRoute(profile.role, pathname)) {
      router.replace(getHomeRouteForRole(profile.role));
    }
  }, [loading, user, profile, pathname, access.decision, access.reason, logout, router]);

  if (loading) {
    return <p>Checking session...</p>;
  }

  if (access.decision === "deny") {
    if (access.reason === "session-expired") {
      return <p>Session expired. Redirecting to login...</p>;
    }

    return <p>Redirecting to login...</p>;
  }

  return <>{children}</>;
}
