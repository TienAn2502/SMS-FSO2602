-- CreateEnum
CREATE TYPE "AcademicEntityStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "academic_years" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "status" "AcademicEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semesters" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "AcademicEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_levels" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,

    CONSTRAINT "grade_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "AcademicEntityStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_level_subjects" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "grade_level_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "status" "AcademicEntityStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "grade_level_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homeroom_classes" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "grade_level_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "capacity" INTEGER,
    "homeroom_teacher_id" UUID,
    "status" "AcademicEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "homeroom_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_sections" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "homeroom_class_id" UUID,
    "grade_level_subject_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "status" "AcademicEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "course_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academic_years_school_id_idx" ON "academic_years"("school_id");

-- CreateIndex
CREATE INDEX "academic_years_is_current_idx" ON "academic_years"("is_current");

-- CreateIndex
CREATE INDEX "academic_years_status_idx" ON "academic_years"("status");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_school_id_code_key" ON "academic_years"("school_id", "code");

-- CreateIndex
CREATE INDEX "semesters_school_id_idx" ON "semesters"("school_id");

-- CreateIndex
CREATE INDEX "semesters_academic_year_id_idx" ON "semesters"("academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "semesters_academic_year_id_code_key" ON "semesters"("academic_year_id", "code");

-- CreateIndex
CREATE INDEX "grade_levels_school_id_idx" ON "grade_levels"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "grade_levels_school_id_code_key" ON "grade_levels"("school_id", "code");

-- CreateIndex
CREATE INDEX "subjects_school_id_idx" ON "subjects"("school_id");

-- CreateIndex
CREATE INDEX "subjects_status_idx" ON "subjects"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_school_id_code_key" ON "subjects"("school_id", "code");

-- CreateIndex
CREATE INDEX "grade_level_subjects_school_id_idx" ON "grade_level_subjects"("school_id");

-- CreateIndex
CREATE INDEX "grade_level_subjects_grade_level_id_idx" ON "grade_level_subjects"("grade_level_id");

-- CreateIndex
CREATE INDEX "grade_level_subjects_subject_id_idx" ON "grade_level_subjects"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "grade_level_subjects_school_id_grade_level_id_subject_id_key" ON "grade_level_subjects"("school_id", "grade_level_id", "subject_id");

-- CreateIndex
CREATE INDEX "homeroom_classes_school_id_idx" ON "homeroom_classes"("school_id");

-- CreateIndex
CREATE INDEX "homeroom_classes_academic_year_id_idx" ON "homeroom_classes"("academic_year_id");

-- CreateIndex
CREATE INDEX "homeroom_classes_grade_level_id_idx" ON "homeroom_classes"("grade_level_id");

-- CreateIndex
CREATE INDEX "homeroom_classes_homeroom_teacher_id_idx" ON "homeroom_classes"("homeroom_teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "homeroom_classes_school_id_academic_year_id_code_key" ON "homeroom_classes"("school_id", "academic_year_id", "code");

-- CreateIndex
CREATE INDEX "course_sections_school_id_idx" ON "course_sections"("school_id");

-- CreateIndex
CREATE INDEX "course_sections_academic_year_id_idx" ON "course_sections"("academic_year_id");

-- CreateIndex
CREATE INDEX "course_sections_homeroom_class_id_idx" ON "course_sections"("homeroom_class_id");

-- CreateIndex
CREATE INDEX "course_sections_grade_level_subject_id_idx" ON "course_sections"("grade_level_subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_sections_school_id_academic_year_id_code_key" ON "course_sections"("school_id", "academic_year_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "course_sections_homeroom_class_id_grade_level_subject_id_key" ON "course_sections"("homeroom_class_id", "grade_level_subject_id");

-- AddForeignKey
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_levels" ADD CONSTRAINT "grade_levels_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_level_subjects" ADD CONSTRAINT "grade_level_subjects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_level_subjects" ADD CONSTRAINT "grade_level_subjects_grade_level_id_fkey" FOREIGN KEY ("grade_level_id") REFERENCES "grade_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_level_subjects" ADD CONSTRAINT "grade_level_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homeroom_classes" ADD CONSTRAINT "homeroom_classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homeroom_classes" ADD CONSTRAINT "homeroom_classes_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homeroom_classes" ADD CONSTRAINT "homeroom_classes_grade_level_id_fkey" FOREIGN KEY ("grade_level_id") REFERENCES "grade_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homeroom_classes" ADD CONSTRAINT "homeroom_classes_homeroom_teacher_id_fkey" FOREIGN KEY ("homeroom_teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_homeroom_class_id_fkey" FOREIGN KEY ("homeroom_class_id") REFERENCES "homeroom_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_grade_level_subject_id_fkey" FOREIGN KEY ("grade_level_subject_id") REFERENCES "grade_level_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
