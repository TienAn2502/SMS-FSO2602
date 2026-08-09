import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  fetchYearPromotionFinalizeReadiness,
  finalizePromotionAll,
  type YearPromotionReadiness,
} from '@/features/grade-summaries/api/grade-summaries-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

interface YearFinalizePanelProps {
  academicYearId: string | undefined;
  disabledReason?: string | null;
  onSelectHomeroom: (homeroomClassId: string) => void;
}

export function YearFinalizePanel({
  academicYearId,
  disabledReason,
  onSelectHomeroom,
}: YearFinalizePanelProps) {
  const queryClient = useQueryClient();
  const [showIssues, setShowIssues] = useState(false);

  const readinessQuery = useQuery({
    queryKey: ['grade-summaries', 'promotion-readiness', academicYearId],
    queryFn: () => fetchYearPromotionFinalizeReadiness(academicYearId!),
    enabled: Boolean(academicYearId),
  });

  const finalizeAllMutation = useMutation({
    mutationFn: () => finalizePromotionAll(academicYearId!),
    onSuccess: (data) => {
      const graduateSuffix =
        data.studentsInactivated > 0
          ? `; ${data.studentsInactivated} HS tốt nghiệp đã chuyển INACTIVE${
              data.parentsInactivated > 0
                ? `, ${data.parentsInactivated} PH liên quan cũng INACTIVE`
                : ''
            }`
          : '';
      toast.success(
        `Đã chốt lên lớp: ${data.yearSummariesClosed} học sinh${graduateSuffix}`,
      );
      void queryClient.invalidateQueries({ queryKey: ['grade-summaries'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['parents'] });
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Chốt lên lớp thất bại'),
      );
    },
  });

  if (!academicYearId) {
    return null;
  }

  if (readinessQuery.isLoading) {
    return (
      <p className='text-sm text-muted-foreground'>
        Đang kiểm tra điều kiện chốt lên lớp…
      </p>
    );
  }

  if (readinessQuery.isError || !readinessQuery.data) {
    return (
      <p className='text-sm text-destructive'>
        Không tải được trạng thái chốt lên lớp
      </p>
    );
  }

  const readiness = readinessQuery.data;
  const issueCount = readiness.homeroomIssues.length;
  const finalizeDisabledReason = resolveFinalizeDisabledReason(
    readiness,
    disabledReason,
  );

  return (
    <div className='space-y-3 rounded-lg border bg-muted/30 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <p className='text-sm font-medium'>Chốt lên lớp toàn trường</p>
          <p className='text-sm text-muted-foreground'>
            {readiness.readyHomeroomClasses}/{readiness.totalHomeroomClasses} lớp
            chủ nhiệm sẵn sàng
            {readiness.alreadyClosed ? ' — năm học đã chốt' : null}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {issueCount > 0 ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setShowIssues((value) => !value)}
            >
              {showIssues ? (
                <>
                  <ChevronUp className='mr-1 size-4' />
                  Ẩn vấn đề
                </>
              ) : (
                <>
                  <ChevronDown className='mr-1 size-4' />
                  Xem {issueCount} lớp có vấn đề
                </>
              )}
            </Button>
          ) : null}
          <Button
            type='button'
            size='sm'
            disabled={
              Boolean(finalizeDisabledReason) || finalizeAllMutation.isPending
            }
            title={finalizeDisabledReason ?? undefined}
            onClick={() => finalizeAllMutation.mutate()}
          >
            Chốt lên lớp
          </Button>
        </div>
      </div>

      {readiness.yearLevelIssues.length > 0 ? (
        <ul className='list-disc space-y-1 pl-5 text-sm text-muted-foreground'>
          {readiness.yearLevelIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}

      {finalizeDisabledReason ? (
        <p className='text-sm text-muted-foreground'>{finalizeDisabledReason}</p>
      ) : null}

      {showIssues && issueCount > 0 ? (
        <ul className='space-y-2 text-sm'>
          {readiness.homeroomIssues.map((homeroom) => (
            <li
              key={homeroom.homeroomClassId}
              className='rounded-md border bg-background p-3'
            >
              <button
                type='button'
                className='font-medium text-primary hover:underline'
                onClick={() => onSelectHomeroom(homeroom.homeroomClassId)}
              >
                {homeroom.homeroomClassCode}
              </button>
              <ul className='mt-1 list-disc space-y-1 pl-5 text-muted-foreground'>
                {homeroom.issues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`}>{issue.message}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function resolveFinalizeDisabledReason(
  readiness: YearPromotionReadiness,
  externalReason?: string | null,
): string | null {
  if (externalReason) {
    return externalReason;
  }

  if (readiness.alreadyClosed) {
    return 'Năm học đã được chốt lên lớp';
  }

  if (readiness.yearLevelIssues.length > 0) {
    return readiness.yearLevelIssues.join(' — ');
  }

  if (!readiness.ready) {
    return 'Chưa đủ điều kiện — xem các vấn đề và xử lý từng lớp';
  }

  return null;
}
