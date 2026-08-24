const TEMP_IMG_SELECTOR = 'img[data-temp="true"][data-file-id]';

export interface TempImageInfo {
    fileId: string;
    mimeType: string;
    sizeBytes: number;
    originalName: string;
}

/**
 * Extract temp images từ HTML (chỉ extract, không promote - BE sẽ promote)
 */
export function extractTempImages(html: string): TempImageInfo[] {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const images = doc.querySelectorAll<HTMLImageElement>(TEMP_IMG_SELECTOR);
    const result: TempImageInfo[] = [];
    const seen = new Set<string>();

    images.forEach((img) => {
        const fileId = img.getAttribute('data-file-id');
        const mimeType = img.getAttribute('data-mime-type');
        const sizeBytes = Number(img.getAttribute('data-size-bytes')) || 0;
        const originalName = img.getAttribute('data-original-name') || '';
        if (fileId && mimeType && !seen.has(fileId)) {
            seen.add(fileId);
            result.push({ fileId, mimeType, sizeBytes, originalName });
        }
    });

    return result;
}

/**
 * Extract temp image info cho thumbnail
 */
export function extractTempThumbnail(
    thumbnailUrl: string | null,
): TempImageInfo | null {
    if (!thumbnailUrl) return null;

    // Check if it's a temp URL (contains data-temp or data-file-id in the URL pattern)
    // ThumbnailUpload sẽ lưu temp file info riêng, ở đây chỉ return null
    // và FE sẽ upload thumbnail lên BE rồi truyền fileId
    return null;
}
