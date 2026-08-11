# ADR 013: Platform Admin module (System Admin)

**Trạng thái:** Chấp nhận (Sprint 9 — đã triển khai; cập nhật 2026-08-10: bỏ trường ảo)  
**Ngày:** 2026-08-10  
**Ngữ cảnh:** Multi-tenant SaaS — onboard trường thứ 2 trở đi không chỉ qua seed

## Bối cảnh

- Sprint 1–8: mọi API nghiệp vụ trường dùng `TenantGuard` + `activeSchoolId` từ JWT ([multi-tenancy.md](../architecture/multi-tenancy.md)).
- Tạo trường đầu tiên: seed ([ADR 002](./002-seed-first-school.md)).
- Role `SYSTEM_ADMIN` đã có trong schema; chưa có API/UI quản lý tenant.

## Quyết định

1. **Tách module NestJS `platform/`** — prefix route `/platform/*`, guard riêng `PlatformGuard` (chỉ `SYSTEM_ADMIN`).
2. **Không dùng `TenantGuard`** trên route platform; tenant target truyền qua path (`/platform/schools/:schoolId/...`) khi cần thao tác theo trường.
3. **`SYSTEM_ADMIN` không thuộc tenant** — `users.school_id` **nullable**; JWT không có `activeSchoolId` khi login bình thường. Chỉ set `activeSchoolId` khi impersonate (Sprint 10).
4. **Onboard trường mới** = transaction: tạo `schools` + tạo user `SCHOOL_ADMIN` đầu tiên (email/mật khẩu tạm).
5. **Không tạo trường ảo `platform`** — bảng `schools` chỉ chứa trường thật.

## Lý do

| Phương án | Lý do chọn / loại |
|-----------|-------------------|
| Module `/platform` tách biệt | Tránh lẫn guard tenant với CRUD toàn hệ thống |
| `school_id` nullable cho SYSTEM_ADMIN | Domain sạch: system admin không phải “user của một trường”; tránh special-case `code = platform` |
| Transaction onboard | Đảm bảo trường không tồn tại orphan không admin |
| Hoãn billing / feature flags | Sprint 11 — sau khi có ≥2 trường thật |

## API surface (Sprint 9)

Xem [sprint9-endpoints.md](../api/sprint9-endpoints.md).

## Hệ quả

### Có

- System admin tạo / khóa / mở trường qua UI
- School admin đăng nhập trường mới độc lập với DEMO
- E2E: tạo trường → login school admin → `GET /schools/current`
- Login system admin: session `activeSchool = null`; sau impersonate mới có tenant context

### Chưa có (Sprint 10+)

- Audit log platform, quota, billing
- `POST /auth/switch-school` ([ADR 006](./006-defer-switch-school.md))

## Các phương án đã xem xét

| Phương án | Lý do loại / ghi chú |
|-----------|----------------------|
| Mở rộng `schools` controller hiện tại | `GET/PATCH /schools/current` là tenant-scoped; dễ nhầm quyền |
| Trường ảo `schools.code = platform` | Ban đầu chọn để tránh null; **đã thay** bằng `school_id` nullable (đúng domain hơn) |
| Script CLI only (không UI) | Đủ dev; không đủ ops/pilot nhiều trường |

## Tham chiếu

- [sprint-9-plan.md](../sprints/sprint-9-plan.md)
- [002-seed-first-school.md](./002-seed-first-school.md)
- [006-defer-switch-school.md](./006-defer-switch-school.md)
