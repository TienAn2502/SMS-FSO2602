# eSchool SaaS

Phần mềm quản trị trường học đa tenant – MVP.

## Cấu trúc

```text
├── client/     # React SPA (Vite + TypeScript)
├── server/     # NestJS API (TypeScript + Prisma)
└── docs/       # Tài liệu dự án
```

## Tài liệu

Xem [docs/README.md](./docs/README.md) để bắt đầu.

| Tài liệu | Mô tả |
|----------|-------|
| [Hướng dẫn local](./docs/setup/local-development.md) | Cài đặt và chạy dev |
| [Kiến trúc](./docs/architecture/overview.md) | Tổng quan hệ thống |
| [Sprint 1 plan](./docs/sprints/sprint-1-plan.md) | Kế hoạch triển khai hiện tại |

## Trạng thái

**Sprint 1** – Nền tảng SaaS, Auth, RBAC (đang lập tài liệu và chuẩn bị triển khai)

## Chạy nhanh

```bash
# Frontend
cd client && pnpm install && pnpm dev

# Backend
cd server && pnpm install && pnpm run start:dev
```

Chi tiết biến môi trường và database: [docs/setup/local-development.md](./docs/setup/local-development.md)
