import { type ColumnFiltersState } from '@tanstack/react-table';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchAllAcademicYears,
  fetchSemesters,
  type AcademicYear,
  type Semester,
} from '@/features/academic-years/api/academic-years-api';
import { ALL_ACADEMIC_PERIODS } from '@/features/course-sections/api/course-sections-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchAllSubjects } from '@/features/subjects/api/subjects-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  getColumnFilterValue,
  hasColumnFilters,
  setColumnFilterValue,
} from '@/lib/table-filters';
import type { AcademicEntityStatus } from '@/types/api.types';

export function findCurrentAcademicContext(
  years: AcademicYear[],
  semestersByYearId: Map<string, Semester[]>,
) {
  const currentYear = years.find((year) => year.isCurrent);
  if (!currentYear) {
    return null;
  }

  const semesters = semestersByYearId.get(currentYear.id) ?? [];
  const currentSemester = semesters.find((semester) => semester.isCurrent);

  return { currentYear, currentSemester };
}

export function useCourseSectionListFilters(
  onPageReset: () => void,
  options?: { requireAcademicPeriod?: boolean; yearOnly?: boolean },
) {
  const requireAcademicPeriod = options?.requireAcademicPeriod ?? false;
  const yearOnly = options?.yearOnly ?? false;
  const { session } = useAuth();
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [filtersReady, setFiltersReady] = useState(false);
  const filtersInitializedRef = useRef(false);
  const debouncedSearch = useDebouncedValue(globalFilter, 300);

  const yearFilter = getColumnFilterValue<string>(columnFilters, 'academicYearId');
  const semesterFilter = getColumnFilterValue<string>(columnFilters, 'semesterId');
  const subjectFilter = getColumnFilterValue<string>(columnFilters, 'subjectId');
  const statusFilter = getColumnFilterValue<AcademicEntityStatus>(
    columnFilters,
    'status',
  );

  const yearsQuery = useQuery({
    queryKey: ['academic-years', session?.activeSchoolId, 'all'],
    queryFn: fetchAllAcademicYears,
    enabled: Boolean(session?.activeSchoolId),
  });

  const years = yearsQuery.data?.items ?? [];

  const semestersQueries = useQueries({
    queries: years.map((year) => ({
      queryKey: ['semesters', session?.activeSchoolId, year.id],
      queryFn: () => fetchSemesters(year.id),
      enabled: Boolean(session?.activeSchoolId),
    })),
  });

  const semestersByYearId = useMemo(() => {
    const map = new Map<string, Semester[]>();
    for (const [index, year] of years.entries()) {
      map.set(year.id, semestersQueries[index]?.data ?? []);
    }
    return map;
  }, [years, semestersQueries]);

  useEffect(() => {
    filtersInitializedRef.current = false;
    setFiltersReady(false);
    setColumnFilters([]);
  }, [session?.activeSchoolId]);

  useEffect(() => {
    if (filtersInitializedRef.current || yearsQuery.isLoading) {
      return;
    }

    if (!years.length) {
      setFiltersReady(true);
      return;
    }

    const currentContext = findCurrentAcademicContext(years, semestersByYearId);
    if (!currentContext) {
      filtersInitializedRef.current = true;
      setFiltersReady(true);
      return;
    }

    const { currentYear, currentSemester } = currentContext;
    const semestersLoaded = semestersByYearId.has(currentYear.id);
    if (!semestersLoaded || semestersQueries.some((query) => query.isLoading)) {
      return;
    }

    filtersInitializedRef.current = true;
    setColumnFilters([
      { id: 'academicYearId', value: currentYear.id },
      ...(yearOnly || !currentSemester
        ? []
        : [{ id: 'semesterId', value: currentSemester.id }]),
    ]);
    setFiltersReady(true);
  }, [years, semestersByYearId, semestersQueries, yearsQuery.isLoading, yearOnly]);

  const semesterMap = useMemo(() => {
    const map = new Map<string, { name: string; academicYearId: string }>();
    for (const query of semestersQueries) {
      for (const semester of query.data ?? []) {
        map.set(semester.id, {
          name: semester.name,
          academicYearId: semester.academicYearId,
        });
      }
    }
    return map;
  }, [semestersQueries]);

  const filterSemesters = useMemo(() => {
    if (yearFilter === ALL_ACADEMIC_PERIODS) {
      const semestersByCode = new Map<
        string,
        { name: string; isCurrent: boolean }
      >();

      for (const semesters of semestersByYearId.values()) {
        for (const semester of semesters) {
          const existing = semestersByCode.get(semester.code);
          semestersByCode.set(semester.code, {
            name: semester.name,
            isCurrent: existing?.isCurrent || semester.isCurrent,
          });
        }
      }

      return [...semestersByCode.entries()]
        .sort(([leftCode], [rightCode]) => leftCode.localeCompare(rightCode))
        .map(([code, semester]) => ({
          id: code,
          name: semester.name,
          isCurrent: semester.isCurrent,
        }));
    }

    if (!yearFilter) {
      return [];
    }

    return (semestersByYearId.get(yearFilter) ?? []).map((semester) => ({
      id: semester.id,
      name: semester.name,
      isCurrent: semester.isCurrent,
    }));
  }, [semestersByYearId, yearFilter]);

  const subjectsQuery = useQuery({
    queryKey: ['subjects', session?.activeSchoolId, 'all'],
    queryFn: fetchAllSubjects,
    enabled: Boolean(session?.activeSchoolId),
  });

  const subjects = subjectsQuery.data?.items ?? [];
  const filtersActive = hasColumnFilters(columnFilters, globalFilter);

  return {
    session,
    globalFilter,
    debouncedSearch,
    yearFilter,
    semesterFilter,
    subjectFilter,
    statusFilter,
    columnFilters,
    setColumnFilters,
    filtersReady,
    filtersActive,
    years,
    subjects,
    filterSemesters,
    semesterMap,
    semestersByYearId,
    setGlobalFilter: (value: string) => {
      setGlobalFilter(value);
      onPageReset();
    },
    setYearFilter: (nextYearId: string) => {
      setColumnFilters((prev) => {
        let next = setColumnFilterValue(
          prev,
          'academicYearId',
          requireAcademicPeriod || nextYearId !== ALL_ACADEMIC_PERIODS
            ? nextYearId
            : ALL_ACADEMIC_PERIODS,
        );

        if (requireAcademicPeriod && nextYearId !== ALL_ACADEMIC_PERIODS) {
          const semesters = semestersByYearId.get(nextYearId) ?? [];
          const nextSemester =
            semesters.find((semester) => semester.isCurrent) ?? semesters[0];
          next = setColumnFilterValue(
            next,
            'semesterId',
            nextSemester?.id,
          );
        }

        return next;
      });
      onPageReset();
    },
    setSemesterFilter: (nextSemesterId: string) => {
      setColumnFilters((prev) =>
        setColumnFilterValue(
          prev,
          'semesterId',
          requireAcademicPeriod || nextSemesterId !== ALL_ACADEMIC_PERIODS
            ? nextSemesterId || undefined
            : nextSemesterId === ALL_ACADEMIC_PERIODS
              ? ALL_ACADEMIC_PERIODS
              : nextSemesterId || undefined,
        ),
      );
      onPageReset();
    },
    setSubjectFilter: (subjectId: string | undefined) => {
      setColumnFilters((prev) =>
        setColumnFilterValue(prev, 'subjectId', subjectId),
      );
      onPageReset();
    },
    setStatusFilter: (status: AcademicEntityStatus | undefined) => {
      setColumnFilters((prev) =>
        setColumnFilterValue(prev, 'status', status),
      );
      onPageReset();
    },
  };
}
