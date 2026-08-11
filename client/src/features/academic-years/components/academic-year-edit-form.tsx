import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  updateAcademicYear,
  type AcademicYear,
} from '@/features/academic-years/api/academic-years-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

const editYearSchema = z
  .object({
    name: z.string().trim().min(1, 'Tên năm học là bắt buộc'),
    code: z.string().trim().min(1, 'Mã năm học là bắt buộc'),
    startDate: z.string().min(1, 'Ngày bắt đầu là bắt buộc'),
    endDate: z.string().min(1, 'Ngày kết thúc là bắt buộc'),
  })
  .superRefine((value, ctx) => {
    if (value.endDate <= value.startDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ngày kết thúc phải sau ngày bắt đầu',
        path: ['endDate'],
      });
    }
  });

type EditYearValues = z.infer<typeof editYearSchema>;

interface AcademicYearEditFormProps {
  year: AcademicYear;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AcademicYearEditForm({
  year,
  onSuccess,
  onCancel,
}: AcademicYearEditFormProps) {
  const form = useForm<EditYearValues>({
    resolver: zodResolver(editYearSchema),
    values: {
      name: year.name,
      code: year.code,
      startDate: year.startDate,
      endDate: year.endDate,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: EditYearValues) => updateAcademicYear(year.id, values),
    onSuccess: () => {
      toast.success('Cập nhật năm học thành công');
      onSuccess();
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Cập nhật năm học thất bại',
        ),
      );
    },
  });

  return (
    <form
      className='grid gap-4 md:grid-cols-2'
      onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
    >
      <div className='space-y-2'>
        <Label htmlFor='edit-year-name'>Tên năm học</Label>
        <Input id='edit-year-name' {...form.register('name')} />
        {form.formState.errors.name ? (
          <p className='text-xs text-destructive'>
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>
      <div className='space-y-2'>
        <Label htmlFor='edit-year-code'>Mã</Label>
        <Input id='edit-year-code' {...form.register('code')} />
        {form.formState.errors.code ? (
          <p className='text-xs text-destructive'>
            {form.formState.errors.code.message}
          </p>
        ) : null}
      </div>
      <div className='space-y-2'>
        <Label htmlFor='edit-year-start'>Ngày bắt đầu</Label>
        <Input
          id='edit-year-start'
          type='date'
          {...form.register('startDate')}
        />
        {form.formState.errors.startDate ? (
          <p className='text-xs text-destructive'>
            {form.formState.errors.startDate.message}
          </p>
        ) : null}
      </div>
      <div className='space-y-2'>
        <Label htmlFor='edit-year-end'>Ngày kết thúc</Label>
        <Input id='edit-year-end' type='date' {...form.register('endDate')} />
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
