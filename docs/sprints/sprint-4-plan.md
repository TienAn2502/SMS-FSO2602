# Sprint 4 – Kế hoạch triển khai

**Mục tiêu:** Hồ sơ giáo viên, phân công giảng dạy, thời khóa biểu, phụ huynh, mở API đọc cho TEACHER / STUDENT / PARENT  
**Thời gian ước tính:** 3–4 tuần  
**Ngôn ngữ UI:** Tiếng Việt  
**Phụ thuộc:** Sprint 3 hoàn thành (học sinh, ghi danh, cấu trúc học vụ, R2)

## Điều kiện hoàn thành

```text
Admin đăng nhập trường DEMO
→ Tạo / sửa hồ sơ giáo viên (teachers), gắn user TEACHER
→ Phân công GV dạy lớp môn (teaching_assignments)
→ Nhập TKB thủ công cho lớp môn / tiết học
→ Tạo hồ sơ phụ huynh, gắn PH ↔ HS (student_parents)
→ Giáo viên đăng nhập — xem lớp CN + lớp được phân công + danh sách HS (read-only)
→ Học sinh đăng nhập — xem hồ sơ + lớp HC hiện tại (read-only)
→ Phụ huynh đăng nhập — xem danh sách con (read-only)
→ Mọi API lọc đúng school_id + data scope theo role
→ Migration + seed + build + lint pass
```

## Quyết định MVP đã chốt

| Hạng mục | Quyết định |
|----------|------------|
| Hồ sơ GV | Bảng `teachers` riêng, `user_id` nullable → `users.id` (cùng pattern `students`: `dateOfBirth`, `gender`, `address` optional) |
| Mã giáo viên | **Không dùng** MVP — dùng `id` (UUID) |
| GVCN | `homeroom_classes.homeroom_teacher_id` vẫn trỏ `users.id` (Sprint 2); validate user có hồ sơ `teachers` + role TEACHER |
| Phân công bộ môn | Bảng `teaching_assignments` — GV ↔ `course_sections` |
| Một GV / lớp môn | Tối đa **một** phân công `ACTIVE` cho cặp `(teacher_id, course_section_id)` |
| TKB | Bảng `timetable_entries` — nhập **thủ công**, gắn học kỳ + lớp môn + GV + thứ + tiết |
| Phụ huynh | [ADR 010](../decisions/010-parent-as-user.md) — `parents` + `student_parents`, role `PARENT` |
| Role mới | Thêm `UserRole.PARENT` — cập nhật ADR 008 khi triển khai |
| API portal | Sprint 4 chỉ **GET read-only** cho TEACHER / STUDENT / PARENT |
| Data scope | GV chỉ xem HS lớp CN hoặc lớp môn được phân công |
| Điểm danh / điểm số | **Sprint 5–6** — ngoài phạm vi |
| Import Excel TKB | Hoãn |
| TKB tự động / xếp lịch | Hoãn |
| Chuyển trường | Hoãn — [ADR 006](../decisions/006-defer-switch-school.md) |

## Phạm vi Sprint 4

### Trong phạm vi

| Module | Mô tả |
|--------|-------|
| Hồ sơ giáo viên | CRUD `teachers`, link/create user TEACHER |
| Phân công | CRUD `teaching_assignments` |
| Thời khóa biểu | CRUD `timetable_entries` |
| Phụ huynh | CRUD `parents`, gắn / gỡ HS qua `student_parents` |
| Portal TEACHER | Xem lớp CN, phân công, HS lớp CN (read-only) |
| Portal STUDENT | Xem hồ sơ + enrollment hiện tại |
| Portal PARENT | Xem danh sách con đã liên kết |
| Seed | Map `teacher1…3@`, 3 phân công mẫu, TKB mẫu, 2 PH gắn HS |
| Frontend | Trang GV, phân công, TKB, PH; layout portal theo role |

### Ngoài phạm vi

- Điểm danh (`attendance_*`) — Sprint 5
- Sổ điểm (`assessments`, `scores`) — Sprint 6
- Ghi danh lớp môn (`course_section_enrollments`) — defer
- Hạnh kiểm, lên lớp, tổng kết — Sprint 7
- Báo cáo, CI/CD — Sprint 8
- Audit logs — [ADR 007](../decisions/007-defer-audit-logs.md)
- Mã GV (`teacher_code`), mã PH

---

## Phases

### Phase 4A – Schema & Seed ✅

**Mục tiêu:** Database Sprint 4, seed GV + phân công + PH mẫu.

| # | Task | File chính |
|---|------|------------|
| 1 | Prisma: `teachers`, `teaching_assignments`, `timetable_entries`, `parents`, `student_parents` | `server/prisma/schema.prisma` |
| 2 | Enum: `ParentRelationship`, `UserRole.PARENT`; `day_of_week` = SMALLINT ISODOW (1–7) | schema |
| 3 | Migration | `server/prisma/migrations/` |
| 4 | Seed idempotent: hồ sơ GV map user demo, phân công, TKB, PH | `server/prisma/seed.ts` |
| 5 | Docs schema | [schema-sprint4.md](../database/schema-sprint4.md) |

**Bảng mới:** `teachers`, `teaching_assignments`, `timetable_entries`, `parents`, `student_parents`

---

### Phase 4B – API giáo viên ✅

**Mục tiêu:** CRUD hồ sơ GV trong tenant.

| # | Task | File chính |
|---|------|------------|
| 1 | Module `teachers` | `server/src/modules/teachers/` |
| 2 | CRUD + pagination + search (tên, email user) | |
| 3 | POST link-user / create-user (pattern `students`) | |
| 4 | Validate `user_id` → role TEACHER, cùng trường | |
| 5 | `@Roles(SCHOOL_ADMIN)` + tenant isolation | |
| 6 | E2E 401 | `test/teachers.e2e-spec.ts` |

**Endpoints:** [sprint4-endpoints.md](../api/sprint4-endpoints.md#teachers)

---

### Phase 4C – API phân công giảng dạy ✅

**Mục tiêu:** Gán GV dạy lớp môn.

| # | Task | File chính |
|---|------|------------|
| 1 | Module `teaching-assignments` | `server/src/modules/teaching-assignments/` |
| 2 | POST phân công — validate `course_section` + `teacher` cùng tenant | ✅ |
| 3 | Unique ACTIVE `(teacher_id, course_section_id)` | ✅ |
| 4 | PATCH status (ACTIVE / INACTIVE) — kết thúc phân công | ✅ |
| 5 | GET filter theo GV, lớp môn, năm học | ✅ |
| 6 | E2E 401 | `test/teaching-assignments.e2e-spec.ts` |

---

### Phase 4D – API thời khóa biểu ✅

**Mục tiêu:** Nhập TKB thủ công theo lớp môn.

| # | Task | File chính |
|---|------|------------|
| 1 | Module `timetable` hoặc `timetable-entries` | `server/src/modules/timetable-entries/` |
| 2 | CRUD entry: thứ, tiết, lớp môn, GV, phòng (optional) | ✅ |
| 3 | Validate `day_of_week` ISODOW (1–7; MVP 1–5), không trùng `(course_section_id, day_of_week, period_number)` | ✅ |
| 4 | GET theo lớp HC / lớp môn / GV / năm học | ✅ |
| 5 | E2E 401 | `test/timetable-entries.e2e-spec.ts` |

---

### Phase 4E – API phụ huynh ✅

**Mục tiêu:** Hồ sơ PH và liên kết con.

| # | Task | File chính |
|---|------|------------|
| 1 | Module `parents` | `server/src/modules/parents/` |
| 2 | CRUD parents + link/create user PARENT | ✅ |
| 3 | POST/DELETE gắn HS (`student_parents`) | ✅ |
| 4 | Validate HS cùng trường | ✅ |
| 5 | E2E 401 | `test/parents.e2e-spec.ts` |

**Chi tiết:** [ADR 010](../decisions/010-parent-as-user.md)

---

### Phase 4F – Portal APIs (read-only) ✅

**Mục tiêu:** TEACHER / STUDENT / PARENT xem dữ liệu của mình.

| # | Task | File chính |
|---|------|------------|
| 1 | `GET /portal/me` | `server/src/modules/portal/` |
| 2 | TEACHER: lớp CN, phân công, HS lớp CN | ✅ |
| 3 | STUDENT: hồ sơ + enrollment hiện tại | ✅ |
| 4 | PARENT: danh sách con | ✅ |
| 5 | Policy / guard data scope | service layer ✅ |
| 6 | E2E 401 | `test/portal.e2e-spec.ts` |

---

### Phase 4G – Frontend ✅

**Mục tiêu:** UI admin + portal cơ bản theo role.

| # | Task | File chính |
|---|------|------------|
| 1 | Feature `teachers` | `client/src/features/teachers/` |
| 2 | Feature `teaching-assignments` | `client/src/features/teaching-assignments/` |
| 3 | Feature `timetable` | `client/src/features/timetable/` |
| 4 | Feature `parents` | `client/src/features/parents/` |
| 5 | Sidebar admin + route guards | `app-sidebar.tsx`, `router.tsx` |
| 6 | Trang portal GV / HS / PH (read-only) | `client/src/features/portal/` |
| 7 | Pattern TanStack Table + `keepPreviousData` | ✅ |

**UI routes (admin):**

| Path | Trang | Role |
|------|-------|------|
| `/teachers` | Danh sách GV | `SCHOOL_ADMIN` |
| `/teachers/:id` | Chi tiết GV + phân công | `SCHOOL_ADMIN` |
| `/teaching-assignments` | Phân công giảng dạy | `SCHOOL_ADMIN` |
| `/timetable` | Thời khóa biểu | `SCHOOL_ADMIN` |
| `/parents` | Danh sách phụ huynh | `SCHOOL_ADMIN` |
| `/parents/:id` | Chi tiết PH + con | `SCHOOL_ADMIN` |

**UI routes (portal):**

| Path | Trang | Role |
|------|-------|------|
| `/portal` | Trang chủ theo role | `TEACHER` / `STUDENT` / `PARENT` |
| `/portal/my-class` | Lớp CN + HS (GV) | `TEACHER` |
| `/portal/my-schedule` | TKB cá nhân (GV) | `TEACHER` |
| `/portal/my-profile` | Hồ sơ + lớp (HS) | `STUDENT` |
| `/portal/my-children` | Danh sách con (PH) | `PARENT` |

---

## Thứ tự phụ thuộc

```text
4A (schema + seed)
 └─► 4B (API teachers)
      └─► 4C (phân công)          ← cần teachers + course_sections
           └─► 4D (TKB)             ← cần course_sections + teachers
                └─► 4E (parents)     ← có thể song song với 4C sau 4A
                     └─► 4F (portal) ← cần teachers, students, parents
                          └─► 4G (frontend)
```

4E (parents) có thể song song với 4B–4D sau khi 4A xong — không phụ thuộc phân công.

---

## Quy tắc nghiệp vụ

| # | Quy tắc |
|---|---------|
| 1 | `SCHOOL_ADMIN` full CRUD GV, phân công, TKB, PH |
| 2 | Mọi query theo `schoolId` từ JWT |
| 3 | `teachers.user_id` nullable — GV có thể chưa có tài khoản login |
| 4 | Một `user_id` tối đa **một** `teachers` trong cùng trường |
| 5 | `homeroom_teacher_id` chỉ trỏ user role TEACHER cùng trường |
| 6 | Phân công: `teacher` và `course_section` cùng `school_id`; lớp môn thuộc học kỳ trong năm học đang làm việc |
| 7 | TKB entry phải khớp GV đã phân công lớp môn (strict mode — khuyến nghị) |
| 8 | `timetable_entries.semester_id` khớp `course_section.semester_id`; không trùng tiết lớp môn `(course_section_id, day_of_week, period_number)` |
| 9 | GV không trùng tiết trong cùng học kỳ: `(semester_id, teacher_id, day_of_week, period_number)` |
| 10 | PH chỉ xem HS có trong `student_parents` |
| 11 | GV chỉ xem HS lớp CN (`homeroom_teacher_id`) hoặc lớp môn được phân công |
| 12 | Không hard-delete — dùng `status = INACTIVE` |

---

## Mô hình dữ liệu (tóm tắt)

```text
users (role=TEACHER) ──optional──► teachers
                                      │
                                      ├──► teaching_assignments ──► course_sections
                                      │
                                      └──► timetable_entries (teacher_id)

users (role=PARENT) ──optional──► parents
                                      │
                                      └──► student_parents ──► students

homeroom_classes.homeroom_teacher_id ──► users (GVCN — Sprint 2, giữ nguyên)
```

**Phân biệt:**

| Bảng | Vai trò |
|------|---------|
| `users` | Đăng nhập (email, password, role) |
| `teachers` | Hồ sơ GV (ngày sinh, giới tính, địa chỉ, chuyên môn…) |
| `teaching_assignments` | GV dạy lớp môn nào |
| `timetable_entries` | Tiết học cụ thể theo học kỳ (thứ, tiết, phòng) |
| `parents` | Hồ sơ phụ huynh |
| `student_parents` | PH ↔ HS, quan hệ gia đình |

---

## Seed mẫu (trường DEMO)

| Dữ liệu | Giá trị |
|---------|---------|
| GV | 3 hồ sơ map `teacher1…3@demo.edu.vn` |
| GVCN | teacher1 → 10A1, teacher2 → 10A2 (đã có từ seed Sprint 3) |
| Phân công | teacher2 → TOAN-10A1; teacher3 → VAN-10A1; teacher1 → ANH-10A1 |
| TKB | 3 tiết mẫu HK1 (Thứ 2, tiết 1–3) cho TOAN/VAN/ANH 10A1 |
| PH | 2 hồ sơ gắn student1, student2 (bố/mẹ) |

Chi tiết: [schema-sprint4.md](../database/schema-sprint4.md)

---

## Checklist chất lượng cuối Sprint 4

- [ ] Migration deploy thành công trên Neon
- [ ] Seed idempotent — chạy lại không trùng
- [ ] Admin CRUD GV, phân công, TKB, PH
- [ ] TEACHER xem HS lớp CN — không xem lớp khác
- [ ] STUDENT xem profile — không xem HS khác
- [ ] PARENT chỉ xem con đã liên kết
- [ ] User trường A không đọc dữ liệu trường B
- [ ] Swagger cập nhật Sprint 4 endpoints
- [ ] `pnpm run build` + `pnpm run lint` pass (client + server)

---

## Tài liệu liên quan

| Tài liệu | Nội dung |
|----------|----------|
| [schema-sprint4.md](../database/schema-sprint4.md) | Chi tiết bảng & quan hệ |
| [sprint4-endpoints.md](../api/sprint4-endpoints.md) | REST API Sprint 4 |
| [010-parent-as-user.md](../decisions/010-parent-as-user.md) | ADR phụ huynh |
| [sprint-3-plan.md](./sprint-3-plan.md) | Sprint trước |
| [overview.md](../architecture/overview.md) | Roadmap tổng |

---

## Bước tiếp theo

Bắt đầu **Phase 4A** — Schema & Seed (`teachers`, `teaching_assignments`, `timetable_entries`, `parents`).
