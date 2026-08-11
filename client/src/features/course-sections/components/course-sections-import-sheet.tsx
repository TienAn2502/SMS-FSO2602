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
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  downloadCourseSectionsImportTemplate,
  importCourseSections,
  type CourseSectionImportRowError,
} from '@/features/imports/api/course-sections-import-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';

interface CourseSectionsImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultAcademicYearId?: string;
  defaultSemesterId?: string;
}

function parseImportErrors(error: unknown): CourseSectionImportRowError[] {
  const apiError = getApiError(error);
  const payload = apiError?.data as
    | { errors?: CourseSectionImportRowError[] }
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

export function CourseSectionsImportSheet({
  open,
  onOpenChange,
  onSuccess,
  defaultAcademicYearId = '',
  defaultSemesterId = '',
}: CourseSectionsImportSheetProps) {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [academicYearId, setAcademicYearId] = useState(defaultAcademicYearId);
  const [semesterId, setSemesterId] = useState(defaultSemesterId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<
    CourseSectionImportRowError[]
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
      downloadCourseSectionsImportTemplate({
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
    mutationFn: importCourseSections,
    onSuccess: (result) => {
      setImportErrors([]);
      toast.success(
        `Tạo ${result.created} lớp môn, bỏ qua ${result.skippedExisting} đã có` +
          (result.assignmentsCreated
            ? `, phân công ${result.assignmentsCreated}`
            : ''),
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
          apiError?.message ?? 'Import lớp môn thất bại',
        ),
      );
    },
  });

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
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='overflow-y-auto sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>Import lớp môn (Excel)</SheetTitle>
          <SheetDescription>
            Mỗi sheet = một lớp HC; mỗi dòng = một môn — luôn tạo record mới.
            Chọn học kỳ rồi tải mẫu: đủ lớp trong năm; khối 10 theo cấu hình
            môn (tạo mới); khối 11/12 ưu tiên môn từ HK2 năm trước (đã lọc theo
            cấu hình khối hiện tại).
          </SheetDescription>
        </SheetHeader>

        <div className='space-y-4 px-4'>
          <div className='space-y-2'>
            <Label htmlFor='cs-import-year'>Năm học</Label>
            <select
              id='cs-import-year'
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
            <Label htmlFor='cs-import-semester'>Học kỳ đích</Label>
            <select
              id='cs-import-semester'
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
              disabled={templateMutation.isPending}
              onClick={() => templateMutation.mutate()}
            >
              <DownloadIcon className='mr-2 size-4' />
              Tải file mẫu
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
                  <li
                    key={`${item.sheet}-${item.row}-${item.field}-${item.message}`}
                  >
                    [{item.sheet}] dòng {item.row} · {item.field}:{' '}
                    {item.message}
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
