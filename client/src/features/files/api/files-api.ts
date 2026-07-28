import { api } from '@/lib/api';
import type { ApiSuccessResponse } from '@/types/api.types';

export type FilePurpose = 'SCHOOL_LOGO' | 'STUDENT_AVATAR' | 'OTHER';

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

  const { data } = await api.post<ApiSuccessResponse<UploadedFile>>(
    '/files/upload',
    form,
    {
      headers: { 'Content-Type': undefined },
    },
  );
  return data.data;
}

export async function fetchFileSignedUrl(fileId: string): Promise<FileSignedUrl> {
  const { data } = await api.get<ApiSuccessResponse<FileSignedUrl>>(
    `/files/${fileId}/url`,
  );
  return data.data;
}
