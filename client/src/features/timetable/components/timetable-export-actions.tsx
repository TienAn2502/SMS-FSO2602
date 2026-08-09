import { useMutation } from '@tanstack/react-query';
import { FileUpIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  downloadTimetableExport,
  downloadTimetablePdfExport,
  type ExportFormat,
  type ExportTimetableParams,
} from '@/features/exports/api/exports-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

interface TimetableExportActionsProps {
  params: ExportTimetableParams;
  disabled?: boolean;
}

export function TimetableExportActions({
  params,
  disabled = false,
}: TimetableExportActionsProps) {
  const exportMutation = useMutation({
    mutationFn: (format: ExportFormat) =>
      downloadTimetableExport({ ...params, format }),
    onSuccess: () => {
      toast.success('Đã tải file TKB');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Export TKB thất bại',
        ),
      );
    },
  });

  const pdfMutation = useMutation({
    mutationFn: () => downloadTimetablePdfExport(params),
    onSuccess: () => {
      toast.success('Đã tải file PDF');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Export PDF thất bại',
        ),
      );
    },
  });

  return (
    <div className='flex flex-wrap gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={disabled || exportMutation.isPending}
        onClick={() => exportMutation.mutate('xlsx')}
      >
        <FileUpIcon className='size-4' />
        Export Excel
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={disabled || exportMutation.isPending}
        onClick={() => exportMutation.mutate('csv')}
      >
        <FileUpIcon className='size-4' />
        Export CSV
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={disabled || pdfMutation.isPending}
        onClick={() => pdfMutation.mutate()}
      >
        <FileUpIcon className='size-4' />
        Export PDF
      </Button>
    </div>
  );
}
