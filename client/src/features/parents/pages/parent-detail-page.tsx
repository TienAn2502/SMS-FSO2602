import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import { ROUTES } from '@/app/router/routes';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createParentUser,
  fetchParent,
  linkParentStudent,
  unlinkParentStudent,
  updateParent,
} from '@/features/parents/api/parents-api';
import { fetchStudents } from '@/features/students/api/students-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { PARENT_RELATIONSHIP_LABELS } from '@/lib/labels';
import { selectClassName } from '@/lib/form-styles';

const profileSchema = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().optional(),
});

const accountSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const linkSchema = z.object({
  studentId: z.string().uuid(),
  relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']),
  isPrimaryContact: z.boolean().optional(),
});

export function ParentDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();

  const parentQuery = useQuery({
    queryKey: ['parents', id],
    queryFn: () => fetchParent(id),
    enabled: Boolean(id),
  });

  const studentsQuery = useQuery({
    queryKey: ['students', 'link-picker'],
    queryFn: () => fetchStudents({ limit: 100, status: 'ACTIVE' }),
    enabled: Boolean(id),
  });

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: parentQuery.data?.fullName ?? '',
      phone: parentQuery.data?.phone ?? '',
    },
  });

  const accountForm = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: '', password: '' },
  });

  const linkForm = useForm({
    resolver: zodResolver(linkSchema),
    defaultValues: { relationship: 'FATHER' as const, isPrimaryContact: false },
  });

  const updateMutation = useMutation({
    mutationFn: (values: z.infer<typeof profileSchema>) => updateParent(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['parents', id] });
      toast.success('Cập nhật hồ sơ thành công');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Cập nhật thất bại'));
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (values: z.infer<typeof accountSchema>) => createParentUser(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['parents', id] });
      toast.success('Tạo tài khoản thành công');
      accountForm.reset();
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Tạo tài khoản thất bại'));
    },
  });

  const linkMutation = useMutation({
    mutationFn: (values: z.infer<typeof linkSchema>) => linkParentStudent(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['parents', id] });
      toast.success('Gắn học sinh thành công');
      linkForm.reset({ relationship: 'FATHER', isPrimaryContact: false });
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Gắn học sinh thất bại'));
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (studentId: string) => unlinkParentStudent(id, studentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['parents', id] });
      toast.success('Đã gỡ liên kết');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(getErrorMessage(apiError?.code, apiError?.message ?? 'Gỡ liên kết thất bại'));
    },
  });

  if (parentQuery.isLoading) return <LoadingState />;
  if (parentQuery.isError || !parentQuery.data) {
    return <ErrorState message='Không tải được hồ sơ phụ huynh' onRetry={() => void parentQuery.refetch()} />;
  }

  const parent = parentQuery.data;

  return (
    <div className='space-y-6'>
      <div>
        <Link to={ROUTES.parents} className='text-sm text-muted-foreground hover:text-foreground'>← Danh sách phụ huynh</Link>
        <h1 className='mt-2 text-2xl font-semibold'>{parent.fullName}</h1>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader><CardTitle>Hồ sơ</CardTitle></CardHeader>
          <CardContent>
            <form className='space-y-4' onSubmit={profileForm.handleSubmit((v) => updateMutation.mutate(v))}>
              <div className='space-y-2'><Label>Họ tên</Label><Input {...profileForm.register('fullName')} /></div>
              <div className='space-y-2'><Label>SĐT</Label><Input {...profileForm.register('phone')} /></div>
              <p className='text-sm text-muted-foreground'>Email: {parent.userEmail ?? 'Chưa có tài khoản'}</p>
              <Button type='submit' disabled={updateMutation.isPending}>Lưu</Button>
            </form>
          </CardContent>
        </Card>

        {!parent.userId ? (
          <Card>
            <CardHeader><CardTitle>Tạo tài khoản</CardTitle></CardHeader>
            <CardContent>
              <form className='space-y-4' onSubmit={accountForm.handleSubmit((v) => createUserMutation.mutate(v))}>
                <div className='space-y-2'><Label>Email</Label><Input type='email' {...accountForm.register('email')} /></div>
                <div className='space-y-2'><Label>Mật khẩu</Label><Input type='password' {...accountForm.register('password')} /></div>
                <Button type='submit' disabled={createUserMutation.isPending}>Tạo tài khoản</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader><CardTitle>Con đã liên kết</CardTitle></CardHeader>
        <CardContent className='space-y-4'>
          {parent.linkedStudents.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Chưa gắn học sinh.</p>
          ) : (
            <ul className='space-y-2'>
              {parent.linkedStudents.map((link) => (
                <li key={link.id} className='flex items-center justify-between rounded-md border px-3 py-2 text-sm'>
                  <span>
                    {link.studentFullName}
                    <span className='ml-2 text-muted-foreground'>({PARENT_RELATIONSHIP_LABELS[link.relationship]})</span>
                  </span>
                  <Button variant='outline' size='sm' onClick={() => unlinkMutation.mutate(link.studentId)}>Gỡ</Button>
                </li>
              ))}
            </ul>
          )}

          <form className='grid gap-4 md:grid-cols-3 border-t pt-4' onSubmit={linkForm.handleSubmit((v) => linkMutation.mutate(v))}>
            <div className='space-y-2'>
              <Label>Học sinh</Label>
              <select className={selectClassName} {...linkForm.register('studentId')}>
                <option value=''>— Chọn —</option>
                {studentsQuery.data?.items.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </div>
            <div className='space-y-2'>
              <Label>Quan hệ</Label>
              <select className={selectClassName} {...linkForm.register('relationship')}>
                {Object.entries(PARENT_RELATIONSHIP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className='flex items-end gap-2'>
              <label className='flex items-center gap-2 text-sm'>
                <input type='checkbox' {...linkForm.register('isPrimaryContact')} />
                Liên hệ chính
              </label>
              <Button type='submit' disabled={linkMutation.isPending}>Gắn</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
