import { Types } from 'mongoose';
import { z } from 'zod';
import { FILE_CATEGORIES } from './files.model';

// Files are linked to a saved record, so this must be that record's id.
const entityIdSchema = z.string().min(1).refine((value) => Types.ObjectId.isValid(value), 'entityId must be a valid record id');

export const signedUploadSchema = z.object({
  category: z.enum(FILE_CATEGORIES),
  entityType: z.string().min(1),
  entityId: entityIdSchema,
});

export const confirmUploadSchema = z.object({
  category: z.enum(FILE_CATEGORIES),
  entityType: z.string().min(1),
  entityId: entityIdSchema,
  publicId: z.string().min(1),
  url: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().positive(),
});

export const uploadFormSchema = z.object({
  category: z.enum(FILE_CATEGORIES),
  entityType: z.string().min(1),
  entityId: entityIdSchema,
});

export const listFilesQuerySchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  category: z.enum(FILE_CATEGORIES).optional(),
});
