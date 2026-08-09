import { useMutation } from '@tanstack/react-query';
import { FileUpIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  downloadPortalClassTimetableExport,
  downloadPortalMyTimetableExport,
  type PortalTimetableExportFormat,
  type PortalTimetableExportParams,
} from '@/features/portal/api/portal-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

interface PortalTimetableExportActionsProps {
  mode: 'teacher' | 'student';
  params: PortalTimetableExportParams;
  disabled?: boolean;
}

export function PortalTimetableExportActions({
  mode,
  params,
  disabled = false,
}: PortalTimetableExportActionsProps) {
  const exportMutation = useMutation({
    mutationFn: async (format: PortalTimetableExportFormat) => {
      if (mode === 'teacher') {
        await downloadPortalMyTimetableExport({ ...params, format });
        return;
      }

      await downloadPortalClassTimetableExport({ ...params, format });
    },
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
    </div>
  );
}
