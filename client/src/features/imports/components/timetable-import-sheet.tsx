import { useMutation, useQuery } from '@tanstack/react-query';
import { UploadIcon } from 'lucide-react';
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
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  importTimetable,
  type ImportRowError,
  type TimetableImportMode,
} from '@/features/imports/api/imports-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';

interface TimetableImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialAcademicYearId?: string;
  initialSemesterId?: string;
}

function parseImportErrors(error: unknown): ImportRowError[] {
  const apiError = getApiError(error);
  const payload = apiError?.data as { errors?: ImportRowError[] } | undefined;

  if (payload?.errors?.length) {
    return payload.errors;
  }

  if (apiError?.details?.length) {
    return apiError.details.map((detail) => ({
      row: 0,
      field: detail.field,
      message: detail.message,
    }));
  }

  return [];
}

export function TimetableImportSheet({
  open,
  onOpenChange,
  onSuccess,
  initialAcademicYearId,
  initialSemesterId,
}: TimetableImportSheetProps) {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [academicYearId, setAcademicYearId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [mode, setMode] = useState<TimetableImportMode>('replace');
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

    if (initialAcademicYearId) {
      setAcademicYearId(initialAcademicYearId);
      return;
    }

    const currentYear = years.find((year) => year.isCurrent);
    if (currentYear) {
      setAcademicYearId(currentYear.id);
    }
  }, [open, years, yearsQuery.isLoading, academicYearId, initialAcademicYearId]);

  const semestersQuery = useQuery({
    queryKey: ['semesters', session?.activeSchoolId, academicYearId],
    queryFn: () => fetchSemesters(academicYearId),
    enabled: Boolean(session?.activeSchoolId && academicYearId && open),
  });

  const semesters = semestersQuery.data ?? [];

  useEffect(() => {
    if (!open || !academicYearId || semestersQuery.isLoading || semesterId) {
      return;
    }

    if (initialSemesterId) {
      setSemesterId(initialSemesterId);
      return;
    }

    const currentSemester = semesters.find((semester) => semester.isCurrent);
    if (currentSemester) {
      setSemesterId(currentSemester.id);
    }
  }, [
    open,
    academicYearId,
    semesters,
    semestersQuery.isLoading,
    semesterId,
    initialSemesterId,
  ]);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setImportErrors([]);
      setMode('replace');
      setAcademicYearId('');
      setSemesterId('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  const importMutation = useMutation({
    mutationFn: importTimetable,
    onSuccess: (result) => {
      setImportErrors([]);
      toast.success(
        `Import thành công ${result.successCount} tiết (${result.created} mới, ${result.updated} cập nhật, ${result.sheetsProcessed} lớp)`,
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
          apiError?.message ?? 'Import TKB thất bại',
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
      toast.error('Vui lòng chọn file Excel (.xlsx)');
      return;
    }

    if (!semesterId) {
      toast.error('Vui lòng chọn học kỳ');
      return;
    }

    importMutation.mutate({
      file: selectedFile,
      semesterId,
      mode,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='overflow-y-auto sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>Import TKB từ Excel</SheetTitle>
          <SheetDescription>
            File gồm nhiều sheet — mỗi sheet là ma trận TKB của một lớp hành
            chính. Mỗi ô gồm: mã lớp môn, email GV, phòng (tuỳ chọn). File mẫu:{' '}
            <code className='text-xs'>docs/samples/timetable-import-sample.xlsx</code>
          </SheetDescription>
        </SheetHeader>

        <div className='space-y-4 px-4'>
          <div className='space-y-2'>
            <Label htmlFor='import-tkb-year'>Năm học</Label>
            <select
              id='import-tkb-year'
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
                </option>
              ))}
            </select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='import-tkb-semester'>Học kỳ</Label>
            <select
              id='import-tkb-semester'
              className={selectClassName}
              value={semesterId}
              disabled={!academicYearId}
              onChange={(event) => setSemesterId(event.target.value)}
            >
              <option value=''>Chọn học kỳ</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='import-tkb-mode'>Chế độ import</Label>
            <select
              id='import-tkb-mode'
              className={selectClassName}
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as TimetableImportMode)
              }
            >
              <option value='replace'>
                Replace — xóa TKB cũ của từng lớp trong file
              </option>
              <option value='merge'>
                Merge — giữ tiết cũ, cập nhật tiết trong file
              </option>
            </select>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button type='button' variant='outline' onClick={handleChooseFile}>
              <UploadIcon className='size-4' />
              Chọn file
            </Button>

            <input
              ref={fileInputRef}
              type='file'
              accept='.xlsx'
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
              Chưa chọn file (.xlsx)
            </p>
          )}

          {importErrors.length > 0 ? (
            <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-3'>
              <p className='mb-2 text-sm font-medium text-destructive'>
                {importErrors.length} lỗi cần sửa
              </p>
              <ul className='max-h-48 space-y-1 overflow-y-auto text-sm'>
                {importErrors.map((item) => (
                  <li key={`${item.field}-${item.message}`}>
                    {item.field}: {item.message}
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
