import { z } from 'zod';

export const yearPromotionIssueCodeSchema = z.enum([
  'HK1_SEMESTER_NOT_CLOSED',
  'HK2_SEMESTER_NOT_CLOSED',
  'HK1_CONDUCT_NOT_CLOSED',
  'HK2_CONDUCT_NOT_CLOSED',
  'MISSING_YEAR_SUMMARY',
  'PENDING_PROMOTION',
  'ALREADY_CLOSED',
]);

export type YearPromotionIssueCode = z.infer<typeof yearPromotionIssueCodeSchema>;

export interface YearPromotionIssueItem {
  code: YearPromotionIssueCode;
  message: string;
  count?: number;
}

export interface HomeroomPromotionReadiness {
  homeroomClassId: string;
  homeroomClassCode: string;
  ready: boolean;
  issues: YearPromotionIssueItem[];
}

export interface YearPromotionReadiness {
  academicYearId: string;
  academicYearName: string;
  ready: boolean;
  alreadyClosed: boolean;
  totalHomeroomClasses: number;
  readyHomeroomClasses: number;
  homeroomIssues: HomeroomPromotionReadiness[];
  yearLevelIssues: string[];
}

export interface YearPromotionFinalizeAllResult {
  yearSummariesClosed: number;
  homeroomClassesProcessed: number;
  studentsInactivated: number;
  parentsInactivated: number;
}

export interface YearRecomputeAllResult {
  yearSummariesUpserted: number;
  homeroomClassesProcessed: number;
}
