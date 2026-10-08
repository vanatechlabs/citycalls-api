import { Types } from 'mongoose';
import sanitizeHtml from 'sanitize-html';
import { ActorSnapshot } from '../../../../lib/actor';
import { ConflictError, NotFoundError } from '../../../../lib/errors';
import { BLOGS_META_ID, BlogModel, BlogsMetaModel } from './blogs.model';
import { DEFAULT_BLOGS } from './blogs.defaults';
import { CreateBlogInput, UpdateBlogInput } from './blogs.validation';

// Blog content is shown on the website as HTML, so only the formatting the
// admin editor makes is kept (no scripts, iframes, event handlers…).
export function cleanBlogHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'span', 'font', 'blockquote', 'div', 'hr'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      font: ['color'],
      '*': ['style'],
    },
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i],
        'text-align': [/^(left|right|center|justify)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    // Links that open a new tab can't reach back into the page.
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: attribs.target === '_blank' ? { ...attribs, rel: 'noopener noreferrer' } : attribs,
      }),
    },
  });
}

// First admin open copies the website's original blogs in. Runs once: only
// the request that creates the meta document does the copying.
async function ensureSeeded() {
  const result = await BlogsMetaModel.updateOne({ _id: BLOGS_META_ID }, { $setOnInsert: { seeded: true } }, { upsert: true });
  if (result.upsertedCount === 1 && (await BlogModel.estimatedDocumentCount()) === 0) {
    await BlogModel.insertMany(DEFAULT_BLOGS);
  }
}

// ~200 words a minute, at least 1 minute.
export function readingMinutes(html: string) {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

async function isSeeded() {
  return !!(await BlogsMetaModel.findById(BLOGS_META_ID).lean())?.seeded;
}

const LIST_FIELDS = 'title h1Title slug excerpt author category image imageAlt status featured publishedAt createdAt updatedAt updatedBy createdBy';
const PUBLIC_LIST_FIELDS = 'title slug excerpt author category image imageAlt featured publishedAt content';
const SORT = { publishedAt: -1, createdAt: -1 } as const;

// ── Admin ──────────────────────────────────────────────────────────────────
export async function listAdminBlogs() {
  await ensureSeeded();
  return BlogModel.find().sort(SORT).select(LIST_FIELDS).lean();
}

function assertId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Blog not found');
}

export async function getAdminBlog(id: string) {
  assertId(id);
  const blog = await BlogModel.findById(id).select('-__v').lean();
  if (!blog) throw new NotFoundError('Blog not found');
  return blog;
}

async function assertSlugFree(slug: string, exceptId?: string) {
  const clash = await BlogModel.findOne({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).select('_id').lean();
  if (clash) throw new ConflictError('Another blog already uses this URL slug — please change it.', 'SLUG_TAKEN');
}

export async function createBlog(data: CreateBlogInput, actor: ActorSnapshot) {
  await ensureSeeded();
  await assertSlugFree(data.slug);
  const created = await BlogModel.create({
    ...data,
    content: cleanBlogHtml(data.content),
    publishedAt: data.status === 'PUBLISHED' ? new Date() : undefined,
    createdBy: actor,
    updatedBy: actor,
  });
  return created.toObject();
}

export async function updateBlog(id: string, data: UpdateBlogInput, actor: ActorSnapshot) {
  assertId(id);
  const existing = await BlogModel.findById(id).select('publishedAt').lean();
  if (!existing) throw new NotFoundError('Blog not found');
  if (data.slug) await assertSlugFree(data.slug, id);
  const update: Record<string, unknown> = { ...data, updatedBy: actor };
  if (data.content !== undefined) update.content = cleanBlogHtml(data.content);
  // Its date is the first time it goes live.
  if (data.status === 'PUBLISHED' && !existing.publishedAt) update.publishedAt = new Date();
  const updated = await BlogModel.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).select('-__v').lean();
  if (!updated) throw new NotFoundError('Blog not found');
  return updated;
}

export async function deleteBlog(id: string) {
  assertId(id);
  const deleted = await BlogModel.findByIdAndDelete(id);
  if (!deleted) throw new NotFoundError('Blog not found');
}

// ── Website ────────────────────────────────────────────────────────────────
// Before Admin → Blog List is first opened, the website shows the originals.
export async function listPublicBlogs() {
  const blogs = (await isSeeded())
    ? await BlogModel.find({ status: 'PUBLISHED' }).sort(SORT).select(PUBLIC_LIST_FIELDS).lean()
    : DEFAULT_BLOGS.map((b) => ({ ...pick(b), _id: b.slug }));
  // The list needs the reading time, not the whole article.
  return blogs.map(({ content, ...blog }) => ({ ...blog, readingMinutes: readingMinutes(content) }));
}

export async function getPublicBlog(slug: string) {
  if (!(await isSeeded())) {
    const blog = DEFAULT_BLOGS.find((b) => b.slug === slug);
    if (!blog) throw new NotFoundError('Blog not found');
    return { ...blog, _id: blog.slug, readingMinutes: readingMinutes(blog.content) };
  }
  const blog = await BlogModel.findOne({ slug: slug.toLowerCase(), status: 'PUBLISHED' })
    .select('-__v -createdBy -updatedBy -status')
    .lean();
  if (!blog) throw new NotFoundError('Blog not found');
  return { ...blog, readingMinutes: readingMinutes(blog.content) };
}

function pick(b: (typeof DEFAULT_BLOGS)[number]) {
  const { title, slug, excerpt, author, category, image, imageAlt, featured, publishedAt, content } = b;
  return { title, slug, excerpt, author, category, image, imageAlt, featured, publishedAt, content };
}
