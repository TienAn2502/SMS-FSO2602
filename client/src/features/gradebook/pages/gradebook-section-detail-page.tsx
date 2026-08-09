import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchAdminGradebookGrid } from '@/features/gradebook/api/gradebook-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { GradebookOverviewStatusBadge } from '@/features/gradebook/components/assessment-status-badges';
import { GradebookExportActions } from '@/features/gradebook/components/gradebook-import-export-actions';
import {
  GradebookSemesterGrid,
  buildGradebookGridDraft,
  type GradebookGridDraft,
} from '@/features/gradebook/components/gradebook-semester-grid';

export function GradebookSectionDetailPage() {
  const { courseSectionId } = useParams<{ courseSectionId: string }>();
  const { session } = useAuth();
  const [draft, setDraft] = useState<GradebookGridDraft>({});

  const gridQuery = useQuery({
    queryKey: ['admin-gradebook-grid', session?.activeSchoolId, courseSectionId],
    queryFn: () => fetchAdminGradebookGrid(courseSectionId!),
    enabled: Boolean(courseSectionId && session?.activeSchoolId),
    retry: 2,
  });

  const errorMessage = useMemo(() => {
    if (!gridQuery.isError) {
      return 'Không tải được sổ điểm lớp môn';
    }

    const apiError = getApiError(gridQuery.error);
    return getErrorMessage(
      apiError?.code,
      apiError?.message ?? 'Không tải được sổ điểm lớp môn',
    );
  }, [gridQuery.error, gridQuery.isError]);

  useEffect(() => {
    if (gridQuery.data) {
      setDraft(buildGradebookGridDraft(gridQuery.data));
    }
  }, [gridQuery.data]);

  if (gridQuery.isPending) return <LoadingState />;
  if (gridQuery.isError || !gridQuery.data) {
    return (
      <ErrorState
        message={errorMessage}
        onRetry={() => void gridQuery.refetch()}
      />
    );
  }

  const grid = gridQuery.data;
  const gradebookStatus = grid.isLocked
    ? 'LOCKED'
    : grid.columns.length === 0
      ? 'NOT_STARTED'
      : 'IN_PROGRESS';

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <Link
            to={ROUTES.assessments}
            className='text-sm text-muted-foreground hover:text-foreground'
          >
            ← Tổng quan sổ điểm
          </Link>
          <h1 className='mt-2 text-2xl font-semibold'>
            {grid.courseSectionCode} — {grid.courseSectionName}
          </h1>
          <p className='text-sm text-muted-foreground'>
            {grid.subjectName ?? grid.subjectCode}
            {grid.homeroomClassCode ? ` · Lớp HC ${grid.homeroomClassCode}` : ''}{' '}
            · {grid.academicYearName} · {grid.semesterName}
          </p>
          <div className='mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
            <GradebookOverviewStatusBadge status={gradebookStatus} />
            {grid.isLocked ? <span>Sổ điểm đã khóa</span> : null}
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>
            Chế độ xem — nhập điểm do giáo viên thực hiện qua Portal.
          </p>
        </div>
        {courseSectionId ? (
          <GradebookExportActions courseSectionId={courseSectionId} />
        ) : null}
      </div>

      <GradebookSemesterGrid
        grid={grid}
        draft={draft}
        readonly
        onDraftChange={() => undefined}
      />
    </div>
  );
}
