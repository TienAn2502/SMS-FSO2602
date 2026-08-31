import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatRelativeTime } from '@/features/notifications/utils';
import { useNavigate } from 'react-router';
import Test1 from '@/features/notifications/components/direct-notification-item';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    getUserInRoom,
    readNotification,
} from '@/features/notifications/api/notification-api';

interface IProps {
    notification: any;
    students: any[]; // Đây là danh sách các con được truyền từ cachedChildren sang
    suffix: string;
    setIsDropDownOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const prefix = '/portal/my-children';

const NotificationWithChildSelector = (props: IProps) => {
    const { notification, suffix, students, setIsDropDownOpen } = props;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();
    const { mutate: handleReadNotification } = useMutation({
        mutationFn: readNotification,
    });

    const studentUserIds = students?.map((student) => student.student.userId);
    const roomId = `${notification.rooms[0].roomType.toLowerCase()}:${notification.rooms[0].targetId}`;

    const { data: studentInRoom } = useQuery({
        queryKey: ['usersInRoom', roomId, studentUserIds],

        queryFn: () => getUserInRoom(roomId, studentUserIds),

        enabled:
            !!roomId &&
            Array.isArray(studentUserIds) &&
            studentUserIds.length > 0,
    });

    const userIdToStudentIdMap = new Map();
    students.forEach((student) =>
        userIdToStudentIdMap.set(student.student.userId, student.student.id),
    );

    if (!studentInRoom) {
        return null;
    }

    // Nếu có 1 con thì bấm thông báo sẽ ra luôn
    if (studentInRoom!.length <= 1) {
        return (
            <Test1
                url={`${prefix}/${userIdToStudentIdMap.get(studentInRoom[0])}/${suffix}`}
                notification={notification}
            />
        );
    }

    // Các con hiện tại có trong room của thông báo này không
    for (const userId of userIdToStudentIdMap.keys()) {
        // Nếu userId không nằm trong studentInRoom thì xóa khỏi Map
        if (!studentInRoom.includes(userId)) {
            userIdToStudentIdMap.delete(userId);
        }
    }

    const handleClick = () => {
        setIsModalOpen(true); // Bật Dialog chọn con lên
    };

    const handleSelectStudent = (studentId: string) => {
        setIsModalOpen(false);
        navigate(`${prefix}/${studentId}/${suffix}`);
    };

    return (
        <>
            <div
                key={notification.id}
                onClick={handleClick}
                className='block px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors'
            >
                <div className='flex items-start gap-3'>
                    <span
                        className={cn(
                            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                            ' bg-blue-500',
                        )}
                    />

                    <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm'>{notification.title}</p>

                        <p className='mt-0.5 truncate text-xs text-muted-foreground'>
                            {notification.createdByName || 'Ban Giám hiệu'}
                        </p>

                        <p className='mt-0.5 text-xs text-muted-foreground'>
                            {formatRelativeTime(notification.createdAt)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Dialog hiển thị danh sách các con khi phụ huynh có >= 2 con */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>Chọn học sinh để xem điểm</DialogTitle>
                    </DialogHeader>
                    <div className='space-y-2 py-4'>
                        {students?.map((item: any) => {
                            const student = item.student;
                            return (
                                <div
                                    key={student.id}
                                    onClick={() => {
                                        handleSelectStudent(
                                            userIdToStudentIdMap.get(
                                                student.userId,
                                            ),
                                        );

                                        if (!notification.isRead) {
                                            handleReadNotification(
                                                notification.id,
                                            );
                                        }

                                        setIsDropDownOpen(false);
                                    }}
                                    className='flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors'
                                >
                                    <div>
                                        <p className='font-medium text-sm'>
                                            {student?.fullName}
                                        </p>
                                        <p className='text-xs text-muted-foreground'>
                                            Lớp:{' '}
                                            {student.currentEnrollment
                                                ?.homeroomClassName ||
                                                'Chưa cập nhật'}
                                        </p>
                                    </div>
                                    <span className='text-xs font-semibold text-blue-600 dark:text-blue-400'>
                                        Xem điểm &rarr;
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default NotificationWithChildSelector;
