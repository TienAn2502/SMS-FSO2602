import type { PrismaClient } from '@prisma/client';

/** Client passed to interactive `$transaction` callbacks. */
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
