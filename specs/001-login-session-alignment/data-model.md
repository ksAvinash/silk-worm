# Data Model: Login and Session Alignment

## Entity: AuthorizedUserProfile

- Purpose: Authoritative business-linked user record used to determine if OTP-authenticated users may access protected features.
- Core fields:
  - `uid` or `userId` (string)
  - `phone` (E.164 string)
  - `businessId` (string)
  - `role` (string; normalized role key)
  - `active` (boolean)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
- Validation rules:
  - `phone` must be normalized before lookup.
  - `businessId` must be present for protected business-domain access.
  - `role` must map to a known role routing definition.
  - `active === false` must deny protected access.

## Entity: IdentityClaimSnapshot

- Purpose: Effective auth claim context used by client and Firestore rules for authorization.
- Core fields:
  - `uid` (string)
  - `businessId` (string claim)
  - `role` (string claim)
  - `issuedAtTime` (token issue timestamp)
- Validation rules:
  - Claims must match or be reconcilable with `AuthorizedUserProfile`.
  - Missing/empty `businessId` or `role` for protected access is invalid.

## Entity: ClientSessionState

- Purpose: Browser-level session representation controlling route access continuity.
- Core fields:
  - `firebaseUserPresent` (boolean)
  - `sessionExpiryTime` (epoch ms)
  - `userData` (cached role/business/profile subset)
  - `lastAuthCheckAt` (epoch ms, optional)
- Validation rules:
  - Expired `sessionExpiryTime` transitions session to invalid.
  - Missing or unreadable session metadata must fail safe.
  - Cached `userData` must never grant access if firebase auth state is absent.

## Entity: AccessDecisionEvent

- Purpose: Deterministic allow/deny result for route entry or protected operation.
- Core fields:
  - `decision` (`allow` | `deny`)
  - `reason` (`unauthenticated` | `inactive` | `expired` | `role-mismatch` | `tenant-mismatch` | `authorized`)
  - `route` (string)
  - `evaluatedAt` (timestamp)
- Validation rules:
  - Deny decisions must trigger redirect or sign-out behavior.
  - Allow decisions require valid auth + authorization context.

## Relationships

- `AuthorizedUserProfile` 1:1 `IdentityClaimSnapshot` by authenticated user identity (`uid`/phone mapping).
- `ClientSessionState` derives from Firebase auth state plus `AuthorizedUserProfile` and claim refresh outcomes.
- `AccessDecisionEvent` is computed from `ClientSessionState` + `AuthorizedUserProfile` + route requirements.

## State Transitions

1. `Unauthenticated` -> `OtpPending`: user submits phone and requests OTP.
2. `OtpPending` -> `AuthenticatedPendingAuthorization`: OTP verified by Firebase.
3. `AuthenticatedPendingAuthorization` -> `ActiveSession`: authorized active profile found, claims refreshed, expiry set.
4. `ActiveSession` -> `ExpiredSession`: expiry boundary reached.
5. `ActiveSession` -> `RevokedSession`: profile becomes inactive or role/tenant check fails.
6. `ExpiredSession` or `RevokedSession` -> `Unauthenticated`: sign-out and redirect to login.