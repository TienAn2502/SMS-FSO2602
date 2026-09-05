function getDeviceBadgeVariant(
    deviceType: string | null,
): 'green' | 'blue' | 'gray' | 'yellow' {
    switch (deviceType?.toLowerCase()) {
        case 'desktop':
            return 'blue';
        case 'tablet':
            return 'gray';
        case 'mobile':
            return 'green';
        default:
            return 'gray';
    }
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
        return `Còn ${diffDays} ngày`;
    } else if (diffDays === 0) {
        return 'Hết hạn hôm nay';
    } else {
        return `Đã hết hạn ${Math.abs(diffDays)} ngày`;
    }
}

export { getDeviceBadgeVariant, formatDate, formatRelativeTime };
