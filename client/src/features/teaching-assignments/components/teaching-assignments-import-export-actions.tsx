import { useMutation } from '@tanstack/react-query';
import { FileDownIcon, FileUpIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  downloadTeachingAssignmentsExport,
  type ExportFormat,
} from '@/features/exports/api/exports-api';
import { TeachingAssignmentImportSheet } from '@/features/imports/components/teaching-assignment-import-sheet';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import type { AcademicEntityStatus } from '@/types/api.types';

export interface TeachingAssignmentExportFilters {
  search?: string;
  academicYearId?: string;
  semesterId?: string;
  teacherId?: string;
  status?: AcademicEntityStatus;
}

interface TeachingAssignmentsImportExportActionsProps {
  exportFilters: TeachingAssignmentExportFilters;
  importOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
}

export function TeachingAssignmentsImportExportActions({
  exportFilters,
  importOpen,
  onImportOpenChange,
  onImportSuccess,
}: TeachingAssignmentsImportExportActionsProps) {
  const exportMutation = useMutation({
    mutationFn: (format: ExportFormat) =>
      downloadTeachingAssignmentsExport({
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

      <TeachingAssignmentImportSheet
        open={importOpen}
        onOpenChange={onImportOpenChange}
        onSuccess={onImportSuccess}
      />
    </>
  );
}
