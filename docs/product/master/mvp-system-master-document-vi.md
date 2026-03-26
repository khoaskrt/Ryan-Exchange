# MVP System Master Document (PM Review)

Tai lieu nay tong hop day du thong tin he thong MVP de Product Manager review nhanh, va de team luu tru thong tin chuan, tranh miss context giua Business, Product, Architecture, va Engineering.

## 1. Business Overview

### 1.1 Muc tieu MVP

- Xay dung mot crypto exchange MVP theo huong **paper trading** (mo phong), cho phep user trai nghiem luong giao dich co ban ma khong dung tai san that.
- Muc tieu chinh:
  - Validate user flow giao dich.
  - Validate activation metric cho giai doan beta.
  - Tao nen tang de nang cap sang giai doan production sau nay.

### 1.2 Doi tuong su dung

- Early users/internal beta traders can thu nghiem terminal va order flow.
- PM/Growth team can theo doi activation va hanh vi su dung ban dau.

### 1.3 Pham vi trong MVP (in-scope)

- Dang ky/dang nhap + session.
- Invite-only signup.
- Dashboard trading co du lieu market mo phong.
- Dat lenh/huy lenh (spot simulation).
- Vi paper (balance available/locked) + ledger.
- Activation analytics.

### 1.4 Ngoai pham vi MVP (out-of-scope hien tai)

- Khong custody tai san that.
- Khong KYC/AML.
- Khong fiat on/off-ramp.
- Khong ket noi Fireblocks/Binance/PSP/KYC provider.
- Khong matching engine production-grade.

## 2. Product Scope va Feature Inventory

### 2.1 Auth va Session

- Signup/login/logout/me.
- Cookie JWT HTTP-only.
- Route app duoc bao ve o server layout.

### 2.2 Invite Management

- User phai co invite code de signup.
- Co luong verify invite code truoc khi submit signup.
- Invite co gioi han so luot, trang thai active, va han dung.

### 2.3 Trading Terminal

- User chon symbol, side, type, quantity, price (neu LIMIT).
- Ho tro MARKET va LIMIT.
- Ho tro cancel order voi trang thai cho phep.

### 2.4 Wallet va Ledger

- User moi duoc seed so du paper ban dau.
- Wallet tach `available` va `locked`.
- Ledger ghi lai lock/fill/unlock de audit nghiep vu.

### 2.5 Analytics

- Snapshot activation users.
- Theo doi first trade va activation trong 24h.

## 3. System Context & Boundaries

### 3.1 Kieu kien truc hien tai

- Mot codebase Next.js App Router chua ca frontend va backend API routes.
- Business logic tach trong `lib/server`.
- Du lieu quan ly boi Prisma + SQLite (dev.db).

### 3.2 Boundary

- Frontend web + API noi bo + DB noi bo.
- Chua co external integration thuc te ra ben ngoai.

## 4. Layered Architecture

### 4.1 Frontend Layer

- UI pages:
  - Auth pages.
  - Dashboard page.
  - Support placeholder page.
- Client components goi API noi bo bang `fetch`.

### 4.2 Backend Layer

- API routes trong `app/api/`**.
- Domain services:
  - Auth/session.
  - Invite.
  - Trading simulation.
  - Wallet/ledger.
  - Market data mock.
  - Input validation.

### 4.3 Data Layer

- Prisma schema gom cac entity chinh:
  - `User`
  - `InviteCode`
  - `InviteRedemption`
  - `WalletBalance`
  - `LedgerEntry`
  - `Order`
  - `Trade`
- Cac flow quan trong dung transaction de dam bao tinh toan ven.

### 4.4 Infra Layer

- Runtime don gian: single app process.
- Chua co CI/CD, IaC, queue, websocket, tracing stack, hay deploy architecture production.

## 5. User Flows (End-to-End)

### 5.1 Signup invite-only

1. User vao signup page.
2. User verify invite code (optional truoc submit).
3. User submit signup.
4. Backend validate, consume invite, tao user, seed wallet, set session.
5. Redirect vao dashboard.

### 5.2 Login/Logout

1. User login.
2. Backend verify credential, set session cookie.
3. User vao khu vuc app duoc protect.
4. Logout se clear cookie.

### 5.3 Dashboard load

1. Sau auth, dashboard load:
  - markets
  - balances
  - orders
  - ledger
  - activation
2. UI hien thi tong hop cho trader.

### 5.4 Place order

1. User submit order.
2. Backend validate.
3. Engine lock funds.
4. Engine simulate fill theo order book static.
5. Update order/trade/wallet/ledger.
6. Reload du lieu tren dashboard.

### 5.5 Cancel order

1. User cancel order o trang thai hop le.
2. Backend verify owner + status.
3. Unlock phan con lai.
4. Update order status thanh canceled.

## 6. Backend Logic va Business Rules

### 6.1 Rules chinh

- LIMIT order bat buoc co gia > 0.
- Symbol phai nam trong danh sach ho tro.
- Khong du balance se reject.
- MARKET order co the partial fill.
- Co co che unlock phan lock du (tuong ung logic hien tai).
- First trade timestamp duoc set khi co trade dau tien.

### 6.2 Data integrity

- Unique constraints cho email, invite code, wallet key.
- Composite unique cho invite redemption.
- Transaction cho cac operation quan trong de giam loi mid-state.

## 7. Data Model (Business + Technical Mapping)

### 7.1 Entity nghiep vu

- `User`: tai khoan va moc kich hoat.
- `InviteCode`: ma moi.
- `InviteRedemption`: lich su redeem theo email/user.
- `WalletBalance`: so du theo asset.
- `LedgerEntry`: audit thay doi so du.
- `Order`: lenh user.
- `Trade`: ket qua fill cua lenh.

### 7.2 Quan he chinh

- User 1-N voi orders/trades/wallet balances/ledger/redemptions.
- InviteCode 1-N InviteRedemption.
- Order 1-N Trade.

## 8. API Design (PM-Friendly Map)

### 8.1 Auth

- `POST /api/auth/signup`: tao tai khoan moi.
- `POST /api/auth/login`: dang nhap.
- `POST /api/auth/logout`: dang xuat.
- `GET /api/auth/me`: lay profile user dang login.

### 8.2 Invite

- `POST /api/invite/redeem`: verify/redeem invite theo email.

### 8.3 Markets

- `GET /api/markets`
- `GET /api/markets/{symbol}/book`
- `GET /api/markets/{symbol}/ticker`

### 8.4 Orders

- `GET /api/orders`
- `POST /api/orders`
- `POST /api/orders/{id}/cancel`

### 8.5 Wallet

- `GET /api/wallet/balances`
- `GET /api/wallet/ledger`

### 8.6 Analytics

- `GET /api/analytics/activation`

## 9. Edge Cases va Failure Scenarios

### 9.1 Da co xu ly trong code

- Invite invalid/expired/exhausted.
- Email da ton tai khi signup.
- Payload order sai format.
- Khong du so du.
- Khong du liquidity mo phong.
- Cancel order khong hop le (sai owner/trang thai).

### 9.2 Can test ky them

- Race condition khi dat lenh lien tiep.
- Do chinh xac lock/unlock trong MARKET partial fill + cancel.
- Invite usage semantics giua verify va consume.
- Dung/sai cua activation metric khi user data tang nhanh.

## 10. Security & Compliance

### 10.1 Controls hien co

- Password hashing.
- JWT signed session cookie (HTTP-only).
- Server-side route guard.
- Input validation.
- Transaction va constraints muc co ban.

### 10.2 Controls con thieu (critical cho production)

- Rate limiting.
- CSRF protection ro rang cho cookie auth.
- MFA/2FA.
- Security audit logging.
- KYC/AML/sanctions.
- Secret management enterprise.

## 11. Scalability & Performance Assessment

### 11.1 Hien trang

- Monolith + SQLite.
- Market data static.
- Chua co queue, cache, websocket, tracing.

### 11.2 Roadmap de xuat

- **MVP Hardening**: PostgreSQL, rate limit, logging co cau truc, cache analytics.
- **Early Growth**: Redis, async jobs, websocket updates, tach service boundaries logic.
- **Production Direction**: event-driven lifecycle, matching engine rieng, compliance stack, DR strategy.

## 12. Technical Risks & Mitigation

### 12.1 Top risks

- Trading simulation chua production-safe.
- SQLite khong phu hop scale va HA.
- Security baseline chua du cho public internet.
- Chua co abstraction cho third-party integrations.
- Observability rat han che.

### 12.2 Mitigations

- Them idempotency keys cho order/cancel.
- Tien xu ly risk checks module rieng.
- Centralized error taxonomy.
- Structured logging + metrics + tracing + alerting.
- Chuan bi adapter interfaces cho custody/KYC/fiat.

## 13. Assumptions (Can PM confirm)

- Product hien tai la closed beta paper-trading, chua huong production launch.
- Invite-only la co y de kiem soat user quality.
- Khong can KYC/custody trong phase nay.
- Activation metric la KPI chinh cho validate product-market fit ban dau.

## 14. Open Questions Can PM Review

1. Verify invite co nen tinh vao `usedCount` hay chi signup moi tinh?
2. Rule hoan tra funds khi MARKET partial fill + cancel co can dieu chinh de tranh sai lech?
3. Co can mo phong trading fee/slippage ngay trong MVP khong?
4. Muc uu tien cho reset password that va support flow?
5. Co can admin tools quan ly invite code cho van hanh beta?
6. Muc security baseline toi thieu truoc khi mo beta rong?

## 15. Recommended PM Review Checklist

- Scope MVP da dung voi muc tieu kinh doanh chua?
- User flows da day du va thong nhat voi team chua?
- Cac out-of-scope co duoc nho ro de tranh expectation gap khong?
- Risk tai chinh va security da duoc acknowledge chua?
- Da co timeline cho hardening truoc khi scale chua?

## 16. Source-of-Truth (Code References)

- Product/UI flows:
  - `features/dashboard/components/trading-terminal.tsx`
  - `features/auth/components/signup-form.tsx`
  - `features/auth/components/login-form.tsx`
- Auth/session:
  - `app/api/auth/signup/route.ts`
  - `app/api/auth/login/route.ts`
  - `app/api/auth/logout/route.ts`
  - `app/api/auth/me/route.ts`
  - `lib/server/auth.ts`
  - `lib/server/session.ts`
  - `app/(app)/layout.tsx`
- Invite:
  - `app/api/invite/redeem/route.ts`
  - `lib/server/invite.ts`
- Trading/wallet:
  - `app/api/orders/route.ts`
  - `app/api/orders/[id]/cancel/route.ts`
  - `app/api/wallet/balances/route.ts`
  - `app/api/wallet/ledger/route.ts`
  - `lib/server/trading.ts`
  - `lib/server/wallet.ts`
- Markets:
  - `app/api/markets/route.ts`
  - `app/api/markets/[symbol]/book/route.ts`
  - `app/api/markets/[symbol]/ticker/route.ts`
  - `lib/server/markets.ts`
- Analytics:
  - `app/api/analytics/activation/route.ts`
- Data model:
  - `prisma/schema.prisma`

---

## PM Sign-off Section (de su dung trong buoi review)

- PM owner:
- Engineering owner:
- Review date:
- Scope approved: Yes/No
- Risks accepted: Yes/No
- Must-fix before next release:
  - [ ]
  - [ ]
  - [ ]

