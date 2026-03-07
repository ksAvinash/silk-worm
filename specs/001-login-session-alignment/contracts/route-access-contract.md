# Contract: Role and Route Access

## Purpose

Define how route access decisions are derived from session validity and role-based
authorization.

## Route Categories

- Public routes: no session required (for this feature, login-related pages).
- Protected dashboard routes: require valid authenticated session and authorized profile.
- Sensitive protected routes: require valid session + role checks (finance/admin domains).

## Inputs to Access Decision

- Session validity (`firebase auth state` + `sessionExpiryTime`)
- Authorized profile status (`active`, `role`, `businessId`)
- Claim/profile consistency (`role`, `businessId`)
- Requested route and required role scope

## Decision Rules

1. If user is unauthenticated -> deny and redirect to `/login`.
2. If session is expired -> sign out, clear session metadata, redirect to `/login`.
3. If profile is missing or inactive -> deny and redirect to `/login`.
4. If tenant identity is missing/inconsistent -> deny protected access and redirect to safe route.
5. If role is valid but route is not allowed -> redirect to role home route.
6. If role and session are valid -> allow route access.

## Role Redirect Contract

- Post-login redirect and session-restore redirect both use the same role-to-home mapping.
- Unknown/invalid role values must resolve to a safe fallback route that does not expose
  unauthorized sensitive features.

## Observability and Audit Notes

- Access control outcomes must be traceable through persisted profile/claim metadata.
- Forced logout causes should be distinguishable in logs to support debugging and support.
