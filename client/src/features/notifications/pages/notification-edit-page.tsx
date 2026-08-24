import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { useState, useMemo } from 'react';

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
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThumbnailUpload } from '@/components/tiptap-ui/thumbnail-upload/thumbnail-upload';
import type { ThumbnailUploadValue } from '@/components/tiptap-ui/thumbnail-upload/thumbnail-upload';
import {
    fetchNotificationBySlug,
    updateNotification,
} from '@/features/notifications/api/notification-api';
import type { NotificationRoomType } from '@/features/notifications/api/notification-api';
import type { NotificationRoom as AuthNotificationRoom } from '@/features/auth/types';
import { getApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { selectClassName } from '@/lib/form-styles';
import { FilePurpose } from '@/features/files/api/files-api';
import { useRefreshImageUrls } from '@/hooks/use-refresh-image-urls';
import { refreshNotificationUrls } from '@/features/notifications/api/notification-api';
import { htmlToTiptapJson, tiptapJsonToHtml } from '@/lib/tiptap-converter';
import type { TiptapContent } from '@/features/blogs/types';
import { extractTempImages } from '@/features/blogs/lib/promote-blog-images';
import { getStorageKey } from '@/features/blogs/utils/blogs.utils';
import { useAuth } from '@/features/auth/hooks/use-auth';

const updateNotificationSchema = z.object({
    title: z.string().trim().min(1, 'Tiêu đề là bắt buộc').max(200),
    contentHtml: z
        .string()
        .refine(
            (value) => value.replace(/<[^>]+>/g, '').trim().length > 0,
            'Nội dung là bắt buộc',
        ),
    thumbnail: z.custom<ThumbnailUploadValue | null>().nullable().optional(),
    type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']),
});

type UpdateNotificationFormValues = z.infer<typeof updateNotificationSchema>;

const ROOM_TYPE_LABELS: Record<NotificationRoomType, string> = {
    SCHOOL: 'Toàn trường',
    HOMEROOM: 'Lớp chủ nhiệm',
    GRADE: 'Khối lớp',
    COURSE: 'Môn học',
};

interface RoomGroup {
    type: NotificationRoomType;
    label: string;
    rooms: AuthNotificationRoom[];
}

export function NotificationEditPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [selectedRooms, setSelectedRooms] = useState<AuthNotificationRoom[]>(
        [],
    );
    const { socketInfo } = useAuth();

    const notificationQuery = useQuery({
        queryKey: ['notifications', 'slug', slug],
        queryFn: () => fetchNotificationBySlug(slug!),
        enabled: Boolean(slug),
    });

    const availableRooms = useMemo((): AuthNotificationRoom[] => {
        return socketInfo?.notificationRooms ?? [];
    }, [socketInfo]);

    // Refresh thumbnail URL
    const thumbnailKeys = notificationQuery.data?.thumbnailStorageKey
        ? [notificationQuery.data.thumbnailStorageKey]
        : [];
    const { urls: refreshedUrls, hasUrl } = useRefreshImageUrls(thumbnailKeys, {
        refreshFn: refreshNotificationUrls,
    });

    const thumbnailUrl =
        notificationQuery.data?.thumbnailStorageKey &&
        hasUrl(notificationQuery.data.thumbnailStorageKey)
            ? refreshedUrls.get(notificationQuery.data.thumbnailStorageKey)
            : notificationQuery.data?.thumbnailUrl;

    const groupedRooms = useMemo((): RoomGroup[] => {
        const groups: Record<NotificationRoomType, AuthNotificationRoom[]> = {
            SCHOOL: [],
            HOMEROOM: [],
            GRADE: [],
            COURSE: [],
        };

        availableRooms.forEach((room) => {
            const type = room.room
                .split(':')[0]
                .toUpperCase() as NotificationRoomType;
            if (groups[type]) {
                groups[type].push(room);
            }
        });

        return Object.entries(groups)
            .filter(([, rooms]) => rooms.length > 0)
            .map(([type, rooms]) => ({
                type: type as NotificationRoomType,
                label: ROOM_TYPE_LABELS[type as NotificationRoomType] ?? type,
                rooms,
            }));
    }, [availableRooms]);

    const toggleRoom = (room: AuthNotificationRoom) => {
        setSelectedRooms((prev) => {
            const exists = prev.some((r) => r.room === room.room);
            if (exists) {
                return prev.filter((r) => r.room !== room.room);
            }
            return [...prev, room];
        });
    };

    const selectAllInGroup = (group: RoomGroup, select: boolean) => {
        setSelectedRooms((prev) => {
            if (select) {
                const newRooms = group.rooms.filter(
                    (r) => !prev.some((p) => p.room === r.room),
                );
                return [...prev, ...newRooms];
            }
            return prev.filter(
                (r) => !group.rooms.some((g) => g.room === r.room),
            );
        });
    };

    const isAllSelectedInGroup = (group: RoomGroup): boolean => {
        return group.rooms.every((r) =>
            selectedRooms.some((s) => s.room === r.room),
        );
    };

    const isSomeSelectedInGroup = (group: RoomGroup): boolean => {
        const selected = group.rooms.filter((r) =>
            selectedRooms.some((s) => s.room === r.room),
        );
        return selected.length > 0 && selected.length < group.rooms.length;
    };

    const notificationContent = notificationQuery.data?.content
        ? tiptapJsonToHtml(notificationQuery?.data.content)
        : '';

    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<UpdateNotificationFormValues>({
        resolver: zodResolver(updateNotificationSchema),
        values: notificationQuery.data
            ? {
                  title: notificationQuery.data.title,
                  contentHtml: notificationContent,
                  thumbnail: thumbnailUrl
                      ? {
                            url: thumbnailUrl,
                            fileId: '',
                            mimeType: '',
                        }
                      : null,
                  type: notificationQuery.data.type,
              }
            : undefined,
    });

    const mutation = useMutation({
        mutationFn: async (values: UpdateNotificationFormValues) => {
            if (selectedRooms.length === 0) {
                throw new Error('Vui lòng chọn ít nhất một phòng');
            }

            const tempFiles = extractTempImages(values.contentHtml);
            const content = htmlToTiptapJson(
                values.contentHtml,
            ) as TiptapContent;

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

            const rooms = selectedRooms.map((room) => {
                const [type, targetId] = room.room.split(':');
                return {
                    roomType: type.toUpperCase() as NotificationRoomType,
                    targetId: targetId || null,
                };
            });

            // 1. Lấy tất cả storageKey từ content CŨ (trong DB)
            const oldImageKeys = new Set(
                notificationQuery
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
                values.thumbnail?.url !== notificationQuery.data?.thumbnailUrl;

            return updateNotification(slug!, {
                title: values.title,
                content,
                type: values.type,
                thumbnailFileId: values.thumbnail?.fileId || undefined,
                thumbnailMimeType: values.thumbnail?.mimeType || undefined,
                tempFiles,
                fileNeedToDelete: imagesNeedToDelete,
                rooms,
                ...(deleteOldThumbnailCondition
                    ? {
                          thumbnailNeedToDelete: getStorageKey(
                              notificationQuery.data?.thumbnailUrl || '',
                          ),
                      }
                    : {}),
            });
        },
        onSuccess: () => {
            toast.success('Đã cập nhật thông báo');
            void navigate(ROUTES.notifications);
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(apiError?.message ?? 'Không thể cập nhật thông báo');
        },
    });

    if (notificationQuery.isLoading) {
        return <LoadingState />;
    }

    if (notificationQuery.isError) {
        return (
            <ErrorState
                message='Không tải được thông báo'
                onRetry={() => void notificationQuery.refetch()}
            />
        );
    }

    return (
        <div className='mx-auto max-w-3xl space-y-6'>
            <div className='flex items-start justify-between gap-3'>
                <div>
                    <h1 className='text-2xl font-semibold'>
                        Chỉnh sửa thông báo
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        Cập nhật nội dung thông báo
                    </p>
                </div>
                <Button
                    variant='outline'
                    render={<Link to={ROUTES.notifications} />}
                >
                    Quay lại
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Thông tin thông báo</CardTitle>
                    <CardDescription>
                        Cập nhật tiêu đề và nội dung thông báo
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
                            <Label htmlFor='type'>Loại thông báo</Label>
                            <select
                                id='type'
                                className={cn(selectClassName)}
                                {...register('type')}
                            >
                                <option value='INFO'>Thông tin</option>
                                <option value='SUCCESS'>Thành công</option>
                                <option value='WARNING'>Cảnh báo</option>
                                <option value='ERROR'>Lỗi</option>
                            </select>
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
                                        purpose='NOTIFICATION_THUMBNAIL'
                                    />
                                )}
                            />
                            <p className='text-xs text-muted-foreground'>
                                Kéo thả hoặc chọn ảnh để làm thumbnail cho thông
                                báo
                            </p>
                        </div>

                        {/* Room Selection */}
                        <div className='space-y-2'>
                            <Label>Chọn phòng nhận thông báo</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <button
                                            type='button'
                                            className={cn(
                                                selectClassName,
                                                'w-full justify-start text-left h-10',
                                            )}
                                        >
                                            {selectedRooms.length === 0 ? (
                                                <span className='text-muted-foreground'>
                                                    Chọn phòng...
                                                </span>
                                            ) : (
                                                <span className='truncate'>
                                                    {selectedRooms.length} phòng
                                                    đã chọn
                                                </span>
                                            )}
                                        </button>
                                    }
                                />
                                <DropdownMenuContent className='w-80 max-h-96 overflow-y-auto'>
                                    {groupedRooms.map((group) => (
                                        <DropdownMenuGroup key={group.type}>
                                            <DropdownMenuLabel className='flex items-center gap-2 py-2'>
                                                <input
                                                    type='checkbox'
                                                    className='accent-primary size-4 rounded'
                                                    checked={isAllSelectedInGroup(
                                                        group,
                                                    )}
                                                    ref={(el) => {
                                                        if (el)
                                                            el.indeterminate =
                                                                isSomeSelectedInGroup(
                                                                    group,
                                                                );
                                                    }}
                                                    onChange={() =>
                                                        selectAllInGroup(
                                                            group,
                                                            !isAllSelectedInGroup(
                                                                group,
                                                            ),
                                                        )
                                                    }
                                                />
                                                <span className='flex-1'>
                                                    {group.label}
                                                </span>
                                                <span className='text-xs text-muted-foreground'>
                                                    ({group.rooms.length})
                                                </span>
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {group.rooms.map((room) => (
                                                <DropdownMenuCheckboxItem
                                                    key={room.room}
                                                    checked={selectedRooms.some(
                                                        (r) =>
                                                            r.room ===
                                                            room.room,
                                                    )}
                                                    onCheckedChange={() =>
                                                        toggleRoom(room)
                                                    }
                                                    className='ml-6'
                                                >
                                                    <span className='truncate'>
                                                        {room.display}
                                                    </span>
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuGroup>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Selected rooms preview */}
                            {selectedRooms.length > 0 && (
                                <div className='flex flex-wrap gap-1.5 pt-2'>
                                    {selectedRooms.slice(0, 6).map((room) => (
                                        <span
                                            key={room.room}
                                            className={cn(
                                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                                                'bg-primary/10 text-primary',
                                            )}
                                        >
                                            <span className='font-medium'>
                                                {room.display}
                                            </span>
                                            <button
                                                type='button'
                                                onClick={() => toggleRoom(room)}
                                                className='ml-0.5 hover:text-destructive'
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                    {selectedRooms.length > 6 && (
                                        <span className='inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'>
                                            +{selectedRooms.length - 6} khác
                                        </span>
                                    )}
                                </div>
                            )}
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
                                        placeholder='Soạn nội dung thông báo…'
                                        purpose={FilePurpose.NOTIFICATION_IMAGE}
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
                                disabled={
                                    isSubmitting ||
                                    mutation.isPending ||
                                    selectedRooms.length === 0
                                }
                            >
                                {mutation.isPending
                                    ? 'Đang lưu…'
                                    : 'Lưu thay đổi'}
                            </Button>
                            <Button
                                type='button'
                                variant='outline'
                                render={<Link to={ROUTES.notifications} />}
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
