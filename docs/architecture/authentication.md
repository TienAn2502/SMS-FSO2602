# Authentication

## Tổng quan

Hệ thống dùng **Access Token + Refresh Token**, cả hai truyền qua **HttpOnly Cookie**. Không lưu token trong localStorage.

## Token

### Access Token

| Thuộc tính | Giá trị |
|------------|---------|
| Thời hạn | 15 phút (cấu hình qua env) |
| Lưu trữ client | HttpOnly cookie `access_token` |
| Payload | `{ sub, sid, activeSchoolId }` |

Không nhét toàn bộ permissions vào access token.

### Refresh Token

| Thuộc tính | Giá trị |
|------------|---------|
| Thời hạn | 7 ngày (cấu hình qua env) |
| Lưu trữ client | HttpOnly cookie `refresh_token`, path `/api/v1/auth/refresh` |
| Lưu trữ server | Hash trong `auth_sessions.refresh_token_hash` |

Quy tắc refresh token:

- Hash trước khi lưu database (bcrypt hoặc argon2)
- **Rotate** sau mỗi lần refresh – thu hồi token cũ, phát token mới
- Có thể revoke (logout, đổi mật khẩu, khóa tài khoản)
- Gắn với một `auth_session`
- Không lưu plaintext

## Bảng session

```text
auth_sessions
├── id
├── user_id
├── refresh_token_hash
├── device_name
├── user_agent
├── ip_address
├── expires_at
├── revoked_at
├── last_used_at
└── created_at
```

## Cookie configuration

### Development

```typescript
{
  httpOnly: true,
  secure: false,       // COOKIE_SECURE=false
  sameSite: 'lax',
  path: '/',
}
```

Refresh cookie:

```typescript
{
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  path: '/api/v1/auth/refresh',
}
```

### Production

```typescript
{
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
}
```

## Luồng đăng nhập

```text
POST /api/v1/auth/login
  Body: { email, password }

1. Tìm user theo email
2. Kiểm tra status = ACTIVE
3. Verify password (bcrypt)
4. Tạo auth_session
5. Tạo access token + refresh token
6. Hash và lưu refresh token
7. Set HttpOnly cookies
8. Trả user info + danh sách trường (memberships)
9. Ghi audit log: LOGIN
```

Response (không trả token trong body):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "admin@demo.edu.vn",
      "fullName": "Quản trị viên Demo"
    },
    "schools": [
      {
        "id": "...",
        "code": "DEMO",
        "name": "Trường THPT Demo",
        "roles": ["SCHOOL_ADMIN"]
      }
    ],
    "activeSchoolId": "..."
  },
  "message": "Đăng nhập thành công"
}
```

## Luồng refresh

```text
POST /api/v1/auth/refresh
  Cookie: refresh_token (tự động gửi)

1. Đọc refresh token từ cookie
2. Tìm auth_session theo hash
3. Kiểm tra chưa revoke, chưa hết hạn
4. Revoke refresh token cũ
5. Tạo access token + refresh token mới
6. Cập nhật hash trong session
7. Set cookies mới
```

## Luồng logout

```text
POST /api/v1/auth/logout
  Cookie: access_token

1. Revoke auth_session (revoked_at = now)
2. Xóa cookies
3. Ghi audit log: LOGOUT
```

## Luồng chuyển trường

```text
POST /api/v1/auth/switch-school
  Body: { schoolId }
  Cookie: access_token

1. Xác thực user
2. Kiểm tra user có membership ACTIVE tại schoolId
3. Phát access token mới với activeSchoolId cập nhật
4. Trả thông tin trường + permissions của user tại trường đó
```

## Luồng lấy session hiện tại

```text
GET /api/v1/auth/me
  Cookie: access_token

→ Trả user, activeSchoolId, permissions tại trường active
```

Permissions được load từ database (membership → roles → permissions), không decode từ token.

## CSRF và CORS

Vì dùng cookie:

| Biện pháp | Mô tả |
|-----------|-------|
| CORS | Chỉ allow origin frontend cụ thể, `credentials: true` |
| SameSite | `lax` (mặc định) |
| Origin check | Kiểm tra Origin/Referer cho mutation request (POST, PUT, PATCH, DELETE) |
| CSRF token | Đề xuất thêm cho endpoint nhạy cảm nếu cần (Sprint 1+: đánh giá sau khi có cookie auth) |

Cấu hình CORS:

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN,  // không wildcard
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
});
```

## Mật khẩu

- Hash bằng **bcrypt** (cost factor 12)
- Không lưu plaintext
- Không trả `password_hash` trong API response
- Không ghi password vào audit log

## Bảo vệ route

### Backend

```text
@Public()           → Không cần auth (login, health)
JwtAuthGuard        → Yêu cầu access token hợp lệ
TenantGuard         → Yêu cầu activeSchoolId hợp lệ
PermissionGuard     → Yêu cầu permission code
```

### Frontend

```text
ProtectedRoute      → Redirect /dang-nhap nếu chưa auth
PermissionGate      → Ẩn component nếu thiếu permission
SchoolRequired      → Redirect /chon-truong nếu chưa chọn trường
```

## Error codes (auth)

| Code | HTTP | Mô tả |
|------|------|-------|
| `INVALID_CREDENTIALS` | 401 | Email hoặc mật khẩu sai |
| `ACCOUNT_INACTIVE` | 403 | Tài khoản bị khóa |
| `SESSION_EXPIRED` | 401 | Refresh token hết hạn |
| `SESSION_REVOKED` | 401 | Session đã bị thu hồi |
| `SCHOOL_ACCESS_DENIED` | 403 | Không có membership tại trường |
| `UNAUTHORIZED` | 401 | Thiếu hoặc token không hợp lệ |
