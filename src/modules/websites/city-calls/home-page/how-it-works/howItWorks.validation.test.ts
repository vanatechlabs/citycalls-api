import { HOW_IT_WORKS_STEP_DEFAULTS } from './howItWorks.model';
import { createHowItWorksStepSchema, updateHowItWorksSectionSchema, updateHowItWorksStepSchema } from './howItWorks.validation';

describe('How it works validation', () => {
  it('accepts a title and fills in defaults', () => {
    expect(createHowItWorksStepSchema.parse({ title: 'Book a Service' })).toMatchObject({
      description: '', image: '', imageAlt: '', icon: 'CalendarCheck', sortOrder: 0, status: 'ACTIVE',
    });
  });

  it('only takes icons the website can draw, and rejects unknown fields', () => {
    expect(createHowItWorksStepSchema.safeParse({ title: 'Book', icon: 'Wrench' }).success).toBe(true);
    expect(createHowItWorksStepSchema.safeParse({ title: 'Book', icon: 'Rocket' }).success).toBe(false);
    expect(createHowItWorksStepSchema.safeParse({ title: 'Book', badge: 'Step 01' }).success).toBe(false);
  });

  it('takes uploaded, bundled or http images only', () => {
    for (const image of ['/uploads/a.webp', '/assets/how-it-works/step-1-book.webp', 'https://res.cloudinary.com/x.jpg', '']) {
      expect(createHowItWorksStepSchema.safeParse({ title: 'Book', image }).success).toBe(true);
    }
    expect(createHowItWorksStepSchema.safeParse({ title: 'Book', image: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('partial update does not reset other fields', () => {
    expect(updateHowItWorksStepSchema.parse({ image: '/uploads/a.webp' })).toEqual({ image: '/uploads/a.webp' });
    expect(updateHowItWorksStepSchema.safeParse({}).success).toBe(false);
  });

  it('highlight must be part of the heading', () => {
    expect(updateHowItWorksSectionSchema.safeParse({ heading: 'How It Works', highlight: 'Works' }).success).toBe(true);
    expect(updateHowItWorksSectionSchema.safeParse({ heading: 'How It Works', highlight: 'Steps' }).success).toBe(false);
  });

  it('the website defaults pass validation', () => {
    for (const step of HOW_IT_WORKS_STEP_DEFAULTS) {
      expect(createHowItWorksStepSchema.safeParse(step).success).toBe(true);
    }
  });
});
