import { z } from 'zod';

import { exportFileFormatSchema } from '@/modules/exports/schemas/students-export.schema';

export const exportGradebookQuerySchema = z.object({
  format: exportFileFormatSchema.default('xlsx'),
});

export type ExportGradebookQuery = z.infer<typeof exportGradebookQuerySchema>;
