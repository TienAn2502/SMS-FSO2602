-- CreateEnum
CREATE TYPE "ParentRelationship" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'OTHER');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PARENT';

-- CreateTable
CREATE TABLE "teachers" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "user_id" UUID,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(11),
    "avatar_field_id" UUID,
    "specialization" VARCHAR(255),
    "date_of_birth" DATE,
    "gender" "Gender",
    "address" TEXT,
    "status" "AcademicEntityStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teaching_assignments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "course_section_id" UUID NOT NULL,
    "assign_at" DATE NOT NULL,
    "end_at" DATE,
    "status" "AcademicEntityStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "teaching_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_entries" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "semester_id" UUID NOT NULL,
    "course_section_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "period_number" SMALLINT NOT NULL,
    "room" VARCHAR(255),
    "status" "AcademicEntityStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "timetable_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "user_id" UUID,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(11),
    "status" "AcademicEntityStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_parents" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "relationship" "ParentRelationship" NOT NULL,
    "is_primary_contact" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "student_parents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teachers_school_id_idx" ON "teachers"("school_id");

-- CreateIndex
CREATE INDEX "teachers_user_id_idx" ON "teachers"("user_id");

-- CreateIndex
CREATE INDEX "teachers_status_idx" ON "teachers"("status");

-- CreateIndex
CREATE INDEX "teachers_full_name_idx" ON "teachers"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_school_id_user_id_key" ON "teachers"("school_id", "user_id");

-- CreateIndex
CREATE INDEX "teaching_assignments_school_id_idx" ON "teaching_assignments"("school_id");

-- CreateIndex
CREATE INDEX "teaching_assignments_teacher_id_idx" ON "teaching_assignments"("teacher_id");

-- CreateIndex
CREATE INDEX "teaching_assignments_course_section_id_idx" ON "teaching_assignments"("course_section_id");

-- CreateIndex
CREATE INDEX "teaching_assignments_status_idx" ON "teaching_assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "teaching_assignments_teacher_id_course_section_id_key" ON "teaching_assignments"("teacher_id", "course_section_id");

-- CreateIndex
CREATE INDEX "timetable_entries_school_id_idx" ON "timetable_entries"("school_id");

-- CreateIndex
CREATE INDEX "timetable_entries_semester_id_idx" ON "timetable_entries"("semester_id");

-- CreateIndex
CREATE INDEX "timetable_entries_course_section_id_idx" ON "timetable_entries"("course_section_id");

-- CreateIndex
CREATE INDEX "timetable_entries_teacher_id_idx" ON "timetable_entries"("teacher_id");

-- CreateIndex
CREATE INDEX "timetable_entries_day_of_week_idx" ON "timetable_entries"("day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_entries_course_section_id_day_of_week_period_number_key" ON "timetable_entries"("course_section_id", "day_of_week", "period_number");

-- CreateIndex
CREATE INDEX "parents_school_id_idx" ON "parents"("school_id");

-- CreateIndex
CREATE INDEX "parents_user_id_idx" ON "parents"("user_id");

-- CreateIndex
CREATE INDEX "parents_status_idx" ON "parents"("status");

-- CreateIndex
CREATE INDEX "parents_full_name_idx" ON "parents"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "parents_school_id_user_id_key" ON "parents"("school_id", "user_id");

-- CreateIndex
CREATE INDEX "student_parents_school_id_idx" ON "student_parents"("school_id");

-- CreateIndex
CREATE INDEX "student_parents_parent_id_idx" ON "student_parents"("parent_id");

-- CreateIndex
CREATE INDEX "student_parents_student_id_idx" ON "student_parents"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_parents_parent_id_student_id_key" ON "student_parents"("parent_id", "student_id");

-- AddCheckConstraint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_day_of_week_check" CHECK ("day_of_week" >= 1 AND "day_of_week" <= 7);

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_avatar_field_id_fkey" FOREIGN KEY ("avatar_field_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_course_section_id_fkey" FOREIGN KEY ("course_section_id") REFERENCES "course_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_course_section_id_fkey" FOREIGN KEY ("course_section_id") REFERENCES "course_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
