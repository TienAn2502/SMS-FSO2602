# ADR 005: Lưu trữ session / JWT trên server

**Trạng thái:** ✅ Đã chốt  
**Ngày quyết định:** 2026-07-20  
**Ngữ cảnh:** Sprint 1 – thiết kế auth MVP

## Quyết định

Dùng **JWT stateless** — access token và refresh token ký số, truyền qua HttpOnly cookie.

**Không lưu** token/session vào:

- Database (`auth_sessions`)
- Redis
- Bất kỳ store server-side nào khác

## Lý do (MVP first)

- Đơn giản, triển khai nhanh
- Seed MVP chỉ 1 trường — chưa cần revoke session phức tạp
- Tránh thêm bảng và logic rotation trong Sprint 1
- Có thể nâng cấp lên stateful session sau khi cần production hardening

## Hành vi auth MVP

```text
Login   → ký access JWT + refresh JWT → set HttpOnly cookie
Refresh → verify chữ ký refresh JWT → phát cặp token mới
Logout  → xóa cookie (token vẫn valid đến hết hạn — chấp nhận cho MVP)
```

## Đã chốt kèm theo

- Token qua **HttpOnly Cookie**, không dùng localStorage
- Access token payload: `{ sub, activeSchoolId }`
- Role load từ DB (`user.role`) — không nhét vào JWT
- **Không** dùng Redis trong MVP

## Trade-off chấp nhận (MVP)

| Hạn chế | Ghi chú |
|---------|---------|
| Logout không revoke server-side | Token hết hạn theo TTL (15 phút access / 7 ngày refresh) |
| Khóa tài khoản không invalidate token ngay | Chấp nhận tạm; bổ sung khi có stateful session |
| Không refresh token rotation có state | Refresh JWT verify chữ ký + expiry là đủ cho MVP |

## Hệ quả kỹ thuật

| Hạng mục | Sprint 1 MVP |
|----------|--------------|
| Bảng `auth_sessions` | **Không tạo** |
| Redis | **Không dùng** |
| `POST /auth/login` | Set cookie JWT |
| `POST /auth/refresh` | Verify JWT refresh, phát token mới |
| `POST /auth/logout` | Clear cookie |

## Nâng cấp sau MVP (backlog)

Khi cần revoke session, đổi mật khẩu invalidate token, hoặc audit thiết bị đăng nhập:

- Thêm bảng `auth_sessions` + hash refresh token
- Hoặc Redis blacklist (chỉ khi có nhu cầu thực tế)

Không thiết kế abstraction sớm — refactor auth service khi chốt nâng cấp.

## Các phương án đã xem xét

| Phương án | Kết quả |
|-----------|---------|
| A – Stateless JWT | ✅ **Đã chọn** |
| B – Stateful refresh trong DB | Hoãn — master prompt gốc, dùng sau MVP |
| C – Hybrid sid + DB | Hoãn |
| Redis session/blacklist | ❌ Không dùng MVP |
