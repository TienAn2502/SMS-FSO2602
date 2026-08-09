-- CreateEnum
CREATE TYPE "SubjectEvaluationMode" AS ENUM ('NUMERIC', 'PASS_FAIL');

-- AlterTable
ALTER TABLE "grade_level_subjects"
  ADD COLUMN "evaluation_mode" "SubjectEvaluationMode" NOT NULL DEFAULT 'NUMERIC';

-- Backfill: môn đánh giá đạt/chưa đạt theo CTGDPT (THPT demo)
UPDATE "grade_level_subjects" gls
SET "evaluation_mode" = 'PASS_FAIL'
FROM "subjects" s
WHERE s.id = gls.subject_id
  AND s.code IN ('TD', 'GDQP', 'HDTN');
