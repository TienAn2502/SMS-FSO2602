import { type ColumnDef } from '@tanstack/react-table';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataPagination } from '@/components/common/data-pagination';
import { DataTableGrid } from '@/components/common/data-table-grid';
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
import { Input } from '@/components/ui/input';
import {
  fetchAllAcademicYears,
  fetchSemesters,
} from '@/features/academic-years/api/academic-years-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  assignClassPlacement,
  autoBalanceClassPlacement,
  fetchUnassignedPlacements,
  previewAutoBalanceClassPlacement,
  type PlacementReason,
  type UnassignedPlacementItem,
} from '@/features/class-placement/api/class-placement-api';
import { ClassPlacementImportSheet } from '@/features/class-placement/components/class-placement-import-sheet';
import { fetchAllGradeLevels } from '@/features/grade-levels/api/grade-levels-api';
import { fetchHomeroomClasses } from '@/features/homeroom-classes/api/homeroom-classes-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';

const PAGE_SIZE = 20;

const REASON_LABELS: Record<PlacementReason, string> = {
  RETAINED: 'Ở lại lớp',
  NEW_INTAKE: 'Mới lên cấp',
};

export function ClassPlacementPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [yearId, setYearId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [reason, setReason] = useState<'' | PlacementReason>('');
  const [gradeLevelId, setGradeLevelId] = useState('');
  const [manualClassId, setManualClassId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMeta, setSelectedMeta] = useState<
    Map<
      string,
      {
        reason: PlacementReason;
        previousGradeLevelId: string | null;
        previousGradeLevelCode: string | null;
      }
    >
  >(new Map());
  const debouncedSearch = useDebouncedValue(search, 300);

  const yearsQuery = useQuery({
    queryKey: ['academic-years', session?.activeSchoolId, 'all'],
    queryFn: fetchAllAcademicYears,
    enabled: Boolean(session?.activeSchoolId),
  });

  const years = yearsQuery.data?.items ?? [];

  useEffect(() => {
    if (yearId || years.length === 0) {
      return;
    }
    const current = years.find((year) => year.isCurrent) ?? years[0];
    if (current) {
      setYearId(current.id);
    }
  }, [yearId, years]);

  const semestersQuery = useQuery({
    queryKey: ['semesters', yearId],
    queryFn: () => fetchSemesters(yearId),
    enabled: Boolean(yearId),
  });

  useEffect(() => {
    const semesters = semestersQuery.data ?? [];
    if (!yearId || semesters.length === 0) {
      return;
    }
    if (semesterId && semesters.some((row) => row.id === semesterId)) {
      return;
    }
    const current =
      semesters.find((row) => row.isCurrent) ??
      semesters.find((row) => row.code === 'HK1') ??
      semesters[0];
    if (current) {
      setSemesterId(current.id);
    }
  }, [yearId, semesterId, semestersQuery.data]);

  const gradesQuery = useQuery({
    queryKey: ['grade-levels', session?.activeSchoolId, 'all'],
    queryFn: fetchAllGradeLevels,
    enabled: Boolean(session?.activeSchoolId),
  });

  const unassignedQuery = useQuery({
    queryKey: [
      'class-placement',
      'unassigned',
      semesterId,
      reason,
      gradeLevelId,
      debouncedSearch,
      page,
    ],
    queryFn: () =>
      fetchUnassignedPlacements({
        semesterId,
        reason: reason || undefined,
        gradeLevelId: gradeLevelId || undefined,
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: Boolean(semesterId),
    placeholderData: keepPreviousData,
  });

  const classesQuery = useQuery({
    queryKey: [
      'homeroom-classes',
      session?.activeSchoolId,
      yearId,
      gradeLevelId,
      'placement',
    ],
    queryFn: () =>
      fetchHomeroomClasses({
        academicYearId: yearId,
        gradeLevelId: gradeLevelId || undefined,
        status: 'ACTIVE',
        limit: 100,
        page: 1,
      }),
    enabled: Boolean(session?.activeSchoolId && yearId),
  });

  const autoPreviewQuery = useQuery({
    queryKey: [
      'class-placement',
      'auto-preview',
      semesterId,
      gradeLevelId,
      reason,
    ],
    queryFn: () =>
      previewAutoBalanceClassPlacement({
        semesterId,
        gradeLevelId,
        reason: reason || undefined,
      }),
    enabled: Boolean(semesterId && gradeLevelId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['class-placement'] });
    void queryClient.invalidateQueries({ queryKey: ['student-enrollments'] });
    void queryClient.invalidateQueries({ queryKey: ['students'] });
    void queryClient.invalidateQueries({ queryKey: ['homeroom-classes'] });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectedMeta(new Map());
  };

  const toggleStudent = (item: UnassignedPlacementItem, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(item.studentId);
      } else {
        next.delete(item.studentId);
      }
      return next;
    });
    setSelectedMeta((prev) => {
      const next = new Map(prev);
      if (checked) {
        next.set(item.studentId, {
          reason: item.reason,
          previousGradeLevelId: item.previousGradeLevelId,
          previousGradeLevelCode: item.previousGradeLevelCode,
        });
      } else {
        next.delete(item.studentId);
      }
      return next;
    });
  };

  const assignMutation = useMutation({
    mutationFn: () =>
      assignClassPlacement({
        semesterId,
        assignments: [...selectedIds].map((studentId) => ({
          studentId,
          homeroomClassId: manualClassId,
        })),
      }),
    onSuccess: (data) => {
      clearSelection();
      invalidate();
      toast.success(`Đã xếp ${data.createdCount} học sinh vào lớp`);
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(apiError?.code, apiError?.message ?? 'Xếp lớp thất bại'),
      );
    },
  });

  const autoMutation = useMutation({
    mutationFn: () =>
      autoBalanceClassPlacement({
        semesterId,
        gradeLevelId,
        reason: reason || undefined,
        studentIds:
          selectedIds.size > 0 ? [...selectedIds] : undefined,
      }),
    onSuccess: (data) => {
      clearSelection();
      invalidate();
      toast.success(
        `Đã chia đều ${data.createdCount} HS khối ${data.gradeLevelCode}` +
          (data.unplacedCount > 0
            ? ` (còn ${data.unplacedCount} chưa xếp — hết chỗ)`
            : ''),
      );
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Chia đều lớp thất bại',
        ),
      );
    },
  });

  const items = unassignedQuery.data?.items ?? [];
  const classes = classesQuery.data?.items ?? [];
  const preview = autoPreviewQuery.data;
  const allSelectedOnPage =
    items.length > 0 && items.every((row) => selectedIds.has(row.studentId));

  /** HS ở lại chỉ hiện lớp cùng khối trước; nếu chọn nhiều khối ở lại khác nhau → không cho xếp tay. */
  const retainedGradeConstraint = useMemo(() => {
    const retainedGrades = new Map<string, string>();
    for (const meta of selectedMeta.values()) {
      if (
        meta.reason === 'RETAINED' &&
        meta.previousGradeLevelId &&
        meta.previousGradeLevelCode
      ) {
        retainedGrades.set(
          meta.previousGradeLevelId,
          meta.previousGradeLevelCode,
        );
      }
    }
    return {
      gradeIds: [...retainedGrades.keys()],
      codes: [...retainedGrades.values()],
      hasConflict: retainedGrades.size > 1,
    };
  }, [selectedMeta]);

  const manualClasses = useMemo(() => {
    if (retainedGradeConstraint.hasConflict) {
      return [];
    }
    if (retainedGradeConstraint.gradeIds.length === 1) {
      const onlyGradeId = retainedGradeConstraint.gradeIds[0];
      return classes.filter((row) => row.gradeLevelId === onlyGradeId);
    }
    return classes;
  }, [classes, retainedGradeConstraint]);

  useEffect(() => {
    if (
      manualClassId &&
      !manualClasses.some((row) => row.id === manualClassId)
    ) {
      setManualClassId('');
    }
  }, [manualClassId, manualClasses]);

  const columns = useMemo<ColumnDef<UnassignedPlacementItem>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type='checkbox'
            checked={allSelectedOnPage}
            onChange={(event) => {
              for (const row of items) {
                toggleStudent(row, event.target.checked);
              }
            }}
            aria-label='Chọn tất cả trang'
          />
        ),
        cell: ({ row }) => (
          <input
            type='checkbox'
            checked={selectedIds.has(row.original.studentId)}
            onChange={(event) => {
              toggleStudent(row.original, event.target.checked);
            }}
            aria-label={`Chọn ${row.original.fullName}`}
          />
        ),
      },
      { accessorKey: 'fullName', header: 'Họ tên' },
      {
        accessorKey: 'externalCode',
        header: 'Mã HS',
        cell: ({ row }) => row.original.externalCode ?? '—',
      },
      {
        accessorKey: 'reason',
        header: 'Loại',
        cell: ({ row }) => REASON_LABELS[row.original.reason],
      },
      {
        id: 'previous',
        header: 'Lớp / khối trước',
        cell: ({ row }) => {
          const item = row.original;
          if (item.reason !== 'RETAINED') {
            return <span className='text-muted-foreground'>—</span>;
          }
          return (
            <span className='text-sm'>
              {item.previousHomeroomClassCode ?? '—'}
              {item.previousGradeLevelCode
                ? ` (khối ${item.previousGradeLevelCode})`
                : ''}
              {item.previousAcademicYearName
                ? ` · ${item.previousAcademicYearName}`
                : ''}
            </span>
          );
        },
      },
    ],
    [allSelectedOnPage, items, selectedIds, toggleStudent],
  );

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Xếp lớp đầu năm</h1>
          <p className='text-sm text-muted-foreground'>
            HS chưa có lớp trong học kỳ: ở lại lớp hoặc mới lên cấp. Xếp tay,
            chia đều theo khối, hoặc import Excel (mỗi sheet một lớp).
          </p>
        </div>
        <Button type='button' variant='outline' onClick={() => setImportOpen(true)}>
          Import Excel chia lớp
        </Button>
      </div>

      <ClassPlacementImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        defaultAcademicYearId={yearId}
        defaultSemesterId={semesterId}
        onSuccess={() => {
          clearSelection();
          invalidate();
        }}
      />

      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='space-y-1.5'>
          <label className='text-sm font-medium'>Năm học</label>
          <select
            className={selectClassName}
            value={yearId}
            onChange={(event) => {
              setYearId(event.target.value);
              setSemesterId('');
              setPage(1);
              clearSelection();
            }}
          >
            <option value=''>Chọn năm học</option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
                {year.isCurrent ? ' (hiện tại)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className='space-y-1.5'>
          <label className='text-sm font-medium'>Học kỳ</label>
          <select
            className={selectClassName}
            value={semesterId}
            disabled={!yearId}
            onChange={(event) => {
              setSemesterId(event.target.value);
              setPage(1);
              clearSelection();
            }}
          >
            <option value=''>Chọn học kỳ</option>
            {(semestersQuery.data ?? []).map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.code} — {semester.name}
              </option>
            ))}
          </select>
        </div>
        <div className='space-y-1.5'>
          <label className='text-sm font-medium'>Loại HS</label>
          <select
            className={selectClassName}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value as '' | PlacementReason);
              setPage(1);
              clearSelection();
            }}
          >
            <option value=''>Tất cả</option>
            <option value='RETAINED'>Ở lại lớp</option>
            <option value='NEW_INTAKE'>Mới lên cấp</option>
          </select>
        </div>
        <div className='space-y-1.5'>
          <label className='text-sm font-medium'>Khối (lọc / chia đều)</label>
          <select
            className={selectClassName}
            value={gradeLevelId}
            onChange={(event) => {
              setGradeLevelId(event.target.value);
              setManualClassId('');
              setPage(1);
            }}
          >
            <option value=''>Tất cả / chọn khi chia đều</option>
            {(gradesQuery.data?.items ?? []).map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.code} — {grade.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
        <div className='min-w-0 flex-1 space-y-1.5'>
          <label className='text-sm font-medium'>Tìm kiếm</label>
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder='Họ tên hoặc mã HS'
          />
        </div>
        <p className='text-sm text-muted-foreground'>
          Đã chọn: {selectedIds.size}
        </p>
      </div>

      <div className='space-y-3 rounded-lg border bg-muted/30 p-4'>
        <p className='text-sm font-medium'>Xếp tay</p>
        <p className='text-sm text-muted-foreground'>
          HS ở lại chỉ được xếp vào lớp cùng khối năm trước (vd. ở lại 12 →
          chỉ lớp khối 12).
        </p>
        {retainedGradeConstraint.hasConflict ? (
          <p className='text-sm text-amber-700 dark:text-amber-400'>
            Đang chọn HS ở lại thuộc nhiều khối (
            {retainedGradeConstraint.codes.join(', ')}). Hãy xếp theo từng khối.
          </p>
        ) : null}
        <div className='flex flex-wrap items-end gap-3'>
          <div className='min-w-[200px] space-y-1.5'>
            <label className='text-sm font-medium'>Lớp đích</label>
            <select
              className={selectClassName}
              value={manualClassId}
              onChange={(event) => setManualClassId(event.target.value)}
              disabled={retainedGradeConstraint.hasConflict}
            >
              <option value=''>Chọn lớp</option>
              {manualClasses.map((homeroom) => (
                <option key={homeroom.id} value={homeroom.id}>
                  {homeroom.code} — {homeroom.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type='button'
            size='sm'
            disabled={
              selectedIds.size === 0 ||
              !manualClassId ||
              !semesterId ||
              retainedGradeConstraint.hasConflict ||
              assignMutation.isPending
            }
            onClick={() => assignMutation.mutate()}
          >
            {assignMutation.isPending
              ? 'Đang xếp…'
              : `Xếp ${selectedIds.size || ''} HS đã chọn`}
          </Button>
        </div>
      </div>

      <div className='space-y-3 rounded-lg border bg-muted/30 p-4'>
        <p className='text-sm font-medium'>Chia đều theo khối</p>
        <p className='text-sm text-muted-foreground'>
          Chọn khối trước. Nếu có HS được chọn thì chỉ chia các HS đó; không
          chọn = toàn bộ danh sách lọc hiện tại (theo loại).
        </p>
        {preview ? (
          <ul className='grid gap-1 text-sm text-muted-foreground sm:grid-cols-2'>
            <li>HS sẽ xếp: {preview.wouldAssignCount}</li>
            <li>Số lớp: {preview.classCount}</li>
            <li>Không xếp được (hết chỗ): {preview.unplacedCount}</li>
            {preview.classLoads.map((row) => (
              <li key={row.homeroomClassId}>
                {row.code}: {row.currentCount}
                {row.capacity != null ? `/${row.capacity}` : ''} → +
                {row.wouldReceive}
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-sm text-muted-foreground'>
            Chọn khối để xem trước chia đều.
          </p>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type='button'
              size='sm'
              disabled={
                !semesterId ||
                !gradeLevelId ||
                autoMutation.isPending ||
                (preview?.wouldAssignCount ?? 0) === 0
              }
            >
              {autoMutation.isPending ? 'Đang chia…' : 'Chia đều vào lớp'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Chia đều lớp?</AlertDialogTitle>
              <AlertDialogDescription>
                Hệ thống sẽ gán HS vào các lớp ACTIVE của khối đã chọn, ưu tiên
                lớp ít HS hơn và tôn trọng sức chứa. Thao tác tạo ghi danh
                ACTIVE.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => autoMutation.mutate()}
                disabled={autoMutation.isPending}
              >
                Xác nhận
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {!semesterId ? (
        <EmptyState
          title='Chọn năm học và học kỳ'
          description='Danh sách HS chưa xếp lớp theo học kỳ đích'
        />
      ) : unassignedQuery.isLoading ? (
        <LoadingState message='Đang tải danh sách chưa xếp lớp…' />
      ) : items.length === 0 ? (
        <EmptyState
          title='Không có học sinh chờ xếp lớp'
          description='Import HS (có thể bỏ mã lớp) hoặc có HS ở lại chưa ghi danh năm mới'
        />
      ) : (
        <>
          <DataTableGrid data={items} columns={columns} />
          <DataPagination
            page={unassignedQuery.data?.meta.page ?? page}
            totalPages={unassignedQuery.data?.meta.totalPages ?? 1}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
