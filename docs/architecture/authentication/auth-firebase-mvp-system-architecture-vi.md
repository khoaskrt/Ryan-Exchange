# System Architecture - Authentication MVP with Firebase (Ryan Exchange)

Reference docs:

- `docs/product/frs/frs-auth-01-firebase-auth-mvp-vi.md`
- `docs/system/srs/srs-auth-01-firebase-auth-mvp-vi.md`

## 1. Architecture Goal

Xây dựng auth architecture MVP có tốc độ triển khai nhanh, tách bạch rõ identity và business access:

- Firebase xác thực user identity.
- Ryan Exchange backend quyết định quyền vào sản phẩm dựa trên app status.

---

## 2. High-level Components

## 2.1 Client Layer (Next.js Web)

- Auth UI: signup/login/verification-required.
- Firebase Web SDK:
  - `createUserWithEmailAndPassword`
  - `signInWithEmailAndPassword`
  - `sendEmailVerification`
  - `signOut`
  - auth state persistence
- Guard hook: gọi `GET /api/auth/status` trước khi vào protected area.

## 2.2 Backend Layer (Next.js API)

- Token verification module (Firebase Admin SDK).
- App User service:
  - register profile
  - resolve auth status
  - transition `pending_email_verification -> active`
- Auth orchestration endpoints:
  - `/api/app-users/register-profile`
  - `/api/auth/status`
  - `/api/auth/logout`

## 2.3 Data Layer (Prisma + DB)

- `User` (hoặc `AppUser`) lưu business profile và app lifecycle status.
- Mapping key: `firebaseUid` unique.

## 2.4 External Identity Provider

- Firebase Authentication (email/password + email verification).

---

## 3. Trust Boundaries

Boundary A: Browser <-> Firebase

- Xử lý credential và auth state client-side theo Firebase SDK.

Boundary B: Browser <-> Ryan Exchange Backend

- Chỉ truyền Firebase ID token qua `Authorization: Bearer`.
- Backend luôn verify token trước khi dùng.

Boundary C: Backend <-> Database

- Backend là thành phần duy nhất được phép mutate app user status.

Core rule:

- Firebase khẳng định user là ai.
- Backend khẳng định user được phép làm gì trong product.

---

## 4. Canonical Auth Decision Model

Access vào exchange app được phép khi đồng thời đúng 3 điều kiện:

1. `isAuthenticated = true`
2. `emailVerified = true`
3. `appStatus = active`

Nếu 1 trong 3 sai, FE phải route user sang màn hình phù hợp (đặc biệt verification-required cho case email chưa verify).

---

## 5. Sequence Architecture

## 5.1 Signup + Verification Pending

1. User submit signup form trên FE.
2. FE gọi Firebase tạo account.
3. FE trigger gửi email verification.
4. FE lấy ID token và gọi `register-profile`.
5. BE verify ID token, upsert app user với `pending_email_verification`.
6. FE chuyển user sang verification-required page.

## 5.2 Login + Access Gate

1. FE login qua Firebase.
2. FE lấy fresh ID token.
3. FE gọi `GET /api/auth/status`.
4. BE verify token, đọc app profile, evaluate policy.
5. BE trả `access.allowed`.
6. FE route theo decision.

## 5.3 Verify Completion Sync

1. User verify email qua link inbox.
2. FE reload Firebase user để refresh `emailVerified`.
3. FE gọi lại `auth/status`.
4. BE thấy verified + pending -> update `active`.
5. FE vào protected app area.

---

## 6. API Architecture Contract

## 6.1 `POST /api/app-users/register-profile`

- AuthN: Firebase ID token (required).
- AuthZ: user tự thao tác profile của chính mình.
- Behavior: idempotent create/update minimal profile.

## 6.2 `GET /api/auth/status`

- AuthN: Firebase ID token (required).
- Behavior:
  - verify token
  - load app profile
  - evaluate access policy
  - trả result chuẩn cho FE guard.

## 6.3 `POST /api/auth/logout`

- Đồng bộ app-level cleanup (nếu có session cookie/app cache).
- FE vẫn bắt buộc signOut Firebase.

---

## 7. Data Architecture

## 7.1 Proposed Prisma Fields (on User/AppUser)

- `firebaseUid String @unique`
- `appStatus AppUserStatus @default(pending_email_verification)`
- `country String`
- `referralCode String?`
- `createdAt DateTime`
- `updatedAt DateTime`

## 7.2 Status Transition Policy

Allowed transitions MVP:

- `pending_email_verification -> active`

Guardrails:

- Không được auto-activate nếu `emailVerified=false`.
- Transition phải có audit event.

---

## 8. Security Architecture

- Token verification bắt buộc ở backend với Firebase Admin.
- Không dùng identity fields từ client body nếu trái token claim.
- Error responses generic, tránh enumeration.
- Mọi endpoint protected cần middleware/utility verify token nhất quán.
- Audit logs không chứa secret hoặc sensitive token.

---

## 9. Operational Architecture

## 9.1 Environment Variables

Frontend:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Backend:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## 9.2 Failure Modes

- Firebase SDK/network unavailable -> show retry-safe error.
- Invalid/expired token -> force re-auth.
- Missing app profile -> call register-profile or show recoverable state.

## 9.3 Observability

- Structured logs cho signup/login/status gate.
- Correlation id xuyên FE request -> BE logs.
- Dashboard metric đề xuất:
  - signup success rate
  - verification completion rate
  - unverified gate block rate
  - login success/failure rate

---

## 10. Route Guard Architecture (Frontend)

Guard levels:

- Public routes: `/login`, `/signup`, `/verify-email`
- Protected routes: `/dashboard`, `/markets`, `/wallet`

Guard algorithm:

1. Check Firebase auth state.
2. Nếu unauthenticated -> redirect `/login`.
3. Nếu authenticated -> call `/api/auth/status`.
4. Nếu `allowed=true` -> cho vào route protected.
5. Nếu `EMAIL_VERIFICATION_REQUIRED` -> route `/verify-email`.
6. Nếu business blocked (`restricted/suspended`) -> route support/blocked page.

---

## 11. Rollout Plan

Phase A (Core):

- Firebase setup + SDK integration.
- register-profile + auth/status APIs.
- verification-required page + guard.

Phase B (Stability):

- Resend verification (optional).
- Better error telemetry.
- QA regression suite automation.

Phase C (Future Security):

- TOTP MFA integration.
- Session hardening.
- Device/session management.

---

## 12. Subagent Execution Map

## 12.1 Backend Subagent Owner Scope

- `lib/server/auth/*` new Firebase verifier + status service.
- `app/api/app-users/register-profile/route.ts`
- `app/api/auth/status/route.ts`
- `app/api/auth/logout/route.ts` alignment.
- Prisma schema migration for app status + firebase uid.

## 12.2 Frontend Subagent Owner Scope

- `features/auth/*` forms migrate to Firebase flows.
- Verification required screen/page.
- Route guards in app layouts.
- API client integration for auth status.

## 12.3 QA Subagent Owner Scope

- Test cases theo acceptance matrix FRS/SRS.
- E2E automation for verify gate and protected route bypass attempts.

