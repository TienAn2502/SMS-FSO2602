-- Convert legacy OTHER values before narrowing enum
UPDATE "schools" SET "school_type" = 'THPT' WHERE "school_type" = 'OTHER';

ALTER TYPE "SchoolType" RENAME TO "SchoolType_old";
CREATE TYPE "SchoolType" AS ENUM ('TH', 'THCS', 'THPT');
ALTER TABLE "schools"
  ALTER COLUMN "school_type" TYPE "SchoolType"
  USING ("school_type"::text::"SchoolType");
DROP TYPE "SchoolType_old";
