# eSchool SaaS – Tài liệu dự án

Hệ thống quản trị trường học đa tenant (SaaS), tập trung MVP: quản trị dữ liệu, phân quyền, cách ly tenant và quy trình nghiệp vụ trường học cơ bản.

## Mục lục

| Thư mục | Nội dung |
|---------|----------|
| [setup/](./setup/) | Hướng dẫn cài đặt và chạy local |
| [architecture/](./architecture/) | Kiến trúc hệ thống, multi-tenancy, authentication |
| [database/](./database/) | Schema, migration, seed |
| [api/](./api/) | Quy ước REST API và endpoint Sprint 1 |
| [decisions/](./decisions/) | Architecture Decision Records (ADR) |
| [sprints/](./sprints/) | Kế hoạch triển khai theo sprint |

## Trạng thái dự án

| Hạng mục | Trạng thái |
|----------|------------|
| Sprint hiện tại | **Sprint 1** – Nền tảng SaaS, Auth, phân quyền theo role |
| Frontend | `client/` – React + Vite (scaffold UI) |
| Backend | `server/` – NestJS (Phase 1A–1C ✅) |
| Database | Neon PostgreSQL + Prisma (2 bảng: schools, users) |
| Tạo trường đầu tiên | Seed data (MVP) |

## Quyết định đã chốt

- Giữ cấu trúc repo `client/` + `server/`
- ORM: **Prisma** (thay Drizzle trong master prompt gốc)
- Database: **Neon PostgreSQL**
- Ngôn ngữ giao diện: **Tiếng Việt**
- Tạo trường tenant đầu tiên: **Seed script**
- Auth MVP: **JWT stateless** — [ADR 005](./decisions/005-session-storage.md)
- **Không** có `switch-school` trong MVP — [ADR 006](./decisions/006-defer-switch-school.md)
- **Không** có `audit_logs` trong MVP — [ADR 007](./decisions/007-defer-audit-logs.md)
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
→ Tổng kết
→ Xét lên lớp
→ Xuất báo cáo
```

## Bắt đầu nhanh

Xem [Hướng dẫn phát triển local](./setup/local-development.md).
