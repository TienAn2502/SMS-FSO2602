import { useMutation } from '@tanstack/react-query';
import { FileDownIcon, FileUpIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  downloadTeachersExport,
  type ExportFormat,
} from '@/features/exports/api/exports-api';
import { TeacherImportSheet } from '@/features/imports/components/teacher-import-sheet';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

export interface TeacherExportFilters {
  search?: string;
}

interface TeachersImportExportActionsProps {
  exportFilters: TeacherExportFilters;
  importOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
}

export function TeachersImportExportActions({
  exportFilters,
  importOpen,
  onImportOpenChange,
  onImportSuccess,
}: TeachersImportExportActionsProps) {
  const exportMutation = useMutation({
    mutationFn: (format: ExportFormat) =>
      downloadTeachersExport({
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

      <TeacherImportSheet
        open={importOpen}
        onOpenChange={onImportOpenChange}
        onSuccess={onImportSuccess}
      />
    </>
  );
}
