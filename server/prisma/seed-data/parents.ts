import {
  AcademicEntityStatus,
  ParentRelationship,
  PrismaClient,
  UserRole,
  UserStatus,
} from '@prisma/client';

import {
  buildParentDemoEmail,
  buildParentDemoPhone,
  DEMO_PARENT_ACCOUNT_COUNT,
  DEMO_STUDENTS_WITH_PARENTS,
} from './thpt-curriculum';

function deriveParentNames(
  studentFullName: string,
  studentIndex: number,
): { fatherName: string; motherName: string } {
  const ho = studentFullName.trim().split(/\s+/)[0] ?? 'Nguyễn';
  const fatherTen = ['Hùng', 'Dũng', 'Tuấn', 'Minh', 'Phúc', 'Khôi', 'Đạt'][
    studentIndex % 7
  ];
  const motherTen = ['Lan', 'Mai', 'Hoa', 'Linh', 'Ngọc', 'Phương', 'Thảo'][
    studentIndex % 7
  ];

  return {
    fatherName: `${ho} Văn ${fatherTen}`,
    motherName: `${ho} Thị ${motherTen}`,
  };
}

export async function seedParents(
  prisma: PrismaClient,
  schoolId: string,
  demoPasswordHash: string,
): Promise<{
  parentAccountCount: number;
  parentProfileCount: number;
  studentParentLinkCount: number;
}> {
  const students = await prisma.student.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'asc' },
    take: DEMO_STUDENTS_WITH_PARENTS,
    select: { id: true, fullName: true },
  });

  if (students.length === 0) {
    throw new Error('No students found — seed students before parents');
  }

  let parentProfileCount = 0;
  let studentParentLinkCount = 0;
  let parentCodeSeq = 0;

  for (let i = 0; i < Math.min(DEMO_PARENT_ACCOUNT_COUNT, students.length); i++) {
    const student = students[i]!;
    const { fatherName } = deriveParentNames(student.fullName, i);
    const email = buildParentDemoEmail(i);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: demoPasswordHash,
          fullName: fatherName,
          role: UserRole.PARENT,
          schoolId,
          status: UserStatus.ACTIVE,
        },
      });

      const parent = await tx.parent.create({
        data: {
          schoolId,
          userId: user.id,
          fullName: fatherName,
          phone: buildParentDemoPhone(i, 1),
          status: AcademicEntityStatus.ACTIVE,
          externalCode: `PH-${++parentCodeSeq}`,
        },
      });

      await tx.studentParent.create({
        data: {
          schoolId,
          parentId: parent.id,
          studentId: student.id,
          relationship: ParentRelationship.FATHER,
          isPrimaryContact: true,
        },
      });

      // parent01 gắn thêm 1 HS cùng lớp (em ruột) để demo portal my-children
      if (i === 0 && students[1]) {
        await tx.studentParent.create({
          data: {
            schoolId,
            parentId: parent.id,
            studentId: students[1].id,
            relationship: ParentRelationship.FATHER,
            isPrimaryContact: false,
          },
        });
      }
    });

    parentProfileCount += 1;
    studentParentLinkCount += i === 0 && students[1] ? 2 : 1;
  }

  for (let i = 0; i < students.length; i++) {
    const student = students[i]!;
    const { motherName } = deriveParentNames(student.fullName, i);

    const mother = await prisma.parent.create({
      data: {
        schoolId,
        fullName: motherName,
        phone: buildParentDemoPhone(i, 2),
        status: AcademicEntityStatus.ACTIVE,
        externalCode: `PH-${++parentCodeSeq}`,
      },
    });

    await prisma.studentParent.create({
      data: {
        schoolId,
        parentId: mother.id,
        studentId: student.id,
        relationship: ParentRelationship.MOTHER,
        isPrimaryContact: false,
      },
    });

    parentProfileCount += 1;
    studentParentLinkCount += 1;

    // HS chưa có tài khoản PH: thêm hồ sơ cha (không user) cho đủ CRUD demo
    if (i >= DEMO_PARENT_ACCOUNT_COUNT) {
      const { fatherName } = deriveParentNames(student.fullName, i);
      const father = await prisma.parent.create({
        data: {
          schoolId,
          fullName: fatherName,
          phone: buildParentDemoPhone(i, 1),
          status: AcademicEntityStatus.ACTIVE,
          externalCode: `PH-${++parentCodeSeq}`,
        },
      });

      await prisma.studentParent.create({
        data: {
          schoolId,
          parentId: father.id,
          studentId: student.id,
          relationship: ParentRelationship.FATHER,
          isPrimaryContact: true,
        },
      });

      parentProfileCount += 1;
      studentParentLinkCount += 1;
    }
  }

  return {
    parentAccountCount: Math.min(DEMO_PARENT_ACCOUNT_COUNT, students.length),
    parentProfileCount,
    studentParentLinkCount,
  };
}
