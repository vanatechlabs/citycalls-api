import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../lib/actor';

export const SEO_META_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type SeoMetaStatus = (typeof SEO_META_STATUSES)[number];

// SEO for one website page, addressed by its path ("/", "/about",
// "/services/ac-service"). nextfrontend reads it in generateMetadata.
export interface ISeoMeta extends Document {
  pagePath: string;
  metaTitle?: string;
  metaKeywords?: string;
  metaDescription?: string;
  // Raw <meta property="og:..."> / twitter tags as pasted by the admin; the
  // website maps the recognised ones into Next's metadata.
  openGraphTags?: string;
  // JSON-LD, stored as text (validated as JSON on save).
  schemaMarkup?: string;
  canonicalUrl?: string;
  ogImage?: string;
  status: SeoMetaStatus;
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const seoMetaSchema = new Schema<ISeoMeta>(
  {
    pagePath: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 300 },
    metaTitle: { type: String, trim: true, maxlength: 70 },
    metaKeywords: { type: String, trim: true, maxlength: 500 },
    metaDescription: { type: String, trim: true, maxlength: 170 },
    openGraphTags: { type: String, trim: true, maxlength: 5000 },
    schemaMarkup: { type: String, trim: true, maxlength: 20000 },
    canonicalUrl: { type: String, trim: true, maxlength: 500 },
    ogImage: { type: String, trim: true },
    status: { type: String, enum: SEO_META_STATUSES, default: 'ACTIVE' },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

export const SeoMetaModel = model<ISeoMeta>('CityCallsSeoMeta', seoMetaSchema, 'cityCallsSeoMeta');
