import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { LogoUploadDropzone } from '@/components/common/logo-upload-dropzone';
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
import {
  fetchFileSignedUrl,
  uploadFile,
} from '@/features/files/api/files-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

import {
  fetchCurrentSchool,
  updateCurrentSchool,
} from '../api/schools-api';

const schoolFormSchema = z.object({
  name: z.string().min(1, 'Tên trường là bắt buộc'),
  shortName: z.string().optional(),
  schoolType: z.enum(['TH', 'THCS', 'THPT', 'OTHER']),
  email: z.string().email('Email không hợp lệ').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type SchoolFormValues = z.infer<typeof schoolFormSchema>;

export function SchoolSettingsPage() {
  const queryClient = useQueryClient();
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const schoolQuery = useQuery({
    queryKey: ['schools', 'current'],
    queryFn: fetchCurrentSchool,
  });

  const logoUrlQuery = useQuery({
    queryKey: ['files', 'logo-url', schoolQuery.data?.logoFileId],
    queryFn: () => fetchFileSignedUrl(schoolQuery.data!.logoFileId!),
    enabled: Boolean(schoolQuery.data?.logoFileId),
    staleTime: 60_000,
  });

  const displayLogoUrl = logoPreviewUrl ?? logoUrlQuery.data?.url ?? null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolFormSchema),
    values: schoolQuery.data
      ? {
          name: schoolQuery.data.name,
          shortName: schoolQuery.data.shortName ?? '',
          schoolType: schoolQuery.data.schoolType ?? 'THPT',
          email: schoolQuery.data.email ?? '',
          phone: schoolQuery.data.phone ?? '',
          address: schoolQuery.data.address ?? '',
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: updateCurrentSchool,
    onSuccess: (school) => {
      queryClient.setQueryData(['schools', 'current'], school);
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Cập nhật thông tin trường thành công');
      reset({
        name: school.name,
        shortName: school.shortName ?? '',
        schoolType: school.schoolType ?? 'THPT',
        email: school.email ?? '',
        phone: school.phone ?? '',
        address: school.address ?? '',
      });
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Cập nhật thất bại',
        ),
      );
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await uploadFile(file, 'SCHOOL_LOGO'); // trả về file id
      return updateCurrentSchool({ logoFileId: uploaded.id }); // cập nhật logoFileId vào trường trường
    },
    onSuccess: (school) => {
      queryClient.setQueryData(['schools', 'current'], school);
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      void queryClient.invalidateQueries({ queryKey: ['files', 'logo-url'] });
      setLogoPreviewUrl(null);
      toast.success('Upload logo thành công');
    },
    onError: (error) => {
      setLogoPreviewUrl(null);
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Upload logo thất bại',
        ),
      );
    },
  });

  const removeLogoMutation = useMutation({
    mutationFn: () => updateCurrentSchool({ logoFileId: null }),
    onSuccess: (school) => {
      queryClient.setQueryData(['schools', 'current'], school);
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      void queryClient.invalidateQueries({ queryKey: ['files', 'logo-url'] });
      setLogoPreviewUrl(null);
      toast.success('Đã gỡ logo trường');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Gỡ logo thất bại',
        ),
      );
    },
  });

  const uploadLogoFile = useCallback(
    (file: File) => {
      const preview = URL.createObjectURL(file);
      setLogoPreviewUrl(preview);
      uploadLogoMutation.mutate(file);
    },
    [uploadLogoMutation],
  );

  if (schoolQuery.isLoading) {
    return <LoadingState />;
  }

  if (schoolQuery.isError) {
    return (
      <ErrorState
        message='Không tải được thông tin trường'
        onRetry={() => void schoolQuery.refetch()}
      />
    );
  }

  const onSubmit = handleSubmit((values) => {
    updateMutation.mutate({
      name: values.name,
      shortName: values.shortName || null,
      schoolType: values.schoolType,
      email: values.email || null,
      phone: values.phone || null,
      address: values.address || null,
    });
  });

  return (
    <div className='mx-auto max-w-2xl space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Cài đặt trường</h1>
        <p className='text-sm text-muted-foreground'>
          Cập nhật thông tin liên hệ và hiển thị của trường
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo trường</CardTitle>
          <CardDescription>
            PNG, JPEG, WebP hoặc GIF — tối đa 2MB
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUploadDropzone
            previewUrl={displayLogoUrl}
            isUploading={uploadLogoMutation.isPending}
            onUpload={uploadLogoFile}
            canRemove={Boolean(schoolQuery.data?.logoFileId)}
            isRemoving={removeLogoMutation.isPending}
            onRemove={() => removeLogoMutation.mutate()}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin trường</CardTitle>
          <CardDescription>
            Mã trường: {schoolQuery.data?.code} (không thể thay đổi)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className='space-y-4' onSubmit={onSubmit}>
            <div className='space-y-2'>
              <Label htmlFor='name'>Tên trường</Label>
              <Input id='name' {...register('name')} />
              {errors.name ? (
                <p className='text-sm text-destructive'>{errors.name.message}</p>
              ) : null}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='shortName'>Tên viết tắt</Label>
              <Input id='shortName' {...register('shortName')} />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='schoolType'>Loại trường</Label>
              <select
                id='schoolType'
                className='flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm'
                {...register('schoolType')}
              >
                <option value='TH'>Tiểu học</option>
                <option value='THCS'>THCS</option>
                <option value='THPT'>THPT</option>
                <option value='OTHER'>Khác</option>
              </select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input id='email' type='email' {...register('email')} />
              {errors.email ? (
                <p className='text-sm text-destructive'>{errors.email.message}</p>
              ) : null}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='phone'>Số điện thoại</Label>
              <Input id='phone' {...register('phone')} />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='address'>Địa chỉ</Label>
              <Input id='address' {...register('address')} />
            </div>

            <Button type='submit' disabled={isSubmitting || !isDirty}>
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
