import { formatDistanceToNow, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

function formatRelativeTime(dateStr: string): string {
    return formatDistanceToNow(parseISO(dateStr), {
        addSuffix: true,
        locale: vi,
    });
}

export { formatRelativeTime };
