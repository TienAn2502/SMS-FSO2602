import { useMutation } from '@tanstack/react-query';
import { FileUpIcon, SparklesIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    downloadPortalGradebookExport,
    downloadPortalGradebookPdfExport,
    fillPortalGradebookFakeScores,
    type PortalGradebookExportFormat,
    type PortalGradebookGridColumn,
} from '@/features/portal/api/portal-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

interface GradebookPortalImportExportActionsProps {
    courseSectionId: string;
    assessments: PortalGradebookGridColumn[];
    canFillFake: boolean;
    onFillFakeSuccess: () => void;
}

export function GradebookPortalImportExportActions({
    courseSectionId,
    assessments,
    canFillFake,
    onFillFakeSuccess,
}: GradebookPortalImportExportActionsProps) {
    const openAssessments = assessments.filter(
        (column) => column.status === 'OPEN',
    );

    const exportMutation = useMutation({
        mutationFn: (format: PortalGradebookExportFormat) =>
            downloadPortalGradebookExport(courseSectionId, format),
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
        mutationFn: () => downloadPortalGradebookPdfExport(courseSectionId),
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

    const fakeFillMutation = useMutation({
        mutationFn: () => fillPortalGradebookFakeScores(courseSectionId),
        onSuccess: (result) => {
            toast.success(`Đã điền ${result.filledCount} ô điểm mẫu`);
            onFillFakeSuccess();
        },
        onError: (error) => {
            const apiError = getApiError(error);
            toast.error(
                getErrorMessage(
                    apiError?.code,
                    apiError?.message ?? 'Điền điểm mẫu thất bại',
                ),
            );
        },
    });

    return (
        <div className='flex flex-wrap gap-2'>
            {canFillFake ? (
                <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={
                        openAssessments.length === 0 ||
                        fakeFillMutation.isPending
                    }
                    onClick={() => fakeFillMutation.mutate()}
                >
                    <SparklesIcon className='size-4' />
                    {fakeFillMutation.isPending
                        ? 'Đang điền…'
                        : 'Điền điểm mẫu'}
                </Button>
            ) : null}

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
