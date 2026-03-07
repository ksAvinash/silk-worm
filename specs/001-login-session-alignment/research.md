# Research: Login and Session Alignment

## Decision 1: Keep phone OTP as the only sign-in method

- Decision: Continue with Firebase Phone Auth OTP as the authentication mechanism.
- Rationale: Existing Silk Worm and billing-website flows both rely on phone OTP,
  so parity can be achieved without introducing migration risk.
- Alternatives considered:
  - Email/password login: rejected because it changes user onboarding and credential
    management requirements beyond this feature.
  - Federated OAuth login: rejected because it does not align with existing user
    records keyed by phone number.

## Decision 2: Enforce authorization before finalizing session

- Decision: Require authorized active user profile validation before completing
  login and protected route access.
- Rationale: billing-website blocks unauthorized/inactive users early, reducing
  stale access risk and support issues.
- Alternatives considered:
  - Login first, check authorization later: rejected because it creates short
    windows of unauthorized access and inconsistent UX.

## Decision 3: Use explicit client-side session expiry metadata

- Decision: Maintain an explicit session expiry timestamp (24h target) in browser
  storage and enforce fail-safe logout once expired.
- Rationale: Reference behavior includes deterministic timeout handling that is
  easy to validate and explain operationally.
- Alternatives considered:
  - Infinite session with Firebase persistence only: rejected due to stale access
    risk on shared devices.
  - Sliding expiration on every action: rejected for this iteration to keep logic
    simple and parity-focused.

## Decision 4: Refresh claims/profile at login and during active session

- Decision: Refresh custom claims after OTP verification and monitor user profile
  changes (role/active status) to keep authorization current.
- Rationale: Constitution requires role boundaries and tenant isolation; auth state
  must track authoritative profile changes without manual refresh.
- Alternatives considered:
  - Claims refresh only at first login: rejected because role changes would take
    too long to propagate.
  - Polling profile on interval only: rejected because event/listener patterns are
    more responsive and reduce unnecessary reads.

## Decision 5: Role-based redirect contract for post-login and restoration

- Decision: Apply a single role-to-home-route mapping for both fresh login and
  already-authenticated session restoration.
- Rationale: Prevents route drift and ensures consistent user expectations.
- Alternatives considered:
  - Hardcoded dashboard redirect for all roles: rejected because it conflicts with
    role-specific experience.
  - Route logic duplicated across pages: rejected due to maintainability and drift.

## Decision 6: Verification strategy remains lint/typecheck + critical manual path

- Decision: Validate with `npm run typecheck`, `npm run lint`, and manual checks
  for OTP success/failure, unauthorized user block, expiry logout, and role-change
  access behavior.
- Rationale: Matches constitution verification gate and current repo testing setup.
- Alternatives considered:
  - No manual checks: rejected because auth/session behavior spans UI + runtime
    states not fully covered by current automated tests.
  - Large new end-to-end suite in this feature: rejected for scope control.