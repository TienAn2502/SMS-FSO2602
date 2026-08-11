import { type ColumnDef } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTableGrid } from '@/components/common/data-table-grid';
import { DataPagination } from '@/components/common/data-pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  fetchAllAcademicYears,
  fetchSemesters,
} from '@/features/academic-years/api/academic-years-api';
import {
  prepareNextYear,
  previewPrepareNextYear,
} from '@/features/academic-years/api/year-preparation-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  fetchYearPromotionFinalizeReadiness,
  fetchYearSummaries,
  updateYearSummaryNextHomeroom,
  type YearSummaryItem,
} from '@/features/grade-summaries/api/grade-summaries-api';
import { fetchHomeroomClasses } from '@/features/homeroom-classes/api/homeroom-classes-api';
import {
  createEnrollmentsFromYearPromotions,
  previewEnrollmentsFromYearPromotions,
} from '@/features/student-enrollments/api/student-enrollments-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';
import { PROMOTION_DECISION_LABELS } from '@/lib/labels';

const PAGE_SIZE = 20;

interface YearNextEnrollmentsPanelProps {
  sourceAcademicYearId: string;
  homeroomClassId?: string;
}

export function YearNextEnrollmentsPanel({
  sourceAcademicYearId,
  homeroomClassId,
}: YearNextEnrollmentsPanelProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [targetYearId, setTargetYearId] = useState('');
  const [targetSemesterId, setTargetSemesterId] = useState('');
  const [page, setPage] = useState(1);

  const readinessQuery = useQuery({
    queryKey: ['grade-summaries', 'promotion-readiness', sourceAcademicYearId],
    queryFn: () => fetchYearPromotionFinalizeReadiness(sourceAcademicYearId),
    enabled: Boolean(sourceAcademicYearId),
  });

  const yearsQuery = useQuery({
    queryKey: ['academic-years', session?.activeSchoolId, 'all'],
    queryFn: fetchAllAcademicYears,
    enabled: Boolean(session?.activeSchoolId),
  });

  const targetYears = useMemo(
    () =>
      (yearsQuery.data?.items ?? []).filter(
        (year) => year.id !== sourceAcademicYearId,
      ),
    [sourceAcademicYearId, yearsQuery.data?.items],
  );

  const targetSemestersQuery = useQuery({
    queryKey: ['semesters', targetYearId],
    queryFn: () => fetchSemesters(targetYearId),
    enabled: Boolean(targetYearId),
  });

  const targetHomeroomsQuery = useQuery({
    queryKey: ['homeroom-classes', session?.activeSchoolId, targetYearId, 'next'],
    queryFn: () =>
      fetchHomeroomClasses({
        academicYearId: targetYearId,
        status: 'ACTIVE',
        limit: 100,
        page: 1,
      }),
    enabled: Boolean(session?.activeSchoolId && targetYearId),
  });

  const mappingQuery = useQuery({
    queryKey: [
      'grade-summaries',
      'year-next-map',
      sourceAcademicYearId,
      homeroomClassId,
      page,
    ],
    queryFn: () =>
      fetchYearSummaries({
        academicYearId: sourceAcademicYearId,
        homeroomClassId: homeroomClassId || undefined,
        status: 'CLOSED',
        page,
        limit: PAGE_SIZE,
      }),
    enabled:
      Boolean(sourceAcademicYearId) &&
      Boolean(readinessQuery.data?.alreadyClosed),
    placeholderData: keepPreviousData,
  });

  const preparePreviewQuery = useQuery({
    queryKey: [
      'year-preparation',
      'preview',
      sourceAcademicYearId,
      targetYearId,
      targetSemesterId,
    ],
    queryFn: () =>
      previewPrepareNextYear({
        sourceAcademicYearId,
        targetAcademicYearId: targetYearId,
        targetSemesterId: targetSemesterId || undefined,
      }),
    enabled:
      Boolean(sourceAcademicYearId) &&
      Boolean(targetYearId) &&
      Boolean(readinessQuery.data?.alreadyClosed),
  });

  const previewQuery = useQuery({
    queryKey: [
      'student-enrollments',
      'from-year-promotions-preview',
      sourceAcademicYearId,
      targetSemesterId,
    ],
    queryFn: () =>
      previewEnrollmentsFromYearPromotions({
        sourceAcademicYearId,
        targetSemesterId,
      }),
    enabled:
      Boolean(sourceAcademicYearId) &&
      Boolean(targetSemesterId) &&
      Boolean(readinessQuery.data?.alreadyClosed),
  });

  const invalidateAfterPrepare = () => {
    void queryClient.invalidateQueries({ queryKey: ['grade-summaries'] });
    void queryClient.invalidateQueries({ queryKey: ['homeroom-classes'] });
    void queryClient.invalidateQueries({ queryKey: ['year-preparation'] });
    void queryClient.invalidateQueries({
      queryKey: ['student-enrollments'],
    });
    void queryClient.invalidateQueries({ queryKey: ['students'] });
  };

  const assignMutation = useMutation({
    mutationFn: ({
      id,
      nextHomeroomClassId,
    }: {
      id: string;
      nextHomeroomClassId: string | null;
    }) => updateYearSummaryNextHomeroom(id, nextHomeroomClassId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['grade-summaries'] });
      void queryClient.invalidateQueries({
        queryKey: ['student-enrollments', 'from-year-promotions-preview'],
      });
      void queryClient.invalidateQueries({ queryKey: ['year-preparation'] });
      toast.success('Đã cập nhật lớp năm sau');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'),
      );
    },
  });

  const prepareMutation = useMutation({
    mutationFn: () =>
      prepareNextYear({
        sourceAcademicYearId,
        targetAcademicYearId: targetYearId,
        targetSemesterId,
        createEnrollments: true,
      }),
    onSuccess: (data) => {
      invalidateAfterPrepare();
      const enrollmentPart = data.enrollments
        ? `; ghi danh mới ${data.enrollments.createdCount} (skip ${data.enrollments.skippedExistingCount})`
        : '';
      toast.success(
        `Đã tạo ${data.classesCreated} lớp, map ${data.studentsMapped} HS` +
          enrollmentPart,
      );
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Chuẩn bị năm sau thất bại',
        ),
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createEnrollmentsFromYearPromotions({
        sourceAcademicYearId,
        targetSemesterId,
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ['student-enrollments'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['student-enrollments', 'from-year-promotions-preview'],
      });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(
        `Đã tạo ${data.createdCount} ghi danh (skip ${data.skippedExistingCount}, thiếu lớp ${data.missingNextClassCount}, lớp sai năm ${data.invalidNextClassCount})`,
      );
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Tạo ghi danh năm sau thất bại',
        ),
      );
    },
  });

  const targetHomerooms = targetHomeroomsQuery.data?.items ?? [];

  const columns = useMemo<ColumnDef<YearSummaryItem>[]>(
    () => [
      { accessorKey: 'studentFullName', header: 'Học sinh' },
      { accessorKey: 'homeroomClassCode', header: 'Lớp năm cũ' },
      {
        accessorKey: 'promotionDecision',
        header: 'Quyết định',
        cell: ({ row }) =>
          PROMOTION_DECISION_LABELS[row.original.promotionDecision],
      },
      {
        id: 'nextHomeroom',
        header: 'Lớp năm sau',
        cell: ({ row }) => {
          const item = row.original;
          const canAssign = item.promotionDecision === 'PROMOTED';

          if (!canAssign) {
            return (
              <span className='text-sm text-muted-foreground'>—</span>
            );
          }

          return (
            <select
              className={selectClassName}
              value={item.nextHomeroomClassId ?? ''}
              disabled={!targetYearId || assignMutation.isPending}
              onChange={(event) => {
                const value = event.target.value;
                assignMutation.mutate({
                  id: item.id,
                  nextHomeroomClassId: value || null,
                });
              }}
            >
              <option value=''>Chưa gán</option>
              {targetHomerooms.map((homeroom) => (
                <option key={homeroom.id} value={homeroom.id}>
                  {homeroom.code} — {homeroom.name}
                </option>
              ))}
            </select>
          );
        },
      },
    ],
    [assignMutation, targetHomerooms, targetYearId],
  );

  if (readinessQuery.isLoading) {
    return (
      <p className='text-sm text-muted-foreground'>
        Đang kiểm tra trạng thái chốt lên lớp…
      </p>
    );
  }

  if (!readinessQuery.data?.alreadyClosed) {
    return null;
  }

  const preparePreview = preparePreviewQuery.data;
  const preview = previewQuery.data;
  const mappingItems = mappingQuery.data?.items ?? [];

  return (
    <div className='space-y-4 rounded-lg border bg-muted/30 p-4'>
      <div>
        <p className='text-sm font-medium'>Chuẩn bị & ghi danh năm sau</p>
        <p className='text-sm text-muted-foreground'>
          Tự tạo lớp HC cho HS lên lớp (cùng cấu trúc / GVCN), gán lớp năm sau và
          tạo ghi danh HK đích. HS ở lại / tốt nghiệp được bỏ qua.
        </p>
      </div>

      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <label className='text-sm font-medium'>Năm học đích</label>
          <select
            className={selectClassName}
            value={targetYearId}
            onChange={(event) => {
              setTargetYearId(event.target.value);
              setTargetSemesterId('');
              setPage(1);
            }}
          >
            <option value=''>Chọn năm học mới</option>
            {targetYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>
        <div className='space-y-1.5'>
          <label className='text-sm font-medium'>Học kỳ đích</label>
          <select
            className={selectClassName}
            value={targetSemesterId}
            disabled={!targetYearId}
            onChange={(event) => setTargetSemesterId(event.target.value)}
          >
            <option value=''>Chọn học kỳ (thường HK1)</option>
            {(targetSemestersQuery.data ?? []).map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.code} — {semester.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {preparePreviewQuery.isFetching && targetYearId ? (
        <p className='text-sm text-muted-foreground'>
          Đang xem trước chuẩn bị năm sau…
        </p>
      ) : null}

      {preparePreview ? (
        <ul className='grid gap-1 text-sm text-muted-foreground sm:grid-cols-2'>
          <li>Lớp sẽ tạo mới: {preparePreview.classesToCreate}</li>
          <li>Lớp đã có sẵn: {preparePreview.classesAlreadyExist}</li>
          <li>HS lên lớp sẽ map: {preparePreview.promotedCount}</li>
          <li>HS ở lại (bỏ qua): {preparePreview.retainedSkippedCount}</li>
          <li>Tốt nghiệp (bỏ qua): {preparePreview.graduatedSkippedCount}</li>
          <li>Không map được: {preparePreview.unmappedCount}</li>
        </ul>
      ) : null}

      {previewQuery.isFetching && targetSemesterId ? (
        <p className='text-sm text-muted-foreground'>
          Đang xem trước ghi danh hiện tại…
        </p>
      ) : null}

      {preview ? (
        <ul className='grid gap-1 text-sm text-muted-foreground sm:grid-cols-2'>
          <li>Ghi danh đủ điều kiện: {preview.eligibleCount}</li>
          <li>Sẽ tạo mới (sau khi đã map): {preview.wouldCreateCount}</li>
          <li>Đã có ghi danh: {preview.skippedExistingCount}</li>
          <li>Thiếu lớp năm sau: {preview.missingNextClassCount}</li>
          <li>Lớp sai năm đích: {preview.invalidNextClassCount}</li>
          <li>Ở lại (bỏ qua): {preview.retainedSkippedCount}</li>
          <li>Tốt nghiệp (bỏ qua): {preview.graduatedSkippedCount}</li>
        </ul>
      ) : null}

      <div className='flex flex-wrap gap-2'>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type='button'
              size='sm'
              disabled={
                !targetYearId ||
                !targetSemesterId ||
                prepareMutation.isPending ||
                (preparePreview?.studentsToMap ?? 0) === 0
              }
            >
              {prepareMutation.isPending
                ? 'Đang chuẩn bị…'
                : 'Tự chuẩn bị năm sau'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Chuẩn bị năm sau?</AlertDialogTitle>
              <AlertDialogDescription>
                Hệ thống sẽ tạo lớp HC còn thiếu cho HS lên lớp (cùng mã cấu
                trúc / GVCN), gán lớp năm sau, rồi tạo ghi danh vào học kỳ đã
                chọn. HS ở lại và tốt nghiệp bị bỏ qua. Thao tác idempotent nếu
                chạy lại.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => prepareMutation.mutate()}
                disabled={prepareMutation.isPending}
              >
                Xác nhận
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={
            !targetSemesterId ||
            createMutation.isPending ||
            (preview?.wouldCreateCount ?? 0) === 0
          }
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending
            ? 'Đang tạo…'
            : 'Chỉ tạo ghi danh (đã map tay)'}
        </Button>
      </div>

      <div className='space-y-3'>
        <p className='text-sm font-medium'>Gán lớp năm sau (tuỳ chọn chỉnh tay)</p>
        {mappingQuery.isLoading ? (
          <LoadingState message='Đang tải tổng kết đã chốt…' />
        ) : mappingItems.length === 0 ? (
          <EmptyState
            title='Không có tổng kết đã chốt'
            description='Chốt lên lớp trước khi gán lớp năm sau'
          />
        ) : (
          <>
            <DataTableGrid data={mappingItems} columns={columns} />
            <DataPagination
              page={mappingQuery.data?.meta.page ?? page}
              totalPages={mappingQuery.data?.meta.totalPages ?? 1}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
