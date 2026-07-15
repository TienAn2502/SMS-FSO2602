# Quy ước REST API

## Base URL

```text
/api/v1
```

Ví dụ: `http://localhost:8080/api/v1/auth/login`

## Response format

### Thành công

```json
{
  "success": true,
  "data": {},
  "message": "Thao tác thành công"
}
```

`message` có thể `null` hoặc bỏ qua cho GET request đơn giản.

### Lỗi

```json
{
  "success": false,
  "code": "STUDENT_NOT_FOUND",
  "message": "Không tìm thấy học sinh",
  "details": []
}
```

`details` dùng cho lỗi validation:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "details": [
    {
      "field": "email",
      "message": "Email không đúng định dạng"
    }
  ]
}
```

## HTTP status codes

| Status | Khi nào dùng |
|--------|--------------|
| 200 | GET, PATCH, DELETE thành công |
| 201 | POST tạo mới thành công |
| 400 | Validation error, bad request |
| 401 | Chưa đăng nhập, token hết hạn |
| 403 | Không có quyền |
| 404 | Resource không tồn tại (trong tenant) |
| 409 | Conflict (trùng email, trùng code, ...) |
| 422 | Business rule violation |
| 500 | Lỗi server không mong đợi |

## Error codes

Quy tắc đặt tên: `SCREAMING_SNAKE_CASE`, ổn định cho frontend.

| Nhóm | Ví dụ |
|------|-------|
| Auth | `INVALID_CREDENTIALS`, `SESSION_EXPIRED`, `UNAUTHORIZED` |
| Permission | `FORBIDDEN`, `PERMISSION_DENIED` |
| Validation | `VALIDATION_ERROR` |
| Resource | `USER_NOT_FOUND`, `SCHOOL_NOT_FOUND` |
| Conflict | `EMAIL_ALREADY_EXISTS`, `ROLE_CODE_EXISTS` |
| Tenant | `SCHOOL_ACCESS_DENIED`, `TENANT_MISMATCH` |

Frontend map error code → thông báo tiếng Việt.

## Pagination

### Query parameters

| Param | Kiểu | Mặc định | Mô tả |
|-------|------|----------|-------|
| `page` | number | 1 | Trang hiện tại |
| `limit` | number | 20 | Số bản ghi/trang (max 100) |
| `search` | string | | Tìm kiếm full-text |
| `sortBy` | string | `createdAt` | Cột sắp xếp |
| `sortOrder` | `asc`\|`desc` | `desc` | Thứ tự |

### Response

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "message": null
}
```

## Request conventions

| Quy ước | Chi tiết |
|---------|----------|
| Content-Type | `application/json` |
| Auth | HttpOnly cookie (tự động gửi với `credentials: include`) |
| ID format | UUID v4 |
| Date | ISO 8601 (`2026-07-15T08:00:00.000Z`) |
| Enum | SCREAMING_SNAKE_CASE trong JSON |

## Naming conventions

| Loại | Quy ước | Ví dụ |
|------|---------|-------|
| Path | kebab-case, số nhiều | `/api/v1/auth/switch-school` |
| Query param | camelCase | `?sortBy=createdAt` |
| JSON body key | camelCase | `{ "fullName": "..." }` |
| Error code | SCREAMING_SNAKE | `USER_NOT_FOUND` |

## Quy tắc bảo mật

1. **Không trả entity database trực tiếp** – dùng DTO/mapper
2. **Không lộ** `password_hash`, `refresh_token_hash`
3. **Không tin `schoolId` từ request** – lấy từ auth context
4. Mọi truy vấn theo ID phải kèm tenant filter
5. Swagger cập nhật cùng mỗi endpoint mới

## Swagger

```text
Development: http://localhost:8080/api/docs
```

Cấu hình NestJS Swagger tại `/api/docs` (ngoài prefix `/api/v1`).

## Request ID

Mỗi request có header response:

```text
X-Request-Id: <uuid>
```

Dùng để liên kết log API và audit log.

## Validation

- Backend: `class-validator` + `class-transformer` (NestJS ValidationPipe)
- Frontend: Zod schema (tương thích nhưng không thay thế validation backend)
- UUID param: ParseUUIDPipe
- Pagination: custom pipe validate range

## CORS (frontend gọi API)

```typescript
// client – axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});
```

## Versioning

MVP dùng URL prefix `/api/v1`. Breaking change → `/api/v2`.

Không dùng header versioning trong MVP.

## Endpoint không cần auth

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/auth/login` | Đăng nhập |
| POST | `/api/v1/auth/refresh` | Refresh token |

Tất cả endpoint khác yêu cầu access token hợp lệ.
