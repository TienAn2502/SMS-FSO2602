# ADR 008: Đơn giản hóa RBAC và tenant MVP

**Trạng thái:** ✅ Đã chốt  
**Ngày quyết định:** 2026-07-20  
**Ngữ cảnh:** Phase 1B — schema Sprint 1

## Quyết định

MVP Sprint 1 dùng mô hình **đơn giản**:

1. **Một user thuộc một trường** — `users.school_id` FK trực tiếp tới `schools`
2. **Role enum trên user** — `SCHOOL_ADMIN | TEACHER | STUDENT`
3. **Không có** bảng permissions, roles, memberships trong MVP

## Bảng bỏ khỏi MVP

| Bảng | Lý do bỏ |
|------|----------|
| `school_memberships` | User gắn trực tiếp `school_id` |
| `roles` | Role là enum trên `users` |
| `permissions` | Quyền hardcode theo role trong code |
| `role_permissions` | Không cần matrix permission |
| `membership_roles` | Không có membership |

## Schema MVP

```text
schools
users
  ├── school_id → schools.id
  └── role: SCHOOL_ADMIN | TEACHER | STUDENT
```

## Phân quyền MVP (trong code, không DB)

| Role | Quyền tóm tắt |
|------|----------------|
| `SCHOOL_ADMIN` | Quản lý user, cài đặt trường |
| `TEACHER` | Chức năng giáo viên (Phase sau) |
| `STUDENT` | Chức năng học sinh (Phase sau) |

Backend dùng **RoleGuard** kiểm tra `user.role`, không query bảng permissions.

Frontend ẩn/hiện menu theo `role`, không theo mảng permission codes.

## Tenant

```text
activeSchoolId = user.school_id
```

Không cần membership lookup. JWT payload: `{ sub, activeSchoolId }` với `activeSchoolId = user.school_id`.

## Trade-off chấp nhận

| Hạn chế | Ghi chú |
|---------|---------|
| User không thuộc nhiều trường | Thêm lại `school_memberships` khi cần |
| Không tùy chỉnh permission theo trường | Thêm lại `permissions` khi cần |
| Role không linh hoạt | Đủ cho MVP pilot 1 trường |

## Nâng cấp sau MVP

Khi cần multi-school hoặc permission matrix:

- Thêm lại `school_memberships`, `roles`, `permissions`
- Migration chuyển `users.school_id` + `users.role` sang membership model

## Hệ quả Sprint 1

- Phase 1C: RoleGuard thay PermissionGuard
- Phase 1D: CRUD user trong trường, không module memberships/roles/permissions
- Seed: school + admin user với `role = SCHOOL_ADMIN`
