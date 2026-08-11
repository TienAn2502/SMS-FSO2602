-- AlterTable
ALTER TABLE "teachers" ADD COLUMN "external_code" VARCHAR(50);

-- AlterTable
ALTER TABLE "parents" ADD COLUMN "external_code" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "teachers_school_id_external_code_key" ON "teachers"("school_id", "external_code");

-- CreateIndex
CREATE INDEX "teachers_external_code_idx" ON "teachers"("external_code");

-- CreateIndex
CREATE UNIQUE INDEX "parents_school_id_external_code_key" ON "parents"("school_id", "external_code");

-- CreateIndex
CREATE INDEX "parents_external_code_idx" ON "parents"("external_code");

-- Backfill existing teachers: GV-1, GV-2, ...
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY school_id ORDER BY id) AS rn
  FROM "teachers"
  WHERE "external_code" IS NULL
)
UPDATE "teachers" AS t
SET "external_code" = 'GV-' || numbered.rn::text
FROM numbered
WHERE t.id = numbered.id;

-- Backfill existing parents: PH-1, PH-2, ...
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY school_id ORDER BY id) AS rn
  FROM "parents"
  WHERE "external_code" IS NULL
)
UPDATE "parents" AS p
SET "external_code" = 'PH-' || numbered.rn::text
FROM numbered
WHERE p.id = numbered.id;

-- Backfill existing students without code: HS-{YY}{n} from created_at year
WITH numbered AS (
  SELECT
    id,
    TO_CHAR("created_at" AT TIME ZONE 'UTC', 'YY') AS yy,
    ROW_NUMBER() OVER (
      PARTITION BY school_id, TO_CHAR("created_at" AT TIME ZONE 'UTC', 'YY')
      ORDER BY "created_at", id
    ) AS rn
  FROM "students"
  WHERE "external_code" IS NULL
)
UPDATE "students" AS s
SET "external_code" = 'HS-' || numbered.yy || numbered.rn::text
FROM numbered
WHERE s.id = numbered.id;
