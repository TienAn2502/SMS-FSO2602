# Sprint 7 – API Endpoints (đề xuất)

> Phase 7B–7E. Phụ thuộc Sprint 6 (sổ điểm đã khóa).

## Grade summaries (Admin)

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/grade-summaries/subject-results` | SCHOOL_ADMIN | Danh sách TB môn (filter, pagination) |
| GET | `/grade-summaries/subject-results/:id` | SCHOOL_ADMIN | Chi tiết kết quả môn |
| POST | `/grade-summaries/recompute` | SCHOOL_ADMIN | Admin: tái tính toàn bộ (kết quả môn + tổng kết HK) |
| POST | `/grade-summaries/recompute/subject-results` | SCHOOL_ADMIN | Admin: tái tính TB môn học kỳ |
| POST | `/grade-summaries/recompute/semester-summaries` | SCHOOL_ADMIN | Admin: tái tính tổng kết học kỳ |
| POST | `/grade-summaries/semesters/:semesterId/finalize` | SCHOOL_ADMIN | Khóa tổng kết học kỳ theo lớp CN |
| GET | `/grade-summaries/semesters/:semesterId/finalize-readiness` | SCHOOL_ADMIN | Kiểm tra điều kiện khóa HK toàn trường |
| POST | `/grade-summaries/semesters/:semesterId/finalize-all` | SCHOOL_ADMIN | Khóa tổng kết học kỳ toàn trường |
| GET | `/grade-summaries/semester-summaries` | SCHOOL_ADMIN | Danh sách tổng kết học kỳ HS |
| GET | `/grade-summaries/year-summaries` | SCHOOL_ADMIN | Danh sách tổng kết năm / lên lớp |
| PATCH | `/grade-summaries/year-summaries/:id` | SCHOOL_ADMIN | Gán / xóa `nextHomeroomClassId` (lớp năm sau) |
| POST | `/grade-summaries/academic-years/:academicYearId/recompute-year-summaries` | SCHOOL_ADMIN | Tái tính tổng kết năm (body `homeroomClassId` tùy chọn) |
| GET | `/grade-summaries/academic-years/:academicYearId/finalize-promotion-readiness` | SCHOOL_ADMIN | Kiểm tra điều kiện chốt lên lớp |
| POST | `/grade-summaries/academic-years/:academicYearId/finalize-promotion-all` | SCHOOL_ADMIN | Chốt xét lên lớp toàn trường |
| POST | `/grade-summaries/academic-years/:academicYearId/finalize-promotion` | SCHOOL_ADMIN | Chốt xét lên lớp theo lớp CN |

## Student enrollments — năm sau (Phase 7E #5)

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/student-enrollments/from-year-promotions/preview` | SCHOOL_ADMIN | Xem trước số lượng sẽ tạo / thiếu lớp |
| POST | `/student-enrollments/from-year-promotions` | SCHOOL_ADMIN | Tạo ghi danh ACTIVE từ tổng kết năm đã chốt |

## Year preparation — tự tạo lớp + map + ghi danh

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/year-preparation/preview` | SCHOOL_ADMIN | Xem trước lớp sẽ tạo / số HS map |
| POST | `/year-preparation/prepare-next-year` | SCHOOL_ADMIN | Tạo lớp HC, gán nextHomeroom, tạo ghi danh |

## Class placement — xếp lớp đầu năm (ở lại / mới lên cấp)

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/class-placement/unassigned` | SCHOOL_ADMIN | HS chưa có lớp trong HK |
| GET | `/class-placement/auto-balance/preview` | SCHOOL_ADMIN | Xem trước chia đều |
| POST | `/class-placement/assign` | SCHOOL_ADMIN | Xếp tay (bulk) |
| POST | `/class-placement/auto-balance` | SCHOOL_ADMIN | Chia đều theo khối |

Query `unassigned`: `semesterId` (bắt buộc), `reason` (`RETAINED`\|`NEW_INTAKE`), `gradeLevelId`, `search`, phân trang.

Body `assign`:

```json
{
  "semesterId": "uuid",
  "assignments": [{ "studentId": "uuid", "homeroomClassId": "uuid" }]
}
```

Body `auto-balance`:

```json
{
  "semesterId": "uuid",
  "gradeLevelId": "uuid",
  "reason": "NEW_INTAKE",
  "studentIds": ["uuid"]
}
```

Body POST prepare-next-year:

```json
{
  "sourceAcademicYearId": "uuid",
  "targetAcademicYearId": "uuid",
  "targetSemesterId": "uuid",
  "createEnrollments": true,
  "enrolledAt": "2026-08-01",
  "note": "tuỳ chọn"
}
```

`createEnrollments` mặc định `true` → bắt buộc `targetSemesterId`. Đặt `false` để chỉ tạo lớp + map.

Query/body ghi danh thủ công:

```json
{
  "sourceAcademicYearId": "uuid",
  "targetSemesterId": "uuid",
  "enrolledAt": "2026-08-01",
  "note": "tuỳ chọn"
}
```

`enrolledAt` / `note` chỉ dùng cho POST. Lớp năm sau lấy từ `student_year_summaries.nextHomeroomClassId`.

> Luồng nghiệp vụ chi tiết: [flows/grade-summaries.md](../flows/grade-summaries.md)

### Luồng tính điểm (MVP)

> Xem đầy đủ: [flows/grade-summaries.md](../flows/grade-summaries.md)

```text
Trong HK: GV nhập điểm → khóa sổ lớp môn (assessment CLOSED)
GVCN: Lưu hạnh kiểm (conduct DRAFT)
Admin: Tái tính → GET finalize-readiness → POST finalize-all (khóa HK toàn trường)
Cuối năm: Tái tính năm → GET finalize-promotion-readiness → POST finalize-promotion-all
→ tạo năm mới + HK → POST /year-preparation/prepare-next-year
→ (tuỳ chọn) PATCH year-summaries / POST from-year-promotions
```
### POST /grade-summaries/recompute — Body

```json
{
  "semesterId": "uuid",
  "homeroomClassId": "uuid",
  "courseSectionId": "uuid"
}
```

Ít nhất một trong `homeroomClassId`, `courseSectionId`. Nếu chỉ `semesterId` — tái tính toàn trường (admin, cẩn trọng).

### Response (subject result item)

```json
{
  "id": "uuid",
  "studentId": "uuid",
  "studentFullName": "Bùi Công Chi",
  "courseSectionId": "uuid",
  "courseSectionCode": "TOAN-10A1",
  "subjectName": "Toán học",
  "semesterId": "uuid",
  "semesterName": "Học kỳ 1",
  "evaluationMode": "NUMERIC",
  "regularAverage": 8.0,
  "midtermScore": 7.5,
  "finalScore": 8.5,
  "semesterAverage": 8.08,
  "yearAverage": null,
  "passFailResult": null,
  "status": "DRAFT",
  "computedAt": "2026-08-03T..."
}
```

---

## Conduct records (Admin + Portal GVCN)

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/conduct-records` | SCHOOL_ADMIN | Danh sách hạnh kiểm |
| GET | `/conduct-records/:id` | SCHOOL_ADMIN | Chi tiết |
| PUT | `/conduct-records/bulk` | SCHOOL_ADMIN | Ghi hàng loạt |
| POST | `/conduct-records/semesters/:semesterId/finalize` | SCHOOL_ADMIN | Khóa hạnh kiểm học kỳ |

### PUT /conduct-records/bulk — Body

```json
{
  "semesterId": "uuid",
  "homeroomClassId": "uuid",
  "records": [
    {
      "studentId": "uuid",
      "trainingResultLevel": "GOOD",
      "note": "Chấp hành tốt nội quy"
    }
  ]
}
```

---

## Portal — GVCN

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/portal/my-homeroom/summaries` | TEACHER | Bảng tổng kết lớp CN (filter học kỳ) |
| GET | `/portal/my-homeroom/conduct-records` | TEACHER | Lưới hạnh kiểm lớp CN |
| PUT | `/portal/my-homeroom/conduct-records` | TEACHER | Ghi hạnh kiểm (chỉ lớp CN) |
| GET | `/portal/my-homeroom/year-summaries` | TEACHER | Xem đề xuất lên lớp (read-only MVP) |

Query chung: `semesterId`, `academicYearId`

---

## Portal — Học sinh

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/portal/my-summaries` | STUDENT | Tổng kết bản thân |
| GET | `/portal/my-summaries/subjects` | STUDENT | TB từng môn theo học kỳ |

Query: `semesterId`, `academicYearId`

### Response (my-summaries)

```json
{
  "semesterSummary": {
    "semesterName": "Học kỳ 1",
    "overallAverage": 7.99,
    "academicResultLevel": "GOOD",
    "trainingResultLevel": "GOOD",
    "status": "CLOSED"
  },
  "subjectResults": [
    {
      "subjectName": "Toán học",
      "semesterAverage": 8.08,
      "evaluationMode": "NUMERIC"
    }
  ],
  "yearSummary": {
    "academicYearName": "2025-2026",
    "overallAverage": null,
    "academicResultLevel": null,
    "promotionDecision": "PENDING",
    "status": "DRAFT"
  }
}
```

---

## Portal — Phụ huynh

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/portal/my-children/:studentId/summaries` | PARENT | Tổng kết con đã liên kết |

Query: giống HS.

---

## Quy tắc HTTP

| Mã | Khi nào |
|----|---------|
| 401 | Chưa đăng nhập |
| 403 | Không đúng role / không phải GVCN lớp đó |
| 404 | HS / học kỳ / lớp không tồn tại |
| 409 | Đã `CLOSED` — không sửa hạnh kiểm / không tái tính |
| 422 | Thiếu điểm bắt buộc để finalize |

---

## Liên quan Sprint 6

Portal HS vẫn dùng:

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/portal/my-scores/grid` | Lưới điểm TX/GK/CK (chi tiết) |

Sprint 7 **bổ sung** tổng kết đã tính — không thay thế lưới điểm.
