# Authentication (MVP Sprint 1)

## Tổng quan

MVP dùng **JWT stateless** — access token + refresh token qua **HttpOnly Cookie**. Không lưu token vào DB hay Redis.

Xác thực access token dùng **Passport JWT** (`passport-jwt`) — đọc token từ cookie `access_token`.

Quyết định: [ADR 005](../decisions/005-session-storage.md)

Phân quyền đơn giản theo role enum — [ADR 008](../decisions/008-simplify-rbac-mvp.md)

## Token

### Access Token

| Thuộc tính | Giá trị |
|------------|---------|
| Thời hạn | 15 phút (`JWT_ACCESS_EXPIRES_IN`) |
| Cookie | `access_token`, HttpOnly |
| Payload | `{ sub, activeSchoolId }` |

**Vai trò:** Xác định user + tenant (trường). `activeSchoolId = user.school_id`.

Role **không** nằm trong JWT — load từ DB khi login / `/auth/me`.

### Refresh Token

| Thuộc tính | Giá trị |
|------------|---------|
| Thời hạn | 7 ngày (`JWT_REFRESH_EXPIRES_IN`) |
| Cookie | `refresh_token`, HttpOnly, path `/api/v1/auth/refresh` |
| Payload | `{ sub }` (tối thiểu) |

**Vai trò:** Lấy access token mới khi hết hạn. Verify chữ ký + expiry — không tra DB.

---

## Luồng đăng nhập

```text
POST /api/v1/auth/login
  Body: { email, password }

1. Tìm user theo email
2. Kiểm tra status = ACTIVE
3. Verify password (bcrypt)
4. Set activeSchoolId = user.school_id
5. Ký access JWT + refresh JWT
6. Set HttpOnly cookies
7. Trả user info + activeSchool + role
```

Response (token **không** trả trong body):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "admin@demo.edu.vn",
      "fullName": "Quản trị viên Demo",
      "role": "SCHOOL_ADMIN"
    },
    "activeSchoolId": "...",
    "activeSchool": {
      "id": "...",
      "code": "DEMO",
      "name": "Trường THPT Demo"
    }
  },
  "message": "Đăng nhập thành công"
}
```

---

## Luồng refresh

```text
POST /api/v1/auth/refresh
  Cookie: refresh_token

1. Verify chữ ký refresh JWT
2. Kiểm tra chưa hết hạn
3. Load user, kiểm tra status ACTIVE
4. Set activeSchoolId = user.school_id
5. Phát access JWT (+ refresh JWT mới — optional rotate không state)
6. Set cookies
```

---

## Luồng logout

```text
POST /api/v1/auth/logout
  Cookie: access_token

1. Xóa cookies access_token + refresh_token
```

**MVP:** Không revoke server-side. Token còn valid đến hết TTL — chấp nhận theo ADR 005.

---

## Luồng session hiện tại

```text
GET /api/v1/auth/me
  Cookie: access_token

→ Decode JWT → sub, activeSchoolId
→ Trả user, activeSchool, role
```

---

## Cookie configuration

### Development

```typescript
// access_token
{ httpOnly: true, secure: false, sameSite: 'lax', path: '/' }

// refresh_token
{ httpOnly: true, secure: false, sameSite: 'lax', path: '/api/v1/auth/refresh' }
```

### Production

```typescript
{ httpOnly: true, secure: true, sameSite: 'lax' }
```

---

## CSRF và CORS

| Biện pháp | Mô tả |
|-----------|-------|
| CORS | Origin cụ thể, `credentials: true` |
| SameSite | `lax` |
| Origin check | Mutation request (POST, PUT, PATCH, DELETE) |

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
});
```

---

## Mật khẩu

- Hash **bcrypt** (cost 12)
- Không trả `password_hash` trong API
- Không ghi password vào audit log

---

## Bảo vệ route

### Backend

```text
@Public()        → login, refresh, health
JwtAuthGuard      → Passport AuthGuard('jwt-access'), global
TenantGuard       → API nghiệp vụ cần activeSchoolId
RoleGuard         → Kiểm tra role enum (SCHOOL_ADMIN, TEACHER, ...)
```

### Frontend (MVP)

```text
ProtectedRoute    → Chưa auth → /login
RoleGate          → Ẩn UI theo role
```

**Không có** `SchoolRequired` / `/chon-truong` trong MVP.

---

## Error codes (auth)

| Code | HTTP | Mô tả |
|------|------|-------|
| `INVALID_CREDENTIALS` | 401 | Email/mật khẩu sai |
| `ACCOUNT_INACTIVE` | 403 | Tài khoản khóa |
| `SESSION_EXPIRED` | 401 | Token hết hạn |
| `UNAUTHORIZED` | 401 | Token không hợp lệ |
| `FORBIDDEN` | 403 | Role không đủ quyền |

---

## Backlog: Chuyển trường (switch-school)

> **Ngoài MVP Sprint 1** — tham khảo khi triển khai [ADR 006](../decisions/006-defer-switch-school.md)

Khi user thuộc nhiều trường (cần thêm lại `school_memberships`), cần endpoint riêng để đổi `activeSchoolId`:

```text
POST /api/v1/auth/switch-school
Body: { schoolId }
```

Frontend bổ sung: `/chon-truong`, header "Đổi trường".

---

## Triển khai (Phase 1C ✅)

### Endpoints

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| POST | `/auth/login` | `@Public()` | Đăng nhập, set cookies |
| POST | `/auth/refresh` | `@Public()` | Refresh token từ cookie |
| POST | `/auth/logout` | JwtAuthGuard | Xóa cookies |
| GET | `/auth/me` | JwtAuthGuard | Session hiện tại |

### Cấu trúc code

```text
server/src/
├── common/
│   ├── auth/
│   │   ├── auth.constants.ts
│   │   ├── auth.types.ts
│   │   ├── cookie.service.ts
│   │   ├── jwt-token.service.ts
│   │   └── strategies/
│   │       └── jwt-access.strategy.ts  # Passport JWT (cookie)
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── roles.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts      # AuthGuard('jwt-access') + @Public()
│   │   ├── tenant.guard.ts        # Dùng cho API nghiệp vụ Phase 1D
│   │   └── roles.guard.ts         # Kiểm tra @Roles()
│   └── utils/
│       └── password.service.ts    # bcrypt hash/verify
└── modules/auth/
    ├── auth.module.ts
    ├── auth.controller.ts
    ├── auth.service.ts
    ├── schemas/login.schema.ts
    └── mappers/auth.mapper.ts
```

### Dùng guard cho API Phase 1D

```typescript
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
@Get('users')
listUsers(@CurrentUser() user: AuthenticatedUser) { ... }
```
