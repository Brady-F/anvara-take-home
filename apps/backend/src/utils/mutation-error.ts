import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { InvalidInput } from './mutation-input.js';

export function mutationError(res: Response, error: unknown, resource: string, action: string) {
  if (error instanceof InvalidInput) {
    res.status(400).json({ error: error.message });
    return;
  }
  // The resource may have been deleted after the ownership check.
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    res.status(404).json({ error: `${resource} not found` });
    return;
  }
  console.error(`Error ${action} ${resource.toLowerCase()}:`, error);
  res.status(500).json({ error: `Failed to ${action} ${resource.toLowerCase()}` });
}
