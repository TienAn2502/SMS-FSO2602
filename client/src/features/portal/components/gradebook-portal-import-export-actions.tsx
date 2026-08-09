import { useMutation } from '@tanstack/react-query';
import { FileDownIcon, FileUpIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ScoreImportSheet } from '@/features/imports/components/score-import-sheet';
import {
    downloadPortalGradebookExport,
    downloadPortalGradebookPdfExport,
    type PortalGradebookExportFormat,
    type PortalGradebookGridColumn,
} from '@/features/portal/api/portal-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

interface GradebookPortalImportExportActionsProps {
    courseSectionId: string;
    assessments: PortalGradebookGridColumn[];
    canImport: boolean;
    onImportSuccess: () => void;
}

export function GradebookPortalImportExportActions({
    courseSectionId,
    assessments,
    canImport,
    onImportSuccess,
}: GradebookPortalImportExportActionsProps) {
    const [importOpen, setImportOpen] = useState(false);

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

    const openAssessments = assessments.filter(
        (column) => column.status === 'OPEN',
    );

    return (
        <>
            <div className='flex flex-wrap gap-2'>
                {canImport ? (
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={openAssessments.length === 0}
                        onClick={() => setImportOpen(true)}
                    >
                        <FileDownIcon className='size-4' />
                        Import điểm
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

            <ScoreImportSheet
                open={importOpen}
                onOpenChange={setImportOpen}
                courseSectionId={courseSectionId}
                assessments={openAssessments}
                onSuccess={onImportSuccess}
            />
        </>
    );
}
