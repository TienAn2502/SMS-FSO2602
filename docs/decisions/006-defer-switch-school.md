# ADR 006: Hoãn API switch-school khỏi MVP

**Trạng thái:** ✅ Đã chốt  
**Ngày quyết định:** 2026-07-20  
**Ngữ cảnh:** Sprint 1 – multi-tenancy và auth MVP

## Quyết định

**Không triển khai** trong MVP:

- `POST /api/v1/auth/switch-school`
- Trang frontend `/chon-truong`
- UI "Đổi trường" trên header

## Lý do (MVP first)

- MVP: mỗi user thuộc **một trường** (`users.school_id`) — xem [ADR 008](./008-simplify-rbac-mvp.md)
- Login set `activeSchoolId = user.school_id` — không cần chọn trường
- Switch-school chỉ cần khi user thuộc **≥ 2 trường** — chưa xảy ra trong MVP pilot
- Giảm scope Sprint 1: ít endpoint, ít UI, ít test

## Hành vi MVP thay thế

### Lúc đăng nhập

```text
POST /auth/login
→ Backend load user theo email
→ Set activeSchoolId = user.school_id
→ Nhúng activeSchoolId vào access JWT
→ Trả user + activeSchool + role
```

### Các API nghiệp vụ

Tenant vẫn lấy từ `request.user.activeSchoolId` (decode từ JWT). Quy tắc multi-tenancy **không đổi**.

## Ngoài phạm vi MVP (Sprint 1)

| Hạng mục | Trạng thái |
|----------|------------|
| `POST /auth/switch-school` | Backlog |
| `/chon-truong` | Backlog |
| Header "Đổi trường" | Backlog |
| Invalidate cache khi switch | Backlog |

## Khi nào triển khai

Thêm switch-school khi **một trong các điều kiện**:

1. Onboard trường thứ 2 qua seed/platform admin
2. Thêm lại `school_memberships` — user thuộc nhiều trường (ADR 008)
3. Pilot yêu cầu admin/giáo viên làm việc đa trường

Ưu tiên sprint: **Sprint 1.5** hoặc đầu **Sprint 2**, trước khi mở rộng multi-tenant thật.

## Thiết kế dự phòng (chưa code)

Khi triển khai sau, endpoint dự kiến:

```text
POST /api/v1/auth/switch-school
Body: { schoolId }
→ Verify user có quyền tại schoolId (membership)
→ Reissue access JWT với activeSchoolId mới
→ Trả role tại trường mới
```

Chi tiết tham khảo: [authentication.md – Backlog](../architecture/authentication.md#backlog-chuyển-trường-switch-school)

## Hệ quả Sprint 1

**Điều kiện hoàn thành Sprint 1 điều chỉnh:**

```text
Seed tạo trường + admin
→ Admin đăng nhập (activeSchoolId = user.school_id)
→ Admin tạo user & gán role
→ User đăng nhập → vào thẳng trường của mình
→ Sidebar theo role
→ Tenant isolation pass
```

Không còn yêu cầu: "User chọn trường" / "Switch school".
