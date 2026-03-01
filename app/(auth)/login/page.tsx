"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requestOtp, verifyOtp } from "@/lib/firebase/auth";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace("/dashboard");
    }
  }, [loading, user, profile, router]);

  const sendOtp = async () => {
    setBusy(true);
    setStatus("");

    try {
      await requestOtp(phone);
      setStep("code");
    } catch {
      setStatus("Could not send code. Please try again.");
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
