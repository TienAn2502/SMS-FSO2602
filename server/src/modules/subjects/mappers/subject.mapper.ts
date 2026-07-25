import type { Subject } from '@prisma/client';

export interface SubjectResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: Subject['status'];
}

export function toSubjectResponse(subject: Subject): SubjectResponse {
  return {
    id: subject.id,
    code: subject.code,
    name: subject.name,
    description: subject.description,
    status: subject.status,
  };
}
