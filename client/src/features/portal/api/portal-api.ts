import { api } from '@/lib/api';
import type { CourseSection } from '@/features/course-sections/api/course-sections-api';
import type {
    AcademicEntityStatus,
    ApiPaginatedResponse,
    ApiSuccessResponse,
    UserRole,
} from '@/types/api.types';

import type { AssessmentType } from '@/features/gradebook/api/gradebook-api';
import type {
    AttendanceRecordStatus,
    AttendanceSession,
    AttendanceSessionDetail,
} from '@/features/attendance/api/attendance-api';

import type { Student } from '@/features/students/api/students-api';
import type { TeachingAssignment } from '@/features/teaching-assignments/api/teaching-assignments-api';
import type { TimetableEntry } from '@/features/timetable/api/timetable-entries-api';
import type { HomeroomClass } from '@/features/homeroom-classes/api/homeroom-classes-api';
import type { StudentEnrollmentSummary } from '@/features/students/api/students-api';
import type {
    LinkedStudentSummary,
    ParentRelationship,
} from '@/features/parents/api/parents-api';

export interface PortalMeResponse {
    user: {
        id: string;
        email: string;
        fullName: string;
        role: UserRole;
    };
    activeSchoolId: string;
    teacher?: {
        id: string;
        fullName: string;
        specialization: string | null;
        phone: string | null;
        status: string;
    };
    student?: Student;
    parent?: {
        id: string;
        fullName: string;
        phone: string | null;
        status: string;
        linkedStudents: LinkedStudentSummary[];
    };
}

export interface PortalChild {
    linkId: string;
    relationship: ParentRelationship;
    isPrimaryContact: boolean;
    student: Student;
}

export async function fetchPortalMe(): Promise<PortalMeResponse> {
    const { data } =
        await api.get<ApiSuccessResponse<PortalMeResponse>>('/portal/me');
    return data.data;
}

export async function fetchMyHomeroomClasses(): Promise<HomeroomClass[]> {
    const { data } = await api.get<ApiSuccessResponse<HomeroomClass[]>>(
        '/portal/my-homeroom-classes',
    );
    return data.data;
}

export async function fetchMyHomeroomClassStudents(classId: string) {
    const { data } = await api.get<
        ApiSuccessResponse<
            Array<
                StudentEnrollmentSummary & {
                    id: string;
                    studentId: string;
                    studentFullName: string;
                }
            >
        >
    >(`/portal/my-homeroom-classes/${classId}/students`);
    return data.data;
}

export async function fetchMyTeachingAssignments(): Promise<
    TeachingAssignment[]
> {
    const { data } = await api.get<ApiSuccessResponse<TeachingAssignment[]>>(
        '/portal/my-teaching-assignments',
    );
    return data.data;
}

export async function fetchMyTimetable(params?: {
    search?: string;
    academicYearId?: string;
    semesterId?: string;
    subjectId?: string;
    status?: AcademicEntityStatus;
}): Promise<TimetableEntry[]> {
    const { data } = await api.get<ApiSuccessResponse<TimetableEntry[]>>(
        '/portal/my-timetable',
        { params },
    );
    return data.data;
}

export async function fetchMyStudentProfile(): Promise<Student> {
    const { data } = await api.get<ApiSuccessResponse<Student>>(
        '/portal/my-student-profile',
    );
    return data.data;
}

export interface ListMyCourseSectionsParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: AcademicEntityStatus;
    semesterId?: string;
    academicYearId?: string;
    subjectId?: string;
}

export async function fetchMyCourseSections(
    params: ListMyCourseSectionsParams = {},
) {
    const { data } = await api.get<ApiPaginatedResponse<CourseSection>>(
        '/portal/my-course-sections',
        { params },
    );
    return { items: data.data, meta: data.meta };
}

export interface ClassTimetableResponse {
    homeroomClass: { id: string; code: string; name: string } | null;
    semester: { id: string; code: string; name: string } | null;
    entries: TimetableEntry[];
}

export async function fetchMyClassTimetable(params?: {
    search?: string;
    academicYearId?: string;
    semesterId?: string;
    subjectId?: string;
    status?: AcademicEntityStatus;
}): Promise<ClassTimetableResponse> {
    const { data } = await api.get<ApiSuccessResponse<ClassTimetableResponse>>(
        '/portal/my-class-timetable',
        { params },
    );
    return data.data;
}

export type PortalTimetableExportFormat = 'xlsx' | 'csv';

export interface PortalTimetableExportParams {
    format?: PortalTimetableExportFormat;
    search?: string;
    academicYearId?: string;
    semesterId?: string;
    subjectId?: string;
    status?: AcademicEntityStatus;
}

async function downloadPortalTimetableExport(
    path: string,
    params: PortalTimetableExportParams,
): Promise<void> {
    const format = params.format ?? 'xlsx';
    const response = await api.get(path, {
        params: {
            format,
            search: params.search,
            academicYearId: params.academicYearId,
            semesterId: params.semesterId,
            subjectId: params.subjectId,
            status: params.status,
        },
        responseType: 'blob',
    });

    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download =
        format === 'csv' ? 'thoi-khoa-bieu.csv' : 'thoi-khoa-bieu.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
}

export async function downloadPortalMyTimetableExport(
    params: PortalTimetableExportParams,
): Promise<void> {
    await downloadPortalTimetableExport('/portal/my-timetable/export', params);
}

export async function downloadPortalClassTimetableExport(
    params: PortalTimetableExportParams,
): Promise<void> {
    await downloadPortalTimetableExport(
        '/portal/my-class-timetable/export',
        params,
    );
}

export async function fetchMyChildren(): Promise<PortalChild[]> {
    const { data } = await api.get<ApiSuccessResponse<PortalChild[]>>(
        '/portal/my-children',
    );
    return data.data;
}

export interface PortalAttendanceClass {
    teachingAssignmentId: string;
    courseSectionId: string;
    courseSectionCode: string;
    courseSectionName: string;
    homeroomClassId: string | null;
    homeroomClassCode: string | null;
    homeroomClassName: string | null;
    semesterId: string;
}

export interface PortalMyAttendanceItem {
    id: string;
    status: string;
    note: string | null;
    sessionId: string;
    sessionDate: string;
    periodNumber: number;
    sessionStatus: string;
    courseSectionId: string;
    courseSectionCode: string;
    courseSectionName: string;
    teacherId: string;
    teacherFullName: string;
    createdAt: string;
    updatedAt: string;
}

export async function fetchMyAttendanceClasses(): Promise<
    PortalAttendanceClass[]
> {
    const { data } = await api.get<ApiSuccessResponse<PortalAttendanceClass[]>>(
        '/portal/my-attendance-classes',
    );
    return data.data;
}

export async function fetchPortalAttendanceSession(sessionId: string) {
    const { data } = await api.get<ApiSuccessResponse<AttendanceSessionDetail>>(
        `/portal/attendance-sessions/${sessionId}`,
    );
    return data.data;
}

export async function createPortalAttendanceSession(input: {
    courseSectionId: string;
    sessionDate: string;
    periodNumber: number;
    timetableEntryId?: string;
    note?: string;
}) {
    const { data } = await api.post<ApiSuccessResponse<AttendanceSession>>(
        '/portal/attendance-sessions',
        input,
    );
    return data.data;
}

export async function bulkUpsertPortalAttendanceRecords(
    sessionId: string,
    input: {
        records: Array<{
            studentId: string;
            status: AttendanceRecordStatus;
            note?: string | null;
        }>;
    },
) {
    const { data } = await api.put<ApiSuccessResponse<AttendanceSessionDetail>>(
        `/portal/attendance-sessions/${sessionId}/records`,
        input,
    );
    return data.data;
}

export async function initializePortalAttendanceRecords(sessionId: string) {
    const { data } = await api.post<
        ApiSuccessResponse<AttendanceSessionDetail>
    >(`/portal/attendance-sessions/${sessionId}/records/initialize`);
    return data.data;
}

export async function closePortalAttendanceSession(
    sessionId: string,
    courseSectionId: string,
    courseSectionName: string,
    periodNumber: number,
    note?: string | null,
) {
    const { data } = await api.patch<ApiSuccessResponse<AttendanceSession>>(
        `/portal/attendance-sessions/${sessionId}`,
        {
            status: 'CLOSED',
            note: note ?? null,
            courseSectionId,
            courseSectionName,
            periodNumber,
        },
    );
    return data.data;
}

export async function fetchMyAttendance(params?: {
    page?: number;
    limit?: number;
    semesterId?: string;
    includeAllSemesters?: boolean;
}) {
    const { data } = await api.get<
        ApiPaginatedResponse<PortalMyAttendanceItem>
    >('/portal/my-attendance', { params });
    return data;
}

export async function fetchMyChildAttendance(
    studentId: string,
    params?: {
        page?: number;
        limit?: number;
        semesterId?: string;
        includeAllSemesters?: boolean;
    },
) {
    const { data } = await api.get<
        ApiPaginatedResponse<PortalMyAttendanceItem>
    >(`/portal/my-children/${studentId}/attendance`, { params });
    return data;
}

export type PortalAssessmentType = AssessmentType;

export interface PortalGradebookClassSummary {
    courseSectionId: string;
    courseSectionCode: string;
    courseSectionName: string;
    semesterId: string;
    semesterCode: string;
    semesterName: string;
    homeroomClassCode: string | null;
    subjectCode: string | null;
    subjectName: string | null;
}

export interface PortalGradebookGridColumn {
    slotKey: string;
    assessmentId: string;
    type: AssessmentType;
    name: string;
    assessmentDate: string | null;
    maxScore: number;
    status: 'OPEN' | 'CLOSED';
    editable: boolean;
}

export interface PortalGradebookGridCell {
    scoreId: string;
    score: number | null;
    note: string | null;
    absent: boolean;
    editable: boolean;
}

export interface PortalGradebookGridRow {
    studentId: string;
    studentFullName: string;
    cells: Record<string, PortalGradebookGridCell | undefined>;
    semesterAverage: number | null;
}

export interface PortalGradebookGrid {
    courseSectionId: string;
    courseSectionCode: string;
    courseSectionName: string;
    semesterId: string;
    semesterName: string;
    semesterIsCurrent: boolean;
    academicYearId: string;
    academicYearName: string;
    homeroomClassCode: string | null;
    subjectCode: string | null;
    subjectName: string | null;
    periodsPerYear: number | null;
    regularTxPerYear: number;
    regularSlotsThisSemester: number;
    isLocked: boolean;
    columns: PortalGradebookGridColumn[];
    rows: PortalGradebookGridRow[];
}

export interface PortalStudentScoresGridColumn {
    slotKey: string;
    label: string;
    type: AssessmentType;
}

export interface PortalStudentScoresGridCell {
    score: number | null;
    note: string | null;
    absent: boolean;
}

export interface PortalStudentScoresGridRow {
    courseSectionId: string;
    subjectCode: string | null;
    subjectName: string | null;
    teacherFullName: string | null;
    cells: Record<string, PortalStudentScoresGridCell | undefined>;
    semesterAverage: number | null;
}

export interface PortalStudentScoresGrid {
    semesterId: string;
    semesterName: string;
    academicYearId: string;
    academicYearName: string;
    homeroomClassCode: string | null;
    columns: PortalStudentScoresGridColumn[];
    rows: PortalStudentScoresGridRow[];
}

export interface PortalMyScoreItem {
    id: string;
    score: number | null;
    note: string | null;
    assessmentId: string;
    assessmentName: string;
    assessmentType: PortalAssessmentType;
    assessmentDate: string;
    maxScore: number;
    assessmentStatus: 'OPEN' | 'CLOSED';
    courseSectionId: string;
    courseSectionCode: string;
    courseSectionName: string;
    subjectId: string | null;
    subjectCode: string | null;
    subjectName: string | null;
    teacherFullName: string;
}

export async function fetchMyGradebookClasses(params?: {
    academicYearId?: string;
}) {
    const { data } = await api.get<
        ApiSuccessResponse<PortalGradebookClassSummary[]>
    >('/portal/my-gradebook-classes', { params });
    return data.data;
}

export async function fetchMyGradebookGrid(courseSectionId: string) {
    const { data } = await api.get<ApiSuccessResponse<PortalGradebookGrid>>(
        `/portal/my-gradebook-classes/${courseSectionId}/grid`,
    );
    return data.data;
}

export async function patchGradebookScores(
    courseSectionId: string,
    input: {
        changes: Array<{
            assessmentId: string;
            studentId: string;
            score: number | null;
            note?: string | null;
        }>;
    },
) {
    const { data } = await api.patch<ApiSuccessResponse<null>>(
        `/portal/my-gradebook-classes/${courseSectionId}/scores`,
        input,
    );
    return data;
}

export async function lockGradebook(courseSectionId: string) {
    const { data } = await api.patch<
        ApiSuccessResponse<{ lockedAssessmentCount: number }>
    >(`/portal/my-gradebook-classes/${courseSectionId}/lock`);
    return data.data;
}

export async function fillPortalGradebookFakeScores(
    courseSectionId: string,
): Promise<{ filledCount: number }> {
    const { data } = await api.post<
        ApiSuccessResponse<{ filledCount: number }>
    >(`/portal/my-gradebook-classes/${courseSectionId}/scores/fake-fill`);

    return data.data;
}

export type PortalGradebookExportFormat = 'xlsx' | 'csv';

export async function downloadPortalGradebookExport(
    courseSectionId: string,
    format: PortalGradebookExportFormat,
): Promise<void> {
    const response = await api.get(
        `/portal/my-gradebook-classes/${courseSectionId}/export`,
        {
            params: { format },
            responseType: 'blob',
        },
    );

    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download =
        format === 'csv' ? 'so-diem-lop-mon.csv' : 'so-diem-lop-mon.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
}

export async function downloadPortalGradebookPdfExport(
    courseSectionId: string,
): Promise<void> {
    const response = await api.get(
        `/portal/my-gradebook-classes/${courseSectionId}/export/pdf`,
        { responseType: 'blob' },
    );

    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'so-diem-lop-mon.pdf';
    anchor.click();
    URL.revokeObjectURL(url);
}

export async function downloadMyScoresPdfExport(params: {
    semesterId: string;
    academicYearId?: string;
}): Promise<void> {
    const response = await api.get('/portal/my-scores/export/pdf', {
        params,
        responseType: 'blob',
    });

    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'bang-diem-ca-nhan.pdf';
    anchor.click();
    URL.revokeObjectURL(url);
}

export async function downloadMyChildScoresPdfExport(
    studentId: string,
    params: {
        semesterId: string;
        academicYearId?: string;
    },
): Promise<void> {
    const response = await api.get(
        `/portal/my-children/${studentId}/scores/export/pdf`,
        {
            params,
            responseType: 'blob',
        },
    );

    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'bang-diem-ca-nhan.pdf';
    anchor.click();
    URL.revokeObjectURL(url);
}

export async function fetchMyScoresGrid(params: {
    semesterId: string;
    academicYearId?: string;
}) {
    const { data } = await api.get<ApiSuccessResponse<PortalStudentScoresGrid>>(
        '/portal/my-scores/grid',
        { params },
    );
    return data.data;
}

export async function fetchMyChildScoresGrid(
    studentId: string,
    params: {
        semesterId: string;
        academicYearId?: string;
    },
) {
    const { data } = await api.get<ApiSuccessResponse<PortalStudentScoresGrid>>(
        `/portal/my-children/${studentId}/scores/grid`,
        { params },
    );
    return data.data;
}

export async function fetchMyChildScores(
    studentId: string,
    params?: {
        page?: number;
        limit?: number;
        semesterId?: string;
        academicYearId?: string;
        courseSectionId?: string;
        subjectId?: string;
        type?: PortalAssessmentType;
    },
) {
    const { data } = await api.get<ApiPaginatedResponse<PortalMyScoreItem>>(
        `/portal/my-children/${studentId}/scores`,
        { params },
    );
    return data;
}

export type PortalTrainingResultLevel =
    | 'GOOD'
    | 'FAIR'
    | 'SATISFACTORY'
    | 'UNSATISFACTORY';

export interface PortalStudentSummaries {
    semesterId: string | null;
    semesterName: string | null;
    semesterSummary: {
        overallAverage: number | null;
        academicResultLevel: string | null;
        trainingResultLevel: string | null;
        subjectCount: number;
        homeroomClassCode: string | null;
        status: string;
        finalizedAt: string | null;
    } | null;
    subjectResults: Array<{
        courseSectionId: string;
        courseSectionCode: string;
        subjectName: string;
        evaluationMode: string;
        regularAverage: number | null;
        midtermScore: number | null;
        finalScore: number | null;
        semesterAverage: number | null;
        yearAverage: number | null;
        passFailResult: string | null;
        status: string;
    }>;
    conductRecord: {
        trainingResultLevel: PortalTrainingResultLevel;
        note: string | null;
        status: string;
    } | null;
    yearSummary: {
        academicYearName: string;
        overallAverage: number | null;
        academicResultLevel: string | null;
        trainingResultLevel: string | null;
        absentSessionCount: number | null;
        promotionDecision: string;
        status: string;
    } | null;
}

export async function fetchMySummaries(params: {
    semesterId?: string;
    academicYearId?: string;
}) {
    const { data } = await api.get<ApiSuccessResponse<PortalStudentSummaries>>(
        '/portal/my-summaries',
        { params },
    );
    return data.data;
}

export async function fetchMyChildSummaries(
    studentId: string,
    params: { semesterId?: string; academicYearId?: string },
) {
    const { data } = await api.get<ApiSuccessResponse<PortalStudentSummaries>>(
        `/portal/my-children/${studentId}/summaries`,
        { params },
    );
    return data.data;
}

export async function fetchMyHomeroomSummaries(params: {
    semesterId: string;
    homeroomClassId: string;
}) {
    const { data } = await api.get<
        ApiSuccessResponse<{
            homeroomClass: { id: string; code: string; name: string };
            rows: Array<{
                studentFullName: string;
                overallAverage: number | null;
                academicResultLevel: string | null;
                trainingResultLevel: string | null;
                status: string;
            }>;
        }>
    >('/portal/my-homeroom/summaries', { params });
    return data.data;
}

export interface PortalConductRecordRow {
    id: string;
    studentId: string;
    studentFullName: string;
    trainingResultLevel: PortalTrainingResultLevel;
    note: string | null;
    status: string;
}

export async function fetchMyHomeroomConductRecords(params: {
    semesterId: string;
    homeroomClassId: string;
}) {
    const { data } = await api.get<
        ApiSuccessResponse<PortalConductRecordRow[]>
    >('/portal/my-homeroom/conduct-records', { params });
    return data.data;
}

export async function upsertMyHomeroomConductRecords(input: {
    semesterId: string;
    homeroomClassId: string;
    records: Array<{
        studentId: string;
        trainingResultLevel: PortalTrainingResultLevel;
        note?: string;
    }>;
}) {
    const { data } = await api.put<
        ApiSuccessResponse<PortalConductRecordRow[]>
    >('/portal/my-homeroom/conduct-records', input);
    return data.data;
}
