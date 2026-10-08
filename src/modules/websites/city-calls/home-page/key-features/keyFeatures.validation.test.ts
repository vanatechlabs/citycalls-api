import { createKeyFeatureSchema, updateKeyFeatureSchema, updateKeyFeaturesSectionSchema } from './keyFeatures.validation';

describe('Key features validation', () => {
  it('accepts a title and fills in defaults', () => {
    expect(createKeyFeatureSchema.parse({ title: 'Verified technicians' })).toMatchObject({
      description: '', icon: 'BadgeCheck', sortOrder: 0, status: 'ACTIVE',
    });
  });

  it('only takes icons the website can draw, and rejects unknown fields', () => {
    expect(createKeyFeatureSchema.safeParse({ title: 'Fast', icon: 'Zap' }).success).toBe(true);
    expect(createKeyFeatureSchema.safeParse({ title: 'Fast', icon: 'Rocket' }).success).toBe(false);
    expect(createKeyFeatureSchema.safeParse({ title: 'Fast', image: 'x.png' }).success).toBe(false);
  });

  it('keeps the one-line description short', () => {
    expect(createKeyFeatureSchema.safeParse({ title: 'Fast', description: 'x'.repeat(121) }).success).toBe(false);
  });

  it('partial update does not reset other fields', () => {
    expect(updateKeyFeatureSchema.parse({ sortOrder: 3 })).toEqual({ sortOrder: 3 });
    expect(updateKeyFeatureSchema.safeParse({}).success).toBe(false);
  });

  it('highlight must be part of the heading', () => {
    const heading = "Six reasons CityCalls is Ghaziabad's default.";
    expect(updateKeyFeaturesSectionSchema.safeParse({ heading, highlight: "Ghaziabad's default." }).success).toBe(true);
    expect(updateKeyFeaturesSectionSchema.safeParse({ heading, highlight: 'Noida' }).success).toBe(false);
  });
});
