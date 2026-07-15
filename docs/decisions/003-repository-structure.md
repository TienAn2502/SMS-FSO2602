# ADR-003: Giữ cấu trúc client/ + server/

**Trạng thái:** Đã chốt  
**Ngày:** 2026-07-15  
**Ngữ cảnh:** Khảo sát repository ban đầu

## Bối cảnh

Master prompt đề xuất cấu trúc PNPM workspace:

```text
eschool/
├── apps/web/
├── apps/api/
└── packages/
```

Repository hiện tại:

```text
Final Project/
├── client/
└── server/
```

## Quyết định

**Giữ nguyên** cấu trúc `client/` + `server/`. Không tái cấu trúc sang `apps/` trong MVP.

## Lý do

1. Master prompt: *"Nếu repository hiện tại đã có cấu trúc hợp lý, hãy giữ nguyên"*
2. Cả hai package đã có scaffold hoạt động (Vite, NestJS)
3. Tái cấu trúc tốn effort, không mang lại giá trị nghiệp vụ Sprint 1
4. Tách biệt rõ frontend/backend, dễ deploy độc lập sau này

## Hệ quả

- Mỗi package có `pnpm-lock.yaml` riêng
- Không có shared packages (`packages/api-contract`) trong Sprint 1
- Types/API contract có thể duplicate nhẹ giữa client và server; sync thủ công hoặc thêm shared package sau
- Docs đặt tại root `docs/` (ngoài cả hai package)

## Tương lai

Có thể thêm root workspace khi cần:

```text
Final Project/
├── client/
├── server/
├── docs/
├── package.json           # root scripts: dev, build, lint
└── pnpm-workspace.yaml
```

Không bắt buộc trong Sprint 1.

## Các phương án đã xem xét

| Phương án | Lý do loại |
|-----------|------------|
| Rename → apps/web + apps/api | Breaking change không cần thiết |
| Monorepo với Turborepo/Nx | Over-engineering cho MVP |
