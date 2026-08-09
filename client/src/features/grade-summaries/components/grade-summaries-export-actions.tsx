import { useMutation } from '@tanstack/react-query';
import { FileUpIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  downloadEnrollmentsExport,
  downloadSemesterSummariesExport,
  downloadSemesterSummariesPdfExport,
  downloadYearSummariesExport,
  downloadYearSummariesPdfExport,
  type ExportFormat,
} from '@/features/exports/api/exports-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

interface GradeSummariesExportActionsProps {
  tab: 'semester' | 'year';
  semesterId?: string;
  academicYearId?: string;
  homeroomClassId?: string;
}

export function GradeSummariesExportActions({
  tab,
  semesterId,
  academicYearId,
  homeroomClassId,
}: GradeSummariesExportActionsProps) {
  const exportMutation = useMutation({
    mutationFn: async (format: ExportFormat) => {
      if (tab === 'semester') {
        await downloadSemesterSummariesExport({
          format,
          semesterId,
          homeroomClassId: homeroomClassId || undefined,
        });
        return;
      }

      await downloadYearSummariesExport({
        format,
        academicYearId,
        homeroomClassId: homeroomClassId || undefined,
      });
    },
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

  const enrollmentsExportMutation = useMutation({
    mutationFn: (format: ExportFormat) =>
      downloadEnrollmentsExport({
        format,
        semesterId: tab === 'semester' ? semesterId : undefined,
        academicYearId,
        homeroomClassId: homeroomClassId || undefined,
      }),
    onSuccess: () => {
      toast.success('Đã tải file ghi danh');
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
    mutationFn: async () => {
      if (tab === 'semester') {
        await downloadSemesterSummariesPdfExport({
          semesterId,
          homeroomClassId: homeroomClassId || undefined,
        });
        return;
      }

      await downloadYearSummariesPdfExport({
        academicYearId,
        homeroomClassId: homeroomClassId || undefined,
      });
    },
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
        Export {tab === 'semester' ? 'HK' : 'năm'} Excel
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
        disabled={exportMutation.isPending || pdfMutation.isPending}
        onClick={() => pdfMutation.mutate()}
      >
        <FileUpIcon className='size-4' />
        Export {tab === 'semester' ? 'HK' : 'năm'} PDF
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={enrollmentsExportMutation.isPending}
        onClick={() => enrollmentsExportMutation.mutate('xlsx')}
      >
        <FileUpIcon className='size-4' />
        Export ghi danh
      </Button>
    </div>
  );
}
