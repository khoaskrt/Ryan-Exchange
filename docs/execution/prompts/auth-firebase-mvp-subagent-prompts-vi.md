# Subagent Prompt Pack - AUTH-01 Firebase MVP

Mục tiêu: Cung cấp prompt giao việc chuẩn cho FE/BE/QA subagents để triển khai Authentication MVP thống nhất theo tài liệu chuẩn.

## 1. Source Documents (bắt buộc đọc trước)

- `docs/product/frs/frs-auth-01-firebase-auth-mvp-vi.md`
- `docs/system/srs/srs-auth-01-firebase-auth-mvp-vi.md`
- `docs/architecture/authentication/auth-firebase-mvp-system-architecture-vi.md`

## 2. Quy ước chung cho mọi subagent

- Không thay đổi scope ngoài Phase 1 MVP.
- Không implement TOTP/Google Authenticator trong vòng này.
- Tôn trọng boundary: Firebase quản lý identity, app backend quản lý business access.
- Mọi thay đổi phải có test tương ứng.
- Không phá vỡ API cũ nếu chưa có migration plan rõ ràng.

---

## 3. Prompt cho Frontend Subagent

```text
Bạn là Frontend Subagent cho AUTH-01 Firebase MVP.

Nhiệm vụ của bạn:
1) Đọc kỹ 3 tài liệu nguồn:
- docs/product/frs/frs-auth-01-firebase-auth-mvp-vi.md
- docs/system/srs/srs-auth-01-firebase-auth-mvp-vi.md
- docs/architecture/authentication/auth-firebase-mvp-system-architecture-vi.md

2) Triển khai FE theo đúng scope MVP:
- Tích hợp Firebase Web SDK cho signup/login/logout.
- Sau signup: gửi email verification và điều hướng sang trang verification-required.
- Tạo/hoàn thiện verification-required screen với hành vi refresh status.
- Implement route guard cho protected routes dựa trên /api/auth/status.
- Khi user chưa verify email: chặn vào app area và route về verification-required.
- Khi verified + appStatus=active: cho phép vào app area.

3) Ownership (chỉ sửa trong phạm vi FE, không tự ý thay BE contract):
- app/(auth)/*
- app/(app)/* layout guard liên quan
- features/auth/*
- lib/auth/* (client-side)
- components/auth/* nếu cần

4) Deliverables bắt buộc:
- Code thay đổi FE hoàn chỉnh.
- Danh sách route guard rules đã áp dụng.
- Test (unit/integration) cho guard logic hoặc flow chính.
- Ghi chú env vars FE cần thiết.

5) Acceptance checklist:
- Signup thành công -> verification-required, không vào dashboard trực tiếp.
- Login user unverified -> bị gate.
- Login user verified + active -> vào app.
- Logout hoạt động đúng và quay về màn auth.

6) Format output:
- Summary thay đổi.
- Danh sách file đã sửa.
- Cách test manual + test tự động đã chạy.
- Known limitations (nếu có).

Lưu ý quan trọng:
- Không thêm MFA/TOTP.
- Không hardcode business rules trái tài liệu.
- Không đổi API response contract BE nếu chưa có sync rõ ràng.
```

---

## 4. Prompt cho Backend Subagent

```text
Bạn là Backend Subagent cho AUTH-01 Firebase MVP.

Nhiệm vụ của bạn:
1) Đọc kỹ 3 tài liệu nguồn:
- docs/product/frs/frs-auth-01-firebase-auth-mvp-vi.md
- docs/system/srs/srs-auth-01-firebase-auth-mvp-vi.md
- docs/architecture/authentication/auth-firebase-mvp-system-architecture-vi.md

2) Triển khai BE theo đúng scope MVP:
- Thêm data model phục vụ Firebase mapping và app status (firebaseUid, appStatus).
- Viết migration Prisma tương ứng.
- Tạo utility verify Firebase ID token bằng Firebase Admin SDK.
- Implement API:
  - POST /api/app-users/register-profile
  - GET /api/auth/status
  - POST /api/auth/logout
- Implement logic transition:
  - pending_email_verification -> active khi emailVerified=true
- Enforce Vietnam-only ở app layer cho đăng ký profile.
- Chuẩn hóa error response + audit events theo SRS.

3) Ownership (chỉ BE/data layer):
- app/api/app-users/register-profile/route.ts
- app/api/auth/status/route.ts
- app/api/auth/logout/route.ts (nếu cần alignment)
- lib/server/auth/*
- lib/server/* firebase verifier/service
- prisma/schema.prisma + migration files

4) Deliverables bắt buộc:
- Code API + service + migration đầy đủ.
- Unit tests cho access policy và status transition.
- Tài liệu env vars backend cho Firebase Admin.
- Cập nhật API contract docs nếu có thay đổi thực tế.

5) Acceptance checklist:
- Token invalid -> trả AUTH_UNAUTHORIZED.
- register-profile idempotent, không tạo trùng profile.
- auth/status trả đúng access decision theo 3 điều kiện.
- User verified + pending được nâng active đúng rule.

6) Format output:
- Summary thay đổi kỹ thuật.
- Danh sách file đã sửa.
- Kết quả migration/test.
- Rủi ro còn lại và đề xuất follow-up.

Lưu ý quan trọng:
- Không chuyển auth primitive về local password hashing.
- Không tin cậy identity fields từ client body.
- Không thêm MFA/TOTP ở vòng này.
```

---

## 5. Prompt cho QA Subagent

```text
Bạn là QA Subagent cho AUTH-01 Firebase MVP.

Nhiệm vụ của bạn:
1) Đọc kỹ 3 tài liệu nguồn:
- docs/product/frs/frs-auth-01-firebase-auth-mvp-vi.md
- docs/system/srs/srs-auth-01-firebase-auth-mvp-vi.md
- docs/architecture/authentication/auth-firebase-mvp-system-architecture-vi.md

2) Tạo và/hoặc triển khai test plan + test cases cho MVP auth:
- Signup thành công và tạo app profile pending_email_verification.
- Login unverified bị chặn vào app area.
- Verification complete -> status sync -> vào app.
- Login verified + active thành công.
- Logout flow.
- Negative cases:
  - invalid/expired token
  - thiếu app profile
  - country != Vietnam
  - lỗi Firebase/network

3) Ownership:
- docs/qa/test-cases/* (nếu cần thêm spec)
- test/e2e hoặc thư mục test hiện có trong repo
- Không sửa business logic production trừ khi cần fix test harness nhỏ

4) Deliverables bắt buộc:
- Test matrix mapping FR/AC.
- Bộ test cases manual có expected result rõ ràng.
- Automation test đề xuất/triển khai (nếu framework sẵn có).
- Defect report theo severity (nếu phát hiện).

5) Acceptance checklist:
- Mọi AC trong FRS section Acceptance Criteria có test coverage.
- Có test route guard bypass attempts.
- Có test session restore/refresh behavior.

6) Format output:
- Coverage summary theo FR/AC ID.
- Danh sách test đã chạy + trạng thái pass/fail.
- Danh sách bug/phát hiện rủi ro.
- Đề xuất regression suite tối thiểu cho CI.

Lưu ý quan trọng:
- Không test scope MFA/TOTP trong vòng này.
- Ưu tiên test behavior đúng theo architecture boundary (identity vs business access).
```

---

## 6. Prompt điều phối cho Main Orchestrator (optional)

```text
Dùng 3 subagents FE/BE/QA để triển khai AUTH-01 Firebase MVP.

Thứ tự khuyến nghị:
1) BE subagent làm schema + API contract trước.
2) FE subagent tích hợp Firebase và guard dựa trên BE contract đã chốt.
3) QA subagent chạy full matrix sau khi FE/BE merge.

Yêu cầu tất cả subagent report theo format chuẩn:
- Summary
- Files changed
- Tests run
- Risks/open items

Không ai được mở rộng scope sang MFA/TOTP ở phase này.
```

