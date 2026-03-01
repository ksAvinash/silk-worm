# Silk Worm Cultivator Platform Plan

## Primary Users
- Cultivator admin (owner / manager)
- Staff operator (booking + dispatch only)

## Core Workflow
1. Create egg/hatch slots (weekly by default, customizable).
2. Add farmers and their profile.
3. Record farmer bookings per slot (qty booked).
4. Track inventory movement (eggs -> hatched worms -> sold/wastage).
5. Generate invoice from bookings.
6. Collect and record payments.
7. Review reports and dues.

## Required Pages

### Public/Auth
- `/` Landing + app overview.
- `/login` Phone OTP authentication (Firebase).

### App Pages
- `/dashboard`
Purpose: KPI overview.
Cards: active slots, total capacity, total booked, available worms, pending dues, weekly sales.

- `/slots`
Purpose: Slot planning + capacity management.
Features:
- Create/edit slot (name, start, hatch date, egg capacity, expected worm capacity).
- Slot frequency template (7 days default; configurable).
- Live capacity view: total/booked/available.

- `/bookings`
Purpose: Farmer booking against slot.
Features:
- Select slot -> list bookings.
- Add booking (farmer, qty, rate, expected dispatch date).
- Prevent overbooking (qty <= available).
- Booking status: booked/dispatched/cancelled.

- `/inventory`
Purpose: Stock and movement ledger.
Features:
- Current stock summary by slot.
- Ledger entries: egg added, hatched, sold, wastage, adjustment.
- Daily stock reconciliation.

- `/billing`
Purpose: Invoice and dues management.
Features:
- Generate invoice from one/many bookings.
- Track paid/partial/pending/overdue.
- Record payment method and reference.
- Printable invoice (A4 simple format).

- `/farmers`
Purpose: Farmer master records.
Features:
- Create/edit farmer profile.
- Phone, village, notes, credit limit.
- View booking and payment history per farmer.

- `/reports`
Purpose: Business insights.
Reports:
- Slot utilization % (booked/capacity).
- Weekly/monthly sales.
- Farmer outstanding dues.
- Wastage trend.

- `/settings`
Purpose: Business configuration.
Features:
- Business profile and invoice prefix.
- Slot frequency default.
- Role/permission matrix.

## Firebase Architecture
- Auth: Firebase Phone OTP.
- DB: Firestore.
- Optional: Cloud Functions for invoice numbering, PDF generation, and scheduled reminders.
- Optional: Firebase Storage for invoice PDFs.

## Multi-Breeder Tenancy
- Tenant key: `businessId`.
- On first successful OTP login, app auto-creates `businesses/{businessId}` for that breeder.
- On first successful OTP login, app auto-creates `users/{uid}` mapped to that `businessId` with role `owner`.
- Every domain collection (`slots`, `farmers`, `bookings`, `inventoryLedger`, `invoices`, `payments`) includes `businessId`.
- App queries and writes are always filtered/scoped by logged-in user's `businessId`.
- Firestore rules enforce same-tenant isolation.

## Security Rules (High-Level)
- Every document must include `businessId`.
- User can only read/write docs where `request.auth.uid` belongs to same `businessId`.
- Financial docs (invoices/payments) writable only by admin/manager roles.

## Suggested Milestones
1. Auth + layout + farmer + slot CRUD.
2. Booking + overbooking guard + slot availability sync.
3. Inventory ledger + dashboard metrics.
4. Billing + payments + report pages.
5. Security rules + role-based access + export/print.
