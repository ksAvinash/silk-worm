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
  const [status, setStatus] = useState("Enter your phone number to continue.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace("/dashboard");
    }
  }, [loading, user, profile, router]);

  const sendOtp = async () => {
    setBusy(true);

    try {
      await requestOtp(phone);
      setStatus("Code sent. Enter it below.");
    } catch {
      setStatus("Could not send code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    setBusy(true);

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
    <main style={{ maxWidth: 520, margin: "64px auto", padding: 20 }}>
      <h1>Login</h1>
      <div className="card">
        <p className="muted">Use your phone number to sign in.</p>
        <label htmlFor="phone">Phone (+country code)</label>
        <input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ width: "100%" }}
          disabled={busy}
        />
        <button onClick={sendOtp} style={{ marginTop: 10 }} disabled={busy || !phone.trim()}>
          Send Code
        </button>
      </div>
      <div className="card">
        <label htmlFor="otp">Verification Code</label>
        <input
          id="otp"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ width: "100%" }}
          disabled={busy}
        />
        <button onClick={submitOtp} style={{ marginTop: 10 }} disabled={busy || !code.trim()}>
          Verify Code
        </button>
      </div>
      <p className="muted">{status}</p>
      <div id="recaptcha-container" />
    </main>
  );
}
