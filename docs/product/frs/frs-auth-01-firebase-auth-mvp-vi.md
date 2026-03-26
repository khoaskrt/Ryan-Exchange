# FRS-AUTH-01-FB: Ryan Exchange Authentication MVP (Firebase)

Role: Business Analyst  
Type: FRS  
Source of truth: `PRD-AUTH-01`

## 1. Document Control

| Field | Value |
| --- | --- |
| Project Name | Ryan Exchange |
| Document Title | Functional Requirements Specification - Authentication MVP with Firebase |
| Document ID | FRS-AUTH-01-FB |
| Version | v1.0 |
| Status | Draft for Execution |
| Language | Vietnamese |
| Product Owner | Khoa Do |
| Technical Owner | Toan Vo |
| Stakeholders | CEO, PM, FE, BE, QA |

---

## 2. Mục tiêu tài liệu

Tài liệu này chuẩn hóa yêu cầu chức năng cho module Authentication MVP theo quyết định sản phẩm: dùng Firebase Authentication cho identity primitives, còn Ryan Exchange backend quản lý business profile và access gating.

Mục tiêu là để đội FE/BE/QA có cùng một chuẩn thực thi, tránh mơ hồ khi triển khai signup, login, email verification gate, session, và route guard.

---

## 3. Phạm vi

### 3.1 In Scope

- Đăng ký bằng email/password qua Firebase Auth.
- Đăng nhập bằng email/password qua Firebase Auth.
- Bắt buộc email verification trước khi vào khu vực exchange chính.
- Tạo bản ghi app user nội bộ sau khi signup thành công.
- Quản lý app status tối thiểu: `pending_email_verification`, `active`.
- FE route guard theo auth + verification + app status.
- Logout.
- Ghi nhận audit/event logging ở app layer.

### 3.2 Out of Scope

- Google Authenticator/TOTP MFA.
- SMS OTP.
- SSO/social login active.
- Device trust, backup codes.
- Admin auth console.
- KYC flow tích hợp trực tiếp trong auth MVP.

---

## 4. Nguyên tắc nghiệp vụ cốt lõi

- Firebase là source of truth cho authentication identity.
- Ryan Exchange app là source of truth cho business lifecycle và quyền vào sản phẩm.
- User chưa verify email thì không được vào exchange area.
- Vietnam-only onboarding được enforce ở app layer.

---

## 5. Mô hình trạng thái người dùng

### 5.1 Identity Layer (Firebase)

- `authenticated` / `unauthenticated`
- `emailVerified = true | false`

### 5.2 Application Layer (Ryan Exchange)

- `pending_email_verification`
- `active`

### 5.3 Luật chuyển trạng thái

- Sau signup: tạo app user với `pending_email_verification`.
- Khi Firebase xác nhận email đã verify: app user chuyển sang `active`.

---

## 6. User Flows chức năng

## 6.1 Sign Up Flow

1. User chọn country (v1 chỉ chấp nhận `Vietnam`).
2. User nhập full name, email, password, referral (optional).
3. FE gọi Firebase create user email/password.
4. FE gửi Firebase ID token lên backend `register-profile`.
5. Backend verify ID token, tạo app user `pending_email_verification`.
6. FE hiển thị màn hình Verification Required.

## 6.2 Login Flow

1. User nhập email/password.
2. FE đăng nhập qua Firebase.
3. FE/backend kiểm tra `emailVerified` và app status.
4. Nếu chưa verify: điều hướng đến Verification Required.
5. Nếu đã verify và app status `active`: cho vào app area.

## 6.3 Verification Gate Flow

1. User ở màn hình Verification Required.
2. User bấm refresh status hoặc login lại sau khi verify email.
3. Hệ thống đồng bộ trạng thái và mở quyền khi đủ điều kiện.

## 6.4 Logout Flow

1. User bấm logout.
2. FE signOut Firebase.
3. Backend clear app session (nếu có session app-side).
4. Điều hướng về login/public auth screen.

---

## 7. Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-AUTH-001 | Hệ thống cho phép signup bằng email/password qua Firebase Auth. |
| FR-AUTH-002 | Hệ thống thu thập full name, email, password, country khi signup. |
| FR-AUTH-003 | Hệ thống enforce Vietnam-only onboarding ở app layer. |
| FR-AUTH-004 | Sau signup thành công ở Firebase, backend bắt buộc tạo app user profile nội bộ. |
| FR-AUTH-005 | App user mặc định có trạng thái `pending_email_verification` sau signup. |
| FR-AUTH-006 | Hệ thống yêu cầu verify email trước khi cấp quyền vào exchange area. |
| FR-AUTH-007 | User chưa verify email bị chặn vào app area và chuyển về Verification Required. |
| FR-AUTH-008 | Hệ thống cho phép login email/password qua Firebase Auth. |
| FR-AUTH-009 | Hệ thống kiểm tra đồng thời `emailVerified` và app status trước khi grant access. |
| FR-AUTH-010 | Chỉ user `emailVerified=true` và `app_status=active` mới được vào app area. |
| FR-AUTH-011 | Hệ thống hỗ trợ logout và kết thúc authenticated experience. |
| FR-AUTH-012 | FE phải implement route guards dựa trên auth + verify + app status. |
| FR-AUTH-013 | Hệ thống ghi nhận event audit tối thiểu: signup attempt/success/failure, login attempt/success/failure, verify gate. |
| FR-AUTH-014 | Error message phải rõ ràng với user nhưng không lộ chi tiết nhạy cảm. |
| FR-AUTH-015 | Kiến trúc phải future-ready cho TOTP MFA nhưng chưa implement ở MVP. |

---

## 8. Quy tắc nghiệp vụ (Business Rules)

| Rule ID | Rule |
| --- | --- |
| BR-AUTH-001 | Email/password là phương thức auth active duy nhất ở MVP. |
| BR-AUTH-002 | Email verification là điều kiện bắt buộc để truy cập core exchange experience. |
| BR-AUTH-003 | Firebase không quyết định quyền business access, chỉ xác thực identity. |
| BR-AUTH-004 | App profile nội bộ là bắt buộc và không được bỏ qua. |
| BR-AUTH-005 | Country restriction (Vietnam-only) nằm ở app business logic. |

---

## 9. UX and Screen Requirements

### 9.1 Sign Up Screen

- Step 1: country selection.
- Step 2: full name, email, password, referral (optional).
- CTA tạo tài khoản.
- Sau signup thành công: chuyển sang Verification Required, không vào dashboard ngay.

### 9.2 Verification Required Screen

Bắt buộc có các nội dung:

- Tài khoản đã tạo thành công.
- Email verification còn pending.
- Hướng dẫn user kiểm tra inbox.
- CTA refresh status.
- CTA resend verification (nếu bật trong scope sprint).

### 9.3 Login Screen

- Email.
- Password.
- Login CTA.
- Link Sign Up.
- Placeholder Forgot Password (optional visible, chưa active).

---

## 10. API-level Functional Expectations

- `POST /app-users/register-profile`
- `GET /auth/status`
- `POST /auth/logout`
- `POST /auth/resend-verification` (optional)

Nguyên tắc: FE authenticate với Firebase, backend verify Firebase ID token để map `firebase_uid` với app user profile.

---

## 11. Non-Functional Requirements

- NFR-AUTH-001: Luồng auth đơn giản, đủ nhanh để team nhỏ triển khai.
- NFR-AUTH-002: Tách bạch identity vs business state để dễ mở rộng compliance.
- NFR-AUTH-003: Chặn nhất quán unverified user khỏi app area.
- NFR-AUTH-004: Session restore vẫn phải áp dụng guard logic nhất quán.
- NFR-AUTH-005: Logging/audit đủ để QA và ops truy vết issue auth.

---

## 12. Acceptance Criteria (MVP)

| AC ID | Criteria |
| --- | --- |
| AC-AUTH-001 | Signup hợp lệ tạo Firebase account và app user profile thành công. |
| AC-AUTH-002 | App user mới có status `pending_email_verification`. |
| AC-AUTH-003 | User chưa verify bị chặn khỏi app area. |
| AC-AUTH-004 | Sau khi verify email, hệ thống đồng bộ và cho phép chuyển `active`. |
| AC-AUTH-005 | Login thành công chỉ khi đủ điều kiện verified + active. |
| AC-AUTH-006 | Sai credential trả lỗi auth thân thiện, không leak nội bộ. |

---

## 13. Work Packages cho Subagents

### FE Subagent

- Tích hợp Firebase web SDK cho signup/login/logout.
- Tạo Verification Required screen.
- Implement route guards theo `auth + emailVerified + appStatus`.
- Tích hợp API `register-profile`, `auth/status`, `logout`.

### BE Subagent

- Verify Firebase ID token bằng Firebase Admin.
- Tạo API app-user profile + auth status.
- Quản lý app status transition `pending_email_verification -> active`.
- Chuẩn hóa error contract + audit logs.

### QA Subagent

- Viết test matrix cho signup/login/verification gate/logout.
- Cover happy path + negative path + refresh/persistence path.
- Xác nhận route guards không bypass được.

