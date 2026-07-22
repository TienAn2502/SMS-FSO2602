# ADR 007: Hoãn audit_logs khỏi MVP Sprint 1

**Trạng thái:** ✅ Đã chốt  
**Ngày quyết định:** 2026-07-20  
**Ngữ cảnh:** Phase 1B — schema database Sprint 1

## Quyết định

**Không triển khai** `audit_logs` trong MVP Sprint 1:

- Không tạo bảng `audit_logs` trong migration init
- Không seed permission `audit:read`
- Không có module/API `audit-logs` trong Sprint 1
- Không ghi LOGIN/LOGOUT audit trong Phase 1C

## Lý do (MVP first)

- Giảm scope Phase 1B–1D — tập trung auth + RBAC + quản lý user trước
- Audit log hữu ích nhưng không blocking luồng MVP pilot
- Có thể thêm sau khi core flow ổn định

## Hệ quả

| Hạng mục | Sprint 1 MVP |
|----------|--------------|
| Bảng `audit_logs` | ❌ Hoãn |
| `GET /audit-logs` | ❌ Hoãn |
| UI `/nhat-ky` | ❌ Hoãn |
| Ghi log LOGIN/LOGOUT | ❌ Hoãn |

## Khi nào triển khai

Thêm khi cần truy vết hành động admin (đổi role, tạo user, …) — ưu tiên **Sprint 1.5** hoặc đầu **Sprint 2**.

Migration mới sẽ thêm bảng `audit_logs` + permission `audit:read` + module ghi/đọc log.

## Thiết kế dự phòng (tham khảo)

Giữ spec bảng `audit_logs` trong master prompt — triển khai khi bật lại tính năng.
