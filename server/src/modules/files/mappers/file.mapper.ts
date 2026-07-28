import type { File } from '@prisma/client';

export interface FileResponse {
  id: string;
  purpose: File['purpose'];
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: File['status'];
  createdAt: string;
  url?: string;
}

export function toFileResponse(
  file: File,
  options?: { url?: string },
): FileResponse {
  return {
    id: file.id,
    purpose: file.purpose,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    status: file.status,
    createdAt: file.createdAt.toISOString(),
    ...(options?.url ? { url: options.url } : {}),
  };
}
