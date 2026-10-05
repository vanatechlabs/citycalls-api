import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../lib/actor';

// Admin Section → Server Management: things the business pays for that
// expire — domains, hosting, SSL — so admins get reminded before they lapse.
export const SERVER_ASSET_TYPES = ['DOMAIN', 'HOSTING', 'SSL', 'OTHER'] as const;
export type ServerAssetType = (typeof SERVER_ASSET_TYPES)[number];

export interface IServerAsset extends Document {
  type: ServerAssetType;
  // Domain name ("citycalls.in"), hosting plan / server name, etc.
  name: string;
  // Where it was bought: GoDaddy, Hostinger, AWS…
  provider: string;
  purchasedOn?: Date;
  expiresOn: Date;
  // Start reminding this many days before expiry.
  reminderDays: number;
  autoRenew: boolean;
  // Renewal cost in rupees (optional).
  cost?: number;
  notes?: string;
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const serverAssetSchema = new Schema<IServerAsset>(
  {
    type: { type: String, enum: SERVER_ASSET_TYPES, required: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    provider: { type: String, trim: true, maxlength: 80, default: '' },
    purchasedOn: { type: Date },
    expiresOn: { type: Date, required: true },
    reminderDays: { type: Number, min: 1, max: 365, default: 30 },
    autoRenew: { type: Boolean, default: false },
    cost: { type: Number, min: 0, max: 10_000_000 },
    notes: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

serverAssetSchema.index({ type: 1, expiresOn: 1 });

export const ServerAssetModel = model<IServerAsset>('ServerAsset', serverAssetSchema, 'serverAssets');
