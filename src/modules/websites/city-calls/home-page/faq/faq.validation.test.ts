import { createFaqSchema, updateFaqSchema, updateFaqSectionSchema } from './faq.validation';

const valid = { question: 'Is there a warranty?', answer: 'Yes, 30 days on labour.' };

describe('FAQ validation', () => {
  it('accepts a question and answer, filling in defaults', () => {
    expect(createFaqSchema.parse(valid)).toMatchObject({ image: '', altText: '', sortOrder: 0, status: 'ACTIVE' });
  });

  it('needs a question and an answer, and rejects unknown fields', () => {
    expect(createFaqSchema.safeParse({ ...valid, question: '' }).success).toBe(false);
    expect(createFaqSchema.safeParse({ ...valid, answer: 'no' }).success).toBe(false);
    expect(createFaqSchema.safeParse({ ...valid, views: 3 }).success).toBe(false);
  });

  it('takes uploaded, bundled or full-URL images only', () => {
    expect(createFaqSchema.safeParse({ ...valid, image: '/assets/Services/s1.png' }).success).toBe(true);
    expect(createFaqSchema.safeParse({ ...valid, image: 'https://res.cloudinary.com/x.jpg' }).success).toBe(true);
    expect(createFaqSchema.safeParse({ ...valid, image: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('partial update does not reset other fields', () => {
    expect(updateFaqSchema.parse({ image: '/uploads/a.png' })).toEqual({ image: '/uploads/a.png' });
    expect(updateFaqSchema.safeParse({}).success).toBe(false);
  });

  it('highlight word must be part of the heading', () => {
    expect(updateFaqSectionSchema.safeParse({ heading: 'Frequently Asked Questions', highlightedWord: 'Questions' }).success).toBe(true);
    expect(updateFaqSectionSchema.safeParse({ heading: 'Frequently Asked Questions', highlightedWord: 'Answers' }).success).toBe(false);
  });
});
