# Sprint 3 – Kế hoạch triển khai

**Mục tiêu:** Hồ sơ học sinh, ghi danh lớp hành chính, chuyển lớp, upload file (R2)  
**Thời gian ước tính:** 2–3 tuần  
**Ngôn ngữ UI:** Tiếng Việt  
**Phụ thuộc:** Sprint 2 hoàn thành (cấu trúc học vụ: năm học, lớp HC)

## Điều kiện hoàn thành

```text
Admin đăng nhập trường DEMO
→ Tạo / sửa hồ sơ học sinh (students)
→ Gắn tài khoản user STUDENT (optional) hoặc tạo hồ sơ không login
→ Ghi danh HS vào lớp HC trong năm học hiện hành
→ Chuyển lớp — giữ lịch sử enrollment
→ Upload logo trường qua Cloudflare R2
→ Mọi API lọc đúng school_id (tenant isolation)
→ UI tiếng Việt, SCHOOL_ADMIN quản lý HS & ghi danh
→ Migration + seed + build + lint pass
```

## Quyết định MVP đã chốt

| Hạng mục | Quyết định |
|----------|------------|
| Bảng `users` | **Giữ nguyên** — auth cho mọi role |
| Hồ sơ HS | Bảng `students` riêng, `user_id` nullable → `users.id` |
| Mã học sinh / mã GV | **Không dùng** MVP — dùng `id` (UUID) làm định danh |
| Ghi danh | Bảng `student_enrollments` — HS ↔ lớp HC ↔ năm học |
| Chuyển lớp (cùng trường) | Đóng enrollment cũ (`left_at`, status) + tạo enrollment mới — **không xóa cứng** |
| Chuyển trường (HS sang trường khác) | **Không** MVP — mỗi HS thuộc một `school_id`; xem [ADR 006](../decisions/006-defer-switch-school.md) |
| `enrolled_at` | Ngày ghi danh vào lớp HC (khác ngày tạo hồ sơ) |
| Upload file | Cloudflare R2 + bảng `files` metadata |
| Hồ sơ giáo viên | **Sprint 4** — ngoài phạm vi |
| Phụ huynh (user + `parents`) | **Sprint 4** — [ADR 010](../decisions/010-parent-as-user.md) |
| Import Excel | Hoãn |
| API đọc cho TEACHER/STUDENT | Hoãn — Sprint 4+ |
| Auto tạo khối theo loại trường | **Không** — admin tạo khối thủ công (Sprint 2) |

## Phạm vi Sprint 3

### Trong phạm vi

| Module | Mô tả |
|--------|-------|
| Hồ sơ học sinh | CRUD `students`, liên kết `users` optional |
| Ghi danh | CRUD `student_enrollments`, gán lớp HC theo năm học |
| Chuyển lớp | Transaction: kết thúc enrollment cũ + tạo mới |
| File / R2 | Upload, metadata `files`, logo trường |
| Seed | 5 HS DEMO map `student1…5@demo.edu.vn`, ghi danh 10A1 |
| Frontend | Trang quản lý HS, ghi danh, chuyển lớp |

### Ngoài phạm vi

- Bảng `teachers`, phân công giảng dạy (Sprint 4)
- Ghi danh lớp môn (`course_section_enrollments`) — defer
- Thời khóa biểu, điểm danh, điểm số (Sprint 4–6)
- Import Excel hàng loạt
- Mã HS/GV (`student_code`, `teacher_code`)
- **Chuyển trường** — HS chuyển sang trường khác, user đa trường, `switch-school` ([ADR 006](../decisions/006-defer-switch-school.md))
- Audit logs — [007](../decisions/007-defer-audit-logs.md)

---

## Phases

### Phase 3A – Schema & Seed ✅

**Mục tiêu:** Database Sprint 3, seed hồ sơ HS + enrollment mẫu.

| # | Task | File chính |
|---|------|------------|
| 1 | Prisma schema: `students`, `student_enrollments`, `files` | `server/prisma/schema.prisma` ✅ |
| 2 | Migration | `server/prisma/migrations/20260725150721_init_sprint3_students_files/` ✅ |
| 3 | Cập nhật `schools.logo_file_id` FK → `files` | schema ✅ |
| 4 | Seed idempotent: 5 HS + enrollment lớp 10A1 | `server/prisma/seed.ts` ✅ |
| 5 | Docs schema | [schema-sprint3.md](../database/schema-sprint3.md) ✅ |

**Bảng mới:** `students`, `student_enrollments`, `files`

**Enum mới:** `EnrollmentStatus`, `FilePurpose`

---

### Phase 3B – API học sinh ✅

**Mục tiêu:** CRUD hồ sơ học sinh trong tenant.

| # | Task | File chính |
|---|------|------------|
| 1 | Module `students` | `server/src/modules/students/` ✅ |
| 2 | CRUD + pagination + search (tên, email user) | ✅ |
| 3 | Tạo HS kèm user account (optional) | service transaction ✅ |
| 4 | Validate `user_id` → role STUDENT, cùng trường | ✅ |
| 5 | `@Roles(SCHOOL_ADMIN)` + tenant isolation | ✅ |
| 6 | Swagger + E2E unauthorized | `test/students.e2e-spec.ts` ✅ |

**Endpoints:** xem [sprint3-endpoints.md](../api/sprint3-endpoints.md)

---

### Phase 3C – API ghi danh & chuyển lớp ✅

**Mục tiêu:** Ghi danh HS vào lớp HC, chuyển lớp có lịch sử.

| # | Task | File chính |
|---|------|------------|
| 1 | Module `student-enrollments` | `server/src/modules/student-enrollments/` ✅ |
| 2 | POST ghi danh — validate lớp HC + năm học cùng tenant | ✅ |
| 3 | Một HS tối đa **một** enrollment ACTIVE / năm học | unique partial ✅ |
| 4 | POST chuyển lớp — transaction | ✅ |
| 5 | GET danh sách theo lớp HC / năm học / HS | ✅ |
| 6 | E2E unauthorized | `test/student-enrollments.e2e-spec.ts` ✅ |

---

### Phase 3D – Upload file (R2) ✅

**Mục tiêu:** Lưu file trên Cloudflare R2, metadata trong DB.

| # | Task | File chính |
|---|------|------------|
| 1 | Module `files` + R2 client | `server/src/modules/files/` |
| 2 | Env: `R2_*` credentials | `.env.example`, `env.schema.ts` |
| 3 | POST upload (multipart) — logo trường | |
| 4 | PATCH `schools/current` gắn `logo_file_id` | mở rộng schools module |
| 5 | GET signed URL hoặc proxy public logo | |
| 6 | Giới hạn mime + size | validation |

---

### Phase 3E – Frontend ✅

**Mục tiêu:** UI quản lý học sinh và ghi danh.

| # | Task | File chính |
|---|------|------------|
| 1 | Feature `students` | `client/src/features/students/` |
| 2 | Feature `student-enrollments` (hoặc nested trong students) | |
| 3 | Trang ghi danh / chuyển lớp (modal hoặc wizard ngắn) | |
| 4 | Upload logo trên trang Cài đặt trường | mở rộng `school-settings` |
| 5 | Sidebar nhóm mới hoặc mục "Học sinh" | `app-sidebar.tsx` |
| 6 | Pattern TanStack Table + `keepPreviousData` | |

**UI routes:**

| Path | Trang | Role |
|------|-------|------|
| `/students` | Danh sách & hồ sơ HS | `SCHOOL_ADMIN` |
| `/students/:id` | Chi tiết HS + lịch sử ghi danh | `SCHOOL_ADMIN` |
| `/school-settings` | Thêm upload logo | `SCHOOL_ADMIN` |

---

## Thứ tự phụ thuộc

```text
3A (schema + seed)
 └─► 3B (API students)
      └─► 3C (enrollment + chuyển lớp)   ← cần students + homeroom_classes
           └─► 3D (R2)                   ← có thể song song với 3C
                └─► 3E (frontend)
```

3D (R2) có thể bắt đầu song song sau 3A — không phụ thuộc enrollment.

---

## Quy tắc nghiệp vụ

| # | Quy tắc |
|---|---------|
| 1 | Chỉ `SCHOOL_ADMIN` CRUD HS, ghi danh, chuyển lớp |
| 2 | Mọi query theo `schoolId` từ JWT |
| 3 | `students.user_id` nullable — HS có thể chưa có tài khoản login |
| 4 | Một `user_id` tối đa **một** `students` trong cùng trường |
| 5 | Một HS tối đa **một** enrollment `ACTIVE` trong cùng `academic_year_id` |
| 6 | Lớp HC phải thuộc cùng `academic_year_id` khi ghi danh |
| 7 | Khối lớp HC phải phù hợp (validate `homeroom_class.grade_level_id` — optional strict mode) |
| 8 | **Chuyển lớp** (cùng trường): enrollment cũ → `TRANSFERRED` + `left_at`, tạo enrollment mới `ACTIVE` |
| 9 | Không hard-delete enrollment — giữ lịch sử |
| 10 | Không dùng mã HS — tra cứu bằng tên, email user, lớp HC |
| 11 | **Chuyển trường** không hỗ trợ MVP — HS chỉ thuộc một trường; không di chuyển hồ sơ cross-tenant |

---

## Mô hình dữ liệu (tóm tắt)

```text
users (role=STUDENT) ──optional──► students
                                      │
                                      └──► student_enrollments
                                              ├── academic_year_id
                                              └── homeroom_class_id

schools.logo_file_id ──► files ──► Cloudflare R2
```

**Phân biệt:**

| Bảng | Vai trò |
|------|---------|
| `users` | Đăng nhập (email, password, role) |
| `students` | Hồ sơ HS (ngày sinh, PH, địa chỉ…) |
| `student_enrollments` | HS thuộc lớp HC nào, năm nào, từ ngày nào |

---

## Seed mẫu (trường DEMO)

| Dữ liệu | Giá trị |
|---------|---------|
| HS | 5 hồ sơ map `student1…5@demo.edu.vn` |
| Ghi danh | Cả 5 vào lớp **10A1**, năm **2025-2026** |
| File | 1 logo trường (optional) |

Chi tiết: [schema-sprint3.md](../database/schema-sprint3.md)

---

## Checklist chất lượng cuối Sprint 3

- [ ] Migration deploy thành công trên Neon
- [ ] Seed idempotent — chạy lại không trùng
- [ ] Admin tạo HS có/không tài khoản login
- [ ] Admin ghi danh HS vào lớp HC
- [ ] Admin chuyển lớp — lịch sử enrollment còn
- [ ] Upload logo trường hiển thị trên UI
- [ ] User trường A không đọc HS trường B
- [ ] TEACHER không CRUD HS (403)
- [ ] Swagger cập nhật Sprint 3 endpoints
- [ ] `pnpm run build` + `pnpm run lint` pass

---

## Tài liệu liên quan

| Tài liệu | Nội dung |
|----------|----------|
| [schema-sprint3.md](../database/schema-sprint3.md) | Chi tiết bảng & quan hệ |
| [sprint3-endpoints.md](../api/sprint3-endpoints.md) | REST API Sprint 3 |
| [sprint-2-plan.md](./sprint-2-plan.md) | Sprint trước |
| [overview.md](../architecture/overview.md) | Roadmap tổng |

---

## Bước tiếp theo

Bắt đầu **Sprint 4** — xem [sprint-4-plan.md](./sprint-4-plan.md), Phase 4A (Schema & Seed).
