# ADR-001: Chọn Prisma thay vì Drizzle ORM

**Trạng thái:** Đã chốt  
**Ngày:** 2026-07-15  
**Ngữ cảnh:** Sprint 1 – Thiết lập database layer

## Bối cảnh

Master prompt gốc chốt Drizzle ORM cho NestJS + PostgreSQL. Trong quá trình khảo sát dự án, team quyết định dùng Prisma.

## Quyết định

Sử dụng **Prisma** làm ORM cho toàn bộ dự án eSchool SaaS.

## Lý do

| Yếu tố | Prisma |
|--------|--------|
| Migration workflow | Prisma Migrate tích hợp sẵn, SQL preview rõ ràng |
| Seed | `prisma db seed` built-in |
| Type safety | Client generate tự động từ schema |
| Neon compatibility | Hỗ trợ tốt PostgreSQL chuẩn + Neon |
| Ecosystem | Tài liệu phong phú, phổ biến trong NestJS community |

## Hệ quả

### Giữ nguyên

- PostgreSQL (Neon) làm database
- Migration commit vào Git
- Không sửa DB bằng tay
- Tenant isolation qua `school_id` filter
- Không dùng tính năng độc quyền Neon

### Thay đổi so với master prompt

- Schema file: `server/prisma/schema.prisma` thay vì Drizzle schema
- Lệnh migration: `pnpm prisma migrate dev` thay vì `drizzle-kit`
- Repository layer có thể inject `PrismaService` thay vì Drizzle client

### Rủi ro

- Master prompt examples viết bằng Drizzle syntax – cần adapt khi implement
- Prisma raw query cần cẩn thận với tenant filter

## Các phương án đã xem xét

| Phương án | Lý do loại |
|-----------|------------|
| Drizzle (master prompt) | Team chọn Prisma |
| TypeORM | Nặng, decorator-heavy, ít type-safe hơn Prisma |
| Raw SQL | Quá thấp level cho MVP |

## Tuân thủ

Quy tắc nghiệp vụ, multi-tenancy, migration discipline **không thay đổi** – chỉ thay công cụ ORM.
