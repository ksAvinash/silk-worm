# Contract: Auth Session State Machine

## Purpose

Define deterministic login/session behavior for OTP authentication, session lifecycle,
and forced logout conditions.

## Inputs

- `phoneNumber` (string, user input)
- `otpCode` (6-digit string)
- `firebaseAuthUser` (Firebase user identity)
- `authorizedUserProfile` (business-linked user record)
- `sessionExpiryTime` (epoch ms)

## Preconditions

- Phone number format is normalized before OTP request.
- Firebase Phone Auth and reCAPTCHA are initialized.
- Authorization lookup can read the user profile source of truth.

## State Contract

1. `REQUEST_OTP`
- Requires: valid normalized phone input.
- Produces: OTP challenge or error.
- Deny conditions: invalid phone format, auth service throttling.

2. `VERIFY_OTP`
- Requires: active OTP challenge + 6-digit code.
- Produces: authenticated Firebase user or verification error.
- Deny conditions: invalid code, expired code.

3. `AUTHORIZE_USER`
- Requires: authenticated Firebase user with phone identity.
- Produces: authorized active user profile.
- Deny conditions: no matching profile, `active === false`.

4. `SYNC_IDENTITY`
- Requires: authorized active profile.
- Produces: refreshed claim snapshot with role/business context.
- Deny conditions: claim sync fails critically or required claim values absent.

5. `OPEN_SESSION`
- Requires: valid identity + authorization context.
- Produces: session metadata persisted (`sessionExpiryTime`, user profile cache)
  and role-home redirect decision.

6. `VALIDATE_SESSION`
- Requires: protected route access attempt.
- Produces: allow/deny decision.
- Deny conditions: unauthenticated user, expired session, inactive user, tenant/role mismatch.

7. `CLOSE_SESSION`
- Trigger: explicit sign-out, expiry, or revoked authorization.
- Produces: cleared local session metadata and redirect to `/login`.

## Postconditions

- Protected routes are accessible only when session is valid and authorized.
- Session expiry always results in access denial until re-authentication.
- Authorization revocation during active session results in forced logout.

## Error Contract

- User-facing errors must be actionable and specific to failure class:
  - `invalid-phone`
  - `otp-send-failed`
  - `otp-invalid-or-expired`
  - `unauthorized-user`
  - `inactive-user`
  - `session-expired`
  - `session-invalid`
