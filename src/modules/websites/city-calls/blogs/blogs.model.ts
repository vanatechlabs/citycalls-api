import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../lib/actor';

// Admin → Blog Section: articles for citycalls.in/blogs. Content is rich text
// (HTML, cleaned on save). Fields follow the Design House admin's blog form.
export const BLOG_STATUSES = ['PUBLISHED', 'DRAFT', 'ARCHIVED'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export interface BlogContent {
  title: string;
  // Hero H1 for SEO (falls back to the title).
  h1Title: string;
  slug: string;
  excerpt: string;
  // Rich text HTML.
  content: string;
  author: string;
  category: string;
  metaKeywords: string;
  image: string;
  imageAlt: string;
  status: BlogStatus;
  featured: boolean;
  // SEO
  metaTitle: string;
  metaDescription: string;
  canonicalTag: string;
  // Social sharing
  ogTitle: string;
  ogImage: string;
  // Extra <meta property/name="…" content="…"> tags, pasted as text.
  openGraphTags: string;
  // JSON-LD, pasted as text.
  schemaMarkup: string;
}

export interface IBlog extends Document, BlogContent {
  // Set the first time the blog is published; shown as the blog's date.
  publishedAt?: Date;
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    h1Title: { type: String, trim: true, maxlength: 200, default: '' },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 160, unique: true },
    excerpt: { type: String, required: true, trim: true, maxlength: 500 },
    content: { type: String, required: true, maxlength: 200_000 },
    author: { type: String, trim: true, maxlength: 80, default: 'CityCalls Team' },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    metaKeywords: { type: String, trim: true, maxlength: 500, default: '' },
    image: { type: String, trim: true, maxlength: 2048, default: '' },
    imageAlt: { type: String, trim: true, maxlength: 200, default: '' },
    status: { type: String, enum: BLOG_STATUSES, default: 'DRAFT' },
    featured: { type: Boolean, default: false },
    metaTitle: { type: String, trim: true, maxlength: 70, default: '' },
    metaDescription: { type: String, trim: true, maxlength: 170, default: '' },
    canonicalTag: { type: String, trim: true, maxlength: 500, default: '' },
    ogTitle: { type: String, trim: true, maxlength: 200, default: '' },
    ogImage: { type: String, trim: true, maxlength: 2048, default: '' },
    openGraphTags: { type: String, maxlength: 5000, default: '' },
    schemaMarkup: { type: String, maxlength: 20_000, default: '' },
    publishedAt: { type: Date },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

blogSchema.index({ status: 1, publishedAt: -1 });

export const BlogModel = model<IBlog>('CityCallsBlog', blogSchema, 'cityCallsBlogs');

// One document: set once the website's original blogs have been copied in,
// so deleting them all in admin doesn't bring them back.
const blogsMetaSchema = new Schema<{ _id: string; seeded: boolean }>({
  _id: { type: String, required: true },
  seeded: { type: Boolean, default: false },
});
export const BlogsMetaModel = model('CityCallsBlogsMeta', blogsMetaSchema, 'cityCallsBlogsMeta');
export const BLOGS_META_ID = 'blogs';
