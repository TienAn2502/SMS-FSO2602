# Cấu trúc repository

## Quyết định

Giữ cấu trúc hiện tại `client/` + `server/` thay vì tái cấu trúc sang `apps/web` + `apps/api`. Master prompt cho phép giữ nguyên nếu cấu trúc đã hợp lý.

## Cây thư mục hiện tại

```text
Final Project/
├── client/                  # React SPA
│   ├── src/
│   │   ├── app/             # (Sprint 1) layouts, providers, router
│   │   ├── components/      # ui/, forms/, data-table/, feedback/
│   │   ├── features/        # (Sprint 1) auth/, users/, ...
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts
│
├── server/                  # NestJS API
│   ├── prisma/              # (Phase 1B) schema, migrations, seed
│   ├── src/
│   │   ├── common/          # auth, database, guards, decorators, ...
│   │   └── modules/         # auth, schools, users, roles, ...
│   ├── test/
│   └── package.json
│
└── docs/                    # Tài liệu dự án
    ├── architecture/
    ├── database/
    ├── api/
    ├── decisions/
    ├── sprints/
    └── setup/
```

## Cấu trúc backend đích (`server/src/`)

```text
server/src/
├── common/
│   ├── auth/           # JWT strategy, cookie helpers
│   ├── constants/
│   ├── database/       # PrismaService
│   ├── decorators/     # @CurrentUser(), @RequirePermission()
│   ├── exceptions/     # Custom exceptions + error codes
│   ├── filters/        # Global exception filter
│   ├── guards/         # JwtAuthGuard, PermissionGuard, TenantGuard
│   ├── interceptors/   # Response wrapper, request ID
│   ├── pagination/
│   ├── pipes/
│   └── utils/
│
├── modules/
│   ├── auth/
│   ├── schools/
│   ├── users/
│   ├── memberships/
│   ├── roles/
│   ├── permissions/
│   └── audit-logs/
│   # Sprint 2+: academic-years, students, teachers, ...
│
├── app.module.ts
└── main.ts
```

Mỗi module:

```text
modules/<tên>/
├── <tên>.module.ts
├── controllers/
├── services/
├── dto/
├── mappers/
└── tests/
```

## Cấu trúc frontend đích (`client/src/`)

```text
client/src/
├── app/
│   ├── layouts/        # AppLayout, AuthLayout
│   ├── providers/      # QueryClient, AuthProvider
│   └── router/         # Route definitions
│
├── components/
│   ├── ui/             # shadcn components
│   ├── forms/
│   ├── data-table/
│   └── feedback/       # loading, empty, error states
│
├── features/
│   ├── auth/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── schemas/
│   └── users/
│       └── ...
│
├── hooks/
├── lib/                # utils, axios instance
├── services/
└── types/
```

## Quy ước đặt tên

| Loại | Quy ước | Ví dụ |
|------|---------|-------|
| Database table | snake_case, số nhiều | `school_memberships` |
| Prisma model | PascalCase | `SchoolMembership` |
| NestJS module | kebab-case folder | `audit-logs/` |
| API path | kebab-case | `/api/v1/auth/switch-school` |
| Permission code | `resource:action` | `student:read` |
| React feature folder | kebab-case | `features/auth/` |
| React component | PascalCase | `LoginForm.tsx` |
| Query key | mảng có tenant | `['users', schoolId, filters]` |

## Package manager

- Mỗi package (`client/`, `server/`) dùng **pnpm** độc lập
- Không bắt buộc root workspace trong MVP
- Có thể thêm root `pnpm-workspace.yaml` sau nếu cần shared packages

## File không commit

```text
node_modules/
dist/
.env
.env.development
.env.production
*.local
```

Chỉ commit `.env.example` với placeholder.
