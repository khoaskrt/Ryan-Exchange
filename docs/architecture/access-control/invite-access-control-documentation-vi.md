# Tai lieu hoan chinh - Phan cap quyen truy cap bang Invite Code

## 1) Tong quan

Tai lieu nay mo ta day du logic hien co trong codebase ve co che "invite-only access" cho dang ky tai khoan. Noi dung duoc to chuc theo cac dang tai lieu: `BRS`, `PRD`, `FRS`, `SRS`, `API Docs`, kem ma tran truy vet requirement <-> code.

Phan tich chi dua tren implementation hien tai trong:
- `app/api/invite/redeem/route.ts`
- `app/api/auth/signup/route.ts`
- `lib/server/invite.ts`
- `lib/server/validators.ts`
- `features/auth/components/signup-form.tsx`
- `prisma/schema.prisma`

---

## 2) BRS (Business Requirements Specification)

### 2.1 Muc tieu
- Dam bao he thong beta chi cho phep nguoi dung co invite code hop le truy cap qua buoc dang ky.
- Ho tro PM/ops theo doi viec su dung invite qua thong tin da redeem theo email.
- Cho phep nguoi dung kiem tra invite code truoc khi bam tao tai khoan.

### 2.2 Pham vi
- Trong pham vi:
  - Verify invite code theo cap `email + code`.
  - Dang ky tai khoan voi invite code bat buoc.
  - Ghi nhan redemption va gan redemption voi `userId` khi signup thanh cong.
- Ngoai pham vi (theo code hien tai):
  - Khong co luong admin tao/sua/xoa invite code qua UI/API.
  - Khong co role/permission chi tiet sau login (RBAC) duoc xu ly trong module invite.

### 2.3 Quy trinh nghiep vu
1. Nguoi dung nhap `email` va `invite code` tai man signup.
2. (Tuy chon) Nguoi dung bam "Verify Invite Code":
   - He thong kiem tra code co ton tai, active, chua qua han, chua het luot.
   - Neu hop le, he thong ghi nhan redemption theo `email + inviteCode` (neu chua co).
3. Nguoi dung submit signup:
   - He thong validate input.
   - Kiem tra email chua ton tai user.
   - Tao user, consume invite trong transaction, seed paper wallet.
4. Tra ve session neu tao tai khoan thanh cong.

### 2.4 Business rules
- BR-01: Dang ky tai khoan bat buoc co invite code.
- BR-02: Invite code khong hop le neu:
  - `isActive = false`, hoac
  - `usedCount >= maxUses`, hoac
  - `expiresAt < thoi diem hien tai`.
- BR-03: Cung mot `email` khong duoc redeem lap lai cho cung mot invite code (idempotent theo cap code-email).
- BR-04: Invite co the duoc verify truoc signup; signup sau do se gan redemption vao user neu redemption da ton tai.
- BR-05: He thong co bo ma invite mac dinh duoc dam bao ton tai khi redeem/signup.

### 2.5 Edge cases
- Email khac nhau ve hoa/thuong va khoang trang duoc normalize ve lowercase + trim khi xu ly backend.
- Code khac nhau ve hoa/thuong va khoang trang duoc normalize ve uppercase + trim.
- Neu da verify truoc do (co redemption nhung chua gan user), signup se cap nhat `userId` thay vi tao redemption moi.
- Neu email da ton tai user, signup tra `409`, khong consume invite.
- Neu request payload sai schema, API tra `400`.

### 2.6 Assumptions
- Moi truong MVP su dung mo hinh invite-only de gioi han truy cap beta.
- Business chap nhan viec verify invite co the tang `usedCount` truoc khi signup.
- Cac ma invite mac dinh duoc dung nhu "bootstrap" ban dau, maxUses = 200.

### 2.7 Open questions
- OQ-BR-01: `usedCount` tang ngay tai buoc verify, vay co chap nhan truong hop verify nhieu nhung khong signup (hao quota) khong?
- OQ-BR-02: Can thiet ke luong admin quan ly invite code (tao/disable/expiry/maxUses) khong?
- OQ-BR-03: Co can rang buoc invite phai redeem truoc moi duoc signup, hay chi can code hop le tai luc signup (hien tai la cach 2)?

### 2.8 Truy vet sang code path
- Rules invite usability: `lib/server/invite.ts` (`isInviteUsable`).
- Verify/redeem luong nghiep vu: `lib/server/invite.ts` (`redeemInviteForEmail`).
- Dang ky va consume invite: `app/api/auth/signup/route.ts`, `lib/server/invite.ts` (`consumeInviteForSignup`).
- UI luong verify + signup: `features/auth/components/signup-form.tsx`.

---

## 3) PRD (Product Requirements Document)

### 3.1 Muc tieu san pham
- Cung cap trai nghiem dang ky "closed beta" de nguoi dung nhap invite code va vao he thong paper trading.
- Giam ma sat thu cong bang cach co endpoint verify invite truoc dang ky.

### 3.2 Pham vi san pham
- Trang signup co:
  - Form thong tin user (`name`, `email`, `password`, `inviteCode`).
  - Nut "Verify Invite Code".
  - Nut "Create Account".
- API backend:
  - `/api/invite/redeem`
  - `/api/auth/signup`

### 3.3 Chuc nang/luong nguoi dung
- PRD-FLOW-01 (Verify):
  - Nguoi dung bam verify -> hien thong bao thanh cong that bai.
  - Message thanh cong:
    - `Invite verified successfully.`
    - Hoac `Invite already redeemed for this email.`
- PRD-FLOW-02 (Signup):
  - Nguoi dung bam create account -> neu thanh cong chuyen `/dashboard`.
  - Neu loi, hien `message` tu API.

### 3.4 Business rules
- Invite code la truong bat buoc trong signup UI va signup API.
- Verify invite khong tao user, chi xu ly tinh hop le invite + redemption record.
- Signup thanh cong moi tao session login.

### 3.5 Edge cases
- Verify loi mang: UI hien `Network error while verifying invite.`
- Signup loi mang: UI hien `Network error. Please try again.`
- Verify/singup API tra loi: UI uu tien hien `result.message`.

### 3.6 Assumptions
- Nguoi dung co the bo qua buoc verify va signup truc tiep; backend van enforce invite validity.
- Invite-only hien tai dung cho module auth, khong bao gom gating cac route khac sau dang nhap.

### 3.7 Open questions
- OQ-PRD-01: Co can bat buoc user verify truoc khi cho submit signup tren UI khong?
- OQ-PRD-02: Co can them thong tin "so luot con lai" cua invite cho PM/ops theo doi khong?

### 3.8 Truy vet sang code path
- Signup page + copywriting: `app/(auth)/signup/page.tsx`.
- Form UX va call API: `features/auth/components/signup-form.tsx`.

---

## 4) FRS (Functional Requirements Specification)

### 4.1 Muc tieu
- Dac ta cac ham/chuc nang he thong dang thuc thi cho invite access.

### 4.2 Pham vi
- Validation input.
- Redeem invite.
- Signup consume invite.
- Khoi tao invite mac dinh.

### 4.3 Chuc nang chi tiet

#### FRS-01: Validate request payload
- `inviteRedeemSchema`: yeu cau `email` hop le, `code` dai 4..64.
- `signupSchema`: yeu cau `name` dai 2..120, `email` hop le, `password` dai 8..128, `inviteCode` dai 4..64.

#### FRS-02: Redeem invite theo email
- Input: `email`, `code`.
- Xu ly:
  - normalize email/code.
  - ensure bo default invite ton tai.
  - kiem tra invite usability.
  - neu da co redemption theo `(inviteCodeId, email)` -> tra `alreadyRedeemed = true`.
  - neu chua co -> tao `InviteRedemption`, tang `InviteCode.usedCount`.
- Output:
  - Thanh cong: `ok=true`, `inviteCode`, `alreadyRedeemed`.
  - Loi hop le nghiep vu: `INVALID_INVITE`.

#### FRS-03: Signup consume invite
- Input: `name`, `email`, `password`, `inviteCode`.
- Xu ly:
  - ensure default invite.
  - validate payload.
  - check duplicate email user.
  - transaction:
    - tao user.
    - consume invite:
      - neu chua redemption -> tao redemption + tang usedCount.
      - neu da redemption chua co userId -> update userId.
    - seed paper wallet.
  - tao session cookie va tra user.

#### FRS-04: Ensure default invite codes
- He thong dam bao cac ma sau ton tai trong DB:
  - `KV-BETA-2026`
  - `KV-TRADER-ACCESS`
  - `KV-EARLY-VN`
- Ma moi duoc tao voi:
  - `maxUses = 200`
  - `isActive = true`

### 4.4 Technical rules
- TR-01: Xu ly redeem/signup co su dung transaction Prisma de dam bao nhat quan du lieu.
- TR-02: Logic normalize:
  - email -> `trim().toLowerCase()`
  - code -> `trim().toUpperCase()`
- TR-03: Rule invite usable duoc dung dong nhat giua redeem va signup.
- TR-04: Loi nghiep vu invite khong hop le duoc map thanh HTTP `400`.

### 4.5 Edge cases
- Redemption ton tai nhung da co `userId`: consume signup khong tao/cap nhat them redemption.
- Invite code hop le ve format nhung khong ton tai DB: `INVALID_INVITE`.
- Invite code ton tai nhung het han/disable/het luot: `INVALID_INVITE`.

### 4.6 Assumptions
- Ung dung hien tai khong lock pessimistic row khi increment `usedCount`; chap nhan hanh vi theo transaction mac dinh SQLite/Prisma.

### 4.7 Open questions
- OQ-FRS-01: Can bo sung co che tranh race condition chat che hon khi invite gan het quota khong?
- OQ-FRS-02: Co can endpoint rieng de check invite "dry-run" (khong tang usedCount) khong?

### 4.8 Truy vet sang code path
- Validation: `lib/server/validators.ts`.
- Redeem logic: `lib/server/invite.ts` (`redeemInviteForEmail`).
- Signup consume: `lib/server/invite.ts` (`consumeInviteForSignup`), `app/api/auth/signup/route.ts`.
- API mapping loi: `app/api/invite/redeem/route.ts`, `app/api/auth/signup/route.ts`.

---

## 5) SRS (Software Requirements Specification)

### 5.1 Muc tieu
- Mo ta cac yeu cau he thong o muc software architecture va du lieu cho invite-based access.

### 5.2 Pham vi ky thuat
- Backend Next.js Route Handlers.
- Prisma + SQLite data model.
- Client-side signup form.

### 5.3 Kien truc va system flow
1. Client (`signup-form`) goi API verify invite hoac signup.
2. Route handler validate payload bang Zod.
3. Service invite trong `lib/server/invite.ts` thuc thi rule nghiep vu va thao tac DB.
4. Prisma ghi/doi so lieu `InviteCode`, `InviteRedemption`, `User`.
5. Signup thanh cong tao session cookie va redirect dashboard.

### 5.4 Data model lien quan

#### Bang `InviteCode`
- `code` unique.
- `isActive`, `maxUses`, `usedCount`, `expiresAt`.
- Quan he 1-n toi `InviteRedemption`.

#### Bang `InviteRedemption`
- Luu event redeem theo cap `inviteCodeId + email` (unique).
- `userId` nullable, cho phep redeem truoc dang ky.
- Index theo `email`.

#### Bang `User`
- `email` unique.
- Quan he toi `InviteRedemption` qua `userId`.

### 5.5 Technical rules
- SR-01: `@@unique([inviteCodeId, email])` enforce idempotency cho redemption.
- SR-02: API response su dung JSON message don gian, khong co error code field rieng.
- SR-03: Signup va consume invite nam trong 1 transaction cung seed wallet.
- SR-04: Session cookie duoc set sau khi signup thanh cong.

### 5.6 Edge cases
- Payload parse fail -> HTTP 400.
- Loi he thong (DB/network/internal) -> HTTP 500 voi message chung.
- Email duplicate user -> HTTP 409.

### 5.7 Assumptions
- DB provider hien tai la SQLite (`datasource db provider = "sqlite"`).
- Ung dung o giai doan MVP, uu tien don gian implementation.

### 5.8 Open questions
- OQ-SRS-01: Co can bo sung ma loi chuan hoa (VD: `errorCode`) de frontend xu ly chi tiet hon khong?
- OQ-SRS-02: Co can tach service invite thanh module doc lap co test unit/integration rieng khong?

### 5.9 Truy vet sang code path
- Schema DB: `prisma/schema.prisma`.
- API route handlers: `app/api/invite/redeem/route.ts`, `app/api/auth/signup/route.ts`.
- Service layer: `lib/server/invite.ts`.
- UI flow: `features/auth/components/signup-form.tsx`.

---

## 6) API Docs

### 6.1 POST `/api/invite/redeem`

#### Muc tieu
- Verify/redeem invite code theo email truoc (hoac doc lap voi) signup.

#### Request
- Headers:
  - `Content-Type: application/json`
- Body:
```json
{
  "email": "user@example.com",
  "code": "KV-BETA-2026"
}
```

#### Validation rules
- `email`: bat buoc, dung dinh dang email, do dai toi da 160.
- `code`: bat buoc, do dai 4..64.

#### Response thanh cong
- HTTP `200`
```json
{
  "ok": true,
  "inviteCode": "KV-BETA-2026",
  "alreadyRedeemed": false
}
```

#### Error responses
- HTTP `400` - payload khong hop le
```json
{
  "message": "Please enter a valid email address"
}
```
- HTTP `400` - invite khong hop le/het han/het luot
```json
{
  "message": "Invite code is invalid or expired."
}
```
- HTTP `500` - loi he thong
```json
{
  "message": "Unable to redeem invite code right now."
}
```

#### Code path
- Route: `app/api/invite/redeem/route.ts`
- Service: `lib/server/invite.ts` (`redeemInviteForEmail`)
- Schema: `lib/server/validators.ts` (`inviteRedeemSchema`)

---

### 6.2 POST `/api/auth/signup` (lien quan invite)

#### Muc tieu
- Tao user moi voi invite code bat buoc, consume invite trong cung transaction.

#### Request
- Headers:
  - `Content-Type: application/json`
- Body:
```json
{
  "name": "Nguyen Van A",
  "email": "user@example.com",
  "password": "Password123",
  "inviteCode": "KV-BETA-2026"
}
```

#### Validation rules
- `name`: bat buoc, 2..120.
- `email`: bat buoc, email hop le, toi da 160.
- `password`: bat buoc, 8..128.
- `inviteCode`: bat buoc, 4..64.

#### Response thanh cong
- HTTP `201`
```json
{
  "user": {
    "id": "ck...",
    "name": "Nguyen Van A",
    "email": "user@example.com"
  }
}
```

#### Error responses
- HTTP `400` - payload khong hop le
```json
{
  "message": "Invite code is required"
}
```
- HTTP `400` - invite khong hop le/het han/het luot
```json
{
  "message": "Invite code is invalid or expired."
}
```
- HTTP `409` - email da ton tai
```json
{
  "message": "Email is already in use."
}
```
- HTTP `500` - loi he thong
```json
{
  "message": "Unable to create account right now."
}
```

#### Code path
- Route: `app/api/auth/signup/route.ts`
- Service invite: `lib/server/invite.ts` (`consumeInviteForSignup`, `ensureDefaultInviteCodes`)
- Validation: `lib/server/validators.ts` (`signupSchema`)

---

## 7) Traceability Matrix (Requirement <-> Code)

| Requirement ID | Mo ta requirement (theo code hien tai) | Code path chinh |
|---|---|---|
| RQ-INV-01 | He thong phai validate format payload cho redeem invite | `lib/server/validators.ts` (`inviteRedeemSchema`), `app/api/invite/redeem/route.ts` |
| RQ-INV-02 | He thong phai kiem tra invite usable (active, quota, expiry) khi redeem | `lib/server/invite.ts` (`isInviteUsable`, `redeemInviteForEmail`) |
| RQ-INV-03 | Redeem phai idempotent theo `(inviteCodeId, email)` | `prisma/schema.prisma` (`InviteRedemption @@unique`), `lib/server/invite.ts` |
| RQ-INV-04 | Neu redeem moi thanh cong thi tang `usedCount` cua invite | `lib/server/invite.ts` (`redeemInviteForEmail`) |
| RQ-INV-05 | Signup bat buoc inviteCode va phai validate input | `lib/server/validators.ts` (`signupSchema`), `app/api/auth/signup/route.ts` |
| RQ-INV-06 | Signup phai reject neu email da ton tai | `app/api/auth/signup/route.ts` |
| RQ-INV-07 | Signup phai consume invite trong transaction khi tao user | `app/api/auth/signup/route.ts`, `lib/server/invite.ts` (`consumeInviteForSignup`) |
| RQ-INV-08 | He thong phai co bo invite code mac dinh de bootstrap | `lib/server/invite.ts` (`DEFAULT_INVITE_CODES`, `ensureDefaultInviteCodes`) |
| RQ-INV-09 | He thong phai map loi invite invalid thanh HTTP 400 message chuan | `app/api/invite/redeem/route.ts`, `app/api/auth/signup/route.ts` |
| RQ-INV-10 | Frontend phai cung cap luong verify invite va signup voi feedback message | `features/auth/components/signup-form.tsx`, `app/(auth)/signup/page.tsx` |

---

## 8) Ghi chu ket thuc

- Tai lieu nay phan anh dung hanh vi he thong theo code hien tai tai thoi diem phan tich.
- Cac muc `Open questions` la diem can PM/Tech lead chot neu muon nang cap tu MVP len production-grade invite management.
