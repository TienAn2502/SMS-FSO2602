import { HttpStatus, Injectable } from '@nestjs/common';
import { AcademicEntityStatus, EnrollmentStatus } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { CourseSectionsService } from '@/modules/course-sections/course-sections.service';
import { SemestersService } from '@/modules/semesters/semesters.service';
import type { PrepareSemesterFromSourceInput } from '@/modules/semester-preparation/schemas/semester-preparation.schema';
import { StudentEnrollmentsService } from '@/modules/student-enrollments/student-enrollments.service';
import { TeachingAssignmentsService } from '@/modules/teaching-assignments/teaching-assignments.service';

export interface SemesterPreparationCounts {
  enrollments: number;
  courseSections: number;
  teachingAssignments: number;
}

export interface SemesterPreparationStatus {
  sourceSemesterId: string;
  sourceSemesterCode: string;
  targetSemesterId: string;
  targetSemesterCode: string;
  source: SemesterPreparationCounts;
  target: SemesterPreparationCounts;
  enrollmentsReady: boolean;
  courseSectionsReady: boolean;
  teachingAssignmentsReady: boolean;
  isComplete: boolean;
}

@Injectable()
export class SemesterPreparationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly semestersService: SemestersService,
    private readonly studentEnrollmentsService: StudentEnrollmentsService,
    private readonly courseSectionsService: CourseSectionsService,
    private readonly teachingAssignmentsService: TeachingAssignmentsService,
  ) {}

  async getStatus(
    schoolId: string,
    academicYearId: string,
    targetSemesterId: string,
    sourceSemesterId: string,
  ): Promise<SemesterPreparationStatus> {
    await this.assertSemesterPair(
      schoolId,
      academicYearId,
      sourceSemesterId,
      targetSemesterId,
    );

    const [source, target] = await Promise.all([
      this.countPreparationEntities(schoolId, sourceSemesterId),
      this.countPreparationEntities(schoolId, targetSemesterId, {
        activeEnrollmentsOnly: true,
      }),
    ]);

    const enrollmentsReady =
      source.enrollments === 0
        ? target.enrollments > 0
        : target.enrollments >= source.enrollments;
    const courseSectionsReady =
      source.courseSections === 0
        ? target.courseSections > 0
        : target.courseSections >= source.courseSections;
    const teachingAssignmentsReady =
      source.teachingAssignments === 0
        ? target.teachingAssignments > 0
        : target.teachingAssignments >= source.teachingAssignments;

    const sourceSemester = await this.semestersService.findSemesterInTenantById(
      schoolId,
      sourceSemesterId,
    );
    const targetSemester = await this.semestersService.findSemesterInTenantById(
      schoolId,
      targetSemesterId,
    );

    return {
      sourceSemesterId,
      sourceSemesterCode: sourceSemester.code,
      targetSemesterId,
      targetSemesterCode: targetSemester.code,
      source,
      target,
      enrollmentsReady,
      courseSectionsReady,
      teachingAssignmentsReady,
      isComplete:
        enrollmentsReady && courseSectionsReady && teachingAssignmentsReady,
    };
  }

  async prepareFromSource(
    schoolId: string,
    academicYearId: string,
    targetSemesterId: string,
    input: PrepareSemesterFromSourceInput,
  ) {
    await this.assertSemesterPair(
      schoolId,
      academicYearId,
      input.sourceSemesterId,
      targetSemesterId,
    );

    const copyInput = {
      sourceSemesterId: input.sourceSemesterId,
      targetSemesterId,
    };

    const courseSections = await this.courseSectionsService.copyFromSemester(
      schoolId,
      copyInput,
    );

    const enrollments = await this.studentEnrollmentsService.copyFromSemester(
      schoolId,
      {
        ...copyInput,
        closeSourceSemester: input.closeSourceSemester,
      },
    );

    const teachingAssignments =
      await this.teachingAssignmentsService.copyFromSemester(
        schoolId,
        copyInput,
      );

    const status = await this.getStatus(
      schoolId,
      academicYearId,
      targetSemesterId,
      input.sourceSemesterId,
    );

    return {
      courseSections,
      enrollments,
      teachingAssignments,
      status,
    };
  }

  private async assertSemesterPair(
    schoolId: string,
    academicYearId: string,
    sourceSemesterId: string,
    targetSemesterId: string,
  ): Promise<void> {
    if (sourceSemesterId === targetSemesterId) {
      throw new AppException(
        'SEMESTER_PREP_SAME_SEMESTER',
        'Học kỳ nguồn và học kỳ đích phải khác nhau',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const [sourceSemester, targetSemester] = await Promise.all([
      this.semestersService.findSemesterInTenantById(schoolId, sourceSemesterId),
      this.semestersService.findSemesterInTenantById(schoolId, targetSemesterId),
    ]);

    if (
      sourceSemester.academicYearId !== academicYearId ||
      targetSemester.academicYearId !== academicYearId
    ) {
      throw new AppException(
        'SEMESTER_PREP_YEAR_MISMATCH',
        'Hai học kỳ phải thuộc năm học đang chọn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async countPreparationEntities(
    schoolId: string,
    semesterId: string,
    options?: { activeEnrollmentsOnly?: boolean },
  ): Promise<SemesterPreparationCounts> {
    const [enrollments, courseSections, teachingAssignments] =
      await Promise.all([
        this.prisma.studentEnrollment.count({
          where: {
            schoolId,
            semesterId,
            status: options?.activeEnrollmentsOnly
              ? EnrollmentStatus.ACTIVE
              : {
                  in: [
                    EnrollmentStatus.ACTIVE,
                    EnrollmentStatus.SEMESTER_COMPLETED,
                  ],
                },
          },
        }),
        this.prisma.courseSection.count({
          where: {
            schoolId,
            semesterId,
            status: AcademicEntityStatus.ACTIVE,
          },
        }),
        this.prisma.teachingAssignment.count({
          where: {
            schoolId,
            status: AcademicEntityStatus.ACTIVE,
            courseSection: {
              semesterId,
              status: AcademicEntityStatus.ACTIVE,
            },
          },
        }),
      ]);

    return {
      enrollments,
      courseSections,
      teachingAssignments,
    };
  }
}
