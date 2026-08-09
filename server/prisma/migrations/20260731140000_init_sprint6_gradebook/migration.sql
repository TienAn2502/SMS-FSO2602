-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('ORAL', 'QUIZ_15', 'TEST_45', 'MIDTERM', 'FINAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "semester_id" UUID NOT NULL,
    "course_section_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "assessment_date" DATE NOT NULL,
    "max_score" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "weight" DECIMAL(5,2),
    "status" "AssessmentStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "score" DECIMAL(5,2),
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessments_school_id_idx" ON "assessments"("school_id");

-- CreateIndex
CREATE INDEX "assessments_semester_id_idx" ON "assessments"("semester_id");

-- CreateIndex
CREATE INDEX "assessments_course_section_id_idx" ON "assessments"("course_section_id");

-- CreateIndex
CREATE INDEX "assessments_teacher_id_idx" ON "assessments"("teacher_id");

-- CreateIndex
CREATE INDEX "assessments_assessment_date_idx" ON "assessments"("assessment_date");

-- CreateIndex
CREATE INDEX "assessments_type_idx" ON "assessments"("type");

-- CreateIndex
CREATE INDEX "assessments_status_idx" ON "assessments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_course_section_id_assessment_date_type_name_key" ON "assessments"("course_section_id", "assessment_date", "type", "name");

-- CreateIndex
CREATE INDEX "scores_school_id_idx" ON "scores"("school_id");

-- CreateIndex
CREATE INDEX "scores_assessment_id_idx" ON "scores"("assessment_id");

-- CreateIndex
CREATE INDEX "scores_student_id_idx" ON "scores"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "scores_assessment_id_student_id_key" ON "scores"("assessment_id", "student_id");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_course_section_id_fkey" FOREIGN KEY ("course_section_id") REFERENCES "course_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
