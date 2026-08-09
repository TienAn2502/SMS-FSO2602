import { useMutation } from '@tanstack/react-query';
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
import type { ImportRowError } from '@/features/imports/api/imports-api';
import {
  downloadPortalGradebookImportTemplate,
  importPortalGradebookScores,
} from '@/features/portal/api/portal-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import { selectClassName } from '@/lib/form-styles';

interface ScoreImportAssessmentOption {
  assessmentId: string;
  name: string;
  assessmentDate: string | null;
}

interface ScoreImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseSectionId: string;
  assessments: ScoreImportAssessmentOption[];
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

export function ScoreImportSheet({
  open,
  onOpenChange,
  courseSectionId,
  assessments,
  onSuccess,
}: ScoreImportSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assessmentId, setAssessmentId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<ImportRowError[]>([]);

  useEffect(() => {
    if (!open) {
      setAssessmentId('');
      setSelectedFile(null);
      setImportErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open || assessmentId || assessments.length === 0) {
      return;
    }

    setAssessmentId(assessments[0].assessmentId);
  }, [open, assessmentId, assessments]);

  const templateMutation = useMutation({
    mutationFn: () =>
      downloadPortalGradebookImportTemplate(courseSectionId, assessmentId || undefined),
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
    mutationFn: importPortalGradebookScores,
    onSuccess: (result) => {
      setImportErrors([]);
      toast.success(`Import thành công ${result.successCount} dòng điểm`);
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

    if (!assessmentId) {
      toast.error('Vui lòng chọn đầu điểm');
      return;
    }

    importMutation.mutate({
      file: selectedFile,
      courseSectionId,
      assessmentId,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='overflow-y-auto sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>Import điểm từ Excel</SheetTitle>
          <SheetDescription>
            Chọn đầu điểm đang mở, tải file mẫu (có ghi lớp môn, năm học, môn)
            và upload danh sách điểm.
          </SheetDescription>
        </SheetHeader>

        <div className='space-y-4 px-4'>
          <div className='space-y-2'>
            <Label htmlFor='import-score-assessment'>Đầu điểm</Label>
            <select
              id='import-score-assessment'
              className={selectClassName}
              value={assessmentId}
              onChange={(event) => setAssessmentId(event.target.value)}
            >
              <option value=''>Chọn đầu điểm</option>
              {assessments.map((assessment) => (
                <option key={assessment.assessmentId} value={assessment.assessmentId}>
                  {assessment.name}
                  {assessment.assessmentDate
                    ? ` (${assessment.assessmentDate})`
                    : ''}
                </option>
              ))}
            </select>
            {assessments.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                Không có đầu điểm đang mở để import.
              </p>
            ) : null}
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              disabled={templateMutation.isPending || !assessmentId}
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
            disabled={importMutation.isPending || assessments.length === 0}
            onClick={handleImport}
          >
            {importMutation.isPending ? 'Đang import...' : 'Import'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
