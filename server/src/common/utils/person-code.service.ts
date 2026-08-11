import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '@/common/database/prisma.service';
import {
  entryYearYyFromDate,
  formatParentCode,
  formatStudentCode,
  formatTeacherCode,
  maxParsedSeq,
  parsePrefixedSeq,
  parseStudentSeq,
} from '@/common/utils/person-code.util';

type DbClient = Prisma.TransactionClient | PrismaService;

/**
 * Allocates sequential person codes within one school.
 * Keep one instance per import/transaction batch so counters stay contiguous.
 */
export class PersonCodeAllocator {
  private studentYy: string | null = null;
  private nextStudentSeq: number | null = null;
  private nextTeacherSeq: number | null = null;
  private nextParentSeq: number | null = null;

  constructor(private readonly db: DbClient) {}

  async prepareStudent(
    schoolId: string,
    reservedCodes: Array<string | null | undefined> = [],
  ): Promise<void> {
    this.studentYy = await this.resolveEntryYearYy(schoolId);
    const codes = await this.db.student.findMany({
      where: {
        schoolId,
        externalCode: { startsWith: `HS-${this.studentYy}` },
      },
      select: { externalCode: true },
    });
    const yy = this.studentYy;
    const parse = (code: string) => parseStudentSeq(code, yy);
    this.nextStudentSeq =
      Math.max(
        maxParsedSeq(
          codes.map((row) => row.externalCode),
          parse,
        ),
        maxParsedSeq(reservedCodes, parse),
      ) + 1;
  }

  async prepareTeacher(
    schoolId: string,
    reservedCodes: Array<string | null | undefined> = [],
  ): Promise<void> {
    const codes = await this.db.teacher.findMany({
      where: {
        schoolId,
        externalCode: { startsWith: 'GV-' },
      },
      select: { externalCode: true },
    });
    const parse = (code: string) => parsePrefixedSeq(code, 'GV');
    this.nextTeacherSeq =
      Math.max(
        maxParsedSeq(
          codes.map((row) => row.externalCode),
          parse,
        ),
        maxParsedSeq(reservedCodes, parse),
      ) + 1;
  }

  async prepareParent(
    schoolId: string,
    reservedCodes: Array<string | null | undefined> = [],
  ): Promise<void> {
    const codes = await this.db.parent.findMany({
      where: {
        schoolId,
        externalCode: { startsWith: 'PH-' },
      },
      select: { externalCode: true },
    });
    const parse = (code: string) => parsePrefixedSeq(code, 'PH');
    this.nextParentSeq =
      Math.max(
        maxParsedSeq(
          codes.map((row) => row.externalCode),
          parse,
        ),
        maxParsedSeq(reservedCodes, parse),
      ) + 1;
  }

  async nextStudentCode(schoolId: string): Promise<string> {
    if (this.nextStudentSeq === null || this.studentYy === null) {
      await this.prepareStudent(schoolId);
    }

    const code = formatStudentCode(this.studentYy!, this.nextStudentSeq!);
    this.nextStudentSeq! += 1;
    return code;
  }

  async nextTeacherCode(schoolId: string): Promise<string> {
    if (this.nextTeacherSeq === null) {
      await this.prepareTeacher(schoolId);
    }

    const code = formatTeacherCode(this.nextTeacherSeq!);
    this.nextTeacherSeq! += 1;
    return code;
  }

  async nextParentCode(schoolId: string): Promise<string> {
    if (this.nextParentSeq === null) {
      await this.prepareParent(schoolId);
    }

    const code = formatParentCode(this.nextParentSeq!);
    this.nextParentSeq! += 1;
    return code;
  }

  private async resolveEntryYearYy(schoolId: string): Promise<string> {
    const currentYear = await this.db.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { startDate: true, code: true },
    });

    if (currentYear?.startDate) {
      return entryYearYyFromDate(currentYear.startDate);
    }

    if (currentYear?.code) {
      const match = currentYear.code.match(/^(\d{4})/);
      if (match?.[1]) {
        return match[1].slice(-2);
      }
    }

    return entryYearYyFromDate(new Date());
  }
}

@Injectable()
export class PersonCodeService {
  constructor(private readonly prisma: PrismaService) {}

  createAllocator(db: DbClient = this.prisma): PersonCodeAllocator {
    return new PersonCodeAllocator(db);
  }

  nextStudentCode(schoolId: string, db?: DbClient): Promise<string> {
    return this.createAllocator(db ?? this.prisma).nextStudentCode(schoolId);
  }

  nextTeacherCode(schoolId: string, db?: DbClient): Promise<string> {
    return this.createAllocator(db ?? this.prisma).nextTeacherCode(schoolId);
  }

  nextParentCode(schoolId: string, db?: DbClient): Promise<string> {
    return this.createAllocator(db ?? this.prisma).nextParentCode(schoolId);
  }
}
