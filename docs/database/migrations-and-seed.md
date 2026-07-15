# Migration và Seed

## Công cụ

| Công cụ | Vai trò |
|---------|---------|
| Prisma Migrate | Quản lý schema và migration |
| Prisma Seed | Dữ liệu khởi tạo development |
| Neon PostgreSQL | Database hosted |

## Quy tắc

1. Mọi thay đổi schema **phải có migration** – commit vào Git
2. **Không sửa database bằng tay** trên Neon dashboard
3. Migration phải chạy được trên PostgreSQL tiêu chuẩn (không dùng tính năng độc quyền Neon)
4. Seed an toàn khi chạy lại (idempotent)

## Cấu trúc file (dự kiến)

```text
server/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   │   └── 20260101000000_init_sprint1/
│   │       └── migration.sql
│   └── seed.ts
└── package.json          # prisma.seed config
```

## Lệnh thường dùng

```bash
cd server

# Tạo migration mới sau khi sửa schema.prisma
pnpm prisma migrate dev --name <ten_migration>

# Áp dụng migration trên môi trường deploy
pnpm prisma migrate deploy

# Chạy seed
pnpm prisma db seed

# Mở Prisma Studio (debug)
pnpm prisma studio

# Reset database (CHỈ development – xóa toàn bộ dữ liệu)
pnpm prisma migrate reset
```

## Quy trình thay đổi schema

```text
1. Sửa server/prisma/schema.prisma
2. Chạy: pnpm prisma migrate dev --name mo_ta_thay_doi
3. Kiểm tra file SQL trong prisma/migrations/
4. Cập nhật docs/database/schema-sprint1.md nếu cần
5. Commit schema + migration vào Git
```

## Seed Sprint 1

File: `server/prisma/seed.ts`

### Dữ liệu tạo

| Thứ tự | Dữ liệu | Ghi chú |
|--------|---------|---------|
| 1 | Permissions hệ thống | Upsert theo `code` |
| 2 | Trường mẫu | Upsert theo `code` từ env |
| 3 | Roles mặc định | Upsert theo `school_id + code` |
| 4 | Role ↔ Permission | Upsert, không trùng |
| 5 | User admin | Upsert theo `email` |
| 6 | Membership admin ↔ trường | Upsert theo `school_id + user_id` |
| 7 | Membership ↔ Role SCHOOL_ADMIN | Upsert |

### Biến môi trường seed

```env
SEED_ADMIN_EMAIL=admin@demo.edu.vn
SEED_ADMIN_PASSWORD=Admin@123456
SEED_SCHOOL_CODE=DEMO
SEED_SCHOOL_NAME=Trường THPT Demo
SEED_SCHOOL_TYPE=THPT
```

### Idempotent strategy

Mỗi bước seed dùng `upsert` hoặc `findFirst` + `create`:

```typescript
// Ví dụ pattern
await prisma.permission.upsert({
  where: { code: 'user:read' },
  update: {},  // không ghi đè nếu đã tồn tại
  create: { code: 'user:read', resource: 'user', action: 'read', description: '...' },
});
```

Chạy lại seed **không tạo bản ghi trùng**, **không reset mật khẩu** nếu user đã tồn tại (trừ khi dùng flag `SEED_FORCE_RESET_PASSWORD=true` cho dev).

### Output sau seed

```text
✓ 9 permissions
✓ 1 school: Trường THPT Demo (DEMO)
✓ 2 roles: SCHOOL_ADMIN, TEACHER
✓ 1 admin user: admin@demo.edu.vn
✓ Membership + SCHOOL_ADMIN role assigned
```

## package.json seed config

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Hoặc dùng `tsx prisma/seed.ts` nếu cài `tsx`.

## Migration naming convention

```text
YYYYMMDDHHMMSS_<mo_ta_ngan>.sql

Ví dụ:
20260715100000_init_sprint1
20260720120000_add_audit_logs_index
```

## Rollback

Prisma không hỗ trợ rollback tự động. Chiến lược:

1. **Development:** `pnpm prisma migrate reset` (xóa hết, chạy lại)
2. **Production:** Tạo migration mới để revert thay đổi, không xóa migration cũ

## Kiểm tra sau migration

```bash
# Kiểm tra trạng thái migration
pnpm prisma migrate status

# Kiểm tra schema khớp database
pnpm prisma db pull --print
```

## Neon – Lưu ý

- Connection string cần `?sslmode=require`
- Dùng connection pooling (Neon pooler URL) cho production nếu cần
- Không dùng tính năng branching Neon trong logic ứng dụng
- Backup: export qua Neon dashboard hoặc `pg_dump` trước migration lớn
