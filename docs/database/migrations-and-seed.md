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

## Cấu trúc file

```text
server/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   │   ├── 20260720102813_init_sprint1/
│   │   ├── 20260720163000_simplify_rbac_mvp/
│   │   └── 20260723132737_init_sprint2_academic/
│   │   └── 20260723134500_semester_is_current/
│   └── seed.ts
└── package.json          # prisma.seed config
```

## Lệnh thường dùng

```bash
cd server

# Tạo migration mới sau khi sửa schema.prisma
pnpm prisma:migrate:dev

# Áp dụng migration trên môi trường deploy
pnpm prisma migrate deploy

# Chạy seed
pnpm prisma:seed

# Mở Prisma Studio (debug)
pnpm prisma studio

# Reset database (CHỈ development – xóa toàn bộ dữ liệu)
pnpm prisma migrate reset
```

## Quy trình thay đổi schema

```text
1. Sửa server/prisma/schema.prisma
2. Chạy: pnpm prisma:migrate:dev --name mo_ta_thay_doi
3. Kiểm tra file SQL trong prisma/migrations/
4. Cập nhật docs/database/schema-sprint1.md nếu cần
5. Commit schema + migration vào Git
```

## Seed Sprint 1 + Sprint 2

File: `server/prisma/seed.ts`

### Dữ liệu tạo

| Thứ tự | Dữ liệu | Ghi chú |
|--------|---------|---------|
| 1 | Trường mẫu | Upsert theo `code` từ env |
| 2 | User admin | Upsert theo `email`, gán `school_id` + `role = SCHOOL_ADMIN` |
| 3 | Giáo viên demo | 3 tài khoản `TEACHER` |
| 4 | Học sinh demo | 5 tài khoản `STUDENT` |
| 5 | Năm học 2025-2026 | `is_current = true`, code `2025-26` |
| 6 | Học kỳ HK1, HK2 | Thuộc năm học trên |
| 7 | Khối 10, 11, 12 | Upsert theo `(school_id, code)` |
| 8 | Môn TOAN, VAN, ANH | Upsert theo `(school_id, code)` |
| 9 | grade_level_subjects | Khối 10 × 3 môn, `is_required = true` |
| 10 | Lớp HC 10A1 | GVCN = `teacher1@demo.edu.vn` |
| 11 | Lớp môn | TOAN-10A1, VAN-10A1, ANH-10A1 |

### Biến môi trường seed

```env
SEED_ADMIN_EMAIL=admin@demo.edu.vn
SEED_ADMIN_PASSWORD=Admin@123456
SEED_DEMO_PASSWORD=Demo@123456
SEED_SCHOOL_CODE=DEMO
SEED_SCHOOL_NAME=Trường THPT Demo
SEED_SCHOOL_TYPE=THPT
```

**Tài khoản demo sau seed:**

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin trường | `admin@demo.edu.vn` | `SEED_ADMIN_PASSWORD` (mặc định `Admin@123456`) |
| Giáo viên | `teacher1@demo.edu.vn` … `teacher3@demo.edu.vn` | `SEED_DEMO_PASSWORD` (mặc định `Demo@123456`) |
| Học sinh | `student1@demo.edu.vn` … `student5@demo.edu.vn` | `SEED_DEMO_PASSWORD` (mặc định `Demo@123456`) |

### Idempotent strategy

Mỗi bước seed dùng `upsert`:

```typescript
await prisma.user.upsert({
  where: { email: env.SEED_ADMIN_EMAIL },
  update: { schoolId: school.id, role: UserRole.SCHOOL_ADMIN },
  create: { email, passwordHash, fullName, schoolId: school.id, role: UserRole.SCHOOL_ADMIN },
});
```

Chạy lại seed **không tạo bản ghi trùng**, **không reset mật khẩu** nếu user đã tồn tại (trừ khi dùng flag `SEED_FORCE_RESET_PASSWORD=true` cho dev).

### Output sau seed

```text
Seed completed.
  School: Trường THPT Demo (DEMO)
  Admin: admin@demo.edu.vn (SCHOOL_ADMIN)
  Teachers: 3 accounts (password: Demo@123456)
  Students: 5 accounts (password: Demo@123456)
  Academic year: 2025-2026 (is_current)
  Grade levels: 3
  Subjects: 3
  Homeroom class: 10A1
  Course sections: 3
```

## package.json seed config

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

## Migration naming convention

```text
YYYYMMDDHHMMSS_<mo_ta_ngan>.sql

Ví dụ:
20260720102813_init_sprint1
20260720163000_simplify_rbac_mvp
20260723132737_init_sprint2_academic
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
