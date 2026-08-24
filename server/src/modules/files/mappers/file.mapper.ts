import type { File } from '@prisma/client';

export interface FileResponse {
  id: string;
  purpose: File['purpose'];
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey?: string;
  status: File['status'];
  createdAt: string;
  url?: string;
}

export function toFileResponse(
  file: File,
  options?: { url?: string; storageKey?: string },
): FileResponse {
  return {
    id: file.id,
    purpose: file.purpose,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    storageKey: options?.storageKey ?? file.storageKey,
    status: file.status,
    createdAt: file.createdAt.toISOString(),
    ...(options?.url ? { url: options.url } : {}),
  };
}
