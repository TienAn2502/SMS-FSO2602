# Sprint 6 – API Endpoints

> Phase 6B: `assessments` (admin read). Phase 6C: `scores`. Phase 6D+: portal.

## Assessments (Admin — chỉ xem)

| Method | Path               | Role         | Mô tả                                   |
| ------ | ------------------ | ------------ | --------------------------------------- |
| GET    | `/assessments`     | SCHOOL_ADMIN | Danh sách đầu điểm (filter, pagination) |
| GET    | `/assessments/:id` | SCHOOL_ADMIN | Chi tiết đầu điểm + điểm HS (read-only) |

> Admin **không** tạo đầu điểm hay ghi điểm — việc đó do GV qua Portal (giống điểm danh Sprint 5).

### GET /assessments — Query params

| Param                | Kiểu                                             | Mô tả            |
| -------------------- | ------------------------------------------------ | ---------------- |
| `page`, `limit`      | number                                           | Phân trang       |
| `courseSectionId`    | uuid                                             | Lọc theo lớp môn |
| `teacherId`          | uuid                                             | Lọc theo GV      |
| `semesterId`         | uuid                                             | Lọc theo học kỳ  |
| `academicYearId`     | uuid                                             | Lọc theo năm học |
| `homeroomClassId`    | uuid                                             | Lọc theo lớp HC  |
| `type`               | AssessmentType                                   | Loại đầu điểm    |
| `status`             | `OPEN` \| `CLOSED`                               | Trạng thái       |
| `assessmentDateFrom` | `YYYY-MM-DD`                                     | Từ ngày          |
| `assessmentDateTo`   | `YYYY-MM-DD`                                     | Đến ngày         |
| `sortBy`             | `assessmentDate` \| `name` \| `type` \| `status` | Sắp xếp          |
| `sortOrder`          | `asc` \| `desc`                                  | Thứ tự           |

### Response (list item)

```json
{
    "id": "uuid",
    "semesterId": "uuid",
    "semesterName": "Học kỳ 1",
    "academicYearId": "uuid",
    "courseSectionId": "uuid",
    "courseSectionCode": "TOAN-10A1",
    "courseSectionName": "Toán 10A1",
    "homeroomClassId": "uuid",
    "teacherId": "uuid",
    "teacherFullName": "Nguyễn Văn A",
    "type": "REGULAR",
    "name": "KT 15 phút lần 1",
    "assessmentDate": "2025-09-15",
    "maxScore": 10,
    "weight": null,
    "status": "CLOSED",
    "note": null,
    "scoreCount": 30,
    "scoredCount": 28,
    "createdAt": "2026-07-31T...",
    "updatedAt": "2026-07-31T..."
}
```

### Response (detail) — thêm `scores`

```json
{
    "scores": [
        {
            "id": "uuid",
            "studentId": "uuid",
            "studentFullName": "Bùi Công Chi",
            "score": 8.5,
            "note": null
        },
        {
            "id": "uuid",
            "studentId": "uuid",
            "studentFullName": "Nguyễn Văn B",
            "score": null,
            "note": null
        }
    ]
}
```

---

## AssessmentType

| Giá trị   | Tiếng Việt                             |
| --------- | -------------------------------------- |
| `REGULAR` | Thường xuyên (miệng, 15 phút, 1 tiết…) |
| `MIDTERM` | Giữa kỳ                                |
| `FINAL`   | Cuối kỳ                                |

---

## Portal — Sổ điểm (Phase 6D)

### Giáo viên (`TEACHER`)

| Method | Path                                        | Mô tả                                                              |
| ------ | ------------------------------------------- | ------------------------------------------------------------------ |
| GET    | `/portal/my-gradebook-classes`              | Lớp môn được phân công (có thể tái dùng `my-teaching-assignments`) |
| POST   | `/portal/assessments`                       | Tạo đầu điểm (GV = teacherId tự động)                              |
| GET    | `/portal/assessments/:id`                   | Chi tiết + điểm HS (assessment của GV)                             |
| POST   | `/portal/assessments/:id/scores/initialize` | Tạo dòng score cho HS enrollment ACTIVE còn thiếu                  |
| PUT    | `/portal/assessments/:id/scores`            | Bulk ghi điểm (assessment **OPEN**)                                |
| PATCH  | `/portal/assessments/:id`                   | Khóa đầu điểm (`status: CLOSED`)                                   |

**POST /portal/assessments**

```json
{
    "courseSectionId": "uuid",
    "type": "REGULAR",
    "name": "KT 15 phút lần 1",
    "assessmentDate": "2025-09-15",
    "maxScore": 10,
    "note": "Chương 1"
}
```

**POST initialize** — không body; tạo `scores` với `score: null` cho HS chưa có dòng.

**PUT scores** — body:

```json
{
    "scores": [
        { "studentId": "uuid", "score": 8.5 },
        { "studentId": "uuid", "score": 7.0, "note": "Làm bài chậm" },
        { "studentId": "uuid", "score": null }
    ]
}
```

| Field    | Mô tả                                                   |
| -------- | ------------------------------------------------------- |
| `scores` | Upsert điểm từng HS; tối thiểu 1 phần tử khi lưu        |
| `score`  | `null` = xóa / chưa nhập; số phải trong `[0, maxScore]` |

**Quy trình gợi ý (giống điểm danh Sprint 5):**

```text
POST assessment
  → POST scores/initialize   (nạp danh sách HS)
  → PUT scores               (nhập / sửa điểm, có thể gọi nhiều lần)
  → PATCH status CLOSED      (khóa)
```

GV **không** ghi được assessment `CLOSED`.

### Học sinh (`STUDENT`)

| Method | Path                      | Mô tả                                      |
| ------ | ------------------------- | ------------------------------------------ |
| GET    | `/portal/my-scores/grid`  | Bảng điểm bản thân (lưới TX/GK/CK, readonly) |

Query: `semesterId`, `academicYearId`

### Phụ huynh (`PARENT`)

| Method | Path                                          | Mô tả                                      |
| ------ | --------------------------------------------- | ------------------------------------------ |
| GET    | `/portal/my-children/:studentId/scores/grid`  | Bảng điểm con (lưới TX/GK/CK, readonly)    |
| GET    | `/portal/my-children/:studentId/scores`       | Bảng điểm con dạng danh sách (legacy)      |

Query lưới: `semesterId`, `academicYearId` (giống HS).

---

## Mã lỗi

| Code                         | HTTP | Mô tả                             |
| ---------------------------- | ---- | --------------------------------- |
| `ASSESSMENT_NOT_FOUND`       | 404  | Không tìm thấy đầu điểm           |
| `SCORE_NOT_FOUND`            | 404  | Không tìm thấy dòng điểm          |
| `ASSESSMENT_CONFLICT`        | 409  | Trùng lớp môn + ngày + loại + tên |
| `TEACHER_NOT_ASSIGNED`       | 422  | GV chưa được phân công lớp môn    |
| `STUDENT_NOT_ENROLLED`       | 422  | HS không thuộc lớp HC của lớp môn |
| `COURSE_SECTION_NO_HOMEROOM` | 422  | Lớp môn chưa gắn lớp HC           |
| `NO_ACTIVE_ENROLLMENTS`      | 422  | Không có HS ghi danh ACTIVE       |
| `ASSESSMENT_CLOSED`          | 422  | Đầu điểm đã khóa                  |
| `SCORE_OUT_OF_RANGE`         | 422  | Điểm ngoài `[0, maxScore]`        |
| `SCORES_REQUIRED`            | 422  | Body thiếu hoặc rỗng `scores`     |

---

## Tài liệu liên quan

| Tài liệu                                           | Nội dung                   |
| -------------------------------------------------- | -------------------------- |
| [sprint-6-plan.md](../sprints/sprint-6-plan.md)    | Kế hoạch triển khai        |
| [schema-sprint6.md](../database/schema-sprint6.md) | Chi tiết bảng              |
| [sprint5-endpoints.md](./sprint5-endpoints.md)     | Pattern portal (điểm danh) |
