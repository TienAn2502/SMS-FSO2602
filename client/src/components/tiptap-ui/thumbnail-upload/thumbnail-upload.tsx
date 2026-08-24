'use client';

import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Button } from '@/components/tiptap-ui-primitive/button';
import { CloseIcon } from '@/components/tiptap-icons/close-icon';
import {
    uploadTempFile,
    type FilePurpose,
} from '@/features/files/api/files-api';
import { MAX_FILE_SIZE } from '@/lib/tiptap-utils';
import '@/components/tiptap-ui/thumbnail-upload/thumbnail-upload.scss';

export interface ThumbnailUploadValue {
    url: string;
    fileId: string;
    mimeType: string;
}

interface ThumbnailUploadProps {
    value?: string | null;
    onChange?: (value: ThumbnailUploadValue | null) => void;
    disabled?: boolean;
    className?: string;
    purpose?: FilePurpose;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface ThumbnailState {
    previewUrl: string | null;
    fileId: string | null;
    mimeType: string | null;
    status: UploadStatus;
    progress: number;
    error: string | null;
}

const CloudUploadIcon = () => (
    <svg
        width='24'
        height='24'
        viewBox='0 0 24 24'
        className='thumbnail-upload-icon'
        fill='currentColor'
        xmlns='http://www.w3.org/2000/svg'
    >
        <path d='M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z' />
    </svg>
);

const ImageIcon = () => (
    <svg
        width='48'
        height='48'
        viewBox='0 0 24 24'
        className='thumbnail-upload-placeholder-icon'
        fill='currentColor'
        xmlns='http://www.w3.org/2000/svg'
    >
        <path d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z' />
    </svg>
);

export function ThumbnailUpload({
    value,
    onChange,
    disabled = false,
    className,
    purpose = 'BLOG_THUMBNAIL',
}: ThumbnailUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [state, setState] = useState<ThumbnailState>({
        previewUrl: value ?? null,
        fileId: null,
        mimeType: null,
        status: value ? 'success' : 'idle',
        progress: 0,
        error: null,
    });

    const isUploading = state.status === 'uploading';
    const hasThumbnail = Boolean(state.previewUrl);

    const validateFile = (file: File): string | null => {
        if (!file.type.startsWith('image/')) {
            return 'Chỉ chấp nhận file hình ảnh';
        }
        if (file.size > MAX_FILE_SIZE) {
            return `Dung lượng tối đa là ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
        }
        return null;
    };

    const handleUpload = useCallback(
        async (file: File) => {
            const error = validateFile(file);
            if (error) {
                toast.error(error);
                return;
            }

            const localPreviewUrl = URL.createObjectURL(file);

            setState({
                previewUrl: localPreviewUrl,
                fileId: null,
                mimeType: null,
                status: 'uploading',
                progress: 0,
                error: null,
            });

            try {
                const uploaded = await uploadTempFile(file, purpose);

                const newValue: ThumbnailUploadValue = {
                    url: uploaded.url,
                    fileId: uploaded.fileId,
                    mimeType: file.type,
                };

                setState({
                    previewUrl: uploaded.url,
                    fileId: uploaded.fileId,
                    mimeType: file.type,
                    status: 'success',
                    progress: 100,
                    error: null,
                });

                onChange?.(newValue);
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Tải lên thất bại';

                setState((prev) => ({
                    ...prev,
                    previewUrl:
                        prev.previewUrl === localPreviewUrl
                            ? null
                            : prev.previewUrl,
                    fileId: null,
                    mimeType: null,
                    status: 'error',
                    error: errorMessage,
                }));

                URL.revokeObjectURL(localPreviewUrl);
                toast.error(errorMessage);
            }
        },
        [onChange, purpose],
    );

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (disabled || isUploading || acceptedFiles.length === 0) return;
            void handleUpload(acceptedFiles[0]);
        },
        [disabled, isUploading, handleUpload],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
        },
        maxFiles: 1,
        disabled: disabled || isUploading,
        multiple: false,
    });

    const handleClick = () => {
        if (!disabled && !isUploading && inputRef.current) {
            inputRef.current.value = '';
            inputRef.current.click();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        void handleUpload(files[0]);
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (state.previewUrl && state.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(state.previewUrl);
        }
        setState({
            previewUrl: null,
            fileId: null,
            mimeType: null,
            status: 'idle',
            progress: 0,
            error: null,
        });
        onChange?.(null);
    };

    const isEditMode = hasThumbnail && state.status !== 'uploading';
    const showProgress = state.status === 'uploading' && state.progress > 0;

    return (
        <div
            className={`thumbnail-upload ${isDragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''} ${isEditMode ? 'has-thumbnail' : ''} ${className ?? ''}`}
        >
            {/* Upload/Preview Area */}
            <div
                className='thumbnail-upload-area'
                onClick={isEditMode ? handleClick : undefined}
                role='button'
                tabIndex={disabled ? -1 : 0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (isEditMode) {
                            handleClick();
                        }
                    }
                }}
                aria-label={
                    isEditMode
                        ? 'Thay đổi ảnh thumbnail'
                        : 'Tải lên ảnh thumbnail'
                }
                {...getRootProps()}
            >
                <input {...getInputProps()} />

                {/* Thumbnail Preview */}
                {hasThumbnail && (
                    <div className='thumbnail-upload-preview'>
                        <img
                            src={state.previewUrl!}
                            alt='Thumbnail preview'
                            className='thumbnail-upload-img'
                        />
                        {showProgress && (
                            <div
                                className='thumbnail-upload-progress'
                                style={{ width: `${state.progress}%` }}
                            />
                        )}
                    </div>
                )}

                {/* Upload Zone (when no thumbnail) */}
                {!hasThumbnail && (
                    <div className='thumbnail-upload-zone'>
                        <div className='thumbnail-upload-placeholder'>
                            <ImageIcon />
                            <CloudUploadIcon />
                        </div>
                        <div className='thumbnail-upload-text'>
                            <span className='thumbnail-upload-title'>
                                Kéo thả ảnh hoặc <em>chọn tệp</em>
                            </span>
                            <span className='thumbnail-upload-subtitle'>
                                PNG, JPG tối đa {MAX_FILE_SIZE / (1024 * 1024)}
                                MB
                            </span>
                        </div>
                    </div>
                )}

                {/* Upload Progress Overlay */}
                {showProgress && (
                    <div className='thumbnail-upload-uploading'>
                        <div className='thumbnail-upload-uploading-spinner' />
                        <span>Đang tải lên… {state.progress}%</span>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            {hasThumbnail && !isUploading && (
                <div className='thumbnail-upload-actions'>
                    <Button
                        type='button'
                        variant='ghost'
                        size='small'
                        onClick={handleClick}
                        disabled={disabled}
                    >
                        Thay đổi
                    </Button>
                    <Button
                        type='button'
                        variant='ghost'
                        size='small'
                        onClick={handleRemove}
                        disabled={disabled}
                        aria-label='Xóa thumbnail'
                    >
                        <CloseIcon className='thumbnail-upload-remove-icon' />
                    </Button>
                </div>
            )}

            {/* Hidden Input */}
            <input
                ref={inputRef}
                type='file'
                accept='image/*'
                onChange={handleChange}
                onClick={(e) => e.stopPropagation()}
                className='thumbnail-upload-input'
                disabled={disabled || isUploading}
            />
        </div>
    );
}
