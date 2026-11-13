import { z } from 'zod';
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES } from './notificationTemplates.model';

// GET /notifications/unread-count — one notification event is stored once
// per channel (IN_APP, PUSH, SMS…), so apps that show an in-app list pass
// channel=IN_APP to count each event once.
export const unreadCountQuerySchema = z.object({
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
});

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  status: z.enum(NOTIFICATION_STATUSES).optional(),
  unreadOnly: z.coerce.boolean().optional(),
});
