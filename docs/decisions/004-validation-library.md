# ADR 004: Thư viện validation backend (NestJS)

**Trạng thái:** ✅ Đã chốt  
**Ngày quyết định:** 2026-07-20  
**Ngữ cảnh:** Sprint 1 – validate body, query, params trước khi triển khai API

## Quyết định

Backend NestJS dùng **Zod** cho validation input (body, query, params, pagination, env).

**Không dùng** `class-validator` / `class-transformer` cho DTO.

## Lý do

- **Đồng bộ với frontend** — client đã dùng React Hook Form + Zod
- Type inference từ schema: `type LoginDto = z.infer<typeof loginSchema>`
- Schema dễ đọc, dễ test độc lập
- Một ngôn ngữ validation xuyên suốt monorepo (client + server)

## Cách triển khai (NestJS)

### Schema + type

```typescript
// server/src/modules/auth/schemas/login.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});

export type LoginDto = z.infer<typeof loginSchema>;
```

### Pipe validate trong controller

Dùng **ZodValidationPipe** (custom hoặc `nestjs-zod`) gắn trên endpoint:

```typescript
@Post('login')
login(@Body(new ZodValidationPipe(loginSchema)) body: LoginDto) {
  return this.authService.login(body);
}
```

Hoặc decorator `@ZodBody(loginSchema)` nếu wrap pipe.

### Env validation

Dùng **cùng Zod** cho biến môi trường — không tách sang Joi:

```typescript
// server/src/common/config/env.schema.ts
export const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  // ...
});
```

Validate lúc bootstrap — fail fast nếu thiếu/sai env.

### UUID params

Schema riêng hoặc helper:

```typescript
export const uuidParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ'),
});
```

### Pagination query

```typescript
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
```

## Format lỗi validation

Map `ZodError` → response chuẩn:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "details": [
    { "field": "email", "message": "Email không đúng định dạng" }
  ]
}
```

Implement trong global exception filter hoặc trong `ZodValidationPipe`.

## Cấu trúc file

```text
server/src/modules/<module>/
├── schemas/          # Zod schemas + inferred types
├── controllers/
├── services/
└── ...
```

Shared schemas (pagination, uuid):

```text
server/src/common/schemas/
```

## Swagger

Zod không tự sinh OpenAPI như class-validator. MVP:

1. Mô tả request/response thủ công qua `@ApiBody`, `@ApiProperty` tối thiểu, hoặc
2. Dùng `zod-to-openapi` / `@anatine/zod-openapi` khi cần — **không bắt buộc Sprint 1**

Ưu tiên endpoint hoạt động đúng trước; Swagger đầy đủ có thể bổ sung dần.

## Quy tắc

1. Mọi endpoint có input **phải** có Zod schema
2. Frontend Zod **không thay thế** validation backend — có thể copy/sync shape, server vẫn validate
3. Không parse UUID/query thủ công trong controller — qua pipe
4. Message lỗi tiếng Việt trong `.message()` của schema

## Share schema client ↔ server (tùy chọn sau)

MVP: schema **tách riêng** client và server (copy shape, dễ bảo trì hơn shared package sớm).

Sau này nếu cần: package `shared` hoặc copy script — **không làm trong Sprint 1**.

## Các phương án đã xem xét

| Phương án | Kết quả |
|-----------|---------|
| A – class-validator | ❌ Không chọn — decorator verbose, lệch frontend |
| B – Zod | ✅ **Đã chọn** |
| C – Joi | ❌ Không chọn — trùng vai trò với Zod |

## Dependencies dự kiến (Phase 1A)

```text
zod
nestjs-zod          # hoặc custom ZodValidationPipe — chốt khi implement
```

## Hệ quả Sprint 1

- Phase 1A: `ZodValidationPipe`, env schema, exception filter map ZodError
- Mọi module mới: `schemas/` + inferred types, không DTO class với decorator
