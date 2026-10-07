import { Schema, model, Document, Types } from 'mongoose';

// docs/14-integration-architecture.md §2, §8 — metadata + audit history for
// every uploaded asset, regardless of which provider actually stored it.
export const FILE_PROVIDERS = ['CLOUDINARY', 'LOCAL'] as const;
export type FileProvider = (typeof FILE_PROVIDERS)[number];

export const FILE_CATEGORIES = [
  'ISSUE_IMAGE',
  'PRODUCT_IMAGE',
  'BEFORE_SERVICE_IMAGE',
  'AFTER_SERVICE_IMAGE',
  'PART_IMAGE',
  'VENDOR_DOCUMENT',
  'EMPLOYEE_DOCUMENT',
  'INVOICE_ATTACHMENT',
  'RECORDING',
  'VIDEO',
  'SIGNATURE',
  'PROFILE_IMAGE',
  // Marketing/gallery images for a Catalog Service or Brand — distinct from
  // PRODUCT_IMAGE, which is a customer-owned product photo in the service-
  // request lifecycle, not a catalog listing photo.
  'CATALOG_IMAGE',
  // Publicly accessible image/video header used by WhatsApp/email campaigns.
  'MARKETING_MEDIA',
  // Background image for a home-page hero carousel slide (website module).
  'WEBSITE_HERO_IMAGE',
  // Image displayed inside the floating home-page launch spotlight card.
  'WEBSITE_SPOTLIGHT_IMAGE',
  // Popup image in the home-page Features section.
  'WEBSITE_FEATURES_IMAGE',
  // The three images of the home-page About section.
  'WEBSITE_ABOUT_IMAGE',
  // Card image of a home-page Popular Package.
  'WEBSITE_PACKAGE_IMAGE',
  // Card image of a home-page Our Services card.
  'WEBSITE_SERVICE_CARD_IMAGE',
  // Background image of a home-page counter card.
  'WEBSITE_COUNTER_IMAGE',
  // Icon/preview image for a navbar dropdown service link (website module).
  'NAVBAR_SERVICE_IMAGE',
  // Hero and lower promotional banner images for CMS-managed service pages.
  'WEBSITE_PAGE_HERO_IMAGE',
  'WEBSITE_PAGE_BANNER_IMAGE',
  // Social share (og:image) picture for a page's SEO entry.
  'WEBSITE_SEO_OG_IMAGE',
  // Background image for a customer mobile app home-screen banner.
  'APP_HOME_BANNER_IMAGE',
  // Background image for a customer mobile app Salon-tab banner.
  'APP_SALON_BANNER_IMAGE',
  // Background image for a customer mobile app HelpNow-tab banner.
  'APP_HELPNOW_BANNER_IMAGE',
] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

export interface IFile extends Document {
  category: FileCategory;
  entityType: string;
  entityId: Types.ObjectId;
  provider: FileProvider;
  key: string; // Cloudinary public_id, or local relative path
  url: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    category: { type: String, enum: FILE_CATEGORIES, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    provider: { type: String, enum: FILE_PROVIDERS, required: true },
    key: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

fileSchema.index({ entityType: 1, entityId: 1 });

export const FileModel = model<IFile>('File', fileSchema);
