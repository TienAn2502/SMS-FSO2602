import {
    keepPreviousData,
    useMutation,
    useQuery,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { fetchAllGradeLevels } from '@/features/grade-levels/api/grade-levels-api';
import {
    fetchAllGradeLevelSubjects,
    fetchGradeLevelSubjectsForSystemAdmin,
    getThptBgdEvaluationModeReference,
    getThptBgdTotalPeriodsReference,
    SUBJECT_EVALUATION_MODE_LABELS,
    THPT_BGD_CORE_PERIODS_REFERENCE,
    THPT_BGD_REGULATION,
    THPT_BGD_SPECIALIZED_CLUSTER_PERIODS,
    THPT_BGD_SPECIALIZED_CLUSTER_SUBJECTS,
    updateGradeLevelSubjects,
    type GradeLevelSubject,
    // type GradeLevelSubjectUpdate,
    type SubjectEvaluationMode,
} from '@/features/grade-level-subjects/api/grade-level-subjects-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { selectClassName } from '@/lib/form-styles';
import { DataPagination } from '@/components/common/data-pagination';

interface GradeLevelSubjectDraft {
    periodsPerYear: string;
    evaluationMode: SubjectEvaluationMode;
}

// Type cho API update payload
interface GradeLevelSubjectUpdatePayload {
    id: string;
    periodsPerYear?: number | null;
    evaluationMode?: SubjectEvaluationMode;
}

export function GradeLevelSubjectsPage() {
    const { session } = useAuth();
    const [gradeFilter, setGradeFilter] = useState('');
    const [page, setPage] = useState<number>(1);
    const isSystemAdmin = session?.user.role === 'SYSTEM_ADMIN';

    // baseline lưu data gốc từ BE, không thay đổi khi user nhập
    const [baseline, setBaseline] = useState<Record<string, GradeLevelSubject>>(
        {},
    );

    // draft lưu giá trị user đã sửa (bao gồm cả data gốc nếu chưa sửa)
    const [draft, setDraft] = useState<Record<string, GradeLevelSubjectDraft>>(
        {},
    );

    // Track pages đã load để merge data
    const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());

    // Current page items - chỉ dùng để render UI
    const [currentPageItems, setCurrentPageItems] = useState<
        GradeLevelSubject[]
    >([]);

    const gradesQuery = useQuery({
        queryKey: ['grade-levels', session?.activeSchoolId, 'all'],
        queryFn: fetchAllGradeLevels,
        enabled: Boolean(
            session?.activeSchoolId || session?.user.role === 'SYSTEM_ADMIN',
        ),
    });

    const listQuery = useQuery({
        queryKey: [
            'grade-level-subjects',
            session?.activeSchoolId,
            gradeFilter,
            page,
        ],
        queryFn: () =>
            isSystemAdmin
                ? fetchGradeLevelSubjectsForSystemAdmin({
                      gradeLevelId: gradeFilter || undefined,
                      page,
                  })
                : fetchAllGradeLevelSubjects(gradeFilter || undefined, page),
        enabled: Boolean(
            session?.activeSchoolId || session?.user.role === 'SYSTEM_ADMIN',
        ),
        placeholderData: keepPreviousData,
    });

    console.log('listQuery.data', listQuery.data);

    // Merge new items vào state khi data thay đổi
    useEffect(() => {
        if (listQuery.data?.items) {
            const items = listQuery.data.items;

            // Merge items vào baseline và khởi tạo draft nếu chưa có
            setBaseline((prev) => {
                const next = { ...prev };
                items.forEach((item) => {
                    // Chỉ lưu vào baseline nếu chưa có (không ghi đè data đã load)
                    if (!(item.id in next)) {
                        next[item.id] = item;
                    }
                });
                return next;
            });

            setDraft((prev) => {
                const next = { ...prev };
                items.forEach((item) => {
                    // Chỉ khởi tạo draft nếu chưa có (giữ lại draft đã sửa)
                    if (!(item.id in next)) {
                        next[item.id] = {
                            periodsPerYear:
                                item.periodsPerYear != null
                                    ? String(item.periodsPerYear)
                                    : '',
                            evaluationMode: item.evaluationMode,
                        };
                    }
                });
                return next;
            });

            // Update current page items
            setCurrentPageItems(items);

            // Track page đã load
            setLoadedPages((prev) => new Set(prev).add(page));
        }
    }, [listQuery.data, page]);

    useEffect(() => {
        console.log('baseline', baseline);
        console.log('draft', draft);
    }, [baseline, draft]);

    // Reset pagination khi filter thay đổi
    useEffect(() => {
        setPage(1);
        setBaseline({});
        setDraft({});
        setLoadedPages(new Set());
    }, [gradeFilter]);

    // Kiểm tra xem có thay đổi nào không
    const hasChanges = useMemo(() => {
        for (const id in draft) {
            const baselineItem = baseline[id];
            const draftItem = draft[id];
            if (!baselineItem) continue;

            // Check periodsPerYear
            const baselinePeriods =
                baselineItem.periodsPerYear != null
                    ? String(baselineItem.periodsPerYear)
                    : '';
            if (draftItem.periodsPerYear !== baselinePeriods) {
                return true;
            }

            // Check evaluationMode
            if (draftItem.evaluationMode !== baselineItem.evaluationMode) {
                return true;
            }
        }
        return false;
    }, [baseline, draft]);

    // Tính toán các thay đổi (dirty changes)
    const computeChanges = useCallback((): GradeLevelSubjectUpdatePayload[] => {
        const changes: GradeLevelSubjectUpdatePayload[] = [];

        for (const id in draft) {
            const baselineItem = baseline[id];
            const draftItem = draft[id];
            if (!baselineItem) continue;

            // Check periodsPerYear
            const baselinePeriods =
                baselineItem.periodsPerYear != null
                    ? String(baselineItem.periodsPerYear)
                    : '';

            let periodsPerYear: number | null | undefined = undefined;
            const periodsChanged =
                draftItem.periodsPerYear !== baselinePeriods ||
                (draftItem.periodsPerYear === '' &&
                    baselineItem.periodsPerYear != null) ||
                (draftItem.periodsPerYear !== '' &&
                    baselineItem.periodsPerYear == null);

            if (periodsChanged) {
                periodsPerYear =
                    draftItem.periodsPerYear !== ''
                        ? Number.parseInt(draftItem.periodsPerYear, 10)
                        : null;
            }

            // Check evaluationMode
            const evaluationChanged =
                draftItem.evaluationMode !== baselineItem.evaluationMode;

            // Chỉ thêm vào changes nếu có ít nhất 1 field thay đổi
            if (periodsChanged || evaluationChanged) {
                const update: GradeLevelSubjectUpdatePayload = {
                    id,
                };
                if (periodsChanged) {
                    update.periodsPerYear = periodsPerYear ?? null;
                }
                if (evaluationChanged) {
                    update.evaluationMode = draftItem.evaluationMode;
                }
                changes.push(update);
            }
        }

        return changes;
    }, [baseline, draft]);

    // Save mutation - gọi API để cập nhật
    const saveMutation = useMutation({
        mutationFn: async () => {
            const changes = computeChanges();
            if (changes.length === 0) {
                return;
            }

            // Validate periodsPerYear values before sending to API
            for (const change of changes) {
                if (
                    change.periodsPerYear !== null &&
                    change.periodsPerYear !== undefined
                ) {
                    if (
                        !Number.isInteger(change.periodsPerYear) ||
                        change.periodsPerYear < 1 ||
                        change.periodsPerYear > 999
                    ) {
                        toast.error(
                            'Số tiết/năm phải là số nguyên từ 1 đến 999',
                        );
                        throw new Error('Invalid periodsPerYear');
                    }
                }
            }

            // Log ra phần data thay đổi
            console.log('changes', changes);

            // Gọi API update
            await updateGradeLevelSubjects(changes);

            return changes;
        },
        onSuccess: (changes) => {
            toast.success(`Đã lưu ${changes?.length ?? 0} thay đổi`);
            // Sau khi save thành công, cập nhật baseline = draft
            setBaseline((prev) => {
                const next = { ...prev };
                Object.keys(draft).forEach((id) => {
                    const draftItem = draft[id];
                    const baselineItem = prev[id];
                    if (baselineItem && draftItem) {
                        next[id] = {
                            ...baselineItem,
                            periodsPerYear:
                                draftItem.periodsPerYear === ''
                                    ? null
                                    : Number.parseInt(
                                          draftItem.periodsPerYear,
                                          10,
                                      ),
                            evaluationMode: draftItem.evaluationMode,
                        };
                    }
                });
                return next;
            });
        },
        onError: () => {
            toast.error('Lưu thay đổi thất bại');
        },
    });

    // Handler để update draft
    const updateDraft = useCallback(
        (
            id: string,
            field: 'periodsPerYear' | 'evaluationMode',
            value: string | SubjectEvaluationMode,
        ) => {
            setDraft((prev) => ({
                ...prev,
                [id]: {
                    ...prev[id],
                    [field]: value,
                },
            }));
        },
        [],
    );

    // Get display value cho periodsPerYear
    const getPeriodsValue = useCallback(
        (id: string): string => {
            return draft[id]?.periodsPerYear ?? '';
        },
        [draft],
    );

    // Get display value cho evaluationMode
    const getEvaluationModeValue = useCallback(
        (id: string): SubjectEvaluationMode => {
            return draft[id]?.evaluationMode ?? 'NUMERIC';
        },
        [draft],
    );

    // Kiểm tra xem field có dirty không
    const isFieldDirty = useCallback(
        (id: string, field: 'periodsPerYear' | 'evaluationMode'): boolean => {
            const baselineItem = baseline[id];
            const draftItem = draft[id];
            if (!baselineItem || !draftItem) return false;

            if (field === 'periodsPerYear') {
                const baselineValue =
                    baselineItem.periodsPerYear != null
                        ? String(baselineItem.periodsPerYear)
                        : '';
                return draftItem.periodsPerYear !== baselineValue;
            } else {
                return draftItem.evaluationMode !== baselineItem.evaluationMode;
            }
        },
        [baseline, draft],
    );

    const grades = gradesQuery.data?.items ?? [];
    const totalPages = listQuery.data?.meta?.totalPages ?? 1;
    const totalItems = listQuery.data?.meta?.total ?? 0;

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between gap-4'>
                <div>
                    <h1 className='text-2xl font-semibold'>Môn theo khối</h1>
                    <p className='text-sm text-muted-foreground'>
                        Số tiết/năm = cốt lõi + chuyên đề (TT13/2022). Hình thức
                        đánh giá: điểm số hoặc đạt/chưa đạt (VD: Giáo dục thể
                        chất).
                    </p>
                </div>
                <Button
                    size='sm'
                    variant='outline'
                    className='h-8'
                    disabled={!hasChanges || saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                >
                    {saveMutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Cấu hình môn theo khối</CardTitle>
                    <CardDescription>
                        Seed mặc định theo {THPT_BGD_REGULATION.circular}. Admin
                        có thể điều chỉnh số tiết và hình thức đánh giá theo
                        trường. {totalItems > 0 && `(${totalItems} mục)`}
                        {hasChanges && (
                            <span className='ml-2 text-amber-600'>
                                • Có thay đổi chưa lưu
                            </span>
                        )}
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
                    ) : currentPageItems.length === 0 ? (
                        <EmptyState
                            title='Chưa có cấu hình'
                            description='Chạy seed hoặc thêm khối và môn học trước'
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className='bg-muted/50'>
                                    <TableHead>Khối</TableHead>
                                    <TableHead>Mã môn</TableHead>
                                    <TableHead>Tên môn</TableHead>
                                    <TableHead>Bắt buộc</TableHead>
                                    <TableHead>BGD (cốt lõi)</TableHead>
                                    <TableHead>+CD</TableHead>
                                    <TableHead>BGD (tổng)</TableHead>
                                    <TableHead>Số tiết/năm</TableHead>
                                    <TableHead>Hình thức đánh giá</TableHead>
                                    {isSystemAdmin && (
                                        <TableHead>Trường</TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentPageItems.map((item) => {
                                    const isDefaultSubject = Boolean(
                                        item.schoolId,
                                    );
                                    const showEditor = isSystemAdmin
                                        ? isDefaultSubject
                                        : !isDefaultSubject;
                                    const periodsDirty = isFieldDirty(
                                        item.id,
                                        'periodsPerYear',
                                    );
                                    const evalDirty = isFieldDirty(
                                        item.id,
                                        'evaluationMode',
                                    );
                                    const bgdDefault =
                                        getThptBgdTotalPeriodsReference(
                                            item.subjectCode,
                                        );

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                {item.gradeLevelCode}
                                            </TableCell>
                                            <TableCell>
                                                {item.subjectCode}
                                            </TableCell>
                                            <TableCell>
                                                {item.subjectName}
                                            </TableCell>
                                            <TableCell>
                                                {item.isRequired
                                                    ? 'Có'
                                                    : 'Tự chọn'}
                                            </TableCell>
                                            <TableCell>
                                                {THPT_BGD_CORE_PERIODS_REFERENCE[
                                                    item.subjectCode
                                                ] ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                {THPT_BGD_SPECIALIZED_CLUSTER_SUBJECTS.has(
                                                    item.subjectCode,
                                                )
                                                    ? `+${THPT_BGD_SPECIALIZED_CLUSTER_PERIODS}`
                                                    : '—'}
                                            </TableCell>
                                            <TableCell>
                                                {bgdDefault ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                {showEditor ? (
                                                    <span className='text-muted-foreground'>
                                                        {item.periodsPerYear ??
                                                            '—'}
                                                    </span>
                                                ) : (
                                                    <div className='flex items-center gap-2'>
                                                        <Input
                                                            type='number'
                                                            min={1}
                                                            max={999}
                                                            step={1}
                                                            className={`h-8 w-20 ${
                                                                periodsDirty
                                                                    ? 'border-amber-500 bg-amber-50'
                                                                    : ''
                                                            }`}
                                                            value={getPeriodsValue(
                                                                item.id,
                                                            )}
                                                            onChange={(e) => {
                                                                const value =
                                                                    e.target
                                                                        .value;
                                                                // Only allow valid integer values
                                                                if (
                                                                    value ===
                                                                        '' ||
                                                                    /^\d+$/.test(
                                                                        value,
                                                                    )
                                                                ) {
                                                                    const numValue =
                                                                        value ===
                                                                        ''
                                                                            ? ''
                                                                            : parseInt(
                                                                                  value,
                                                                                  10,
                                                                              );
                                                                    if (
                                                                        value ===
                                                                            '' ||
                                                                        (numValue >=
                                                                            1 &&
                                                                            numValue <=
                                                                                999)
                                                                    ) {
                                                                        updateDraft(
                                                                            item.id,
                                                                            'periodsPerYear',
                                                                            value,
                                                                        );
                                                                    }
                                                                }
                                                            }}
                                                            placeholder='—'
                                                        />
                                                        {bgdDefault != null &&
                                                        getPeriodsValue(
                                                            item.id,
                                                        ) === '' &&
                                                        item.periodsPerYear !==
                                                            bgdDefault ? (
                                                            <Button
                                                                size='sm'
                                                                variant='ghost'
                                                                className='h-8 text-xs'
                                                                onClick={() => {
                                                                    updateDraft(
                                                                        item.id,
                                                                        'periodsPerYear',
                                                                        String(
                                                                            bgdDefault,
                                                                        ),
                                                                    );
                                                                }}
                                                            >
                                                                BGD:{' '}
                                                                {bgdDefault}
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {showEditor ? (
                                                    <span className='text-muted-foreground'>
                                                        {SUBJECT_EVALUATION_MODE_LABELS[
                                                            item.evaluationMode
                                                        ] ?? '—'}
                                                    </span>
                                                ) : (
                                                    <div className='flex items-center gap-2'>
                                                        <select
                                                            className={`${selectClassName} h-8 min-w-36 ${
                                                                evalDirty
                                                                    ? 'border-amber-500 bg-amber-50'
                                                                    : ''
                                                            }`}
                                                            value={getEvaluationModeValue(
                                                                item.id,
                                                            )}
                                                            onChange={(e) =>
                                                                updateDraft(
                                                                    item.id,
                                                                    'evaluationMode',
                                                                    e.target
                                                                        .value as SubjectEvaluationMode,
                                                                )
                                                            }
                                                        >
                                                            {(
                                                                Object.keys(
                                                                    SUBJECT_EVALUATION_MODE_LABELS,
                                                                ) as SubjectEvaluationMode[]
                                                            ).map((mode) => (
                                                                <option
                                                                    key={mode}
                                                                    value={mode}
                                                                >
                                                                    {
                                                                        SUBJECT_EVALUATION_MODE_LABELS[
                                                                            mode
                                                                        ]
                                                                    }
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {getEvaluationModeValue(
                                                            item.id,
                                                        ) !==
                                                            getThptBgdEvaluationModeReference(
                                                                item.subjectCode,
                                                            ) && (
                                                            <Button
                                                                size='sm'
                                                                variant='ghost'
                                                                className='h-8 text-xs'
                                                                onClick={() => {
                                                                    updateDraft(
                                                                        item.id,
                                                                        'evaluationMode',
                                                                        getThptBgdEvaluationModeReference(
                                                                            item.subjectCode,
                                                                        ),
                                                                    );
                                                                }}
                                                            >
                                                                BGD
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            {isSystemAdmin && (
                                                <TableCell>
                                                    {item.schoolId ?? '—'}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            {totalPages > 1 && (
                <DataPagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
}
