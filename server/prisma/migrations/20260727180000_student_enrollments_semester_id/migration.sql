-- AlterTable: add semester_id, backfill, drop academic_year_id

ALTER TABLE "student_enrollments" ADD COLUMN "semester_id" UUID;

UPDATE "student_enrollments" AS se
SET "semester_id" = picked.semester_id
FROM (
  SELECT DISTINCT ON (se_inner.id)
    se_inner.id AS enrollment_id,
    s.id AS semester_id
  FROM "student_enrollments" AS se_inner
  INNER JOIN "semesters" AS s
    ON s."academic_year_id" = se_inner."academic_year_id"
    AND s."school_id" = se_inner."school_id"
  ORDER BY se_inner.id, s."is_current" DESC, s."start_date" ASC
) AS picked
WHERE se.id = picked.enrollment_id;

ALTER TABLE "student_enrollments" ALTER COLUMN "semester_id" SET NOT NULL;

DROP INDEX IF EXISTS "student_enrollments_one_active_per_year_idx";

ALTER TABLE "student_enrollments" DROP CONSTRAINT "student_enrollments_academic_year_id_fkey";

DROP INDEX IF EXISTS "student_enrollments_academic_year_id_idx";

ALTER TABLE "student_enrollments" DROP COLUMN "academic_year_id";

ALTER TABLE "student_enrollments"
  ADD CONSTRAINT "student_enrollments_semester_id_fkey"
  FOREIGN KEY ("semester_id") REFERENCES "semesters"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "student_enrollments_semester_id_idx"
  ON "student_enrollments"("semester_id");

CREATE UNIQUE INDEX "student_enrollments_one_active_per_semester_idx"
  ON "student_enrollments" ("school_id", "student_id", "semester_id")
  WHERE status = 'ACTIVE';
