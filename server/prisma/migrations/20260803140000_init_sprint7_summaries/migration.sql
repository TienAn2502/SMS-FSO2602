-- CreateEnum
CREATE TYPE "TrainingResultLevel" AS ENUM ('GOOD', 'FAIR', 'SATISFACTORY', 'UNSATISFACTORY');

-- CreateEnum
CREATE TYPE "AcademicResultLevel" AS ENUM ('GOOD', 'FAIR', 'SATISFACTORY', 'UNSATISFACTORY');

-- CreateEnum
CREATE TYPE "PassFailResult" AS ENUM ('PASS', 'FAIL', 'PENDING');

-- CreateEnum
CREATE TYPE "PromotionDecision" AS ENUM ('PENDING', 'PROMOTED', 'RETAINED', 'GRADUATED');

-- CreateEnum
CREATE TYPE "SummaryStatus" AS ENUM ('DRAFT', 'CLOSED');

-- CreateTable
CREATE TABLE "student_subject_results" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_section_id" UUID NOT NULL,
    "semester_id" UUID NOT NULL,
    "evaluation_mode" "SubjectEvaluationMode" NOT NULL,
    "regular_average" DECIMAL(5,2),
    "midterm_score" DECIMAL(5,2),
    "final_score" DECIMAL(5,2),
    "semester_average" DECIMAL(5,2),
    "year_average" DECIMAL(5,2),
    "pass_fail_result" "PassFailResult",
    "computed_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "SummaryStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_subject_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_conduct_records" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "semester_id" UUID NOT NULL,
    "homeroom_class_id" UUID NOT NULL,
    "training_result_level" "TrainingResultLevel" NOT NULL,
    "note" TEXT,
    "recorded_by_teacher_id" UUID,
    "status" "SummaryStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_conduct_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_semester_summaries" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "semester_id" UUID NOT NULL,
    "homeroom_class_id" UUID NOT NULL,
    "overall_average" DECIMAL(5,2),
    "academic_result_level" "AcademicResultLevel",
    "training_result_level" "TrainingResultLevel",
    "subject_count" SMALLINT,
    "status" "SummaryStatus" NOT NULL DEFAULT 'DRAFT',
    "finalized_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_semester_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_year_summaries" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "homeroom_class_id" UUID NOT NULL,
    "overall_average" DECIMAL(5,2),
    "academic_result_level" "AcademicResultLevel",
    "training_result_level" "TrainingResultLevel",
    "promotion_decision" "PromotionDecision" NOT NULL DEFAULT 'PENDING',
    "next_homeroom_class_id" UUID,
    "note" TEXT,
    "status" "SummaryStatus" NOT NULL DEFAULT 'DRAFT',
    "finalized_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_year_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_subject_results_school_id_idx" ON "student_subject_results"("school_id");

-- CreateIndex
CREATE INDEX "student_subject_results_student_id_idx" ON "student_subject_results"("student_id");

-- CreateIndex
CREATE INDEX "student_subject_results_semester_id_idx" ON "student_subject_results"("semester_id");

-- CreateIndex
CREATE INDEX "student_subject_results_course_section_id_idx" ON "student_subject_results"("course_section_id");

-- CreateIndex
CREATE INDEX "student_subject_results_status_idx" ON "student_subject_results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "student_subject_results_student_id_course_section_id_semester_key" ON "student_subject_results"("student_id", "course_section_id", "semester_id");

-- CreateIndex
CREATE INDEX "student_conduct_records_school_id_idx" ON "student_conduct_records"("school_id");

-- CreateIndex
CREATE INDEX "student_conduct_records_homeroom_class_id_idx" ON "student_conduct_records"("homeroom_class_id");

-- CreateIndex
CREATE INDEX "student_conduct_records_semester_id_idx" ON "student_conduct_records"("semester_id");

-- CreateIndex
CREATE INDEX "student_conduct_records_status_idx" ON "student_conduct_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "student_conduct_records_student_id_semester_id_key" ON "student_conduct_records"("student_id", "semester_id");

-- CreateIndex
CREATE INDEX "student_semester_summaries_school_id_idx" ON "student_semester_summaries"("school_id");

-- CreateIndex
CREATE INDEX "student_semester_summaries_homeroom_class_id_idx" ON "student_semester_summaries"("homeroom_class_id");

-- CreateIndex
CREATE INDEX "student_semester_summaries_semester_id_idx" ON "student_semester_summaries"("semester_id");

-- CreateIndex
CREATE INDEX "student_semester_summaries_academic_result_level_idx" ON "student_semester_summaries"("academic_result_level");

-- CreateIndex
CREATE INDEX "student_semester_summaries_status_idx" ON "student_semester_summaries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "student_semester_summaries_student_id_semester_id_key" ON "student_semester_summaries"("student_id", "semester_id");

-- CreateIndex
CREATE INDEX "student_year_summaries_school_id_idx" ON "student_year_summaries"("school_id");

-- CreateIndex
CREATE INDEX "student_year_summaries_academic_year_id_idx" ON "student_year_summaries"("academic_year_id");

-- CreateIndex
CREATE INDEX "student_year_summaries_homeroom_class_id_idx" ON "student_year_summaries"("homeroom_class_id");

-- CreateIndex
CREATE INDEX "student_year_summaries_promotion_decision_idx" ON "student_year_summaries"("promotion_decision");

-- CreateIndex
CREATE INDEX "student_year_summaries_status_idx" ON "student_year_summaries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "student_year_summaries_student_id_academic_year_id_key" ON "student_year_summaries"("student_id", "academic_year_id");

-- AddForeignKey
ALTER TABLE "student_subject_results" ADD CONSTRAINT "student_subject_results_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subject_results" ADD CONSTRAINT "student_subject_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subject_results" ADD CONSTRAINT "student_subject_results_course_section_id_fkey" FOREIGN KEY ("course_section_id") REFERENCES "course_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subject_results" ADD CONSTRAINT "student_subject_results_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_conduct_records" ADD CONSTRAINT "student_conduct_records_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_conduct_records" ADD CONSTRAINT "student_conduct_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_conduct_records" ADD CONSTRAINT "student_conduct_records_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_conduct_records" ADD CONSTRAINT "student_conduct_records_homeroom_class_id_fkey" FOREIGN KEY ("homeroom_class_id") REFERENCES "homeroom_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_conduct_records" ADD CONSTRAINT "student_conduct_records_recorded_by_teacher_id_fkey" FOREIGN KEY ("recorded_by_teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_semester_summaries" ADD CONSTRAINT "student_semester_summaries_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_semester_summaries" ADD CONSTRAINT "student_semester_summaries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_semester_summaries" ADD CONSTRAINT "student_semester_summaries_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_semester_summaries" ADD CONSTRAINT "student_semester_summaries_homeroom_class_id_fkey" FOREIGN KEY ("homeroom_class_id") REFERENCES "homeroom_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_year_summaries" ADD CONSTRAINT "student_year_summaries_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_year_summaries" ADD CONSTRAINT "student_year_summaries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_year_summaries" ADD CONSTRAINT "student_year_summaries_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_year_summaries" ADD CONSTRAINT "student_year_summaries_homeroom_class_id_fkey" FOREIGN KEY ("homeroom_class_id") REFERENCES "homeroom_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_year_summaries" ADD CONSTRAINT "student_year_summaries_next_homeroom_class_id_fkey" FOREIGN KEY ("next_homeroom_class_id") REFERENCES "homeroom_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
