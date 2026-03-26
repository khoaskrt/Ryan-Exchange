# QA Auth Backend Regression Test Cases

## 1) Muc tieu
- Xac minh backend auth khong bi loi `500` khi login/signup.
- Bat buoc phat hien som loi lech Prisma Client enum (nhu loi `AuthEventType.LOGIN_FAILURE` bi `undefined`).
- Dam bao login flow, session cookie, auth guard, va audit log hoat dong dung.

## 2) Pham vi API
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `GET /api/auth/me`
- Bang DB lien quan: `User`, `AuthAuditLog`

## 3) Dieu kien truoc khi test
- Server dang chay (`npm run dev`).
- DB co the ghi doc binh thuong.
- Da chay:
```bash
npm run prisma:generate
```

---

## 4) Test Cases

### AUTH-REG-001: Prisma enum sync smoke check
**Muc tieu:** Phat hien lech Prisma client/schema truoc khi test API.

**Buoc test:**
1. Chay `npm run prisma:generate`.
2. Khoi dong lai app.
3. Goi login voi payload sai password.

**Expected:**
- API tra `401` (khong phai `500`).
- Khong co log: `TypeError: Cannot read properties of undefined (reading 'LOGIN_FAILURE')`.

---

### AUTH-REG-002: Login happy path
**Muc tieu:** Dang nhap thanh cong va set session cookie dung.

**Buoc test:**
1. Tao user moi bang signup API.
2. Login dung email/password.

**Expected:**
- `POST /api/v1/auth/login` tra `200`.
- Header co `Set-Cookie: kv_session=...; HttpOnly; SameSite=lax`.
- `GET /api/auth/me` bang cookie vua nhan tra `authenticated=true`.

---

### AUTH-REG-003: Login sai mat khau
**Muc tieu:** Reject dung cach, khong crash.

**Buoc test:**
1. Dung account hop le.
2. Goi login voi sai password.

**Expected:**
- Tra `401`.
- Body co `success=false` va message dang invalid credentials.
- Khong `500`.

---

### AUTH-REG-004: Login email khong ton tai
**Muc tieu:** Khong ro ri thong tin user.

**Buoc test:**
1. Goi login voi email random chua dang ky.

**Expected:**
- Tra `401`.
- Message giong truong hop sai password (khong phan biet user ton tai hay khong).

---

### AUTH-REG-005: Login payload khong hop le
**Muc tieu:** Validate input dung, khong 500.

**Buoc test:**
1. Goi login voi payload JSON sai format (thieu password hoac email khong hop le).

**Expected:**
- Tra `400`.
- Body co message validation ro rang.
- Khong `500`.

---

### AUTH-REG-006: Signup happy path
**Muc tieu:** Tao user thanh cong.

**Buoc test:**
1. Goi signup voi du lieu hop le (`country=Vietnam`, password strong).

**Expected:**
- Tra `201`.
- User moi duoc tao trong DB.

---

### AUTH-REG-007: Signup duplicate email
**Muc tieu:** Chan duplicate dung ma loi.

**Buoc test:**
1. Signup email A.
2. Signup lai email A.

**Expected:**
- Lan 2 tra `409`.
- Message thong bao email da ton tai.

---

### AUTH-REG-008: Account disabled login
**Muc tieu:** Khong cho login neu account status khong ACTIVE.

**Buoc test:**
1. Update DB user `accountStatus='DISABLED'`.
2. Goi login.

**Expected:**
- Tra `403`.
- Message account not active.

---

### AUTH-REG-009: Audit log ghi day du
**Muc tieu:** Event login/signup duoc ghi dung.

**Buoc test:**
1. Thuc hien 1 lan login fail.
2. Thuc hien 1 lan login success.
3. Query `AuthAuditLog`.

**Expected:**
- Co event `LOGIN_ATTEMPT`, `LOGIN_FAILURE`, `LOGIN_SUCCESS`.
- Khong co crash khi ghi audit.

---

### AUTH-REG-010: Auth guard voi cookie
**Muc tieu:** Session duoc xac thuc dung.

**Buoc test:**
1. Goi `GET /api/auth/me` khong cookie.
2. Goi lai voi cookie `kv_session`.

**Expected:**
- Khong cookie: `401` hoac `authenticated=false`.
- Co cookie hop le: `200` + `authenticated=true`.

---

## 5) Lenh curl mau de backend chay nhanh

```bash
# 1) Signup
EMAIL="qa_reg_$(date +%s)@example.com"
curl -i -c /tmp/kv_cookies.txt -b /tmp/kv_cookies.txt \
  -X POST http://localhost:3000/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  --data "{\"country\":\"Vietnam\",\"fullName\":\"QA User\",\"email\":\"$EMAIL\",\"password\":\"StrongPass@123\"}"

# 2) Login success
curl -i -c /tmp/kv_cookies.txt -b /tmp/kv_cookies.txt \
  -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  --data "{\"email\":\"$EMAIL\",\"password\":\"StrongPass@123\"}"

# 3) me endpoint
curl -i -c /tmp/kv_cookies.txt -b /tmp/kv_cookies.txt \
  http://localhost:3000/api/auth/me

# 4) Login wrong password (must be 401, never 500)
curl -i -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  --data "{\"email\":\"$EMAIL\",\"password\":\"WrongPass@123\"}"
```

## 6) SQL verify mau
```sql
-- Kiem tra user vua tao
select id,email,accountStatus,lastLoginAt
from User
where email = '<EMAIL>';

-- Kiem tra audit log gan nhat
select eventType,status,email,errorCode,datetime(createdAt/1000,'unixepoch') as created_at
from AuthAuditLog
order by createdAt desc
limit 30;
```

## 7) Tieu chi pass/fail cuoi cung
- PASS:
  - Tat ca case tren tra ma HTTP dung.
  - Khong co login/signup nao tra `500` khi input nguoi dung sai.
  - Khong co runtime error enum undefined trong log server.
- FAIL:
  - Xuat hien bat ky `TypeError` lien quan `AuthEventType.*`.
  - Bat ky case login fail thong thuong tra `500` thay vi `401/400/403`.
