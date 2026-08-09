import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface SearchableComboboxOption {
    value: string;
    label: string;
    description?: string;
}

interface SearchableComboboxProps {
    id?: string;
    value: string;
    onValueChange: (value: string) => void;
    options: SearchableComboboxOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    loading?: boolean;
    'aria-invalid'?: boolean;
}

function normalizeSearch(value: string) {
    return value.trim().toLowerCase();
}

export function SearchableCombobox({
    id,
    value,
    onValueChange,
    options,
    placeholder = 'Chọn...',
    searchPlaceholder = 'Tìm kiếm...',
    emptyMessage = 'Không có kết quả.',
    disabled = false,
    loading = false,
    'aria-invalid': ariaInvalid,
}: SearchableComboboxProps) {
    const listboxId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value),
        [options, value],
    );

    const filteredOptions = useMemo(() => {
        const query = normalizeSearch(search);
        if (!query) {
            return options;
        }

        return options.filter((option) => {
            const label = option.label.toLowerCase();
            const description = option.description?.toLowerCase() ?? '';
            return label.includes(query) || description.includes(query);
        });
    }, [options, search]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [open]);

    useEffect(() => {
        if (!open) {
            setSearch('');
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            searchInputRef.current?.focus();
        });

        return () => {
            window.cancelAnimationFrame(frame);
        };
    }, [open]);

    const handleSelect = (nextValue: string) => {
        onValueChange(nextValue);
        setOpen(false);
    };

    return (
        <div ref={containerRef} className='relative w-full'>
            <button
                id={id}
                type='button'
                role='combobox'
                aria-expanded={open}
                aria-controls={listboxId}
                aria-invalid={ariaInvalid}
                disabled={disabled || loading}
                className={cn(
                    'flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none',
                    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                    ariaInvalid &&
                        'border-destructive ring-3 ring-destructive/20 dark:border-destructive/50',
                )}
                onClick={() => {
                    if (disabled || loading) {
                        return;
                    }
                    setOpen((current) => !current);
                }}
            >
                <span
                    className={cn(
                        'truncate text-left',
                        !selectedOption && 'text-muted-foreground',
                    )}
                >
                    {loading
                        ? 'Đang tải...'
                        : (selectedOption?.label ?? placeholder)}
                </span>
                <ChevronsUpDownIcon className='size-4 shrink-0 text-muted-foreground' />
            </button>

            {open ? (
                <div className='absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10'>
                    <div className='border-b p-2'>
                        <div className='relative'>
                            <SearchIcon className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
                            <Input
                                ref={searchInputRef}
                                value={search}
                                placeholder={searchPlaceholder}
                                className='h-8 pl-8'
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === 'Escape') {
                                        setOpen(false);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <ul
                        id={listboxId}
                        role='listbox'
                        className='max-h-56 overflow-y-auto p-1'
                    >
                        {filteredOptions.length === 0 ? (
                            <li className='px-2 py-6 text-center text-sm text-muted-foreground'>
                                {emptyMessage}
                            </li>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = option.value === value;

                                return (
                                    <li key={option.value} role='presentation'>
                                        <button
                                            type='button'
                                            role='option'
                                            aria-selected={isSelected}
                                            className={cn(
                                                'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm outline-none transition-colors',
                                                'hover:bg-accent hover:text-accent-foreground',
                                                isSelected &&
                                                    'bg-accent/70 text-accent-foreground',
                                            )}
                                            onClick={() =>
                                                handleSelect(option.value)
                                            }
                                        >
                                            <span className='min-w-0 flex-1'>
                                                <span className='block truncate font-medium'>
                                                    {option.label}
                                                </span>
                                                {option.description ? (
                                                    <span className='block truncate text-xs text-muted-foreground'>
                                                        {option.description}
                                                    </span>
                                                ) : null}
                                            </span>
                                            {isSelected ? (
                                                <CheckIcon className='mt-0.5 size-4 shrink-0' />
                                            ) : null}
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
