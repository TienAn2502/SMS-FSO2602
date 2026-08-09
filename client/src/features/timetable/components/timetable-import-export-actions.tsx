import { FileDownIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { TimetableImportSheet } from '@/features/imports/components/timetable-import-sheet';
import { TimetableExportActions } from '@/features/timetable/components/timetable-export-actions';
import type { ExportTimetableParams } from '@/features/exports/api/exports-api';

interface TimetableImportExportActionsProps {
  exportParams: ExportTimetableParams;
  exportDisabled?: boolean;
  initialAcademicYearId?: string;
  initialSemesterId?: string;
  onImportSuccess: () => void;
}

export function TimetableImportExportActions({
  exportParams,
  exportDisabled = false,
  initialAcademicYearId,
  initialSemesterId,
  onImportSuccess,
}: TimetableImportExportActionsProps) {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <>
      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => setImportOpen(true)}
        >
          <FileDownIcon className='size-4' />
          Import Excel
        </Button>
        <TimetableExportActions
          params={exportParams}
          disabled={exportDisabled}
        />
      </div>

      <TimetableImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={onImportSuccess}
        initialAcademicYearId={initialAcademicYearId}
        initialSemesterId={initialSemesterId}
      />
    </>
  );
}
