# Tasks: Login and Session Alignment

**Input**: Design documents from `/specs/001-login-session-alignment/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Automated tests were not explicitly requested in the spec. This task list uses lint/typecheck plus critical-path manual validation tasks.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add shared auth/session utilities and route helpers used across all stories.

- [X] T001 Create session state utility module in `lib/firebase/session.ts`
- [X] T002 [P] Create role normalization and home-route resolver in `lib/firebase/role-routing.ts`
- [X] T003 [P] Create access decision reason types/helpers in `lib/firebase/access-decision.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared authorization/session guardrails required before user-story implementation.

**⚠️ CRITICAL**: No user story work starts until this phase is complete.

- [X] T004 Extend auth context contract with session/access decision fields in `components/AuthProvider.tsx`
- [X] T005 [P] Add authorized active profile lookup by phone in `lib/firebase/tenant.ts`
- [X] T006 [P] Add claim-profile consistency validator in `lib/firebase/claims.ts`
- [X] T007 Enforce active member checks for protected business collections in `firestore.rules`
- [X] T008 Remove duplicated rules blocks and keep a single valid ruleset in `firestore.rules`
- [X] T009 Update auth gate to consume centralized access decisions in `components/RequireAuth.tsx`

**Checkpoint**: Foundation ready; user stories can now be implemented independently.

---

## Phase 3: User Story 1 - Authorized OTP Sign-In and Routing (Priority: P1) 🎯 MVP

**Goal**: Ensure only authorized active users complete OTP login and are routed to the correct role home route.

**Independent Test**: Sign in with authorized and unauthorized/inactive phone numbers and verify allow/deny behavior with role-correct post-login redirect.

### Implementation for User Story 1

- [X] T010 [US1] Add phone normalization and typed OTP guard errors in `lib/firebase/auth.ts`
- [X] T011 [P] [US1] Implement pre-OTP authorization and active-status validation in `app/(auth)/login/page.tsx`
- [X] T012 [US1] Implement post-OTP claim sync and session open transition in `app/(auth)/login/page.tsx`
- [X] T013 [P] [US1] Add role-home redirect selection helper usage in `app/(auth)/login/page.tsx`
- [X] T014 [US1] Wire authorized profile + business bootstrap sequencing in `components/AuthProvider.tsx`
- [X] T015 [US1] Enforce protected route entry via updated auth gate in `app/(dashboard)/layout.tsx`

**Checkpoint**: User Story 1 is independently functional and demonstrable.

---

## Phase 4: User Story 2 - Session Continuity and Expiry Control (Priority: P2)

**Goal**: Preserve valid sessions across reload and force logout for expired/invalid session state.

**Independent Test**: Reopen app before and after session expiry and verify expected continue-or-logout behavior.

### Implementation for User Story 2

- [X] T016 [US2] Implement session expiry write/read/clear lifecycle helpers in `lib/firebase/session.ts`
- [X] T017 [US2] Add startup session-expiry enforcement and fail-safe logout in `components/AuthProvider.tsx`
- [X] T018 [P] [US2] Update protected route checks for missing/expired metadata in `components/RequireAuth.tsx`
- [X] T019 [P] [US2] Update logout flow to clear session metadata in `components/DashboardShell.tsx`
- [X] T020 [US2] Add already-authenticated login fast-path with expiry validation in `app/(auth)/login/page.tsx`

**Checkpoint**: User Story 2 is independently functional and demonstrable.

---

## Phase 5: User Story 3 - Ongoing Authorization and Access Safety (Priority: P3)

**Goal**: Keep access decisions current during active sessions when role/active/tenant context changes.

**Independent Test**: Modify signed-in user active status or role and verify immediate revocation/redirect behavior.

### Implementation for User Story 3

- [X] T021 [P] [US3] Add live team-user profile listener helpers in `lib/firebase/users.ts`
- [X] T022 [US3] Integrate role/active drift listener and forced-session-close handling in `components/AuthProvider.tsx`
- [X] T023 [US3] Enforce role-mismatch safe redirect logic in `components/RequireAuth.tsx`
- [X] T024 [P] [US3] Trigger auth context refresh after role/active updates in `app/(dashboard)/users/page.tsx`
- [X] T025 [US3] Add structured audit logs for session revocation reasons in `components/AuthProvider.tsx`

**Checkpoint**: User Story 3 is independently functional and demonstrable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final alignment, documentation, and verification evidence.

- [X] T026 [P] Document updated auth/session behavior and operator expectations in `docs/PRODUCT_PLAN.md`
- [X] T027 Run `npm run typecheck` and record result evidence in `specs/001-login-session-alignment/quickstart.md`
- [X] T028 Run `npm run lint` and record result evidence in `specs/001-login-session-alignment/quickstart.md`
- [ ] T029 Execute critical-path manual validation checklist and capture outcomes in `specs/001-login-session-alignment/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies, can start immediately.
- Foundational (Phase 2): Depends on Phase 1; blocks all user stories.
- User Story phases (Phases 3-5): Depend on Phase 2 completion.
- Polish (Phase 6): Depends on completion of targeted user stories.

### User Story Dependencies

- US1 (P1): Starts after Foundational phase; no dependency on US2/US3.
- US2 (P2): Starts after Foundational phase; independent of US1 implementation details.
- US3 (P3): Starts after Foundational phase; independent but may reuse shared auth/session utilities.

### Within-Story Ordering Rules

- Shared helpers before UI wiring in each story.
- Auth/session state transitions before redirects and UX messaging.
- Core behavior complete before polish/verification capture.

## Parallel Opportunities

- Phase 1 parallel tasks: `T002`, `T003`.
- Phase 2 parallel tasks: `T005`, `T006`.
- US1 parallel tasks: `T011`, `T013`.
- US2 parallel tasks: `T018`, `T019`.
- US3 parallel tasks: `T021`, `T024`.
- Polish parallel tasks: `T026` with validation tasks once implementation stabilizes.

## Parallel Example: User Story 1

```bash
# Run in parallel after T010 starts helper normalization contract:
Task T011: Implement pre-OTP authorization and active-status validation in app/(auth)/login/page.tsx
Task T013: Add role-home redirect selection helper usage in app/(auth)/login/page.tsx
```

## Parallel Example: User Story 2

```bash
# Run in parallel after T017 establishes provider-level expiry handling:
Task T018: Update protected route checks in components/RequireAuth.tsx
Task T019: Update logout flow to clear session metadata in components/DashboardShell.tsx
```

## Parallel Example: User Story 3

```bash
# Run in parallel after listener contract is defined:
Task T021: Add live team-user profile listener helpers in lib/firebase/users.ts
Task T024: Trigger auth context refresh after role/active updates in app/(dashboard)/users/page.tsx
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate US1 independently using the spec acceptance scenarios.
4. Demo/deploy MVP slice if ready.

### Incremental Delivery

1. Build foundation once (Phases 1-2).
2. Deliver US1, then US2, then US3 in priority order.
3. After each story, run targeted validation from `quickstart.md` before moving on.

### Parallel Team Strategy

1. Team aligns on Phases 1-2 together.
2. After foundation is done:
   - Developer A: US1
   - Developer B: US2
   - Developer C: US3
3. Merge story slices after independent validation.

---

## Notes

- All tasks use strict checklist format: checkbox, task ID, optional `[P]`, required `[US#]` for story phases, and concrete file path.
- This plan intentionally emphasizes tenant-safe and authorization-safe behavior per constitution gates.