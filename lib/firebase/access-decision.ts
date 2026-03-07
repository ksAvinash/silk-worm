import type { User } from "firebase/auth";
import type { UserProfile } from "./tenant";
import { isSessionExpired } from "./session";

export type AccessDecision = "allow" | "deny";

export type AccessReason =
  | "authorized"
  | "unauthenticated"
  | "session-expired"
  | "session-invalid"
  | "profile-missing"
  | "inactive"
  | "tenant-mismatch"
  | "role-mismatch";

export interface AccessDecisionState {
  decision: AccessDecision;
  reason: AccessReason;
}

export function evaluateSessionAccess(params: {
  user: User | null;
  profile: UserProfile | null;
  route?: string;
  requiredRole?: "owner" | "manager" | "operator";
}): AccessDecisionState {
  const { user, profile } = params;

  if (!user) {
    return { decision: "deny", reason: "unauthenticated" };
  }

  if (isSessionExpired()) {
    return { decision: "deny", reason: "session-expired" };
  }

  if (!profile) {
    return { decision: "deny", reason: "profile-missing" };
  }

  if (profile.active === false) {
    return { decision: "deny", reason: "inactive" };
  }

  if (!profile.businessId) {
    return { decision: "deny", reason: "tenant-mismatch" };
  }

  if (params.requiredRole && profile.role !== params.requiredRole) {
    return { decision: "deny", reason: "role-mismatch" };
  }

  return { decision: "allow", reason: "authorized" };
}
