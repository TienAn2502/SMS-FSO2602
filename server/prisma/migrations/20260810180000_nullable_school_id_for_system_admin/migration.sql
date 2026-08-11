-- SYSTEM_ADMIN không thuộc tenant: school_id nullable + gỡ trường ảo `platform`.

ALTER TABLE "users" ALTER COLUMN "school_id" DROP NOT NULL;

UPDATE "users"
SET "school_id" = NULL
WHERE "role" = 'SYSTEM_ADMIN';

UPDATE "users" AS u
SET "school_id" = NULL
FROM "schools" AS s
WHERE u."school_id" = s."id"
  AND s."code" = 'platform';

DELETE FROM "schools"
WHERE "code" = 'platform';
