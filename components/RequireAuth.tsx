"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.replace("/login");
    }
  }, [loading, user, profile, router]);

  if (loading) {
    return <p>Checking session...</p>;
  }

  if (!user || !profile) {
    return <p>Redirecting to login...</p>;
  }

  return <>{children}</>;
}
