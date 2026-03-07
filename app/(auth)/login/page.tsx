"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearRecaptcha,
  isValidPhoneNumber,
  normalizePhoneNumber,
  OtpGuardError,
  requestOtp,
  setupRecaptcha,
  verifyOtp
} from "@/lib/firebase/auth";
import { useAuth } from "@/components/AuthProvider";
import { RecaptchaVerifier, signOut } from "firebase/auth";
import { getHomeRouteForRole } from "@/lib/firebase/role-routing";
import { getAuthorizedActiveProfileByPhone, linkPhoneAuthorizationToUid } from "@/lib/firebase/tenant";
import { syncBusinessRoleClaims } from "@/lib/firebase/claims";
import { auth } from "@/lib/firebase/config";
import { setSessionExpiry } from "@/lib/firebase/session";

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading, access } = useAuth();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const getOtpErrorMessage = (error: unknown) => {
    if (error instanceof OtpGuardError) {
      return error.message;
    }

    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    switch (code) {
      case "auth/invalid-phone-number":
        return "Phone number is invalid. Use country code, for example +91XXXXXXXXXX.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait and try again.";
      case "auth/invalid-app-credential":
      case "auth/captcha-check-failed":
        return "Security check failed. Refresh page. Also confirm this domain is added in Firebase Authorized Domains.";
      case "auth/operation-not-allowed":
        return "Phone login is not enabled in Firebase project settings.";
      default:
        return "Could not send code. Check Firebase Phone Auth settings and authorized domain, then try again.";
    }
  };

  useEffect(() => {
    if (!loading && user && profile) {
      if (access.reason === "session-expired") {
        router.replace("/login");
      } else {
        router.replace(getHomeRouteForRole(profile.role));
      }
    }
  }, [loading, user, profile, access.reason, router]);

  useEffect(() => {
    let mounted = true;

    const initRecaptcha = async () => {
      try {
        const verifier = await setupRecaptcha("recaptcha-container");
        if (mounted) {
          recaptchaRef.current = verifier;
        }
      } catch {
        if (mounted) {
          setStatus("Security check not ready. Refresh and try again.");
        }
      }
    };

    void initRecaptcha();

    return () => {
      mounted = false;
      recaptchaRef.current = null;
      clearRecaptcha();
    };
  }, []);

  const sendOtp = async () => {
    setBusy(true);
    setStatus("");
    const normalized = normalizePhoneNumber(phone);

    try {
      if (!isValidPhoneNumber(normalized)) {
        throw new OtpGuardError("invalid-phone", "Phone number is invalid. Use country code, for example +91XXXXXXXXXX.");
      }

      // Attempt an early authorization check when readable in the current environment.
      try {
        const preAuth = await getAuthorizedActiveProfileByPhone(normalized);
        if (preAuth && preAuth.active === false) {
          throw new OtpGuardError("inactive-user", "Your account is inactive. Contact your administrator.");
        }
      } catch {
        // Pre-OTP authorization is best-effort only.
      }

      if (!recaptchaRef.current) {
        recaptchaRef.current = await setupRecaptcha("recaptcha-container");
      }
      await requestOtp(normalized, recaptchaRef.current);
      setPhone(normalized);
      setStep("code");
    } catch (error) {
      setStatus(getOtpErrorMessage(error));

      const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
      if (code === "auth/invalid-app-credential" || code === "auth/captcha-check-failed") {
        clearRecaptcha();
        recaptchaRef.current = null;
        try {
          recaptchaRef.current = await setupRecaptcha("recaptcha-container");
        } catch {
          // handled by generic status above
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    setBusy(true);
    setStatus("");

    try {
      const authResult = await verifyOtp(code);
      const signedPhone = normalizePhoneNumber(authResult.user.phoneNumber || phone);
      const authorized = await getAuthorizedActiveProfileByPhone(signedPhone);

      if (!authorized) {
        await signOut(auth);
        throw new OtpGuardError("unauthorized-user", "This phone number is not authorized. Contact your administrator.");
      }

      if (!authorized.active) {
        await signOut(auth);
        throw new OtpGuardError("inactive-user", "Your account is inactive. Contact your administrator.");
      }

      const linkedProfile = await linkPhoneAuthorizationToUid(authResult.user, authorized);
      await syncBusinessRoleClaims(authResult.user, linkedProfile);
      setSessionExpiry();

      setStatus("Login successful. Opening your dashboard...");
      router.replace(getHomeRouteForRole(linkedProfile.role));
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
      if (error instanceof OtpGuardError) {
        setStatus(error.message);
      } else if (code === "auth/invalid-verification-code") {
        setStatus("Code is incorrect. Please try again.");
      } else if (code === "auth/code-expired") {
        setStatus("Code has expired. Please request a new one.");
        setStep("phone");
        setCode("");
      } else {
        setStatus("Could not verify code. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-head">
          <h1>Silk Worm Ops</h1>
          <p>Sign in to continue</p>
        </header>

        <div id="recaptcha-container" className="auth-recaptcha" />

        {step === "phone" ? (
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              void sendOtp();
            }}
          >
            <div className="auth-field">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={busy}
                required
              />
              <span className="auth-hint">Enter number with country code</span>
            </div>

            {status ? <div className="auth-error">{status}</div> : null}

            <button type="submit" disabled={busy || !phone.trim()}>
              {busy ? "Sending..." : "Send Code"}
            </button>
          </form>
        ) : (
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              void submitOtp();
            }}
          >
            <div className="auth-field">
              <label htmlFor="otp">Enter Code</label>
              <input
                id="otp"
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={busy}
                maxLength={6}
                required
              />
              <span className="auth-hint">Enter the 6-digit code sent to your phone</span>
            </div>

            {status ? <div className="auth-error">{status}</div> : null}

            <button type="submit" disabled={busy || code.length !== 6}>
              {busy ? "Verifying..." : "Verify Code"}
            </button>
            <button
              type="button"
              className="auth-back-btn"
              onClick={() => {
                setStep("phone");
                setCode("");
                setStatus("");
              }}
              disabled={busy}
            >
              Back
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
