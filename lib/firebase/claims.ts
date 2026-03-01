import type { User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { functionsApp } from "./config";
import type { UserProfile } from "./tenant";

const VALID_ROLES = new Set(["owner", "manager", "operator"]);

function normalizeRole(value: unknown): string {
  const role = String(value || "").trim().toLowerCase();
  return VALID_ROLES.has(role) ? role : "";
}

export async function syncBusinessRoleClaims(user: User, profile: Pick<UserProfile, "businessId" | "role">): Promise<void> {
  const businessId = String(profile.businessId || "").trim();
  const role = normalizeRole(profile.role);

  if (!businessId || !role) {
    throw new Error("Cannot sync claims without valid business and role.");
  }

  const currentToken = await user.getIdTokenResult();
  if (currentToken.claims.businessId === businessId && currentToken.claims.role === role) {
    return;
  }

  const syncClaim = httpsCallable(functionsApp, "syncBusinessRoleClaim");
  await syncClaim();
  await user.getIdToken(true);
}
