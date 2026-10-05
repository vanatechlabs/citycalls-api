import { z } from 'zod';
import { COUNTER_ICONS, COUNTERS_STATUSES, MAX_COUNTERS } from './counters.model';

const imagePathSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded path, a bundled asset path, or an http(s) URL'
);

export const counterItemSchema = z.object({
  value: z.coerce.number().min(0, 'Number cannot be negative').max(1_000_000_000),
  // Not trimmed — " min" keeps its leading space.
  suffix: z.string().max(10).default(''),
  label: z.string().trim().min(1, 'Every counter needs a label').max(60),
  icon: z.enum(COUNTER_ICONS).default('users'),
  image: imagePathSchema.default(''),
  imageAlt: z.string().trim().max(200).default(''),
}).strict();

export const updateCountersSchema = z.object({
  items: z.array(counterItemSchema).min(1, 'Add at least one counter').max(MAX_COUNTERS),
  status: z.enum(COUNTERS_STATUSES).default('ACTIVE'),
}).strict();

export type UpdateCountersInput = z.infer<typeof updateCountersSchema>;
