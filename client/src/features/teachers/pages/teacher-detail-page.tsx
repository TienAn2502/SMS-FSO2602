import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
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
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  fetchAllAcademicYears,
  fetchSemesters,
  type Semester,
} from '@/features/academic-years/api/academic-years-api';
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
  const { session } = useAuth();

  const teacherQuery = useQuery({
    queryKey: ['teachers', id],
    queryFn: () => fetchTeacher(id),
    enabled: Boolean(id),
  });

  // Fetch academic years and semesters to find current semester
  const academicYearsQuery = useQuery({
    queryKey: ['academic-years', session?.activeSchoolId],
    queryFn: () => fetchAllAcademicYears(),
    enabled: Boolean(session?.activeSchoolId),
  });

  const semestersQuery = useQuery({
    queryKey: [
      'semesters',
      session?.activeSchoolId,
      academicYearsQuery.data?.items.find((y) => y.isCurrent)?.id,
    ],
    queryFn: () =>
      fetchSemesters(
        academicYearsQuery.data?.items.find((y) => y.isCurrent)?.id ?? '',
      ),
    enabled: Boolean(academicYearsQuery.data?.items.find((y) => y.isCurrent)?.id),
  });

  const currentSemester = semestersQuery.data?.find((s: Semester) => s.isCurrent);

  // Create a map of academic year id to name for display
  const academicYearMap = useMemo(() => {
    const map = new Map<string, string>();
    academicYearsQuery.data?.items.forEach((year) => {
      map.set(year.id, year.name);
    });
    return map;
  }, [academicYearsQuery.data?.items]);

  // Current assignments filtered by current semester
  const assignmentsQuery = useQuery({
    queryKey: [
      'teaching-assignments',
      'teacher',
      id,
      currentSemester?.id,
    ],
    queryFn: () =>
      fetchTeacherTeachingAssignments(id, {
        semesterId: currentSemester?.id,
        limit: 50,
        status: 'ACTIVE',
      }),
    enabled: Boolean(id && currentSemester?.id),
  });

  // All assignments for history (not filtered by semester)
  const allAssignmentsQuery = useQuery({
    queryKey: ['teaching-assignments', 'teacher', id, 'all'],
    queryFn: () =>
      fetchTeacherTeachingAssignments(id, {
        includeAllSemesters: true,
        limit: 100,
      }),
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
          <CardTitle>
            Phân công hiện tại{' '}
            {currentSemester
              ? `(${currentSemester.name}${
                  currentSemester.isCurrent ? ' — hiện tại' : ''
                })`
              : semestersQuery.isLoading
                ? '(Đang tải...)'
                : '(Không có học kỳ hiện hành)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {semestersQuery.isLoading || assignmentsQuery.isLoading ? (
            <LoadingState />
          ) : null}
          {semestersQuery.isError ? (
            <ErrorState
              message='Không tải được thông tin học kỳ'
              onRetry={() => void semestersQuery.refetch()}
            />
          ) : null}
          {assignmentsQuery.isError ? (
            <ErrorState
              message='Không tải được phân công'
              onRetry={() => void assignmentsQuery.refetch()}
            />
          ) : null}
          {!semestersQuery.isLoading &&
          !semestersQuery.isError &&
          assignmentsQuery.isSuccess ? (
            assignmentsQuery.data.items.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                Chưa có phân công
                {currentSemester ? ` trong ${currentSemester.name}` : ''}.
              </p>
            ) : (
              <ul className='space-y-2'>
                {assignmentsQuery.data.items.map((item) => (
                  <li
                    key={item.id}
                    className='rounded-md border px-3 py-2 text-sm'
                  >
                    <span className='font-medium'>{item.courseSectionCode}</span>
                    <span className='text-muted-foreground'>
                      {' '}
                      — {item.courseSectionName}
                    </span>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử phân công</CardTitle>
        </CardHeader>
        <CardContent>
          {allAssignmentsQuery.isLoading ? (
            <LoadingState />
          ) : allAssignmentsQuery.isError ? (
            <ErrorState
              message='Không tải được lịch sử phân công'
              onRetry={() => void allAssignmentsQuery.refetch()}
            />
          ) : allAssignmentsQuery.data?.items.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              Chưa có lịch sử phân công.
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full min-w-150 border-collapse text-sm'>
                <thead>
                  <tr className='border-b text-left text-muted-foreground'>
                    <th className='py-2 pr-4 font-medium'>Năm học</th>
                    <th className='py-2 pr-4 font-medium'>Học kỳ</th>
                    <th className='py-2 pr-4 font-medium'>Lớp môn</th>
                    <th className='py-2 pr-4 font-medium'>Tên lớp môn</th>
                    <th className='py-2 font-medium'>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {allAssignmentsQuery.data?.items.map((item) => (
                    <tr key={item.id} className='border-b'>
                      <td className='py-2 pr-4'>
                        {academicYearMap.get(item.academicYearId) ?? item.academicYearId}
                      </td>
                      <td className='py-2 pr-4'>
                        {item.semesterCode}{' '}
                        {item.semesterId === currentSemester?.id
                          ? '(hiện tại)'
                          : ''}
                      </td>
                      <td className='py-2 pr-4 font-medium'>
                        {item.courseSectionCode}
                      </td>
                      <td className='py-2 pr-4'>{item.courseSectionName}</td>
                      <td className='py-2'>
                        {ACADEMIC_STATUS_LABELS[item.status]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
