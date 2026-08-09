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
import { fetchAllAcademicYears } from '@/features/academic-years/api/academic-years-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  downloadHomeroomClassesImportTemplate,
  importHomeroomClasses,
  type ImportRowError,
} from '@/features/imports/api/imports-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';

interface HomeroomClassImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function parseImportErrors(error: unknown): ImportRowError[] {
  const apiError = getApiError(error);
  const payload = apiError?.data as { errors?: ImportRowError[] } | undefined;

  if (payload?.errors?.length) {
    return payload.errors;
  }

  if (apiError?.details?.length) {
    return apiError.details.map((detail) => {
      const match = detail.field.match(/^(\d+)\.(.+)$/);
      return {
        row: match ? Number(match[1]) : 0,
        field: match?.[2] ?? detail.field,
        message: detail.message,
      };
    });
  }

  return [];
}

export function HomeroomClassImportSheet({
  open,
  onOpenChange,
  onSuccess,
}: HomeroomClassImportSheetProps) {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [academicYearId, setAcademicYearId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<ImportRowError[]>([]);

  const yearsQuery = useQuery({
    queryKey: ['academic-years', session?.activeSchoolId, 'all'],
    queryFn: fetchAllAcademicYears,
    enabled: Boolean(session?.activeSchoolId && open),
  });

  const years = yearsQuery.data?.items ?? [];

  useEffect(() => {
    if (!open || yearsQuery.isLoading || academicYearId) {
      return;
    }

    const currentYear = years.find((year) => year.isCurrent);
    if (currentYear) {
      setAcademicYearId(currentYear.id);
    }
  }, [open, years, yearsQuery.isLoading, academicYearId]);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setImportErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  const templateMutation = useMutation({
    mutationFn: () =>
      downloadHomeroomClassesImportTemplate(academicYearId || undefined),
    onSuccess: () => {
      toast.success('Đã tải file mẫu');
    },
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
    mutationFn: importHomeroomClasses,
    onSuccess: (result) => {
      setImportErrors([]);
      toast.success(
        `Import thành công ${result.successCount} lớp HC (${result.created} mới, ${result.updated} cập nhật)`,
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
          apiError?.message ?? 'Import thất bại',
        ),
      );
    },
  });

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setImportErrors([]);
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file Excel hoặc CSV');
      return;
    }

    if (!academicYearId) {
      toast.error('Vui lòng chọn năm học');
      return;
    }

    importMutation.mutate({
      file: selectedFile,
      academicYearId,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='overflow-y-auto sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>Import lớp hành chính từ Excel</SheetTitle>
          <SheetDescription>
            Tải file mẫu, điền dữ liệu rồi chọn file để import vào năm học đã
            chọn.
          </SheetDescription>
        </SheetHeader>

        <div className='space-y-4 px-4'>
          <div className='space-y-2'>
            <Label htmlFor='import-hc-year'>Năm học</Label>
            <select
              id='import-hc-year'
              className={selectClassName}
              value={academicYearId}
              onChange={(event) => setAcademicYearId(event.target.value)}
            >
              <option value=''>Chọn năm học</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              disabled={templateMutation.isPending}
              onClick={() => templateMutation.mutate()}
            >
              <DownloadIcon className='size-4' />
              Tải file mẫu
            </Button>

            <Button type='button' variant='outline' onClick={handleChooseFile}>
              <UploadIcon className='size-4' />
              Chọn file
            </Button>

            <input
              ref={fileInputRef}
              type='file'
              accept='.xlsx,.csv'
              className='hidden'
              onChange={handleFileChange}
            />
          </div>

          {selectedFile ? (
            <p className='text-sm text-muted-foreground'>
              File đã chọn:{' '}
              <span className='font-medium text-foreground'>
                {selectedFile.name}
              </span>
            </p>
          ) : (
            <p className='text-sm text-muted-foreground'>
              Chưa chọn file (.xlsx hoặc .csv)
            </p>
          )}

          {importErrors.length > 0 ? (
            <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-3'>
              <p className='mb-2 text-sm font-medium text-destructive'>
                {importErrors.length} lỗi cần sửa
              </p>
              <ul className='max-h-48 space-y-1 overflow-y-auto text-sm'>
                {importErrors.map((item) => (
                  <li key={`${item.row}-${item.field}-${item.message}`}>
                    Dòng {item.row} — {item.field}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <SheetFooter className='flex-row justify-end'>
          <SheetClose render={<Button variant='outline' />}>Đóng</SheetClose>
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
