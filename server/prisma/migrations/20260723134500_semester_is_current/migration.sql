-- AlterTable
ALTER TABLE "semesters" ADD COLUMN "is_current" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "semesters_is_current_idx" ON "semesters"("is_current");
