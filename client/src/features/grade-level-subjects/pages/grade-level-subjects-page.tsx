import { type ColumnDef } from '@tanstack/react-table';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTableGrid } from '@/components/common/data-table-grid';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchAllGradeLevels } from '@/features/grade-levels/api/grade-levels-api';
import {
  fetchAllGradeLevelSubjects,
  getThptBgdEvaluationModeReference,
  getThptBgdTotalPeriodsReference,
  SUBJECT_EVALUATION_MODE_LABELS,
  THPT_BGD_CORE_PERIODS_REFERENCE,
  THPT_BGD_REGULATION,
  THPT_BGD_SPECIALIZED_CLUSTER_PERIODS,
  THPT_BGD_SPECIALIZED_CLUSTER_SUBJECTS,
  updateGradeLevelSubject,
  type GradeLevelSubject,
  type SubjectEvaluationMode,
} from '@/features/grade-level-subjects/api/grade-level-subjects-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';

function PeriodsEditor({
  row,
  onSaved,
}: {
  row: GradeLevelSubject;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(
    row.periodsPerYear != null ? String(row.periodsPerYear) : '',
  );
  const [dirty, setDirty] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => {
      const trimmed = value.trim();
      const periodsPerYear =
        trimmed === '' ? null : Number.parseInt(trimmed, 10);
      if (trimmed !== '' && Number.isNaN(periodsPerYear)) {
        return Promise.reject(new Error('INVALID_NUMBER'));
      }
      return updateGradeLevelSubject(row.id, { periodsPerYear });
    },
    onSuccess: () => {
      setDirty(false);
      onSaved();
      toast.success(`Đã cập nhật ${row.subjectCode} — ${row.gradeLevelCode}`);
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'INVALID_NUMBER') {
        toast.error('Số tiết phải là số nguyên');
        return;
      }
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Cập nhật số tiết thất bại',
        ),
      );
    },
  });

  const bgdDefault = getThptBgdTotalPeriodsReference(row.subjectCode);

  return (
    <div className='flex items-center gap-2'>
      <Input
        type='number'
        min={1}
        max={999}
        className='h-8 w-20'
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        placeholder='—'
      />
      {dirty ? (
        <Button
          size='sm'
          variant='outline'
          className='h-8'
          disabled={saveMutation.isPending}
          onClick={() => void saveMutation.mutate()}
        >
          Lưu
        </Button>
      ) : bgdDefault != null && row.periodsPerYear !== bgdDefault ? (
        <Button
          size='sm'
          variant='ghost'
          className='h-8 text-xs'
          onClick={() => {
            setValue(String(bgdDefault));
            setDirty(true);
          }}
        >
          BGD: {bgdDefault}
        </Button>
      ) : null}
    </div>
  );
}

function EvaluationModeEditor({
  row,
  onSaved,
}: {
  row: GradeLevelSubject;
  onSaved: () => void;
}) {
  const [value, setValue] = useState<SubjectEvaluationMode>(row.evaluationMode);
  const dirty = value !== row.evaluationMode;
  const bgdDefault = getThptBgdEvaluationModeReference(row.subjectCode);

  const saveMutation = useMutation({
    mutationFn: () => updateGradeLevelSubject(row.id, { evaluationMode: value }),
    onSuccess: () => {
      onSaved();
      toast.success(`Đã cập nhật hình thức đánh giá ${row.subjectCode}`);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Cập nhật hình thức đánh giá thất bại',
        ),
      );
    },
  });

  return (
    <div className='flex items-center gap-2'>
      <select
        className={`${selectClassName} h-8 min-w-36`}
        value={value}
        onChange={(e) => setValue(e.target.value as SubjectEvaluationMode)}
      >
        {(Object.keys(SUBJECT_EVALUATION_MODE_LABELS) as SubjectEvaluationMode[]).map(
          (mode) => (
            <option key={mode} value={mode}>
              {SUBJECT_EVALUATION_MODE_LABELS[mode]}
            </option>
          ),
        )}
      </select>
      {dirty ? (
        <Button
          size='sm'
          variant='outline'
          className='h-8'
          disabled={saveMutation.isPending}
          onClick={() => void saveMutation.mutate()}
        >
          Lưu
        </Button>
      ) : row.evaluationMode !== bgdDefault ? (
        <Button
          size='sm'
          variant='ghost'
          className='h-8 text-xs'
          onClick={() => setValue(bgdDefault)}
        >
          BGD
        </Button>
      ) : null}
    </div>
  );
}

export function GradeLevelSubjectsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [gradeFilter, setGradeFilter] = useState('');

  const gradesQuery = useQuery({
    queryKey: ['grade-levels', session?.activeSchoolId, 'all'],
    queryFn: fetchAllGradeLevels,
    enabled: Boolean(session?.activeSchoolId),
  });

  const listQuery = useQuery({
    queryKey: [
      'grade-level-subjects',
      session?.activeSchoolId,
      gradeFilter,
    ],
    queryFn: () =>
      fetchAllGradeLevelSubjects(gradeFilter || undefined),
    enabled: Boolean(session?.activeSchoolId),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['grade-level-subjects'] });
  };

  const columns = useMemo<ColumnDef<GradeLevelSubject>[]>(
    () => [
      { accessorKey: 'gradeLevelCode', header: 'Khối' },
      { accessorKey: 'subjectCode', header: 'Mã môn' },
      { accessorKey: 'subjectName', header: 'Tên môn' },
      {
        accessorKey: 'isRequired',
        header: 'Bắt buộc',
        cell: ({ row }) => (row.original.isRequired ? 'Có' : 'Tự chọn'),
      },
      {
        id: 'bgdCore',
        header: 'BGD (cốt lõi)',
        cell: ({ row }) =>
          THPT_BGD_CORE_PERIODS_REFERENCE[row.original.subjectCode] ?? '—',
      },
      {
        id: 'bgdCluster',
        header: '+CD',
        cell: ({ row }) =>
          THPT_BGD_SPECIALIZED_CLUSTER_SUBJECTS.has(row.original.subjectCode)
            ? `+${THPT_BGD_SPECIALIZED_CLUSTER_PERIODS}`
            : '—',
      },
      {
        id: 'bgdTotal',
        header: 'BGD (tổng)',
        cell: ({ row }) =>
          getThptBgdTotalPeriodsReference(row.original.subjectCode) ?? '—',
      },
      {
        id: 'evaluationMode',
        header: 'Hình thức đánh giá',
        cell: ({ row }) => (
          <EvaluationModeEditor row={row.original} onSaved={invalidate} />
        ),
      },
      {
        id: 'periodsPerYear',
        header: 'Số tiết/năm (seed)',
        cell: ({ row }) => (
          <PeriodsEditor row={row.original} onSaved={invalidate} />
        ),
      },
    ],
    [],
  );

  const items = listQuery.data?.items ?? [];
  const grades = gradesQuery.data?.items ?? [];

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Môn theo khối</h1>
        <p className='text-sm text-muted-foreground'>
          Số tiết/năm = cốt lõi + chuyên đề (TT13/2022). Hình thức đánh giá: điểm số
          hoặc đạt/chưa đạt (VD: Giáo dục thể chất).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cấu hình môn theo khối</CardTitle>
          <CardDescription>
            Seed mặc định theo {THPT_BGD_REGULATION.circular}. Admin có thể điều
            chỉnh số tiết và hình thức đánh giá theo trường.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='max-w-xs space-y-1.5'>
            <Label htmlFor='gls-grade-filter'>Lọc theo khối</Label>
            <select
              id='gls-grade-filter'
              className={selectClassName}
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value=''>Tất cả khối</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </div>

          {listQuery.isError ? (
            <ErrorState
              message='Không tải được danh sách môn theo khối'
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}

          {listQuery.isLoading ? (
            <LoadingState message='Đang tải...' />
          ) : items.length === 0 ? (
            <EmptyState
              title='Chưa có cấu hình'
              description='Chạy seed hoặc thêm khối và môn học trước'
            />
          ) : (
            <DataTableGrid data={items} columns={columns} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
