# Sprint 2 – Kế hoạch triển khai

**Mục tiêu:** Khung học vụ cơ bản — năm học, khối, môn, lớp hành chính, lớp môn học  
**Thời gian ước tính:** 2–3 tuần  
**Ngôn ngữ UI:** Tiếng Việt  
**Phụ thuộc:** Sprint 1 hoàn thành (auth, tenant, quản lý user)

## Điều kiện hoàn thành

```text
Admin đăng nhập trường DEMO
→ Tạo / quản lý năm học (đặt năm hiện hành)
→ Tạo khối (10, 11, 12…) và môn học
→ Tạo lớp hành chính (10A1…) gắn năm học + khối
→ Tạo lớp môn học (Toán 10A1…) gắn môn + lớp HC
→ Mọi API lọc đúng school_id (tenant isolation)
→ UI tiếng Việt, chỉ SCHOOL_ADMIN quản lý cấu trúc học vụ
→ Migration + seed + build + lint pass
```

## Quyết định MVP đã chốt (kế thừa Sprint 1)

| Hạng mục | Quyết định | ADR |
|----------|------------|-----|
| Tenant | Mọi bảng mới có `school_id`, filter từ `activeSchoolId` | [multi-tenancy.md](../architecture/multi-tenancy.md) |
| RBAC | Chỉ `SCHOOL_ADMIN` CRUD cấu trúc học vụ; TEACHER/STUDENT xem sau | [008](../decisions/008-simplify-rbac-mvp.md) |
| Validation | Zod (backend + frontend form) | [004](../decisions/004-validation-library.md) |
| Học sinh / GV profile | **Chưa có** — chỉ user account Sprint 1 | Sprint 3–4 |
| Gán GVCN cho lớp | `homeroom_teacher_id` → `users.id` (optional, nullable) | Sprint 2 |
| Upload logo / file | Hoãn | Sprint 3 (R2) |
| Audit logs | Hoãn (có thể Sprint 1.5) | [007](../decisions/007-defer-audit-logs.md) |

## Phạm vi Sprint 2

### Trong phạm vi

| Module | Mô tả |
|--------|-------|
| Năm học | CRUD `academic_years`, đặt năm hiện hành |
| Học kỳ | CRUD `semesters` thuộc năm học |
| Khối | CRUD `grade_levels` |
| Môn học | CRUD `subjects` |
| Lớp hành chính | CRUD `homeroom_classes` |
| Lớp môn học | CRUD `course_sections` |
| Seed | Năm học + khối + môn + lớp mẫu cho trường DEMO |
| Frontend | Trang quản lý từng module, sidebar admin |

### Ngoài phạm vi

- Hồ sơ học sinh (`students`), enrollment (Sprint 3)
- Hồ sơ giáo viên (`teachers`), phân công giảng dạy (Sprint 4)
- Thời khóa biểu, điểm danh, điểm số (Sprint 4–6)
- Import Excel hàng loạt
- Sao chép cấu trúc từ năm học cũ sang năm mới (nice-to-have, defer)
- Xóa cứng (hard delete) — dùng `status` INACTIVE

---

## Phases

### Phase 2A – Schema & Seed ✅

**Mục tiêu:** Database Sprint 2, seed dữ liệu học vụ mẫu.

| # | Task | File chính |
|---|------|------------|
| 1 | Prisma schema Sprint 2 (7 bảng mới) | `server/prisma/schema.prisma` |
| 2 | Migration | `server/prisma/migrations/20260723132737_init_sprint2_academic/` |
| 3 | Seed idempotent: năm học, khối, môn, lớp mẫu | `server/prisma/seed.ts` |
| 4 | Cập nhật docs schema | [schema-sprint2.md](../database/schema-sprint2.md) |

**Bảng mới:** `academic_years`, `semesters`, `grade_levels`, `subjects`, `grade_level_subjects`, `homeroom_classes`, `course_sections`

**Ràng buộc chính:**

- Mọi bảng có `school_id`
- Mỗi trường tối đa **một** năm học `is_current = true`
- `homeroom_classes`: unique `(school_id, academic_year_id, code)`
- `course_sections`: unique `(school_id, semester_id, code)`

---

### Phase 2B – API năm học & học kỳ ✅

**Mục tiêu:** Quản lý năm học và học kỳ trong tenant.

| # | Task | File chính |
|---|------|------------|
| 1 | Module `academic-years` | `server/src/modules/academic-years/` |
| 2 | CRUD năm học + `PATCH .../set-current` | controller + service |
| 3 | Module `semesters` (nested hoặc sub-route) | `server/src/modules/semesters/` |
| 4 | CRUD học kỳ theo năm học | |
| 5 | Tenant isolation + `@Roles(SCHOOL_ADMIN)` | |
| 6 | Swagger + E2E unauthorized | `test/academic.e2e-spec.ts` |

**Endpoints:** xem [sprint2-endpoints.md](../api/sprint2-endpoints.md)

---

### Phase 2C – API khối & môn học ✅

**Mục tiêu:** Danh mục khối và môn trong trường.

| # | Task | File chính |
|---|------|------------|
| 1 | Module `grade-levels` | `server/src/modules/grade-levels/` |
| 2 | Module `subjects` | `server/src/modules/subjects/` |
| 3 | CRUD + pagination + search | |
| 4 | Unique code trong trường | service validation |
| 5 | Swagger | |

---

### Phase 2D – API lớp hành chính & lớp môn ✅

**Mục tiêu:** Lớp HC và lớp môn gắn năm học.

| # | Task | File chính |
|---|------|------------|
| 1 | Module `homeroom-classes` | `server/src/modules/homeroom-classes/` |
| 2 | Module `course-sections` | `server/src/modules/course-sections/` |
| 3 | FK validation (năm học, khối, môn cùng tenant) | service layer |
| 4 | Gán GVCN optional (`homeroom_teacher_id` → user TEACHER) | |
| 5 | Không xóa năm học đang có lớp (422) | business rule |
| 6 | E2E tenant isolation | `test/academic-structure.e2e-spec.ts` |

---

### Phase 2E – Frontend ✅

**Mục tiêu:** UI quản lý cấu trúc học vụ.

| # | Task | File chính |
|---|------|------------|
| 1 | Feature `academic-years` | `client/src/features/academic-years/` |
| 2 | Feature `grade-levels` | `client/src/features/grade-levels/` |
| 3 | Feature `subjects` | `client/src/features/subjects/` |
| 4 | Feature `homeroom-classes` | `client/src/features/homeroom-classes/` |
| 5 | Feature `course-sections` | `client/src/features/course-sections/` |
| 6 | Sidebar nhóm "Học vụ" (SCHOOL_ADMIN) | `app-sidebar.tsx` |
| 7 | TanStack Table + filter + pagination (pattern `/users`) | |
| 8 | Loading chỉ vùng bảng (`keepPreviousData`) | |

**UI routes:**

| Path | Trang | Role |
|------|-------|------|
| `/academic-years` | Năm học & học kỳ | `SCHOOL_ADMIN` |
| `/grade-levels` | Khối | `SCHOOL_ADMIN` |
| `/subjects` | Môn học | `SCHOOL_ADMIN` |
| `/homeroom-classes` | Lớp hành chính | `SCHOOL_ADMIN` |
| `/course-sections` | Lớp môn học | `SCHOOL_ADMIN` |

**Không triển khai:** wizard setup một lần, drag-drop sắp xếp khối

---

## Thứ tự phụ thuộc

```text
2A (schema + seed)
 └─► 2B (năm học, học kỳ)
      └─► 2C (khối, môn)        ← có thể song song sau 2B
           └─► 2D (lớp HC, lớp môn)
                └─► 2E (frontend)
```

2C có thể bắt đầu song song với 2B (không phụ thuộc năm học).  
2D **bắt buộc** sau 2B và 2C (cần FK năm học, khối, môn).

---

## Quy tắc nghiệp vụ

| # | Quy tắc |
|---|---------|
| 1 | Chỉ `SCHOOL_ADMIN` được tạo/sửa/xóa cấu trúc học vụ |
| 2 | Mọi query theo `schoolId` từ JWT — không tin `schoolId` client |
| 3 | Một trường chỉ có **một** năm học `isCurrent = true` |
| 4 | Không set INACTIVE năm học `isCurrent` — phải chuyển current trước |
| 5 | `homeroom_teacher_id` phải là user `TEACHER` cùng trường |
| 6 | `course_sections.homeroom_class_id` optional — lớp môn có thể không gắn lớp HC |
| 7 | Deactivate (status INACTIVE) thay vì xóa cứng khi đã có dữ liệu liên quan |

---

## Checklist chất lượng cuối Sprint 2

- [ ] Migration deploy thành công trên Neon
- [ ] Seed idempotent — chạy lại không trùng
- [ ] Admin tạo năm học, đặt current, tạo HK1/HK2
- [ ] Admin tạo khối, môn, lớp HC, lớp môn qua UI
- [ ] User trường A không đọc năm học/lớp trường B
- [ ] TEACHER không POST/PATCH cấu trúc học vụ (403)
- [ ] Swagger cập nhật đầy đủ Sprint 2 endpoints
- [ ] `pnpm run build` pass cả client và server
- [ ] `pnpm run lint` pass
- [ ] Frontend tiếng Việt, sidebar nhóm Học vụ

---

## Tài liệu liên quan

| Tài liệu | Nội dung |
|----------|----------|
| [schema-sprint2.md](../database/schema-sprint2.md) | Chi tiết bảng & quan hệ |
| [sprint2-endpoints.md](../api/sprint2-endpoints.md) | REST API Sprint 2 |
| [sprint-1-plan.md](./sprint-1-plan.md) | Sprint trước |
| [overview.md](../architecture/overview.md) | Roadmap tổng |

---

## Bước tiếp theo

Chuyển sang **Sprint 3** — hồ sơ học sinh, ghi danh, upload file. Xem [sprint-3-plan.md](./sprint-3-plan.md).
