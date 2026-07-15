# Sprint 1 – Kế hoạch triển khai

**Mục tiêu:** Nền tảng SaaS, Authentication, Authorization  
**Thời gian ước tính:** 2–3 tuần  
**Ngôn ngữ UI:** Tiếng Việt

## Điều kiện hoàn thành

```text
Seed tạo trường + admin
→ Admin tạo user & gán role (UI)
→ User đăng nhập & chọn trường
→ Sidebar/menu theo permission
→ Backend từ chối truy cập chéo tenant
→ Test auth + tenant isolation pass
→ Build thành công cả client và server
```

## Phases

### Phase 1A – Nền tảng server ⬜

**Mục tiêu:** NestJS chạy đúng chuẩn, sẵn sàng gắn Prisma.

| # | Task | File chính |
|---|------|------------|
| 1 | Cài Prisma + `@prisma/client` | `server/package.json` |
| 2 | Env validation (Zod hoặc Joi) | `server/src/common/config/` |
| 3 | Global prefix `/api/v1` | `server/src/main.ts` |
| 4 | CORS đúng chuẩn cookie | `server/src/main.ts` |
| 5 | Global exception filter + response wrapper | `server/src/common/filters/` |
| 6 | Request ID middleware | `server/src/common/interceptors/` |
| 7 | `GET /health` | `server/src/modules/health/` |
| 8 | Cập nhật `.env.example` | `server/.env.example` |
| 9 | Sửa/xóa test hỏng (AppController) | `server/test/`, `server/src/` |
| 10 | Swagger setup | `server/src/main.ts` |

**Không có migration trong phase này.**

---

### Phase 1B – Schema & Seed ⬜

**Mục tiêu:** Database Sprint 1 sẵn sàng với dữ liệu khởi tạo.

| # | Task | File chính |
|---|------|------------|
| 1 | Prisma schema Sprint 1 | `server/prisma/schema.prisma` |
| 2 | Migration init | `server/prisma/migrations/` |
| 3 | PrismaService (NestJS) | `server/src/common/database/` |
| 4 | Seed script idempotent | `server/prisma/seed.ts` |
| 5 | Seed config trong package.json | `server/package.json` |
| 6 | Test kết nối Neon | manual / health check |

**Bảng:** schools, users, school_memberships, permissions, roles, role_permissions, membership_roles, auth_sessions, audit_logs

Chi tiết schema: [schema-sprint1.md](../database/schema-sprint1.md)

---

### Phase 1C – Auth backend ⬜

**Mục tiêu:** Login, logout, refresh, switch school, guards.

| # | Task | File chính |
|---|------|------------|
| 1 | Auth module | `server/src/modules/auth/` |
| 2 | Password hashing (bcrypt) | `server/src/common/utils/` |
| 3 | JWT access + refresh token | `server/src/common/auth/` |
| 4 | Cookie helpers | `server/src/common/auth/` |
| 5 | Auth sessions CRUD + rotation | `server/src/modules/auth/` |
| 6 | JwtAuthGuard | `server/src/common/guards/` |
| 7 | TenantGuard | `server/src/common/guards/` |
| 8 | PermissionGuard + decorator | `server/src/common/guards/` |
| 9 | `@CurrentUser()` decorator | `server/src/common/decorators/` |
| 10 | Audit log: LOGIN, LOGOUT | `server/src/modules/audit-logs/` |
| 11 | Unit test: refresh rotation | `server/src/modules/auth/tests/` |
| 12 | Integration test: login flow | `server/test/` |

Chi tiết auth: [authentication.md](../architecture/authentication.md)

---

### Phase 1D – Admin API ⬜

**Mục tiêu:** Quản lý user, role, membership trong tenant.

| # | Task | Module |
|---|------|--------|
| 1 | GET/PATCH schools/current | `schools` |
| 2 | CRUD users + membership | `users`, `memberships` |
| 3 | CRUD roles + permissions | `roles`, `permissions` |
| 4 | PUT membership roles | `memberships` |
| 5 | GET audit-logs | `audit-logs` |
| 6 | Tenant isolation test | `test/` |
| 7 | Permission test | `test/` |
| 8 | Swagger docs | tất cả controllers |

API chi tiết: [sprint1-endpoints.md](../api/sprint1-endpoints.md)

---

### Phase 1E – Frontend ⬜

**Mục tiêu:** UI tiếng Việt, auth flow, quản lý user.

| # | Task | File chính |
|---|------|------------|
| 1 | Axios instance + credentials | `client/src/lib/api.ts` |
| 2 | TanStack Query provider | `client/src/app/providers/` |
| 3 | Auth context + hooks | `client/src/features/auth/` |
| 4 | React Router setup | `client/src/app/router/` |
| 5 | Trang đăng nhập | `client/src/features/auth/pages/` |
| 6 | Trang chọn trường | `client/src/features/auth/pages/` |
| 7 | AppLayout + Sidebar | `client/src/app/layouts/` |
| 8 | Sidebar theo permission | `client/src/components/` |
| 9 | Trang quản lý người dùng | `client/src/features/users/` |
| 10 | Trang quản lý vai trò | `client/src/features/roles/` |
| 11 | Loading / empty / error states | `client/src/components/feedback/` |
| 12 | Invalidate cache khi switch school | `client/src/features/auth/hooks/` |

**UI routes:**

| Path | Trang |
|------|-------|
| `/dang-nhap` | Đăng nhập |
| `/chon-truong` | Chọn trường |
| `/` | Tổng quan |
| `/nguoi-dung` | Quản lý người dùng |
| `/vai-tro` | Quản lý vai trò |

---

## Thứ tự phụ thuộc

```text
1A (nền tảng)
 └─► 1B (schema + seed)
      └─► 1C (auth)
           └─► 1D (admin API)
                └─► 1E (frontend)
```

1E có thể bắt đầu song song với 1D sau khi 1C xong (auth endpoints sẵn sàng).

## Checklist chất lượng cuối Sprint 1

- [ ] `pnpm prisma migrate deploy` chạy thành công trên Neon
- [ ] `pnpm prisma db seed` idempotent
- [ ] Login → cookie set → `/auth/me` trả đúng data
- [ ] Refresh token rotate, token cũ bị revoke
- [ ] Logout revoke session
- [ ] User trường A không đọc user trường B (test)
- [ ] TEACHER không tạo user (test)
- [ ] Frontend tiếng Việt, sidebar theo permission
- [ ] Swagger cập nhật đầy đủ Sprint 1 endpoints
- [ ] `pnpm run build` pass cả client và server
- [ ] `pnpm run lint` pass
- [ ] Không secret trong code

## Ngoài phạm vi Sprint 1

- Tạo trường qua UI/API
- Năm học, lớp, học sinh, giáo viên
- Upload file R2
- Platform super admin
- Email/SMS
- i18n framework (chỉ hardcode tiếng Việt)

## Bước tiếp theo

Sau khi docs được review, bắt đầu **Phase 1A** – triển khai nền tảng server + Prisma setup.
