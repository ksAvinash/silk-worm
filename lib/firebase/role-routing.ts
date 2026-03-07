import type { UserRole } from "./tenant";

const ROLE_HOME_ROUTE: Record<UserRole, string> = {
  owner: "/dashboard",
  manager: "/dashboard",
  operator: "/dashboard"
};

export function normalizeRole(value: unknown): UserRole {
  const role = String(value || "").trim().toLowerCase();
  if (role === "owner" || role === "manager" || role === "operator") {
    return role;
  }
  return "operator";
}

export function getHomeRouteForRole(role: unknown): string {
  return ROLE_HOME_ROUTE[normalizeRole(role)];
}

export function isRoleAllowedForRoute(role: unknown, route: string): boolean {
  const normalizedRole = normalizeRole(role);
  const normalizedRoute = route.replace(/\/+$/, "") || "/";

  // Keep current permissions model permissive by role at route level.
  if (normalizedRoute === "/dashboard") return true;
  if (normalizedRoute.startsWith("/settings") || normalizedRoute.startsWith("/users")) {
    return normalizedRole === "owner" || normalizedRole === "manager";
  }

  return true;
}
