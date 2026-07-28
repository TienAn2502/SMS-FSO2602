import { z } from 'zod';

export const portalTimetableQuerySchema = z.object({
  semesterId: z.uuid().optional(),
  includeAllSemesters: z.coerce.boolean().optional().default(false),
});

export type PortalTimetableQuery = z.infer<typeof portalTimetableQuerySchema>;
