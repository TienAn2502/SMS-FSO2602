-- DropForeignKey
ALTER TABLE "homeroom_classes" DROP CONSTRAINT "homeroom_classes_homeroom_teacher_id_fkey";

-- Migrate existing user_id values to teachers.id
UPDATE "homeroom_classes" AS hc
SET "homeroom_teacher_id" = t."id"
FROM "teachers" AS t
WHERE hc."homeroom_teacher_id" = t."user_id"
  AND hc."school_id" = t."school_id";

-- Clear orphaned references (user without teacher profile)
UPDATE "homeroom_classes" AS hc
SET "homeroom_teacher_id" = NULL
WHERE hc."homeroom_teacher_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "teachers" AS t
    WHERE t."id" = hc."homeroom_teacher_id"
  );

-- AddForeignKey
ALTER TABLE "homeroom_classes" ADD CONSTRAINT "homeroom_classes_homeroom_teacher_id_fkey" FOREIGN KEY ("homeroom_teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
