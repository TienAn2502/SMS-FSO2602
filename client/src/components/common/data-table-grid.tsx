import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useNavigate } from 'react-router';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface DataTableGridProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    getRowHref?: (row: T) => string | undefined;
}

export function DataTableGrid<T>({
    data,
    columns,
    getRowHref,
}: DataTableGridProps<T>) {
    'use no memo';

    const navigate = useNavigate();

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <Table>
            <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                          header.column.columnDef.header,
                                          header.getContext(),
                                      )}
                            </TableHead>
                        ))}
                    </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => {
                        const rowHref = getRowHref?.(row.original);

                        return (
                            <TableRow
                                key={row.id}
                                className={
                                    rowHref
                                        ? 'cursor-pointer hover:bg-muted/50'
                                        : undefined
                                }
                                onClick={
                                    rowHref
                                        ? () => {
                                              navigate(rowHref);
                                          }
                                        : undefined
                                }
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext(),
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                    })
                ) : (
                    <TableRow>
                        <TableCell
                            colSpan={columns.length}
                            className='h-24 text-center text-muted-foreground'
                        >
                            Không có kết quả phù hợp
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
