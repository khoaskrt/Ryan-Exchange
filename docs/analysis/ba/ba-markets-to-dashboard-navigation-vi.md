# BA Document: Header Navigation từ Markets sang Dashboard

## 1. Tổng quan thay đổi
- **Tên thay đổi**: Thêm nút `Dashboard` trên header trang `Markets`.
- **Mục tiêu**: Cho phép người dùng chuyển nhanh từ màn hình theo dõi thị trường sang màn hình quản lý ví/tài sản (`/dashboard`) chỉ bằng 1 click.
- **Loại thay đổi**: UI Navigation Improvement (không thay đổi business rule của giao dịch).

## 2. Bối cảnh nghiệp vụ
- User thường đi theo luồng: xem thị trường (`Markets`) -> quyết định nạp/rút hoặc kiểm tra số dư (`Dashboard`).
- Trước thay đổi, user cần tự đổi URL hoặc đi vòng qua menu khác.
- Thêm shortcut trên header giúp giảm friction, tăng tốc thao tác và rõ ràng luồng sử dụng.

## 3. Phạm vi (Scope)
### In Scope
- Thêm nút `Dashboard` trên header của trang `/markets`.
- Nút điều hướng nội bộ sang route `/dashboard`.
- Giữ phong cách UI đồng bộ với header hiện tại.

### Out of Scope
- Không thay đổi logic auth/session.
- Không thay đổi API backend.
- Không thay đổi nội dung/flow bên trong Dashboard.

## 4. User Story
- **As a** người dùng đã đăng nhập,
- **I want** có nút `Dashboard` ngay trên header trang `Markets`,
- **So that** tôi có thể chuyển nhanh sang màn hình quản lý tài sản mà không cần thao tác vòng.

## 5. Functional Requirements
1. Trên trang `/markets`, header phải hiển thị thêm nút `Dashboard`.
2. Khi click nút `Dashboard`, hệ thống điều hướng đến `/dashboard`.
3. Điều hướng dùng client-side routing của Next.js để đảm bảo trải nghiệm mượt.
4. Nút chỉ là navigation action, không gọi API và không thay đổi dữ liệu.

## 6. Acceptance Criteria (UAT)
1. **Given** user đang ở `/markets`, **when** trang render xong, **then** thấy nút `Dashboard` trên header (desktop).
2. **Given** user click nút `Dashboard`, **when** sự kiện click xảy ra, **then** route chuyển sang `/dashboard` thành công.
3. **Given** user có session hợp lệ, **when** vào `/dashboard`, **then** hiển thị dashboard bình thường.
4. **Given** user không có session, **when** click `Dashboard`, **then** áp dụng hành vi auth hiện tại của hệ thống (redirect theo middleware/layout đã có).

## 7. Non-Functional Requirements
- Không làm giảm hiệu năng render đáng kể của trang `Markets`.
- Không phát sinh lỗi lint/typecheck.
- Không ảnh hưởng các thành phần header khác.

## 8. Tác động hệ thống
- **Frontend**: Cập nhật component header của Markets.
- **Backend**: Không tác động.
- **DB**: Không tác động.
- **QA**: Bổ sung test case điều hướng header `Markets -> Dashboard`.

## 9. Test Scenarios đề xuất cho QA
1. Điều hướng thành công từ `/markets` sang `/dashboard` khi đã đăng nhập.
2. Điều hướng khi hết session (xác nhận redirect đúng theo policy).
3. Kiểm tra responsive: desktop hiển thị nút đúng vị trí, không vỡ layout.
4. Kiểm tra regression: các nút khác trong header (`Log In`, `Sign Up`, nav item) vẫn hoạt động như cũ.

## 10. Triển khai kỹ thuật (đã thực hiện)
- File cập nhật:
  - `features/markets/components/markets-page.tsx`
- Thay đổi:
  - Import `Link` từ `next/link`.
  - Thêm button link `Dashboard` trỏ đến `/dashboard` tại khối action bên phải header.

