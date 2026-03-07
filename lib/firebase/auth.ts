import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  UserCredential
} from "firebase/auth";
import { auth } from "./config";

export class OtpGuardError extends Error {
  code:
    | "invalid-phone"
    | "otp-send-failed"
    | "otp-invalid-or-expired"
    | "unauthorized-user"
    | "inactive-user"
    | "session-expired"
    | "session-invalid";

  constructor(
    code:
      | "invalid-phone"
      | "otp-send-failed"
      | "otp-invalid-or-expired"
      | "unauthorized-user"
      | "inactive-user"
      | "session-expired"
      | "session-invalid",
    message: string
  ) {
    super(message);
    this.name = "OtpGuardError";
    this.code = code;
  }
}

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    otpConfirmation?: ConfirmationResult;
  }
}

function ensureRecaptcha() {
  if (typeof window === "undefined") {
    throw new Error("Browser context required for OTP login");
  }

  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => undefined,
      "expired-callback": () => undefined
    });
  }

  return window.recaptchaVerifier;
}

export function normalizePhoneNumber(value: string): string {
  const raw = value.trim().replace(/\s+/g, "");
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  return digits ? `+${digits}` : "";
}

export function isValidPhoneNumber(value: string): boolean {
  return /^\+[1-9]\d{9,14}$/.test(value);
}

export async function setupRecaptcha(containerId = "recaptcha-container"): Promise<RecaptchaVerifier> {
  if (typeof window === "undefined") {
    throw new Error("Browser context required for OTP login");
  }

  const existing = window.recaptchaVerifier;
  if (existing) {
    try {
      existing.clear();
    } catch {
      // ignore stale cleanup error
    }
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => undefined,
    "expired-callback": () => undefined
  });

  await window.recaptchaVerifier.render();
  return window.recaptchaVerifier;
}

export function clearRecaptcha() {
  if (typeof window === "undefined" || !window.recaptchaVerifier) {
    return;
  }

  try {
    window.recaptchaVerifier.clear();
  } catch {
    // ignore cleanup error
  } finally {
    window.recaptchaVerifier = undefined;
  }
}

export async function requestOtp(phoneNumber: string, verifier?: RecaptchaVerifier): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!isValidPhoneNumber(normalized)) {
    throw new OtpGuardError("invalid-phone", "Please enter a valid phone number with country code.");
  }

  const activeVerifier = verifier || ensureRecaptcha();
  window.otpConfirmation = await signInWithPhoneNumber(auth, normalized, activeVerifier);
}

export async function verifyOtp(code: string): Promise<UserCredential> {
  if (!window.otpConfirmation) {
    throw new OtpGuardError("session-invalid", "Request OTP first.");
  }

  return window.otpConfirmation.confirm(code);
}
