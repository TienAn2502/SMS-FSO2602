-- prisma-migrate: no-transaction
ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'SEMESTER_COMPLETED';
