import { Module } from '@nestjs/common';

import { HomeroomClassesModule } from '../homeroom-classes/homeroom-classes.module';
import { SemestersModule } from '../semesters/semesters.module';
import { StudentsModule } from '../students/students.module';
import { StudentEnrollmentsByStudentController } from './student-enrollments-by-student.controller';
import { StudentEnrollmentsController } from './student-enrollments.controller';
import { StudentEnrollmentsService } from './student-enrollments.service';

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
