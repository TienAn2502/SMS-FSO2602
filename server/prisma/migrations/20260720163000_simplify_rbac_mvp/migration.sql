-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SCHOOL_ADMIN', 'TEACHER', 'STUDENT');

-- AlterTable: add school_id and role to users (nullable first for data migration)
ALTER TABLE "users" ADD COLUMN "school_id" UUID;
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'STUDENT';

-- Migrate school_id from active memberships
UPDATE "users" u
SET "school_id" = sm."school_id"
FROM "school_memberships" sm
WHERE sm."user_id" = u."id"
  AND sm."status" = 'ACTIVE'
  AND u."school_id" IS NULL;

-- Migrate role: prefer SCHOOL_ADMIN > TEACHER > STUDENT
UPDATE "users" u
SET "role" = sub."mapped_role"
FROM (
  SELECT DISTINCT ON (sm."user_id")
    sm."user_id",
    CASE r."code"
      WHEN 'SCHOOL_ADMIN' THEN 'SCHOOL_ADMIN'::"UserRole"
      WHEN 'TEACHER' THEN 'TEACHER'::"UserRole"
      ELSE 'STUDENT'::"UserRole"
    END AS "mapped_role",
    CASE r."code"
      WHEN 'SCHOOL_ADMIN' THEN 1
      WHEN 'TEACHER' THEN 2
      ELSE 3
    END AS "priority"
  FROM "school_memberships" sm
  JOIN "membership_roles" mr ON mr."membership_id" = sm."id"
  JOIN "roles" r ON r."id" = mr."role_id"
  ORDER BY sm."user_id", "priority"
) sub
WHERE u."id" = sub."user_id";

-- Remove users without a school (orphans from old model)
DELETE FROM "users" WHERE "school_id" IS NULL;

-- Make school_id required
ALTER TABLE "users" ALTER COLUMN "school_id" SET NOT NULL;

-- Drop old RBAC / membership tables
DROP TABLE "membership_roles";
DROP TABLE "role_permissions";
DROP TABLE "school_memberships";
DROP TABLE "roles";
DROP TABLE "permissions";

-- DropEnum
DROP TYPE "MembershipStatus";

-- CreateIndex
CREATE INDEX "users_school_id_idx" ON "users"("school_id");
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
