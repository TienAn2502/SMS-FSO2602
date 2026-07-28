# API Sprint 3

Danh sách endpoint dự kiến cho Sprint 3 — học sinh, ghi danh, upload file.

> Phân quyền: **`SCHOOL_ADMIN`** cho mọi endpoint ghi. GET MVP cũng admin-only.  
> Quy ước chung: [conventions.md](./conventions.md)  
> Schema: [schema-sprint3.md](../database/schema-sprint3.md)

## Tổng quan

| Module | Base path | Role (MVP) |
|--------|-----------|------------|
| Học sinh | `/students` | `SCHOOL_ADMIN` |
| Ghi danh | `/student-enrollments` | `SCHOOL_ADMIN` |
| File | `/files` | `SCHOOL_ADMIN` |

Tất cả request đã auth — `schoolId` lấy từ JWT, **không** gửi từ client.

---

## Students

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/students` | Danh sách (pagination, search) |
| GET | `/students/:id` | Chi tiết + enrollment hiện tại |
| POST | `/students` | Tạo hồ sơ HS |
| PATCH | `/students/:id` | Cập nhật hồ sơ |
| PATCH | `/students/:id/status` | ACTIVE / INACTIVE |
| POST | `/students/:id/link-user` | Gắn tài khoản user STUDENT có sẵn |
| POST | `/students/:id/create-user` | Tạo user + gắn (email, password) |

### GET /students — Query params

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `page` | number | Trang (default 1) |
| `limit` | number | Số bản ghi (default 20, max 100) |
| `search` | string | Tìm theo tên, email user |
| `status` | enum | ACTIVE, INACTIVE |
| `homeroomClassId` | uuid | Filter HS đang học lớp HC (enrollment ACTIVE) |
| `semesterId` | uuid | Filter theo học kỳ ghi danh ACTIVE |
| `academicYearId` | uuid | Filter theo năm học (join qua `semester`) |

### POST /students

**Request (hồ sơ only — chưa login):**

```json
{
  "fullName": "Nguyễn Văn Mới",
  "dateOfBirth": "2009-05-20",
  "gender": "MALE",
  "phone": "0901234567",
  "address": "Quận 1, TP.HCM"
}
```

**Request (tạo kèm tài khoản):**

```json
{
  "fullName": "Nguyễn Văn Mới",
  "dateOfBirth": "2009-05-20",
  "gender": "MALE",
  "account": {
    "email": "newstudent@demo.edu.vn",
    "password": "Temp@123456"
  }
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid-or-null",
    "fullName": "Nguyễn Văn Mới",
    "dateOfBirth": "2009-05-20",
    "gender": "MALE",
    "status": "ACTIVE",
    "currentEnrollment": null
  },
  "message": "Tạo hồ sơ học sinh thành công"
}
```

**Lỗi:**

| Code | HTTP | Mô tả |
|------|------|-------|
| `EMAIL_ALREADY_EXISTS` | 409 | Email đã dùng (khi tạo account) |
| `USER_ALREADY_LINKED` | 409 | User đã gắn hồ sơ HS khác |
| `INVALID_STUDENT_USER` | 422 | User không phải STUDENT cùng trường |
| `STUDENT_NOT_FOUND` | 404 | Không tìm thấy học sinh |

### POST /students/:id/link-user

**Request:**

```json
{
  "userId": "uuid"
}
```

### POST /students/:id/create-user

**Request:**

```json
{
  "email": "newstudent@demo.edu.vn",
  "password": "Temp@123456"
}
```

---

## Student enrollments

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/student-enrollments` | Danh sách (filter) |
| GET | `/student-enrollments/:id` | Chi tiết |
| GET | `/students/:studentId/enrollments` | Lịch sử ghi danh của HS |
| POST | `/student-enrollments` | Ghi danh lớp HC |
| POST | `/student-enrollments/:id/transfer` | Chuyển lớp |
| PATCH | `/student-enrollments/:id/withdraw` | Rút / nghỉ lớp |

### POST /student-enrollments

**Request:**

```json
{
  "studentId": "uuid",
  "semesterId": "uuid",
  "homeroomClassId": "uuid",
  "enrolledAt": "2025-08-05",
  "note": "Ghi danh đầu HK1"
}
```

**Lỗi:**

| Code | HTTP | Mô tả |
|------|------|-------|
| `STUDENT_NOT_FOUND` | 404 | Không tìm thấy HS |
| `HOMEROOM_CLASS_NOT_FOUND` | 404 | Không tìm thấy lớp HC |
| `SEMESTER_NOT_FOUND` | 404 | Không tìm thấy học kỳ |
| `ENROLLMENT_ALREADY_ACTIVE` | 409 | HS đã có lớp ACTIVE trong học kỳ |
| `TENANT_MISMATCH` | 422 | FK không cùng trường / năm học |

### POST /student-enrollments/:id/transfer

Chuyển HS sang **lớp HC khác trong cùng trường** (không phải chuyển trường).

**Request:**

```json
{
  "targetHomeroomClassId": "uuid",
  "transferredAt": "2025-12-16",
  "note": "Chuyển từ 10A1 sang 10A2"
}
```

**Hành vi:** Transaction — enrollment cũ → `TRANSFERRED` + `left_at`; tạo enrollment mới `ACTIVE`.

### PATCH /student-enrollments/:id/withdraw

**Request:**

```json
{
  "leftAt": "2025-12-20",
  "note": "Chuyển trường nội bộ"
}
```

| Field | Bắt buộc | Mô tả |
|-------|----------|-------|
| `leftAt` | ❌ | Mặc định ngày hiện tại |
| `note` | ❌ | Ghi chú |

**Hành vi:** `status` → `WITHDRAWN`, set `left_at`.

---

## Files

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/files/upload` | Upload multipart (logo, avatar…) |
| GET | `/files/:id` | Metadata file |
| GET | `/files/:id/url` | Signed URL tải/xem |
| DELETE | `/files/:id` | Soft delete (status INACTIVE) |

### POST /files/upload

**Form data:**

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `file` | binary | File upload |
| `purpose` | enum | SCHOOL_LOGO, STUDENT_AVATAR, OTHER |

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "purpose": "SCHOOL_LOGO",
    "originalName": "logo.png",
    "mimeType": "image/png",
    "sizeBytes": 24500,
    "url": "https://..."
  },
  "message": "Upload thành công"
}
```

### PATCH /schools/current (mở rộng Sprint 1)

Gắn logo sau upload:

```json
{
  "logoFileId": "uuid"
}
```

---

## Error codes Sprint 3

| Code | Mô tả |
|------|-------|
| `STUDENT_NOT_FOUND` | Không tìm thấy học sinh |
| `ENROLLMENT_NOT_FOUND` | Không tìm thấy ghi danh |
| `ENROLLMENT_ALREADY_ACTIVE` | HS đã có lớp ACTIVE trong năm học |
| `ENROLLMENT_NOT_ACTIVE` | Enrollment không ở trạng thái ACTIVE |
| `USER_ALREADY_LINKED` | User đã gắn hồ sơ khác |
| `INVALID_STUDENT_USER` | User không hợp lệ để gắn HS |
| `FILE_NOT_FOUND` | Không tìm thấy file |
| `FILE_TOO_LARGE` | Vượt giới hạn dung lượng |
| `FILE_TYPE_NOT_ALLOWED` | MIME type không được phép |
| `R2_UPLOAD_FAILED` | Lỗi upload R2 |
| `TENANT_MISMATCH` | FK thuộc trường khác |

(Kế thừa error codes Sprint 1–2)

---

## UI routes (Frontend)

| Path | Trang | Auth |
|------|-------|------|
| `/students` | Danh sách học sinh | `SCHOOL_ADMIN` |
| `/students/:id` | Chi tiết + lịch sử ghi danh | `SCHOOL_ADMIN` |
| `/school-settings` | Upload logo (mở rộng) | `SCHOOL_ADMIN` |

---

## Ngoài MVP Sprint 3

- Import Excel HS hàng loạt
- Ghi danh lớp môn học
- API TEACHER xem HS lớp mình
- API STUDENT xem profile
- `student_code` / mã số ngoài hệ thống
- **Chuyển trường** — HS sang trường khác, `POST /auth/switch-school`, user đa trường ([ADR 006](../decisions/006-defer-switch-school.md))
