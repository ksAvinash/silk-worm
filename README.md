# Silk Worm Cultivator Manager

Next.js + Firebase app for silkworm cultivators to manage slot-based egg hatching, farmer worm bookings, inventory movement, and billing.

Multi-tenant model: each authenticated user is linked to a breeder workspace (`businessId`), and all data is isolated per workspace.

## Tech Stack
- Next.js (App Router, static export)
- Firebase Auth (Phone OTP)
- Firestore
- GitHub Pages (GitHub Actions)

## Local Setup
1. Install dependencies:
```bash
npm install
```
2. Create `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_BASE_PATH=
NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION=asia-south1
```
3. Run dev:
```bash
npm run dev
```

## Custom Claims (business + role)
- Callable function: `syncBusinessRoleClaim`
- Source: `functions/custom-claims`
- Claims set on authenticated user token: `businessId`, `role`

Deploy function dependencies and function:
```bash
cd functions/custom-claims && npm install
cd ../..
firebase deploy --only functions
```

## Deployment (GitHub Pages)
1. Push to `main`.
2. In GitHub repo settings:
- `Settings -> Pages -> Source: GitHub Actions`
- Add repository secrets for all `NEXT_PUBLIC_FIREBASE_*` variables.
3. Workflow file: `.github/workflows/deploy-gh-pages.yml`

`NEXT_PUBLIC_BASE_PATH` is set automatically in CI as `/<repo-name>`.

## Multi-Breeder Setup
- First OTP login auto-creates `businesses/{businessId}` (workspace).
- First OTP login auto-creates `users/{uid}` (role + tenant mapping).
- All operational collections are tenant-scoped via `businessId`.

Deploy Firestore rules from [firestore.rules](firestore.rules) before production use.

## Product Plan
See [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md) and [lib/firebase/schema.md](lib/firebase/schema.md).

## Engineering Governance
- Constitution: `.specify/memory/constitution.md`
- Speckit templates (plan/spec/tasks) in `.specify/templates/` are aligned to this
	constitution and should be used for new feature work.
