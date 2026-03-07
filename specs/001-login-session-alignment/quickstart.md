# Quickstart: Validate Login and Session Alignment

## Prerequisites

- Firebase project variables are configured in local environment.
- At least one active authorized user profile exists with valid phone and role.
- At least one inactive or unauthorized phone number is available for negative tests.

## Setup

1. Install dependencies:
```bash
npm install
```
2. Start the app:
```bash
npm run dev
```

## Verification Gates

1. Type check:
```bash
npm run typecheck
```
2. Lint:
```bash
npm run lint
```

## Critical Path Manual Checks

1. Authorized OTP login success
- Open `/login`.
- Enter active authorized phone number.
- Request OTP and verify with correct code.
- Confirm redirect to role-appropriate home route.

2. Unauthorized/inactive login denied
- Attempt login with unauthorized phone.
- Attempt login with inactive authorized profile.
- Confirm access denied and protected routes remain inaccessible.

3. OTP error handling
- Enter invalid OTP and confirm clear error with retry path.
- Simulate expired OTP path and confirm user can restart login flow.

4. Session restore behavior
- Complete login.
- Reload app before expiry.
- Confirm user remains authenticated and redirected by role mapping.

5. Session expiry enforcement
- Set session expiry metadata to a past timestamp (dev tools/localStorage).
- Reload protected route.
- Confirm forced logout and redirect to `/login`.

6. Authorization drift handling
- While signed in, change user profile role or active status in Firestore.
- Confirm access updates promptly:
  - inactive -> forced logout
  - role change -> route access/redirect follows new role

## Evidence to Capture

- Console/network traces for OTP success and failure.
- Screenshots of redirect outcomes for each tested role.
- Record of forced logout on expiry and deactivation.
- `npm run typecheck` and `npm run lint` outputs.

## Validation Run Log (2026-03-07)

- `npm run typecheck`: PASS (`tsc --noEmit` completed with no errors).
- `npm run lint`: PASS with pre-existing warnings unrelated to this feature:
  - `@next/next/no-img-element` in existing invoice/settings pages.
  - one existing `@typescript-eslint/no-unused-vars` warning in `lib/firebase/bookings.ts`.
- Manual critical-path checks: PENDING (requires live Firebase OTP environment and active/inactive test accounts).
