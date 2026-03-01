import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  UserCredential
} from "firebase/auth";
import { auth } from "./config";

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
  const activeVerifier = verifier || ensureRecaptcha();
  window.otpConfirmation = await signInWithPhoneNumber(auth, phoneNumber, activeVerifier);
}

export async function verifyOtp(code: string): Promise<UserCredential> {
  if (!window.otpConfirmation) {
    throw new Error("Request OTP first");
  }

  return window.otpConfirmation.confirm(code);
}
