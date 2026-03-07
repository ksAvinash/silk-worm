# Implementation Plan: Login and Session Alignment

**Branch**: `001-login-session-alignment` | **Date**: 2026-03-07 | **Spec**: `/Users/avinashks/Documents/GitHub/silk-worm/specs/001-login-session-alignment/spec.md`
**Input**: Feature specification from `/specs/001-login-session-alignment/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Align Silk Worm login/session behavior with billing-website reference patterns
while preserving tenant isolation and role-based authorization. The implementation
will formalize a session lifecycle for phone OTP sign-in, enforce explicit session
expiry handling, keep auth claims/profile state synchronized, and ensure role-based
route guards stay current when authorization state changes.

## Technical Context

**Language/Version**: TypeScript 5.x + React 19 + Next.js App Router 15.x  
**Primary Dependencies**: `next`, `react`, `firebase` (Auth, Firestore, Functions), existing `lib/firebase/*` modules  
**Storage**: Firebase Auth session state, Firestore (`users`, business-domain collections), browser `localStorage` for session metadata  
**Testing**: `npm run typecheck`, `npm run lint`, and manual critical-path auth/session validation (login/expiry/route-guard flows)  
**Target Platform**: Modern desktop/mobile browsers running Next.js web app
**Project Type**: Single Next.js web application (frontend + BFF-style route handlers if used)  
**Performance Goals**: 95% authorized logins reach role landing route in under 60 seconds; authorization state updates reflected within 1 minute  
**Constraints**: Tenant isolation by `businessId`, role enforcement in app logic + Firestore rules, fail-safe logout on invalid session/auth state  
**Scale/Scope**: Current operational dashboard users across multiple businesses; feature scope limited to login/session and route-access behavior

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Pre-Design Gate Review: PASS
- Tenant isolation: PASS. Auth/session model continues to rely on `businessId` claim
  and profile linkage; protected data access remains blocked when identity context
  is missing or inconsistent.
- Authorization: PASS. Login eligibility, active status checks, and role-based
  route gating are explicit in planned flow and contract artifacts.
- Data integrity: PASS. Session invalidation paths prevent unauthorized mutations in
  bookings/inventory/invoices by forcing logout and redirect before protected actions.
- Verification: PASS. Plan mandates `npm run typecheck`, `npm run lint`, plus
  manual validation for OTP flow, session expiry, and authorization revocation.
- Auditability: PASS. Access-affecting state continues to derive from persisted user
  profile/claims and existing timestamped records.

### Post-Design Constitution Re-Check

- Post-Design Gate Review: PASS
- Tenant isolation: PASS. `data-model.md` and contracts require tenant-aware identity
  (`businessId`) to be present before protected route/data access.
- Authorization: PASS. Contracts define deny-first behavior for unauthorized/inactive
  users and role mismatch redirects.
- Data integrity: PASS. Session lifecycle transitions explicitly include invalid/expired
  states that block sensitive operations.
- Verification: PASS. `quickstart.md` includes lint/typecheck and critical-path
  manual checks for all priority user stories.
- Auditability: PASS. No new write paths bypass existing audit metadata expectations;
  claim/profile refresh points are explicitly traceable.

## Project Structure

### Documentation (this feature)

```text
specs/001-login-session-alignment/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── auth-session-state-machine.md
│   └── route-access-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)
```text
app/
├── (auth)/login/page.tsx
├── (dashboard)/layout.tsx
└── (dashboard)/*/page.tsx

components/
├── AuthProvider.tsx
└── RequireAuth.tsx

lib/firebase/
├── auth.ts
├── claims.ts
├── tenant.ts
└── users.ts

functions/custom-claims/
└── index.js

firestore.rules
```

**Structure Decision**: Use the existing single Next.js app structure with auth
logic concentrated in `app/(auth)/login`, `components/AuthProvider.tsx`,
`components/RequireAuth.tsx`, and Firebase adapters in `lib/firebase/*`. This keeps
the feature incremental and compliant with the constitution requirement for small,
reviewable slices.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
