# Sprint 10 – Kế hoạch triển khai (Platform 2: Vận hành & hỗ trợ)

**Mục tiêu:** System admin hỗ trợ vận hành đa tenant — impersonation vào trường, audit log platform, dashboard giám sát  
**Thời gian ước tính:** 1,5–2 tuần  
**Ngôn ngữ UI:** Tiếng Việt  
**Phụ thuộc:** Sprint 9 hoàn thành (CRUD trường + onboard school admin)

## Điều kiện hoàn thành

```text
System admin đăng nhập
→ Xem dashboard: số trường active/suspended, tổng user theo role (aggregate)
→ Chọn trường DEMO → "Đăng nhập thay" (impersonate school admin hoặc read-only context)
→ Thao tác trong app admin trường với banner cảnh báo impersonation
→ Thoát impersonation → về /platform
→ Mọi thao tác impersonation + suspend trường ghi audit log
→ Health endpoint platform: DB + R2 + Puppeteer (trạng thái tóm tắt)
```

## Quyết định MVP

| Hạng mục | Quyết định |
|----------|------------|
| Impersonation | JWT mới / cookie phụ với claim `impersonatedBy` + `activeSchoolId` = trường target |
| Phạm vi impersonate | MVP: **context school admin read-only** hoặc full — chốt Phase 10A |
| Audit log | Bảng `platform_audit_logs` — thay thế hoãn ADR 007 cho phạm vi platform |
| Switch-school user | **Không** — chỉ system admin impersonate; ADR 006 giữ nguyên cho user thường |
| Metrics | Count aggregate SQL — không cần data warehouse |
| Health | Tái sử dụng `/health` + mở rộng cho platform dashboard |

## Phạm vi Sprint 10

### Trong phạm vi

| Module | Mô tả |
|--------|-------|
| **Impersonation API** | `POST /platform/schools/:id/impersonate`, `POST /platform/impersonation/end` |
| **UI banner** | "Đang xem với quyền system admin — Trường {name}" + nút thoát |
| **Platform audit log** | Ghi: create/suspend school, impersonate start/end, reset admin password |
| **Dashboard metrics** | Số trường, user/role, trường mới 30 ngày |
| **Health summary** | Trạng thái DB, R2, PDF renderer |
| **Reset password admin trường** | `POST /platform/schools/:id/admin/reset-password` |
| **E2E** | Impersonation flow + audit row created |

### Ngoài phạm vi

- Billing, quota — Sprint 11
- Feature flags — Sprint 11
- Full audit mọi API tenant (ADR 007 scope rộng) — chỉ platform actions
- 2FA bắt buộc system admin — phase sau
- Support ticket system — phase sau

---

## Phases

### Phase 10A – Impersonation ✅

| # | Task | Endpoint / file | Trạng thái |
|---|------|-----------------|------------|
| 1 | Schema JWT impersonation | `auth.types.ts`, `jwt-token.service.ts` | ✅ |
| 2 | Start impersonate | `POST /platform/schools/:id/impersonate` | ✅ |
| 3 | End impersonate | `POST /platform/impersonation/end` | ✅ |
| 4 | Guard: cho phép SYSTEM_ADMIN + impersonation flag qua tenant routes | guard middleware | ✅ |
| 5 | Frontend banner + exit | `ImpersonationBanner.tsx` | ✅ |
| 6 | E2E impersonation | `test/platform-impersonation.e2e-spec.ts` | ✅ |

**Luồng:**

```text
System admin tại /platform/schools/:id
→ POST impersonate { targetRole?: 'SCHOOL_ADMIN' }
→ Server phát access token mới: activeSchoolId = schoolId, impersonatedBy = systemAdminUserId
→ Redirect / (dashboard trường)
→ Banner hiển thị; sidebar menu SCHOOL_ADMIN
→ POST impersonation/end → clear activeSchoolId → /platform
```

---

### Phase 10B – Platform audit log

| # | Task | File | Trạng thái |
|---|------|------|------------|
| 1 | Prisma `platform_audit_logs` | migration | ⬜ |
| 2 | Service ghi log | `platform-audit.service.ts` | ⬜ |
| 3 | Hook vào create/suspend/impersonate/reset-password | platform services | ⬜ |
| 4 | API list log | `GET /platform/audit-logs` | ⬜ |
| 5 | UI bảng audit (filter theo trường, action) | `/platform/audit-logs` | ⬜ |

**Cột log (MVP):**

| Field | Mô tả |
|-------|-------|
| `actorUserId` | System admin thực hiện |
| `action` | `SCHOOL_CREATED`, `SCHOOL_SUSPENDED`, `IMPERSONATE_START`, … |
| `targetSchoolId` | Nullable |
| `metadata` | JSON (email admin, lý do, …) |
| `createdAt` | Timestamp |

---

### Phase 10C – Dashboard & health

| # | Task | Endpoint | Trạng thái |
|---|------|----------|------------|
| 1 | Platform overview stats | `GET /platform/overview` | ⬜ |
| 2 | Health checks aggregated | `GET /platform/health` | ⬜ |
| 3 | UI dashboard cards | `/platform` | ⬜ |
| 4 | Reset school admin password | `POST /platform/schools/:id/admin/reset-password` | ⬜ |

**Overview response (gợi ý):**

```json
{
  "schoolCount": { "active": 2, "suspended": 0, "inactive": 0 },
  "userCountByRole": { "SCHOOL_ADMIN": 2, "TEACHER": 15, "STUDENT": 450 },
  "recentSchools": [ ... ]
}
```

---

### Phase 10D – Test & docs

| # | Task | File | Trạng thái |
|---|------|------|------------|
| 1 | E2E audit + impersonation | `server/test/` | ⬜ |
| 2 | API doc | [sprint10-endpoints.md](../api/sprint10-endpoints.md) | ⬜ |
| 3 | Cập nhật ADR 007 note (platform audit partial) | decisions | ⬜ |

---

## Quy tắc nghiệp vụ

| # | Quy tắc |
|---|---------|
| 1 | Chỉ `SYSTEM_ADMIN` được impersonate |
| 2 | Mọi session impersonation phải có `impersonatedBy` trong token (hoặc session store) |
| 3 | Audit log append-only — không sửa/xóa |
| 4 | Reset password admin: ghi log + trả mật khẩu tạm một lần (hoặc gửi email phase sau) |
| 5 | Impersonation không bypass trường `SUSPENDED` (chỉ ACTIVE) |

---

## Kế thừa

| Hạng mục | Sprint nguồn |
|----------|--------------|
| CRUD trường | Sprint 9 |
| Audit logs toàn hệ thống | ADR 007 (hoãn) — Sprint 10 chỉ platform |
| Switch-school user | ADR 006 (vẫn hoãn) |

---

## Tài liệu liên quan

| Tài liệu | Nội dung |
|----------|----------|
| [sprint-9-plan.md](./sprint-9-plan.md) | Sprint trước |
| [sprint10-endpoints.md](../api/sprint10-endpoints.md) | REST API |
| [007-defer-audit-logs.md](../decisions/007-defer-audit-logs.md) | Audit toàn tenant |

---

## Bước tiếp theo

Sau Sprint 10 → [Sprint 11](./sprint-11-plan.md) (quota, feature flags, billing tuỳ chọn).
