import { Module } from '@nestjs/common';

import { HomeroomClassesModule } from '@/modules/homeroom-classes/homeroom-classes.module';
import { SemestersModule } from '@/modules/semesters/semesters.module';
import { StudentsModule } from '@/modules/students/students.module';
import { StudentEnrollmentsByStudentController } from '@/modules/student-enrollments/student-enrollments-by-student.controller';
import { StudentEnrollmentsController } from '@/modules/student-enrollments/student-enrollments.controller';
import { StudentEnrollmentsService } from '@/modules/student-enrollments/student-enrollments.service';

@Module({
  imports: [StudentsModule, SemestersModule, HomeroomClassesModule],
  controllers: [
    StudentEnrollmentsController,
    StudentEnrollmentsByStudentController,
  ],
  providers: [StudentEnrollmentsService],
  exports: [StudentEnrollmentsService],
})
export class StudentEnrollmentsModule {}
