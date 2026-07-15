# API Sprint 1

Danh sách endpoint dự kiến cho Sprint 1. Chi tiết request/response sẽ được bổ sung vào Swagger khi triển khai.

## Auth

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/auth/login` | Public | Đăng nhập |
| POST | `/auth/logout` | Required | Đăng xuất |
| POST | `/auth/refresh` | Cookie refresh | Làm mới token |
| GET | `/auth/me` | Required | Thông tin session hiện tại |
| POST | `/auth/switch-school` | Required | Chuyển trường active |

### POST /auth/login

**Request:**

```json
{
  "email": "admin@demo.edu.vn",
  "password": "Admin@123456"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@demo.edu.vn",
      "fullName": "Quản trị viên Demo",
      "status": "ACTIVE"
    },
    "schools": [
      {
        "id": "uuid",
        "code": "DEMO",
        "name": "Trường THPT Demo",
        "shortName": "THPT Demo",
        "roles": [
          { "code": "SCHOOL_ADMIN", "name": "Quản trị trường" }
        ]
      }
    ],
    "activeSchoolId": "uuid",
    "permissions": ["user:manage", "role:manage", "school:read", "..."]
  },
  "message": "Đăng nhập thành công"
}
```

**Cookies set:** `access_token`, `refresh_token`

---

### GET /auth/me

**Response 200:**

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "fullName": "..." },
    "activeSchoolId": "...",
    "activeSchool": { "id": "...", "code": "DEMO", "name": "..." },
    "permissions": ["user:manage", "..."]
  }
}
```

---

### POST /auth/switch-school

**Request:**

```json
{
  "schoolId": "uuid"
}
```

**Response 200:** Giống `/auth/me` với `activeSchoolId` mới.

---

## Schools (trong tenant)

| Method | Path | Permission | Mô tả |
|--------|------|------------|-------|
| GET | `/schools/current` | `school:read` | Thông tin trường active |
| PATCH | `/schools/current` | `school:update` | Cập nhật trường active |

> Sprint 1 **không có** `POST /schools` (tạo trường). Tạo trường qua seed.

### GET /schools/current

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "DEMO",
    "name": "Trường THPT Demo",
    "shortName": "THPT Demo",
    "schoolType": "THPT",
    "email": null,
    "phone": null,
    "address": null,
    "status": "ACTIVE"
  }
}
```

---

## Users (trong tenant)

| Method | Path | Permission | Mô tả |
|--------|------|------------|-------|
| GET | `/users` | `user:read` | Danh sách user trong trường |
| GET | `/users/:id` | `user:read` | Chi tiết user |
| POST | `/users` | `user:create` | Tạo user + membership |
| PATCH | `/users/:id` | `user:update` | Cập nhật thông tin |
| PATCH | `/users/:id/status` | `user:manage` | Khóa/mở tài khoản |

### GET /users

**Query:** `page`, `limit`, `search`, `sortBy`, `sortOrder`, `status`

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "gv01@demo.edu.vn",
      "fullName": "Nguyễn Văn A",
      "status": "ACTIVE",
      "membership": {
        "id": "uuid",
        "status": "ACTIVE",
        "roles": [{ "code": "TEACHER", "name": "Giáo viên" }]
      },
      "joinedAt": "2026-07-15T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

---

### POST /users

Tạo user mới và gán membership vào trường active.

**Request:**

```json
{
  "email": "gv01@demo.edu.vn",
  "fullName": "Nguyễn Văn A",
  "password": "Temp@123456",
  "roleIds": ["uuid-role-teacher"]
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "gv01@demo.edu.vn",
    "fullName": "Nguyễn Văn A",
    "status": "ACTIVE",
    "membership": {
      "id": "uuid",
      "roles": [{ "code": "TEACHER", "name": "Giáo viên" }]
    }
  },
  "message": "Tạo người dùng thành công"
}
```

---

## Roles (trong tenant)

| Method | Path | Permission | Mô tả |
|--------|------|------------|-------|
| GET | `/roles` | `role:read` | Danh sách vai trò |
| GET | `/roles/:id` | `role:read` | Chi tiết vai trò + permissions |
| POST | `/roles` | `role:manage` | Tạo vai trò tùy chỉnh |
| PATCH | `/roles/:id` | `role:manage` | Cập nhật vai trò |
| PUT | `/roles/:id/permissions` | `role:manage` | Gán permissions cho vai trò |

### GET /roles

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "SCHOOL_ADMIN",
      "name": "Quản trị trường",
      "isSystem": true,
      "permissionCount": 9
    },
    {
      "id": "uuid",
      "code": "TEACHER",
      "name": "Giáo viên",
      "isSystem": true,
      "permissionCount": 0
    }
  ]
}
```

---

## Memberships

| Method | Path | Permission | Mô tả |
|--------|------|------------|-------|
| PUT | `/memberships/:id/roles` | `role:manage` | Gán roles cho membership |
| PATCH | `/memberships/:id/status` | `user:manage` | Suspend/activate membership |

---

## Permissions

| Method | Path | Permission | Mô tả |
|--------|------|------------|-------|
| GET | `/permissions` | `role:read` | Danh sách permissions (catalog) |

---

## Audit logs

| Method | Path | Permission | Mô tả |
|--------|------|------------|-------|
| GET | `/audit-logs` | `audit:read` | Nhật ký hệ thống (trong tenant) |

**Query:** `page`, `limit`, `action`, `resourceType`, `actorUserId`, `from`, `to`

---

## Health

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/health` | Public | Trạng thái API + database |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "timestamp": "2026-07-15T08:00:00.000Z"
  }
}
```

---

## Frontend routes (tiếng Việt)

| Path | Trang | Permission |
|------|-------|------------|
| `/dang-nhap` | Đăng nhập | Public |
| `/chon-truong` | Chọn trường | Auth |
| `/` | Dashboard | Auth |
| `/nguoi-dung` | Quản lý người dùng | `user:read` |
| `/vai-tro` | Quản lý vai trò | `role:read` |
| `/cai-dat-truong` | Cài đặt trường | `school:read` |
| `/nhat-ky` | Nhật ký hệ thống | `audit:read` |

---

## Test coverage bắt buộc Sprint 1

| Test case | Mô tả |
|-----------|-------|
| Login success | Cookie được set, trả đúng user + schools |
| Login fail | Sai mật khẩu → 401 |
| Refresh rotation | Token cũ bị revoke sau refresh |
| Logout | Session revoked, cookie cleared |
| Tenant isolation | User trường A không đọc user trường B |
| Permission guard | TEACHER không gọi được POST /users |
| Switch school | Token mới có activeSchoolId đúng |
