import type { User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { functionsApp } from "./config";
import type { UserProfile } from "./tenant";
import { normalizeRole } from "./role-routing";

const VALID_ROLES = new Set(["owner", "manager", "operator"]);

function normalizeClaimRole(value: unknown): string {
  const role = normalizeRole(value);
  return VALID_ROLES.has(role) ? role : "";
}

export function isClaimProfileConsistent(params: {
  claims: Record<string, unknown>;
  profile: Pick<UserProfile, "businessId" | "role">;
}): boolean {
  const claimBusinessId = String(params.claims.businessId || "").trim();
  const claimRole = normalizeClaimRole(params.claims.role);
  const profileBusinessId = String(params.profile.businessId || "").trim();
  const profileRole = normalizeClaimRole(params.profile.role);

  return Boolean(claimBusinessId && profileBusinessId && claimBusinessId === profileBusinessId && claimRole && claimRole === profileRole);
}

export async function syncBusinessRoleClaims(user: User, profile: Pick<UserProfile, "businessId" | "role">): Promise<void> {
  const businessId = String(profile.businessId || "").trim();
  const role = normalizeClaimRole(profile.role);

  if (!businessId || !role) {
    throw new Error("Cannot sync claims without valid business and role.");
  }

  const currentToken = await user.getIdTokenResult();
  if (isClaimProfileConsistent({ claims: currentToken.claims, profile })) {
    return;
  }

  const syncClaim = httpsCallable(functionsApp, "syncBusinessRoleClaim");
  await syncClaim();
  await user.getIdToken(true);
}
