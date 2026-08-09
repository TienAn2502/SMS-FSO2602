import { useMutation } from '@tanstack/react-query';
import { FileDownIcon, FileUpIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  downloadHomeroomClassesExport,
  type ExportFormat,
} from '@/features/exports/api/exports-api';
import { HomeroomClassImportSheet } from '@/features/imports/components/homeroom-class-import-sheet';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';
import type { AcademicEntityStatus } from '@/types/api.types';

export interface HomeroomClassExportFilters {
  search?: string;
  academicYearId?: string;
  gradeLevelId?: string;
  status?: AcademicEntityStatus;
}

interface HomeroomClassesImportExportActionsProps {
  exportFilters: HomeroomClassExportFilters;
  importOpen: boolean;
  onImportOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
}

export function HomeroomClassesImportExportActions({
  exportFilters,
  importOpen,
  onImportOpenChange,
  onImportSuccess,
}: HomeroomClassesImportExportActionsProps) {
  const exportMutation = useMutation({
    mutationFn: (format: ExportFormat) =>
      downloadHomeroomClassesExport({
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

      <HomeroomClassImportSheet
        open={importOpen}
        onOpenChange={onImportOpenChange}
        onSuccess={onImportSuccess}
      />
    </>
  );
}
