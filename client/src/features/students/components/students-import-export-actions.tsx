import { useMutation } from '@tanstack/react-query';
import { FileDownIcon, FileUpIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  downloadStudentsExport,
  type StudentExportFormat,
} from '@/features/exports/api/exports-api';
import { StudentImportSheet } from '@/features/imports/components/student-import-sheet';
import type { StudentExportFilters } from '@/features/students/components/student-export-filters';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

interface StudentsImportExportActionsProps {
  exportFilters: StudentExportFilters;
  importOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
}

export function StudentsImportExportActions({
  exportFilters,
  importOpen,
  onImportOpenChange,
  onImportSuccess,
}: StudentsImportExportActionsProps) {
  const exportMutation = useMutation({
    mutationFn: (format: StudentExportFormat) =>
      downloadStudentsExport({
        format,
        ...exportFilters,
      }),
    onSuccess: () => {
      toast.success('Đã tải file export');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Export thất bại',
        ),
      );
    },
  });

  return (
    <>
      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => onImportOpenChange(true)}
        >
          <FileDownIcon className='size-4' />
          Import Excel
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={exportMutation.isPending}
          onClick={() => exportMutation.mutate('xlsx')}
        >
          <FileUpIcon className='size-4' />
          Export Excel
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={exportMutation.isPending}
          onClick={() => exportMutation.mutate('csv')}
        >
          <FileUpIcon className='size-4' />
          Export CSV
        </Button>
      </div>

      <StudentImportSheet
        open={importOpen}
        onOpenChange={onImportOpenChange}
        onSuccess={onImportSuccess}
      />
    </>
  );
}
