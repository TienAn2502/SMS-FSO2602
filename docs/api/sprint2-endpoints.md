# API Sprint 2

Danh sách endpoint dự kiến cho Sprint 2 — khung học vụ cơ bản.

> Phân quyền: **`SCHOOL_ADMIN`** cho mọi endpoint ghi (POST/PATCH). GET có thể mở cho TEACHER sau Sprint 4.  
> Quy ước chung: [conventions.md](./conventions.md)  
> Schema: [schema-sprint2.md](../database/schema-sprint2.md)

## Tổng quan

| Module | Base path | Role (MVP) |
|--------|-----------|------------|
| Năm học | `/academic-years` | `SCHOOL_ADMIN` |
| Học kỳ | `/academic-years/:yearId/semesters` | `SCHOOL_ADMIN` |
| Khối | `/grade-levels` | `SCHOOL_ADMIN` |
| Môn học | `/subjects` | `SCHOOL_ADMIN` |
| Lớp hành chính | `/homeroom-classes` | `SCHOOL_ADMIN` |
| Lớp môn học | `/course-sections` | `SCHOOL_ADMIN` |

Tất cả request đã auth — `schoolId` lấy từ JWT, **không** gửi từ client.

---

## Academic years

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/academic-years` | Danh sách (pagination, filter status) |
| GET | `/academic-years/current` | Năm học hiện hành (`isCurrent = true`) |
| GET | `/academic-years/:id` | Chi tiết |
| POST | `/academic-years` | Tạo năm học |
| PATCH | `/academic-years/:id` | Cập nhật |
| PATCH | `/academic-years/:id/set-current` | Đặt làm năm hiện hành |
| PATCH | `/academic-years/:id/status` | ACTIVE / INACTIVE |

### POST /academic-years

**Request:**

```json
{
  "name": "2025-2026",
  "code": "2025-26",
  "startDate": "2025-08-01",
  "endDate": "2026-05-31",
  "isCurrent": false
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "2025-2026",
    "code": "2025-26",
    "startDate": "2025-08-01",
    "endDate": "2026-05-31",
    "isCurrent": false,
    "status": "ACTIVE"
  },
  "message": "Tạo năm học thành công"
}
```

**Lỗi thường gặp:**

| Code | HTTP | Mô tả |
|------|------|-------|
| `ACADEMIC_YEAR_CODE_EXISTS` | 409 | Trùng code trong trường |
| `INVALID_DATE_RANGE` | 422 | `endDate` ≤ `startDate` |

---

## Semesters

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/academic-years/:yearId/semesters` | Danh sách học kỳ |
| GET | `/academic-years/:yearId/semesters/current` | Học kỳ hiện hành trong năm |
| GET | `/semesters/current` | Học kỳ hiện hành của trường |
| GET | `/academic-years/:yearId/semesters/:id` | Chi tiết |
| POST | `/academic-years/:yearId/semesters` | Tạo học kỳ |
| PATCH | `/academic-years/:yearId/semesters/:id` | Cập nhật |
| PATCH | `/academic-years/:yearId/semesters/:id/set-current` | Đặt học kỳ hiện hành |
| PATCH | `/academic-years/:yearId/semesters/:id/status` | ACTIVE / INACTIVE |

### POST /academic-years/:yearId/semesters

**Request:**

```json
{
  "name": "Học kỳ 1",
  "code": "HK1",
  "startDate": "2025-08-01",
  "endDate": "2025-12-31",
  "isCurrent": false
}
```

---

## Grade levels

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/grade-levels` | Danh sách (pagination, search) |
| GET | `/grade-levels/:id` | Chi tiết |
| POST | `/grade-levels` | Tạo khối |
| PATCH | `/grade-levels/:id` | Cập nhật |

> `grade_levels` không có cột `status` — không có endpoint deactivate.

### POST /grade-levels

**Request:**

```json
{
  "name": "Khối 10",
  "code": "10"
}
```

---

## Subjects

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/subjects` | Danh sách (pagination, search) |
| GET | `/subjects/:id` | Chi tiết |
| POST | `/subjects` | Tạo môn |
| PATCH | `/subjects/:id` | Cập nhật |
| PATCH | `/subjects/:id/status` | ACTIVE / INACTIVE |

### POST /subjects

**Request:**

```json
{
  "code": "TOAN",
  "name": "Toán học",
  "description": "Môn Toán THPT"
}
```

---

## Homeroom classes

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/homeroom-classes` | Danh sách (filter: yearId, gradeLevelId) |
| GET | `/homeroom-classes/:id` | Chi tiết |
| POST | `/homeroom-classes` | Tạo lớp HC |
| PATCH | `/homeroom-classes/:id` | Cập nhật (GVCN, capacity…) |
| PATCH | `/homeroom-classes/:id/status` | ACTIVE / INACTIVE |

### POST /homeroom-classes

**Request:**

```json
{
  "academicYearId": "uuid",
  "gradeLevelId": "uuid",
  "name": "10A1",
  "code": "10A1",
  "capacity": 45,
  "homeroomTeacherId": "uuid-teachers-id-or-null"
}
```

**Lỗi:**

| Code | HTTP | Mô tả |
|------|------|-------|
| `ACADEMIC_YEAR_NOT_FOUND` | 404 | Năm học không thuộc trường |
| `INVALID_HOMEROOM_TEACHER` | 422 | Không tìm thấy hồ sơ giáo viên ACTIVE cùng trường |

---

## Course sections

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/course-sections` | Danh sách (filter: semesterId, academicYearId, subjectId, homeroomClassId) |
| GET | `/course-sections/:id` | Chi tiết |
| POST | `/course-sections` | Tạo lớp môn |
| PATCH | `/course-sections/:id` | Cập nhật |
| PATCH | `/course-sections/:id/status` | ACTIVE / INACTIVE |

### POST /course-sections

**Request:**

```json
{
  "semesterId": "uuid",
  "subjectId": "uuid",
  "homeroomClassId": "uuid-or-null",
  "gradeLevelId": "uuid",
  "name": "Toán 10A1",
  "code": "TOAN-10A1"
}
```

> `gradeLevelId` bắt buộc khi **không** gắn `homeroomClassId` (lớp ghép).  
> Hệ thống tự resolve `grade_level_subject_id` từ `subjectId` + khối (từ lớp HC hoặc `gradeLevelId`).

---

## Query params chung (GET list)

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `page` | number | Trang (default 1) |
| `limit` | number | Số bản ghi (default 20, max 100) |
| `search` | string | Tìm theo name/code |
| `status` | enum | ACTIVE, INACTIVE |
| `academicYearId` | uuid | Filter theo năm học (lớp HC, lớp môn — qua `semester`) |
| `semesterId` | uuid | Filter theo học kỳ (lớp môn) |
| `gradeLevelId` | uuid | Filter theo khối (lớp HC) |
| `subjectId` | uuid | Filter theo môn (lớp môn) |

Response paginated theo chuẩn Sprint 1:

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  },
  "message": null
}
```

---

## Error codes Sprint 2

| Code | Mô tả |
|------|-------|
| `ACADEMIC_YEAR_NOT_FOUND` | Không tìm thấy năm học |
| `ACADEMIC_YEAR_CODE_EXISTS` | Trùng mã năm học |
| `CURRENT_ACADEMIC_YEAR_REQUIRED` | Thiếu năm học hiện hành |
| `SEMESTER_NOT_FOUND` | Không tìm thấy học kỳ |
| `SEMESTER_CODE_EXISTS` | Trùng mã học kỳ trong năm học |
| `CURRENT_SEMESTER_REQUIRED` | Chưa có học kỳ hiện hành |
| `ACADEMIC_YEAR_NOT_CURRENT` | Học kỳ hiện hành phải thuộc năm học hiện hành |
| `GRADE_LEVEL_NOT_FOUND` | Không tìm thấy khối |
| `GRADE_LEVEL_CODE_EXISTS` | Trùng mã khối |
| `SUBJECT_NOT_FOUND` | Không tìm thấy môn |
| `SUBJECT_CODE_EXISTS` | Trùng mã môn |
| `HOMEROOM_CLASS_NOT_FOUND` | Không tìm thấy lớp HC |
| `HOMEROOM_CLASS_CODE_EXISTS` | Trùng mã lớp HC |
| `COURSE_SECTION_NOT_FOUND` | Không tìm thấy lớp môn |
| `COURSE_SECTION_CODE_EXISTS` | Trùng mã lớp môn |
| `INVALID_HOMEROOM_TEACHER` | GVCN không hợp lệ |
| `ACADEMIC_YEAR_HAS_CLASSES` | Năm học đang có lớp, không thể INACTIVE |
| `GRADE_LEVEL_SUBJECT_NOT_FOUND` | Môn chưa cấu hình cho khối |
| `TENANT_MISMATCH` | FK thuộc trường khác |
| `INVALID_DATE_RANGE` | Khoảng ngày không hợp lệ |

---

## UI routes (Frontend)

| Path | Trang | Auth |
|------|-------|------|
| `/academic-years` | Năm học & học kỳ | `SCHOOL_ADMIN` |
| `/grade-levels` | Khối | `SCHOOL_ADMIN` |
| `/subjects` | Môn học | `SCHOOL_ADMIN` |
| `/homeroom-classes` | Lớp hành chính | `SCHOOL_ADMIN` |
| `/course-sections` | Lớp môn học | `SCHOOL_ADMIN` |

---

## Ngoài MVP Sprint 2

- Import Excel khối/môn/lớp
- Sao chép cấu trúc từ năm học cũ
- API đọc cho TEACHER/STUDENT (Sprint 4+)
- `audit_logs` ghi thao tác admin
