# Sprint 5 – Kế hoạch triển khai

**Mục tiêu:** Điểm danh theo lớp môn — GV ghi nhận có mặt/vắng/muộn/có phép; admin tra cứu; HS/PH xem lịch sử (read-only)  
**Thời gian ước tính:** 2–3 tuần  
**Ngôn ngữ UI:** Tiếng Việt  
**Phụ thuộc:** Sprint 4 hoàn thành (GV, phân công, TKB, HS, portal)

## Điều kiện hoàn thành

```text
Admin / GV đăng nhập
→ Tạo phiên điểm danh cho lớp môn (ngày + tiết + học kỳ)
→ Ghi trạng thái từng HS: có mặt / vắng / muộn / có phép
→ Đóng phiên (CLOSED) — không sửa tùy ý sau khi khóa (MVP: admin override)
→ GV chỉ điểm danh lớp được phân công
→ HS / PH xem lịch sử điểm danh (read-only)
→ Migration + seed + build pass
```

## Quyết định MVP

| Hạng mục | Quyết định |
|----------|------------|
| Phiên điểm danh | Bảng `attendance_sessions` — 1 phiên / lớp môn / ngày / tiết |
| Chi tiết HS | Bảng `attendance_records` — 1 dòng / HS / phiên |
| Trạng thái phiên | `OPEN` (đang điểm danh), `CLOSED` (đã khóa) |
| Trạng thái HS | `PRESENT`, `ABSENT`, `LATE`, `EXCUSED` |
| Gắn TKB | `timetable_entry_id` optional — liên kết tiết TKB nếu có |
| Danh sách HS | Lấy từ enrollment ACTIVE lớp HC của lớp môn |
| Quyền ghi | `SCHOOL_ADMIN`, `TEACHER` (lớp được phân công) |
| Quyền đọc portal | `STUDENT` (bản thân), `PARENT` (con đã liên kết) |
| Sổ điểm | **Sprint 6** — ngoài phạm vi |
| Bảng `periods` / `timetables` | Hoãn — có thể bổ sung sau |

## Phạm vi Sprint 5

### Trong phạm vi

| Module | Mô tả |
|--------|-------|
| Schema | `attendance_sessions`, `attendance_records` |
| API admin | CRUD phiên + bulk ghi records |
| API GV | Tạo/sửa phiên lớp được phân công |
| Portal | HS/PH xem lịch sử; GV điểm danh |
| Seed | 3 phiên mẫu lớp 10A1 (TOAN/VAN/ANH) |
| Frontend | Trang admin + portal GV điểm danh |

### Ngoài phạm vi

- Sổ điểm (`assessments`, `scores`) — Sprint 6
- Hạnh kiểm, lên lớp — Sprint 7
- Báo cáo tổng hợp, export Excel — Sprint 8
- Điểm danh theo GPS / QR

---

## Phases

### Phase 5A – Schema & Seed ✅

| # | Task | File chính |
|---|------|------------|
| 1 | Prisma: `attendance_sessions`, `attendance_records` | `server/prisma/schema.prisma` |
| 2 | Enum: `AttendanceSessionStatus`, `AttendanceRecordStatus` | schema |
| 3 | Migration | `server/prisma/migrations/` |
| 4 | Seed: 3 phiên 10A1 (TOAN/VAN/ANH), ~30 HS/phiên | `server/prisma/seed-data/attendance.ts` |
| 5 | Docs schema | [schema-sprint5.md](../database/schema-sprint5.md) |

**Bảng mới:** `attendance_sessions`, `attendance_records`

---

### Phase 5B – API phiên điểm danh ✅

**Mục tiêu:** CRUD `attendance_sessions`.

| # | Task | File chính |
|---|------|------------|
| 1 | Module `attendance-sessions` | `server/src/modules/attendance-sessions/` |
| 2 | POST tạo phiên — validate lớp môn + GV phân công | |
| 3 | PATCH cập nhật / đóng phiên (`CLOSED`) | |
| 4 | GET list/filter theo lớp môn, ngày, học kỳ | |
| 5 | Unique `(course_section_id, session_date, period_number)` | |
| 6 | E2E 401 | `test/attendance-sessions.e2e-spec.ts` |

---

### Phase 5C – API bản ghi điểm danh ✅

**Mục tiêu:** Ghi trạng thái từng HS.

| # | Task | File chính |
|---|------|------------|
| 1 | Module `attendance-records` hoặc nested trong sessions | |
| 2 | POST/PUT bulk records khi phiên `OPEN` | |
| 3 | Auto-init danh sách HS từ enrollment ACTIVE | |
| 4 | PATCH từng record (admin / GV) | |
| 5 | E2E | `test/attendance-records.e2e-spec.ts` |

---

### Phase 5D – Portal APIs ✅

**Mục tiêu:** GV điểm danh + HS/PH xem.

| # | Task | Endpoint gợi ý |
|---|------|----------------|
| 1 | GV: danh sách lớp môn có thể điểm danh | `GET /portal/my-attendance-classes` |
| 2 | GV: tạo/mở phiên | `POST /portal/attendance-sessions` |
| 3 | HS: lịch sử điểm danh | `GET /portal/my-attendance` |
| 4 | PH: điểm danh con | `GET /portal/my-children/:id/attendance` |

---

### Phase 5E – Frontend ✅

| # | Task | File chính |
|---|------|------------|
| 1 | Admin: danh sách phiên, filter | `client/src/features/attendance/` |
| 2 | Admin/GV: màn điểm danh (grid HS × trạng thái) | |
| 3 | Portal GV: điểm danh nhanh theo lớp môn | `client/src/features/portal/` |
| 4 | Portal HS/PH: xem lịch sử | |

---

## Thứ tự phụ thuộc

```text
5A (schema + seed) ✅
 └─► 5B (API sessions) ✅
      └─► 5C (API records) ✅
           └─► 5D (portal) ✅
                └─► 5E (frontend) ✅
```

---

## Quy tắc nghiệp vụ

| # | Quy tắc |
|---|---------|
| 1 | Mọi query theo `schoolId` từ JWT |
| 2 | Một phiên duy nhất cho `(course_section_id, session_date, period_number)` |
| 3 | `semester_id` trên phiên phải khớp `course_section.semester_id` |
| 4 | GV chỉ tạo/sửa phiên lớp môn có `teaching_assignment` ACTIVE |
| 5 | HS trong phiên phải có enrollment ACTIVE lớp HC của lớp môn |
| 6 | Một HS một trạng thái duy nhất trong phiên `(session_id, student_id)` |
| 7 | Phiên `CLOSED` — GV không sửa (admin có thể override — tùy phase) |
| 8 | Không hard-delete — giữ lịch sử |

---

## Mô hình dữ liệu (tóm tắt)

```text
course_sections ──► attendance_sessions ──► attendance_records ──► students
                           │
                           ├── teacher_id → teachers
                           ├── semester_id → semesters
                           └── timetable_entry_id → timetable_entries (optional)
```

| Bảng | Vai trò |
|------|---------|
| `attendance_sessions` | Phiên điểm danh (lớp môn + ngày + tiết) |
| `attendance_records` | Trạng thái từng HS trong phiên |

---

## Seed mẫu (trường DEMO)

| Dữ liệu | Giá trị |
|---------|---------|
| Lớp HC | `10A1` |
| Lớp môn | `TOAN-10A1`, `VAN-10A1`, `ANH-10A1` |
| Ngày | `2025-09-01` (Thứ 2, tuần đầu HK1) |
| HS / phiên | 30 HS (enrollment ACTIVE 10A1) |
| Trạng thái mix | ~70% có mặt, vài vắng/muộn/có phép |

Chi tiết: [schema-sprint5.md](../database/schema-sprint5.md)

---

## Tài liệu liên quan

| Tài liệu | Nội dung |
|----------|----------|
| [schema-sprint5.md](../database/schema-sprint5.md) | Chi tiết bảng |
| [sprint5-endpoints.md](../api/sprint5-endpoints.md) | REST API (Phase 5B+) |
| [sprint-4-plan.md](./sprint-4-plan.md) | Sprint trước |
| [overview.md](../architecture/overview.md) | Roadmap tổng |

---

## Bước tiếp theo

Sprint 5 hoàn thành (backend + frontend MVP điểm danh).  
Tiếp theo: [Sprint 6 — Sổ điểm](./sprint-6-plan.md).
