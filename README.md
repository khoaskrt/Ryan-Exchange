# KineticVault UI Prototype

A scalable Next.js app for crypto exchange MVP flows, with Firebase Authentication + app-layer access gating.

## Screens

- `/login`: login screen matching the reference style.
- `/signup`: account creation screen in the same design system.
- `/dashboard`: trading terminal dashboard screen.
- `/support`: placeholder support page.

## Folder Structure

```text
app/
  api/auth/
    login/route.ts
    logout/route.ts
    me/route.ts
    signup/route.ts
  (auth)/
    layout.tsx
    login/page.tsx
    signup/page.tsx
  (app)/
    layout.tsx
    dashboard/page.tsx
  support/page.tsx
  layout.tsx
  page.tsx
  globals.css

components/
  brand/logo.tsx
  ui/primary-button.tsx
  ui/text-field.tsx

features/
  auth/components/
    auth-shell.tsx
    icons.tsx
    login-form.tsx
    signup-form.tsx
  dashboard/components/
    asset-card.tsx
    logout-button.tsx
    orders-table.tsx

lib/
  data/market.ts
  server/
    auth.ts
    prisma.ts
    validators.ts
  types/market.ts

prisma/
  schema.prisma
```

## Why this structure scales

- `app/` only handles routes and composition.
- `features/` groups feature-specific UI and logic.
- `components/ui` contains reusable primitives.
- `lib/types` and `lib/data` isolate shared contracts and data sources.
- `lib/server` isolates backend/auth logic from UI.

## Authentication (Firebase + App Layer)

- Firebase Web Auth (modular SDK) is used for:
  - `createUserWithEmailAndPassword`
  - `signInWithEmailAndPassword`
  - `sendEmailVerification`
  - `onAuthStateChanged`
- Firebase Admin SDK verifies ID token on backend.
- App backend stores business profile/status (`pending_email_verification`, `active`, ...).
- Backend mints app session cookie (`kv_session`) only when access is allowed.

## Run

```bash
npm install
npm run prisma:generate
# optional: npm run prisma:push
npm run dev
```

Set environment variables:

```bash
cp .env.example .env
```

Configure Firebase (following Firebase Web Auth start guide):

1. Create/select Firebase project.
2. In Firebase Console, add a Web App and copy `firebaseConfig`.
3. Enable Authentication provider: `Email/Password`.
4. Fill env values in `.env`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (use `\\n` for line breaks)

Open `http://localhost:3000`.

## Realtime Wallet Socket

- Socket server runs in the same process via `server.mjs`.
- Socket path: `/socket.io`.
- Client auth is based on existing session cookie `kv_session`.
- User joins private room `user:{userId}` after connect.

Set extra env for internal event bridge:

```bash
INTERNAL_SOCKET_SECRET=replace-with-strong-secret
```

Internal endpoint to push deposit updates into socket:

```bash
POST /api/internal/wallet/realtime/deposit
Header: x-internal-secret: <INTERNAL_SOCKET_SECRET>
```
