# Sprint 10 – API Endpoints (Platform: vận hành & hỗ trợ)

> Bổ sung trên Sprint 9. Chỉ `SYSTEM_ADMIN` (trừ banner impersonation ảnh hưởng session tenant).

## Quy ước chung

| Hạng mục | Quy ước |
|----------|---------|
| Prefix | `/api/v1/platform` |
| Impersonation | JWT access token mới — claim `impersonatedBy`, `activeSchoolId` = trường target |
| Audit log | Append-only — không PATCH/DELETE |

---

## Overview & health

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/platform/overview` | Thống kê aggregate toàn nền tảng |
| GET | `/platform/health` | DB + R2 + PDF renderer |

### GET /platform/overview

**Response 200**

```json
{
  "data": {
    "schoolCount": {
      "active": 3,
      "suspended": 1,
      "inactive": 0,
      "total": 4
    },
    "userCountByRole": {
      "SYSTEM_ADMIN": 1,
      "SCHOOL_ADMIN": 3,
      "TEACHER": 42,
      "STUDENT": 1200,
      "PARENT": 800
    },
    "recentSchools": [
      {
        "id": "clx...",
        "code": "SCHOOL_C",
        "name": "Trường THPT C",
        "status": "ACTIVE",
        "createdAt": "2026-08-01T00:00:00.000Z"
      }
    ]
  }
}
```

### GET /platform/health

**Response 200**

```json
{
  "data": {
    "status": "ok",
    "checks": {
      "database": { "status": "up", "latencyMs": 12 },
      "objectStorage": { "status": "up" },
      "pdfRenderer": { "status": "up", "browser": "bundled-chrome" }
    },
    "checkedAt": "2026-08-10T12:00:00.000Z"
  }
}
```

`status`: `ok` \| `degraded` \| `down` — nếu một check fail nghiêm trọng.

---

## Impersonation

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/platform/schools/:id/impersonate` | Bắt đầu session xem/thao tác như school admin |
| POST | `/platform/impersonation/end` | Kết thúc — clear `activeSchoolId` |

### POST /platform/schools/:id/impersonate

**Body (optional)**

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `mode` | string | `read_only` (default) \| `full` — phase 10A chốt một mode |

**Điều kiện**

- Trường target `status === ACTIVE`
- Actor là `SYSTEM_ADMIN`

**Response 200**

```json
{
  "data": {
    "impersonation": {
      "targetSchoolId": "clx...",
      "targetSchoolName": "Trường THPT Demo",
      "impersonatedBy": "clx-system-admin-id",
      "mode": "read_only",
      "startedAt": "2026-08-10T12:00:00.000Z"
    },
    "redirectTo": "/"
  }
}
```

Set cookie access token mới (httpOnly). Client redirect dashboard trường.

**Lỗi**

| Code | HTTP | Mô tả |
|------|------|-------|
| `SCHOOL_NOT_ACTIVE` | 403 | Trường suspended/inactive |
| `IMPERSONATION_FORBIDDEN` | 403 | Không phải system admin |

---

### POST /platform/impersonation/end

Không body. Xóa context impersonation; phát lại access token **không** có `activeSchoolId`.

**Response 200**

```json
{
  "data": {
    "ended": true,
    "redirectTo": "/platform"
  }
}
```

---

## School admin ops

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/platform/schools/:id/admin/reset-password` | Reset mật khẩu school admin chính |

### POST /platform/schools/:id/admin/reset-password

**Body (optional)**

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `newPassword` | string | Nếu bỏ trống — server sinh mật khẩu tạm 16 ký tự |

**Response 200**

```json
{
  "data": {
    "adminUserId": "clx...",
    "email": "school_admin@demo.edu.vn",
    "temporaryPassword": "Xk9#mP2vQw7nRt4L"
  }
}
```

> `temporaryPassword` chỉ trả **một lần** — client hiển thị copy; ghi audit log.

---

## Audit logs

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/platform/audit-logs` | Danh sách log (pagination, filter) |

### GET /platform/audit-logs

**Query**

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `page` | number | Default 1 |
| `pageSize` | number | Default 50 |
| `schoolId` | string | Lọc theo trường |
| `action` | string | VD: `SCHOOL_CREATED`, `IMPERSONATE_START` |
| `from` | ISO date | Từ ngày |
| `to` | ISO date | Đến ngày |

**Response 200**

```json
{
  "data": {
    "items": [
      {
        "id": "clx...",
        "action": "IMPERSONATE_START",
        "actorUserId": "clx...",
        "actorEmail": "system_admin@demo.edu.vn",
        "targetSchoolId": "clx...",
        "targetSchoolCode": "DEMO",
        "metadata": { "mode": "read_only" },
        "createdAt": "2026-08-10T12:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "pageSize": 50, "total": 120, "totalPages": 3 }
  }
}
```

### Action enum (MVP)

| Action | Khi nào ghi |
|--------|-------------|
| `SCHOOL_CREATED` | POST /platform/schools |
| `SCHOOL_STATUS_CHANGED` | PATCH status |
| `SCHOOL_UPDATED` | PATCH metadata |
| `ADMIN_PASSWORD_RESET` | POST reset-password |
| `IMPERSONATE_START` | POST impersonate |
| `IMPERSONATE_END` | POST impersonation/end |

---

## JWT claims (impersonation)

Access token khi impersonate:

```json
{
  "sub": "system-admin-user-id",
  "role": "SYSTEM_ADMIN",
  "activeSchoolId": "target-school-id",
  "impersonatedBy": "system-admin-user-id",
  "impersonationMode": "read_only"
}
```

Frontend đọc `impersonatedBy` (hoặc flag riêng từ `/auth/me`) để hiển thị banner.

---

## E2E checklist

| # | Case |
|---|------|
| 1 | Impersonate ACTIVE school → token có `activeSchoolId` target |
| 2 | Impersonate SUSPENDED → 403 |
| 3 | End impersonation → về platform context |
| 4 | Reset password → audit row `ADMIN_PASSWORD_RESET` |
| 5 | Suspend school → audit row `SCHOOL_STATUS_CHANGED` |

---

## Tài liệu liên quan

| Tài liệu | Nội dung |
|----------|----------|
| [sprint-10-plan.md](../sprints/sprint-10-plan.md) | Kế hoạch sprint |
| [sprint9-endpoints.md](./sprint9-endpoints.md) | API Sprint 9 |
| [007-defer-audit-logs.md](../decisions/007-defer-audit-logs.md) | Audit toàn tenant (vẫn hoãn) |
