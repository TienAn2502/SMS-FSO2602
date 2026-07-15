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
| Sprint hiện tại | **Sprint 1** – Nền tảng SaaS, Auth, RBAC |
| Frontend | `client/` – React + Vite (scaffold UI) |
| Backend | `server/` – NestJS (scaffold) |
| Database | Neon PostgreSQL + Prisma (chưa triển khai) |
| Tạo trường đầu tiên | Seed data (MVP) |

## Quyết định đã chốt

- Giữ cấu trúc repo `client/` + `server/`
- ORM: **Prisma** (thay Drizzle trong master prompt gốc)
- Database: **Neon PostgreSQL**
- Ngôn ngữ giao diện: **Tiếng Việt**
- Tạo trường tenant đầu tiên: **Seed script** (không có UI tạo trường trong Sprint 1)

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
