import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { ImportsController } from '@/modules/imports/imports.controller';
import { HomeroomClassesImportTemplateService } from '@/modules/imports/homeroom-classes-import-template.service';
import { HomeroomClassesImportService } from '@/modules/imports/homeroom-classes-import.service';
import { ParentsImportTemplateService } from '@/modules/imports/parents-import-template.service';
import { ParentsImportService } from '@/modules/imports/parents-import.service';
import { ScoresImportTemplateService } from '@/modules/imports/scores-import-template.service';
import { ScoresImportService } from '@/modules/imports/scores-import.service';
import { StudentsImportTemplateService } from '@/modules/imports/students-import-template.service';
import { StudentsImportService } from '@/modules/imports/students-import.service';
import { TeachersImportTemplateService } from '@/modules/imports/teachers-import-template.service';
import { TeachersImportService } from '@/modules/imports/teachers-import.service';
import { TeachingAssignmentsImportTemplateService } from '@/modules/imports/teaching-assignments-import-template.service';
import { TeachingAssignmentsImportService } from '@/modules/imports/teaching-assignments-import.service';
import { ScoresModule } from '@/modules/scores/scores.module';
import { TimetableEntriesModule } from '@/modules/timetable-entries/timetable-entries.module';
import { TimetableImportService } from '@/modules/imports/timetable-import.service';

@Module({
  imports: [AuthModule, ScoresModule, TimetableEntriesModule],
  controllers: [ImportsController],
  providers: [
    StudentsImportService,
    StudentsImportTemplateService,
    TeachersImportService,
    TeachersImportTemplateService,
    ParentsImportService,
    ParentsImportTemplateService,
    HomeroomClassesImportService,
    HomeroomClassesImportTemplateService,
    TeachingAssignmentsImportService,
    TeachingAssignmentsImportTemplateService,
    TimetableImportService,
    ScoresImportService,
    ScoresImportTemplateService,
  ],
  exports: [ScoresImportService, ScoresImportTemplateService],
})
export class ImportsModule {}
