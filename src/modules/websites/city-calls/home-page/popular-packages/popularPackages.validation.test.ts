import { PACKAGE_DEFAULTS, PACKAGES_SECTION_DEFAULTS } from './popularPackages.model';
import { createPackageSchema, updatePackageSchema, updatePackagesSectionSchema } from './popularPackages.validation';

describe('City Calls popular packages validation', () => {
  it('accepts every default package and the default heading', () => {
    for (const pkg of PACKAGE_DEFAULTS) expect(createPackageSchema.safeParse(pkg).success).toBe(true);
    expect(updatePackagesSectionSchema.safeParse(PACKAGES_SECTION_DEFAULTS).success).toBe(true);
  });

  it('needs a name and a whole, non-negative price', () => {
    const base = PACKAGE_DEFAULTS[0];
    expect(createPackageSchema.safeParse({ ...base, name: ' ' }).success).toBe(false);
    expect(createPackageSchema.safeParse({ ...base, price: -1 }).success).toBe(false);
    expect(createPackageSchema.safeParse({ ...base, price: 499.5 }).success).toBe(false);
    expect(createPackageSchema.parse({ ...base, price: '599' }).price).toBe(599);
  });

  it('rejects unsafe images and links', () => {
    expect(createPackageSchema.safeParse({ ...PACKAGE_DEFAULTS[0], image: 'javascript:alert(1)' }).success).toBe(false);
    expect(updatePackagesSectionSchema.safeParse({ ...PACKAGES_SECTION_DEFAULTS, buttonLink: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('allows partial updates but not empty ones', () => {
    expect(updatePackageSchema.safeParse({ status: 'INACTIVE' }).success).toBe(true);
    expect(updatePackageSchema.safeParse({ image: 'https://res.cloudinary.com/demo/image/upload/v1/p.webp' }).success).toBe(true);
    expect(updatePackageSchema.safeParse({}).success).toBe(false);
  });

  it('keeps the highlight inside the heading', () => {
    expect(updatePackagesSectionSchema.safeParse({ ...PACKAGES_SECTION_DEFAULTS, highlight: 'NOT THERE' }).success).toBe(false);
  });
});
