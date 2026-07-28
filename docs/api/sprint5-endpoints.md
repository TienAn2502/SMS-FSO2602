# Sprint 5 – API Endpoints

> Phase 5B: `attendance-sessions` (admin). Phase 5C: `attendance-records`. Phase 5D+: portal.

## Attendance Sessions (Admin — chỉ xem)

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/attendance-sessions` | SCHOOL_ADMIN | Danh sách phiên (filter, pagination) |
| GET | `/attendance-sessions/:id` | SCHOOL_ADMIN | Chi tiết phiên + bản ghi HS (read-only) |

> Admin **không** tạo phiên, nạp HS hay ghi điểm danh — việc đó do GV qua Portal.

### GET /attendance-sessions — Query params

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `page`, `limit` | number | Phân trang |
| `courseSectionId` | uuid | Lọc theo lớp môn |
| `teacherId` | uuid | Lọc theo GV |
| `semesterId` | uuid | Lọc theo học kỳ |
| `academicYearId` | uuid | Lọc theo năm học |
| `homeroomClassId` | uuid | Lọc theo lớp HC |
| `sessionDate` | `YYYY-MM-DD` | Lọc theo ngày |
| `status` | `OPEN` \| `CLOSED` | Trạng thái phiên |
| `includeAllSemesters` | boolean | Bỏ mặc định học kỳ hiện hành |
| `sortBy` | `sessionDate` \| `periodNumber` \| `status` | Sắp xếp |
| `sortOrder` | `asc` \| `desc` | Thứ tự |

### POST /attendance-sessions

*(Đã chuyển sang Portal — GV tạo phiên qua `POST /portal/attendance-sessions`.)*

### PATCH /attendance-sessions/:id

*(Đã chuyển sang Portal — GV đóng phiên qua `PATCH /portal/attendance-sessions/:id`.)*

### PUT /attendance-sessions/:id/records

*(Đã chuyển sang Portal — GV ghi điểm danh qua `PUT /portal/attendance-sessions/:id/records`.)*

---

## Attendance Records

> Không còn endpoint admin riêng — GV ghi qua `PUT /portal/attendance-sessions/:id/records`.

### AttendanceRecordStatus

| Giá trị | Tiếng Việt |
|--------|------------|
| `PRESENT` | Có mặt |
| `ABSENT` | Vắng |
| `LATE` | Muộn |
| `EXCUSED` | Có phép |

### Response (list item / session)

```json
{
  "id": "uuid",
  "semesterId": "uuid",
  "semesterName": "Học kỳ 1",
  "academicYearId": "uuid",
  "courseSectionId": "uuid",
  "courseSectionCode": "TOAN-10A1",
  "courseSectionName": "Toán học 10A1",
  "homeroomClassId": "uuid",
  "teacherId": "uuid",
  "teacherFullName": "Nguyễn Văn A",
  "timetableEntryId": "uuid",
  "sessionDate": "2025-09-01",
  "periodNumber": 1,
  "status": "CLOSED",
  "note": null,
  "recordCount": 30,
  "createdAt": "2026-07-28T...",
  "updatedAt": "2026-07-28T..."
}
```

### Response (session detail) — thêm `records`

```json
{
  "records": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "studentFullName": "Bùi Công Chi",
      "status": "PRESENT",
      "note": null
    }
  ]
}
```

## Mã lỗi

| Code | HTTP | Mô tả |
|------|------|-------|
| `ATTENDANCE_SESSION_NOT_FOUND` | 404 | Không tìm thấy phiên |
| `ATTENDANCE_RECORD_NOT_FOUND` | 404 | Không tìm thấy bản ghi |
| `ATTENDANCE_SESSION_CONFLICT` | 409 | Trùng lớp môn + ngày + tiết |
| `TEACHER_NOT_ASSIGNED` | 422 | GV chưa được phân công lớp môn |
| `TIMETABLE_ENTRY_NOT_FOUND` | 422 | Tiết TKB không khớp |
| `STUDENT_NOT_ENROLLED` | 422 | HS không thuộc lớp HC của lớp môn |
| `COURSE_SECTION_NO_HOMEROOM` | 422 | Lớp môn chưa gắn lớp HC |
| `NO_ACTIVE_ENROLLMENTS` | 422 | Không có HS ghi danh ACTIVE |

---

## Portal — Điểm danh (Phase 5D)

### Giáo viên (`TEACHER`)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/portal/my-attendance-classes` | Lớp môn được phân công (HK hiện hành) |
| POST | `/portal/attendance-sessions` | Tạo/mở phiên (GV = teacherId tự động) |
| GET | `/portal/attendance-sessions/:id` | Chi tiết phiên + bản ghi HS (phiên của GV) |
| PUT | `/portal/attendance-sessions/:id/records` | Bulk ghi / nạp HS lớp (phiên **OPEN**) |
| PATCH | `/portal/attendance-sessions/:id` | Đóng phiên (`status: CLOSED`) |

**POST /portal/attendance-sessions**

```json
{
  "courseSectionId": "uuid",
  "sessionDate": "2025-09-01",
  "periodNumber": 1,
  "timetableEntryId": "uuid",
  "note": "Tiết 1"
}
```

**PUT records** — body:

```json
{
  "initMissingStudents": true,
  "records": [
    { "studentId": "uuid", "status": "PRESENT" },
    { "studentId": "uuid", "status": "ABSENT", "note": "Không phép" }
  ]
}
```

| Field | Mô tả |
|-------|-------|
| `initMissingStudents` | Default `true` — nạp HS ghi danh ACTIVE còn thiếu = `PRESENT` |
| `records` | Upsert trạng thái từng HS |

**Nạp nhanh cả lớp:** `{ "records": [], "initMissingStudents": true }`. GV **không** ghi được phiên `CLOSED`.

### Học sinh (`STUDENT`)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/portal/my-attendance` | Lịch sử điểm danh bản thân (pagination) |

Query: `page`, `limit`, `semesterId`, `includeAllSemesters`

### Phụ huynh (`PARENT`)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/portal/my-children/:studentId/attendance` | Lịch sử điểm danh con (phải đã liên kết) |

### Response `my-attendance` (item)

```json
{
  "id": "uuid",
  "status": "PRESENT",
  "note": null,
  "sessionId": "uuid",
  "sessionDate": "2025-09-01",
  "periodNumber": 1,
  "sessionStatus": "CLOSED",
  "courseSectionCode": "TOAN-10A1",
  "courseSectionName": "Toán học 10A1",
  "teacherFullName": "Nguyễn Văn A",
  "createdAt": "...",
  "updatedAt": "..."
}
```

## Frontend (Phase 5E) ✅

| Route | Role | Mô tả |
|-------|------|-------|
| `/attendance-sessions` | Admin | Tra cứu phiên (read-only) |
| `/attendance-sessions/:id` | Admin | Xem bảng điểm danh (read-only) |
| `/portal/attendance` | TEACHER | Mở phiên, nạp HS lớp, ghi điểm danh, đóng phiên |
| `/portal/my-attendance` | STUDENT | Lịch sử điểm danh |
| `/portal/my-children/:studentId/attendance` | PARENT | Lịch sử điểm danh con |

**Post-MVP:** Siết TKB + đúng ngày khi tạo phiên.
