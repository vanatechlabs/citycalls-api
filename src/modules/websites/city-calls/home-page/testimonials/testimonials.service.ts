import { Types } from 'mongoose';
import { ActorSnapshot } from '../../../../../lib/actor';
import { NotFoundError } from '../../../../../lib/errors';
import {
  TESTIMONIAL_DEFAULTS, TESTIMONIALS_SECTION_DEFAULTS, TESTIMONIALS_SECTION_KEY, TestimonialModel, TestimonialsSectionModel,
} from './testimonials.model';
import { CreateTestimonialInput, UpdateTestimonialInput, UpdateTestimonialsSectionInput } from './testimonials.validation';

const SORT = { sortOrder: 1, createdAt: 1 } as const;

// First admin open creates the section and the website's current reviews, so
// the admin page starts filled in. Runs once (tracked by `seeded`).
async function ensureSeeded() {
  const section = await TestimonialsSectionModel.findOneAndUpdate(
    { key: TESTIMONIALS_SECTION_KEY },
    { $setOnInsert: { key: TESTIMONIALS_SECTION_KEY, ...TESTIMONIALS_SECTION_DEFAULTS, seeded: false } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  // Claim the seeding atomically so two first opens can't both insert.
  const claimed = await TestimonialsSectionModel.findOneAndUpdate(
    { _id: section._id, seeded: false },
    { $set: { seeded: true } },
    { new: true }
  );
  if (claimed && (await TestimonialModel.estimatedDocumentCount()) === 0) {
    await TestimonialModel.insertMany(TESTIMONIAL_DEFAULTS.map((t) => ({ ...t })));
  }
}

export async function getAdminTestimonials() {
  await ensureSeeded();
  const [section, testimonials] = await Promise.all([
    TestimonialsSectionModel.findOne({ key: TESTIMONIALS_SECTION_KEY }).select('-key -__v -seeded').lean(),
    TestimonialModel.find().sort(SORT).select('-__v').lean(),
  ]);
  return { section, testimonials };
}

const PUBLIC_FIELDS = 'name role location rating message color sortOrder';

// Before the admin page is first opened, the website keeps showing defaults.
export async function getPublicTestimonials() {
  const section = await TestimonialsSectionModel.findOne({ key: TESTIMONIALS_SECTION_KEY })
    .select('eyebrow heading highlight minRating seeded')
    .lean();
  if (!section?.seeded) {
    return {
      section: TESTIMONIALS_SECTION_DEFAULTS,
      testimonials: TESTIMONIAL_DEFAULTS.map(({ status: _status, ...t }, i) => ({ _id: `default-${i}`, ...t })),
    };
  }
  const testimonials = await TestimonialModel.find({ status: 'PUBLISHED', rating: { $gte: section.minRating ?? 1 } })
    .sort(SORT)
    .select(PUBLIC_FIELDS)
    .lean();
  const { eyebrow, heading, highlight, minRating } = section;
  return { section: { eyebrow, heading, highlight, minRating }, testimonials };
}

export async function updateTestimonialsSection(data: UpdateTestimonialsSectionInput, actor: ActorSnapshot) {
  await ensureSeeded();
  return TestimonialsSectionModel.findOneAndUpdate(
    { key: TESTIMONIALS_SECTION_KEY },
    { $set: { ...data, updatedBy: actor } },
    { new: true, runValidators: true }
  )
    .select('-key -__v -seeded')
    .lean();
}

export async function createTestimonial(data: CreateTestimonialInput, actor: ActorSnapshot) {
  const created = await TestimonialModel.create({ ...data, createdBy: actor, updatedBy: actor });
  return created.toObject();
}

function assertId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Testimonial not found');
}

export async function updateTestimonial(id: string, data: UpdateTestimonialInput, actor: ActorSnapshot) {
  assertId(id);
  const updated = await TestimonialModel.findByIdAndUpdate(id, { $set: { ...data, updatedBy: actor } }, { new: true, runValidators: true })
    .select('-__v')
    .lean();
  if (!updated) throw new NotFoundError('Testimonial not found');
  return updated;
}

export async function deleteTestimonial(id: string) {
  assertId(id);
  const deleted = await TestimonialModel.findByIdAndDelete(id);
  if (!deleted) throw new NotFoundError('Testimonial not found');
}
