# Authentication API Contract (Internal)

Last updated: 2026-03-25

## Scope (v1.0)
- Active: email/password signup and login
- Inactive: SSO/OAuth flows (placeholder endpoint returns `AUTH_SSO_UNAVAILABLE`)

## 1) Sign Up

### Endpoint
- `POST /api/v1/auth/signup`
- Backward-compatible alias: `POST /api/auth/signup`

### Request body
```json
{
  "country": "Vietnam",
  "fullName": "Nguyen Van A",
  "email": "user@example.com",
  "password": "StrongPass@123",
  "referralCode": "RYAN2026"
}
```

### Validation rules
- `country`: required, only `Vietnam` allowed in v1
- `fullName`: required, 2..100 chars
- `email`: required, valid email format
- `password`: required, 8..64 chars, includes lowercase, uppercase, number, special char
- `referralCode`: optional
- duplicate email: not allowed

### Success response (201)
```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "userId": "cuid_xxx",
    "email": "user@example.com",
    "country": "Vietnam",
    "nextAction": {
      "type": "GO_TO_LOGIN",
      "path": "/login"
    },
    "authState": {
      "authenticated": false,
      "sessionIssued": false
    },
    "supportedPostSignupFlows": [
      "REGISTRATION_SUCCESS_ONLY",
      "REGISTRATION_SUCCESS_WITH_AUTO_LOGIN",
      "REGISTRATION_SUCCESS_WITH_NEXT_ACTION_HINT"
    ]
  }
}
```

Notes:
- `AUTH_SIGNUP_AUTO_LOGIN_ENABLED=true` will issue session cookie on signup and set next action to dashboard.
- No sensitive fields are returned.

### Error response
```json
{
  "success": false,
  "message": "...",
  "errorCode": "AUTH_INVALID_REQUEST",
  "legacyErrorCode": "AUTH_VALIDATION_FAILED"
}
```

Duplicate email response detail:
- `errorCode`: `AUTH_EMAIL_EXISTS`
- `message`: `Email already existed, please use another email`

## 2) Login

### Endpoint
- `POST /api/v1/auth/login`
- Backward-compatible alias: `POST /api/auth/login`

### Request body
```json
{
  "email": "user@example.com",
  "password": "StrongPass@123"
}
```

### Success response (200)
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "userId": "cuid_xxx",
      "email": "user@example.com",
      "name": "Nguyen Van A"
    },
    "session": {
      "strategy": "COOKIE_JWT",
      "expiresInSeconds": 604800
    }
  }
}
```

### Failure behavior
- User not found: generic invalid credentials
- Wrong password: generic invalid credentials
- Disabled/inactive account: account disabled response

## 3) SSO Unavailable Placeholder

### Endpoint
- `GET /api/v1/auth/sso/{provider}`
- `POST /api/v1/auth/sso/{provider}`
- Backward-compatible alias: `/api/auth/sso/{provider}`

### Behavior
- Always returns `501` with `AUTH_SSO_UNAVAILABLE`
- No OAuth redirect logic is active in v1

## 4) Standardized Auth Error Codes

Primary framework:
- `AUTH_INVALID_REQUEST`
- `AUTH_UNSUPPORTED_COUNTRY`
- `AUTH_EMAIL_EXISTS`
- `AUTH_WEAK_PASSWORD`
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_ACCOUNT_DISABLED`
- `AUTH_SSO_UNAVAILABLE`
- `AUTH_SERVER_ERROR`

Legacy aliases for FE migration:
- `AUTH_VALIDATION_FAILED`
- `AUTH_COUNTRY_NOT_SUPPORTED`
- `AUTH_INTERNAL_ERROR`

## 5) Audit Logging Events

Emitted events:
- `SIGNUP_ATTEMPT`
- `SIGNUP_SUCCESS`
- `SIGNUP_FAILURE`
- `LOGIN_ATTEMPT`
- `LOGIN_SUCCESS`
- `LOGIN_FAILURE`
- `SSO_CLICK_UNAVAILABLE`

Minimum fields captured:
- `createdAt`
- `eventType`
- `status`
- `email` (if available)
- `userId` (if available)
- `errorCode` (for failures)
