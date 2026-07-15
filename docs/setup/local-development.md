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

### Server (`server/.env.development`)

Tạo file từ `.env.example` và điền giá trị:

```env
# Server
PORT=8080
NODE_ENV=development

# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# JWT
JWT_ACCESS_SECRET="thay-bang-chuoi-ngau-nhien-dai"
JWT_REFRESH_SECRET="thay-bang-chuoi-ngau-nhien-khac"
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cookie
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# CORS – origin của frontend dev
CORS_ORIGIN=http://localhost:5173

# Seed (chỉ dùng khi chạy seed)
SEED_ADMIN_EMAIL=admin@demo.edu.vn
SEED_ADMIN_PASSWORD=Admin@123456
SEED_SCHOOL_CODE=DEMO
SEED_SCHOOL_NAME=Trường THPT Demo
```

> **Lưu ý bảo mật:** Không commit file `.env*` chứa secret thật. Chỉ commit `.env.example` với placeholder.

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

> Phần này sẽ có hiệu lực sau khi Phase 1B (Prisma setup) được triển khai.

```bash
cd server

# Tạo / áp dụng migration
pnpm prisma migrate dev

# Seed dữ liệu khởi tạo (trường + admin)
pnpm prisma db seed
```

Seed tạo:

- Permissions hệ thống
- Roles mặc định (`SCHOOL_ADMIN`, `TEACHER`, …)
- 1 trường mẫu
- 1 tài khoản admin trường

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

| Trường | Giá trị mặc định |
|--------|------------------|
| Email | `admin@demo.edu.vn` |
| Mật khẩu | `Admin@123456` (đổi qua `SEED_ADMIN_PASSWORD`) |
| Trường | Trường THPT Demo (`DEMO`) |

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
