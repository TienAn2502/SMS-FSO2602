import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { AttendanceExportService } from '@/modules/exports/attendance-export.service';
import { EnrollmentsExportService } from '@/modules/exports/enrollments-export.service';
import { ExportsController } from '@/modules/exports/exports.controller';
import { GradebookExportService } from '@/modules/exports/gradebook-export.service';
import { HomeroomClassesExportService } from '@/modules/exports/homeroom-classes-export.service';
import { ParentsExportService } from '@/modules/exports/parents-export.service';
import { SemesterSummariesExportService } from '@/modules/exports/semester-summaries-export.service';
import { StudentsExportService } from '@/modules/exports/students-export.service';
import { TeachersExportService } from '@/modules/exports/teachers-export.service';
import { TeachingAssignmentsExportService } from '@/modules/exports/teaching-assignments-export.service';
import { TimetableExportService } from '@/modules/exports/timetable-export.service';
import { ExportsPdfService } from '@/modules/exports/exports-pdf.service';
import { YearSummariesExportService } from '@/modules/exports/year-summaries-export.service';
import { GradebookGridModule } from '@/modules/gradebook-grid/gradebook-grid.module';
import { TimetableEntriesModule } from '@/modules/timetable-entries/timetable-entries.module';

@Module({
  imports: [AuthModule, GradebookGridModule, TimetableEntriesModule],
  controllers: [ExportsController],
  providers: [
    StudentsExportService,
    TeachersExportService,
    ParentsExportService,
    HomeroomClassesExportService,
    TeachingAssignmentsExportService,
    EnrollmentsExportService,
    GradebookExportService,
    TimetableExportService,
    SemesterSummariesExportService,
    YearSummariesExportService,
    AttendanceExportService,
    ExportsPdfService,
  ],
  exports: [GradebookExportService, TimetableExportService, ExportsPdfService],
})
export class ExportsModule {}
