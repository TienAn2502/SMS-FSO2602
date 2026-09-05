import { HttpStatus, Injectable } from '@nestjs/common';
import { SchoolStatus, UserRole } from '@prisma/client';
import type { Response } from 'express';

import { CookieService } from '@/common/auth/cookie.service';
import { JwtTokenService } from '@/common/auth/jwt-token.service';
import type {
  AccessTokenPayload,
  AuthSessionData,
  AuthenticatedUser,
  RefreshTokenPayload,
  UserSocketInfo,
  StudentSocketInfo,
  ParentSocketInfo,
  TeacherSocketInfo,
  SchoolAdminSocketInfo,
  NotificationRoom,
} from '@/common/auth/auth.types';
import { isImpersonating } from '@/common/auth/impersonation.util';
import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { PasswordService } from '@/common/utils/password.service';
import type { ChangePasswordInput } from '@/modules/auth/schemas/change-password.schema';
import type { LoginInput } from '@/modules/auth/schemas/login.schema';
import {
  buildAuthSessionForUser,
  toAuthSessionData,
} from '@/modules/auth/mappers/auth.mapper';
import {
  buildPhoneLookupVariants,
  looksLikeEmail,
  looksLikePersonCode,
  looksLikePhone,
} from '@/modules/auth/utils/login-identifier.util';
import { RedisService } from '@/common/database/redis.service';
import { UaService } from '@/modules/device-session/ua.service';
import { DeviceSessionService } from '@/modules/device-session/device-session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly cookieService: CookieService,
    private readonly redisService: RedisService,
    private readonly uaService: UaService,
    private readonly deviceSession: DeviceSessionService,
  ) {}

  async login(
    input: LoginInput & { ipAddress: string; userAgent: string },
    response: Response,
  ): Promise<AuthSessionData> {
    const user = await this.resolveUserByLoginIdentifier(input.identifier);

    if (!user) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Mã / SĐT / email hoặc mật khẩu không đúng',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new AppException(
        'ACCOUNT_INACTIVE',
        'Tài khoản đã bị khóa hoặc không hoạt động',
        HttpStatus.FORBIDDEN,
      );
    }

    this.assertSchoolActiveForLogin(user.role, user.school?.status);

    const passwordValid = await this.passwordService.verify(
      input.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        'Mã / SĐT / email hoặc mật khẩu không đúng',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // device session
    const userAgent = this.uaService.parse(input.userAgent);
    console.log('userAgent', userAgent);

    const deviceSession = await this.deviceSession.create({
      userId: user.id,
      deviceId: input.deviceId,
      ipAddress: input.ipAddress,
      browser: userAgent.browser ?? 'Unknown',
      os: userAgent.os ?? 'Unknown',
      deviceType: userAgent.deviceType ?? undefined,
      deviceVendor: userAgent.deviceVendor ?? undefined,
      deviceModel: userAgent.deviceModel ?? undefined,
    });

    await this.redisService.addUserToWhiteList(
      deviceSession.sessionId,
      user.id,
    );

    const socketInfo = await this.buildSocketInfoByRole(
      user.role,
      user.id,
      user.schoolId!,
    );

    // Lưu userId vào room trong redis
    if (socketInfo && Object.keys(socketInfo).length > 0) {
      for (const room of socketInfo.notificationRooms) {
        await this.redisService.addUserToRoom(room.room, user.id);
      }
    }

    this.issueTokens(
      response,
      user.id,
      deviceSession.sessionId,
      deviceSession.deviceId,
      user.schoolId ?? undefined,
    );
    return toAuthSessionData(
      user,
      user.school,
      null,
      socketInfo,
      deviceSession.sessionId,
      deviceSession.deviceId,
    );
  }

  async refresh(
    refreshToken: string | undefined,
    currentAccessToken: string | undefined,
    response: Response,
  ): Promise<AuthSessionData> {
    if (!refreshToken) {
      throw new AppException(
        'SESSION_EXPIRED',
        'Phiên đăng nhập đã hết hạn',
        HttpStatus.UNAUTHORIZED,
      );
    }

    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtTokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new AppException(
        'SESSION_EXPIRED',
        'Phiên đăng nhập đã hết hạn',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isSessionStillAvailable = await this.prisma.deviceSession.findUnique({
      where: { id: payload.sessionId },
    });

    if (!isSessionStillAvailable) {
      throw new AppException(
        'SESSION_EXPIRED',
        'Phiên đăng nhập đã hết hạn',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { school: true },
    });

    if (!user) {
      throw new AppException(
        'UNAUTHORIZED',
        'Tài khoản không tồn tại',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new AppException(
        'ACCOUNT_INACTIVE',
        'Tài khoản đã bị khóa hoặc không hoạt động',
        HttpStatus.FORBIDDEN,
      );
    }
    await this.redisService.addUserToWhiteList(payload.sessionId, payload.sub);
    const newExpiredAt = new Date();
    newExpiredAt.setDate(newExpiredAt.getDate() + 7);
    await this.prisma.deviceSession.update({
      where: { id: payload.sessionId },
      data: {
        expiredAt: newExpiredAt,
        updatedAt: new Date(),
      },
    });

    this.assertSchoolActiveForLogin(user.role, user.school?.status);

    const preservedAccessPayload =
      this.decodeAccessTokenPayload(currentAccessToken);
    const preservingImpersonation =
      preservedAccessPayload?.sub === user.id &&
      preservedAccessPayload.impersonatedBy === user.id &&
      Boolean(preservedAccessPayload.activeSchoolId);

    const activeSchoolId = preservingImpersonation
      ? preservedAccessPayload.activeSchoolId
      : (user.schoolId ?? undefined);

    this.issueTokens(
      response,
      user.id,
      payload.sessionId,
      payload.deviceId,
      activeSchoolId,
      preservingImpersonation
        ? {
            impersonatedBy: preservedAccessPayload.impersonatedBy,
            impersonationMode: preservedAccessPayload.impersonationMode,
          }
        : undefined,
    );

    const sessionUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      schoolId: user.schoolId,
      activeSchoolId: activeSchoolId ?? '',
      impersonatedBy: preservingImpersonation
        ? preservedAccessPayload.impersonatedBy
        : undefined,
      impersonationMode: preservingImpersonation
        ? preservedAccessPayload.impersonationMode
        : undefined,
      sessionId: payload.sessionId,
      deviceId: payload.deviceId,
    };

    return buildAuthSessionForUser(this.prisma, user, sessionUser);
  }

  async logout(response: Response, accessToken: string): Promise<void> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtTokenService.verifyAccessToken(accessToken);
    } catch {
      throw new AppException(
        'SESSION_EXPIRED',
        'Phiên đăng nhập đã hết hạn',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // clear device
    await Promise.all([
      this.prisma.deviceSession.delete({
        where: { id: payload.sessionId },
      }),
      this.redisService.deleteOneSessionFromWhitelist(payload.sessionId),
    ]);

    this.cookieService.clearAuthCookies(response);
  }

  async getMe(
    sessionUser: AuthenticatedUser,
    sessionId: string,
    deviceId: string,
  ): Promise<AuthSessionData> {
    const user = await this.prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: { school: true },
    });

    if (!user) {
      throw new AppException(
        'UNAUTHORIZED',
        'Tài khoản không tồn tại',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new AppException(
        'ACCOUNT_INACTIVE',
        'Tài khoản đã bị khóa hoặc không hoạt động',
        HttpStatus.FORBIDDEN,
      );
    }

    // Lấy ra các room socket info theo role
    const socketInfo = await this.buildSocketInfoByRole(
      user.role,
      user.id,
      user.schoolId!,
    );
    return buildAuthSessionForUser(
      this.prisma,
      user,
      {
        ...sessionUser,
        sessionId: sessionId,
        deviceId: deviceId,
      },
      socketInfo,
    );
  }

  async changePassword(
    sessionUser: AuthenticatedUser,
    input: ChangePasswordInput,
  ): Promise<void> {
    if (isImpersonating(sessionUser)) {
      throw new AppException(
        'IMPERSONATION_FORBIDDEN',
        'Không thể đổi mật khẩu khi đang đăng nhập thay',
        HttpStatus.FORBIDDEN,
      );
    }

    const allowedRoles: UserRole[] = [
      UserRole.SCHOOL_ADMIN,
      UserRole.TEACHER,
      UserRole.STUDENT,
    ];

    if (!allowedRoles.includes(sessionUser.role)) {
      throw new AppException(
        'FORBIDDEN',
        'Bạn không có quyền thực hiện thao tác này',
        HttpStatus.FORBIDDEN,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: sessionUser.id },
    });

    if (!user) {
      throw new AppException(
        'UNAUTHORIZED',
        'Tài khoản không tồn tại',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new AppException(
        'ACCOUNT_INACTIVE',
        'Tài khoản đã bị khóa hoặc không hoạt động',
        HttpStatus.FORBIDDEN,
      );
    }

    const currentValid = await this.passwordService.verify(
      input.currentPassword,
      user.passwordHash,
    );

    if (!currentValid) {
      throw new AppException(
        'INVALID_CURRENT_PASSWORD',
        'Mật khẩu hiện tại không đúng',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordHash = await this.passwordService.hash(input.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  }

  private issueTokens(
    response: Response,
    userId: string,
    sessionId: string,
    deviceId: string,
    activeSchoolId?: string,
    impersonation?: Pick<
      AccessTokenPayload,
      'impersonatedBy' | 'impersonationMode'
    >,
  ): void {
    const accessToken = this.jwtTokenService.signAccessToken({
      sub: userId,
      ...(activeSchoolId ? { activeSchoolId } : {}),
      ...(impersonation?.impersonatedBy
        ? {
            impersonatedBy: impersonation.impersonatedBy,
            impersonationMode: impersonation.impersonationMode ?? 'read_only',
          }
        : {}),
      sessionId,
      deviceId,
    });
    const refreshToken = this.jwtTokenService.signRefreshToken({
      sub: userId,
      sessionId,
      deviceId,
    });

    this.cookieService.setAuthCookies(response, accessToken, refreshToken);
  }

  private decodeAccessTokenPayload(
    token: string | undefined,
  ): AccessTokenPayload | null {
    if (!token) {
      return null;
    }

    try {
      return this.jwtTokenService.verifyAccessToken(token);
    } catch {
      return this.jwtTokenService.decodeAccessToken(token);
    }
  }

  /**
   * Resolve user từ email / mã HS|GV|PH / SĐT hồ sơ.
   * Mã & SĐT chỉ khớp hồ sơ đã gắn tài khoản (userId).
   */
  private async resolveUserByLoginIdentifier(identifier: string) {
    const value = identifier.trim();
    if (!value) {
      return null;
    }

    if (looksLikeEmail(value)) {
      return this.prisma.user.findUnique({
        where: { email: value.toLowerCase() },
        include: { school: true },
      });
    }

    const userIds = new Set<string>();

    const tryCode = looksLikePersonCode(value) || !looksLikePhone(value);
    const tryPhone = looksLikePhone(value) || !looksLikePersonCode(value);

    if (tryCode) {
      for (const id of await this.findUserIdsByPersonCode(value)) {
        userIds.add(id);
      }
    }

    if (tryPhone) {
      for (const id of await this.findUserIdsByPhone(value)) {
        userIds.add(id);
      }
    }

    if (userIds.size === 0) {
      return null;
    }

    if (userIds.size > 1) {
      throw new AppException(
        'LOGIN_AMBIGUOUS',
        'Có nhiều tài khoản khớp thông tin đăng nhập. Dùng mã HS/GV/PH hoặc liên hệ nhà trường.',
        HttpStatus.CONFLICT,
      );
    }

    const userId = [...userIds][0];
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { school: true },
    });
  }

  private async findUserIdsByPersonCode(rawCode: string): Promise<string[]> {
    const code = rawCode.trim();
    const [students, teachers, parents] = await Promise.all([
      this.prisma.student.findMany({
        where: {
          userId: { not: null },
          externalCode: { equals: code, mode: 'insensitive' },
        },
        select: { userId: true },
      }),
      this.prisma.teacher.findMany({
        where: {
          userId: { not: null },
          externalCode: { equals: code, mode: 'insensitive' },
        },
        select: { userId: true },
      }),
      this.prisma.parent.findMany({
        where: {
          userId: { not: null },
          externalCode: { equals: code, mode: 'insensitive' },
        },
        select: { userId: true },
      }),
    ]);

    return [
      ...students.map((row) => row.userId),
      ...teachers.map((row) => row.userId),
      ...parents.map((row) => row.userId),
    ].filter((id): id is string => Boolean(id));
  }

  private async findUserIdsByPhone(rawPhone: string): Promise<string[]> {
    const variants = buildPhoneLookupVariants(rawPhone);
    if (variants.length === 0) {
      return [];
    }

    const [students, teachers, parents] = await Promise.all([
      this.prisma.student.findMany({
        where: {
          userId: { not: null },
          phone: { in: variants },
        },
        select: { userId: true },
      }),
      this.prisma.teacher.findMany({
        where: {
          userId: { not: null },
          phone: { in: variants },
        },
        select: { userId: true },
      }),
      this.prisma.parent.findMany({
        where: {
          userId: { not: null },
          phone: { in: variants },
        },
        select: { userId: true },
      }),
    ]);

    return [
      ...students.map((row) => row.userId),
      ...teachers.map((row) => row.userId),
      ...parents.map((row) => row.userId),
    ].filter((id): id is string => Boolean(id));
  }

  private assertSchoolActiveForLogin(
    role: UserRole,
    schoolStatus: string | undefined,
  ): void {
    if (role === UserRole.SYSTEM_ADMIN) {
      return;
    }

    if (!schoolStatus || schoolStatus !== SchoolStatus.ACTIVE) {
      throw new AppException(
        'SCHOOL_SUSPENDED',
        'Trường đang bị tạm khóa. Vui lòng liên hệ quản trị nền tảng.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  // ============================================================
  // Socket Info Builders
  // ============================================================

  /**
   * HS: school, student:{id}, grade:{gradeLevelId}, homeroom:{homeroomClassId}, course:{courseSectionId}
   */
  private async buildStudentSocketInfo(
    userId: string,
    schoolId: string,
  ): Promise<StudentSocketInfo> {
    // Lấy thông tin school để hiển thị
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, shortName: true },
    });

    const currentSemester = await this.prisma.semester.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    });

    const rooms: NotificationRoom[] = [
      {
        room: `school:${schoolId}`,
        display: school?.shortName || school?.name || 'Trường',
      },
    ];

    // Room student:{id}
    const student = await this.prisma.student.findFirst({
      where: { userId },
      select: { id: true, fullName: true },
    });
    if (student) {
      rooms.push({
        room: `student:${student.id}`,
        display: student.fullName || 'Học sinh',
      });
    }

    if (!currentSemester) {
      return { notificationRooms: rooms };
    }

    // Room grade:{gradeLevelId}, homeroom:{homeroomClassId}, course:{courseSectionId}
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        student: { userId },
        semesterId: currentSemester.id,
        status: 'ACTIVE',
      },
      select: {
        homeroomClass: {
          select: {
            id: true,
            name: true,
            gradeLevelId: true,
            gradeLevel: { select: { name: true, code: true } },
          },
        },
      },
    });

    const seenGrades = new Set<string>();
    const seenHomerooms = new Set<string>();

    for (const enrollment of enrollments) {
      const gradeKey = enrollment.homeroomClass.gradeLevelId;
      if (!seenGrades.has(gradeKey)) {
        seenGrades.add(gradeKey);
        const gl = enrollment.homeroomClass.gradeLevel;
        rooms.push({
          room: `grade:${gradeKey}`,
          display: `${gl.name} (${gl.code})`,
        });
      }

      if (!seenHomerooms.has(enrollment.homeroomClass.id)) {
        seenHomerooms.add(enrollment.homeroomClass.id);
        rooms.push({
          room: `homeroom:${enrollment.homeroomClass.id}`,
          display: enrollment.homeroomClass.name,
        });
      }
    }

    // Lấy các courseSection của student (qua studentSubjectResults)
    const courseSections = await this.prisma.studentSubjectResult.findMany({
      where: {
        student: { userId },
        semesterId: currentSemester.id,
      },
      select: { courseSection: { select: { id: true, name: true } } },
      distinct: ['courseSectionId'],
    });

    for (const cs of courseSections) {
      rooms.push({
        room: `course:${cs.courseSection.id}`,
        display: cs.courseSection.name,
      });
    }

    return { notificationRooms: rooms };
  }

  /**
   * PH: school, parent:{id}, student:{studentId}, grade:{gradeLevelId}, homeroom:{homeroomClassId}, course:{courseSectionId}
   */
  private async buildParentSocketInfo(
    userId: string,
    schoolId: string,
  ): Promise<ParentSocketInfo> {
    // Lấy thông tin school để hiển thị
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, shortName: true },
    });

    const currentSemester = await this.prisma.semester.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    });

    const rooms: NotificationRoom[] = [
      {
        room: `school:${schoolId}`,
        display: school?.shortName || school?.name || 'Trường',
      },
      // { room: `school:${schoolId}:parent`, display: 'Tất cả phụ huynh' },
    ];

    // Room parent:{id}
    const parent = await this.prisma.parent.findFirst({
      where: { userId },
      select: { id: true, fullName: true },
    });
    if (parent) {
      rooms.push({
        room: `parent:${parent.id}`,
        display: parent.fullName || 'Phụ huynh',
      });
    }

    // Room student:{studentId} của các con
    const studentParents = await this.prisma.studentParent.findMany({
      where: { parent: { userId } },
      select: { studentId: true, student: { select: { fullName: true } } },
    });

    const seenStudents = new Set<string>();
    const seenGrades = new Set<string>();
    const seenHomerooms = new Set<string>();

    for (const sp of studentParents) {
      if (!seenStudents.has(sp.studentId)) {
        seenStudents.add(sp.studentId);
        rooms.push({
          room: `student:${sp.studentId}`,
          display: sp.student.fullName || 'Học sinh',
        });
      }
    }

    if (!currentSemester) {
      return { notificationRooms: rooms };
    }

    // Lấy gradeLevelId, homeroomClassId của các con trong học kỳ hiện tại
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        studentId: { in: studentParents.map((sp) => sp.studentId) },
        semesterId: currentSemester.id,
        status: 'ACTIVE',
      },
      select: {
        homeroomClass: {
          select: {
            id: true,
            name: true,
            gradeLevelId: true,
            gradeLevel: { select: { name: true, code: true } },
          },
        },
      },
      distinct: ['homeroomClassId'],
    });

    for (const enrollment of enrollments) {
      const gradeKey = enrollment.homeroomClass.gradeLevelId;
      if (!seenGrades.has(gradeKey)) {
        seenGrades.add(gradeKey);
        const gl = enrollment.homeroomClass.gradeLevel;
        rooms.push({
          room: `grade:${gradeKey}`,
          display: `${gl.name} (${gl.code})`,
        });
      }

      if (!seenHomerooms.has(enrollment.homeroomClass.id)) {
        seenHomerooms.add(enrollment.homeroomClass.id);
        rooms.push({
          room: `homeroom:${enrollment.homeroomClass.id}`,
          display: enrollment.homeroomClass.name,
        });
      }
    }

    // Lấy courseSection của các con
    const courseSections = await this.prisma.studentSubjectResult.findMany({
      where: {
        studentId: { in: studentParents.map((sp) => sp.studentId) },
        semesterId: currentSemester.id,
      },
      select: { courseSection: { select: { id: true, name: true } } },
      distinct: ['courseSectionId'],
    });

    for (const cs of courseSections) {
      rooms.push({
        room: `course:${cs.courseSection.id}`,
        display: cs.courseSection.name,
      });
    }

    return { notificationRooms: rooms };
  }

  /**
   * GV: school, teacher:{id}, homeroom:{homeroomClassId}, course:{courseSectionId}
   */
  private async buildTeacherSocketInfo(
    userId: string,
    schoolId: string,
  ): Promise<TeacherSocketInfo> {
    // Lấy thông tin school để hiển thị
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, shortName: true },
    });

    const currentSemester = await this.prisma.semester.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    });

    const rooms: NotificationRoom[] = [
      {
        room: `school:${schoolId}`,
        display: school?.shortName || school?.name || 'Trường',
      },
      { room: `teachers:${schoolId}`, display: 'Tất cả giáo viên' },
    ];

    // Room teacher:{id}
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId },
      select: { id: true, fullName: true },
    });
    if (teacher) {
      rooms.push({
        room: `teacher:${teacher.id}`,
        display: teacher.fullName || 'Giáo viên',
      });
    }

    if (!currentSemester) {
      return { notificationRooms: rooms };
    }

    // Room homeroom:{homeroomClassId} - các lớp chủ nhiệm
    const homeroomClasses = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId,
        academicYear: { isCurrent: true },
        homeroomTeacherId: teacher?.id,
        status: 'ACTIVE',
      },
      select: { id: true, name: true },
    });

    for (const hc of homeroomClasses) {
      rooms.push({
        room: `homeroom:${hc.id}`,
        display: hc.name,
      });
    }

    // Room course:{courseSectionId} - các lớp môn học được phân công
    const assignments = await this.prisma.teachingAssignment.findMany({
      where: {
        teacherId: teacher?.id,
        courseSection: {
          semesterId: currentSemester.id,
          status: 'ACTIVE',
        },
        status: 'ACTIVE',
      },
      select: { courseSection: { select: { id: true, name: true } } },
    });

    const seenCourses = new Set<string>();
    for (const assignment of assignments) {
      if (!seenCourses.has(assignment.courseSection.id)) {
        seenCourses.add(assignment.courseSection.id);
        rooms.push({
          room: `course:${assignment.courseSection.id}`,
          display: assignment.courseSection.name,
        });
      }
    }

    return { notificationRooms: rooms };
  }

  /**
   * SCHOOL_ADMIN: school, teacher, grade:{gradeLevelId}, homeroom:{homeroomClassId}, course:{courseSectionId}
   */
  private async buildSchoolAdminSocketInfo(
    schoolId: string,
  ): Promise<SchoolAdminSocketInfo> {
    // Lấy thông tin school để hiển thị
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, shortName: true },
    });

    const currentSemester = await this.prisma.semester.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    });

    const rooms: NotificationRoom[] = [
      {
        room: `school:${schoolId}`,
        display: school?.shortName || school?.name || 'Trường',
      },
      // { room: `school:${schoolId}:teacher`, display: 'Tất cả giáo viên' },
      // { room: `school:${schoolId}:parent`, display: 'Tất cả phụ huynh' },
    ];

    if (!currentSemester) {
      return { notificationRooms: rooms };
    }

    // Room grade:{gradeLevelId}
    const gradeLevels = await this.prisma.gradeLevel.findMany({
      where: { schoolId },
      select: { id: true, name: true, code: true },
    });

    for (const gl of gradeLevels) {
      rooms.push({
        room: `grade:${gl.id}`,
        display: `${gl.name} (${gl.code})`,
      });
    }

    // Room homeroom:{homeroomClassId}
    const homeroomClasses = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId,
        academicYear: { isCurrent: true },
        status: 'ACTIVE',
      },
      select: { id: true, name: true },
    });

    for (const hc of homeroomClasses) {
      rooms.push({ room: `homeroom:${hc.id}`, display: hc.name });
    }

    // Room course:{courseSectionId}
    const courseSections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        semesterId: currentSemester.id,
        status: 'ACTIVE',
      },
      select: { id: true, name: true },
    });

    for (const cs of courseSections) {
      rooms.push({ room: `course:${cs.id}`, display: cs.name });
    }

    return { notificationRooms: rooms };
  }

  // ============================================================
  // Socket Info Router
  // ============================================================

  private async buildSocketInfoByRole(
    role: UserRole,
    userId: string,
    schoolId: string,
  ): Promise<UserSocketInfo | null> {
    switch (role) {
      case UserRole.STUDENT:
        return this.buildStudentSocketInfo(userId, schoolId);

      case UserRole.TEACHER:
        return this.buildTeacherSocketInfo(userId, schoolId);

      case UserRole.SCHOOL_ADMIN:
        return this.buildSchoolAdminSocketInfo(schoolId);

      case UserRole.PARENT:
        return this.buildParentSocketInfo(userId, schoolId);

      default:
        return null;
    }
  }
}
