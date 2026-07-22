# Hướng dẫn phát triển local

## Yêu cầu hệ thống

| Công cụ | Phiên bản khuyến nghị |
|---------|------------------------|
| Node.js | 20 LTS trở lên |
| pnpm | 9 trở lên |
| Git | Tùy chọn (bạn tự khởi tạo repo) |

## Cấu trúc repository

```text
Final Project/
├── client/     # React SPA (Vite)
├── server/     # NestJS API
└── docs/       # Tài liệu dự án
```

Mỗi thư mục `client/` và `server/` là một package pnpm độc lập, có `pnpm-lock.yaml` riêng.

## Biến môi trường

### Quy ước file env (server)

| File | Mục đích | Commit Git |
|------|----------|------------|
| `.env.example` | Chỉ liệt kê **key** (không giá trị) | ✅ Có |
| `.env.development` | Giá trị cho local dev | ❌ Không |
| `.env.production` | Giá trị cho production | ❌ Không |

NestJS load theo thứ tự: `.env.development` hoặc `.env` (xem `ConfigModule` trong `app.module.ts`).

### Server — bắt đầu local

1. Xem danh sách key trong `server/.env.example`
2. Copy sang `server/.env.development` (file đã có giá trị mẫu dev — chỉnh `DATABASE_URL` Neon của bạn)
3. Không commit `.env.development` / `.env.production`

**Giá trị mẫu development** (trong `.env.development`, không nằm trong example):

```env
PORT=8080
NODE_ENV=development
DATABASE_URL="postgresql://..."   # Neon connection string
JWT_ACCESS_SECRET="..."           # ≥ 32 ký tự
JWT_REFRESH_SECRET="..."          # ≥ 32 ký tự
CORS_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
```

**Production** (`server/.env.production`): điền secret thật, `COOKIE_SECURE=true`, `CORS_ORIGIN` = domain frontend production.

> **Lưu ý bảo mật:** Không commit file chứa secret. `.env.example` chỉ có tên biến.

### Client (`client/.env.development`)

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## Cài đặt dependencies

```bash
# Frontend
cd client
pnpm install

# Backend
cd ../server
pnpm install
```

## Database – Migration và Seed

> Phần này đã sẵn sàng sau Phase 1B.

```bash
cd server

# Tạo / áp dụng migration
pnpm prisma migrate dev

# Seed dữ liệu khởi tạo (trường + admin)
pnpm prisma db seed
```

Seed tạo:

- 1 trường mẫu
- 1 tài khoản admin trường (`role = SCHOOL_ADMIN`)

Chi tiết: [Migration và Seed](../database/migrations-and-seed.md)

## Chạy ứng dụng

Mở hai terminal:

```bash
# Terminal 1 – Backend
cd server
pnpm run start:dev

# Terminal 2 – Frontend
cd client
pnpm run dev
```

| Dịch vụ | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080/api/v1 |
| Health check | http://localhost:8080/api/v1/health |
| Swagger (Sprint 1) | http://localhost:8080/api/docs |

## Kiểm tra chất lượng code

```bash
# Frontend
cd client
pnpm run lint
pnpm run build

# Backend
cd server
pnpm run lint
pnpm run test
pnpm run build
```

## Tài khoản dev sau seed

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin trường | `admin@demo.edu.vn` | `Admin@123456` (đổi qua `SEED_ADMIN_PASSWORD`) |
| Giáo viên | `teacher1@demo.edu.vn`, `teacher2@demo.edu.vn`, `teacher3@demo.edu.vn` | `Demo@123456` (đổi qua `SEED_DEMO_PASSWORD`) |
| Học sinh | `student1@demo.edu.vn` … `student5@demo.edu.vn` | `Demo@123456` |
| Trường | Trường THPT Demo (`DEMO`) | — |

> Chỉ dùng cho môi trường development. Không dùng mật khẩu mặc định trên production.

## Xử lý sự cố thường gặp

### CORS / Cookie không hoạt động

- Frontend phải gọi API với `credentials: 'include'`
- `CORS_ORIGIN` phải khớp chính xác origin frontend (không wildcard khi dùng cookie)
- Development: `COOKIE_SECURE=false`; Production: `COOKIE_SECURE=true`

### Không kết nối được Neon

- Kiểm tra `DATABASE_URL` có `?sslmode=require`
- Kiểm tra IP whitelist trên Neon (nếu bật)
- Chạy `pnpm prisma db pull` để kiểm tra kết nối

### Seed chạy lại bị trùng

Seed thiết kế **idempotent** – chạy lại an toàn, không tạo bản ghi trùng. Chi tiết tại [migrations-and-seed.md](../database/migrations-and-seed.md).
