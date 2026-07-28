-- AlterTable
ALTER TABLE "course_sections" ADD COLUMN "semester_id" UUID;

-- Migrate existing rows to HK1 of the same academic year
UPDATE "course_sections" cs
SET "semester_id" = s.id
FROM "semesters" s
WHERE cs."academic_year_id" = s."academic_year_id"
  AND s.code = 'HK1';

-- Fallback: current semester of the academic year
UPDATE "course_sections" cs
SET "semester_id" = s.id
FROM "semesters" s
WHERE cs."semester_id" IS NULL
  AND cs."academic_year_id" = s."academic_year_id"
  AND s."is_current" = true;

-- Last resort: any semester in the academic year
UPDATE "course_sections" cs
SET "semester_id" = (
  SELECT s.id
  FROM "semesters" s
  WHERE s."academic_year_id" = cs."academic_year_id"
  ORDER BY s."start_date"
  LIMIT 1
)
WHERE cs."semester_id" IS NULL;

ALTER TABLE "course_sections" ALTER COLUMN "semester_id" SET NOT NULL;

-- Drop old constraints and indexes
ALTER TABLE "course_sections" DROP CONSTRAINT "course_sections_academic_year_id_fkey";
DROP INDEX "course_sections_school_id_academic_year_id_code_key";
DROP INDEX "course_sections_homeroom_class_id_grade_level_subject_id_key";
DROP INDEX "course_sections_academic_year_id_idx";
ALTER TABLE "course_sections" DROP COLUMN "academic_year_id";

-- Add new constraints and indexes
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "course_sections_semester_id_idx" ON "course_sections"("semester_id");

CREATE UNIQUE INDEX "course_sections_school_id_semester_id_code_key" ON "course_sections"("school_id", "semester_id", "code");

CREATE UNIQUE INDEX "course_sections_homeroom_class_id_grade_level_subject_id_semester_id_key" ON "course_sections"("homeroom_class_id", "grade_level_subject_id", "semester_id");
