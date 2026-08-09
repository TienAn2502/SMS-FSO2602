-- Chạy thủ công nếu migrate vẫn thiếu enum (Neon SQL editor / psql)
ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'SEMESTER_COMPLETED';
