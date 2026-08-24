import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { ROUTES } from '@/app/router/routes';
import { RichTextEditor } from '@/components/common/rich-text-editor';
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
import { createBlog } from '@/features/blogs/api/blogs-api';
import type { TiptapContent } from '@/features/blogs/api/blogs-api';
import { extractTempImages } from '@/features/blogs/lib/promote-blog-images';
import { getApiError } from '@/lib/api';
import { htmlToTiptapJson } from '@/lib/tiptap-converter';
import { selectClassName } from '@/lib/form-styles';
import { cn } from '@/lib/utils';
import { getStorageKey } from '@/features/blogs/utils/blogs.utils';
import { FilePurpose } from '@/features/files/api/files-api';

const createBlogSchema = z.object({
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

type CreateBlogFormValues = z.infer<typeof createBlogSchema>;

export function BlogCreatePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<CreateBlogFormValues>({
        resolver: zodResolver(createBlogSchema),
        defaultValues: {
            title: '',
            contentHtml: '',
            thumbnail: null,
            status: 'PUBLISHED',
        },
    });

    const mutation = useMutation({
        mutationFn: async (values: CreateBlogFormValues) => {
            const tempFiles = extractTempImages(values.contentHtml);
            // Convert HTML sang TiTip JSON format
            const content = htmlToTiptapJson(
                values.contentHtml,
            ) as TiptapContent;

            // Nếu có ảnh thì src sẽ có giá trị là storageKey
            const transformTipTapContent = content.content!.map((item) => {
                if (item.type !== 'image' || !item.attrs?.src) return item;

                const src = item.attrs.src as string;
                const storageKey = getStorageKey(src);
                if (storageKey) {
                    item.attrs.src = storageKey;
                }
                return item;
            });

            content.content = transformTipTapContent;
            return createBlog({
                title: values.title,
                content,
                status: values.status,
                thumbnailFileId: values.thumbnail?.fileId,
                thumbnailMimeType: values.thumbnail?.mimeType,
                tempFiles,
            });
        },
        onSuccess: (blog) => {
            void queryClient.invalidateQueries({ queryKey: ['blogs'] });
            toast.success(
                blog.status === 'PUBLISHED'
                    ? 'Đã đăng bài viết'
                    : 'Đã lưu bản nháp',
            );
            void navigate(`${ROUTES.blogs}/${blog.slug}`, {
                state: {
                    blogId: blog.id,
                },
            });
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(apiError?.message ?? 'Không thể lưu bài viết');
        },
    });

    return (
        <div className='mx-auto max-w-3xl space-y-6'>
            <div className='flex items-start justify-between gap-3'>
                <div>
                    <h1 className='text-2xl font-semibold'>Tạo bài viết</h1>
                    <p className='text-sm text-muted-foreground'>
                        Soạn thảo bài viết tin tức nhà trường
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
                        Tiêu đề và nội dung sẽ hiển thị trên danh sách tin tức
                        nhà trường
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
                                    : 'Lưu bài viết'}
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
