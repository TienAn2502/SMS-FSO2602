import { useMutation } from '@tanstack/react-query';
import { FileUpIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  downloadGradebookExport,
  downloadGradebookPdfExport,
  type ExportFormat,
} from '@/features/exports/api/exports-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

interface GradebookExportActionsProps {
  courseSectionId: string;
}

export function GradebookExportActions({
  courseSectionId,
}: GradebookExportActionsProps) {
  const exportMutation = useMutation({
    mutationFn: (format: ExportFormat) =>
      downloadGradebookExport({ format, courseSectionId }),
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

  const pdfMutation = useMutation({
    mutationFn: () => downloadGradebookPdfExport(courseSectionId),
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
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={pdfMutation.isPending}
        onClick={() => pdfMutation.mutate()}
      >
        <FileUpIcon className='size-4' />
        Export PDF
      </Button>
    </div>
  );
}
