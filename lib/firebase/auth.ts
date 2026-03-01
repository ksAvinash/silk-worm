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
      size: "normal"
    });
  }

  return window.recaptchaVerifier;
}

export async function requestOtp(phoneNumber: string): Promise<void> {
  const verifier = ensureRecaptcha();
  window.otpConfirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
}

export async function verifyOtp(code: string): Promise<UserCredential> {
  if (!window.otpConfirmation) {
    throw new Error("Request OTP first");
  }

  return window.otpConfirmation.confirm(code);
}
