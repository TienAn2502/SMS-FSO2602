import { api } from '@/lib/api';
import type { ApiSuccessResponse } from '@/types/api.types';

export type FilePurpose =
    | 'SCHOOL_LOGO'
    | 'STUDENT_AVATAR'
    | 'BLOG_IMAGE'
    | 'BLOG_THUMBNAIL'
    | 'NOTIFICATION_THUMBNAIL'
    | 'NOTIFICATION_IMAGE'
    | 'OTHER';

export const FilePurpose = {
    SCHOOL_LOGO: 'SCHOOL_LOGO',
    STUDENT_AVATAR: 'STUDENT_AVATAR',
    BLOG_IMAGE: 'BLOG_IMAGE',
    BLOG_THUMBNAIL: 'BLOG_THUMBNAIL',
    NOTIFICATION_THUMBNAIL: 'NOTIFICATION_THUMBNAIL',
    NOTIFICATION_IMAGE: 'NOTIFICATION_IMAGE',
    OTHER: 'OTHER',
} as const;
export interface UploadedFile {
    id: string;
    purpose: FilePurpose;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    url?: string;
}

export interface FileSignedUrl {
    url: string;
    expiresInSec: number;
}

export async function uploadFile(
    file: File,
    purpose: FilePurpose,
): Promise<UploadedFile> {
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', purpose);
    form.append('mimeType', file.type);

    const { data } = await api.post<ApiSuccessResponse<UploadedFile>>(
        '/files/upload',
        form,
        {
            headers: { 'Content-Type': undefined },
        },
    );
    return data.data;
}

export type TempUploadedFile = {
    fileId: string;
    url: string;
};

export async function uploadTempFile(
    file: File,
    purpose: FilePurpose,
): Promise<TempUploadedFile> {
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', purpose);
    form.append('mimeType', file.type);

    const { data } = await api.post<ApiSuccessResponse<TempUploadedFile>>(
        '/files/upload/temp',
        form,
        {
            headers: { 'Content-Type': undefined },
        },
    );
    return data.data;
}

export async function promoteTempFile(
    fileId: string,
    purpose: FilePurpose,
    mimeType: string,
): Promise<UploadedFile> {
    const { data } = await api.post<ApiSuccessResponse<UploadedFile>>(
        '/files/upload/temp/promote',
        { files: [{ fileId, purpose, mimeType }] },
    );
    return data.data;
}

export async function fetchFileSignedUrl(
    fileId: string,
): Promise<FileSignedUrl> {
    const { data } = await api.get<ApiSuccessResponse<FileSignedUrl>>(
        `/files/${fileId}/url`,
    );
    return data.data;
}
