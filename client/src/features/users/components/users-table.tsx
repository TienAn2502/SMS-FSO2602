import {
  type ColumnDef,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { XIcon } from 'lucide-react';

import { DataPagination } from '@/components/common/data-pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UsersTableGrid } from '@/features/users/components/users-table-grid';
import type { User } from '@/features/users/api/users-api';
import {
    getColumnFilterValue,
    hasColumnFilters,
    setColumnFilterValue,
} from '@/features/users/lib/user-table-filters';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, STATUS_LABELS } from '@/lib/labels';
import type { UserRole, UserStatus } from '@/types/api.types';

const selectClassName =
    'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';

const STATUS_BADGE_CLASS: Record<UserStatus, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    INACTIVE: 'bg-muted text-muted-foreground',
    LOCKED: 'bg-destructive/10 text-destructive',
};

interface UsersTableProps {
    data: User[];
    page: number;
    pageCount: number;
    isLoading?: boolean;
    isFetching?: boolean;
    globalFilter: string;
    onGlobalFilterChange: (value: string) => void;
    columnFilters: ColumnFiltersState;
    onColumnFiltersChange: (filters: ColumnFiltersState) => void;
    onClearFilters: () => void;
    onPageChange: (page: number) => void;
    currentUserId?: string;
    onToggleStatus: (id: string, status: UserStatus) => void;
    isStatusPending: boolean;
}

export function UsersTable({
    data,
    page,
    pageCount,
    isLoading = false,
    isFetching = false,
    globalFilter,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    onClearFilters,
    onPageChange,
    currentUserId,
    onToggleStatus,
    isStatusPending,
}: UsersTableProps) {
    const roleFilter = getColumnFilterValue<UserRole>(columnFilters, 'role');
    const statusFilter = getColumnFilterValue<UserStatus>(
        columnFilters,
        'status',
    );
    const filtersActive = hasColumnFilters(columnFilters, globalFilter);

    const columns = useMemo<ColumnDef<User>[]>(
        () => [
            {
                accessorKey: 'fullName',
                header: 'Họ tên',
            },
            {
                accessorKey: 'email',
                header: 'Email',
            },
            {
                accessorKey: 'role',
                header: 'Vai trò',
                cell: ({ row }) => (
                    <span className='inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground'>
                        {ROLE_LABELS[row.original.role]}
                    </span>
                ),
            },
            {
                accessorKey: 'status',
                header: 'Trạng thái',
                cell: ({ row }) => (
                    <span
                        className={cn(
                            'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                            STATUS_BADGE_CLASS[row.original.status],
                        )}
                    >
                        {STATUS_LABELS[row.original.status]}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: () => <span className='sr-only'>Thao tác</span>,
                cell: ({ row }) => {
                    const user = row.original;

                    if (user.id === currentUserId) {
                        return (
                            <span className='text-xs text-muted-foreground'>
                                Tài khoản của bạn
                            </span>
                        );
                    }

                    return (
                        <Button
                            variant='outline'
                            size='sm'
                            disabled={isStatusPending}
                            onClick={() =>
                                onToggleStatus(
                                    user.id,
                                    user.status === 'ACTIVE'
                                        ? 'LOCKED'
                                        : 'ACTIVE',
                                )
                            }
                        >
                            {user.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                        </Button>
                    );
                },
            },
        ],
        [currentUserId, isStatusPending, onToggleStatus],
    );

    const handleRoleChange = (value: string) => {
        onColumnFiltersChange(
            setColumnFilterValue(columnFilters, 'role', value || undefined),
        );
    };

    const handleStatusChange = (value: string) => {
        onColumnFiltersChange(
            setColumnFilterValue(columnFilters, 'status', value || undefined),
        );
    };

    const clearFilters = () => {
        onClearFilters();
    };

    return (
        <div className='space-y-4'>
            {/* Filters */}
            <div className='rounded-lg border border-border bg-muted/30 p-4'>
                <p className='mb-3 text-sm font-medium'>Bộ lọc</p>
                <div className='flex flex-col gap-3 lg:flex-row lg:items-end'>
                    <div className='grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                        <div className='space-y-1.5 sm:col-span-2 lg:col-span-1'>
                            <Label htmlFor='user-search'>Tìm kiếm</Label>
                            <Input
                                id='user-search'
                                placeholder='Email hoặc họ tên...'
                                value={globalFilter}
                                onChange={(event) =>
                                    onGlobalFilterChange(event.target.value)
                                }
                            />
                        </div>
                        <div className='space-y-1.5'>
                            <Label htmlFor='user-role-filter'>Vai trò</Label>
                            <select
                                id='user-role-filter'
                                className={selectClassName}
                                value={roleFilter ?? ''}
                                onChange={(event) =>
                                    handleRoleChange(event.target.value)
                                }
                            >
                                <option value=''>Tất cả vai trò</option>
                                {(Object.keys(ROLE_LABELS) as UserRole[]).map(
                                    (role) => (
                                        <option key={role} value={role}>
                                            {ROLE_LABELS[role]}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>
                        <div className='space-y-1.5'>
                            <Label htmlFor='user-status-filter'>
                                Trạng thái
                            </Label>
                            <select
                                id='user-status-filter'
                                className={selectClassName}
                                value={statusFilter ?? ''}
                                onChange={(event) =>
                                    handleStatusChange(event.target.value)
                                }
                            >
                                <option value=''>Tất cả trạng thái</option>
                                {(
                                    Object.keys(STATUS_LABELS) as UserStatus[]
                                ).map((status) => (
                                    <option key={status} value={status}>
                                        {STATUS_LABELS[status]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <Button
                        type='button'
                        variant='outline'
                        className='shrink-0'
                        disabled={!filtersActive}
                        onClick={clearFilters}
                    >
                        <XIcon className='size-4' />
                        Xóa bộ lọc
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className='relative rounded-lg border border-border'>
                {isFetching && !isLoading ? (
                    <div className='absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]'>
                        <LoadingState message='Đang tải dữ liệu...' />
                    </div>
                ) : null}

                {isLoading ? (
                    <LoadingState message='Đang tải danh sách...' />
                ) : !filtersActive && data.length === 0 ? (
                    <EmptyState
                        title='Chưa có người dùng'
                        description='Thêm người dùng đầu tiên cho trường của bạn'
                    />
                ) : (
                    <UsersTableGrid data={data} columns={columns} />
                )}
            </div>

            {!isLoading && (data.length > 0 || filtersActive) ? (
                <DataPagination
                    page={page}
                    totalPages={pageCount}
                    onPageChange={onPageChange}
                />
            ) : null}
        </div>
    );
}
