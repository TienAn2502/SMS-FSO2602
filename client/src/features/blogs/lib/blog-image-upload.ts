import { FilePurpose, uploadTempFile } from '@/features/files/api/files-api';
import { MAX_FILE_SIZE } from '@/lib/tiptap-utils';

export type BlogImageUploadResult = {
    src: string;
    fileId: string;
    temp: true;
    mimeType: string;
    sizeBytes: number;
    originalName: string;
};

/**
 * TipTap: upload R2 temp rồi trả URL để hiện ngay trong editor.
 * `src` ưu tiên signed URL; nếu thiếu thì dùng blob preview local.
 */
export async function handleTempImageUpload(
    purpose: FilePurpose,
    file: File,
    onProgress?: (event: { progress: number }) => void,
    abortSignal?: AbortSignal,
): Promise<BlogImageUploadResult> {
    if (!file) {
        throw new Error('No file provided');
    }
    if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
    }
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(
            `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`,
        );
    }
    if (abortSignal?.aborted) {
        throw new Error('Upload cancelled');
    }

    const localPreviewUrl = URL.createObjectURL(file);
    onProgress?.({ progress: 15 });

    try {
        const uploaded = await uploadTempFile(file, purpose);

        if (abortSignal?.aborted) {
            URL.revokeObjectURL(localPreviewUrl);
            throw new Error('Upload cancelled');
        }

        onProgress?.({ progress: 100 });

        const src =
            uploaded.url && uploaded.url.length > 0
                ? uploaded.url
                : localPreviewUrl;

        if (src !== localPreviewUrl) {
            URL.revokeObjectURL(localPreviewUrl);
        }

        return {
            src,
            fileId: uploaded.fileId,
            temp: true,
            mimeType: file.type,
            sizeBytes: file.size,
            originalName: file.name,
        };
    } catch (error) {
        URL.revokeObjectURL(localPreviewUrl);
        throw error;
    }
}
