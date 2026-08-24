import { vi } from 'date-fns/locale';
import { ImageIcon, PlusIcon } from 'lucide-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { DataPagination } from '@/components/common/data-pagination';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchBlogs } from '@/features/blogs/api/blogs-api';
import { useRefreshImageUrls } from '@/hooks/use-refresh-image-urls';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 6;

function formatPublishedAt(value: string | null): string {
    if (!value) {
        return 'Bản nháp';
    }
    const date = new Date(value);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        locale: vi,
    });
}

function getThumbnailUrl(
    blog: { thumbnailUrl: string | null; thumbnailStorageKey: string | null },
    refreshedUrls: Map<string, string>,
    hasUrl: (key: string) => boolean,
): string | undefined {
    if (!blog.thumbnailStorageKey) return blog.thumbnailUrl;
    if (hasUrl(blog.thumbnailStorageKey)) {
        return refreshedUrls.get(blog.thumbnailStorageKey);
    }
    return blog.thumbnailUrl ?? undefined;
}

export function BlogsPage() {
    const { session } = useAuth();
    const [page, setPage] = useState(1);
    const isSchoolAdmin = session?.user.role === 'SCHOOL_ADMIN';
    const navigate = useNavigate();
    const listQuery = useQuery({
        queryKey: ['blogs', page, isSchoolAdmin],
        queryFn: () =>
            fetchBlogs({
                page,
                limit: PAGE_SIZE,
                status: isSchoolAdmin ? undefined : 'PUBLISHED',
                sortBy: 'publishedAt',
                sortOrder: 'desc',
            }),
        placeholderData: keepPreviousData,
    });

    // Collect unique thumbnail storage keys từ danh sách blogs
    const thumbnailKeys = listQuery.data?.items
        .filter((blog) => blog.thumbnailStorageKey)
        .map((blog) => blog.thumbnailStorageKey as string) ?? [];

    const { urls: refreshedUrls, hasUrl } = useRefreshImageUrls(thumbnailKeys);

    const handleNavigate = useCallback(
        (slug: string) => {
            navigate(`${ROUTES.blogs}/${slug}`);
        },
        [navigate],
    );

    const meta = listQuery.data?.meta;
    const items = listQuery.data?.items ?? [];

    return (
        <div className='space-y-6'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                    <h1 className='text-2xl font-semibold'>
                        Tin tức & thông báo
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        Bài viết công bố từ Ban Giám hiệu và các phòng ban
                    </p>
                </div>
                {isSchoolAdmin ? (
                    <Button render={<Link to={ROUTES.blogsNew} />}>
                        <PlusIcon />
                        Tạo bài viết
                    </Button>
                ) : null}
            </div>

            {listQuery.isLoading ? (
                <LoadingState message='Đang tải bài viết…' />
            ) : null}

            {!listQuery.isLoading && items.length === 0 ? (
                <EmptyState
                    title='Chưa có bài viết'
                    description={
                        isSchoolAdmin
                            ? 'Tạo bài viết đầu tiên để công bố tới toàn trường.'
                            : 'Hiện chưa có thông báo nào được công bố.'
                    }
                />
            ) : null}

            {items.length > 0 ? (
                <div className='flex flex-col gap-4'>
                    {items.map((blog) => {
                        const thumbnailUrl = getThumbnailUrl(
                            blog,
                            refreshedUrls,
                            hasUrl,
                        );
                        return (
                            <Card
                                key={blog.id}
                                className='flex flex-col overflow-hidden sm:flex-row'
                            >
                                {thumbnailUrl ? (
                                    <div className='aspect-video w-full overflow-hidden bg-muted sm:aspect-auto sm:h-auto sm:w-48 sm:shrink-0'>
                                        <img
                                            src={thumbnailUrl}
                                            alt={blog.title}
                                            className='h-full w-full object-cover'
                                        />
                                    </div>
                                ) : (
                                    <div className='flex aspect-video w-full items-center justify-center bg-muted sm:aspect-auto sm:h-auto sm:w-48 sm:shrink-0 sm:bg-muted/50'>
                                        <ImageIcon className='h-12 w-12 text-muted-foreground/30' />
                                    </div>
                                )}
                            <div className='flex flex-1 flex-col'>
                                <CardHeader className='gap-2'>
                                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                                        {isSchoolAdmin && (
                                            <span
                                                className={cn(
                                                    'rounded-md px-1.5 py-0.5 font-medium',
                                                    blog.status === 'PUBLISHED'
                                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                        : 'bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {blog.status === 'PUBLISHED'
                                                    ? 'Đã đăng'
                                                    : 'Nháp'}
                                            </span>
                                        )}
                                        <span>
                                            {formatPublishedAt(
                                                blog.publishedAt,
                                            )}
                                        </span>
                                    </div>
                                    <CardTitle className='text-lg leading-snug'>
                                        <span
                                            onClick={() =>
                                                handleNavigate(blog.slug)
                                            }
                                            className='cursor-pointer hover:underline'
                                        >
                                            {blog.title}
                                        </span>
                                    </CardTitle>
                                    <CardDescription className='line-clamp-2'>
                                        {blog.contentExcerpt}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className='mt-auto flex items-center justify-between gap-2 pt-0 text-xs text-muted-foreground'>
                                    <span>{blog.authorName}</span>
                                </CardContent>
                            </div>
                        </Card>
                        );
                    })}
                </div>
            ) : null}

            {meta && meta.totalPages > 1 ? (
                <DataPagination
                    page={meta.page}
                    totalPages={meta.totalPages}
                    onPageChange={setPage}
                />
            ) : null}
        </div>
    );
}
