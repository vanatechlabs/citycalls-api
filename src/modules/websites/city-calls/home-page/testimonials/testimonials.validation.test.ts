import { createTestimonialSchema, updateTestimonialSchema, updateTestimonialsSectionSchema } from './testimonials.validation';

const valid = { name: 'Anjali Mehra', rating: 5, message: 'Fast and polite AC service.' };

describe('Testimonials validation', () => {
  it('accepts a review and fills in the defaults', () => {
    const parsed = createTestimonialSchema.parse(valid);
    expect(parsed).toMatchObject({ role: '', location: '', color: '#3e8914', sortOrder: 0, status: 'PUBLISHED' });
  });

  it('needs a name, a 1–5 rating and the review text', () => {
    expect(createTestimonialSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
    expect(createTestimonialSchema.safeParse({ ...valid, rating: 6 }).success).toBe(false);
    expect(createTestimonialSchema.safeParse({ ...valid, rating: 0 }).success).toBe(false);
    expect(createTestimonialSchema.safeParse({ ...valid, message: '' }).success).toBe(false);
  });

  it('only takes hex badge colours and known statuses, and rejects unknown fields', () => {
    expect(createTestimonialSchema.safeParse({ ...valid, color: 'green' }).success).toBe(false);
    expect(createTestimonialSchema.safeParse({ ...valid, status: 'LIVE' }).success).toBe(false);
    expect(createTestimonialSchema.safeParse({ ...valid, image: 'x.png' }).success).toBe(false);
  });

  it('partial update does not reset other fields', () => {
    expect(updateTestimonialSchema.parse({ status: 'HIDDEN' })).toEqual({ status: 'HIDDEN' });
    expect(updateTestimonialSchema.safeParse({}).success).toBe(false);
  });

  it('section highlight must be part of the heading', () => {
    expect(updateTestimonialsSectionSchema.safeParse({ heading: 'Loved by families', highlight: 'families' }).success).toBe(true);
    expect(updateTestimonialsSectionSchema.safeParse({ heading: 'Loved by families', highlight: 'friends' }).success).toBe(false);
  });
});
