# SRS-AUTH-01-FB: Software Requirements Specification - Firebase Authentication MVP

Role: System Analyst / Technical Architect  
Type: SRS  
Upstream docs: `PRD-AUTH-01`, `FRS-AUTH-01-FB`

## 1. Document Control

| Field | Value |
| --- | --- |
| Project Name | Ryan Exchange |
| Document ID | SRS-AUTH-01-FB |
| Version | v1.0 |
| Status | Draft for Execution |
| Authoring Team | Architecture + Backend + Frontend |
| Last Updated | 2026-03-25 |

---

## 2. Mục tiêu kỹ thuật

Đặc tả yêu cầu phần mềm để triển khai authentication MVP theo mô hình:

- Firebase Auth quản lý identity primitives.
- Ryan Exchange backend quản lý app profile và business access gating.

Tài liệu này là base implementation contract cho subagents FE/BE/QA.

---

## 3. System Context

## 3.1 Logical Context

- Client Web (Next.js) dùng Firebase Web SDK cho signup/login/logout và auth state.
- Backend API (Next.js Route Handlers) dùng Firebase Admin SDK để verify ID token.
- Database (Prisma) lưu app user profile và lifecycle state.

## 3.2 Ownership Boundary

- Firebase: xác thực danh tính, email verification status.
- App backend: profile nội bộ, country policy, app status, quyền vào product.

---

## 4. Functional Decomposition

## 4.1 Identity Functions (Firebase)

- Create account email/password.
- Login email/password.
- Logout.
- Send email verification.
- Read auth state và emailVerified flag.

## 4.2 App-layer Functions (Ryan Exchange)

- Tạo app user profile khi signup thành công.
- Đọc auth status tổng hợp (`isAuthenticated`, `emailVerified`, `appStatus`).
- Đồng bộ app status từ `pending_email_verification` sang `active`.
- Country gate Vietnam-only.

---

## 5. Data Model Requirements

## 5.1 App User Table (minimum)

| Field | Type | Constraint | Description |
| --- | --- | --- | --- |
| id | String/UUID | PK | Internal app user id |
| firebaseUid | String | Unique, Not Null | Mapping tới Firebase user |
| fullName | String | Not Null | User full name |
| email | String | Unique, Not Null | Email canonicalized |
| country | String | Not Null | MVP must be `Vietnam` |
| referralCode | String? | Nullable | Optional |
| appStatus | Enum | Not Null | `pending_email_verification`, `active`, `restricted`, `suspended` |
| createdAt | DateTime | Not Null | Created timestamp |
| updatedAt | DateTime | Not Null | Updated timestamp |

## 5.2 Status Enum

`AppUserStatus`:

- `pending_email_verification`
- `active`
- `restricted` (future use)
- `suspended` (future use)

MVP dùng bắt buộc 2 trạng thái đầu.

---

## 6. API Contracts (Implementation-level)

## 6.1 `POST /api/app-users/register-profile`

Purpose: tạo app user profile sau khi Firebase signup/login thành công.

Request headers:

- `Authorization: Bearer <firebase_id_token>`

Request body:

```json
{
  "fullName": "Nguyen Van A",
  "country": "Vietnam",
  "referralCode": "RYAN2026"
}
```

Success (`201` for first create, `200` for idempotent exists):

```json
{
  "success": true,
  "data": {
    "appUserId": "cuid_xxx",
    "firebaseUid": "firebase_uid",
    "email": "user@example.com",
    "appStatus": "pending_email_verification"
  }
}
```

Failure codes:

- `AUTH_UNAUTHORIZED` (missing/invalid token)
- `AUTH_COUNTRY_NOT_SUPPORTED`
- `AUTH_INVALID_REQUEST`
- `AUTH_SERVER_ERROR`

## 6.2 `GET /api/auth/status`

Purpose: trả trạng thái hợp nhất cho route guard.

Request headers:

- `Authorization: Bearer <firebase_id_token>`

Success (`200`):

```json
{
  "success": true,
  "data": {
    "isAuthenticated": true,
    "firebaseUid": "firebase_uid",
    "emailVerified": false,
    "appStatus": "pending_email_verification",
    "access": {
      "allowed": false,
      "reason": "EMAIL_VERIFICATION_REQUIRED"
    }
  }
}
```

Access allowed when:

- `isAuthenticated=true`
- `emailVerified=true`
- `appStatus=active`

## 6.3 `POST /api/auth/logout`

Purpose: app-level logout coordination.

Success (`200`):

```json
{
  "success": true,
  "message": "Logged out"
}
```

Note: FE vẫn phải gọi Firebase `signOut()`.

## 6.4 Optional `POST /api/auth/resend-verification`

Purpose: trigger resend verification email via client flow/secure proxy strategy.

MVP có thể defer endpoint này nếu FE xử lý trực tiếp từ Firebase client.

---

## 7. Sequence Requirements

## 7.1 Sign Up + Profile Creation

1. FE gọi Firebase `createUserWithEmailAndPassword`.
2. FE gọi Firebase `sendEmailVerification`.
3. FE lấy ID token hiện tại từ Firebase user.
4. FE gọi `POST /api/app-users/register-profile` kèm bearer token.
5. BE verify token bằng Firebase Admin SDK.
6. BE upsert app user với `pending_email_verification`.
7. FE chuyển sang Verification Required page.

## 7.2 Login + Access Gate

1. FE gọi Firebase `signInWithEmailAndPassword`.
2. FE lấy fresh ID token.
3. FE gọi `GET /api/auth/status`.
4. BE verify token, load app user, evaluate access.
5. FE route theo response:
   - `allowed=true` -> vào app.
   - `allowed=false` với verify pending -> về verification required.

## 7.3 Verification Sync

1. User click link verify email từ inbox.
2. FE refresh auth user (`reload`) để lấy `emailVerified` mới.
3. FE gọi lại `GET /api/auth/status`.
4. BE nếu `emailVerified=true` và app status pending -> update `active`.
5. FE vào app area.

---

## 8. Validation & Error Handling

## 8.1 Input Validation

- `country` bắt buộc bằng `Vietnam` ở MVP.
- `fullName` non-empty, length 2..100.
- `referralCode` optional, max length 50.

## 8.2 Error Contract (normalized)

```json
{
  "success": false,
  "errorCode": "AUTH_INVALID_REQUEST",
  "message": "Validation failed"
}
```

Error code baseline:

- `AUTH_INVALID_REQUEST`
- `AUTH_UNAUTHORIZED`
- `AUTH_COUNTRY_NOT_SUPPORTED`
- `AUTH_PROFILE_NOT_FOUND`
- `AUTH_ACCESS_DENIED`
- `AUTH_SERVER_ERROR`

---

## 9. Security Requirements

- Firebase ID token phải được verify ở backend trước mọi thao tác profile/auth-status.
- Không tin cậy các trường identity từ client body (`email`, `uid`), chỉ lấy từ token đã verify.
- Response lỗi không leak thông tin nhạy cảm.
- Logging có mask/không ghi plaintext secret.
- HTTPS bắt buộc ở môi trường deploy.

---

## 10. Observability & Audit

Audit events tối thiểu:

- `SIGNUP_ATTEMPT`, `SIGNUP_SUCCESS`, `SIGNUP_FAILURE`
- `LOGIN_ATTEMPT`, `LOGIN_SUCCESS`, `LOGIN_FAILURE`
- `VERIFICATION_GATE_BLOCKED`
- `PROFILE_CREATED`
- `PROFILE_STATUS_UPDATED_ACTIVE`

Log field tối thiểu:

- `timestamp`
- `eventType`
- `status`
- `firebaseUid` (nếu có)
- `email` (nếu có)
- `errorCode` (nếu thất bại)

---

## 11. Non-Functional Requirements

- Availability target MVP: best-effort, không hard SLA.
- P95 auth status API < 300ms (local region target).
- Idempotent behavior cho register-profile.
- Route guard nhất quán khi refresh page hoặc restore session.

---

## 12. Traceability Matrix (FRS -> SRS)

| FRS ID | SRS Section | Implementation Target |
| --- | --- | --- |
| FR-AUTH-004 | 6.1, 7.1 | BE register-profile API |
| FR-AUTH-006,007 | 6.2, 7.2 | Access gate logic |
| FR-AUTH-010 | 6.2 | Access decision policy |
| FR-AUTH-012 | 7.2, 7.3 | FE guards + status refresh |
| FR-AUTH-013 | 10 | Audit logging |
| FR-AUTH-015 | 14 | Future-ready MFA extension |

---

## 13. Execution Backlog for Cursor Subagents

## 13.1 Backend Subagent Tasks

- Add schema fields: `firebaseUid`, `appStatus` enum, migration.
- Implement Firebase Admin bootstrap and token verifier utility.
- Implement `register-profile`, `auth/status`, `auth/logout` routes.
- Implement service layer for profile create/upsert/status transition.
- Add unit tests cho access policy và transition logic.

## 13.2 Frontend Subagent Tasks

- Add Firebase client bootstrap.
- Refactor signup/login forms dùng Firebase methods.
- Build verification required page + actions (`refresh`, optional resend).
- Implement app-level guard hook based on `GET /api/auth/status`.
- Add protected route behavior for app layouts.

## 13.3 QA Subagent Tasks

- Build E2E suite:
  - signup -> pending verify
  - unverified login blocked
  - verified login allowed
  - logout
- Add negative tests: invalid token, no profile, unsupported country.

---

## 14. Extensibility Notes (Future TOTP)

Để sẵn sàng cho Phase 3 MFA:

- Giữ access policy dưới dạng composable policy function.
- Tách `identity_verified` và `app_access_ready` thành các điều kiện độc lập.
- Dự phòng thêm field `mfaEnabled`, `mfaRequired` ở app status response (không active ở MVP).

