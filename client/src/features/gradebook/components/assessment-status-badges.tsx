import type {
  AssessmentStatus,
  AssessmentType,
  GradebookOverviewStatus,
} from '@/features/gradebook/api/gradebook-api';
import {
  ASSESSMENT_STATUS_LABELS,
  ASSESSMENT_TYPE_LABELS,
  GRADEBOOK_OVERVIEW_STATUS_LABELS,
} from '@/lib/labels';
import { cn } from '@/lib/utils';

export function AssessmentTypeBadge({ type }: { type: AssessmentType }) {
  return (
    <span className='inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'>
      {ASSESSMENT_TYPE_LABELS[type]}
    </span>
  );
}

export function AssessmentStatusBadge({ status }: { status: AssessmentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
        status === 'OPEN'
          ? 'bg-sky-500/10 text-sky-700'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {ASSESSMENT_STATUS_LABELS[status]}
    </span>
  );
}

export function GradebookOverviewStatusBadge({
  status,
}: {
  status: GradebookOverviewStatus;
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
        status === 'NOT_STARTED' && 'bg-muted text-muted-foreground',
        status === 'IN_PROGRESS' && 'bg-amber-500/10 text-amber-700',
        status === 'LOCKED' && 'bg-emerald-500/10 text-emerald-700',
      )}
    >
      {GRADEBOOK_OVERVIEW_STATUS_LABELS[status]}
    </span>
  );
}
