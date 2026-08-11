import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { ROUTES } from '@/app/router/routes';
import { ProvisionLoginAccountSection } from '@/components/common/provision-login-account-section';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createTeacherUser,
  fetchTeacher,
  updateTeacher,
} from '@/features/teachers/api/teachers-api';
import { fetchTeacherTeachingAssignments } from '@/features/teaching-assignments/api/teaching-assignments-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { ACADEMIC_STATUS_LABELS } from '@/lib/labels';

const profileSchema = z.object({
  fullName: z.string().trim().min(1),
  dateOfBirth: z.string().optional(),
  specialization: z.string().optional(),
  phone: z.string().optional(),
});

export function TeacherDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const teacherQuery = useQuery({
    queryKey: ['teachers', id],
    queryFn: () => fetchTeacher(id),
    enabled: Boolean(id),
  });

  const assignmentsQuery = useQuery({
    queryKey: ['teaching-assignments', 'teacher', id],
    queryFn: () => fetchTeacherTeachingAssignments(id, { limit: 50 }),
    enabled: Boolean(id),
  });

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: teacherQuery.data?.fullName ?? '',
      dateOfBirth: teacherQuery.data?.dateOfBirth ?? '',
      specialization: teacherQuery.data?.specialization ?? '',
      phone: teacherQuery.data?.phone ?? '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: z.infer<typeof profileSchema>) =>
      updateTeacher(id, {
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth || null,
        specialization: values.specialization || undefined,
        phone: values.phone || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teachers', id] });
      toast.success('Cập nhật hồ sơ thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'));
    },
  });

  const createUserMutation = useMutation({
    mutationFn: () => createTeacherUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teachers', id] });
      toast.success('Cấp tài khoản thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Cấp tài khoản thất bại'));
    },
  });

  if (teacherQuery.isLoading) return <LoadingState />;
  if (teacherQuery.isError || !teacherQuery.data) {
    return (
      <ErrorState
        message='Không tải được hồ sơ giáo viên'
        onRetry={() => void teacherQuery.refetch()}
      />
    );
  }

  const teacher = teacherQuery.data;

  return (
    <div className='space-y-6'>
      <div>
        <Link
          to={ROUTES.teachers}
          className='text-sm text-muted-foreground hover:text-foreground'
        >
          ← Danh sách giáo viên
        </Link>
        <h1 className='mt-2 text-2xl font-semibold'>{teacher.fullName}</h1>
        <p className='text-sm text-muted-foreground'>
          {ACADEMIC_STATUS_LABELS[teacher.status]}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hồ sơ</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <form
            className='space-y-4'
            onSubmit={profileForm.handleSubmit((values) => updateMutation.mutate(values))}
          >
            <div className='space-y-2'>
              <Label>Họ tên</Label>
              <Input {...profileForm.register('fullName')} />
            </div>
            <div className='space-y-2'>
              <Label>Ngày sinh</Label>
              <Input type='date' {...profileForm.register('dateOfBirth')} />
            </div>
            <div className='space-y-2'>
              <Label>Chuyên môn</Label>
              <Input {...profileForm.register('specialization')} />
            </div>
            <div className='space-y-2'>
              <Label>SĐT</Label>
              <Input {...profileForm.register('phone')} />
            </div>
            <Button type='submit' disabled={updateMutation.isPending}>
              Lưu hồ sơ
            </Button>
          </form>

          <ProvisionLoginAccountSection
            loginCode={teacher.externalCode}
            hasAccount={Boolean(teacher.userId)}
            passwordHint='mã GV + ngày sinh (YYYYMMDD)'
            onProvision={() => createUserMutation.mutate()}
            isPending={createUserMutation.isPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phân công hiện tại (HK hiện hành)</CardTitle>
        </CardHeader>
        <CardContent>
          {assignmentsQuery.isLoading ? <LoadingState /> : null}
          {assignmentsQuery.data?.items.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Chưa có phân công.</p>
          ) : (
            <ul className='space-y-2'>
              {assignmentsQuery.data?.items.map((item) => (
                <li key={item.id} className='rounded-md border px-3 py-2 text-sm'>
                  <span className='font-medium'>{item.courseSectionCode}</span>
                  <span className='text-muted-foreground'> — {item.courseSectionName}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
