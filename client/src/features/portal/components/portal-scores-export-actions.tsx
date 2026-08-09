import { useMutation } from '@tanstack/react-query';
import { FileUpIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    downloadMyChildScoresPdfExport,
    downloadMyScoresPdfExport,
} from '@/features/portal/api/portal-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

interface PortalScoresExportActionsProps {
    semesterId?: string;
    academicYearId?: string;
    studentId?: string;
    disabled?: boolean;
}

export function PortalScoresExportActions({
    semesterId,
    academicYearId,
    studentId,
    disabled = false,
}: PortalScoresExportActionsProps) {
    const pdfMutation = useMutation({
        mutationFn: async () => {
            if (!semesterId) {
                throw new Error('Chọn học kỳ trước khi export');
            }

            if (studentId) {
                await downloadMyChildScoresPdfExport(studentId, {
                    semesterId,
                    academicYearId,
                });
                return;
            }

            await downloadMyScoresPdfExport({
                semesterId,
                academicYearId,
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
        <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={disabled || !semesterId || pdfMutation.isPending}
            onClick={() => pdfMutation.mutate()}
        >
            <FileUpIcon className='size-4' />
            Export PDF
        </Button>
    );
}
