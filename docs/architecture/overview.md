# Tổng quan kiến trúc

## Mô hình triển khai

eSchool SaaS sử dụng kiến trúc **Modular Monolith** – một ứng dụng NestJS duy nhất, chia module nội bộ, không tách microservice trong MVP.

```text
┌─────────────────────────────────────────────────────────┐
│                    React SPA (client/)                   │
│         Vite · TypeScript · TanStack Query · shadcn/ui  │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS + REST API
                           │ HttpOnly Cookie (JWT)
                           ▼
┌─────────────────────────────────────────────────────────┐
│               NestJS Modular Monolith (server/)          │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  auth   │ │ schools │ │  users   │                   │
│  └─────────┘ └─────────┘ └──────────┘ └──────────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
│  │students │ │ scores  │ │timetables│ │   reports    │  │
│  └─────────┘ └─────────┘ └──────────┘ └──────────────┘  │
│              (các module Sprint 2–8)                     │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
               ▼                          ▼
    ┌──────────────────┐      ┌──────────────────┐
    │  Neon PostgreSQL │      │  Cloudflare R2   │
    │     (Prisma)     │      │  (Sprint 3+)     │
    └──────────────────┘      └──────────────────┘
```

## Stack công nghệ

### Frontend (`client/`)

| Công nghệ | Mục đích |
|-----------|----------|
| React 19 + TypeScript | UI framework |
| Vite | Build tool |
| React Router | Routing |
| Tailwind CSS 4 | Styling |
| shadcn/ui | Component library |
| TanStack Query | Server state, cache, mutation |
| React Hook Form + Zod | Form và validation (client + server) |
| Axios | HTTP client |

### Backend (`server/`)

| Công nghệ | Mục đích |
|-----------|----------|
| NestJS 11 + TypeScript | API framework |
| Prisma | ORM, migration, seed |
| PostgreSQL (Neon) | Database |
| `@nestjs/jwt` | Ký access/refresh JWT |
| `@nestjs/passport` + `passport-jwt` | Xác thực access token từ cookie |
| HttpOnly Cookie | Access + Refresh token transport |
| Swagger/OpenAPI | API documentation |

### Không dùng trong MVP

Next.js, GraphQL, Redis, BullMQ, Kafka, RabbitMQ, WebSocket, Microservices, Elasticsearch, Supabase Auth, Clerk.

## Nguyên tắc thiết kế

1. **Tenant isolation** – Mọi dữ liệu nghiệp vụ gắn `school_id`, lọc theo `activeSchoolId` từ auth context.
2. **Backend là nguồn quyết định quyền** – Frontend chỉ ẩn/hiện UI.
3. **Modular Monolith** – Module giao tiếp qua service nội bộ, không event bus.
4. **MVP first** – Triển khai từng sprint nhỏ, test được, rollback được.
5. **Lịch sử thay đổi** – Không xóa cứng dữ liệu quan trọng; dùng status và audit log.

## Phân tầng backend (mỗi module)

```text
controllers/   → HTTP layer, Zod validation, gọi service
services/      → Business logic, transaction
schemas/       → Zod schemas + inferred types (thay DTO class-validator)
policies/      → Role và data scope checking
mappers/       → Entity → DTO
tests/         → Unit và integration test
```

Không tạo generic repository abstraction phức tạp. Không gom toàn bộ nghiệp vụ vào một service lớn.

## Phân tầng frontend (mỗi feature)

```text
features/<tên-feature>/
├── api/         → API calls
├── components/  → UI components
├── hooks/       → TanStack Query hooks
├── pages/       → Route pages
├── schemas/     → Zod schemas
├── types/       → TypeScript types
└── utils/       → Helper functions
```

## Request lifecycle

```text
HTTP Request
  → Request ID middleware
  → CORS + Cookie parser
  → JWT Auth Guard (đọc access token cookie)
  → Tenant Guard (xác nhận activeSchoolId)
  → Role Guard (kiểm tra role enum)
  → Data Scope Policy (kiểm tra phạm vi dữ liệu nếu cần)
  → Controller → Service → Prisma
  → Response wrapper { success, data, message }
  → Audit log (async, không làm hỏng transaction chính)
```

## Health check

```text
GET /api/v1/health
```

Kiểm tra:

- API đang chạy
- Database có thể kết nối

Không kiểm tra R2 trong mọi health check request.

## Roadmap sprint

| Sprint | Phạm vi |
|--------|---------|
| **1** | Auth, tenant, RBAC, seed trường, quản lý user |
| 2 | Năm học, khối, môn, lớp, lớp môn học |
| 3 | Học sinh, enrollment, chuyển lớp, R2 upload |
| 4 | Giáo viên, phân công, thời khóa biểu, phụ huynh, portal |
| **5** | Điểm danh (Phase 5A: schema + seed ✅) |
| **6** | Sổ điểm — [sprint-6-plan.md](../sprints/sprint-6-plan.md) |
| **7** | Tổng kết, hạnh kiểm, học lực, lên lớp — [sprint-7-plan.md](../sprints/sprint-7-plan.md) |
| 8 | Báo cáo import/export (XLSX, CSV, PDF), CI/CD, deployment — [sprint-8-plan.md](../sprints/sprint-8-plan.md) |
| **9** | Platform 1: onboard tenant, CRUD trường — [sprint-9-plan.md](../sprints/sprint-9-plan.md) |
| **10** | Platform 2: impersonation, audit, monitoring — [sprint-10-plan.md](../sprints/sprint-10-plan.md) |
| **11** | Platform 3: quota, feature flags, billing (tuỳ chọn) — [sprint-11-plan.md](../sprints/sprint-11-plan.md) |

Chi tiết Sprint 1: [sprint-1-plan.md](../sprints/sprint-1-plan.md)  
Chi tiết Sprint 2: [sprint-2-plan.md](../sprints/sprint-2-plan.md)  
Chi tiết Sprint 3: [sprint-3-plan.md](../sprints/sprint-3-plan.md)  
Chi tiết Sprint 4: [sprint-4-plan.md](../sprints/sprint-4-plan.md)  
Chi tiết Sprint 5: [sprint-5-plan.md](../sprints/sprint-5-plan.md)  
Chi tiết Sprint 6: [sprint-6-plan.md](../sprints/sprint-6-plan.md)  
Chi tiết Sprint 7: [sprint-7-plan.md](../sprints/sprint-7-plan.md)  
Chi tiết Sprint 8: [sprint-8-plan.md](../sprints/sprint-8-plan.md)  
Chi tiết Sprint 9–11: [sprint-9-plan.md](../sprints/sprint-9-plan.md), [sprint-10-plan.md](../sprints/sprint-10-plan.md), [sprint-11-plan.md](../sprints/sprint-11-plan.md)
