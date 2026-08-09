import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  updateSemester,
  type Semester,
} from '@/features/academic-years/api/academic-years-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import {
  createSemesterFormSchema,
  type SemesterFormValues,
} from '@/lib/semester-form-schema';

interface SemesterEditFormProps {
  yearId: string;
  semester: Semester;
  academicYearStartDate: string;
  academicYearEndDate: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SemesterEditForm({
  yearId,
  semester,
  academicYearStartDate,
  academicYearEndDate,
  onSuccess,
  onCancel,
}: SemesterEditFormProps) {
  const schema = useMemo(
    () =>
      createSemesterFormSchema(academicYearStartDate, academicYearEndDate),
    [academicYearStartDate, academicYearEndDate],
  );

  const form = useForm<SemesterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: semester.name,
      code: semester.code,
      startDate: semester.startDate,
      endDate: semester.endDate,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: SemesterFormValues) =>
      updateSemester(yearId, semester.id, values),
    onSuccess: () => {
      toast.success('Cập nhật học kỳ thành công');
      onSuccess();
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Cập nhật học kỳ thất bại',
        ),
      );
    },
  });

  return (
    <form
      className='grid gap-4 rounded-lg border border-border p-4 md:grid-cols-2'
      onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
    >
      <div className='md:col-span-2'>
        <p className='text-sm font-medium'>Chỉnh sửa — {semester.name}</p>
        <p className='text-xs text-muted-foreground'>
          Trong phạm vi năm học: {academicYearStartDate} →{' '}
          {academicYearEndDate}
        </p>
      </div>
      <div className='space-y-2'>
        <Label htmlFor={`edit-sem-name-${semester.id}`}>Tên học kỳ</Label>
        <Input
          id={`edit-sem-name-${semester.id}`}
          {...form.register('name')}
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor={`edit-sem-code-${semester.id}`}>Mã</Label>
        <Input
          id={`edit-sem-code-${semester.id}`}
          {...form.register('code')}
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor={`edit-sem-start-${semester.id}`}>Ngày bắt đầu</Label>
        <Input
          id={`edit-sem-start-${semester.id}`}
          type='date'
          min={academicYearStartDate}
          max={academicYearEndDate}
          {...form.register('startDate')}
        />
        {form.formState.errors.startDate ? (
          <p className='text-xs text-destructive'>
            {form.formState.errors.startDate.message}
          </p>
        ) : null}
      </div>
      <div className='space-y-2'>
        <Label htmlFor={`edit-sem-end-${semester.id}`}>Ngày kết thúc</Label>
        <Input
          id={`edit-sem-end-${semester.id}`}
          type='date'
          min={academicYearStartDate}
          max={academicYearEndDate}
          {...form.register('endDate')}
        />
        {form.formState.errors.endDate ? (
          <p className='text-xs text-destructive'>
            {form.formState.errors.endDate.message}
          </p>
        ) : null}
      </div>
      <div className='flex flex-wrap gap-2 md:col-span-2'>
        <Button type='submit' disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
        <Button
          type='button'
          variant='outline'
          disabled={updateMutation.isPending}
          onClick={onCancel}
        >
          Hủy
        </Button>
      </div>
    </form>
  );
}
