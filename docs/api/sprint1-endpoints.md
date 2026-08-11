# API Sprint 1

Danh sách endpoint dự kiến cho Sprint 1. Chi tiết request/response sẽ được bổ sung vào Swagger khi triển khai.

> Phân quyền theo **role enum** (`SCHOOL_ADMIN`, `TEACHER`, `STUDENT`) — không dùng permission codes. Xem [ADR 008](../decisions/008-simplify-rbac-mvp.md).

## Auth

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/auth/login` | Public | Đăng nhập |
| POST | `/auth/logout` | Required | Đăng xuất (xóa cookie) |
| POST | `/auth/refresh` | Cookie refresh | Làm mới token |
| GET | `/auth/me` | Required | Thông tin session hiện tại |

> **Ngoài MVP:** `POST /auth/switch-school` — xem [ADR 006](../decisions/006-defer-switch-school.md)

### POST /auth/login

**Request:**

```json
{
  "identifier": "HS-261",
  "password": "Demo@123456"
}
```

Cũng chấp nhận `email` (tương thích ngược) thay cho `identifier`.

| `identifier` | Ai dùng |
|--------------|---------|
| Email (`…@…`) | SCHOOL_ADMIN / SYSTEM_ADMIN (và tài khoản còn login email) |
| Mã `HS-…` / `GV-…` / `PH-…` | Học sinh / giáo viên / phụ huynh (hồ sơ đã gắn user) |
| SĐT | HS / GV / PH — khớp `phone` trên hồ sơ đã gắn user |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@demo.edu.vn",
      "fullName": "Quản trị viên Demo",
      "role": "SCHOOL_ADMIN",
      "status": "ACTIVE"
    },
    "activeSchoolId": "uuid",
    "activeSchool": {
      "id": "uuid",
      "code": "DEMO",
      "name": "Trường THPT Demo",
      "shortName": "THPT Demo"
    }
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
    "user": {
      "id": "...",
      "email": "...",
      "fullName": "...",
      "role": "SCHOOL_ADMIN"
    },
    "activeSchoolId": "...",
    "activeSchool": { "id": "...", "code": "DEMO", "name": "..." }
  }
}
```

---

## Schools (trong tenant)

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/schools/current` | Any | Thông tin trường active |
| PATCH | `/schools/current` | `SCHOOL_ADMIN` | Cập nhật trường active |

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

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/users` | `SCHOOL_ADMIN` | Danh sách user trong trường |
| GET | `/users/:id` | `SCHOOL_ADMIN` | Chi tiết user |
| POST | `/users` | `SCHOOL_ADMIN` | Tạo user (gán role, school_id = active) |
| PATCH | `/users/:id` | `SCHOOL_ADMIN` | Cập nhật thông tin / role |
| PATCH | `/users/:id/status` | `SCHOOL_ADMIN` | Khóa/mở tài khoản |

### GET /users

**Query:** `page`, `limit`, `search`, `sortBy`, `sortOrder`, `status`, `role`

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "gv01@demo.edu.vn",
      "fullName": "Nguyễn Văn A",
      "role": "TEACHER",
      "status": "ACTIVE",
      "createdAt": "2026-07-15T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

---

### POST /users

Tạo user mới trong trường active.

**Request:**

```json
{
  "email": "gv01@demo.edu.vn",
  "fullName": "Nguyễn Văn A",
  "password": "Temp@123456",
  "role": "TEACHER"
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
    "role": "TEACHER",
    "status": "ACTIVE"
  },
  "message": "Tạo người dùng thành công"
}
```

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

| Path | Trang | Role |
|------|-------|------|
| `/login` | Đăng nhập | Public |
| `/` | Dashboard | Auth |
| `/users` | Quản lý người dùng | `SCHOOL_ADMIN` |
| `/school-settings` | Cài đặt trường | `SCHOOL_ADMIN` |

---

## Ngoài MVP Sprint 1

Các endpoint sau **không triển khai** trong Sprint 1:

- `GET/POST/PATCH /roles`, `PUT /roles/:id/permissions`
- `PUT /memberships/:id/roles`, `PATCH /memberships/:id/status`
- `GET /permissions`
- `POST /auth/switch-school`

Sẽ thêm khi nâng cấp RBAC / multi-school — xem [ADR 008](../decisions/008-simplify-rbac-mvp.md).

---

## Test coverage bắt buộc Sprint 1

| Test case | Mô tả |
|-----------|-------|
| Login success | Cookie set, trả user + activeSchool + role |
| Login fail | Sai mật khẩu → 401 |
| Refresh | Access token mới khi refresh JWT hợp lệ |
| Logout | Cookie cleared |
| Tenant isolation | User trường A không đọc user trường B |
| Role guard | TEACHER không gọi được POST /users |
