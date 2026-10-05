import { z } from 'zod';
import { SERVER_ASSET_TYPES } from './serverAsset.model';

const dateSchema = z.coerce.date({ message: 'Enter a valid date' });

const assetFields = {
  type: z.enum(SERVER_ASSET_TYPES),
  name: z.string().trim().min(1, 'Name is required').max(160),
  provider: z.string().trim().max(80).default(''),
  purchasedOn: dateSchema.optional(),
  expiresOn: dateSchema,
  reminderDays: z.coerce.number().int().min(1).max(365).default(30),
  autoRenew: z.boolean().default(false),
  cost: z.coerce.number().min(0).max(10_000_000).optional(),
  notes: z.string().trim().max(500).optional(),
};

const purchasedBeforeExpiry = (value: { purchasedOn?: Date; expiresOn?: Date }) =>
  !value.purchasedOn || !value.expiresOn || value.purchasedOn <= value.expiresOn;

export const createServerAssetSchema = z.object(assetFields).strict()
  .refine(purchasedBeforeExpiry, { message: 'Purchase date must be before the expiry date', path: ['purchasedOn'] });

// No defaults here: a partial update must not reset fields it didn't send.
export const updateServerAssetSchema = z.object({
  type: z.enum(SERVER_ASSET_TYPES).optional(),
  name: z.string().trim().min(1, 'Name is required').max(160).optional(),
  provider: z.string().trim().max(80).optional(),
  purchasedOn: dateSchema.optional(),
  expiresOn: dateSchema.optional(),
  reminderDays: z.coerce.number().int().min(1).max(365).optional(),
  autoRenew: z.boolean().optional(),
  cost: z.coerce.number().min(0).max(10_000_000).optional(),
  notes: z.string().trim().max(500).optional(),
}).strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' })
  .refine(purchasedBeforeExpiry, { message: 'Purchase date must be before the expiry date', path: ['purchasedOn'] });

export const listServerAssetsQuerySchema = z.object({
  type: z.enum(SERVER_ASSET_TYPES).optional(),
}).strict();

export type CreateServerAssetInput = z.infer<typeof createServerAssetSchema>;
export type UpdateServerAssetInput = z.infer<typeof updateServerAssetSchema>;
