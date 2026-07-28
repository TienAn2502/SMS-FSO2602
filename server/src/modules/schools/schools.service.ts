import { HttpStatus, Injectable } from '@nestjs/common';
import { FilePurpose } from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../common/database/prisma.service';
import { FilesService } from '../files/files.service';
import { toSchoolResponse, type SchoolResponse } from './mappers/school.mapper';
import type { UpdateSchoolInput } from './schemas/update-school.schema';

@Injectable()
export class SchoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async getCurrent(schoolId: string): Promise<SchoolResponse> {
    const school = await this.findSchoolInTenant(schoolId);
    return toSchoolResponse(school);
  }

  async updateCurrent(
    schoolId: string,
    input: UpdateSchoolInput,
  ): Promise<SchoolResponse> {
    await this.findSchoolInTenant(schoolId);

    if (input.logoFileId) {
      await this.filesService.assertFileInTenant(
        schoolId,
        input.logoFileId,
        FilePurpose.SCHOOL_LOGO,
      );
    }

    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data: input,
    });

    return toSchoolResponse(school);
  }

  private async findSchoolInTenant(schoolId: string) {
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId },
    });

    if (!school) {
      throw new AppException(
        'SCHOOL_NOT_FOUND',
        'Không tìm thấy trường',
        HttpStatus.NOT_FOUND,
      );
    }

    return school;
  }
}
