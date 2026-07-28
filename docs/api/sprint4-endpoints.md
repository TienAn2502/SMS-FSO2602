# API Sprint 4

Danh sách endpoint dự kiến cho Sprint 4 — giáo viên, phân công, TKB, phụ huynh, portal read-only.

> Phân quyền: **`SCHOOL_ADMIN`** cho CRUD admin. **`TEACHER` / `STUDENT` / `PARENT`** cho portal GET.  
> Quy ước chung: [conventions.md](./conventions.md)  
> Schema: [schema-sprint4.md](../database/schema-sprint4.md)

## Tổng quan

| Module | Base path | Role (MVP) |
|--------|-----------|------------|
| Giáo viên | `/teachers` | `SCHOOL_ADMIN` (CRUD) |
| Phân công | `/teaching-assignments` | `SCHOOL_ADMIN` |
| Thời khóa biểu | `/timetable-entries` | `SCHOOL_ADMIN` |
| Phụ huynh | `/parents` | `SCHOOL_ADMIN` |
| Portal | `/portal` | `TEACHER` / `STUDENT` / `PARENT` |

Tất cả request đã auth — `schoolId` lấy từ JWT, **không** gửi từ client.

---

## Teachers

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/teachers` | Danh sách (pagination, search) |
| GET | `/teachers/:id` | Chi tiết + phân công hiện tại |
| POST | `/teachers` | Tạo hồ sơ GV |
| PATCH | `/teachers/:id` | Cập nhật hồ sơ |
| PATCH | `/teachers/:id/status` | ACTIVE / INACTIVE |
| POST | `/teachers/:id/link-user` | Gắn tài khoản user TEACHER có sẵn |
| POST | `/teachers/:id/create-user` | Tạo user + gắn (email, password) |

### GET /teachers — Query params

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `page` | number | Trang (default 1) |
| `limit` | number | Số bản ghi (default 20, max 100) |
| `search` | string | Tìm theo tên, email user |
| `status` | enum | ACTIVE, INACTIVE |

### POST /teachers

**Request (hồ sơ only):**

```json
{
  "fullName": "Nguyễn Văn Giáo",
  "dateOfBirth": "1990-05-15",
  "gender": "MALE",
  "phone": "0901234567",
  "address": "Quận 1, TP.HCM",
  "specialization": "Toán học"
}
```

**Request (tạo kèm tài khoản):**

```json
{
  "fullName": "Nguyễn Văn Giáo",
  "dateOfBirth": "1990-05-15",
  "gender": "MALE",
  "address": "Quận 1, TP.HCM",
  "specialization": "Toán học",
  "account": {
    "email": "newteacher@demo.edu.vn",
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
    "fullName": "Nguyễn Văn Giáo",
    "dateOfBirth": "1990-05-15",
    "gender": "MALE",
    "phone": null,
    "address": "Quận 1, TP.HCM",
    "specialization": "Toán học",
    "status": "ACTIVE"
  },
  "message": "Tạo hồ sơ giáo viên thành công"
}
```

---

## Teaching assignments

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/teaching-assignments` | Danh sách (filter) |
| GET | `/teaching-assignments/:id` | Chi tiết |
| POST | `/teaching-assignments` | Phân công GV ↔ lớp môn |
| PATCH | `/teaching-assignments/:id/status` | Kết thúc phân công (INACTIVE) |
| GET | `/teachers/:teacherId/teaching-assignments` | Phân công theo GV |

### GET /teaching-assignments — Query params

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `page` | number | Trang (default 1) |
| `limit` | number | Số bản ghi (default 20, max 100) |
| `teacherId` | uuid | Filter theo giáo viên |
| `courseSectionId` | uuid | Filter theo lớp môn |
| `semesterId` | uuid | Filter theo học kỳ cụ thể |
| `academicYearId` | uuid | Filter theo năm học (mọi học kỳ trong năm) |
| `status` | enum | ACTIVE, INACTIVE |
| `includeAllSemesters` | boolean | `true` = bỏ filter học kỳ mặc định |

**Mặc định:** nếu không gửi `semesterId`, `academicYearId`, `includeAllSemesters=true` → server lọc theo **học kỳ `is_current`** của trường (năm học hiện hành). Lỗi `404 CURRENT_SEMESTER_REQUIRED` nếu chưa thiết lập học kỳ hiện hành.

`GET /teachers/:teacherId/teaching-assignments` dùng cùng query params.

### POST /teaching-assignments

**Request:**

```json
{
  "teacherId": "uuid",
  "courseSectionId": "uuid",
  "assignAt": "2025-08-01"
}
```

**Lỗi:**

| Code | HTTP | Mô tả |
|------|------|-------|
| `TEACHER_NOT_FOUND` | 404 | Không tìm thấy GV |
| `COURSE_SECTION_NOT_FOUND` | 404 | Không tìm thấy lớp môn |
| `ASSIGNMENT_ALREADY_EXISTS` | 409 | GV đã được phân công lớp môn này (ACTIVE) |
| `TENANT_MISMATCH` | 422 | FK không cùng trường / năm học |

---

## Timetable entries

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/timetable-entries` | Danh sách (filter) |
| GET | `/timetable-entries/:id` | Chi tiết |
| POST | `/timetable-entries` | Tạo tiết học |
| PATCH | `/timetable-entries/:id` | Cập nhật tiết |
| DELETE | `/timetable-entries/:id` | Soft delete (INACTIVE) |
| GET | `/course-sections/:id/timetable-entries` | TKB theo lớp môn |

### POST /timetable-entries

**Request:**

```json
{
  "courseSectionId": "uuid",
  "teacherId": "uuid",
  "dayOfWeek": 1,
  "periodNumber": 1,
  "room": "P.201"
}
```

> `dayOfWeek`: số `1` (T2) … `7` (CN) — cùng convention `EXTRACT(ISODOW FROM date)` của PostgreSQL. MVP THPT: `1–5`.  
> `semester_id` **không** gửi trong request — server lấy từ `course_section.semester_id` khi tạo.  
> Response trả `semesterId` (+ `academicYearId` derived) để UI filter.

**Lỗi:**

| Code | HTTP | Mô tả |
|------|------|-------|
| `TIMETABLE_SLOT_CONFLICT` | 409 | Trùng thứ + tiết (cùng lớp môn) |
| `TEACHER_TIMETABLE_CONFLICT` | 409 | GV trùng thứ + tiết trong cùng học kỳ |
| `INVALID_DAY_OF_WEEK` | 422 | `dayOfWeek` không thuộc 1–7 (MVP: 1–5) |
| `TEACHER_NOT_ASSIGNED` | 422 | GV chưa được phân công lớp môn |
| `TENANT_MISMATCH` | 422 | FK không cùng trường |

### GET /timetable-entries — Query params

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `semesterId` | uuid | Filter theo học kỳ |
| `academicYearId` | uuid | Filter theo năm học (join qua `semester`) |
| `courseSectionId` | uuid | Filter lớp môn |
| `teacherId` | uuid | Filter GV |
| `homeroomClassId` | uuid | Filter qua lớp môn thuộc lớp HC |
| `dayOfWeek` | number | Filter thứ (1–5, ISODOW MVP THPT) |
| `status` | enum | ACTIVE, INACTIVE |
| `includeAllSemesters` | boolean | `true` = bỏ filter học kỳ mặc định |

**Mặc định:** nếu không gửi `semesterId`, `academicYearId`, `includeAllSemesters=true` → lọc theo **học kỳ `is_current`**.

`GET /course-sections/:id/timetable-entries` dùng cùng query params.

---

## Parents

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/parents` | Danh sách |
| GET | `/parents/:id` | Chi tiết + con liên kết |
| POST | `/parents` | Tạo hồ sơ PH |
| PATCH | `/parents/:id` | Cập nhật |
| PATCH | `/parents/:id/status` | ACTIVE / INACTIVE |
| POST | `/parents/:id/link-user` | Gắn user PARENT |
| POST | `/parents/:id/create-user` | Tạo user + gắn |
| POST | `/parents/:id/link-student` | Gắn HS |
| DELETE | `/parents/:parentId/students/:studentId` | Gỡ liên kết HS |

### POST /parents/:id/link-student

**Request:**

```json
{
  "studentId": "uuid",
  "relationship": "FATHER",
  "isPrimaryContact": true
}
```

> `relationship`: `FATHER` | `MOTHER` | `GUARDIAN` | `OTHER`

---

## Portal (read-only)

Base path `/portal` — role guard theo JWT.

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/portal/me` | All | Profile theo role (teacher / student / parent) |
| GET | `/portal/my-homeroom-classes` | TEACHER | Lớp CN (GVCN) |
| GET | `/portal/my-homeroom-classes/:id/students` | TEACHER | HS lớp CN (ACTIVE enrollment) |
| GET | `/portal/my-teaching-assignments` | TEACHER | Phân công của tôi |
| GET | `/portal/my-timetable` | TEACHER | TKB cá nhân (query: `semesterId`, mặc định học kỳ `is_current`) |
| GET | `/portal/my-student-profile` | STUDENT | Hồ sơ + enrollment hiện tại |
| GET | `/portal/my-class-timetable` | STUDENT | TKB lớp HC (từ enrollment hiện tại) |
| GET | `/portal/my-children` | PARENT | Danh sách con |

**Data scope:**

- TEACHER chỉ xem lớp CN mà `homeroom_teacher_id = teachers.id` (resolve từ user đăng nhập)
- TEACHER chỉ xem HS có enrollment ACTIVE trong lớp CN đó
- PARENT chỉ xem HS trong `student_parents`
- STUDENT chỉ xem hồ sơ `students.user_id = user.id`

---

## Error codes Sprint 4

| Code | Mô tả |
|------|-------|
| `TEACHER_NOT_FOUND` | Không tìm thấy giáo viên |
| `PARENT_NOT_FOUND` | Không tìm thấy phụ huynh |
| `ASSIGNMENT_NOT_FOUND` | Không tìm thấy phân công |
| `ASSIGNMENT_ALREADY_EXISTS` | Phân công trùng (ACTIVE) |
| `TIMETABLE_ENTRY_NOT_FOUND` | Không tìm thấy tiết TKB |
| `TIMETABLE_SLOT_CONFLICT` | Trùng thứ + tiết (cùng lớp môn) |
| `TEACHER_TIMETABLE_CONFLICT` | GV trùng thứ + tiết trong cùng học kỳ |
| `TEACHER_NOT_ASSIGNED` | GV chưa phân công lớp môn |
| `INVALID_DAY_OF_WEEK` | `dayOfWeek` không hợp lệ (1–7) |
| `STUDENT_LINK_NOT_FOUND` | Không có liên kết PH ↔ HS |
| `FORBIDDEN_SCOPE` | Vượt phạm vi data scope role |
| `USER_ALREADY_LINKED` | User đã gắn hồ sơ khác |
| `INVALID_TEACHER_USER` | User không hợp lệ để gắn GV |
| `INVALID_PARENT_USER` | User không hợp lệ để gắn PH |
| `TENANT_MISMATCH` | FK thuộc trường khác |

(Kế thừa error codes Sprint 1–3)

---

## UI routes (Frontend)

### Admin (`SCHOOL_ADMIN`)

| Path | Trang |
|------|-------|
| `/teachers` | Danh sách GV |
| `/teachers/:id` | Chi tiết GV |
| `/teaching-assignments` | Phân công |
| `/timetable` | Thời khóa biểu |
| `/parents` | Phụ huynh |

### Portal

| Path | Trang | Role |
|------|-------|------|
| `/portal` | Dashboard theo role | TEACHER / STUDENT / PARENT |
| `/portal/my-class` | Lớp CN + HS | TEACHER |
| `/portal/my-schedule` | TKB | TEACHER |
| `/portal/my-profile` | Hồ sơ HS | STUDENT |
| `/portal/my-children` | Con | PARENT |

---

## Ngoài MVP Sprint 4

- Thông báo push / email PH
- PH xem điểm / điểm danh (cần Sprint 5–6)
- Export TKB PDF
- Drag-drop UI xếp TKB
