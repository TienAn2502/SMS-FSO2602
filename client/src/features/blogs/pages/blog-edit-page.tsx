import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { ROUTES } from '@/app/router/routes';
import { RichTextEditor } from '@/components/common/rich-text-editor';
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
import { ThumbnailUpload } from '@/components/tiptap-ui/thumbnail-upload/thumbnail-upload';
import type { ThumbnailUploadValue } from '@/components/tiptap-ui/thumbnail-upload/thumbnail-upload';
import { fetchBlogBySlug, updateBlog } from '@/features/blogs/api/blogs-api';
import type { TiptapContent } from '@/features/blogs/api/blogs-api';
import { extractTempImages } from '@/features/blogs/lib/promote-blog-images';
import { getApiError } from '@/lib/api';
import { htmlToTiptapJson, tiptapJsonToHtml } from '@/lib/tiptap-converter';
import { selectClassName } from '@/lib/form-styles';
import { cn } from '@/lib/utils';
import { useRefreshImageUrls } from '@/hooks/use-refresh-image-urls';
import { getStorageKey } from '@/features/blogs/utils/blogs.utils';
import { FilePurpose } from '@/features/files/api/files-api';

const updateBlogSchema = z.object({
    title: z.string().trim().min(1, 'Tiêu đề là bắt buộc').max(200),
    contentHtml: z
        .string()
        .refine(
            (value) => value.replace(/<[^>]+>/g, '').trim().length > 0,
            'Nội dung là bắt buộc',
        ),
    thumbnail: z.custom<ThumbnailUploadValue | null>().nullable().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']),
});

type UpdateBlogFormValues = z.infer<typeof updateBlogSchema>;

export function BlogEditPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const blogQuery = useQuery({
        queryKey: ['blogs', slug],
        queryFn: () => fetchBlogBySlug(slug!),
        enabled: Boolean(slug),
    });

    // Auto-refresh thumbnail URL for form
    const thumbnailKeys = blogQuery.data?.thumbnailStorageKey
        ? [blogQuery.data.thumbnailStorageKey]
        : [];
    const { urls: refreshedUrls, hasUrl } = useRefreshImageUrls(thumbnailKeys);

    // Get refreshed thumbnail URL or fallback to original
    const thumbnailUrl =
        blogQuery.data?.thumbnailStorageKey &&
        hasUrl(blogQuery.data.thumbnailStorageKey)
            ? refreshedUrls.get(blogQuery.data.thumbnailStorageKey)
            : blogQuery.data?.thumbnailUrl;

    // Convert TiTip JSON to HTML for form editor
    const editorContent = blogQuery.data?.content
        ? tiptapJsonToHtml(blogQuery.data.content)
        : '';

    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<UpdateBlogFormValues>({
        resolver: zodResolver(updateBlogSchema),
        values: blogQuery.data
            ? {
                  title: blogQuery.data.title,
                  contentHtml: editorContent,
                  thumbnail: thumbnailUrl
                      ? {
                            url: thumbnailUrl,
                            fileId: '',
                            mimeType: '',
                        }
                      : null,
                  status: blogQuery.data.status,
              }
            : undefined,
    });

    const mutation = useMutation({
        mutationFn: async (values: UpdateBlogFormValues) => {
            const tempFiles = extractTempImages(values.contentHtml);
            // Convert HTML sang TiTip JSON format
            const content = htmlToTiptapJson(
                values.contentHtml,
            ) as TiptapContent;

            // 1. Lấy tất cả storageKey từ content CŨ (trong DB)
            const oldImageKeys = new Set(
                blogQuery
                    .data!.content!.content.filter(
                        (item) => item.type === 'image',
                    )
                    .map((item) => item.attrs!.src as string),
            );
            // 2. Lấy tất cả storageKey từ content MỚI (user gửi lên)
            const newImageKeys = new Set(
                content!
                    .content!.filter((item) => item.type === 'image')
                    .map((item) => item.attrs!.src as string),
            );
            // 3. So sánh: file cũ không có trong content mới → cần xóa
            const imagesNeedToDelete = [...oldImageKeys]
                .filter((key) => !newImageKeys.has(key))
                .map((key) => getStorageKey(key));

            const deleteOldThumbnailCondition =
                values.thumbnail?.url !== blogQuery.data?.thumbnailUrl;

            content.content?.map((item) => {
                if (item.type !== 'image' || !item.attrs?.src) return item;

                const src = item.attrs.src as string;
                const storageKey = getStorageKey(src);
                if (storageKey) {
                    item.attrs.src = storageKey;
                }
            });

            return updateBlog(slug!, {
                title: values.title,
                content,
                status: values.status,
                thumbnailFileId: values.thumbnail?.fileId || undefined,
                thumbnailMimeType: values.thumbnail?.mimeType || undefined,
                tempFiles,
                fileNeedToDelete: imagesNeedToDelete,
                ...(deleteOldThumbnailCondition
                    ? {
                          thumbnailNeedToDelete: getStorageKey(
                              blogQuery.data?.thumbnailUrl || '',
                          ),
                      }
                    : {}),
            });
        },
        onSuccess: (post) => {
            void queryClient.invalidateQueries({ queryKey: ['blogs'] });
            toast.success('Cập nhật bài viết thành công');
            void navigate(`${ROUTES.blogs}/${post.slug}`);
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(apiError?.message ?? 'Không thể cập nhật bài viết');
        },
    });

    if (blogQuery.isLoading) {
        return <LoadingState />;
    }

    if (blogQuery.isError) {
        return (
            <ErrorState
                message='Không tải được bài viết'
                onRetry={() => void blogQuery.refetch()}
            />
        );
    }

    return (
        <div className='mx-auto max-w-3xl space-y-6'>
            <div className='flex items-start justify-between gap-3'>
                <div>
                    <h1 className='text-2xl font-semibold'>
                        Chỉnh sửa bài viết
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        Cập nhật nội dung bài viết
                    </p>
                </div>
                <Button variant='outline' render={<Link to={ROUTES.blogs} />}>
                    Quay lại
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Thông tin bài viết</CardTitle>
                    <CardDescription>
                        Cập nhật tiêu đề và nội dung bài viết
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        className='space-y-4'
                        onSubmit={handleSubmit((values) => {
                            mutation.mutate(values);
                        })}
                    >
                        <div className='space-y-2'>
                            <Label htmlFor='title'>Tiêu đề</Label>
                            <Input
                                id='title'
                                placeholder='VD: Thông báo nghỉ lễ…'
                                aria-invalid={Boolean(errors.title)}
                                {...register('title')}
                            />
                            {errors.title ? (
                                <p className='text-sm text-destructive'>
                                    {errors.title.message}
                                </p>
                            ) : null}
                        </div>

                        <div className='space-y-2'>
                            <Label>Ảnh thumbnail</Label>
                            <Controller
                                name='thumbnail'
                                control={control}
                                render={({ field }) => (
                                    <ThumbnailUpload
                                        value={field.value?.url}
                                        onChange={(value) =>
                                            field.onChange(value)
                                        }
                                    />
                                )}
                            />
                            <p className='text-xs text-muted-foreground'>
                                Kéo thả hoặc chọn ảnh để làm thumbnail cho bài
                                viết
                            </p>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='status'>Trạng thái</Label>
                            <select
                                id='status'
                                className={cn(selectClassName)}
                                {...register('status')}
                            >
                                <option value='PUBLISHED'>Đăng ngay</option>
                                <option value='DRAFT'>Lưu nháp</option>
                            </select>
                        </div>

                        <div className='space-y-2'>
                            <Label>Nội dung</Label>
                            <Controller
                                name='contentHtml'
                                control={control}
                                render={({ field }) => (
                                    <RichTextEditor
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder='Soạn nội dung bài viết…'
                                        purpose={FilePurpose.BLOG_IMAGE}
                                    />
                                )}
                            />
                            {errors.contentHtml ? (
                                <p className='text-sm text-destructive'>
                                    {errors.contentHtml.message}
                                </p>
                            ) : null}
                        </div>

                        <div className='flex gap-2'>
                            <Button
                                type='submit'
                                disabled={isSubmitting || mutation.isPending}
                            >
                                {mutation.isPending
                                    ? 'Đang lưu…'
                                    : 'Lưu thay đổi'}
                            </Button>
                            <Button
                                type='button'
                                variant='outline'
                                render={<Link to={ROUTES.blogs} />}
                            >
                                Hủy
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
