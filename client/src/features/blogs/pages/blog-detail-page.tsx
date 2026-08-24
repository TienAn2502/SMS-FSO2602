import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';

import { ROUTES } from '@/app/router/routes';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { fetchBlogBySlug } from '@/features/blogs/api/blogs-api';
import { cn } from '@/lib/utils';
import { tiptapJsonToHtml } from '@/lib/tiptap-converter';

export function BlogDetailPage() {
    const { slug } = useParams<{ id: string; slug: string }>();
    const { session } = useAuth();
    const isSchoolAdmin = session?.user.role === 'SCHOOL_ADMIN';

    const detailQuery = useQuery({
        queryKey: ['blogs', slug],
        queryFn: () => fetchBlogBySlug(slug!),
        enabled: Boolean(slug),
    });

    const blog = detailQuery.data;

    const blogContent = tiptapJsonToHtml(blog?.content ?? {});

    const wasEditedAfterPublish =
        blog?.publishedAt && blog?.updatedAt
            ? new Date(blog.updatedAt) > new Date(blog.publishedAt)
            : false;

    if (detailQuery.isLoading) {
        return <LoadingState message='Đang tải bài viết…' />;
    }

    if (!blog) {
        return (
            <div className='space-y-4'>
                <EmptyState
                    title='Không tìm thấy bài viết'
                    description='Bài viết không tồn tại hoặc đã bị xóa.'
                />
                <Button variant='outline' render={<Link to={ROUTES.blogs} />}>
                    Về danh sách
                </Button>
            </div>
        );
    }

    if (blog.status === 'DRAFT' && !isSchoolAdmin) {
        return (
            <div className='space-y-4'>
                <EmptyState
                    title='Bài viết chưa công bố'
                    description='Chỉ quản trị trường mới xem được bản nháp.'
                />
                <Button variant='outline' render={<Link to={ROUTES.blogs} />}>
                    Về danh sách
                </Button>
            </div>
        );
    }

    return (
        <div className='mx-auto max-w-5xl space-y-6'>
            <div className='flex items-center justify-between gap-3'>
                <Button
                    variant='outline'
                    size='sm'
                    render={<Link to={ROUTES.blogs} />}
                >
                    ← Danh sách
                </Button>
                <div className='flex items-center gap-3'>
                    {isSchoolAdmin && (
                        <span
                            className={cn(
                                'rounded-md px-1.5 py-0.5 text-xs font-medium',
                                blog.status === 'PUBLISHED'
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-muted text-muted-foreground',
                            )}
                        >
                            {blog.status === 'PUBLISHED' ? 'Đã đăng' : 'Nháp'}
                        </span>
                    )}
                    {isSchoolAdmin && (
                        <Button
                            variant='outline'
                            size='sm'
                            render={
                                <Link
                                    to={`${ROUTES.blogs}/${blog.slug}/edit`}
                                />
                            }
                        >
                            Chỉnh sửa
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader className='gap-3'>
                    <CardTitle className='text-2xl leading-snug'>
                        {blog.title}
                    </CardTitle>
                    <div className='flex flex-col gap-1 text-sm text-muted-foreground'>
                        <div className='flex flex-wrap gap-x-3 gap-y-1'>
                            <span>{blog.authorName}</span>
                            {blog.publishedAt && (
                                <span>
                                    {format(
                                        parseISO(blog.publishedAt),
                                        'dd/MM/yyyy HH:mm',
                                        {
                                            locale: vi,
                                        },
                                    )}
                                </span>
                            )}
                        </div>
                        {wasEditedAfterPublish && blog.updatedAt ? (
                            <span className='text-xs'>
                                Cập nhật lúc{' '}
                                {format(
                                    parseISO(blog.updatedAt),
                                    'dd/MM/yyyy HH:mm',
                                    {
                                        locale: vi,
                                    },
                                )}
                            </span>
                        ) : null}
                    </div>
                </CardHeader>
                <CardContent>
                    <div
                        className='prose prose-sm max-w-none dark:prose-invert [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_ul]:list-disc [&_img]:rounded-lg'
                        dangerouslySetInnerHTML={{ __html: blogContent ?? '' }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
