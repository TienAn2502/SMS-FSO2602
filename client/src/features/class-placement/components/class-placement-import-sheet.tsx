import { useMutation, useQuery } from '@tanstack/react-query';
import { DownloadIcon, UploadIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  fetchAllAcademicYears,
  fetchSemesters,
} from '@/features/academic-years/api/academic-years-api';
import {
  downloadClassPlacementImportTemplate,
  importClassPlacement,
  type ClassPlacementImportRowError,
} from '@/features/imports/api/class-placement-import-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';

interface ClassPlacementImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultAcademicYearId?: string;
  defaultSemesterId?: string;
}

function parseImportErrors(error: unknown): ClassPlacementImportRowError[] {
  const apiError = getApiError(error);
  const payload = apiError?.data as
    | { errors?: ClassPlacementImportRowError[] }
    | undefined;

  if (payload?.errors?.length) {
    return payload.errors;
  }

  if (apiError?.details?.length) {
    return apiError.details.map((detail) => {
      const match = detail.field.match(/^([^:]+):(\d+)\.(.+)$/);
      return {
        sheet: match?.[1] ?? '',
        row: match ? Number(match[2]) : 0,
        field: match?.[3] ?? detail.field,
        message: detail.message,
      };
    });
  }

  return [];
}

export function ClassPlacementImportSheet({
  open,
  onOpenChange,
  onSuccess,
  defaultAcademicYearId = '',
  defaultSemesterId = '',
}: ClassPlacementImportSheetProps) {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [academicYearId, setAcademicYearId] = useState(defaultAcademicYearId);
  const [semesterId, setSemesterId] = useState(defaultSemesterId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<
    ClassPlacementImportRowError[]
  >([]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setAcademicYearId(defaultAcademicYearId);
    setSemesterId(defaultSemesterId);
    setSelectedFile(null);
    setImportErrors([]);
  }, [open, defaultAcademicYearId, defaultSemesterId]);

  const yearsQuery = useQuery({
    queryKey: ['academic-years', session?.activeSchoolId, 'all'],
    queryFn: fetchAllAcademicYears,
    enabled: Boolean(session?.activeSchoolId && open),
  });

  const years = yearsQuery.data?.items ?? [];

  const semestersQuery = useQuery({
    queryKey: ['semesters', academicYearId],
    queryFn: () => fetchSemesters(academicYearId),
    enabled: Boolean(academicYearId && open),
  });

  const templateMutation = useMutation({
    mutationFn: () =>
      downloadClassPlacementImportTemplate({
        academicYearId: academicYearId || undefined,
        semesterId: semesterId || undefined,
      }),
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Không tải được file mẫu',
        ),
      );
    },
  });

  const importMutation = useMutation({
    mutationFn: importClassPlacement,
    onSuccess: (result) => {
      setImportErrors([]);
      toast.success(
        `Import ${result.successCount} HS (${result.created} mới, ${result.updated} cập nhật); lớp mới ${result.classesCreated}, lớp có sẵn ${result.classesExisting}`,
      );
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      const errors = parseImportErrors(error);
      if (errors.length > 0) {
        setImportErrors(errors);
      }
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Import chia lớp thất bại',
        ),
      );
    },
  });

  const handleImport = () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file Excel (.xlsx)');
      return;
    }
    if (!academicYearId || !semesterId) {
      toast.error('Vui lòng chọn năm học và học kỳ');
      return;
    }
    importMutation.mutate({
      file: selectedFile,
      academicYearId,
      semesterId,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='overflow-y-auto sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>Import chia lớp (Excel)</SheetTitle>
          <SheetDescription>
            Mỗi sheet = một lớp (tên sheet = mã lớp, vd. 10A1). Lớp chưa có sẽ
            được tạo tự động. Chỉ hỗ trợ .xlsx. Chọn năm/học kỳ rồi tải mẫu để
            điền sẵn HS ở lại lớp / mới lên cấp từ hệ thống.
          </SheetDescription>
        </SheetHeader>

        <div className='space-y-4 px-4'>
          <div className='space-y-2'>
            <Label htmlFor='cp-import-year'>Năm học</Label>
            <select
              id='cp-import-year'
              className={selectClassName}
              value={academicYearId}
              onChange={(event) => {
                setAcademicYearId(event.target.value);
                setSemesterId('');
              }}
            >
              <option value=''>Chọn năm học</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                  {year.isCurrent ? ' (hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='cp-import-semester'>Học kỳ ghi danh</Label>
            <select
              id='cp-import-semester'
              className={selectClassName}
              value={semesterId}
              disabled={!academicYearId}
              onChange={(event) => setSemesterId(event.target.value)}
            >
              <option value=''>Chọn học kỳ</option>
              {(semestersQuery.data ?? []).map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.code} — {semester.name}
                </option>
              ))}
            </select>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={
                templateMutation.isPending || !academicYearId || !semesterId
              }
              onClick={() => templateMutation.mutate()}
            >
              <DownloadIcon className='mr-2 size-4' />
              Tải file mẫu (từ DB)
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className='mr-2 size-4' />
              Chọn file
            </Button>
            <input
              ref={fileInputRef}
              type='file'
              accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              className='hidden'
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setImportErrors([]);
              }}
            />
          </div>

          {selectedFile ? (
            <p className='text-sm text-muted-foreground'>
              Đã chọn: {selectedFile.name}
            </p>
          ) : null}

          {importErrors.length > 0 ? (
            <div className='space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3'>
              <p className='text-sm font-medium text-destructive'>
                {importErrors.length} lỗi cần sửa
              </p>
              <ul className='max-h-48 space-y-1 overflow-y-auto text-sm text-muted-foreground'>
                {importErrors.map((item) => (
                  <li key={`${item.sheet}-${item.row}-${item.field}-${item.message}`}>
                    [{item.sheet}] dòng {item.row} · {item.field}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button type='button' variant='outline'>
              Đóng
            </Button>
          </SheetClose>
          <Button
            type='button'
            disabled={importMutation.isPending}
            onClick={handleImport}
          >
            {importMutation.isPending ? 'Đang import...' : 'Import'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
