-- Replace AssessmentType with REGULAR | MIDTERM | FINAL

CREATE TYPE "AssessmentType_new" AS ENUM ('REGULAR', 'MIDTERM', 'FINAL');

ALTER TABLE "assessments"
  ALTER COLUMN "type" TYPE "AssessmentType_new"
  USING (
    CASE "type"::text
      WHEN 'MIDTERM' THEN 'MIDTERM'::"AssessmentType_new"
      WHEN 'FINAL' THEN 'FINAL'::"AssessmentType_new"
      ELSE 'REGULAR'::"AssessmentType_new"
    END
  );

DROP TYPE "AssessmentType";

ALTER TYPE "AssessmentType_new" RENAME TO "AssessmentType";
