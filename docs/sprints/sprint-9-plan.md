# Sprint 9 – Kế hoạch triển khai (Platform 1: Onboard tenant)

**Mục tiêu:** System admin quản lý vòng đời tenant (trường) — tạo trường mới, gán admin trường, khóa/mở trường — **không cần seed/SQL**  
**Thời gian ước tính:** 1,5–2 tuần  
**Ngôn ngữ UI:** Tiếng Việt  
**Phụ thuộc:** Sprint 8 (import/export, PDF) — hoặc song song nếu tách người  
**Trạng thái:** 🟡 Gần xong — Phase 9A–9B ✅; 9C–9D còn vài hạng mục nhỏ

## Điều kiện hoàn thành

```text
System admin đăng nhập (system_admin@demo.edu.vn)
→ Vào /platform — thấy danh sách trường (DEMO, …)
→ Tạo trường mới (code, tên, loại) + email/mật khẩu school admin đầu tiên
→ Trường mới status ACTIVE
→ Đăng xuất → school admin trường mới đăng nhập
→ GET /schools/current trả đúng trường; menu admin trống (chưa có HS/GV)
→ System admin suspend trường → school admin trường đó không login được
→ Migration + e2e platform pass
```

## Quyết định MVP

| Hạng mục          | Quyết định                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Role platform     | `SYSTEM_ADMIN` — đã có enum; bổ sung guard + UI                                                  |
| Kiến trúc API     | Module `platform/` — prefix `/platform/*` — [ADR 013](../decisions/013-platform-admin-module.md) |
| Tenant guard      | **Không** áp dụng `TenantGuard` cho route platform                                               |
| System admin      | `users.school_id = null` — không dùng trường ảo                                                  |
| Onboard           | `POST /platform/schools` tạo `school` + `user` SCHOOL_ADMIN trong một transaction                |
| Trạng thái trường | Dùng `SchoolStatus`: `ACTIVE`, `INACTIVE`, `SUSPENDED`                                           |
| Khởi tạo học vụ   | Tự động seed `grade_levels` theo `schoolType` khi tạo trường (TH→1–5, THCS→6–9, THPT→10–12) |
| Impersonation     | **Sprint 10**                                                                                    |
| Billing / quota   | **Sprint 11**                                                                                    |

## Phạm vi Sprint 9

### Trong phạm vi

| Module                   | Mô tả                                                                        |
| ------------------------ | ---------------------------------------------------------------------------- |
| **Backend guard**        | ✅ `PlatformGuard` — chỉ `SYSTEM_ADMIN`                                      |
| **Platform schools API** | ✅ List, create, get, patch metadata, patch status                           |
| **Onboard admin**        | ✅ Tạo user `SCHOOL_ADMIN` khi tạo trường; hash mật khẩu bcrypt              |
| **Login policy**         | ✅ User thuộc trường `SUSPENDED` / `INACTIVE` → từ chối login               |
| **Frontend**             | ✅ `/platform` dashboard + `/platform/schools` + detail + quản lý admin      |
| **Sidebar**              | ✅ System admin menu platform (không menu học vụ trường)                     |
| **Seed / script**        | ✅ `prisma:seed-demo-admins`; tài khoản demo tách school/system admin        |
| **E2E**                  | ✅ `test/platform-schools.e2e-spec.ts` (cần DB để pass)                      |
| **Docs**                 | ✅ ADR 013, sprint9-endpoints, local-dev                                     |

### Ngoài phạm vi

- Impersonation / switch context trường — Sprint 10
- Audit log platform — Sprint 10
- Dashboard metrics (số HS/GV aggregate) — Sprint 10
- Wizard khởi tạo năm học khi tạo trường
- Self-service đăng ký trường (public signup)
- Xóa cứng tenant + cascade (chỉ suspend trong MVP)
- Multi system admin UI (invite staff) — phase sau

---

## Tiền đề đã có (trước Sprint 9)

| Hạng mục                      | Trạng thái                                         |
| ----------------------------- | -------------------------------------------------- |
| Enum `UserRole.SYSTEM_ADMIN`  | ✅ Migration `add_system_admin_role`               |
| Tài khoản demo system admin   | ✅ `system_admin@demo.edu.vn`                      |
| Tài khoản demo school admin   | ✅ `school_admin@demo.edu.vn` (tách khỏi `admin@`) |
| Trường `platform`             | ❌ Đã bỏ — `SYSTEM_ADMIN.school_id = null`         |
| Trang `/platform` placeholder | ✅ Dashboard + link quản lý trường                 |
| API `/platform/schools`       | ✅ CRUD + admins + seed khối mặc định           |

---

## Phases

### Phase 9A – Guard & module scaffold ✅

| #   | Task                         | File chính                                                                |
| --- | ---------------------------- | ------------------------------------------------------------------------- |
| 1   | ADR platform module          | [013-platform-admin-module.md](../decisions/013-platform-admin-module.md) |
| 2   | `PlatformGuard`              | `server/src/common/guards/platform.guard.ts`                              |
| 3   | Module `platform`            | `server/src/modules/platform/`                                            |
| 4   | Register `PlatformModule`    | `server/src/app.module.ts`                                                |
| 5   | Zod schemas platform schools | `platform/schemas/`                                                       |

**Quy tắc guard:**

```text
PlatformGuard: user.role === SYSTEM_ADMIN
Không dùng TenantGuard trên controller platform
```

---

### Phase 9B – API quản lý trường ✅

| #   | Task                                 | Endpoint                             |
| --- | ------------------------------------ | ------------------------------------ |
| 1   | Danh sách trường                     | `GET /platform/schools`              |
| 2   | Chi tiết trường                      | `GET /platform/schools/:id`          |
| 3   | Tạo trường + admin                   | `POST /platform/schools`             |
| 4   | Cập nhật metadata                    | `PATCH /platform/schools/:id`        |
| 5   | Đổi trạng thái                       | `PATCH /platform/schools/:id/status` |
| 6   | Validate `code` unique toàn hệ thống | service                              |
| 7   | Auth: chặn login trường suspended    | `auth.service.ts`                    |

**Bổ sung (ngoài bảng gốc):**

| Hạng mục | Endpoint / file | Trạng thái |
| -------- | --------------- | ---------- |
| Seed khối mặc định theo `schoolType` | `POST /platform/schools` (tự động) | ✅ |
| Danh sách / thêm admin trường | `GET/POST /platform/schools/:id/admins` | ✅ |
| Migration bỏ `SchoolType.OTHER` | `20260810120000_remove_school_type_other` | ✅ |

**Body tạo trường (MVP):**

| Field           | Bắt buộc | Ghi chú                         |
| --------------- | -------- | ------------------------------- |
| `code`          | Có       | Unique, `[A-Za-z0-9_-]`, max 50 |
| `name`          | Có       | Tên đầy đủ                      |
| `shortName`     | Không    |                                 |
| `schoolType`    | Không    | `TH` \| `THCS` \| `THPT`        |
| `adminEmail`    | Có       | Email school admin đầu tiên     |
| `adminPassword` | Có       | Min 8 ký tự                     |
| `adminFullName` | Không    | Default: "Quản trị viên {name}" |

**Transaction create:**

```text
POST /platform/schools
→ Validate code + email chưa tồn tại
→ prisma.$transaction:
    1. schools.create({ status: ACTIVE, ... })
    2. users.create({ role: SCHOOL_ADMIN, schoolId, ... })
    3. grade_levels.createMany (theo schoolType, nếu có)
→ 201 + school + adminSummary (không trả passwordHash)
```

Chi tiết: [sprint9-endpoints.md](../api/sprint9-endpoints.md)

---

### Phase 9C – Frontend platform

| #   | Task                              | Route / component                              | Trạng thái |
| --- | --------------------------------- | ---------------------------------------------- | ---------- |
| 1   | API client platform               | `client/src/features/platform/api/`            | ✅         |
| 2   | Danh sách trường                  | `/platform/schools`                            | ✅         |
| 3   | Form tạo trường                   | inline form                                    | ✅         |
| 4   | Badge trạng thái ACTIVE/SUSPENDED | table column                                   | ✅         |
| 5   | Action suspend / activate         | confirm dialog                                 | ⬜ (có nút trực tiếp, chưa confirm) |
| 6   | Cập nhật dashboard `/platform`    | thống kê số trường (count đơn giản)            | ✅         |
| 7   | RoleGate router                   | chỉ SYSTEM_ADMIN vào `/platform/*`             | ✅         |

**Bổ sung (ngoài bảng gốc):**

| Hạng mục | Route / component | Trạng thái |
| -------- | ----------------- | ---------- |
| Chi tiết trường + sửa metadata | `/platform/schools/:id` | ✅ |
| Quản lý thêm school admin | detail page section | ✅ |
| Sidebar «Quản lý trường» | `app-sidebar.tsx` | ✅ |
| Click row → detail | `platform-schools-page` | ✅ |
| `schoolType` read-only cho SCHOOL_ADMIN | `/school-settings` | ✅ |

---

### Phase 9D – Test & docs

| #   | Task                                    | File                                                  | Trạng thái |
| --- | --------------------------------------- | ----------------------------------------------------- | ---------- |
| 1   | E2E platform schools                    | `server/test/platform-schools.e2e-spec.ts`            | ✅ (file có; cần DB để chạy pass) |
| 2   | E2E 403: school admin gọi `/platform/*` | e2e                                                   | ✅ |
| 3   | Cập nhật local-dev credentials          | [local-development.md](../setup/local-development.md) | ✅ |
| 4   | Postman / sync collection               | `scripts/sync-postman-nestjs.mjs`                     | ⬜ |

---

## Quy tắc nghiệp vụ

| #   | Quy tắc                                                             |
| --- | ------------------------------------------------------------------- |
| 1   | Chỉ `SYSTEM_ADMIN` gọi được `/platform/*`                           |
| 2   | `schools.code` unique toàn hệ thống                                 |
| 3   | Không xóa cứng trường có dữ liệu — MVP chỉ `SUSPENDED` / `INACTIVE` |
| 4   | Tạo trường không copy dữ liệu từ DEMO                               |
| 5   | Email admin trường unique toàn bảng `users`                         |
| 6   | Login: nếu `school.status !== ACTIVE` → `403 SCHOOL_SUSPENDED`      |
| 7   | System admin login OK với `school_id = null` (không cần trường ảo)  |

---

## Kế thừa ADR / sprint trước

| Hạng mục hoãn              | Nguồn               | Sprint 9                                     |
| -------------------------- | ------------------- | -------------------------------------------- |
| Platform Super Admin UI    | ADR 002             | Phase 9C                                     |
| API tạo trường             | ADR 002 Sprint 1.5+ | Phase 9B                                     |
| Script CLI `create-school` | multi-tenancy.md    | Thay bằng API + UI (giữ script dev tuỳ chọn) |
| Role SYSTEM_ADMIN          | —                   | Phase 9A (enum ✅)                           |

---

## Seed / demo

| Tài khoản         | Email                      | Mật khẩu             | Vai trò       |
| ----------------- | -------------------------- | -------------------- | ------------- |
| System admin      | `system_admin@demo.edu.vn` | `SystemAdmin@123456` | SYSTEM_ADMIN (`school_id` null) |
| School admin DEMO | `school_admin@demo.edu.vn` | `SchoolAdmin@123456` | SCHOOL_ADMIN  |
| Trường demo       | theo `SEED_SCHOOL_CODE`    | —                    | Tenant học vụ |

Script cập nhật admin: `pnpm prisma:seed-demo-admins`

---

## Tài liệu liên quan

| Tài liệu                                                                  | Nội dung               |
| ------------------------------------------------------------------------- | ---------------------- |
| [013-platform-admin-module.md](../decisions/013-platform-admin-module.md) | ADR kiến trúc platform |
| [sprint9-endpoints.md](../api/sprint9-endpoints.md)                       | REST API               |
| [sprint-8-plan.md](./sprint-8-plan.md)                                    | Sprint trước (học vụ)  |
| [multi-tenancy.md](../architecture/multi-tenancy.md)                      | Quy tắc tenant         |
| [002-seed-first-school.md](../decisions/002-seed-first-school.md)         | Seed vs platform       |

---

## Bước tiếp theo

1. ⬜ Confirm dialog trước khi suspend/kích hoạt trường (Phase 9C #5)
2. ⬜ Sync Postman collection endpoint platform (Phase 9D #4)
3. ⬜ Chạy E2E `platform-schools.e2e-spec.ts` trên DB dev/staging
4. Sau Sprint 9 → [Sprint 10](./sprint-10-plan.md) (impersonation, audit, monitoring)
