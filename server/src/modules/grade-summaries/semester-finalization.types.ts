import { z } from 'zod';

export const semesterFinalizeIssueCodeSchema = z.enum([
  'OPEN_GRADEBOOKS',
  'MISSING_CONDUCT',
  'MISSING_SEMESTER_SUMMARY',
  'ALREADY_CLOSED',
]);

export type SemesterFinalizeIssueCode = z.infer<
  typeof semesterFinalizeIssueCodeSchema
>;

export interface SemesterFinalizeIssueItem {
  code: SemesterFinalizeIssueCode;
  message: string;
  count?: number;
  courseSectionCodes?: string[];
}

export interface HomeroomFinalizeReadiness {
  homeroomClassId: string;
  homeroomClassCode: string;
  ready: boolean;
  issues: SemesterFinalizeIssueItem[];
}

export interface SemesterFinalizeReadiness {
  semesterId: string;
  semesterName: string;
  semesterCode: string;
  ready: boolean;
  alreadyClosed: boolean;
  totalHomeroomClasses: number;
  readyHomeroomClasses: number;
  homeroomIssues: HomeroomFinalizeReadiness[];
}

export interface SemesterFinalizeAllResult {
  subjectResultsClosed: number;
  semesterSummariesClosed: number;
  conductRecordsClosed: number;
  homeroomClassesProcessed: number;
}
