<!--
Sync Impact Report
- Version change: 1.0.0 -> 1.0.1
- Modified principles:
  - None (titles unchanged; wording clarified)
- Added sections:
  - None
- Removed sections:
  - None
- Templates requiring updates:
  - updated: .specify/templates/plan-template.md (already aligned)
  - updated: .specify/templates/spec-template.md (already aligned)
  - updated: .specify/templates/tasks-template.md (already aligned)
  - pending: .specify/templates/commands/*.md (directory not present in this repository)
  - updated: .github/prompts/*.md (checked; no outdated agent-specific references found)
- Follow-up TODOs:
  - None
-->

# Silk Worm Cultivator Manager Constitution

## Core Principles

### I. Tenant Isolation Is Mandatory
Every domain document that represents business operations MUST include `businessId`.
All reads, writes, and aggregations MUST be filtered by the authenticated user's
`businessId`. Firestore security rules MUST enforce tenant isolation even if client
code is bypassed.

Rationale: data isolation failures are business-critical and non-recoverable once
private records are exposed across breeders.

### II. Role-Based Authorization For Sensitive Actions
Authentication is required for all non-public routes. Authorization checks MUST
enforce role boundaries for financial and administrative actions (invoice/payment
management, business settings, and role assignment). Access control MUST be enforced
in both application logic and Firestore rules.

Rationale: role drift in operational software directly creates fraud and accidental
financial modification risk.

### III. Data Integrity Over Throughput
Booking, inventory, and billing flows MUST protect invariants before persisting data.
At minimum, implementations MUST prevent overbooking, enforce non-negative stock
movements where applicable, and preserve traceable status transitions for bookings and
invoice payments. Mutations that can violate invariants MUST fail fast with explicit
errors.

Rationale: operational trust depends on consistency between slots, dispatch records,
stock balances, and receivables.

### IV. Verification Gates Before Merge
Every merge candidate MUST pass `npm run typecheck` and `npm run lint`. Changes to
tenant scoping, role checks, booking calculations, inventory movement, or invoice
totals MUST include automated tests or a documented risk-based manual validation plan.
Unverified critical-path changes are prohibited.

Rationale: this codebase carries financial and allocation logic where regressions are
costly and often discovered too late by users.

### V. Auditability and Controlled Change
Financial and inventory-impacting operations MUST leave an auditable trail through
persisted records and timestamped metadata (`createdAt`/`updatedAt`). Feature changes
MUST be delivered in small, reviewable slices with explicit rollback considerations
for schema/rule adjustments.

Rationale: teams need to explain historical state changes and recover quickly from
bad deployments without data ambiguity.

## Operational Constraints

- Primary platform MUST remain Next.js App Router with Firebase Auth and Firestore.
- Auth role claims (`businessId`, `role`) MUST remain synchronized through the
  existing custom-claims function or an equivalent reviewed mechanism.
- Firestore rules changes MUST be version-reviewed with application code changes that
  depend on them.
- Tenant-unsafe collection queries (missing `businessId` scope) are prohibited.
- Static export and GitHub Pages deployment constraints MUST be considered for route
  and runtime feature choices.

## Delivery Workflow and Quality Gates

Work follows `spec -> plan -> tasks -> implement` with constitution compliance checked
at planning and before merge.

- Pull requests MUST call out tenant-isolation impact and authorization impact.
- Pull requests affecting booking, inventory, or billing logic MUST include clear
  validation evidence (tests or manual verification notes).
- Reviewers MUST block merges when constitution gates are not met.

## Governance

This constitution supersedes conflicting local practices for engineering delivery in
this repository.

Amendments require:
- A pull request that includes the proposed constitution diff.
- A short rationale describing impact on current and future features.
- Updates to dependent templates and guidance docs in the same change.

Versioning policy (semantic versioning):
- MAJOR: removal or incompatible redefinition of a principle/governance rule.
- MINOR: addition of a principle/section or materially expanded mandatory guidance.
- PATCH: clarifications, wording improvements, and non-semantic edits.

Compliance review expectations:
- Every feature plan MUST include a constitution check.
- Every task list MUST map required principle-driven work where applicable.
- Reviewers and implementers share accountability for enforcement.

**Version**: 1.0.1 | **Ratified**: 2026-03-07 | **Last Amended**: 2026-03-07
