import { useMutation } from '@tanstack/react-query';
import { DownloadIcon, UploadIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  downloadParentsImportTemplate,
  importParents,
  type ImportRowError,
} from '@/features/imports/api/imports-api';
import { getApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/error-messages';

interface ParentImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function parseImportErrors(error: unknown): ImportRowError[] {
  const apiError = getApiError(error);
  const payload = apiError?.data as { errors?: ImportRowError[] } | undefined;

  if (payload?.errors?.length) {
    return payload.errors;
  }

  if (apiError?.details?.length) {
    return apiError.details.map((detail) => {
      const match = detail.field.match(/^(\d+)\.(.+)$/);
      return {
        row: match ? Number(match[1]) : 0,
        field: match?.[2] ?? detail.field,
        message: detail.message,
      };
    });
  }

  return [];
}

export function ParentImportSheet({
  open,
  onOpenChange,
  onSuccess,
}: ParentImportSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<ImportRowError[]>([]);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setImportErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  const templateMutation = useMutation({
    mutationFn: downloadParentsImportTemplate,
    onSuccess: () => {
      toast.success('Đã tải file mẫu');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Không tải được file mẫu',
        ),
      );
    },
  });

  const importMutation = useMutation({
    mutationFn: importParents,
    onSuccess: (result) => {
      setImportErrors([]);
      toast.success(
        `Import thành công ${result.successCount} dòng (${result.created} mới, ${result.updated} cập nhật)`,
      );
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      const errors = parseImportErrors(error);
      if (errors.length > 0) {
        setImportErrors(errors);
      }

      const apiError = getApiError(error);
      toast.error(
        getErrorMessage(
          apiError?.code,
          apiError?.message ?? 'Import thất bại',
        ),
      );
    },
  });

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setImportErrors([]);
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file Excel hoặc CSV');
      return;
    }

    importMutation.mutate(selectedFile);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='overflow-y-auto sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>Import phụ huynh từ Excel</SheetTitle>
          <SheetDescription>
            Tải file mẫu, điền dữ liệu rồi chọn file để import. Cột ma_hs dùng
            mã học sinh (external_code) để liên kết với con.
          </SheetDescription>
        </SheetHeader>

        <div className='space-y-4 px-4'>
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              disabled={templateMutation.isPending}
              onClick={() => templateMutation.mutate()}
            >
              <DownloadIcon className='size-4' />
              Tải file mẫu
            </Button>

            <Button type='button' variant='outline' onClick={handleChooseFile}>
              <UploadIcon className='size-4' />
              Chọn file
            </Button>

            <input
              ref={fileInputRef}
              type='file'
              accept='.xlsx,.csv'
              className='hidden'
              onChange={handleFileChange}
            />
          </div>

          {selectedFile ? (
            <p className='text-sm text-muted-foreground'>
              File đã chọn:{' '}
              <span className='font-medium text-foreground'>
                {selectedFile.name}
              </span>
            </p>
          ) : (
            <p className='text-sm text-muted-foreground'>
              Chưa chọn file (.xlsx hoặc .csv)
            </p>
          )}

          {importErrors.length > 0 ? (
            <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-3'>
              <p className='mb-2 text-sm font-medium text-destructive'>
                {importErrors.length} lỗi cần sửa
              </p>
              <ul className='max-h-48 space-y-1 overflow-y-auto text-sm'>
                {importErrors.map((item) => (
                  <li key={`${item.row}-${item.field}-${item.message}`}>
                    Dòng {item.row} — {item.field}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <SheetFooter className='flex-row justify-end'>
          <SheetClose render={<Button variant='outline' />}>Đóng</SheetClose>
          <Button
            type='button'
            disabled={importMutation.isPending}
            onClick={handleImport}
          >
            {importMutation.isPending ? 'Đang import...' : 'Import'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
