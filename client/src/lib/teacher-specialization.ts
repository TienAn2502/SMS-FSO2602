interface TeacherSpecializationSource {
  specialization: string | null;
}

interface SubjectSpecializationTarget {
  subjectName: string;
  subjectCode?: string;
}

export function teacherMatchesSubjectSpecialization(
  teacher: TeacherSpecializationSource,
  subject: SubjectSpecializationTarget,
): boolean {
  const specialization = teacher.specialization?.trim().toLowerCase();
  if (!specialization) {
    return false;
  }

  const subjectName = subject.subjectName.trim().toLowerCase();
  if (specialization === subjectName) {
    return true;
  }

  const subjectCode = subject.subjectCode?.trim().toLowerCase();
  return subjectCode != null && specialization === subjectCode;
}
