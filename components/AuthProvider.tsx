"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import {
  getAuthorizedActiveProfileByPhone,
  getBusinessProfile,
  linkPhoneAuthorizationToUid,
  type BusinessProfile,
  type UserProfile
} from "@/lib/firebase/tenant";
import { isClaimProfileConsistent, syncBusinessRoleClaims } from "@/lib/firebase/claims";
import { clearSessionExpiry, isSessionExpired, setSessionExpiry } from "@/lib/firebase/session";
import { evaluateSessionAccess, type AccessDecisionState } from "@/lib/firebase/access-decision";
import { getTeamUserById, subscribeTeamUserById } from "@/lib/firebase/users";
import { normalizeRole } from "@/lib/firebase/role-routing";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  business: BusinessProfile | null;
  loading: boolean;
  access: AccessDecisionState;
  logout: () => Promise<void>;
  refreshAuthorization: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<AccessDecisionState>({ decision: "deny", reason: "unauthenticated" });
  const teamUserUnsubRef = useRef<(() => void) | null>(null);

  const stopTeamUserListener = useCallback(() => {
    if (teamUserUnsubRef.current) {
      teamUserUnsubRef.current();
      teamUserUnsubRef.current = null;
    }
  }, []);

  const closeSession = useCallback(async (reason: AccessDecisionState["reason"]) => {
    clearSessionExpiry();
    stopTeamUserListener();
    setAccess({ decision: "deny", reason });
    await signOut(auth);
  }, [stopTeamUserListener]);

  const refreshAuthorization = useCallback(async () => {
    if (!user || !profile?.businessId) return;

    const latest = await getTeamUserById(profile.businessId, user.uid);
    if (!latest || latest.active === false) {
      await closeSession("inactive");
      return;
    }

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            role: normalizeRole(latest.role),
            phone: latest.phone || prev.phone,
            displayName: latest.displayName || prev.displayName,
            active: latest.active
          }
        : prev
    );
  }, [closeSession, profile?.businessId, user]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setLoading(true);
      setUser(nextUser);
      stopTeamUserListener();

      if (!nextUser) {
        clearSessionExpiry();
        setProfile(null);
        setBusiness(null);
        setAccess({ decision: "deny", reason: "unauthenticated" });
        setLoading(false);
        return;
      }

      if (isSessionExpired()) {
        await closeSession("session-expired");
        setProfile(null);
        setBusiness(null);
        setLoading(false);
        return;
      }

      try {
        const authorized = await getAuthorizedActiveProfileByPhone(nextUser.phoneNumber || "");
        if (!authorized) {
          await closeSession("profile-missing");
          setProfile(null);
          setBusiness(null);
          setLoading(false);
          return;
        }

        const nextProfile = await linkPhoneAuthorizationToUid(nextUser, authorized);

        await syncBusinessRoleClaims(nextUser, nextProfile);
        const claimsAfter = await nextUser.getIdTokenResult(true);

        if (!isClaimProfileConsistent({ claims: claimsAfter.claims, profile: nextProfile })) {
          await closeSession("tenant-mismatch");
          setProfile(null);
          setBusiness(null);
          setLoading(false);
          return;
        }

        setSessionExpiry();
        setProfile(nextProfile);
        const nextBusiness = await getBusinessProfile(nextProfile.businessId);
        setBusiness(nextBusiness);
        setAccess(evaluateSessionAccess({ user: nextUser, profile: nextProfile }));

        teamUserUnsubRef.current = subscribeTeamUserById(
          nextProfile.businessId,
          nextUser.uid,
          (latestTeamUser) => {
            if (!latestTeamUser || latestTeamUser.active === false) {
              void closeSession("inactive");
              return;
            }

            setProfile((prev) =>
              prev
                ? {
                    ...prev,
                    role: normalizeRole(latestTeamUser.role),
                    phone: latestTeamUser.phone || prev.phone,
                    displayName: latestTeamUser.displayName || prev.displayName,
                    active: latestTeamUser.active
                  }
                : prev
            );
          },
          (listenerError) => {
            console.warn("Failed to watch team user changes", listenerError);
          }
        );
      } catch (error) {
        console.error("Failed to initialize user profile", error);
        try {
          await closeSession("session-invalid");
        } catch (logoutError) {
          console.warn("Failed to close invalid session", logoutError);
        }
        setProfile(null);
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      stopTeamUserListener();
      unsub();
    };
  }, [closeSession, stopTeamUserListener]);

  useEffect(() => {
    const handleExternalAuthzChange = () => {
      void refreshAuthorization();
    };

    window.addEventListener("sw-authz-changed", handleExternalAuthzChange);
    return () => window.removeEventListener("sw-authz-changed", handleExternalAuthzChange);
  }, [refreshAuthorization]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      business,
      loading,
      access,
      logout: async () => {
        clearSessionExpiry();
        stopTeamUserListener();
        await signOut(auth);
      },
      refreshAuthorization
    }),
    [user, profile, business, loading, access, refreshAuthorization, stopTeamUserListener]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
