"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearRecaptcha, requestOtp, setupRecaptcha, verifyOtp } from "@/lib/firebase/auth";
import { useAuth } from "@/components/AuthProvider";
import { RecaptchaVerifier } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const normalizePhone = (value: string) => {
    const raw = value.trim().replace(/\s+/g, "");
    if (raw.startsWith("+")) return raw;
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
    return raw;
  };

  const getOtpErrorMessage = (error: unknown) => {
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
      router.replace("/dashboard");
    }
  }, [loading, user, profile, router]);

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
    const normalized = normalizePhone(phone);

    try {
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
      await verifyOtp(code);
      setStatus("Login successful. Opening your dashboard...");
    } catch {
      setStatus("Code is incorrect. Please try again.");
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
