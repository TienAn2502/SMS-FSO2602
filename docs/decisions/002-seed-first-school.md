# ADR-002: Tạo trường đầu tiên qua Seed

**Trạng thái:** Đã chốt  
**Ngày:** 2026-07-15  
**Ngữ cảnh:** Sprint 1 – Multi-tenancy bootstrap

## Bối cảnh

Trong SaaS multi-tenant, cần quyết định ai và bằng cách nào tạo tenant (trường học) đầu tiên và các tenant tiếp theo.

## Quyết định

Sprint 1 sử dụng **seed script** (`prisma/seed.ts`) để tạo:

- Trường mẫu (tenant đầu tiên)
- Tài khoản admin trường (`role = SCHOOL_ADMIN`, `school_id` gắn trường)

**Không triển khai** API/UI tạo trường trong Sprint 1.

## Lý do (MVP first)

1. Giảm scope Sprint 1 – tập trung auth, RBAC, quản lý user
2. Không cần Platform Super Admin layer ngay
3. Đủ cho demo, pilot, development với 1 trường
4. Seed idempotent – chạy lại an toàn

## Hệ quả

### Sprint 1 có

- `pnpm prisma db seed` tạo trường + admin
- Admin đăng nhập, quản lý user **trong trường** (gán role enum)
- Test tenant isolation với 2 trường (seed thêm trường thứ 2 cho test)

### Sprint 1 không có

- `POST /schools` (tạo trường)
- UI "Tạo trường mới"
- Platform admin role

### Sprint 1.5+ (khi cần)

Một trong các phương án:

| Phương án | Effort | Khi nào |
|-----------|--------|---------|
| Script CLI `create-school` | Thấp | Onboard trường thủ công bởi ops |
| API Platform Admin | Trung bình | Nhiều trường, self-service |
| First-run wizard | Trung bình | Self-hosted 1 trường/instance |

## Seed config

```env
SEED_SCHOOL_CODE=DEMO
SEED_SCHOOL_NAME=Trường THPT Demo
SEED_ADMIN_EMAIL=admin@demo.edu.vn
SEED_ADMIN_PASSWORD=Admin@123456
```

## Điều kiện hoàn thành Sprint 1 (điều chỉnh)

Master prompt gốc:

```text
Admin tạo trường → ...
```

Với ADR này:

```text
Seed tạo trường → Admin tạo user → Gán role → Đăng nhập → Phân quyền
```

Điều kiện nghiệp vụ vẫn đạt – chỉ thay cách tạo trường ban đầu.

## Các phương án đã xem xét

| Phương án | Lý do loại cho Sprint 1 |
|-----------|-------------------------|
| Platform Super Admin UI | Scope lớn hơn, chưa cần cho MVP |
| First-run wizard | Không phù hợp SaaS multi-tenant |
| Manual SQL trên Neon | Vi phạm quy tắc migration |
