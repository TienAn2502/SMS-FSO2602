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
│   └── seed-data/
│       ├── thpt-curriculum.ts
│       ├── vietnamese-names.ts
│       ├── clear-school-data.ts
│       ├── parents.ts
│       ├── attendance.ts
│       └── teaching-and-timetable.ts
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
| 3 | Giáo viên demo | 25 tài khoản `TEACHER` (teacher01…25@demo.edu.vn) |
| 4 | Học sinh demo | 450 tài khoản `STUDENT` (student0001…450@demo.edu.vn) + ghi danh HK1 |
| 5 | Năm học 2025-2026 | `is_current = true`, code `2025-26` |
| 6 | Học kỳ HK1, HK2 | Thuộc năm học trên |
| 7 | Khối 10, 11, 12 | Upsert theo `(school_id, code)` |
| 8 | Môn THPT (BGD CT 2018) | 14 môn: TOAN, VAN, ANH, LY, HOA, SINH, SU, DIA, GKTPL, TIN, CN, TD, GDQP, HDTN |
| 9 | grade_level_subjects | Mỗi khối × 14 môn |
| 10 | Lớp HC | 5 lớp/khối (10A1…12A5) |
| 11 | Lớp môn (HK1) | Mỗi lớp HC × môn của khối |
| 12 | Ghi danh | Mỗi HS → enrollment ACTIVE học kỳ HK1 |
| 13 | Phân công giảng dạy | Mỗi lớp môn HK1 → 1 GV theo chuyên môn môn học |
| 14 | Thời khóa biểu | 1 tiết/tuần/lớp môn (Thứ 2–6, tiết 1–3), phòng `P.{mã lớp HC}` |
| 15 | Phụ huynh | 100 HS có hồ sơ PH (mẹ + cha); 15 tài khoản đăng nhập portal |
| 16 | Liên kết PH–HS | `student_parents`: quan hệ FATHER/MOTHER, primary contact |
| 17 | Điểm danh demo | 3 phiên `10A1` (TOAN/VAN/ANH), ngày `2025-09-01`, ~30 HS/phiên |

**Bảng chưa seed (cố ý):** `files` — cần upload thật qua S3/local storage, không tạo metadata giả.

Trước khi seed, mặc định **xóa dữ liệu nghiệp vụ cũ** của trường demo (`SEED_CLEAR_DEMO=true`, giữ admin + school).

### Biến môi trường seed

```env
SEED_SCHOOL_ADMIN_EMAIL=school_admin@demo.edu.vn
SEED_SCHOOL_ADMIN_PASSWORD=SchoolAdmin@123456
SEED_SYSTEM_ADMIN_EMAIL=system_admin@demo.edu.vn
SEED_SYSTEM_ADMIN_PASSWORD=SystemAdmin@123456
SEED_DEMO_PASSWORD=Demo@123456
SEED_SCHOOL_CODE=DEMO
SEED_SCHOOL_NAME=Trường THPT Demo
SEED_SCHOOL_TYPE=THPT
SEED_CLEAR_DEMO=true
```

**Tài khoản demo sau seed:**

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| System admin | `system_admin@demo.edu.vn` | `SEED_SYSTEM_ADMIN_PASSWORD` (mặc định `SystemAdmin@123456`) |
| Admin trường (DEMO) | `school_admin@demo.edu.vn` | `SEED_SCHOOL_ADMIN_PASSWORD` (mặc định `SchoolAdmin@123456`) |
| Giáo viên | `teacher01@demo.edu.vn` … `teacher25@demo.edu.vn` | `SEED_DEMO_PASSWORD` (mặc định `Demo@123456`) |
| Học sinh | `student0001@demo.edu.vn` … `student0450@demo.edu.vn` | `SEED_DEMO_PASSWORD` (mặc định `Demo@123456`) |
| Phụ huynh | `parent01@demo.edu.vn` … `parent15@demo.edu.vn` | `SEED_DEMO_PASSWORD` (mặc định `Demo@123456`) |

**Demo portal phụ huynh:** `parent01@demo.edu.vn` gắn HS `student0001` và `student0002` (2 con cùng PH).

### Idempotent strategy

School và admin user dùng `upsert`. Các dữ liệu nghiệp vụ (HS, lớp, môn, ghi danh…) được **xóa và tạo lại** khi `SEED_CLEAR_DEMO=true` (mặc định).

### Output sau seed

```text
Seed completed.
  School: Trường THPT Demo (DEMO)
  School admin: school_admin@demo.edu.vn (SCHOOL_ADMIN)
  System admin: system_admin@demo.edu.vn (SYSTEM_ADMIN)
  Teachers: 25 accounts (password: Demo@123456)
  Students: 450 accounts (student0001…student0450@demo.edu.vn, password: Demo@123456)
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
