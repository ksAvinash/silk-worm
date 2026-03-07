# Feature Specification: Login and Session Alignment

**Feature Branch**: `001-login-session-alignment`  
**Created**: 2026-03-07  
**Status**: Draft  
**Input**: User description: "I want to update the login & session logic to be similar to billing-website"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authorized OTP Sign-In and Routing (Priority: P1)

An authorized operations user signs in with phone OTP and is routed to the correct post-login destination based on their assigned role, with a valid session initialized immediately.

**Why this priority**: Login and first-route correctness is the core entry path to the product. If this fails, no downstream workflow is usable.

**Independent Test**: Can be fully tested by signing in with an authorized phone number and verifying successful OTP flow, session creation, and role-correct landing route.

**Acceptance Scenarios**:

1. **Given** a valid, authorized phone number, **When** the user requests and enters a correct OTP, **Then** the system signs the user in, initializes session state, and redirects to the role-appropriate landing page.
2. **Given** an unauthorized or inactive phone number, **When** the user attempts sign-in, **Then** access is denied with a clear message and no active session is created.
3. **Given** OTP verification fails, **When** the user enters an invalid or expired code, **Then** the system keeps the user on login, shows a recoverable error, and allows retry.

---

### User Story 2 - Session Continuity and Expiry Control (Priority: P2)

An already authenticated user reopening the app can continue without re-authentication within the allowed session window, while expired or invalid sessions are safely terminated.

**Why this priority**: Stable session continuity reduces friction, while strict expiry prevents stale access and aligns behavior with the billing reference.

**Independent Test**: Can be tested by reopening the app before and after session expiry and confirming expected continue-or-signout outcomes.

**Acceptance Scenarios**:

1. **Given** an authenticated user within the active session window, **When** they reopen the app, **Then** they are automatically recognized and redirected to their role-appropriate destination.
2. **Given** an authenticated user whose session window has elapsed, **When** they reopen or interact with protected routes, **Then** the system signs them out and sends them to login.
3. **Given** session metadata is missing or unreadable, **When** session validity cannot be determined, **Then** the system fails safe by requiring fresh authentication.

---

### User Story 3 - Ongoing Authorization and Access Safety (Priority: P3)

During an active session, user authorization changes (role, active status, tenant alignment) are reflected promptly so users do not keep access they should no longer have.

**Why this priority**: Prevents authorization drift and cross-tenant exposure after login, especially for financial and administrative workflows.

**Independent Test**: Can be tested by changing a signed-in user's active status or role and verifying access is updated or revoked without manual intervention.

**Acceptance Scenarios**:

1. **Given** a signed-in user is deactivated, **When** the deactivation is detected, **Then** their session is terminated and protected routes become inaccessible.
2. **Given** a signed-in user's role changes, **When** authorization state refreshes, **Then** route access and navigation update to match the new role.
3. **Given** tenant-linked identity signals are inconsistent, **When** protected data access is attempted, **Then** access is blocked and the user is redirected to a safe state.

### Edge Cases

- User has a valid phone-auth identity but no matching authorized business user profile.
- User profile becomes inactive while a session is already active.
- Role or tenant identity information is delayed or stale immediately after login.
- OTP can be requested but verification repeatedly fails due to temporary auth service limits.
- Session metadata is deleted or corrupted in client storage between page loads.

## Assumptions

- The authentication method remains phone OTP sign-in.
- Session lifetime target is 24 hours to match existing billing-website behavior unless changed in a later feature.
- Existing role definitions and role-based landing routes remain the source of truth.
- Tenant scoping by `businessId` remains mandatory for all protected business-domain data access.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support phone OTP sign-in for users who are pre-authorized in business user records.
- **FR-002**: The system MUST verify authorization and active status before completing login.
- **FR-003**: The system MUST deny access for unauthorized or inactive users and keep them out of protected routes.
- **FR-004**: The system MUST establish session state immediately after successful OTP verification.
- **FR-005**: The system MUST refresh user identity context after login so role- and tenant-scoped authorization decisions use current values.
- **FR-006**: The system MUST route signed-in users to role-appropriate destinations after successful login and after session restoration.
- **FR-007**: The system MUST preserve authenticated sessions across browser reloads within the session window.
- **FR-008**: The system MUST expire sessions at the configured session window and require re-authentication afterward.
- **FR-009**: The system MUST fail safe by requiring re-authentication when session validity cannot be confirmed.
- **FR-010**: The system MUST continuously enforce account active status and remove access when a user is deactivated.
- **FR-011**: The system MUST update effective access promptly when a user's role changes during an active session.
- **FR-012**: The system MUST provide clear, actionable user feedback for OTP errors, authorization failures, and forced sign-out events.

### Constitution Alignment *(mandatory)*

- **CA-001 Tenant Isolation**: All protected reads and writes triggered by authenticated sessions must remain scoped to the authenticated user's `businessId`; inconsistent tenant identity must block protected access.
- **CA-002 Authorization**: Only users with valid active profiles and role-appropriate permissions may access protected routes; role checks must continue to gate financial and administrative pages.
- **CA-003 Data Integrity**: Session changes must not allow bypass of existing booking, inventory, or billing invariants; expired/invalid sessions must never execute protected state-changing operations.
- **CA-004 Verification**: Validation evidence for implementation must include `npm run typecheck`, `npm run lint`, and critical-path auth/session checks covering login, role routing, forced logout, and session expiry behavior.
- **CA-005 Auditability**: Auth-related state changes that affect access decisions must remain traceable through existing user/business records and timestamped metadata used by the platform.

### Key Entities *(include if feature involves data)*

- **Authenticated Session**: Represents a signed-in state for a user, including login timestamp, expiry boundary, and current validity.
- **Authorized User Profile**: Represents business-linked user eligibility, including active status, role, and tenant (`businessId`) association.
- **Identity Claim Snapshot**: Represents current role and tenant signals used to enforce route and data access decisions.
- **Access Decision Event**: Represents an allow/deny outcome for route entry or protected operation based on session validity and authorization state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of authorized users complete OTP sign-in and reach their role-appropriate landing page in under 60 seconds during normal operation.
- **SC-002**: 100% of unauthorized or inactive sign-in attempts are blocked from entering protected routes.
- **SC-003**: 100% of sessions older than the configured session window are denied protected access until the user re-authenticates.
- **SC-004**: At least 95% of deactivation or role-change events for signed-in users are reflected in effective access within one minute.
- **SC-005**: Support incidents related to incorrect post-login routing or stale access are reduced by at least 50% within one release cycle after rollout.
