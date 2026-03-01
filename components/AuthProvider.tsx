"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { ensureUserProfile, getBusinessProfile, type BusinessProfile, type UserProfile } from "@/lib/firebase/tenant";
import { syncBusinessRoleClaims } from "@/lib/firebase/claims";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  business: BusinessProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setLoading(true);
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setBusiness(null);
        setLoading(false);
        return;
      }

      try {
        const nextProfile = await ensureUserProfile(nextUser);
        setProfile(nextProfile);

        const claimsBefore = await nextUser.getIdTokenResult();
        console.log("[auth] login claims (before sync)", {
          uid: nextUser.uid,
          businessId: String(claimsBefore.claims.businessId || ""),
          role: String(claimsBefore.claims.role || "")
        });

        try {
          await syncBusinessRoleClaims(nextUser, nextProfile);

          const claimsAfter = await nextUser.getIdTokenResult(true);
          console.log("[auth] login claims (after sync)", {
            uid: nextUser.uid,
            businessId: String(claimsAfter.claims.businessId || ""),
            role: String(claimsAfter.claims.role || "")
          });
        } catch (claimError) {
          console.warn("Failed to sync auth claims", claimError);
        }

        const nextBusiness = await getBusinessProfile(nextProfile.businessId);
        setBusiness(nextBusiness);
      } catch (error) {
        console.error("Failed to initialize user profile", error);
        setProfile(null);
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      business,
      loading,
      logout: async () => {
        await signOut(auth);
      }
    }),
    [user, profile, business, loading]
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
