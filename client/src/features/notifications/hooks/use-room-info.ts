import { useQueries } from '@tanstack/react-query';
import { fetchAllGradeLevels } from '@/features/grade-levels/api/grade-levels-api';
import { fetchAllHomeroomClasses } from '@/features/homeroom-classes/api/homeroom-classes-api';
import {
    fetchAcademicYears,
    fetchSemesters,
} from '@/features/academic-years/api/academic-years-api';
import {
    fetchCourseSections,
    type CourseSection,
} from '@/features/course-sections/api/course-sections-api';
import { fetchAllGradeLevelSubjects } from '@/features/grade-level-subjects/api/grade-level-subjects-api';

export interface RoomInfo {
    type: string;
    id: string;
    name: string;
    code: string;
    displayName?: string;
}

export function useRoomInfo() {
    // Fetch current academic year
    const { data: yearsData, isLoading: yearsLoading } = useQueries({
        queries: [
            {
                queryKey: ['academic-years', 'all'],
                queryFn: () => fetchAcademicYears({ limit: 100, page: 1 }),
                staleTime: 5 * 60 * 1000,
            },
        ],
    })[0];

    const currentAcademicYear = yearsData?.items.find((y) => y.isCurrent);

    // Fetch current semester
    const { data: semestersData, isLoading: semestersLoading } = useQueries({
        queries: [
            {
                queryKey: ['semesters', currentAcademicYear?.id, 'all'],
                queryFn: () =>
                    currentAcademicYear
                        ? fetchSemesters(currentAcademicYear.id)
                        : Promise.resolve([]),
                staleTime: 5 * 60 * 1000,
                enabled: !!currentAcademicYear,
            },
        ],
    })[0];

    const currentSemester = semestersData?.find((s) => s.isCurrent);

    // Fetch course sections for current semester
    const { data: courseSectionsData, isLoading: courseSectionsLoading } =
        useQueries({
            queries: [
                {
                    queryKey: [
                        'course-sections',
                        'semester',
                        currentSemester?.id,
                        'all',
                    ],
                    queryFn: () =>
                        currentSemester
                            ? fetchCourseSections({
                                  semesterId: currentSemester.id,
                                  limit: 1000,
                                  page: 1,
                              })
                            : Promise.resolve({ items: [], meta: null }),
                    staleTime: 5 * 60 * 1000,
                    enabled: !!currentSemester,
                },
            ],
        })[0];

    // Fetch homeroom classes for current academic year
    const { data: homeroomClassesData, isLoading: homeroomClassesLoading } =
        useQueries({
            queries: [
                {
                    queryKey: [
                        'homeroom-classes',
                        'academic-year',
                        currentAcademicYear?.id,
                        'all',
                    ],
                    queryFn: () =>
                        currentAcademicYear
                            ? fetchAllHomeroomClasses({
                                  academicYearId: currentAcademicYear.id,
                              })
                            : Promise.resolve({ items: [], meta: null }),
                    staleTime: 5 * 60 * 1000,
                    enabled: !!currentAcademicYear,
                },
            ],
        })[0];

    // Fetch grade levels
    const { data: gradeLevelsData, isLoading: gradeLevelsLoading } = useQueries(
        {
            queries: [
                {
                    queryKey: ['grade-levels', 'all'],
                    queryFn: fetchAllGradeLevels,
                    staleTime: 5 * 60 * 1000,
                },
            ],
        },
    )[0];

    // Fetch grade level subjects
    const {
        data: gradeLevelSubjectsData,
        isLoading: gradeLevelSubjectsLoading,
    } = useQueries({
        queries: [
            {
                queryKey: ['grade-level-subjects', 'all'],
                queryFn: () => fetchAllGradeLevelSubjects(),
                staleTime: 5 * 60 * 1000,
            },
        ],
    })[0];

    const isLoading =
        yearsLoading ||
        semestersLoading ||
        courseSectionsLoading ||
        homeroomClassesLoading ||
        gradeLevelsLoading ||
        gradeLevelSubjectsLoading;

    const roomMap = new Map<string, RoomInfo>();

    // Build maps for lookups
    const homeroomClassMap = new Map<string, string>();
    for (const cls of homeroomClassesData?.items ?? []) {
        homeroomClassMap.set(cls.id, cls.name);
    }

    const gradeLevelSubjectMap = new Map<
        string,
        { subjectCode: string; gradeLevelCode: string }
    >();
    for (const gls of gradeLevelSubjectsData?.items ?? []) {
        gradeLevelSubjectMap.set(gls.id, {
            subjectCode: gls.subjectCode,
            gradeLevelCode: gls.gradeLevelCode,
        });
    }

    // Homeroom classes: type = 'homeroom'
    const homeroomClasses = homeroomClassesData?.items ?? [];
    for (const cls of homeroomClasses) {
        roomMap.set(`homeroom:${cls.id}`, {
            type: 'homeroom',
            id: cls.id,
            name: cls.name,
            code: cls.code,
            displayName: cls.name,
        });
    }

    // Grade levels: type = 'grade'
    const gradeLevels = gradeLevelsData?.items ?? [];
    for (const grade of gradeLevels) {
        roomMap.set(`grade:${grade.id}`, {
            type: 'grade',
            id: grade.id,
            name: grade.name,
            code: grade.code,
            displayName: `${grade.name} (${grade.code})`,
        });
    }

    // Course sections: type = 'course'
    const courseSections: CourseSection[] = courseSectionsData?.items ?? [];
    for (const cs of courseSections) {
        const glsInfo = gradeLevelSubjectMap.get(cs.gradeLevelSubjectId);
        const homeroomName = cs.homeroomClassId
            ? homeroomClassMap.get(cs.homeroomClassId)
            : null;

        let displayName: string;
        if (glsInfo && homeroomName) {
            // Format: TOAN-10A1
            displayName = `${glsInfo.subjectCode}-${homeroomName}`;
        } else if (glsInfo) {
            // No homeroom class, use grade level code
            displayName = `${glsInfo.subjectCode}-${glsInfo.gradeLevelCode}`;
        } else {
            // Fallback to course section name/code
            displayName = cs.name || cs.code;
        }

        roomMap.set(`course:${cs.id}`, {
            type: 'course',
            id: cs.id,
            name: displayName,
            code: cs.code,
            displayName,
        });
    }

    const getRoomInfo = (roomId: string): RoomInfo | undefined => {
        return roomMap.get(roomId);
    };

    const getRoomDisplayName = (roomId: string): string => {
        const info = roomMap.get(roomId);
        if (!info) {
            const [type, id] = roomId.split(':');

            // Handle known types with fallback message
            if (type === 'school') {
                return 'Toàn trường';
            }

            if (type === 'student' || type === 'parent' || type === 'teacher') {
                return `Người dùng ${type === 'student' ? 'học sinh' : type === 'parent' ? 'phụ huynh' : 'giáo viên'}`;
            }

            // For homeroom, grade, course types but not found in cache
            const typeLabels: Record<string, string> = {
                homeroom: 'Lớp chủ nhiệm',
                grade: 'Khối lớp',
                course: 'Lớp môn học',
            };

            const label = typeLabels[type];
            if (label) {
                return `${label} (${id.slice(0, 8)}...)`;
            }

            // Unknown type
            return roomId;
        }
        return info.displayName || `${info.name} (${info.code})`;
    };

    return {
        roomMap,
        isLoading,
        getRoomInfo,
        getRoomDisplayName,
    };
}
