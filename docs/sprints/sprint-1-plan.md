# Sprint 1 – Kế hoạch triển khai

**Mục tiêu:** Nền tảng SaaS, Authentication, phân quyền đơn giản theo role  
**Thời gian ước tính:** 2–3 tuần  
**Ngôn ngữ UI:** Tiếng Việt

## Điều kiện hoàn thành

```text
Seed tạo trường + admin
→ Admin đăng nhập (activeSchoolId = user.school_id)
→ Admin tạo user & gán role (UI)
→ User đăng nhập → vào thẳng trường của mình
→ Sidebar/menu theo role
→ Backend từ chối truy cập chéo tenant
→ Test auth + tenant isolation pass
→ Build thành công cả client và server
```

## Quyết định MVP đã chốt

| Hạng mục | Quyết định | ADR |
|----------|------------|-----|
| Session storage | JWT stateless, không DB/Redis | [005](../decisions/005-session-storage.md) |
| Validation backend | Zod | [004](../decisions/004-validation-library.md) |
| Switch school | Hoãn — không endpoint/UI | [006](../decisions/006-defer-switch-school.md) |
| Audit logs | Hoãn — không bảng/API Sprint 1 | [007](../decisions/007-defer-audit-logs.md) |
| RBAC đơn giản | Role enum trên user, không permission matrix | [008](../decisions/008-simplify-rbac-mvp.md) |

## Phases

### Phase 1A – Nền tảng server ✅

**Mục tiêu:** NestJS chạy đúng chuẩn, sẵn sàng gắn Prisma.

| # | Task | Trạng thái |
|---|------|------------|
| 1 | Cài Prisma 6 + `@prisma/client` | ✅ |
| 2 | Env validation (Zod) | ✅ |
| 2b | ZodValidationPipe + map ZodError | ✅ |
| 3 | Global prefix `/api/v1` | ✅ |
| 4 | CORS đúng chuẩn cookie | ✅ |
| 5 | Global exception filter + response wrapper | ✅ |
| 6 | Request ID interceptor | ✅ |
| 7 | `GET /health` | ✅ |
| 8 | Cập nhật `.env.example` | ✅ |
| 9 | Sửa/xóa test hỏng | ✅ |
| 10 | Swagger setup | ✅ |

---

### Phase 1B – Schema & Seed ✅

**Mục tiêu:** Database Sprint 1 sẵn sàng với dữ liệu khởi tạo.

| # | Task | Trạng thái |
|---|------|------------|
| 1 | Prisma schema Sprint 1 (đơn giản hóa) | ✅ |
| 2 | Migration init + simplify RBAC | ✅ `20260720102813_init_sprint1`, `20260720163000_simplify_rbac_mvp` |
| 3 | PrismaService (NestJS) | ✅ (Phase 1A) |
| 4 | Seed script idempotent | ✅ |
| 5 | Seed config + scripts | ✅ |
| 6 | Test kết nối Neon | ✅ qua health check |

**Bảng Sprint 1:** `schools`, `users` (có `school_id`, `role`)

**Không tạo:** `auth_sessions` (ADR 005), `audit_logs` (ADR 007), `school_memberships`, `roles`, `permissions` (ADR 008)

Chi tiết schema: [schema-sprint1.md](../database/schema-sprint1.md)

---

### Phase 1C – Auth backend ✅

**Mục tiêu:** Login, logout, refresh, guards — JWT stateless.

| # | Task | Trạng thái |
|---|------|------------|
| 1 | Auth module | ✅ `server/src/modules/auth/` |
| 2 | Password hashing (bcrypt) | ✅ `server/src/common/utils/password.service.ts` |
| 3 | JWT access + refresh (HttpOnly cookie) | ✅ `server/src/common/auth/jwt-token.service.ts` |
| 4 | Cookie helpers | ✅ `server/src/common/auth/cookie.service.ts` |
| 5 | Login: set activeSchoolId = user.school_id | ✅ |
| 6 | JwtAuthGuard (global) | ✅ `server/src/common/guards/jwt-auth.guard.ts` |
| 7 | TenantGuard | ✅ `server/src/common/guards/tenant.guard.ts` |
| 8 | RoleGuard + `@Roles()` decorator | ✅ |
| 9 | `@CurrentUser()` + `@Public()` decorators | ✅ |
| 10 | Unit test auth | ⏭️ Bỏ qua theo yêu cầu |
| 11 | Integration test login flow | ⏭️ Chưa triển khai |

**Endpoints:** `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`

**Không triển khai:** `switch-school`, session DB, Redis, **audit logs** (ADR 007), PermissionGuard

Chi tiết auth: [authentication.md](../architecture/authentication.md)

---

### Phase 1D – Admin API ✅

**Mục tiêu:** Quản lý user và thông tin trường trong tenant.

| # | Task | Trạng thái |
|---|------|------------|
| 1 | GET/PATCH schools/current | ✅ `modules/schools/` |
| 2 | CRUD users (trong trường, gán role) | ✅ `modules/users/` |
| 3 | Tenant isolation (service layer) | ✅ filter `schoolId` |
| 4 | RoleGuard trên admin routes | ✅ `@Roles(SCHOOL_ADMIN)` |
| 5 | Swagger docs | ✅ `@ApiTags`, `@ApiOperation` |
| 6 | E2E unauthorized tests | ✅ `test/admin.e2e-spec.ts` |

API chi tiết: [sprint1-endpoints.md](../api/sprint1-endpoints.md)

---

### Phase 1E – Frontend ✅

**Mục tiêu:** UI tiếng Việt, auth flow, quản lý user.

| # | Task | Trạng thái |
|---|------|------------|
| 1 | Axios instance + credentials + refresh interceptor | ✅ `client/src/lib/api.ts` |
| 2 | TanStack Query provider | ✅ `client/src/app/providers/` |
| 3 | Auth context + hooks | ✅ `client/src/features/auth/` |
| 4 | React Router setup | ✅ `client/src/app/router/` |
| 5 | Trang đăng nhập | ✅ `client/src/features/auth/pages/login-page.tsx` |
| 6 | AppLayout + Sidebar | ✅ `client/src/app/layouts/` |
| 7 | Sidebar theo role | ✅ `client/src/components/layout/app-sidebar.tsx` |
| 8 | Trang quản lý người dùng | ✅ `client/src/features/users/` |
| 9 | Trang cài đặt trường | ✅ `client/src/features/schools/pages/school-settings-page.tsx` |
| 10 | Loading / empty / error states | ✅ `client/src/components/feedback/` |
| 11 | Protected route + role gate | ✅ `client/src/components/auth/` |

**Không triển khai:** `/chon-truong`, switch school UI, trang quản lý vai trò tùy chỉnh

**UI routes MVP:**

| Path | Trang |
|------|-------|
| `/login` | Đăng nhập |
| `/` | Tổng quan |
| `/users` | Quản lý người dùng (SCHOOL_ADMIN) |
| `/school-settings` | Cài đặt trường (SCHOOL_ADMIN) |

---

## Thứ tự phụ thuộc

```text
1A (nền tảng)
 └─► 1B (schema + seed)
      └─► 1C (auth)
           └─► 1D (admin API)
                └─► 1E (frontend)
```

1E có thể bắt đầu song song với 1D sau khi 1C xong.

## Checklist chất lượng cuối Sprint 1

- [x] `pnpm prisma migrate deploy` chạy thành công trên Neon
- [x] `pnpm prisma db seed` idempotent
- [ ] Login → cookie set → `/auth/me` trả đúng user + activeSchool + role
- [ ] Refresh → access token mới khi refresh JWT hợp lệ
- [ ] Logout → cookie cleared
- [ ] User trường A không đọc user trường B (test)
- [ ] TEACHER không tạo user (test)
- [ ] Frontend tiếng Việt, sidebar theo role
- [ ] Swagger cập nhật đầy đủ Sprint 1 endpoints
- [x] `pnpm run build` pass client
- [x] `pnpm run lint` pass client
- [ ] Không secret trong code

## Ngoài phạm vi Sprint 1

- `POST /auth/switch-school`, `/chon-truong`
- `audit_logs`, `GET /audit-logs`, UI `/nhat-ky`
- CRUD roles/permissions tùy chỉnh
- Lưu session/token vào DB hoặc Redis
- Tạo trường qua UI/API
- Năm học, lớp, học sinh, giáo viên
- Upload file R2
- Platform super admin
- Email/SMS

## Bước tiếp theo

**Phase 1E hoàn thành.** Kiểm tra thủ công end-to-end:

1. Chạy server + client (xem [local-development.md](../setup/local-development.md))
2. Đăng nhập `admin@demo.edu.vn` / `Admin@123456`
3. Tạo user, khóa/mở khóa, cập nhật thông tin trường
4. Đăng nhập TEACHER → sidebar không hiện mục admin

Sprint 1 còn lại: checklist chất lượng (auth flow, tenant isolation test, server build/lint).
