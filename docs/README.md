# eSchool SaaS – Tài liệu dự án

Hệ thống quản trị trường học đa tenant (SaaS), tập trung MVP: quản trị dữ liệu, phân quyền, cách ly tenant và quy trình nghiệp vụ trường học cơ bản.

## Mục lục

| Thư mục | Nội dung |
|---------|----------|
| [setup/](./setup/) | Hướng dẫn cài đặt và chạy local |
| [architecture/](./architecture/) | Kiến trúc hệ thống, multi-tenancy, authentication |
| [flows/](./flows/) | Luồng nghiệp vụ (tổng kết HK/năm, …) |
| [database/](./database/) | Schema, migration, seed |
| [api/](./api/) | Quy ước REST API và endpoint theo sprint |
| [decisions/](./decisions/) | Architecture Decision Records (ADR) |
| [sprints/](./sprints/) | Kế hoạch triển khai theo sprint ([Sprint 1](./sprints/sprint-1-plan.md) … [Sprint 11](./sprints/sprint-11-plan.md)) |

## Trạng thái dự án

| Hạng mục | Trạng thái |
|----------|------------|
| Sprint hiện tại | **Sprint 9** – Platform 1 (onboard tenant) — 🟡 gần xong |
| Sprint học vụ (1–8) | Import/export, PDF, điểm danh, điểm, tổng kết — xem [Sprint 8](./sprints/sprint-8-plan.md) |
| Frontend | `client/` – React + Vite |
| Backend | `server/` – NestJS |
| Database | Neon PostgreSQL + Prisma |
| Tạo trường đầu tiên | Seed (DEMO) + Platform API từ Sprint 9 |

## Quyết định đã chốt

- Giữ cấu trúc repo `client/` + `server/`
- ORM: **Prisma** (thay Drizzle trong master prompt gốc)
- Database: **Neon PostgreSQL**
- Ngôn ngữ giao diện: **Tiếng Việt**
- Tạo trường tenant đầu tiên: **Seed script**
- Auth MVP: **JWT stateless** — [ADR 005](./decisions/005-session-storage.md)
- **Không** có `switch-school` trong MVP — [ADR 006](./decisions/006-defer-switch-school.md)
- **Không** có `audit_logs` tenant-wide trong MVP — [ADR 007](./decisions/007-defer-audit-logs.md); audit **platform** từ Sprint 10
- Platform admin module — [ADR 013](./decisions/013-platform-admin-module.md)
- Validation backend: **Zod** — [ADR 004](./decisions/004-validation-library.md)
- RBAC MVP đơn giản: **role enum trên user** — [ADR 008](./decisions/008-simplify-rbac-mvp.md)
- Auth Phase 1C: **login/logout/refresh/me + JWT cookie guards**

## Quyết định chưa chốt

_Không còn ADR blocking cho Phase 1A._

## Luồng MVP mục tiêu (toàn sản phẩm)

```text
Tạo trường (seed)
→ Khởi tạo năm học
→ Tạo khối, lớp và môn
→ Thêm học sinh và giáo viên
→ Xếp học sinh vào lớp
→ Phân công giáo viên
→ Tạo thời khóa biểu thủ công
→ Điểm danh
→ Nhập điểm
→ Tổng kết ([luồng chi tiết](./flows/grade-summaries.md))
→ Xét lên lớp
→ Xuất báo cáo
```

## Bắt đầu nhanh

Xem [Hướng dẫn phát triển local](./setup/local-development.md).

## Lộ trình sprint (tóm tắt)

| Sprint | Phạm vi | Tài liệu |
|--------|---------|----------|
| 1–4 | Auth, học vụ cơ bản, portal | [Sprint 1](./sprints/sprint-1-plan.md) … [Sprint 4](./sprints/sprint-4-plan.md) |
| 5–7 | Điểm danh, sổ điểm, tổng kết | [Sprint 5](./sprints/sprint-5-plan.md) … [Sprint 7](./sprints/sprint-7-plan.md) |
| 8 | Import/export, PDF | [Sprint 8](./sprints/sprint-8-plan.md) · [API](./api/sprint8-endpoints.md) |
| **9** | **Platform 1** — onboard tenant | [Sprint 9](./sprints/sprint-9-plan.md) · [API](./api/sprint9-endpoints.md) · [ADR 013](./decisions/013-platform-admin-module.md) |
| 10 | Platform 2 — impersonation, audit | [Sprint 10](./sprints/sprint-10-plan.md) · [API](./api/sprint10-endpoints.md) |
| 11 | Platform 3 — quota, flags, billing | [Sprint 11](./sprints/sprint-11-plan.md) |
