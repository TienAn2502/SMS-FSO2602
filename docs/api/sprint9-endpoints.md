# Sprint 9 – API Endpoints (Platform: quản lý trường)

> Module platform — prefix `/platform/*`. Chỉ role `SYSTEM_ADMIN`. Không dùng `TenantGuard`.

## Quy ước chung

| Hạng mục | Quy ước |
|----------|---------|
| Auth | Cookie JWT (giống [conventions.md](./conventions.md)) |
| Guard | `PlatformGuard` — `user.role === SYSTEM_ADMIN` |
| Prefix | `/api/v1/platform` |
| Response | Wrapper `{ data, meta }` (interceptor chung) |
| Lỗi nghiệp vụ | `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT`, `422 VALIDATION_ERROR` |

### Mã lỗi đặc thù

| Code | HTTP | Mô tả |
|------|------|-------|
| `SCHOOL_CODE_EXISTS` | 409 | `code` trường đã tồn tại |
| `ADMIN_EMAIL_EXISTS` | 409 | Email admin đã dùng bởi user khác |
| `SCHOOL_SUSPENDED` | 403 | Login school admin khi trường không ACTIVE |
| `PLATFORM_FORBIDDEN` | 403 | User không phải SYSTEM_ADMIN |

---

## Schools (Platform)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/platform/schools` | Danh sách trường (pagination + filter status) |
| GET | `/platform/schools/:id` | Chi tiết trường + admin chính (summary) |
| POST | `/platform/schools` | Tạo trường + school admin đầu tiên |
| PATCH | `/platform/schools/:id` | Cập nhật metadata (name, shortName, schoolType) |
| PATCH | `/platform/schools/:id/status` | Đổi trạng thái ACTIVE / INACTIVE / SUSPENDED |

---

### GET /platform/schools

**Query**

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `page` | number | Default 1 |
| `pageSize` | number | Default 20, max 100 |
| `status` | string | `ACTIVE` \| `INACTIVE` \| `SUSPENDED` |
| `search` | string | Tìm theo `code`, `name` |

**Response 200**

```json
{
  "data": {
    "items": [
      {
        "id": "clx...",
        "code": "DEMO",
        "name": "Trường THPT Demo",
        "shortName": "THPT Demo",
        "schoolType": "THPT",
        "status": "ACTIVE",
        "createdAt": "2026-01-15T00:00:00.000Z",
        "adminSummary": {
          "userId": "clx...",
          "email": "school_admin@demo.edu.vn",
          "fullName": "Quản trị viên Demo"
        }
      }
    ],
    "pagination": { "page": 1, "pageSize": 20, "total": 2, "totalPages": 1 }
  }
}
```

> Danh sách chỉ gồm trường thật (không còn tenant ảo).

---

### GET /platform/schools/:id

**Response 200**

```json
{
  "data": {
    "id": "clx...",
    "code": "SCHOOL_B",
    "name": "Trường THCS B",
    "shortName": "THCS B",
    "schoolType": "THCS",
    "status": "ACTIVE",
    "address": null,
    "phone": null,
    "createdAt": "2026-08-10T00:00:00.000Z",
    "updatedAt": "2026-08-10T00:00:00.000Z",
    "adminSummary": {
      "userId": "clx...",
      "email": "admin_b@school.edu.vn",
      "fullName": "Quản trị viên THCS B",
      "lastLoginAt": null
    },
    "stats": {
      "studentCount": 0,
      "teacherCount": 0
    }
  }
}
```

`stats` — count đơn giản (optional Sprint 9; có thể defer Sprint 10 overview).

---

### POST /platform/schools

Tạo trường mới và user `SCHOOL_ADMIN` trong một transaction.

**Body**

| Field | Kiểu | Bắt buộc | Ghi chú |
|-------|------|----------|---------|
| `code` | string | Có | Unique, `[A-Za-z0-9_-]{2,50}` |
| `name` | string | Có | Max 200 |
| `shortName` | string | Không | Max 100 |
| `schoolType` | enum | Không | `TH` \| `THCS` \| `THPT` |
| `adminEmail` | string | Có | Email unique toàn bảng users |
| `adminPassword` | string | Có | Min 8 ký tự |
| `adminFullName` | string | Không | Default: `"Quản trị viên {name}"` |

**Request ví dụ**

```json
{
  "code": "SCHOOL_B",
  "name": "Trường THCS B",
  "shortName": "THCS B",
  "schoolType": "THCS",
  "adminEmail": "admin_b@school.edu.vn",
  "adminPassword": "SchoolAdmin@123456",
  "adminFullName": "Nguyễn Văn Admin"
}
```

**Response 201**

```json
{
  "data": {
    "school": {
      "id": "clx...",
      "code": "SCHOOL_B",
      "name": "Trường THCS B",
      "status": "ACTIVE"
    },
    "admin": {
      "id": "clx...",
      "email": "admin_b@school.edu.vn",
      "fullName": "Nguyễn Văn Admin",
      "role": "SCHOOL_ADMIN"
    }
  }
}
```

**Lỗi 409**

```json
{
  "statusCode": 409,
  "code": "SCHOOL_CODE_EXISTS",
  "message": "Mã trường đã tồn tại"
}
```

---

### PATCH /platform/schools/:id

Cập nhật metadata — **không** đổi `code`, **không** đổi status (endpoint riêng).

**Body (partial)**

| Field | Kiểu |
|-------|------|
| `name` | string |
| `shortName` | string \| null |
| `schoolType` | enum |
| `address` | string \| null |
| `phone` | string \| null |

**Response 200** — object trường đã cập nhật.

---

### PATCH /platform/schools/:id/status

**Body**

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `status` | enum | `ACTIVE` \| `INACTIVE` \| `SUSPENDED` |

**Response 200**

```json
{
  "data": {
    "id": "clx...",
    "code": "SCHOOL_B",
    "status": "SUSPENDED",
    "updatedAt": "2026-08-10T12:00:00.000Z"
  }
}
```

**Hệ quả:** User thuộc trường `SUSPENDED` / `INACTIVE` không login được. `SYSTEM_ADMIN` (`school_id = null`) không bị ảnh hưởng bởi status trường.

---

## Auth (thay đổi Sprint 9)

### POST /auth/login

Bổ sung kiểm tra khi user là `SCHOOL_ADMIN` (hoặc mọi role tenant):

```text
if school.status !== ACTIVE → 403 SCHOOL_SUSPENDED
```

**Response 403**

```json
{
  "statusCode": 403,
  "code": "SCHOOL_SUSPENDED",
  "message": "Trường đang bị tạm khóa. Vui lòng liên hệ quản trị nền tảng."
}
```

System admin (`SYSTEM_ADMIN`, `school_id = null`) **không** bị chặn bởi status trường — không gắn tenant khi login bình thường.

---

## Phân quyền

| Route | SYSTEM_ADMIN | SCHOOL_ADMIN | Khác |
|-------|--------------|--------------|------|
| `/platform/*` | ✅ | ❌ 403 | ❌ 403 |
| `/schools/current` | ❌ (cần impersonate) | ✅ | Theo role |
| Tenant CRUD (Sprint 1–8) | ❌ | ✅ | Theo role |

---

## E2E checklist

| # | Case |
|---|------|
| 1 | System admin `GET /platform/schools` → 200 |
| 2 | School admin `GET /platform/schools` → 403 |
| 3 | `POST /platform/schools` → login admin mới → `GET /schools/current` đúng trường |
| 4 | Suspend trường → school admin login → 403 `SCHOOL_SUSPENDED` |
| 5 | Trùng `code` → 409 |

---

## Tài liệu liên quan

| Tài liệu | Nội dung |
|----------|----------|
| [sprint-9-plan.md](../sprints/sprint-9-plan.md) | Kế hoạch sprint |
| [013-platform-admin-module.md](../decisions/013-platform-admin-module.md) | ADR |
| [sprint10-endpoints.md](./sprint10-endpoints.md) | Sprint tiếp theo (impersonation, audit) |
