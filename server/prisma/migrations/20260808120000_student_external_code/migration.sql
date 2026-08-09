-- AlterTable
ALTER TABLE "students" ADD COLUMN "external_code" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "students_school_id_external_code_key" ON "students"("school_id", "external_code");

-- CreateIndex
CREATE INDEX "students_external_code_idx" ON "students"("external_code");
