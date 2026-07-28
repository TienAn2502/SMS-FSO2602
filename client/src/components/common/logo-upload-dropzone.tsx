import { Upload } from 'lucide-react';
import { useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

const LOGO_ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
} as const;

interface LogoUploadDropzoneProps {
  previewUrl: string | null;
  isUploading: boolean;
  onUpload: (file: File) => void;
  onRemove?: () => void;
  canRemove?: boolean;
  isRemoving?: boolean;
}

export function LogoUploadDropzone({
  previewUrl,
  isUploading,
  onUpload,
  onRemove,
  canRemove = false,
  isRemoving = false,
}: LogoUploadDropzoneProps) {
  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        onUpload(file);
      }
    },
    [onUpload],
  );

  const handleDropRejected = useCallback((rejections: FileRejection[]) => {
    const error = rejections[0]?.errors[0];
    if (!error) {
      toast.error('File không hợp lệ');
      return;
    }

    switch (error.code) {
      case 'file-too-large':
        toast.error('Logo không được vượt quá 2MB');
        break;
      case 'file-invalid-type':
        toast.error('Chỉ hỗ trợ file PNG, JPEG, WebP hoặc GIF');
        break;
      case 'too-many-files':
        toast.error('Chỉ upload một file logo');
        break;
      default:
        toast.error('File không hợp lệ');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    onDropRejected: handleDropRejected,
    accept: LOGO_ACCEPT,
    maxSize: MAX_LOGO_SIZE_BYTES,
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className='space-y-4'>
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center gap-4 rounded-lg border border-dashed p-4 transition-colors sm:flex-row sm:p-6',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/30',
          isUploading
            ? 'pointer-events-none opacity-60'
            : 'cursor-pointer hover:border-primary/50 hover:bg-muted/50',
        )}
      >
        <input {...getInputProps()} />

        <div className='flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted'>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt='Logo trường'
              className='size-full object-contain'
            />
          ) : (
            <Upload className='size-6 text-muted-foreground' />
          )}
        </div>

        <div className='flex-1 space-y-1 text-center sm:text-left'>
          <p className='text-sm font-medium'>
            {isUploading
              ? 'Đang upload...'
              : isDragActive
                ? 'Thả file để upload logo'
                : 'Kéo thả hoặc bấm để chọn logo'}
          </p>
          <p className='text-xs text-muted-foreground'>
            PNG, JPEG, WebP hoặc GIF — tối đa 2MB
          </p>
        </div>
      </div>

      {canRemove && onRemove ? (
        <Button
          type='button'
          variant='ghost'
          disabled={isRemoving || isUploading}
          onClick={onRemove}
        >
          Gỡ logo
        </Button>
      ) : null}
    </div>
  );
}
